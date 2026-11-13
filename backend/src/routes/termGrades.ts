import { Router, Response } from 'express';
import { PrismaClient, Modality, TermGrade } from '@prisma/client';
import { authenticateToken, requireTeacher, AuthRequest } from '../middleware/auth';

// Helper para calcular la media de tareas y la nota final
export const calculateTermOverallGrade = (
  modality: Modality,
  middleExamGrade: number | null | undefined,
  finalExamGrade: number | null | undefined,
  tasksAverage: number | null | undefined
): { overallGrade: number | null; tasksAverage: number | null } => {
  const cleanTasksAvg = typeof tasksAverage === 'number' && !isNaN(tasksAverage) ? tasksAverage : null;
  const cleanMiddle = typeof middleExamGrade === 'number' && !isNaN(middleExamGrade) ? middleExamGrade : null;
  const cleanFinal = typeof finalExamGrade === 'number' && !isNaN(finalExamGrade) ? finalExamGrade : null;

  if (modality === 'ONLINE') {
    // Para alumnos online: la nota final es 100% automática basada en la media continua de tareas y exámenes
    return {
      tasksAverage: cleanTasksAvg,
      overallGrade: cleanTasksAvg !== null ? Number(cleanTasksAvg.toFixed(2)) : null
    };
  }

  // Presencial: la nota global solo está disponible tras registrar ambos exámenes.
  if (cleanMiddle !== null && cleanFinal !== null) {
    const overall = cleanMiddle * 0.35 + cleanFinal * 0.35 + (cleanTasksAvg ?? 0) * 0.30;
    return {
      tasksAverage: cleanTasksAvg,
      overallGrade: Number(overall.toFixed(2))
    };
  }

  return {
    tasksAverage: null,
    overallGrade: null
  };
};

const examSkillKeys = ['Grammar', 'Reading', 'Writing', 'Listening', 'Speaking'] as const;
type ExamSkillKey = typeof examSkillKeys[number];

const getGradeValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  const grade = Number(value);
  return Number.isFinite(grade) && grade >= 0 && grade <= 10 ? grade : null;
};

const getExamAverage = (grades: Array<number | null>) => averageScores(grades.filter((grade): grade is number => grade !== null));

const skillKeys = ['grammar', 'reading', 'writing', 'listening', 'speaking'] as const;
type SkillKey = typeof skillKeys[number];

const getSkillKey = (category?: string | null): SkillKey | null => {
  switch (category) {
    case 'GRAMMAR_VOCABULARY': return 'grammar';
    case 'READING': return 'reading';
    case 'WRITING': return 'writing';
    case 'LISTENING': return 'listening';
    case 'SPEAKING': return 'speaking';
    default: return null;
  }
};

const averageScores = (scores: number[]) => scores.length > 0
  ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2))
  : null;

const calculateOnlineSkills = (scoresBySkill: Partial<Record<SkillKey, number[]>>) => {
  const values = skillKeys.map((key) => averageScores(scoresBySkill[key] || [])).filter((value): value is number => value !== null);
  return {
    grammar: averageScores(scoresBySkill.grammar || []),
    reading: averageScores(scoresBySkill.reading || []),
    writing: averageScores(scoresBySkill.writing || []),
    listening: averageScores(scoresBySkill.listening || []),
    speaking: averageScores(scoresBySkill.speaking || []),
    overallGrade: averageScores(values)
  };
};

const calculatedGradeKeys = [
  'middleExamGrade', 'finalExamGrade', 'tasksAverage', 'overallGrade', ...skillKeys
] as const;
type CalculatedGradeKey = typeof calculatedGradeKeys[number];
type GradeOverrides = Partial<Record<CalculatedGradeKey, number>>;

const readOverrides = (value: unknown): GradeOverrides => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: GradeOverrides = {};
  for (const key of calculatedGradeKeys) {
    const grade = (value as Record<string, unknown>)[key];
    if (typeof grade === 'number' && Number.isFinite(grade) && grade >= 0 && grade <= 10) result[key] = grade;
  }
  return result;
};

const resolveTermEvaluation = (
  modality: Modality,
  record: Partial<TermGrade> | null | undefined,
  taskScores: number[],
  scoresBySkill: Partial<Record<SkillKey, number[]>>
) => {
  const gradeOverrides = readOverrides(record?.gradeOverrides);
  const onlineSkills = modality === 'ONLINE' ? calculateOnlineSkills(scoresBySkill) : null;
  const automaticGrades: Record<CalculatedGradeKey, number | null> = {
    middleExamGrade: getExamAverage(examSkillKeys.map(skill => record?.[`middle${skill}`] ?? null)) ?? record?.middleExamGrade ?? null,
    finalExamGrade: getExamAverage(examSkillKeys.map(skill => record?.[`final${skill}`] ?? null)) ?? record?.finalExamGrade ?? null,
    tasksAverage: averageScores(taskScores),
    overallGrade: null,
    grammar: onlineSkills?.grammar ?? record?.grammar ?? null,
    reading: onlineSkills?.reading ?? record?.reading ?? null,
    writing: onlineSkills?.writing ?? record?.writing ?? null,
    listening: onlineSkills?.listening ?? record?.listening ?? null,
    speaking: onlineSkills?.speaking ?? record?.speaking ?? null
  };
  const effective = (key: CalculatedGradeKey) => gradeOverrides[key] ?? automaticGrades[key];
  automaticGrades.overallGrade = modality === 'ONLINE'
    ? (gradeOverrides.tasksAverage !== undefined
      ? effective('tasksAverage')
      : averageScores(skillKeys.map(effective).filter((grade): grade is number => grade !== null)) ?? effective('tasksAverage'))
    : calculateTermOverallGrade(modality, effective('middleExamGrade'), effective('finalExamGrade'), effective('tasksAverage')).overallGrade;
  return {
    middleExamGrade: effective('middleExamGrade'),
    finalExamGrade: effective('finalExamGrade'),
    tasksAverage: effective('tasksAverage'),
    overallGrade: effective('overallGrade'),
    grammar: effective('grammar'), reading: effective('reading'), writing: effective('writing'),
    listening: effective('listening'), speaking: effective('speaking'),
    automaticGrades,
    gradeOverrides
  };
};

const resolveTaskGrade = (automatic: number | null, delivery?: { grade: number | null; status: string; gradeMode?: string | null }) =>
  (delivery?.gradeMode === 'MANUAL' || (!delivery?.gradeMode && delivery?.status === 'GRADED')) && typeof delivery?.grade === 'number' && Number.isFinite(delivery.grade)
    ? delivery.grade : automatic;

const hasEvaluableStructuredStep = (task: {
  steps: Array<{
    requiresSubmission?: boolean;
    material?: { type?: string } | null;
    assignment?: { submissions?: Array<{ content?: string | null; grade?: number | null }> } | null;
  }>;
  deliveries?: Array<{ grade?: number | null }>;
}) => {
  const hasNormalEvaluableStep = task.steps.some((step) => {
    return Boolean(step.requiresSubmission || step.material?.type === 'FORM');
  });

  const hasStudentContent = task.steps.some((step) =>
    step.assignment?.submissions?.some((submission) =>
      (typeof submission.content === 'string' && submission.content.trim().length > 0) ||
      (typeof submission.grade === 'number' && !Number.isNaN(submission.grade))
    )
  );
  const hasTaskGrade = task.deliveries?.some((delivery) => typeof delivery.grade === 'number' && !Number.isNaN(delivery.grade)) || false;

  return hasNormalEvaluableStep || hasStudentContent || hasTaskGrade;
};

export const createTermGradesRouter = (prisma: PrismaClient) => {
const router = Router();

// 1. Obtener matriz trimestral de calificaciones para un curso (Profesor)
router.get('/course/:courseId', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.courseId as string;
    const term = parseInt(req.query.term as string) || 1;
    const academicYear = (req.query.academicYear as string) || '2025-2026';

    // Verificar que el curso pertenece al profesor titular o está asignado al profesor.
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        ...(req.user!.role === 'TEACHER'
          ? {
              OR: [
                { modality: 'PRESENCIAL' },
                { teacherId: req.user!.id },
                { assignedTeachers: { some: { teacherId: req.user!.id } } }
              ]
            }
          : {})
      },
      include: {
        enrollments: {
          include: {
            student: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado o sin permisos suficientes.' });
    }

    // Obtener las tareas del curso para el trimestre
    const tasks = await prisma.structuredTask.findMany({
      where: {
        courseId,
        term,
        isTemplate: false
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: {
            material: true,
            progress: true,
            assignment: {
              include: {
                submissions: true
              }
            }
          }
        },
        deliveries: true
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }]
    });
    const evaluableTasks = tasks.filter(hasEvaluableStructuredStep);

    // Obtener registros existentes de TermGrade para este curso y trimestre
    const termGrades = await prisma.termGrade.findMany({
      where: {
        courseId,
        term,
        academicYear
      }
    });
    const termGradeMap = new Map(termGrades.map((tg) => [tg.studentId, tg]));

    // Construir datos enriquecidos para cada alumno
    const studentsData = course.enrollments.map((enrollment) => {
      const student = enrollment.student;
      const existingRecord = termGradeMap.get(student.id);

      // Calcular la media de tareas del trimestre para este estudiante
      const studentTasksScores: number[] = [];
      const scoresBySkill: Partial<Record<SkillKey, number[]>> = {};
      const studentTasksBreakdown = evaluableTasks.map((task) => {
        // Buscar delivery de la tarea
        const delivery = task.deliveries.find((d) => d.studentId === student.id);
        
        // Evaluar pasos
        const stepsDetail = task.steps.map((step) => {
          const isEvaluable = Boolean(step.requiresSubmission || step.material?.type === 'FORM');
          const progress = step.progress.find((p) => p.studentId === student.id);
          const submission = step.assignment?.submissions.find((s) => s.studentId === student.id);

          return {
            stepId: step.id,
            title: step.title,
            materialType: step.material?.type || 'RESOURCE',
            materialUrl: step.material?.url || null,
            formData: step.material?.formData || null,
            isEvaluable,
            isCompleted: Boolean(progress) || Boolean(submission),
            completedAt: progress?.completedAt || submission?.submittedAt || null,
            grade: submission?.grade !== undefined ? submission.grade : null,
            feedback: submission?.feedback || null,
            content: submission?.content || null
          };
        });
        // Calcular nota de la tarea
        const evaluableSteps = stepsDetail.filter((step) => step.isEvaluable);
        const evaluableGraded = evaluableSteps.filter(
          (step) => typeof step.grade === 'number' && !isNaN(step.grade)
        );
        let taskGrade: number | null = null;
        if (evaluableSteps.length > 0 && evaluableGraded.length === evaluableSteps.length) {
          taskGrade = Number((evaluableGraded.reduce((sum, step) => sum + (step.grade || 0), 0) / evaluableGraded.length).toFixed(2));
        }
        taskGrade = resolveTaskGrade(taskGrade, delivery);

        if (taskGrade !== null) {
          studentTasksScores.push(taskGrade);
          const skill = getSkillKey(task.category);
          if (skill) scoresBySkill[skill] = [...(scoresBySkill[skill] || []), taskGrade];
        }

        const allStepsCompleted = stepsDetail.length > 0 && stepsDetail.every((s) => s.isCompleted);
        const completedAtDates = stepsDetail
          .map((s) => s.completedAt ? new Date(s.completedAt) : null)
          .filter((date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()));
        const completedAt = allStepsCompleted && completedAtDates.length > 0
          ? new Date(Math.max(...completedAtDates.map((date) => date.getTime())))
          : null;
        const isLate = Boolean(task.dueDate && completedAt && completedAt.getTime() > new Date(task.dueDate).getTime());

        return {
          taskId: task.id,
          taskTitle: task.title,
          category: task.category,
          dueDate: task.dueDate,
          steps: stepsDetail,
          taskGrade,
          gradeMode: delivery?.gradeMode || (delivery?.status === 'GRADED' ? 'MANUAL' : 'AUTO'),
          taskFeedback: delivery?.feedback || null,
          isCompleted: allStepsCompleted,
          completedAt,
          isLate,
          status: delivery?.status || (allStepsCompleted ? 'COMPLETED' : 'IN_PROGRESS')
        };
      });

      return {
        studentId: student.id,
        fullName: `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim() || student.email,
        email: student.email,
        modality: student.modality,
        middleGrammar: existingRecord?.middleGrammar ?? null,
        middleReading: existingRecord?.middleReading ?? null,
        middleWriting: existingRecord?.middleWriting ?? null,
        middleListening: existingRecord?.middleListening ?? null,
        middleSpeaking: existingRecord?.middleSpeaking ?? null,
        finalGrammar: existingRecord?.finalGrammar ?? null,
        finalReading: existingRecord?.finalReading ?? null,
        finalWriting: existingRecord?.finalWriting ?? null,
        finalListening: existingRecord?.finalListening ?? null,
        finalSpeaking: existingRecord?.finalSpeaking ?? null,
        ...resolveTermEvaluation(student.modality, existingRecord, studentTasksScores, scoresBySkill),
        observations: existingRecord?.observations ?? '',
        updatedAt: existingRecord?.updatedAt ?? null,
        tasksCount: evaluableTasks.length,
        completedTasksCount: studentTasksBreakdown.filter((t) => t.isCompleted).length,
        tasks: studentTasksBreakdown
      };
    });

    res.json({
      course: { id: course.id, title: course.title },
      term,
      academicYear,
      tasksSummary: evaluableTasks.map((t) => ({ id: t.id, title: t.title, category: t.category, dueDate: t.dueDate })),
      students: studentsData
    });
  } catch (error) {
    console.error('Error al obtener notas trimestrales:', error);
    res.status(500).json({ error: 'Error al obtener calificaciones trimestrales del curso.' });
  }
});

// 2. Guardar o actualizar notas trimestrales (Middle, Final, Observaciones, CEFR) para un alumno (Profesor)
router.put('/course/:courseId', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.courseId as string;
    const {
      studentId,
      term,
      academicYear = '2025-2026',
      middleExamGrade,
      finalExamGrade,
      middleGrammar, middleReading, middleWriting, middleListening, middleSpeaking,
      finalGrammar, finalReading, finalWriting, finalListening, finalSpeaking,
      observations,
      grammar,
      reading,
      writing,
      listening,
      speaking
    } = req.body;

    if (!studentId || ![1, 2, 3].includes(Number(term))) {
      return res.status(400).json({ error: 'studentId y un trimestre entre 1 y 3 son obligatorios.' });
    }
    const gradeFields = [...calculatedGradeKeys, ...examSkillKeys.flatMap(skill => [`middle${skill}`, `final${skill}`])];
    for (const field of gradeFields) {
      const value = req.body[field];
      if (value !== undefined && value !== null && value !== '' &&
        ((typeof value !== 'string' && typeof value !== 'number') || getGradeValue(value) === null)) {
        return res.status(400).json({ error: `La nota ${field} debe estar entre 0 y 10.` });
      }
    }
    if (req.body.gradeOverrides !== undefined &&
      (!req.body.gradeOverrides || typeof req.body.gradeOverrides !== 'object' || Array.isArray(req.body.gradeOverrides))) {
      return res.status(400).json({ error: 'Los ajustes de notas deben ser un objeto.' });
    }
    for (const [field, value] of Object.entries(req.body.gradeOverrides || {})) {
      if (!calculatedGradeKeys.includes(field as CalculatedGradeKey) ||
        (value !== null && (typeof value !== 'number' || getGradeValue(value) === null))) {
        return res.status(400).json({ error: `Ajuste de nota no valido: ${field}.` });
      }
    }

    const courseAccess = await prisma.course.findFirst({
      where: {
        id: courseId,
        ...(req.user!.role === 'TEACHER'
          ? {
              OR: [
                { modality: 'PRESENCIAL' },
                { teacherId: req.user!.id },
                { assignedTeachers: { some: { teacherId: req.user!.id } } }
              ]
            }
          : {})
      },
      select: { id: true }
    });
    if (!courseAccess) {
      return res.status(403).json({ error: 'No tienes acceso a las calificaciones de esta clase.' });
    }

    // Verificar estudiante y modalidad
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, modality: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Estudiante no encontrado.' });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      select: { id: true }
    });
    if (!enrollment) {
      return res.status(400).json({ error: 'El estudiante no está matriculado en esta clase.' });
    }

    const existingTermGrade = await prisma.termGrade.findUnique({
      where: { studentId_courseId_term_academicYear: { studentId, courseId, term: Number(term), academicYear } }
    });

    const resolveExamSkill = (prefix: 'middle' | 'final', skill: ExamSkillKey) => {
      const field = `${prefix}${skill}` as const;
      const value = req.body[field];
      return value === undefined ? existingTermGrade?.[field] ?? null : getGradeValue(value);
    };

    const middleSkills = examSkillKeys.map((skill) => resolveExamSkill('middle', skill));
    const finalSkills = examSkillKeys.map((skill) => resolveExamSkill('final', skill));
    const overrides = readOverrides(existingTermGrade?.gradeOverrides);
    const overrideChanges = req.body.gradeOverrides ?? Object.fromEntries(
      calculatedGradeKeys.filter(key => req.body[key] !== undefined).map(key => [key, getGradeValue(req.body[key])])
    );
    for (const [key, value] of Object.entries(overrideChanges)) {
      if (value === null) delete overrides[key as CalculatedGradeKey];
      else overrides[key as CalculatedGradeKey] = value as number;
    }
    const examGrades = {
      middleGrammar: middleSkills[0], middleReading: middleSkills[1], middleWriting: middleSkills[2], middleListening: middleSkills[3], middleSpeaking: middleSkills[4],
      finalGrammar: finalSkills[0], finalReading: finalSkills[1], finalWriting: finalSkills[2], finalListening: finalSkills[3], finalSpeaking: finalSkills[4]
    };

    // Calcular tareas y promedio continuo en este trimestre
    const tasks = await prisma.structuredTask.findMany({
      where: {
        courseId,
        term: Number(term),
        isTemplate: false
      },
      include: {
        deliveries: { where: { studentId } },
        steps: {
          include: {
            material: { select: { type: true } },
            assignment: {
              include: {
                submissions: { where: { studentId } }
              }
            }
          }
        }
      }
    });

    const taskGrades: number[] = [];
    const scoresBySkill: Partial<Record<SkillKey, number[]>> = {};
    tasks.forEach((t) => {
      const evaluableSteps = t.steps.filter((s) => s.requiresSubmission || s.material?.type === 'FORM');
      const gradedSubmissions = evaluableSteps
        .map((s) => s.assignment?.submissions[0]?.grade)
        .filter((g): g is number => typeof g === 'number' && !isNaN(g));
      const automatic = evaluableSteps.length > 0 && gradedSubmissions.length === evaluableSteps.length
        ? averageScores(gradedSubmissions) : null;
      const taskGrade = resolveTaskGrade(automatic, t.deliveries[0]);
      if (taskGrade !== null) {
        taskGrades.push(taskGrade);
        const skill = getSkillKey(t.category);
        if (skill) scoresBySkill[skill] = [...(scoresBySkill[skill] || []), taskGrade];
      }
    });

    const evaluation = resolveTermEvaluation(student.modality, {
      ...existingTermGrade,
      ...examGrades,
      middleExamGrade: getExamAverage(middleSkills) ?? (examSkillKeys.some(skill => req.body[`middle${skill}`] !== undefined) ? null : existingTermGrade?.middleExamGrade ?? null),
      finalExamGrade: getExamAverage(finalSkills) ?? (examSkillKeys.some(skill => req.body[`final${skill}`] !== undefined) ? null : existingTermGrade?.finalExamGrade ?? null),
      gradeOverrides: overrides
    }, taskGrades, scoresBySkill);

    const termGrade = await prisma.termGrade.upsert({
      where: {
        studentId_courseId_term_academicYear: {
          studentId,
          courseId,
          term: Number(term),
          academicYear
        }
      },
      create: {
        studentId,
        courseId,
        term: Number(term),
        academicYear,
        middleExamGrade: evaluation.automaticGrades.middleExamGrade,
        finalExamGrade: evaluation.automaticGrades.finalExamGrade,
        middleGrammar: middleSkills[0], middleReading: middleSkills[1], middleWriting: middleSkills[2], middleListening: middleSkills[3], middleSpeaking: middleSkills[4],
        finalGrammar: finalSkills[0], finalReading: finalSkills[1], finalWriting: finalSkills[2], finalListening: finalSkills[3], finalSpeaking: finalSkills[4],
        tasksAverage: evaluation.automaticGrades.tasksAverage,
        overallGrade: evaluation.automaticGrades.overallGrade,
        gradeOverrides: overrides,
        observations: typeof observations === 'string' ? observations.trim() : null
      },
      update: {
        middleExamGrade: evaluation.automaticGrades.middleExamGrade,
        finalExamGrade: evaluation.automaticGrades.finalExamGrade,
        middleGrammar: middleSkills[0], middleReading: middleSkills[1], middleWriting: middleSkills[2], middleListening: middleSkills[3], middleSpeaking: middleSkills[4],
        finalGrammar: finalSkills[0], finalReading: finalSkills[1], finalWriting: finalSkills[2], finalListening: finalSkills[3], finalSpeaking: finalSkills[4],
        tasksAverage: evaluation.automaticGrades.tasksAverage,
        overallGrade: evaluation.automaticGrades.overallGrade,
        gradeOverrides: overrides,
        observations: observations !== undefined ? (observations ? String(observations).trim() : null) : undefined
      }
    });

    res.json({ ...termGrade, ...evaluation });
  } catch (error) {
    console.error('Error al guardar nota trimestral:', error);
    res.status(500).json({ error: 'Error al actualizar calificaciones trimestrales.' });
  }
});

// 3. Obtener histórico trimestral completo de un alumno (para Alumno / Padre / Profesor)
router.get('/student/:studentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const rawStudentId = req.params.studentId as string;
    const studentId = rawStudentId === 'me' ? req.user!.id : rawStudentId;
    const academicYear = (req.query.academicYear as string) || '2025-2026';
    const courseId = req.query.courseId as string | undefined;

    // Verificar permisos: el propio alumno, su tutor, o un profesor/admin
    const isSelf = req.user!.id === studentId;
    const isTeacherOrAdmin = req.user!.role === 'TEACHER' || req.user!.role === 'ADMIN';
    let isParent = false;

    if (req.user!.role === 'PARENT') {
      const child = await prisma.user.findFirst({
        where: {
          id: studentId,
          role: 'STUDENT',
          OR: [
            { parentId: req.user!.id },
            { parent: { email: { equals: (req.user as any).email, mode: 'insensitive' } } }
          ]
        }
      });
      isParent = Boolean(child);
    }

    if (!isSelf && !isTeacherOrAdmin && !isParent) {
      return res.status(403).json({ error: 'No tienes permisos para ver estas calificaciones.' });
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        profile: true,
        enrollments: {
          include: { course: true }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Alumno no encontrado.' });
    }

    // Determinar cursos a consultar
    let targetCourseIds = courseId
      ? [courseId]
      : student.enrollments.map((e) => e.courseId);

    if (req.user!.role === 'TEACHER') {
      const accessibleCourses = await prisma.course.findMany({
        where: {
          id: { in: targetCourseIds },
          OR: [
            { modality: 'PRESENCIAL' },
            { teacherId: req.user!.id },
            { assignedTeachers: { some: { teacherId: req.user!.id } } }
          ]
        },
        select: { id: true }
      });
      targetCourseIds = accessibleCourses.map((course) => course.id);
      if (targetCourseIds.length === 0) {
        return res.status(403).json({ error: 'No tienes acceso a las calificaciones de las clases de este alumno.' });
      }
    }

    // Obtener todas las tareas de esos cursos
    const tasks = await prisma.structuredTask.findMany({
      where: {
        courseId: { in: targetCourseIds },
        isTemplate: false
      },
      include: {
        deliveries: { where: { studentId } },
        steps: {
          orderBy: { order: 'asc' },
          include: {
            material: true,
            progress: { where: { studentId } },
            assignment: {
              include: {
                submissions: { where: { studentId } }
              }
            }
          }
        }
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }]
    });
    const evaluableTasks = tasks.filter(hasEvaluableStructuredStep);
    const courseTitles = new Map(
      student.enrollments.map((enrollment) => [enrollment.courseId, enrollment.course.title])
    );

    // Obtener todos los TermGrade existentes
    const termGrades = await prisma.termGrade.findMany({
      where: {
        studentId,
        courseId: { in: targetCourseIds },
        academicYear
      }
    });

    // Agrupar por trimestres 1, 2 y 3
    const termsData: Record<number, any> = {};

    for (let t = 1; t <= 3; t++) {
      const termTasks = evaluableTasks.filter((task) => task.term === t);
      const existingTermGrade = termGrades.find((tg) => tg.term === t);

      const taskScores: number[] = [];
      const scoresBySkill: Partial<Record<SkillKey, number[]>> = {};
      const tasksFormatted = termTasks.map((task) => {
        const delivery = task.deliveries[0];
        const stepsFormatted = task.steps.map((step) => {
          const isEvaluable = Boolean(step.requiresSubmission || step.material?.type === 'FORM');
          const prog = step.progress[0];
          const sub = step.assignment?.submissions[0];

          return {
            stepId: step.id,
            title: step.title,
            materialType: step.material?.type || 'RESOURCE',
            materialUrl: step.material?.url || null,
            formData: step.material?.formData || null,
            isEvaluable,
            isCompleted: Boolean(prog) || Boolean(sub),
            completedAt: prog?.completedAt || sub?.submittedAt || null,
            grade: sub?.grade !== undefined ? sub.grade : null,
            feedback: sub?.feedback || null,
            content: sub?.content || null
          };
        });
        const evaluableSteps = stepsFormatted.filter((step) => step.isEvaluable);
        const graded = evaluableSteps.filter((step) => typeof step.grade === 'number' && !Number.isNaN(step.grade));
        let finalTaskGrade: number | null = null;
        if (evaluableSteps.length > 0 && graded.length === evaluableSteps.length) {
          finalTaskGrade = Number((graded.reduce((sum, step) => sum + (step.grade || 0), 0) / graded.length).toFixed(2));
        }
        finalTaskGrade = resolveTaskGrade(finalTaskGrade, delivery);

        if (finalTaskGrade !== null) {
          taskScores.push(finalTaskGrade);
          const skill = getSkillKey(task.category);
          if (skill) scoresBySkill[skill] = [...(scoresBySkill[skill] || []), finalTaskGrade];
        }

        const allStepsCompleted = stepsFormatted.length > 0 && stepsFormatted.every((s) => s.isCompleted);
        const completedAtDates = stepsFormatted
          .map((s) => s.completedAt ? new Date(s.completedAt) : null)
          .filter((date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()));
        const completedAt = allStepsCompleted && completedAtDates.length > 0
          ? new Date(Math.max(...completedAtDates.map((date) => date.getTime())))
          : null;
        const isLate = Boolean(task.dueDate && completedAt && completedAt.getTime() > new Date(task.dueDate).getTime());

        return {
          taskId: task.id,
          courseId: task.courseId,
          courseTitle: task.courseId ? courseTitles.get(task.courseId) || 'Clase' : 'Sin clase',
          title: task.title,
          category: task.category,
          dueDate: task.dueDate,
          steps: stepsFormatted,
          taskGrade: finalTaskGrade,
          gradeMode: delivery?.gradeMode || (delivery?.status === 'GRADED' ? 'MANUAL' : 'AUTO'),
          taskFeedback: delivery?.feedback || null,
          isCompleted: allStepsCompleted,
          completedAt,
          isLate
        };
      });

      termsData[t] = {
        term: t,
        academicYear,
        middleGrammar: existingTermGrade?.middleGrammar ?? null,
        middleReading: existingTermGrade?.middleReading ?? null,
        middleWriting: existingTermGrade?.middleWriting ?? null,
        middleListening: existingTermGrade?.middleListening ?? null,
        middleSpeaking: existingTermGrade?.middleSpeaking ?? null,
        finalGrammar: existingTermGrade?.finalGrammar ?? null,
        finalReading: existingTermGrade?.finalReading ?? null,
        finalWriting: existingTermGrade?.finalWriting ?? null,
        finalListening: existingTermGrade?.finalListening ?? null,
        finalSpeaking: existingTermGrade?.finalSpeaking ?? null,
        ...resolveTermEvaluation(student.modality, existingTermGrade, taskScores, scoresBySkill),
        observations: existingTermGrade?.observations ?? null,
        updatedAt: existingTermGrade?.updatedAt ?? null,
        tasks: tasksFormatted
      };
    }

    res.json({
      student: {
        id: student.id,
        fullName: `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim() || student.email,
        email: student.email,
        modality: student.modality
      },
      academicYear,
      terms: termsData
    });
  } catch (error) {
    console.error('Error al obtener expediente del estudiante:', error);
    res.status(500).json({ error: 'Error al obtener calificaciones trimestrales del estudiante.' });
  }
});

return router;
};

export default createTermGradesRouter(new PrismaClient());

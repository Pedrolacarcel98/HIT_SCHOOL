import { Router, Response } from 'express';
import { PrismaClient, Modality } from '@prisma/client';
import { authenticateToken, requireTeacher, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

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

  // Presencial: 35% Mid Term + 35% Final Term + 30% tareas prácticas.
  if (cleanMiddle !== null || cleanFinal !== null || cleanTasksAvg !== null) {
    const overall = (cleanMiddle ?? 0) * 0.35 + (cleanFinal ?? 0) * 0.35 + (cleanTasksAvg ?? 0) * 0.30;
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

// 1. Obtener matriz trimestral de calificaciones para un curso (Profesor)
router.get('/course/:courseId', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.courseId as string;
    const term = parseInt(req.query.term as string) || 1;
    const academicYear = (req.query.academicYear as string) || '2025-2026';

    // Verificar que el curso existe y pertenece al profesor o admin
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        ...(req.user!.role === 'TEACHER' ? { teacherId: req.user!.id } : {})
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
          taskFeedback: delivery?.feedback || null,
          isCompleted: allStepsCompleted,
          completedAt,
          isLate,
          status: delivery?.status || (allStepsCompleted ? 'COMPLETED' : 'IN_PROGRESS')
        };
      });

      const tasksAverage = studentTasksScores.length > 0
        ? Number((studentTasksScores.reduce((a, b) => a + b, 0) / studentTasksScores.length).toFixed(2))
        : null;

      const onlineSkills = student.modality === 'ONLINE' ? calculateOnlineSkills(scoresBySkill) : null;
      const { overallGrade } = calculateTermOverallGrade(
        student.modality,
        existingRecord?.middleExamGrade,
        existingRecord?.finalExamGrade,
        tasksAverage
      );

      return {
        studentId: student.id,
        fullName: `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim() || student.email,
        email: student.email,
        modality: student.modality,
        middleExamGrade: existingRecord?.middleExamGrade ?? null,
        finalExamGrade: existingRecord?.finalExamGrade ?? null,
        tasksAverage,
        overallGrade: onlineSkills?.overallGrade ?? overallGrade,
        grammar: onlineSkills?.grammar ?? existingRecord?.grammar ?? null,
        reading: onlineSkills?.reading ?? existingRecord?.reading ?? null,
        writing: onlineSkills?.writing ?? existingRecord?.writing ?? null,
        listening: onlineSkills?.listening ?? existingRecord?.listening ?? null,
        speaking: onlineSkills?.speaking ?? existingRecord?.speaking ?? null,
        observations: existingRecord?.observations ?? '',
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
      observations,
      grammar,
      reading,
      writing,
      listening,
      speaking
    } = req.body;

    if (!studentId || !term) {
      return res.status(400).json({ error: 'studentId y term son obligatorios.' });
    }

    // Verificar estudiante y modalidad
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, modality: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Estudiante no encontrado.' });
    }

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
    tasks.forEach((t) => {
      const evaluableSteps = t.steps.filter((s) => s.requiresSubmission);
      const gradedSubmissions = evaluableSteps
        .map((s) => s.assignment?.submissions[0]?.grade)
        .filter((g): g is number => typeof g === 'number' && !isNaN(g));
      if (evaluableSteps.length > 0 && gradedSubmissions.length === evaluableSteps.length) {
        const avg = gradedSubmissions.reduce((a, b) => a + b, 0) / gradedSubmissions.length;
        taskGrades.push(Number(avg.toFixed(2)));
      }
    });

    const tasksAverage = taskGrades.length > 0
      ? Number((taskGrades.reduce((a, b) => a + b, 0) / taskGrades.length).toFixed(2))
      : null;

    const { overallGrade } = calculateTermOverallGrade(
      student.modality,
      middleExamGrade,
      finalExamGrade,
      tasksAverage
    );

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
        middleExamGrade: middleExamGrade !== undefined && middleExamGrade !== null ? Number(middleExamGrade) : null,
        finalExamGrade: finalExamGrade !== undefined && finalExamGrade !== null ? Number(finalExamGrade) : null,
        tasksAverage,
        overallGrade,
        grammar: grammar !== undefined && grammar !== null ? Number(grammar) : null,
        reading: reading !== undefined && reading !== null ? Number(reading) : null,
        writing: writing !== undefined && writing !== null ? Number(writing) : null,
        listening: listening !== undefined && listening !== null ? Number(listening) : null,
        speaking: speaking !== undefined && speaking !== null ? Number(speaking) : null,
        observations: typeof observations === 'string' ? observations.trim() : null
      },
      update: {
        middleExamGrade: middleExamGrade !== undefined ? (middleExamGrade !== null ? Number(middleExamGrade) : null) : undefined,
        finalExamGrade: finalExamGrade !== undefined ? (finalExamGrade !== null ? Number(finalExamGrade) : null) : undefined,
        tasksAverage,
        overallGrade,
        grammar: grammar !== undefined ? (grammar !== null ? Number(grammar) : null) : undefined,
        reading: reading !== undefined ? (reading !== null ? Number(reading) : null) : undefined,
        writing: writing !== undefined ? (writing !== null ? Number(writing) : null) : undefined,
        listening: listening !== undefined ? (listening !== null ? Number(listening) : null) : undefined,
        speaking: speaking !== undefined ? (speaking !== null ? Number(speaking) : null) : undefined,
        observations: observations !== undefined ? (observations ? String(observations).trim() : null) : undefined
      }
    });

    res.json(termGrade);
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
    const targetCourseIds = courseId
      ? [courseId]
      : student.enrollments.map((e) => e.courseId);

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
          title: task.title,
          category: task.category,
          dueDate: task.dueDate,
          steps: stepsFormatted,
          taskGrade: finalTaskGrade,
          taskFeedback: delivery?.feedback || null,
          isCompleted: allStepsCompleted,
          completedAt,
          isLate
        };
      });

      const tasksAverage = taskScores.length > 0
        ? Number((taskScores.reduce((a, b) => a + b, 0) / taskScores.length).toFixed(2))
        : null;

      const onlineSkills = student.modality === 'ONLINE' ? calculateOnlineSkills(scoresBySkill) : null;
      const { overallGrade } = calculateTermOverallGrade(
        student.modality,
        existingTermGrade?.middleExamGrade,
        existingTermGrade?.finalExamGrade,
        tasksAverage
      );

      termsData[t] = {
        term: t,
        academicYear,
        middleExamGrade: existingTermGrade?.middleExamGrade ?? null,
        finalExamGrade: existingTermGrade?.finalExamGrade ?? null,
        tasksAverage,
        overallGrade: onlineSkills?.overallGrade ?? overallGrade,
        grammar: onlineSkills?.grammar ?? existingTermGrade?.grammar ?? null,
        reading: onlineSkills?.reading ?? existingTermGrade?.reading ?? null,
        writing: onlineSkills?.writing ?? existingTermGrade?.writing ?? null,
        listening: onlineSkills?.listening ?? existingTermGrade?.listening ?? null,
        speaking: onlineSkills?.speaking ?? existingTermGrade?.speaking ?? null,
        observations: existingTermGrade?.observations ?? null,
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

export default router;

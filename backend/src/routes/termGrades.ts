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

  // Para alumnos presenciales: 50% exámenes (media de middle y final) + 50% tareas prácticas
  let examAvg: number | null = null;
  if (cleanMiddle !== null && cleanFinal !== null) {
    examAvg = (cleanMiddle + cleanFinal) / 2;
  } else if (cleanMiddle !== null) {
    examAvg = cleanMiddle;
  } else if (cleanFinal !== null) {
    examAvg = cleanFinal;
  }

  if (examAvg !== null && cleanTasksAvg !== null) {
    const overall = (examAvg * 0.5) + (cleanTasksAvg * 0.5);
    return {
      tasksAverage: cleanTasksAvg,
      overallGrade: Number(overall.toFixed(2))
    };
  } else if (examAvg !== null) {
    return {
      tasksAverage: cleanTasksAvg,
      overallGrade: Number(examAvg.toFixed(2))
    };
  } else if (cleanTasksAvg !== null) {
    return {
      tasksAverage: cleanTasksAvg,
      overallGrade: Number(cleanTasksAvg.toFixed(2))
    };
  }

  return {
    tasksAverage: null,
    overallGrade: null
  };
};

const hasEvaluableStructuredStep = (task: { steps: Array<{ requiresSubmission?: boolean; material?: { type?: string } | null }> }) => {
  return task.steps.some((step) => {
    const isPassiveMedia = Boolean(step.material && ['VIDEO', 'AUDIO', 'IMAGE'].includes(step.material.type || ''));
    return !isPassiveMedia && Boolean(step.requiresSubmission || step.material?.type === 'FORM');
  });
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
      const studentTasksBreakdown = evaluableTasks.map((task) => {
        // Buscar delivery de la tarea
        const delivery = task.deliveries.find((d) => d.studentId === student.id);
        
        // Evaluar pasos
        const stepsDetail = task.steps.map((step) => {
          const isPassiveMedia = Boolean(step.material && ['VIDEO', 'AUDIO', 'IMAGE'].includes(step.material.type));
          const isEvaluable = !isPassiveMedia && Boolean(step.requiresSubmission || step.material?.type === 'FORM');
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
        let taskGrade: number | null = null;
        if (delivery?.grade !== null && delivery?.grade !== undefined) {
          taskGrade = delivery.grade;
        } else {
          // Media automática de pasos evaluables calificados
          const evaluableGraded = stepsDetail.filter(
            (s) => s.isEvaluable && typeof s.grade === 'number' && !isNaN(s.grade)
          );
          if (evaluableGraded.length > 0) {
            const sum = evaluableGraded.reduce((acc, curr) => acc + (curr.grade || 0), 0);
            taskGrade = Number((sum / evaluableGraded.length).toFixed(2));
          }
        }

        if (taskGrade !== null) {
          studentTasksScores.push(taskGrade);
        }

        const allStepsCompleted = stepsDetail.every((s) => s.isCompleted);
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
        overallGrade,
        grammar: existingRecord?.grammar ?? null,
        reading: existingRecord?.reading ?? null,
        writing: existingRecord?.writing ?? null,
        listening: existingRecord?.listening ?? null,
        speaking: existingRecord?.speaking ?? null,
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
      const delivery = t.deliveries[0];
      if (delivery?.grade !== null && delivery?.grade !== undefined) {
        taskGrades.push(delivery.grade);
      } else {
        const evaluableSteps = t.steps.filter((s) => s.requiresSubmission || s.materialId);
        const gradedSubmissions = evaluableSteps
          .map((s) => s.assignment?.submissions[0]?.grade)
          .filter((g): g is number => typeof g === 'number' && !isNaN(g));
        if (gradedSubmissions.length > 0) {
          const avg = gradedSubmissions.reduce((a, b) => a + b, 0) / gradedSubmissions.length;
          taskGrades.push(Number(avg.toFixed(2)));
        }
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
      const tasksFormatted = termTasks.map((task) => {
        const delivery = task.deliveries[0];
        const stepsFormatted = task.steps.map((step) => {
          const isPassiveMedia = Boolean(step.material && ['VIDEO', 'AUDIO', 'IMAGE'].includes(step.material.type));
          const isEvaluable = !isPassiveMedia && Boolean(step.requiresSubmission || step.material?.type === 'FORM');
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

        let finalTaskGrade: number | null = null;
        if (delivery?.grade !== null && delivery?.grade !== undefined) {
          finalTaskGrade = delivery.grade;
        } else {
          const graded = stepsFormatted.filter((s) => s.isEvaluable && typeof s.grade === 'number');
          if (graded.length > 0) {
            const sum = graded.reduce((acc, curr) => acc + (curr.grade || 0), 0);
            finalTaskGrade = Number((sum / graded.length).toFixed(2));
          }
        }

        if (finalTaskGrade !== null) {
          taskScores.push(finalTaskGrade);
        }

        const allStepsCompleted = stepsFormatted.every((s) => s.isCompleted);
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
        overallGrade,
        grammar: existingTermGrade?.grammar ?? null,
        reading: existingTermGrade?.reading ?? null,
        writing: existingTermGrade?.writing ?? null,
        listening: existingTermGrade?.listening ?? null,
        speaking: existingTermGrade?.speaking ?? null,
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

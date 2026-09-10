import { Router, Response } from 'express';
import { PrismaClient, StructuredTaskAssignmentType, SkillCategory } from '@prisma/client';
import { authenticateToken, requireTeacher, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const parsePublishAt = (value: unknown) => {
  if (!value) return { value: null as Date | null };
  const publishAt = new Date(String(value));
  if (Number.isNaN(publishAt.getTime()) || publishAt <= new Date()) return { error: 'La fecha de publicación debe ser futura.' };
  return { value: publishAt };
};

const getStudentName = (student: { profile: { firstName: string; lastName: string } | null; email: string } | null) => {
  if (!student) return null;
  return student.profile ? `${student.profile.firstName} ${student.profile.lastName}`.trim() : student.email;
};

const serializeTask = (task: any) => ({
  ...task,
  term: task.term || 1,
  delivery: Array.isArray(task.deliveries) && task.deliveries.length > 0 ? task.deliveries[0] : null,
  assignedStudentName: getStudentName(task.assignedStudent),
  assignedStudentIds: Array.isArray(task.assignedStudents) ? task.assignedStudents.map((item: any) => item.studentId) : (task.assignedStudentId ? [task.assignedStudentId] : []),
  assignedStudentNames: Array.isArray(task.assignedStudents) ? task.assignedStudents.map((item: any) => getStudentName(item.student)).filter(Boolean) : [],
  steps: (task.steps || []).map((step: any) => {
    const isPassiveMedia = Boolean(step.material && ['VIDEO', 'AUDIO', 'IMAGE'].includes(step.material.type));
    const isEvaluable = !isPassiveMedia && Boolean(step.requiresSubmission || step.material?.type === 'FORM');
    return {
      id: step.id,
      order: step.order,
      title: step.title,
      materialId: step.materialId,
      material: step.material,
      requiresSubmission: !isPassiveMedia && Boolean(step.requiresSubmission),
      isEvaluable,
      isCompleted: (Array.isArray(step.progress) && step.progress.length > 0) || Boolean(step.assignment?.submissions?.[0]),
      submission: step.assignment?.submissions?.[0] || null
    };
  })
});

const getTaskInclude = (studentId?: string) => ({
  assignedStudent: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
  assignedStudents: { include: { student: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } } } },
  deliveries: studentId ? { where: { studentId } } : true,
  steps: {
    orderBy: { order: 'asc' as const },
    include: {
      material: { select: { id: true, title: true, type: true, url: true, description: true, formData: true, level: true, category: true } },
      progress: studentId ? { where: { studentId }, select: { id: true, completedAt: true } } : { select: { id: true, studentId: true, completedAt: true } },
      assignment: studentId ? {
        include: {
          submissions: {
            where: { studentId },
            select: { id: true, content: true, grade: true, feedback: true, submittedAt: true }
          }
        }
      } : {
        include: {
          submissions: {
            select: { id: true, studentId: true, content: true, grade: true, feedback: true, submittedAt: true }
          }
        }
      }
    }
  }
});

const syncTaskDeliveryOnStepCompletion = async (taskId: string, studentId: string) => {
  try {
    const task = await prisma.structuredTask.findUnique({
      where: { id: taskId },
      include: {
        steps: {
          include: {
            material: true,
            progress: { where: { studentId } },
            assignment: {
              include: {
                submissions: { where: { studentId } }
              }
            }
          }
        },
        deliveries: { where: { studentId } }
      }
    });

    if (!task) return;

    const existingDelivery = task.deliveries[0];
    const evaluableSteps = task.steps.filter((s) => {
      const isPassiveMedia = Boolean(s.material && ['VIDEO', 'AUDIO', 'IMAGE'].includes(s.material.type));
      return !isPassiveMedia && (s.requiresSubmission || s.material?.type === 'FORM');
    });
    const gradedSubmissions = evaluableSteps
      .map((s) => s.assignment?.submissions[0]?.grade)
      .filter((g): g is number => typeof g === 'number' && !isNaN(g));

    let autoGrade: number | null = null;
    if (gradedSubmissions.length > 0) {
      const sum = gradedSubmissions.reduce((a, b) => a + b, 0);
      autoGrade = Number((sum / gradedSubmissions.length).toFixed(2));
    }

    const finalGrade = existingDelivery?.grade !== null && existingDelivery?.grade !== undefined
      ? existingDelivery.grade
      : autoGrade;

    const allStepsCompleted = task.steps.length > 0 && task.steps.every(
      (s) => s.progress.length > 0 || (s.assignment && s.assignment.submissions.length > 0)
    );

    await prisma.taskDelivery.upsert({
      where: { taskId_studentId: { taskId, studentId } },
      create: {
        taskId,
        studentId,
        grade: finalGrade,
        status: allStepsCompleted ? 'COMPLETED' : 'IN_PROGRESS'
      },
      update: {
        grade: finalGrade,
        status: allStepsCompleted ? (existingDelivery?.status === 'GRADED' ? 'GRADED' : 'COMPLETED') : 'IN_PROGRESS'
      }
    });
  } catch (err) {
    console.error('Error al sincronizar TaskDelivery:', err);
  }
};

const isStudentInCourse = async (studentId: string, courseId: string) => Boolean(await prisma.enrollment.findUnique({
  where: { studentId_courseId: { studentId, courseId } },
  select: { id: true }
}));

const canStudentAccessTask = async (
  studentId: string,
  task: { id?: string; courseId: string | null; assignmentType: StructuredTaskAssignmentType; assignedStudentId: string | null },
  taskId: string
) => {
  if (task.assignmentType === StructuredTaskAssignmentType.INDIVIDUAL) {
    if (task.assignedStudentId === studentId) return true;
    return Boolean(await prisma.structuredTaskStudent.findUnique({ where: { taskId_studentId: { taskId, studentId } } }));
  }
  return Boolean(task.courseId) && await isStudentInCourse(studentId, task.courseId as string);
};

const getBlankAnswers = (questionText: string) => Array.from(questionText.matchAll(/\(([^)]+)\)/g), (match) => match[1]);

const isTextCorrect = (answer: unknown, expected: string, caseSensitive = false) => {
  const received = String(answer || '').trim();
  const target = expected.trim();
  return caseSensitive ? received === target : received.toLowerCase() === target.toLowerCase();
};

const gradeForm = (questions: any[], answers: Record<string, unknown>) => {
  let score = 0;
  let total = 0;
  questions.forEach((question) => {
    const points = Number(question.points) || 1;
    total += points;
    const answer = answers[question.id];
    const correct = question.type === 'FILL_IN_THE_BLANKS'
      ? (() => {
        const expectedAnswers = getBlankAnswers(question.blankText || question.questionText || '');
        const submittedAnswers = Array.isArray(answer) ? answer : [];
        return expectedAnswers.length > 0 && expectedAnswers.every((expected, index) => isTextCorrect(submittedAnswers[index], expected, question.caseSensitive));
      })()
      : question.type === 'SHORT_ANSWER'
        ? isTextCorrect(answer, String(question.correctAnswer || ''), question.caseSensitive)
        : answer !== undefined && Number(answer) === Number(question.correctAnswer);
    if (correct) score += points;
  });
  return { score, total, grade: total ? (score / total) * 10 : 0 };
};

const getTargetStudentIds = (task: any, courseStudentIds: string[] = []) => {
  if (task.assignmentType === StructuredTaskAssignmentType.INDIVIDUAL) {
    const ids = new Set<string>();
    if (task.assignedStudentId) ids.add(task.assignedStudentId);
    if (Array.isArray(task.assignedStudents)) {
      task.assignedStudents.forEach((item: any) => {
        if (item.studentId) ids.add(item.studentId);
      });
    }
    return Array.from(ids);
  }
  return courseStudentIds;
};

const hasStudentCompletedStep = (step: any, studentId: string) => {
  const hasProgress = Array.isArray(step.progress) && step.progress.some((p: any) => p.studentId === studentId);
  const hasSubmission = Array.isArray(step.assignment?.submissions) && step.assignment.submissions.some((s: any) => s.studentId === studentId);
  return hasProgress || hasSubmission;
};

const buildTaskStats = (task: any, courseStudentIds: string[] = []) => {
  const targetStudentIds = getTargetStudentIds(task, courseStudentIds);
  const totalSteps = task.steps?.length || 0;
  const completedStudentsCount = totalSteps === 0 ? 0 : targetStudentIds.filter((studentId) =>
    task.steps.every((step: any) => hasStudentCompletedStep(step, studentId))
  ).length;

  return {
    totalTargetStudents: targetStudentIds.length,
    completedStudentsCount,
    completionRate: targetStudentIds.length > 0 ? Math.round((completedStudentsCount / targetStudentIds.length) * 100) : 0
  };
};

const resolveVisibleStudentId = async (req: AuthRequest, requestedStudentId?: string) => {
  if (req.user?.role === 'STUDENT') return req.user.id;
  if (req.user?.role !== 'PARENT') return null;
  const userEmail = (req.user as any).email || '';
  const child = await prisma.user.findFirst({
    where: {
      id: requestedStudentId || undefined,
      role: 'STUDENT',
      OR: [{ parentId: req.user.id }, { parent: { email: { equals: userEmail, mode: 'insensitive' } } }]
    },
    select: { id: true }
  });
  return child?.id || null;
};

// 1. Tareas creadas por el profesor (o de sus cursos)
router.get('/teacher', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const isTemplateParam = req.query.isTemplate;
    const whereClause: any = {
      OR: [{ teacherId: req.user!.id }, { course: { teacherId: req.user!.id } }]
    };

    if (isTemplateParam === 'true') {
      whereClause.isTemplate = true;
    } else if (isTemplateParam === 'false') {
      whereClause.isTemplate = false;
    }

    const tasks = await prisma.structuredTask.findMany({
      where: whereClause,
      include: getTaskInclude(),
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }]
    });
    const courseIds = [...new Set(tasks.map((task) => task.courseId).filter(Boolean))] as string[];
    const enrollments = courseIds.length > 0
      ? await prisma.enrollment.findMany({ where: { courseId: { in: courseIds } }, select: { courseId: true, studentId: true } })
      : [];
    const studentsByCourse = new Map<string, string[]>();
    enrollments.forEach((enrollment) => {
      studentsByCourse.set(enrollment.courseId, [...(studentsByCourse.get(enrollment.courseId) || []), enrollment.studentId]);
    });

    res.json(tasks.map((task) => ({
      ...serializeTask(task),
      stats: buildTaskStats(task, task.courseId ? studentsByCourse.get(task.courseId) || [] : [])
    })));
  } catch (error) {
    console.error('Error al obtener tareas estructuradas:', error);
    res.status(500).json({ error: 'Error al obtener tareas estructuradas.' });
  }
});

// 2. Plantillas del catálogo reutilizable
router.get('/templates', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.structuredTask.findMany({
      where: {
        isTemplate: true,
        OR: [{ teacherId: req.user!.id }, { teacherId: null }]
      },
      include: getTaskInclude(),
      orderBy: { updatedAt: 'desc' }
    });
    res.json(templates.map(serializeTask));
  } catch (error) {
    console.error('Error al obtener plantillas:', error);
    res.status(500).json({ error: 'Error al obtener plantillas.' });
  }
});

// 3. Tareas estructuradas de un curso (para profesor con estadísticas, o para alumno/tutor)
router.get('/course/:courseId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.courseId as string;

    if (req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN') {
      const tasks = await prisma.structuredTask.findMany({
        where: { courseId, isTemplate: false },
        include: {
          assignedStudent: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
          assignedStudents: { include: { student: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } } } },
          steps: {
            orderBy: { order: 'asc' },
            include: {
              material: { select: { id: true, title: true, type: true, url: true, description: true, formData: true, level: true, category: true } },
              progress: {
                select: { id: true, studentId: true, completedAt: true }
              },
              assignment: {
                include: {
                  submissions: {
                    include: {
                      student: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }]
      });

      const courseEnrollments = await prisma.enrollment.findMany({ where: { courseId }, select: { studentId: true } });
      const courseStudentIds = courseEnrollments.map((enrollment) => enrollment.studentId);

      const tasksWithStats = tasks.map((task) => {
        return {
          ...serializeTask(task),
          stats: buildTaskStats(task, courseStudentIds)
        };
      });

      return res.json(tasksWithStats);
    }

    // Flujo Alumno / Tutor
    const requestedStudentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const studentId = await resolveVisibleStudentId(req, requestedStudentId);
    if (!studentId || !await isStudentInCourse(studentId, courseId)) return res.status(403).json({ error: 'No tienes acceso a estas tareas.' });

    const tasks = await prisma.structuredTask.findMany({
      where: {
        courseId,
        isTemplate: false,
        AND: [{ OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] }],
        assignmentType: StructuredTaskAssignmentType.CLASS
      } as any,
      include: getTaskInclude(studentId),
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }]
    });
    res.json(tasks.map(serializeTask));
  } catch (error) {
    console.error('Error al obtener tareas estructuradas del curso:', error);
    res.status(500).json({ error: 'Error al obtener tareas estructuradas.' });
  }
});

// 4. Mis tareas (para alumno o tutor)
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const requestedStudentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const studentId = await resolveVisibleStudentId(req, requestedStudentId);
    if (!studentId) return res.status(403).json({ error: 'No tienes acceso a estas tareas.' });

    const enrollments = await prisma.enrollment.findMany({ where: { studentId }, select: { courseId: true } });
    const courseIds = enrollments.map((enrollment) => enrollment.courseId);
    const tasks = await prisma.structuredTask.findMany({
      where: {
        isTemplate: false,
        AND: [{ OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] }],
        OR: [
          { assignmentType: StructuredTaskAssignmentType.INDIVIDUAL, assignedStudentId: studentId },
          { assignmentType: StructuredTaskAssignmentType.INDIVIDUAL, assignedStudents: { some: { studentId } } }
        ]
      } as any,
      include: getTaskInclude(studentId),
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }]
    });
    res.json(tasks.map(serializeTask));
  } catch (error) {
    console.error('Error al obtener tareas estructuradas del alumno:', error);
    res.status(500).json({ error: 'Error al obtener tareas estructuradas.' });
  }
});

// 5. Entrega de formulario / examen autocorregible
router.post('/steps/:stepId/submit-form', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'STUDENT') return res.status(403).json({ error: 'Solo el alumno puede realizar el examen.' });
  const stepId = req.params.stepId as string;
  const answers = req.body?.answers;
  if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'Las respuestas del examen son obligatorias.' });

  try {
    const step = await prisma.structuredTaskStep.findUnique({
      where: { id: stepId },
      include: { material: true, task: { include: { course: { select: { teacherId: true } } } } }
    });
    if (!step?.material || step.material.type !== 'FORM' || !step.material.formData) return res.status(400).json({ error: 'Este paso no contiene un examen interactivo.' });
    if (!await canStudentAccessTask(req.user.id, step.task, step.taskId)) return res.status(403).json({ error: 'No tienes acceso a este examen.' });

    const teacherId = step.task.course?.teacherId || step.task.teacherId;
    if (!teacherId) return res.status(400).json({ error: 'La tarea no tiene profesor asociado.' });

    const assignment = await prisma.assignment.upsert({
      where: { structuredTaskStepId: step.id },
      create: {
        teacherId,
        courseId: step.task.courseId,
        studentId: step.task.assignmentType === StructuredTaskAssignmentType.INDIVIDUAL ? req.user.id : null,
        materialId: step.material.id,
        structuredTaskStepId: step.id,
        title: `${step.material.title} (${step.task.title})`,
        description: step.task.description || step.title,
        category: step.task.category || step.material.category
      },
      update: {
        title: `${step.material.title} (${step.task.title})`
      }
    });
    const existingSubmission = await prisma.submission.findUnique({ where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: req.user.id } } });
    if (existingSubmission) return res.status(409).json({ error: 'Este examen ya ha sido realizado.', submission: existingSubmission });

    const formData = step.material.formData as { questions?: any[] };
    const result = gradeForm(formData.questions || [], answers);
    const submission = await prisma.$transaction(async (transaction) => {
      const created = await transaction.submission.create({
        data: {
          assignmentId: assignment.id,
          studentId: req.user!.id,
          structuredTaskId: step.taskId,
          formId: step.materialId,
          content: JSON.stringify({ answers, score: result.score, total: result.total }),
          grade: result.grade
        }
      });
      await transaction.structuredTaskStepProgress.upsert({
        where: { stepId_studentId: { stepId, studentId: req.user!.id } },
        create: { stepId, studentId: req.user!.id },
        update: { completedAt: new Date() }
      });
      return created;
    });
    await syncTaskDeliveryOnStepCompletion(step.taskId, req.user!.id);
    res.status(201).json({ submission, score: result.score, total: result.total, grade: result.grade });
  } catch (error) {
    console.error('Error al entregar examen estructurado:', error);
    res.status(500).json({ error: 'Error al entregar el examen.' });
  }
});

// 6. Entrega de texto / enlace / archivo para cualquier paso
router.post('/steps/:stepId/submit-delivery', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'STUDENT') return res.status(403).json({ error: 'Solo el alumno puede realizar entregas.' });
  const stepId = req.params.stepId as string;
  const { content, link, attachment } = req.body;

  try {
    const step = await prisma.structuredTaskStep.findUnique({
      where: { id: stepId },
      include: {
        material: true,
        task: { include: { course: { select: { teacherId: true } } } }
      }
    });

    if (!step || !await canStudentAccessTask(req.user.id, step.task, step.taskId)) {
      return res.status(403).json({ error: 'No tienes acceso a este paso.' });
    }

    const teacherId = step.task.course?.teacherId || step.task.teacherId;
    if (!teacherId) return res.status(400).json({ error: 'La tarea no tiene profesor asociado.' });

    const assignment = await prisma.assignment.upsert({
      where: { structuredTaskStepId: step.id },
      create: {
        teacherId,
        courseId: step.task.courseId,
        studentId: step.task.assignmentType === StructuredTaskAssignmentType.INDIVIDUAL ? req.user.id : null,
        materialId: step.materialId || null,
        structuredTaskStepId: step.id,
        title: `${step.title} (${step.task.title})`,
        description: step.task.description || step.title,
        category: step.task.category || step.material?.category || 'WRITING'
      },
      update: {
        title: `${step.title} (${step.task.title})`
      }
    });

    const normalizedContent = (() => {
      if (!content && !attachment && !link) return null;
      if (attachment && typeof attachment === 'object') {
        return JSON.stringify({
          text: typeof content === 'string' ? content : '',
          link: typeof link === 'string' ? link : null,
          attachment
        });
      }
      if (link && typeof link === 'string') {
        return JSON.stringify({ text: typeof content === 'string' ? content : '', link });
      }
      return typeof content === 'string' ? content : null;
    })();

    const submission = await prisma.$transaction(async (transaction) => {
      const sub = await transaction.submission.upsert({
        where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: req.user!.id } },
        create: {
          assignmentId: assignment.id,
          studentId: req.user!.id,
          structuredTaskId: step.taskId,
          content: normalizedContent
        },
        update: {
          content: normalizedContent,
          submittedAt: new Date()
        }
      });

      await transaction.structuredTaskStepProgress.upsert({
        where: { stepId_studentId: { stepId, studentId: req.user!.id } },
        create: { stepId, studentId: req.user!.id },
        update: { completedAt: new Date() }
      });

      return sub;
    });

    await syncTaskDeliveryOnStepCompletion(step.taskId, req.user!.id);
    res.status(201).json({ submission, success: true });
  } catch (error) {
    console.error('Error al entregar paso:', error);
    res.status(500).json({ error: 'Error al registrar la entrega.' });
  }
});

// 7. Marcar paso simple como completado (Lecturas, Vídeos, Audios)
router.post('/steps/:stepId/complete', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'STUDENT') return res.status(403).json({ error: 'Solo el alumno puede completar pasos.' });
  try {
    const stepId = req.params.stepId as string;
    const step = await prisma.structuredTaskStep.findUnique({
      where: { id: stepId },
      include: { task: { select: { courseId: true, assignmentType: true, assignedStudentId: true } } }
    });
    if (!step || !await canStudentAccessTask(req.user.id, step.task, step.taskId)) return res.status(403).json({ error: 'No tienes acceso a este paso.' });
    const progress = await prisma.structuredTaskStepProgress.upsert({
      where: { stepId_studentId: { stepId, studentId: req.user.id } },
      create: { stepId, studentId: req.user.id },
      update: { completedAt: new Date() }
    });
    await syncTaskDeliveryOnStepCompletion(step.taskId, req.user!.id);
    res.json(progress);
  } catch (error) {
    console.error('Error al completar paso estructurado:', error);
    res.status(500).json({ error: 'Error al completar el paso.' });
  }
});

// 8. Crear nueva tarea o plantilla
router.post('/', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const { title, description, dueDate, publishAt, term, category, isTemplate, courseId, assignmentType, assignedStudentId, assignedStudentIds, isSequential, steps } = req.body;
  const isTemplateTask = Boolean(isTemplate);
  const recipientIds = Array.isArray(assignedStudentIds) ? assignedStudentIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0) : (assignedStudentId ? [assignedStudentId] : []);

  if (!title?.trim() || !Array.isArray(steps) || steps.length === 0) return res.status(400).json({ error: 'Título y al menos un paso son obligatorios.' });
  const parsedPublishAt = parsePublishAt(publishAt);
  if (parsedPublishAt.error) return res.status(400).json({ error: parsedPublishAt.error });

  if (!isTemplateTask) {
    if (assignmentType !== 'CLASS' && assignmentType !== 'INDIVIDUAL') return res.status(400).json({ error: 'Tipo de asignación no válido.' });
    if (assignmentType === 'CLASS' && !courseId) return res.status(400).json({ error: 'Selecciona la clase destinataria.' });
    if (assignmentType === 'INDIVIDUAL' && recipientIds.length === 0) return res.status(400).json({ error: 'Selecciona al menos un alumno.' });
  }

  try {
    if (!isTemplateTask && assignmentType === 'CLASS') {
      const course = await prisma.course.findFirst({ where: { id: courseId, teacherId: req.user!.id } });
      if (!course) return res.status(403).json({ error: 'No puedes asignar tareas a esta clase.' });
    }

    const task = await prisma.structuredTask.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        publishAt: isTemplateTask ? null : parsedPublishAt.value,
        term: typeof term === 'number' ? term : (parseInt(term) || 1),
        isTemplate: isTemplateTask,
        category: (category as SkillCategory) || SkillCategory.GRAMMAR_VOCABULARY,
        courseId: (!isTemplateTask && assignmentType === 'CLASS') ? courseId : null,
        teacherId: req.user!.id,
        assignmentType: isTemplateTask ? StructuredTaskAssignmentType.CLASS : assignmentType,
        isSequential: Boolean(isSequential),
        assignedStudentId: (!isTemplateTask && assignmentType === 'INDIVIDUAL') ? recipientIds[0] : null,
        assignedStudents: (!isTemplateTask && assignmentType === 'INDIVIDUAL') ? { create: recipientIds.map((studentId) => ({ studentId })) } : undefined,
        steps: { create: steps.filter((step: any) => step.title?.trim()).map((step: any, index: number) => ({ order: index + 1, title: step.title.trim(), materialId: step.materialId || null, requiresSubmission: Boolean(step.requiresSubmission) })) }
      },
      include: getTaskInclude()
    });
    res.status(201).json(serializeTask(task));
  } catch (error) {
    console.error('Error al crear tarea estructurada:', error);
    res.status(500).json({ error: 'Error al crear la tarea estructurada.' });
  }
});

// 9. Duplicar tarea o plantilla (Clonación)
router.post('/:id/duplicate', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id as string;
    const { title, courseId, assignmentType, assignedStudentIds, dueDate, isTemplate } = req.body;

    const sourceTask = await prisma.structuredTask.findFirst({
      where: { id: taskId, OR: [{ teacherId: req.user!.id }, { course: { teacherId: req.user!.id } }] },
      include: { steps: { orderBy: { order: 'asc' } } }
    });

    if (!sourceTask) {
      return res.status(404).json({ error: 'Tarea no encontrada.' });
    }

    const targetIsTemplate = isTemplate !== undefined ? Boolean(isTemplate) : sourceTask.isTemplate;
    const newTitle = title?.trim() || (targetIsTemplate ? `[Plantilla] ${sourceTask.title}` : `[Copia] ${sourceTask.title}`);
    const newCourseId = courseId !== undefined ? courseId : sourceTask.courseId;
    const newAssignmentType = assignmentType || sourceTask.assignmentType;
    const recipientIds = Array.isArray(assignedStudentIds) ? assignedStudentIds : [];

    const duplicatedTask = await prisma.structuredTask.create({
      data: {
        title: newTitle,
        description: sourceTask.description,
        dueDate: dueDate ? new Date(dueDate) : (!targetIsTemplate ? sourceTask.dueDate : null),
        term: sourceTask.term,
        isTemplate: targetIsTemplate,
        category: sourceTask.category,
        courseId: (!targetIsTemplate && newAssignmentType === 'CLASS') ? newCourseId : null,
        teacherId: req.user!.id,
        assignmentType: targetIsTemplate ? StructuredTaskAssignmentType.CLASS : newAssignmentType,
        isSequential: sourceTask.isSequential,
        assignedStudentId: (!targetIsTemplate && newAssignmentType === 'INDIVIDUAL' && recipientIds.length > 0) ? recipientIds[0] : null,
        assignedStudents: (!targetIsTemplate && newAssignmentType === 'INDIVIDUAL' && recipientIds.length > 0) ? {
          create: recipientIds.map((studentId: string) => ({ studentId }))
        } : undefined,
        steps: {
          create: sourceTask.steps.map((step) => ({
            order: step.order,
            title: step.title,
            materialId: step.materialId,
            requiresSubmission: step.requiresSubmission
          }))
        }
      },
      include: getTaskInclude()
    });

    res.status(201).json(serializeTask(duplicatedTask));
  } catch (error) {
    console.error('Error al duplicar tarea estructurada:', error);
    res.status(500).json({ error: 'Error al duplicar la tarea.' });
  }
});

// 10. Guardar tarea como plantilla reutilizable
router.post('/:id/save-as-template', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id as string;
    const { title } = req.body || {};

    const sourceTask = await prisma.structuredTask.findFirst({
      where: {
        id: taskId,
        OR: [
          { teacherId: req.user!.id },
          { course: { teacherId: req.user!.id } }
        ]
      },
      include: { steps: { orderBy: { order: 'asc' } } }
    });

    if (!sourceTask) {
      return res.status(404).json({ error: 'Tarea no encontrada.' });
    }

    const templateTitle = title?.trim() || `[Plantilla] ${sourceTask.title}`;

    const template = await prisma.structuredTask.create({
      data: {
        title: templateTitle,
        description: sourceTask.description,
        dueDate: null,
        publishAt: null,
        term: sourceTask.term,
        isTemplate: true,
        category: sourceTask.category,
        courseId: null,
        teacherId: req.user!.id,
        assignmentType: StructuredTaskAssignmentType.CLASS,
        isSequential: sourceTask.isSequential,
        steps: {
          create: sourceTask.steps.map((step) => ({
            order: step.order,
            title: step.title,
            materialId: step.materialId,
            requiresSubmission: step.requiresSubmission
          }))
        }
      },
      include: getTaskInclude()
    });

    res.status(201).json(serializeTask(template));
  } catch (error) {
    console.error('Error al guardar plantilla:', error);
    res.status(500).json({ error: 'Error al guardar como plantilla.' });
  }
});

// 11. Actualizar tarea estructurada (RECONCILIACIÓN SEGURA: no destruye progreso)
router.put('/:id', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const taskId = req.params.id as string;
  const { title, description, dueDate, publishAt, term, category, isTemplate, courseId, assignmentType, assignedStudentId, assignedStudentIds, isSequential, steps } = req.body;
  const isTemplateTask = Boolean(isTemplate);
  const recipientIds = Array.isArray(assignedStudentIds) ? assignedStudentIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0) : (assignedStudentId ? [assignedStudentId] : []);

  if (!title?.trim() || !Array.isArray(steps) || steps.length === 0) return res.status(400).json({ error: 'Título y al menos un paso son obligatorios.' });
  const parsedPublishAt = parsePublishAt(publishAt);
  if (parsedPublishAt.error) return res.status(400).json({ error: parsedPublishAt.error });

  try {
    const existing = await prisma.structuredTask.findFirst({
      where: { id: taskId, OR: [{ teacherId: req.user!.id }, { course: { teacherId: req.user!.id } }] },
      include: { steps: true }
    });
    if (!existing) return res.status(404).json({ error: 'Tarea no encontrada.' });

    if (!isTemplateTask && assignmentType === 'CLASS') {
      const course = await prisma.course.findFirst({ where: { id: courseId, teacherId: req.user!.id } });
      if (!course) return res.status(404).json({ error: 'Clase no encontrada.' });
    }

    const task = await prisma.$transaction(async (transaction) => {
      // 1. Reconciliar pasos existentes vs nuevos vs eliminados
      const existingStepMap = new Map(existing.steps.map(s => [s.id, s]));
      const incomingStepIds = new Set<string>();

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepTitle = (step.title || '').trim();
        if (!stepTitle) continue;

        if (step.id && existingStepMap.has(step.id)) {
          incomingStepIds.add(step.id);
          await transaction.structuredTaskStep.update({
            where: { id: step.id },
            data: {
              order: i + 1,
              title: stepTitle,
              materialId: step.materialId || null,
              requiresSubmission: Boolean(step.requiresSubmission)
            }
          });
        } else {
          const createdStep = await transaction.structuredTaskStep.create({
            data: {
              taskId,
              order: i + 1,
              title: stepTitle,
              materialId: step.materialId || null,
              requiresSubmission: Boolean(step.requiresSubmission)
            }
          });
          incomingStepIds.add(createdStep.id);
        }
      }

      // Eliminar pasos que ya no están
      const stepsToDelete = existing.steps.filter(s => !incomingStepIds.has(s.id));
      if (stepsToDelete.length > 0) {
        await transaction.structuredTaskStep.deleteMany({
          where: { id: { in: stepsToDelete.map(s => s.id) } }
        });
      }

      // 2. Reconciliar alumnos asignados
      await transaction.structuredTaskStudent.deleteMany({ where: { taskId } });
      if (!isTemplateTask && assignmentType === 'INDIVIDUAL' && recipientIds.length > 0) {
        await transaction.structuredTaskStudent.createMany({
          data: recipientIds.map((studentId: string) => ({ taskId, studentId }))
        });
      }

      // 3. Actualizar cabecera de la tarea
      return transaction.structuredTask.update({
        where: { id: taskId },
        data: {
          title: title.trim(),
          description: description !== undefined ? (description?.trim() || null) : existing.description,
          dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
          publishAt: isTemplateTask ? null : parsedPublishAt.value,
          term: term !== undefined ? (typeof term === 'number' ? term : (parseInt(term) || 1)) : existing.term,
          category: category ? (category as SkillCategory) : existing.category,
          isTemplate: isTemplateTask,
          courseId: (!isTemplateTask && assignmentType === 'CLASS') ? courseId : null,
          assignmentType: isTemplateTask ? StructuredTaskAssignmentType.CLASS : assignmentType,
          isSequential: Boolean(isSequential),
          assignedStudentId: (!isTemplateTask && assignmentType === 'INDIVIDUAL') ? recipientIds[0] : null
        },
        include: getTaskInclude()
      });
    });

    res.json(serializeTask(task));
  } catch (error) {
    console.error('Error al actualizar tarea estructurada:', error);
    res.status(500).json({ error: 'Error al actualizar la tarea estructurada.' });
  }
});

// 12. Obtener entrega detallada de un alumno para una tarea estructurada
router.get('/:id/student/:studentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const taskId = req.params.id as string;
  const studentId = req.params.studentId as string;

  try {
    if (req.user?.role === 'STUDENT' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'No autorizado para ver esta entrega.' });
    }

    const task = await prisma.structuredTask.findUnique({
      where: { id: taskId },
      include: {
        course: { select: { id: true, title: true, teacherId: true } },
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
        },
        deliveries: { where: { studentId } }
      }
    });

    if (!task) return res.status(404).json({ error: 'Tarea no encontrada.' });

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } }
    });

    res.json({
      task: serializeTask(task),
      student,
      delivery: task.deliveries[0] || null
    });
  } catch (error) {
    console.error('Error al obtener entrega detallada:', error);
    res.status(500).json({ error: 'Error al obtener la entrega.' });
  }
});

// 13. Calificar entrega global de tarea estructurada y guardar feedback pedagógico paso a paso
router.post('/:id/grade-delivery', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const taskId = req.params.id as string;
  const { studentId, grade, feedback, status, stepEvaluations } = req.body;

  if (!studentId) return res.status(400).json({ error: 'El ID de alumno es obligatorio.' });

  try {
    const task = await prisma.structuredTask.findFirst({
      where: { id: taskId, OR: [{ teacherId: req.user!.id }, { course: { teacherId: req.user!.id } }] },
      include: {
        course: true,
        steps: {
          include: { assignment: true }
        }
      }
    });
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada o no autorizada.' });

    const parsedGrade = grade !== undefined && grade !== null && grade !== '' ? Number(grade) : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Guardar o actualizar calificaciones individuales de cada paso evaluable si se enviaron
      if (Array.isArray(stepEvaluations) && stepEvaluations.length > 0) {
        for (const item of stepEvaluations) {
          if (!item.stepId) continue;
          const step = task.steps.find((s) => s.id === item.stepId);
          if (!step) continue;

          let assignmentId = step.assignment?.id;
          if (!assignmentId) {
            const teacherId = task.course?.teacherId || task.teacherId || req.user!.id;
            const createdAssignment = await tx.assignment.create({
              data: {
                teacherId,
                courseId: task.courseId,
                studentId: task.assignmentType === StructuredTaskAssignmentType.INDIVIDUAL ? studentId : null,
                materialId: step.materialId || null,
                structuredTaskStepId: step.id,
                title: `${step.title} (${task.title})`,
                description: task.description || step.title,
                category: task.category || 'WRITING'
              }
            });
            assignmentId = createdAssignment.id;
          }

          const parsedStepGrade = item.grade !== undefined && item.grade !== null && item.grade !== '' ? Number(item.grade) : null;
          const stepFeedback = typeof item.feedback === 'string' ? item.feedback.trim() : null;

          await tx.submission.upsert({
            where: { assignmentId_studentId: { assignmentId, studentId } },
            create: {
              assignmentId,
              studentId,
              structuredTaskId: taskId,
              grade: parsedStepGrade,
              feedback: stepFeedback
            },
            update: {
              grade: parsedStepGrade,
              feedback: stepFeedback !== undefined ? stepFeedback : undefined
            }
          });
        }
      }

      // 2. Guardar entrega y nota global de la tarea
      const delivery = await tx.taskDelivery.upsert({
        where: { taskId_studentId: { taskId, studentId } },
        create: {
          taskId,
          studentId,
          grade: parsedGrade,
          feedback: feedback ? String(feedback).trim() : null,
          status: status || (parsedGrade !== null ? 'GRADED' : 'COMPLETED'),
          gradedAt: parsedGrade !== null ? new Date() : null
        },
        update: {
          grade: parsedGrade,
          feedback: feedback !== undefined ? (feedback ? String(feedback).trim() : null) : undefined,
          status: status || (parsedGrade !== null ? 'GRADED' : undefined),
          gradedAt: parsedGrade !== null ? new Date() : undefined
        }
      });

      return delivery;
    });

    res.json({ success: true, delivery: result });
  } catch (error) {
    console.error('Error al calificar entrega de tarea:', error);
    res.status(500).json({ error: 'Error al registrar la calificación de la tarea.' });
  }
});

// 12. Eliminar tarea estructurada
router.delete('/:id', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const taskId = req.params.id as string;
  try {
    const existing = await prisma.structuredTask.findFirst({
      where: { id: taskId, OR: [{ teacherId: req.user!.id }, { course: { teacherId: req.user!.id } }] }
    });
    if (!existing) return res.status(404).json({ error: 'Tarea no encontrada.' });

    await prisma.structuredTask.delete({ where: { id: taskId } });
    res.json({ success: true, message: 'Tarea eliminada con éxito.' });
  } catch (error) {
    console.error('Error al eliminar tarea estructurada:', error);
    res.status(500).json({ error: 'Error al eliminar tarea.' });
  }
});

export default router;
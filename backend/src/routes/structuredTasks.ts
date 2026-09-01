import { Router, Response } from 'express';
import { PrismaClient, StructuredTaskAssignmentType } from '@prisma/client';
import { authenticateToken, requireTeacher, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const getStudentName = (student: { profile: { firstName: string; lastName: string } | null; email: string } | null) => {
  if (!student) return null;
  return student.profile ? `${student.profile.firstName} ${student.profile.lastName}`.trim() : student.email;
};

const serializeTask = (task: any) => ({
  ...task,
  assignedStudentName: getStudentName(task.assignedStudent),
  steps: task.steps.map((step: any) => ({
    id: step.id,
    order: step.order,
    title: step.title,
    materialId: step.materialId,
    material: step.material,
    isCompleted: Array.isArray(step.progress) && step.progress.length > 0,
    submission: step.assignment?.submissions?.[0] || null
  }))
});

const getTaskInclude = (studentId?: string) => ({
  assignedStudent: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
  steps: {
    orderBy: { order: 'asc' as const },
    include: {
      material: { select: { id: true, title: true, type: true, url: true, description: true, formData: true } },
      progress: studentId ? { where: { studentId }, select: { id: true } } : false,
      assignment: studentId ? { include: { submissions: { where: { studentId }, select: { id: true, content: true, grade: true, feedback: true, submittedAt: true } } } } : false
    }
  }
});

const isStudentInCourse = async (studentId: string, courseId: string) => Boolean(await prisma.enrollment.findUnique({
  where: { studentId_courseId: { studentId, courseId } },
  select: { id: true }
}));

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

router.get('/teacher', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await prisma.structuredTask.findMany({
      where: { course: { teacherId: req.user!.id } },
      include: getTaskInclude(),
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks.map(serializeTask));
  } catch (error) {
    console.error('Error al obtener tareas estructuradas:', error);
    res.status(500).json({ error: 'Error al obtener tareas estructuradas.' });
  }
});

router.get('/course/:courseId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.courseId as string;
    const requestedStudentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const studentId = await resolveVisibleStudentId(req, requestedStudentId);
    if (!studentId || !await isStudentInCourse(studentId, courseId)) return res.status(403).json({ error: 'No tienes acceso a estas tareas.' });

    const tasks = await prisma.structuredTask.findMany({
      where: { courseId, OR: [{ assignmentType: StructuredTaskAssignmentType.CLASS }, { assignmentType: StructuredTaskAssignmentType.INDIVIDUAL, assignedStudentId: studentId }] },
      include: getTaskInclude(studentId),
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks.map(serializeTask));
  } catch (error) {
    console.error('Error al obtener tareas estructuradas del alumno:', error);
    res.status(500).json({ error: 'Error al obtener tareas estructuradas.' });
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const requestedStudentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const studentId = await resolveVisibleStudentId(req, requestedStudentId);
    if (!studentId) return res.status(403).json({ error: 'No tienes acceso a estas tareas.' });

    const enrollments = await prisma.enrollment.findMany({ where: { studentId }, select: { courseId: true } });
    const courseIds = enrollments.map((enrollment) => enrollment.courseId);
    const tasks = await prisma.structuredTask.findMany({
      where: { courseId: { in: courseIds }, OR: [{ assignmentType: StructuredTaskAssignmentType.CLASS }, { assignmentType: StructuredTaskAssignmentType.INDIVIDUAL, assignedStudentId: studentId }] },
      include: getTaskInclude(studentId),
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks.map(serializeTask));
  } catch (error) {
    console.error('Error al obtener tareas estructuradas del alumno:', error);
    res.status(500).json({ error: 'Error al obtener tareas estructuradas.' });
  }
});

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
    if (!await isStudentInCourse(req.user.id, step.task.courseId)) return res.status(403).json({ error: 'No tienes acceso a este examen.' });
    if (step.task.assignmentType === StructuredTaskAssignmentType.INDIVIDUAL && step.task.assignedStudentId !== req.user.id) return res.status(403).json({ error: 'Este examen no está asignado a tu cuenta.' });

    const assignment = await prisma.assignment.upsert({
      where: { structuredTaskStepId: step.id },
      create: {
        teacherId: step.task.course.teacherId,
        courseId: step.task.courseId,
        studentId: step.task.assignmentType === StructuredTaskAssignmentType.INDIVIDUAL ? req.user.id : null,
        materialId: step.material.id,
        structuredTaskStepId: step.id,
        title: `${step.material.title} (${step.task.title})`,
        description: step.title,
        category: step.material.category
      },
      update: {}
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
    res.status(201).json({ submission, score: result.score, total: result.total, grade: result.grade });
  } catch (error) {
    console.error('Error al entregar examen estructurado:', error);
    res.status(500).json({ error: 'Error al entregar el examen.' });
  }
});

router.post('/steps/:stepId/complete', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'STUDENT') return res.status(403).json({ error: 'Solo el alumno puede completar pasos.' });
  try {
    const stepId = req.params.stepId as string;
    const step = await prisma.structuredTaskStep.findUnique({
      where: { id: stepId },
      include: { task: { select: { courseId: true, assignmentType: true, assignedStudentId: true } } }
    });
    if (!step || !await isStudentInCourse(req.user.id, step.task.courseId)) return res.status(403).json({ error: 'No tienes acceso a este paso.' });
    if (step.task.assignmentType === StructuredTaskAssignmentType.INDIVIDUAL && step.task.assignedStudentId !== req.user.id) return res.status(403).json({ error: 'Este paso no está asignado a tu cuenta.' });
    const progress = await prisma.structuredTaskStepProgress.upsert({
      where: { stepId_studentId: { stepId, studentId: req.user.id } },
      create: { stepId, studentId: req.user.id },
      update: { completedAt: new Date() }
    });
    res.json(progress);
  } catch (error) {
    console.error('Error al completar paso estructurado:', error);
    res.status(500).json({ error: 'Error al completar el paso.' });
  }
});

router.post('/', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const { title, courseId, assignmentType, assignedStudentId, steps } = req.body;
  if (!title?.trim() || !courseId || !Array.isArray(steps) || steps.length === 0) return res.status(400).json({ error: 'Título, clase y al menos un paso son obligatorios.' });
  if (assignmentType !== 'CLASS' && assignmentType !== 'INDIVIDUAL') return res.status(400).json({ error: 'Tipo de asignación no válido.' });
  if (assignmentType === 'INDIVIDUAL' && !assignedStudentId) return res.status(400).json({ error: 'Selecciona un alumno.' });

  try {
    const course = await prisma.course.findFirst({ where: { id: courseId, teacherId: req.user!.id } });
    if (!course) return res.status(403).json({ error: 'No puedes asignar tareas a esta clase.' });
    if (assignmentType === 'INDIVIDUAL' && !await isStudentInCourse(assignedStudentId, courseId)) return res.status(400).json({ error: 'El alumno no está matriculado en esta clase.' });

    const task = await prisma.structuredTask.create({
      data: {
        title: title.trim(), courseId, assignmentType, assignedStudentId: assignmentType === 'INDIVIDUAL' ? assignedStudentId : null,
        steps: { create: steps.filter((step: any) => step.title?.trim()).map((step: any, index: number) => ({ order: index + 1, title: step.title.trim(), materialId: step.materialId || null })) }
      },
      include: getTaskInclude()
    });
    res.status(201).json(serializeTask(task));
  } catch (error) {
    console.error('Error al crear tarea estructurada:', error);
    res.status(500).json({ error: 'Error al crear la tarea estructurada.' });
  }
});

router.put('/:id', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const taskId = req.params.id as string;
  const { title, courseId, assignmentType, assignedStudentId, steps } = req.body;
  if (!title?.trim() || !courseId || !Array.isArray(steps) || steps.length === 0) return res.status(400).json({ error: 'Título, clase y al menos un paso son obligatorios.' });

  try {
    const existing = await prisma.structuredTask.findFirst({ where: { id: taskId, course: { teacherId: req.user!.id } } });
    const course = await prisma.course.findFirst({ where: { id: courseId, teacherId: req.user!.id } });
    if (!existing || !course) return res.status(404).json({ error: 'Tarea o clase no encontrada.' });
    if (assignmentType === 'INDIVIDUAL' && (!assignedStudentId || !await isStudentInCourse(assignedStudentId, courseId))) return res.status(400).json({ error: 'Selecciona un alumno matriculado.' });

    const task = await prisma.$transaction(async (transaction) => {
      await transaction.structuredTaskStep.deleteMany({ where: { taskId } });
      return transaction.structuredTask.update({
        where: { id: taskId },
        data: {
          title: title.trim(), courseId, assignmentType, assignedStudentId: assignmentType === 'INDIVIDUAL' ? assignedStudentId : null,
          steps: { create: steps.filter((step: any) => step.title?.trim()).map((step: any, index: number) => ({ order: index + 1, title: step.title.trim(), materialId: step.materialId || null })) }
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

export default router;
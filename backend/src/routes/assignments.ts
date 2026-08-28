import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireTeacher } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
interface AuthRequest extends Request {
  user?: any;
}

// 1. Obtener tareas para el estudiante logueado
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.id;

    // Obtener los cursos en los que está el estudiante
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      select: { courseId: true }
    });
    const courseIds = enrollments.map(e => e.courseId);

    // Buscar tareas asignadas directamente al estudiante o a sus cursos
    const assignments = await prisma.assignment.findMany({
      where: {
        OR: [
          { studentId },
          { courseId: { in: courseIds } }
        ]
      },
      include: {
        course: { select: { title: true } },
        material: { select: { id: true, title: true, type: true, url: true, formData: true, description: true } },
        teacher: { select: { profile: { select: { firstName: true, lastName: true } } } },
        submissions: {
          where: { studentId },
          orderBy: { submittedAt: 'asc' }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// 2. Obtener tareas creadas por el profesor logueado
router.get('/teacher', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user!.id;
    const assignments = await prisma.assignment.findMany({
      where: { teacherId },
      include: {
        course: { select: { title: true } },
        student: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
        material: { select: { id: true, title: true, type: true, url: true, formData: true, description: true } },
        submissions: {
          include: {
            student: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } }
          }
        }
      },
      orderBy: { dueDate: 'desc' }
    });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tareas del profesor' });
  }
});

// 3. Crear una nueva tarea (Profesor)
router.post('/', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const { title, description, category, dueDate, courseId, studentId, materialId } = req.body;
  const teacherId = req.user!.id;

  if (!title) return res.status(400).json({ error: 'El título es obligatorio' });
  if (!courseId && !studentId) return res.status(400).json({ error: 'Debe asignar la tarea a un curso o a un alumno' });

  try {
    const assignment = await prisma.assignment.create({
      data: {
        title,
        description: description || '',
        category: category || 'GRAMMAR_VOCABULARY',
        dueDate: dueDate ? new Date(dueDate) : null,
        courseId: courseId || null,
        studentId: studentId || null,
        materialId: materialId || null,
        teacherId
      }
    });
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la tarea' });
  }
});

// 4. Marcar tarea como completada (Estudiante)
router.post('/:id/submit', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'STUDENT') return res.status(403).json({ error: 'Solo los alumnos pueden entregar tareas' });
  const assignmentId = req.params.id as string;
  const studentId = req.user!.id;
  const { content, grade } = req.body;

  try {
    // Check if assignment exists
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId }
    });

    if (!assignment) return res.status(404).json({ error: 'Tarea no encontrada' });

    const isDirectAssignment = assignment.studentId === studentId;
    const isCourseAssignment = assignment.courseId && await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: assignment.courseId } },
      select: { id: true }
    });
    if (!isDirectAssignment && !isCourseAssignment) return res.status(403).json({ error: 'No tienes acceso a esta tarea' });

    // Check if submission already exists
    const existing = await prisma.submission.findFirst({
      where: { assignmentId, studentId }
    });

    if (existing) return res.status(400).json({ error: 'Ya has entregado esta tarea' });

    const submission = await prisma.submission.create({
      data: {
        assignmentId,
        studentId,
        content: content || null,
        grade: typeof grade === 'number' ? grade : null
      }
    });

    res.status(201).json(submission);
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar la tarea' });
  }
});

router.put('/:id', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const assignmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { title, description, category, dueDate, courseId, studentId, materialId } = req.body;
  if (!title?.trim() || (!courseId && !studentId)) {
    return res.status(400).json({ error: 'Título y destinatario son obligatorios' });
  }

  try {
    const assignment = await prisma.assignment.updateMany({
      where: { id: assignmentId, teacherId: req.user!.id },
      data: {
        title: title.trim(),
        description: description || '',
        category: category || 'GRAMMAR_VOCABULARY',
        dueDate: dueDate ? new Date(dueDate) : null,
        courseId: courseId || null,
        studentId: studentId || null,
        materialId: materialId || null
      }
    });
    if (assignment.count === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json({ message: 'Tarea actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la tarea' });
  }
});

// 5. Calificar / Comentar tarea (Profesor)
router.post('/submissions/:subId/grade', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const subId = req.params.subId as string;
  const { grade, feedback } = req.body;
  
  try {
    const parsedGrade = grade !== undefined && grade !== null && grade !== '' ? parseFloat(grade) : null;
    if (parsedGrade !== null && (isNaN(parsedGrade) || parsedGrade < 0 || parsedGrade > 10)) {
      return res.status(400).json({ error: 'La calificación debe ser un número entre 0 y 10.' });
    }

    const submission = await prisma.submission.update({
      where: { id: subId },
      data: {
        grade: parsedGrade,
        feedback: feedback !== undefined ? (feedback ? String(feedback).trim() : null) : undefined
      },
      include: {
        student: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } }
      }
    });
    res.json(submission);
  } catch (error) {
    console.error('Error al calificar la tarea:', error);
    res.status(500).json({ error: 'Error al calificar la tarea' });
  }
});

// 6. Eliminar tarea (Profesor)
router.delete('/:id', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const assignmentId = req.params.id as string;
  const teacherId = req.user!.id;

  try {
    await prisma.assignment.delete({
      where: { id: assignmentId, teacherId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la tarea' });
  }
});

export default router;

import { Router, Response } from 'express';
import { PrismaClient, SkillCategory } from '@prisma/client';
import { authenticateToken, requireTeacher, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Listar todos los cursos del usuario
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    if (role === 'TEACHER') {
      const courses = await prisma.course.findMany({ where: { teacherId: userId } });
      res.json(courses);
    } else {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: userId },
        include: { course: true }
      });
      res.json(enrollments.map(e => e.course));
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
});

// Crear un nuevo curso (solo profesores)
router.post('/', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'El título es obligatorio' });

  try {
    const course = await prisma.course.create({
      data: {
        title,
        teacherId: req.user!.id
      }
    });
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear curso' });
  }
});

// --- SUB-RUTAS DE CURSO ---

const verifyCourseAccess = async (req: any, res: any, next: any) => {
  const courseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = req.user!.id;
  
  if (req.user!.role === 'TEACHER') {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (course?.teacherId !== userId) return res.status(403).json({ error: 'No tienes acceso a este curso' });
  } else {
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId } }
    });
    if (!enrollment) return res.status(403).json({ error: 'No tienes acceso a este curso' });
  }
  next();
};

// Obtener info básica del curso
router.get('/:id', authenticateToken, verifyCourseAccess, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { teacher: { include: { profile: true } } }
    });
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// TABLÓN (Posts)
router.get('/:id/posts', authenticateToken, verifyCourseAccess, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const posts = await prisma.post.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/:id/posts', authenticateToken, requireTeacher, verifyCourseAccess, async (req: AuthRequest, res: Response) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'El contenido es obligatorio' });

  try {
    const courseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const post = await prisma.post.create({
      data: {
        content,
        courseId
      }
    });
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear post' });
  }
});

// TRABAJO DE CLASE (Assignments)
router.get('/:id/assignments', authenticateToken, verifyCourseAccess, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const assignments = await prisma.assignment.findMany({
      where: { courseId },
      orderBy: { dueDate: 'asc' }
    });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/:id/assignments', authenticateToken, requireTeacher, verifyCourseAccess, async (req: AuthRequest, res: Response) => {
  const { title, description, category, dueDate } = req.body;
  if (!title || !category) return res.status(400).json({ error: 'Título y categoría son obligatorios' });

  try {
    const courseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const assignment = await prisma.assignment.create({
      data: {
        title,
        description: description || '',
        category,
        dueDate: dueDate ? new Date(dueDate) : null,
        courseId
      }
    });
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

export default router;

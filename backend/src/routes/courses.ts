import { Router, Response } from 'express';
import { Prisma, PrismaClient, SkillCategory } from '@prisma/client';
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

router.put('/:id', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const courseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  if (!title) return res.status(400).json({ error: 'El título es obligatorio' });

  try {
    const course = await prisma.course.updateMany({
      where: { id: courseId, teacherId: req.user!.id },
      data: { title }
    });
    if (course.count === 0) return res.status(404).json({ error: 'Clase no encontrada' });
    res.json({ message: 'Clase actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la clase' });
  }
});

router.delete('/:id', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const courseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const course = await prisma.course.findFirst({ where: { id: courseId, teacherId: req.user!.id } });
    if (!course) return res.status(404).json({ error: 'Clase no encontrada' });
    await prisma.$transaction(async (transaction) => {
      await transaction.post.deleteMany({ where: { courseId } });
      const assignments = await transaction.assignment.findMany({ where: { courseId }, select: { id: true } });
      await transaction.submission.deleteMany({ where: { assignmentId: { in: assignments.map(assignment => assignment.id) } } });
      await transaction.assignment.deleteMany({ where: { courseId } });
      await transaction.enrollment.deleteMany({ where: { courseId } });
      await transaction.course.delete({ where: { id: courseId } });
    });
    res.json({ message: 'Clase eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar clase:', error);
    res.status(500).json({ error: 'Error al eliminar la clase' });
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

router.delete('/:id/posts/:postId', authenticateToken, requireTeacher, verifyCourseAccess, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const postId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;

    const deleted = await prisma.post.deleteMany({
      where: {
        id: postId,
        courseId
      }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'El anuncio no existe en este curso' });
    }

    res.json({ message: 'Anuncio eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar anuncio' });
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
  const { title, description, category, dueDate, materialId } = req.body;
  if (!title || !category) return res.status(400).json({ error: 'Título y categoría son obligatorios' });
  if (!Object.values(SkillCategory).includes(category as SkillCategory)) {
    return res.status(400).json({ error: 'La categoría seleccionada no es válida' });
  }

  try {
    const teacherId = req.user!.id;
    const courseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsedDueDate = dueDate ? new Date(dueDate) : null;

    if (parsedDueDate && Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ error: 'La fecha de vencimiento no es válida' });
    }

    if (materialId) {
      const material = await prisma.material.findFirst({
        where: {
          id: materialId,
          teacherId
        },
        select: { id: true }
      });

      if (!material) {
        return res.status(400).json({ error: 'El material vinculado no existe o no pertenece al profesor' });
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description: description || '',
        category: category as SkillCategory,
        dueDate: parsedDueDate,
        materialId: materialId || null,
        courseId,
        teacherId
      }
    });
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error al crear tarea en curso:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return res.status(400).json({ error: 'No se pudo crear la tarea por una referencia inválida (curso o material)' });
    }
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

// ALUMNOS DE LA CLASE
router.get('/:id/students', authenticateToken, verifyCourseAccess, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });
    // Extraer solo la info del estudiante
    const students = enrollments.map(e => e.student);
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los alumnos del curso' });
  }
});

router.post('/:id/enroll', authenticateToken, requireTeacher, verifyCourseAccess, async (req: AuthRequest, res: Response) => {
  const { studentIds } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'Se requiere un array de studentIds' });
  }

  try {
    const courseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    
    // Evitar duplicados comprobando quién está ya matriculado
    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        courseId,
        studentId: { in: studentIds }
      }
    });
    
    const existingStudentIds = existingEnrollments.map(e => e.studentId);
    const newStudentIds = studentIds.filter(id => !existingStudentIds.includes(id));

    if (newStudentIds.length === 0) {
      return res.status(400).json({ error: 'Todos los alumnos seleccionados ya están en la clase.' });
    }

    const dataToInsert = newStudentIds.map(studentId => ({
      courseId,
      studentId
    }));

    await prisma.enrollment.createMany({
      data: dataToInsert
    });

    res.status(201).json({ message: 'Alumnos añadidos con éxito', count: newStudentIds.length });
  } catch (error) {
    console.error('Error en /enroll:', error);
    res.status(500).json({ error: 'Error interno al matricular alumnos' });
  }
});

export default router;

import { Router, Response } from 'express';
import { PrismaClient, MaterialType, Level, SkillCategory } from '@prisma/client';
import { authenticateToken, requireTeacher, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Listar materiales con filtros opcionales (type, level, category, search)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { type, level, category, search } = req.query;

    const whereClause: any = {};

    if (type && Object.values(MaterialType).includes(type as MaterialType)) {
      whereClause.type = type as MaterialType;
    }

    if (level && Object.values(Level).includes(level as Level)) {
      whereClause.level = level as Level;
    }

    if (category && Object.values(SkillCategory).includes(category as SkillCategory)) {
      whereClause.category = category as SkillCategory;
    }

    if (search && typeof search === 'string') {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const materials = await prisma.material.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      }
    });

    res.json(materials);
  } catch (error) {
    console.error('Error al obtener materiales:', error);
    res.status(500).json({ error: 'Error interno al obtener materiales' });
  }
});

// Obtener los materiales asignados al alumno autenticado (o al alumno seleccionado por el tutor)
router.get('/assigned-to-me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    let studentId = req.user?.id;

    if (req.user?.role === 'PARENT') {
      const userEmail = (req.user as any)?.email || '';
      const requestedStudentId = req.query.studentId as string;
      if (requestedStudentId) {
        const child = await prisma.user.findFirst({
          where: {
            id: requestedStudentId,
            role: 'STUDENT',
            OR: [
              { parentId: req.user.id },
              { parent: { email: { equals: userEmail, mode: 'insensitive' } } }
            ]
          }
        });
        if (child) studentId = child.id;
      } else {
        const child = await prisma.user.findFirst({
          where: {
            role: 'STUDENT',
            OR: [
              { parentId: req.user.id },
              { parent: { email: { equals: userEmail, mode: 'insensitive' } } }
            ]
          }
        });
        if (child) studentId = child.id;
      }
    } else if (req.user?.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Solo los alumnos y tutores pueden consultar sus asignaciones' });
    }

    if (!studentId) {
      return res.json([]);
    }

    const assignments = await prisma.materialAssignment.findMany({
      where: { studentId },
      orderBy: { assignedAt: 'desc' },
      include: {
        material: {
          include: {
            teacher: {
              select: {
                profile: { select: { firstName: true, lastName: true } }
              }
            }
          }
        }
      }
    });

    res.json(assignments);
  } catch (error) {
    console.error('Error al obtener materiales asignados:', error);
    res.status(500).json({ error: 'Error interno al obtener materiales asignados' });
  }
});

router.post('/assignments/:id/submit', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'STUDENT') return res.status(403).json({ error: 'Solo los alumnos pueden entregar este material' });
  const materialAssignmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { grade, content } = req.body as { grade?: number; content?: string };

  try {
    const materialAssignment = await prisma.materialAssignment.findFirst({
      where: { id: materialAssignmentId, studentId: req.user.id },
      include: { material: true }
    });
    if (!materialAssignment) return res.status(404).json({ error: 'Asignación no encontrada' });

    let assignment = await prisma.assignment.findFirst({ where: { materialId: materialAssignment.materialId, studentId: req.user.id, courseId: null } });
    if (!assignment) {
      assignment = await prisma.assignment.create({
        data: {
          title: materialAssignment.material.title,
          description: materialAssignment.material.description || '',
          category: materialAssignment.material.category,
          materialId: materialAssignment.materialId,
          studentId: req.user.id,
          teacherId: materialAssignment.material.teacherId
        }
      });
    }
    const existingSubmission = await prisma.submission.findFirst({ where: { assignmentId: assignment.id, studentId: req.user.id } });
    if (existingSubmission) return res.status(400).json({ error: 'Este examen ya ha sido entregado.' });
    const submission = await prisma.submission.create({
      data: { assignmentId: assignment.id, studentId: req.user.id, content: content || null, grade: typeof grade === 'number' ? grade : null }
    });
    await prisma.materialAssignment.update({ where: { id: materialAssignment.id }, data: { status: 'COMPLETED' } });
    res.status(201).json(submission);
  } catch (error) {
    res.status(500).json({ error: 'Error al entregar el material' });
  }
});

router.get('/:id/assignments', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const materialId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const material = await prisma.material.findFirst({ where: { id: materialId, teacherId: req.user!.id }, select: { id: true } });
  if (!material) return res.status(404).json({ error: 'Material no encontrado' });
  const assignments = await prisma.materialAssignment.findMany({
    where: { materialId },
    include: { student: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } } },
    orderBy: { assignedAt: 'desc' }
  });
  res.json(assignments);
});

router.delete('/:id/assignments/:studentId', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const materialId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const studentId = Array.isArray(req.params.studentId) ? req.params.studentId[0] : req.params.studentId;
  const deleted = await prisma.materialAssignment.deleteMany({
    where: { materialId, studentId, material: { teacherId: req.user!.id } }
  });
  if (deleted.count === 0) return res.status(404).json({ error: 'Acceso no encontrado' });
  res.json({ message: 'Acceso revocado' });
});

// Obtener un material específico
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      }
    });

    if (!material) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }

    res.json(material);
  } catch (error) {
    console.error('Error al obtener material:', error);
    res.status(500).json({ error: 'Error interno al obtener el material' });
  }
});

// Asignar un material a uno o varios alumnos
router.post('/:id/assignments', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const materialId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { studentIds, deadline } = req.body as { studentIds?: unknown; deadline?: unknown };

  if (!Array.isArray(studentIds) || studentIds.length === 0 || studentIds.some((id) => typeof id !== 'string')) {
    return res.status(400).json({ error: 'Debes seleccionar al menos un alumno' });
  }

  let parsedDeadline: Date | null = null;
  if (deadline) {
    parsedDeadline = new Date(String(deadline));
    if (Number.isNaN(parsedDeadline.getTime())) {
      return res.status(400).json({ error: 'La fecha de entrega no es válida' });
    }
  }

  try {
    const material = await prisma.material.findFirst({ where: { id: materialId, teacherId: req.user!.id } });
    if (!material) return res.status(404).json({ error: 'Material no encontrado' });

    const uniqueStudentIds = [...new Set(studentIds as string[])];
    const students = await prisma.user.findMany({
      where: { id: { in: uniqueStudentIds }, role: 'STUDENT' },
      select: { id: true }
    });
    if (students.length !== uniqueStudentIds.length) {
      return res.status(400).json({ error: 'Uno o más alumnos no son válidos' });
    }

    const assignments = await prisma.$transaction(
      students.map((student) => prisma.materialAssignment.upsert({
        where: { materialId_studentId: { materialId, studentId: student.id } },
        update: { deadline: parsedDeadline, status: 'PENDING' },
        create: { materialId, studentId: student.id, deadline: parsedDeadline }
      }))
    );
    if (material.type === 'FORM') {
      for (const student of students) {
        const existingAssignment = await prisma.assignment.findFirst({
          where: { materialId, studentId: student.id, courseId: null }
        });
        if (!existingAssignment) {
          await prisma.assignment.create({
            data: {
              title: material.title,
              description: material.description || '',
              category: material.category,
              materialId,
              studentId: student.id,
              teacherId: req.user!.id
            }
          });
        }
      }
    }
    res.status(201).json({ message: 'Material asignado correctamente', assignments });
  } catch (error) {
    console.error('Error al asignar material:', error);
    res.status(500).json({ error: 'Error interno al asignar el material' });
  }
});

// Crear nuevo material o examen interactivo
router.post('/', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, type, level, category, url, formData } = req.body;

    if (!title || !type) {
      return res.status(400).json({ error: 'Título y tipo son obligatorios' });
    }

    const material = await prisma.material.create({
      data: {
        title,
        description: description || '',
        type: type as MaterialType,
        level: (level as Level) || Level.GENERAL,
        category: (category as SkillCategory) || SkillCategory.GRAMMAR_VOCABULARY,
        url: url || null,
        formData: formData || null,
        teacherId: req.user!.id
      }
    });

    res.status(201).json(material);
  } catch (error) {
    console.error('Error al crear material:', error);
    res.status(500).json({ error: 'Error al crear el material' });
  }
});

// Actualizar material
router.put('/:id', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { title, description, type, level, category, url, formData } = req.body;

    const updated = await prisma.material.updateMany({
      where: { id, teacherId: req.user!.id },
      data: {
        title,
        description,
        type: type ? (type as MaterialType) : undefined,
        level: level ? (level as Level) : undefined,
        category: category ? (category as SkillCategory) : undefined,
        url,
        formData
      }
    });

    if (updated.count === 0) return res.status(404).json({ error: 'Material no encontrado' });
    const material = await prisma.material.findUnique({ where: { id } });
    res.json(material);
  } catch (error) {
    console.error('Error al actualizar material:', error);
    res.status(500).json({ error: 'Error al actualizar el material' });
  }
});

// Eliminar material
router.delete('/:id', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await prisma.material.deleteMany({ where: { id, teacherId: req.user!.id } });
    if (deleted.count === 0) return res.status(404).json({ error: 'Material no encontrado' });

    res.json({ message: 'Material eliminado con éxito' });
  } catch (error) {
    console.error('Error al eliminar material:', error);
    res.status(500).json({ error: 'Error al eliminar el material' });
  }
});

export default router;

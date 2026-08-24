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

// Obtener los materiales asignados al alumno autenticado
router.get('/assigned-to-me', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Solo los alumnos pueden consultar sus asignaciones' });
  }

  try {
    const assignments = await prisma.materialAssignment.findMany({
      where: { studentId: req.user.id },
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

// Materiales asignados al alumno autenticado
router.get('/assigned-to-me', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Solo los alumnos pueden consultar sus asignaciones' });
  }

  try {
    const assignments = await prisma.materialAssignment.findMany({
      where: { studentId: req.user.id },
      orderBy: { assignedAt: 'desc' },
      include: {
        material: {
          include: {
            teacher: { select: { profile: { select: { firstName: true, lastName: true } } } }
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
    res.status(201).json({ message: 'Material asignado correctamente', assignments });
  } catch (error) {
    console.error('Error al asignar material:', error);
    res.status(500).json({ error: 'Error interno al asignar el material' });
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
    if (!material) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }

    const students = await prisma.user.findMany({
      where: { id: { in: studentIds as string[] }, role: 'STUDENT' },
      select: { id: true }
    });
    if (students.length !== new Set(studentIds as string[]).size) {
      return res.status(400).json({ error: 'Uno o más alumnos no son válidos' });
    }

    const assignments = await prisma.$transaction(
      students.map((student) => prisma.materialAssignment.upsert({
        where: { materialId_studentId: { materialId, studentId: student.id } },
        update: { deadline: parsedDeadline, status: 'PENDING' },
        create: { materialId, studentId: student.id, deadline: parsedDeadline }
      }))
    );

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

    const material = await prisma.material.update({
      where: { id },
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
    await prisma.material.delete({
      where: { id }
    });

    res.json({ message: 'Material eliminado con éxito' });
  } catch (error) {
    console.error('Error al eliminar material:', error);
    res.status(500).json({ error: 'Error al eliminar el material' });
  }
});

export default router;

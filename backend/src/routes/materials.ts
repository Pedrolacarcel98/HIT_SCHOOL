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

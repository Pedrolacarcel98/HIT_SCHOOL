import { Router, Response } from 'express';
import { PrismaClient, MaterialType, Level, SkillCategory } from '@prisma/client';
import { Readable } from 'stream';
import { authenticateToken, requireTeacher, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Proxy de streaming para pistas de audio (evita bloqueos de cookies, CORS y CORP: same-site de Google Drive)
const streamDriveAudio = async (fileId: string, req: any, res: Response) => {
  const cleanId = fileId.trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanId)) {
    return res.status(400).json({ error: 'ID de archivo no válido' });
  }
  const targetUrl = `https://drive.usercontent.google.com/download?id=${cleanId}&export=download`;
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
  if (req.headers.range) {
    headers['Range'] = req.headers.range;
  }

  let response = await fetch(targetUrl, { headers });

  if (!response.ok && response.status !== 206) {
    const fallbackUrl = `https://drive.google.com/uc?export=download&id=${cleanId}`;
    response = await fetch(fallbackUrl, { headers });
  }

  if (!response.ok && response.status !== 206) {
    return res.status(response.status).json({ error: 'No se pudo obtener el stream de audio' });
  }

  res.status(response.status);
  const upstreamType = response.headers.get('content-type') || 'audio/mpeg';
  const isHtmlOrText = upstreamType.includes('text') || upstreamType.includes('html');
  res.setHeader('Content-Type', isHtmlOrText ? 'audio/mpeg' : upstreamType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  const contentLength = response.headers.get('content-length');
  if (contentLength) res.setHeader('Content-Length', contentLength);
  const contentRange = response.headers.get('content-range');
  if (contentRange) res.setHeader('Content-Range', contentRange);

  if (response.body) {
    // @ts-ignore
    Readable.fromWeb(response.body).pipe(res);
  } else {
    res.end();
  }
};

router.get('/drive-audio/:fileId', async (req: any, res: Response) => {
  const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;
  try {
    await streamDriveAudio(fileId, req, res);
  } catch (error) {
    console.error('Error al cargar audio de Google Drive:', error);
    res.status(502).json({ error: 'No se pudo cargar el audio.' });
  }
});

router.get('/proxy-audio', async (req: any, res: Response) => {
  try {
    const { id, url: customUrl } = req.query;
    if (id && typeof id === 'string') {
      await streamDriveAudio(id, req, res);
    } else if (customUrl && typeof customUrl === 'string') {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      if (req.headers.range) headers['Range'] = req.headers.range;
      const response = await fetch(customUrl.trim(), { headers });
      if (!response.ok && response.status !== 206) {
        return res.status(response.status).json({ error: 'No se pudo obtener el stream de audio' });
      }
      res.status(response.status);
      res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (response.body) {
        // @ts-ignore
        Readable.fromWeb(response.body).pipe(res);
      } else {
        res.end();
      }
    } else {
      return res.status(400).json({ error: 'Se requiere id o url' });
    }
  } catch (error) {
    console.error('Error en proxy de audio:', error);
    res.status(500).json({ error: 'Error interno en streaming de audio' });
  }
});

const parsePublishAt = (value: unknown) => {
  if (!value) return { value: null as Date | null };
  const publishAt = new Date(String(value));
  if (Number.isNaN(publishAt.getTime()) || publishAt <= new Date()) return { error: 'La fecha de publicación debe ser futura.' };
  return { value: publishAt };
};

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
      where: {
        studentId,
        OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }]
      } as any,
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
  const { grade, content, link, attachment } = req.body as { grade?: number; content?: string; link?: string; attachment?: any };

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
    const normalizedContent = (() => {
      if (!content && !attachment) return null;
      if (attachment && typeof attachment === 'object') {
        return JSON.stringify({
          text: typeof content === 'string' ? content : '',
          link: typeof link === 'string' ? link : null,
          attachment: {
            name: typeof attachment.name === 'string' ? attachment.name : 'archivo-adjunto',
            mimeType: typeof attachment.mimeType === 'string' ? attachment.mimeType : 'application/octet-stream',
            dataUrl: typeof attachment.dataUrl === 'string' ? attachment.dataUrl : '',
            size: typeof attachment.size === 'number' ? attachment.size : undefined
          }
        });
      }
      return typeof content === 'string' ? content : null;
    })();
    const submission = await prisma.submission.create({
      data: { assignmentId: assignment.id, studentId: req.user.id, content: normalizedContent, grade: typeof grade === 'number' ? grade : null }
    });
    await prisma.materialAssignment.update({ where: { id: materialAssignment.id }, data: { status: 'COMPLETED' } });
    res.status(201).json(submission);
  } catch (error) {
    res.status(500).json({ error: 'Error al entregar el material' });
  }
});

router.get('/:id/assignments', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  const materialId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const material = await prisma.material.findUnique({ where: { id: materialId }, select: { id: true } });
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
    where: { materialId, studentId }
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
  const { studentIds, deadline, publishAt } = req.body as { studentIds?: unknown; deadline?: unknown; publishAt?: unknown };

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
  const parsedPublishAt = parsePublishAt(publishAt);
  if (parsedPublishAt.error) return res.status(400).json({ error: parsedPublishAt.error });

  try {
    const material = await prisma.material.findUnique({ where: { id: materialId } });
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
        update: { deadline: parsedDeadline, publishAt: parsedPublishAt.value, status: 'PENDING' },
        create: { materialId, studentId: student.id, deadline: parsedDeadline, publishAt: parsedPublishAt.value }
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

    if (updated.count === 0) return res.status(404).json({ error: 'Material no encontrado' });
    const material = await prisma.material.findUnique({ where: { id } });
    res.json(material);
  } catch (error) {
    console.error('Error al actualizar material:', error);
    res.status(500).json({ error: 'Error al actualizar el material' });
  }
});

// Duplicar un recurso, incluyendo la configuración completa de los formularios
router.post('/:id/duplicate', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const source = await prisma.material.findUnique({ where: { id } });
    if (!source) return res.status(404).json({ error: 'Material no encontrado' });

    const duplicated = await prisma.material.create({
      data: {
        title: `${source.title} (copia)`,
        description: source.description,
        type: source.type,
        level: source.level,
        category: source.category,
        url: source.url,
        formData: source.formData ?? undefined,
        teacherId: req.user!.id
      }
    });
    res.status(201).json(duplicated);
  } catch (error) {
    console.error('Error al duplicar material:', error);
    res.status(500).json({ error: 'Error al duplicar el material' });
  }
});

// Eliminar material
router.delete('/:id', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const material = await prisma.material.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!material) return res.status(404).json({ error: 'Material no encontrado' });

    await prisma.$transaction(async (transaction) => {
      const linkedAssignments = await transaction.assignment.findMany({
        where: { materialId: id },
        select: { id: true }
      });
      const assignmentIds = linkedAssignments.map((assignment) => assignment.id);

      if (assignmentIds.length > 0) {
        await transaction.submission.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
        await transaction.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
      }

      await transaction.material.delete({ where: { id } });
    });

    res.json({ message: 'Material eliminado con éxito' });
  } catch (error) {
    console.error('Error al eliminar material:', error);
    res.status(500).json({ error: 'Error al eliminar el material' });
  }
});

export default router;

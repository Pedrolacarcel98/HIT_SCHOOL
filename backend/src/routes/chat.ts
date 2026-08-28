import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const canChat = async (userId: string, role: string, partnerId: string) => {
  const partner = await prisma.user.findUnique({ where: { id: partnerId }, select: { role: true } });
  if (!partner) return false;
  return role === 'STUDENT' ? partner.role === 'TEACHER' || partner.role === 'ADMIN' :
    (role === 'TEACHER' || role === 'ADMIN') && partner.role === 'STUDENT';
};

// Listar contactos disponibles para el usuario
router.get('/contacts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    if (role === 'TEACHER' || role === 'ADMIN') {
      const students = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: {
          id: true,
          email: true,
          profile: { select: { firstName: true, lastName: true, avatarUrl: true } }
        },
        orderBy: { email: 'asc' }
      });

      const contacts = students.map(s => ({
        id: s.id,
        name: s.profile ? `${s.profile.firstName} ${s.profile.lastName}`.trim() || s.email : s.email,
        email: s.email,
        avatarUrl: s.profile?.avatarUrl || null,
        role: 'STUDENT'
      }));

      res.json(contacts);
    } else {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: userId },
        include: {
          course: {
            include: {
              teacher: {
                select: {
                  id: true,
                  email: true,
                  profile: { select: { firstName: true, lastName: true, avatarUrl: true } }
                }
              }
            }
          }
        }
      });

      const teacherMap = new Map<string, any>();
      enrollments.forEach(e => {
        const t = e.course?.teacher;
        if (t && !teacherMap.has(t.id)) {
          teacherMap.set(t.id, {
            id: t.id,
            name: t.profile ? `${t.profile.firstName} ${t.profile.lastName}`.trim() || 'Profesor' : 'Profesor',
            email: t.email,
            avatarUrl: t.profile?.avatarUrl || null,
            courseTitle: e.course.title,
            role: 'TEACHER'
          });
        }
      });

      if (teacherMap.size === 0) {
        const teachers = await prisma.user.findMany({
          where: { role: { in: ['TEACHER', 'ADMIN'] } },
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true, avatarUrl: true } }
          }
        });
        teachers.forEach(t => {
          teacherMap.set(t.id, {
            id: t.id,
            name: t.profile ? `${t.profile.firstName} ${t.profile.lastName}`.trim() || 'Profesor' : 'Profesor',
            email: t.email,
            avatarUrl: t.profile?.avatarUrl || null,
            courseTitle: 'Profesor de la academia',
            role: 'TEACHER'
          });
        });
      }

      res.json(Array.from(teacherMap.values()));
    }
  } catch (error) {
    console.error('Error al cargar contactos de chat:', error);
    res.status(500).json({ error: 'Error al cargar contactos' });
  }
});

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const partnerId = typeof req.query.partnerId === 'string' ? req.query.partnerId : '';
    if (!partnerId || !req.user || !(await canChat(req.user.id, req.user.role, partnerId))) {
      return res.status(403).json({ error: 'No tienes acceso a esta conversación.' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: req.user.id, recipientId: partnerId },
          { senderId: partnerId, recipientId: req.user.id }
        ]
      },
      include: { sender: { select: { role: true } } },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages.map(message => ({
      id: message.id,
      senderId: message.senderId,
      senderRole: message.sender.role,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt.getTime() !== message.createdAt.getTime() ? message.updatedAt : undefined
    })));
  } catch (error) {
    console.error('Error al cargar conversación:', error);
    res.status(500).json({ error: 'No se pudo cargar la conversación.' });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { recipientId, content } = req.body as { recipientId?: string; content?: string };
  if (!recipientId || !content?.trim() || !req.user || !(await canChat(req.user.id, req.user.role, recipientId))) {
    return res.status(400).json({ error: 'Destinatario o contenido no válido.' });
  }

  const message = await prisma.chatMessage.create({
    data: { senderId: req.user.id, recipientId, content: content.trim() },
    include: { sender: { select: { role: true } } }
  });
  res.status(201).json({ ...message, senderRole: message.sender.role });
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const messageId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { content } = req.body as { content?: string };
  if (!content?.trim() || !req.user) return res.status(400).json({ error: 'El contenido no puede estar vacío.' });

  const message = await prisma.chatMessage.updateMany({
    where: { id: messageId, senderId: req.user.id },
    data: { content: content.trim() }
  });
  if (message.count === 0) return res.status(404).json({ error: 'Mensaje no encontrado.' });
  res.json({ message: 'Mensaje actualizado.' });
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const messageId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!req.user) return res.status(401).json({ error: 'No autenticado.' });
  const message = await prisma.chatMessage.deleteMany({ where: { id: messageId, senderId: req.user.id } });
  if (message.count === 0) return res.status(404).json({ error: 'Mensaje no encontrado.' });
  res.json({ message: 'Mensaje eliminado.' });
});

export default router;

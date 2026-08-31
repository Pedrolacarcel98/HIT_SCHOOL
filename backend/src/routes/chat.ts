import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const canChat = async (userId: string, role: string, partnerId: string) => {
  const partner = await prisma.user.findUnique({ where: { id: partnerId }, select: { role: true } });
  if (!partner) return false;
  if (role === 'STUDENT' || role === 'PARENT') {
    return partner.role === 'TEACHER' || partner.role === 'ADMIN';
  }
  return (role === 'TEACHER' || role === 'ADMIN') && (partner.role === 'STUDENT' || partner.role === 'PARENT');
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
          profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          parent: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true, avatarUrl: true } }
            }
          }
        },
        orderBy: { profile: { firstName: 'asc' } }
      });

      const contacts: any[] = [];
      const addedParentKeys = new Set<string>();

      students.forEach(s => {
        const studentName = s.profile
          ? `${s.profile.firstName} ${s.profile.lastName}`.trim() || s.email
          : s.email;

        // 1. Alumno
        contacts.push({
          id: s.id,
          name: studentName,
          email: s.email,
          avatarUrl: s.profile?.avatarUrl || null,
          role: 'STUDENT'
        });

        // 2. Tutor (si existe, renderizar elemento separado)
        if (s.parent) {
          const parentName = s.parent.profile
            ? `${s.parent.profile.firstName} ${s.parent.profile.lastName}`.trim() || s.parent.email
            : s.parent.email;

          const parentKey = `parent-${s.parent.id}-student-${s.id}`;
          if (!addedParentKeys.has(parentKey)) {
            addedParentKeys.add(parentKey);
            contacts.push({
              id: s.parent.id,
              contactKey: parentKey,
              name: parentName,
              email: s.parent.email,
              avatarUrl: s.parent.profile?.avatarUrl || null,
              role: 'PARENT',
              studentName,
              studentId: s.id,
              subtitle: `Tutor de ${studentName}`
            });
          }
        }
      });

      res.json(contacts);
    } else {
      let targetStudentId = userId;
      if (role === 'PARENT') {
        const userEmail = (req.user as any)?.email || '';
        const reqStudentId = req.query.studentId as string;
        if (reqStudentId) {
          targetStudentId = reqStudentId;
        } else {
          const child = await prisma.user.findFirst({
            where: {
              role: 'STUDENT',
              OR: [
                { parentId: userId },
                { parent: { email: { equals: userEmail, mode: 'insensitive' } } }
              ]
            }
          });
          if (child) targetStudentId = child.id;
          else targetStudentId = '';
        }
      }

      if (!targetStudentId) {
        return res.json([]);
      }

      const studentUser = await prisma.user.findUnique({
        where: { id: targetStudentId },
        select: {
          id: true,
          email: true,
          profile: { select: { firstName: true, lastName: true } }
        }
      });

      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: targetStudentId },
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
          const teacherName = t.profile ? `${t.profile.firstName} ${t.profile.lastName}`.trim() || 'Profesor' : 'Profesor';
          const studentFirstName = studentUser?.profile?.firstName || 'el alumno';

          teacherMap.set(t.id, {
            id: t.id,
            name: teacherName,
            email: t.email,
            avatarUrl: t.profile?.avatarUrl || null,
            courseTitle: `${teacherName} — Profesor de ${studentFirstName}`,
            role: 'TEACHER',
            studentId: targetStudentId,
            studentFirstName
          });
        }
      });

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
    const reqStudentId = typeof req.query.studentId === 'string' ? req.query.studentId.trim() : '';

    if (!partnerId || !req.user || !(await canChat(req.user.id, req.user.role, partnerId))) {
      return res.status(403).json({ error: 'No tienes acceso a esta conversación.' });
    }

    const partnerUser = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, role: true }
    });

    const isParentTeacherChat = (req.user.role === 'PARENT' && partnerUser?.role === 'TEACHER') ||
      ((req.user.role === 'TEACHER' || req.user.role === 'ADMIN') && partnerUser?.role === 'PARENT');

    const whereCondition: any = {
      OR: [
        { senderId: req.user.id, recipientId: partnerId },
        { senderId: partnerId, recipientId: req.user.id }
      ]
    };

    if (isParentTeacherChat && reqStudentId) {
      whereCondition.studentId = reqStudentId;
    }

    const messages = await prisma.chatMessage.findMany({
      where: whereCondition,
      include: {
        sender: {
          select: {
            id: true,
            role: true,
            email: true,
            profile: { select: { firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages.map(message => {
      const senderName = message.sender.profile
        ? `${message.sender.profile.firstName} ${message.sender.profile.lastName}`.trim() || message.sender.email
        : message.sender.email;

      const senderRole = message.sender.role === 'PARENT' ? 'TUTOR' : message.sender.role;

      return {
        id: message.id,
        senderId: message.senderId,
        senderRole,
        senderName,
        studentId: message.studentId,
        content: message.content,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt.getTime() !== message.createdAt.getTime() ? message.updatedAt : undefined
      };
    }));
  } catch (error) {
    console.error('Error al cargar conversación:', error);
    res.status(500).json({ error: 'No se pudo cargar la conversación.' });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { recipientId, content, studentId: reqStudentId } = req.body as { recipientId?: string; content?: string; studentId?: string };
  if (!recipientId || !content?.trim() || !req.user || !(await canChat(req.user.id, req.user.role, recipientId))) {
    return res.status(400).json({ error: 'Destinatario o contenido no válido.' });
  }

  const recipientUser = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, role: true }
  });

  let targetStudentId: string | null = null;

  if (req.user.role === 'PARENT' && recipientUser?.role === 'TEACHER') {
    targetStudentId = reqStudentId || null;
  } else if ((req.user.role === 'TEACHER' || req.user.role === 'ADMIN') && recipientUser?.role === 'PARENT') {
    targetStudentId = reqStudentId || null;
  } else if (req.user.role === 'STUDENT') {
    targetStudentId = req.user.id;
  } else if ((req.user.role === 'TEACHER' || req.user.role === 'ADMIN') && recipientUser?.role === 'STUDENT') {
    targetStudentId = recipientId;
  }

  const message = await prisma.chatMessage.create({
    data: {
      senderId: req.user.id,
      recipientId,
      studentId: targetStudentId,
      content: content.trim()
    },
    include: {
      sender: {
        select: {
          id: true,
          role: true,
          email: true,
          profile: { select: { firstName: true, lastName: true } }
        }
      }
    }
  });

  const senderName = message.sender.profile
    ? `${message.sender.profile.firstName} ${message.sender.profile.lastName}`.trim() || message.sender.email
    : message.sender.email;

  const senderRole = message.sender.role === 'PARENT' ? 'TUTOR' : message.sender.role;

  res.status(201).json({
    id: message.id,
    senderId: message.senderId,
    senderRole,
    senderName,
    studentId: message.studentId,
    content: message.content,
    createdAt: message.createdAt
  });
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

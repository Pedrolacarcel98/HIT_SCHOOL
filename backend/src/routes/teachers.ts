import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authenticateToken, requireTeacher, requireAdmin } from '../middleware/auth';
import { sendAccountReactivationEmail, sendTeacherWelcomeEmail } from '../services/email';

const router = Router();
const prisma = new PrismaClient();

const teacherSelect = {
  id: true,
  email: true,
  status: true,
  createdAt: true,
  profile: {
    select: { firstName: true, lastName: true, dni: true, phone: true, birthDate: true }
  }
};

router.get('/', authenticateToken, requireTeacher, async (_req, res) => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: {
        ...teacherSelect,
        assignedCourses: {
          select: {
            courseId: true,
            course: {
              select: { id: true, title: true, modality: true }
            }
          }
        },
        courses: {
          select: { id: true, title: true, modality: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(teachers);
  } catch (error) {
    console.error('Error al obtener profesores:', error);
    res.status(500).json({ error: 'Error al obtener profesores' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { firstName, lastName, email, dni, phone, birthDate } = req.body;
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'Nombre, apellidos y email son obligatorios' });
  }

  const temporaryPassword = `hit${Math.floor(1000 + Math.random() * 9000)}`;
  try {
    const teacher = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash: await bcrypt.hash(temporaryPassword, 10),
        role: 'TEACHER',
        status: 'ACTIVE',
        profile: {
          create: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            dni: dni?.trim() || null,
            phone: phone?.trim() || null,
            birthDate: birthDate ? new Date(birthDate) : null
          }
        }
      },
      select: teacherSelect
    });

    try {
      await sendTeacherWelcomeEmail(teacher.email, teacher.profile?.firstName || firstName, temporaryPassword);
    } catch (mailError) {
      console.error('El profesor fue creado, pero no se pudo enviar el correo SMTP:', mailError);
    }

    res.status(201).json({ message: 'Profesor creado con éxito', teacher, generatedPassword: temporaryPassword });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'El correo ya está registrado en el sistema' });
    console.error('Error al crear profesor:', error);
    res.status(500).json({ error: 'Error al crear el profesor' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const teacherId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { firstName, lastName, email, dni, phone, birthDate } = req.body;
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'Nombre, apellidos y email son obligatorios' });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), NOT: { id: teacherId } }
    });
    if (existingUser) return res.status(400).json({ error: 'Este correo ya pertenece a otro usuario' });

    const teacher = await prisma.user.update({
      where: { id: teacherId, role: 'TEACHER' },
      data: {
        email: email.trim().toLowerCase(),
        profile: {
          upsert: {
            create: { firstName: firstName.trim(), lastName: lastName.trim(), dni: dni?.trim() || null, phone: phone?.trim() || null, birthDate: birthDate ? new Date(birthDate) : null },
            update: { firstName: firstName.trim(), lastName: lastName.trim(), dni: dni?.trim() || null, phone: phone?.trim() || null, birthDate: birthDate ? new Date(birthDate) : null }
          }
        }
      },
      select: teacherSelect
    });
    res.json({ message: 'Profesor actualizado con éxito', teacher });
  } catch (error) {
    console.error('Error al actualizar profesor:', error);
    res.status(500).json({ error: 'Error al actualizar el profesor' });
  }
});

router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const teacherId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const status = req.body.status === 'ACTIVE' ? 'ACTIVE' : req.body.status === 'INACTIVE' ? 'INACTIVE' : null;
  if (!status) return res.status(400).json({ error: 'Estado no válido' });
  try {
    const existingTeacher = await prisma.user.findFirst({
      where: { id: teacherId, role: 'TEACHER' },
      include: { profile: true }
    });
    if (!existingTeacher) return res.status(404).json({ error: 'Profesor no encontrado' });

    const isReactivation = existingTeacher.status === 'INACTIVE' && status === 'ACTIVE';
    const temporaryPassword = isReactivation ? `hit${Math.floor(1000 + Math.random() * 9000)}` : null;
    const teacher = await prisma.user.update({
      where: { id: teacherId, role: 'TEACHER' },
      data: {
        status,
        ...(temporaryPassword ? { passwordHash: await bcrypt.hash(temporaryPassword, 10) } : {})
      },
      select: teacherSelect
    });

    if (temporaryPassword) {
      try {
        await sendAccountReactivationEmail(
          teacher.email,
          teacher.profile?.firstName || 'profesor',
          temporaryPassword,
          'profesor'
        );
      } catch (mailError) {
        console.error('El profesor fue reactivado, pero no se pudo enviar el correo SMTP:', mailError);
      }
    }

    res.json({ message: status === 'ACTIVE' ? 'Profesor dado de alta' : 'Profesor dado de baja', teacher });
  } catch (error) {
    console.error('Error al cambiar estado del profesor:', error);
    res.status(500).json({ error: 'Error al cambiar el estado del profesor' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const teacherId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const linkedCourses = await prisma.course.count({ where: { teacherId } });
    if (linkedCourses > 0) return res.status(400).json({ error: 'No se puede eliminar un profesor con clases asignadas. Dale de baja en su lugar.' });
    await prisma.user.delete({ where: { id: teacherId, role: 'TEACHER' } });
    res.json({ message: 'Profesor eliminado con éxito' });
  } catch (error) {
    console.error('Error al eliminar profesor:', error);
    res.status(500).json({ error: 'Error al eliminar el profesor' });
  }
});

// Obtener cursos asignados a un profesor
router.get('/:id/assigned-courses', authenticateToken, requireTeacher, async (req, res) => {
  const teacherId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const assignments = await prisma.courseTeacher.findMany({
      where: { teacherId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            modality: true,
            teacherId: true,
            teacher: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } }
          }
        }
      }
    });

    const titularCourses = await prisma.course.findMany({
      where: { teacherId },
      select: {
        id: true,
        title: true,
        modality: true,
        teacherId: true
      }
    });

    res.json({
      assignedCourseIds: assignments.map(a => a.courseId),
      assignedCourses: assignments.map(a => a.course),
      titularCourses
    });
  } catch (error) {
    console.error('Error al obtener cursos asignados del profesor:', error);
    res.status(500).json({ error: 'Error al obtener cursos asignados del profesor' });
  }
});

// Asignar o actualizar cursos asignados a un profesor (ADMIN)
router.put('/:id/assigned-courses', authenticateToken, requireAdmin, async (req, res) => {
  const teacherId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { courseIds } = req.body;

  if (!Array.isArray(courseIds)) {
    return res.status(400).json({ error: 'courseIds debe ser un array de strings' });
  }

  try {
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, role: 'TEACHER' }
    });
    if (!teacher) return res.status(404).json({ error: 'Profesor no encontrado' });

    // Filtrar para no auto-asignar como colaborador si ya es titular
    const titularCourses = await prisma.course.findMany({
      where: { teacherId },
      select: { id: true }
    });
    const titularIds = new Set(titularCourses.map(c => c.id));
    const validCourseIds = courseIds.filter(id => !titularIds.has(id));

    await prisma.$transaction([
      prisma.courseTeacher.deleteMany({ where: { teacherId } }),
      prisma.courseTeacher.createMany({
        data: validCourseIds.map(courseId => ({
          courseId,
          teacherId
        })),
        skipDuplicates: true
      })
    ]);

    const updatedAssignments = await prisma.courseTeacher.findMany({
      where: { teacherId },
      include: { course: true }
    });

    res.json({
      message: 'Cursos asignados actualizados correctamente',
      assignedCourses: updatedAssignments.map(a => a.course)
    });
  } catch (error) {
    console.error('Error al actualizar cursos asignados del profesor:', error);
    res.status(500).json({ error: 'Error al actualizar cursos asignados del profesor' });
  }
});

export default router;

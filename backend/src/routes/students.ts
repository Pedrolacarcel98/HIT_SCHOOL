import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authenticateToken, requireTeacher } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Ruta protegida: solo profesores pueden crear alumnos
router.post('/', authenticateToken, requireTeacher, async (req, res) => {
  const { email, firstName, lastName } = req.body;

  if (!email || !firstName || !lastName) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    // Generación de contraseña automática
    const autoPassword = `hit${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(autoPassword, 10);

    const newStudent = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'STUDENT',
        profile: {
          create: {
            firstName,
            lastName,
          }
        }
      },
      include: {
        profile: true
      }
    });

    // Intentar notificar a n8n para que envíe el correo
    // Usamos 'n8n' en vez de 'localhost' porque estamos dentro de la red interna de Docker
    try {
      await fetch('http://n8n:5678/webhook-test/nuevo-alumno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newStudent.email,
          firstName: newStudent.profile?.firstName,
          lastName: newStudent.profile?.lastName,
          generatedPassword: autoPassword
        })
      });
      console.log('Webhook de n8n disparado con éxito');
    } catch (n8nError) {
      console.error('No se pudo contactar con n8n, pero el alumno fue creado:', n8nError);
    }

    res.status(201).json({
      message: 'Alumno creado con éxito',
      student: {
        id: newStudent.id,
        email: newStudent.email,
        firstName: newStudent.profile?.firstName,
        lastName: newStudent.profile?.lastName,
      },
      generatedPassword: autoPassword // En un entorno real se enviaría por email
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear el alumno' });
  }
});

// Ruta para obtener todos los alumnos (para el dashboard del profesor)
router.get('/', authenticateToken, requireTeacher, async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener alumnos' });
  }
});

// Ruta para actualizar un alumno
router.put('/:id', authenticateToken, requireTeacher, async (req, res) => {
  const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { firstName, lastName, email } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // Comprobar si el email ya existe en otro usuario
    const existingUser = await prisma.user.findFirst({
      where: { email, NOT: { id: studentId } }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Este correo ya pertenece a otro usuario' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: studentId },
      data: {
        email,
        profile: {
          upsert: {
            create: { firstName, lastName },
            update: { firstName, lastName }
          }
        }
      },
      include: { profile: true }
    });

    res.json({
      message: 'Alumno actualizado con éxito',
      student: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.profile?.firstName,
        lastName: updatedUser.profile?.lastName
      }
    });
  } catch (error) {
    console.error('Error al actualizar alumno:', error);
    res.status(500).json({ error: 'Error al actualizar alumno' });
  }
});

// Ruta para eliminar un alumno
router.delete('/:id', authenticateToken, requireTeacher, async (req, res) => {
  const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    // Eliminar en cascada manualmente dentro de una transacción
    await prisma.$transaction([
      prisma.submission.deleteMany({ where: { studentId } }),
      prisma.enrollment.deleteMany({ where: { studentId } }),
      prisma.profile.deleteMany({ where: { userId: studentId } }),
      prisma.user.delete({ where: { id: studentId } })
    ]);

    res.json({ message: 'Alumno eliminado con éxito' });
  } catch (error) {
    console.error('Error al eliminar alumno:', error);
    res.status(500).json({ error: 'Error al eliminar el alumno' });
  }
});

export default router;

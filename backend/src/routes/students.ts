import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authenticateToken, requireTeacher } from '../middleware/auth';
import { ALLOWED_MONTHLY_FEES, ensureStudentPaymentSchedule } from '../services/payments';

const router = Router();
const prisma = new PrismaClient();

const parseBillingFields = (body: Record<string, unknown>) => {
  const monthlyFee = Number(body.monthlyFee);
  const courseDurationMonths = Number(body.courseDurationMonths);

  if (!Number.isInteger(courseDurationMonths) || courseDurationMonths <= 0) {
    return { error: 'La duración del curso debe ser un número entero positivo.' };
  }

  if (!ALLOWED_MONTHLY_FEES.includes(monthlyFee as 35 | 65)) {
    return { error: 'La tarifa mensual debe ser 35 o 65 euros.' };
  }

  return { monthlyFee, courseDurationMonths };
};

// Endpoint para listar todos los tutores/padres registrados
router.get('/parents', authenticateToken, requireTeacher, async (req, res) => {
  try {
    const parents = await prisma.user.findMany({
      where: { role: 'PARENT' },
      select: {
        id: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            dni: true,
            phone: true,
            address: true
          }
        },
        children: {
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
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(parents);
  } catch (error) {
    console.error('Error al obtener tutores:', error);
    res.status(500).json({ error: 'Error al obtener lista de tutores/padres' });
  }
});

// Ruta protegida: crear alumno (con soporte de ficha extendida y vinculación familiar)
router.post('/', authenticateToken, requireTeacher, async (req, res) => {
  const { email, firstName, lastName, dni, phone, birthDate, address, parentId, parentData } = req.body;
  const billing = parseBillingFields(req.body as Record<string, unknown>);

  if (!email || !firstName || !lastName) {
    return res.status(400).json({ error: 'Faltan campos requeridos (email, nombre y apellidos del alumno)' });
  }

  if ('error' in billing) {
    return res.status(400).json(billing);
  }

  try {
    let finalParentId = parentId || null;
    let createdParentInfo: any = null;

    // Si se envía información para crear un nuevo padre/tutor simultáneamente
    if (!finalParentId && parentData && parentData.email && parentData.firstName && parentData.lastName) {
      const parentAutoPassword = `hit${Math.floor(1000 + Math.random() * 9000)}`;
      const parentPasswordHash = await bcrypt.hash(parentAutoPassword, 10);

      // Comprobar si el tutor ya existe por email
      let existingParent = await prisma.user.findUnique({
        where: { email: parentData.email.trim().toLowerCase() }
      });

      if (!existingParent) {
        existingParent = await prisma.user.create({
          data: {
            email: parentData.email.trim().toLowerCase(),
            passwordHash: parentPasswordHash,
            role: 'PARENT',
            profile: {
              create: {
                firstName: parentData.firstName.trim(),
                lastName: parentData.lastName.trim(),
                dni: parentData.dni?.trim() || null,
                phone: parentData.phone?.trim() || null,
                address: parentData.address?.trim() || null
              }
            }
          }
        });
        createdParentInfo = {
          id: existingParent.id,
          email: existingParent.email,
          generatedPassword: parentAutoPassword,
          name: `${parentData.firstName} ${parentData.lastName}`
        };
      }
      finalParentId = existingParent.id;
    }

    // Generación de credenciales del alumno
    const autoPassword = `hit${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(autoPassword, 10);

    const newStudent = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        role: 'STUDENT',
        monthlyFee: billing.monthlyFee,
        courseDurationMonths: billing.courseDurationMonths,
        courseStartDate: new Date(),
        parentId: finalParentId,
        profile: {
          create: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            dni: dni?.trim() || null,
            phone: phone?.trim() || null,
            birthDate: birthDate ? new Date(birthDate) : null,
            address: address?.trim() || null
          }
        }
      },
      include: {
        profile: true,
        parent: {
          include: { profile: true }
        }
      }
    });

    await ensureStudentPaymentSchedule(prisma, {
      id: newStudent.id,
      role: newStudent.role,
      createdAt: newStudent.createdAt,
      courseDurationMonths: newStudent.courseDurationMonths,
      monthlyFee: newStudent.monthlyFee,
      courseStartDate: newStudent.courseStartDate
    });

    // Intentar notificar a n8n para que envíe el correo con las credenciales
    try {
      await fetch('http://n8n:5678/webhook-test/nuevo-alumno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newStudent.email,
          firstName: newStudent.profile?.firstName,
          lastName: newStudent.profile?.lastName,
          dni: newStudent.profile?.dni,
          phone: newStudent.profile?.phone,
          generatedPassword: autoPassword,
          parent: createdParentInfo || (newStudent.parent ? {
            email: newStudent.parent.email,
            name: `${newStudent.parent.profile?.firstName} ${newStudent.parent.profile?.lastName}`
          } : null)
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
        dni: newStudent.profile?.dni,
        phone: newStudent.profile?.phone,
        birthDate: newStudent.profile?.birthDate,
        address: newStudent.profile?.address,
        monthlyFee: newStudent.monthlyFee,
        courseDurationMonths: newStudent.courseDurationMonths,
        courseStartDate: newStudent.courseStartDate,
        parent: newStudent.parent ? {
          id: newStudent.parent.id,
          email: newStudent.parent.email,
          name: `${newStudent.parent.profile?.firstName} ${newStudent.parent.profile?.lastName}`.trim(),
          phone: newStudent.parent.profile?.phone,
          dni: newStudent.parent.profile?.dni
        } : null
      },
      generatedPassword: autoPassword,
      createdParent: createdParentInfo
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El correo ya está registrado en el sistema' });
    }
    console.error('Error al crear alumno:', error);
    res.status(500).json({ error: 'Error al crear el alumno' });
  }
});

// Ruta para obtener todos los alumnos (para el panel del profesor)
router.get('/', authenticateToken, requireTeacher, async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        email: true,
        createdAt: true,
        monthlyFee: true,
        courseDurationMonths: true,
        courseStartDate: true,
        parentId: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            dni: true,
            phone: true,
            birthDate: true,
            address: true
          }
        },
        parent: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                dni: true
              }
            }
          }
        },
        enrollments: {
          select: {
            courseId: true,
            course: {
              select: {
                title: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(students);
  } catch (error) {
    console.error('Error al obtener alumnos:', error);
    res.status(500).json({ error: 'Error al obtener alumnos' });
  }
});

// Ruta para actualizar un alumno
router.put('/:id', authenticateToken, requireTeacher, async (req, res) => {
  const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { firstName, lastName, email, dni, phone, birthDate, address, parentId } = req.body;
  const billing = parseBillingFields(req.body as Record<string, unknown>);

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'Nombre, apellidos y email son obligatorios' });
  }

  if ('error' in billing) {
    return res.status(400).json(billing);
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), NOT: { id: studentId } }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Este correo ya pertenece a otro usuario' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: studentId },
      data: {
        email: email.trim().toLowerCase(),
        monthlyFee: billing.monthlyFee,
        courseDurationMonths: billing.courseDurationMonths,
        parentId: parentId !== undefined ? (parentId || null) : undefined,
        profile: {
          upsert: {
            create: {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              dni: dni?.trim() || null,
              phone: phone?.trim() || null,
              birthDate: birthDate ? new Date(birthDate) : null,
              address: address?.trim() || null
            },
            update: {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              dni: dni !== undefined ? (dni?.trim() || null) : undefined,
              phone: phone !== undefined ? (phone?.trim() || null) : undefined,
              birthDate: birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : undefined,
              address: address !== undefined ? (address?.trim() || null) : undefined
            }
          }
        }
      },
      include: {
        profile: true,
        parent: {
          include: { profile: true }
        }
      }
    });

    await ensureStudentPaymentSchedule(prisma, {
      id: updatedUser.id,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      courseDurationMonths: updatedUser.courseDurationMonths,
      monthlyFee: updatedUser.monthlyFee,
      courseStartDate: updatedUser.courseStartDate
    });

    res.json({
      message: 'Alumno actualizado con éxito',
      student: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.profile?.firstName,
        lastName: updatedUser.profile?.lastName,
        dni: updatedUser.profile?.dni,
        phone: updatedUser.profile?.phone,
        birthDate: updatedUser.profile?.birthDate,
        address: updatedUser.profile?.address,
        monthlyFee: updatedUser.monthlyFee,
        courseDurationMonths: updatedUser.courseDurationMonths,
        courseStartDate: updatedUser.courseStartDate,
        parent: updatedUser.parent ? {
          id: updatedUser.parent.id,
          email: updatedUser.parent.email,
          name: `${updatedUser.parent.profile?.firstName} ${updatedUser.parent.profile?.lastName}`.trim(),
          phone: updatedUser.parent.profile?.phone,
          dni: updatedUser.parent.profile?.dni
        } : null
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
    await prisma.$transaction([
      prisma.paymentStatus.deleteMany({ where: { studentId } }),
      prisma.submission.deleteMany({ where: { studentId } }),
      prisma.materialAssignment.deleteMany({ where: { studentId } }),
      prisma.enrollment.deleteMany({ where: { studentId } }),
      prisma.assignment.deleteMany({ where: { studentId } }),
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

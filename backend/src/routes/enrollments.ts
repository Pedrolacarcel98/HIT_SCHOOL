import { Router } from 'express';
import { PrismaClient, Modality, BillingPeriod, EnrollmentStatus, PaymentState } from '@prisma/client';
import { authenticateToken, requireTeacher, requireAdmin, AuthRequest } from '../middleware/auth';
import { ensureStudentPaymentScheduleById, getAcademicYearForDate } from '../services/payments';
import { sendAccountReactivationEmail, sendStudentWelcomeEmail } from '../services/email';
import bcrypt from 'bcrypt';
import { deactivateParentIfNoActiveChildren } from '../services/parentStatus';

const router = Router();
const prisma = new PrismaClient();

// GET /api/enrollments/all - Listado completo de matrículas para Admin
router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
  const academicYear = req.query.academicYear as string;

  try {
    const enrollments = await prisma.academyEnrollment.findMany({
      where: academicYear && academicYear !== 'ALL' ? { academicYear } : undefined,
      include: {
        student: {
          select: {
            id: true,
            email: true,
            status: true,
            modality: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                dni: true,
                phone: true
              }
            },
            parent: {
              select: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    dni: true,
                    phone: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    return res.json(enrollments);
  } catch (error) {
    console.error('Error listando matrículas:', error);
    return res.status(500).json({ error: 'Error al obtener la lista de matrículas.' });
  }
});

// POST /api/enrollments/enroll - Formalizar alta / matrícula de alumno
router.post('/enroll', authenticateToken, requireTeacher, async (req, res) => {
  const {
    studentId,
    monthlyFee,
    billingPeriod,
    modality,
    startDate,
    hasBook,
    bookPrice,
    academicYear
  } = req.body;

  const normalizedBillingPeriod = billingPeriod || 'MONTHLY';

  if (!monthlyFee || Number(monthlyFee) <= 0 || !startDate) {
    return res.status(400).json({ error: 'El importe y la fecha de alta son obligatorios.' });
  }
  if (normalizedBillingPeriod !== 'MONTHLY' && normalizedBillingPeriod !== 'QUARTERLY') {
    return res.status(400).json({ error: 'La periodicidad de pago no es válida.' });
  }

  const enrollmentStartDate = new Date(startDate);
  const targetAcademicYear = academicYear || getAcademicYearForDate(enrollmentStartDate);

  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId, role: 'STUDENT' },
      include: { academyEnrollments: { select: { id: true } } }
    });
    if (!student) {
      return res.status(404).json({ error: 'Alumno no encontrado.' });
    }

    if (student.status === 'ACTIVE') {
      return res.status(400).json({ error: 'El alumno ya está dado de alta.' });
    }

    const isFirstEnrollment = student.academyEnrollments.length === 0;
    const temporaryPassword = `hit${Math.floor(1000 + Math.random() * 9000)}`;

    const enrollment = await prisma.academyEnrollment.create({
      data: {
        studentId,
        academicYear: targetAcademicYear,
        startDate: enrollmentStartDate,
        monthlyFee: Number(monthlyFee),
        billingPeriod: normalizedBillingPeriod as BillingPeriod,
        modality: (modality as Modality) || Modality.PRESENCIAL,
        status: EnrollmentStatus.ACTIVE,
        hasBook: Boolean(hasBook),
        bookPrice: hasBook && bookPrice ? Number(bookPrice) : null
      }
    });

    const updatedUser = await prisma.user.update({
      where: { id: studentId },
      data: {
        status: 'ACTIVE',
        modality: (modality as Modality) || Modality.PRESENCIAL,
        passwordHash: await bcrypt.hash(temporaryPassword, 10)
      },
      select: {
        id: true,
        email: true,
        status: true,
        modality: true,
        profile: true
      }
    });

    await ensureStudentPaymentScheduleById(prisma, studentId);

    try {
      if (isFirstEnrollment) {
        await sendStudentWelcomeEmail(
          updatedUser.email,
          updatedUser.profile?.firstName || 'alumno',
          temporaryPassword
        );
      } else {
        await sendAccountReactivationEmail(
          updatedUser.email,
          updatedUser.profile?.firstName || 'alumno',
          temporaryPassword,
          'alumno'
        );
      }
    } catch (mailError) {
      console.error(
        isFirstEnrollment
          ? 'El alumno fue dado de alta por primera vez, pero no se pudo enviar el correo de bienvenida SMTP:'
          : 'El alumno fue reactivado, pero no se pudo enviar el correo de reactivación SMTP:',
        mailError
      );
    }

    return res.json({ message: 'Alumno dado de alta exitosamente', enrollment, user: updatedUser, isFirstEnrollment });
  } catch (error) {
    console.error('Error dando de alta al alumno:', error);
    return res.status(500).json({ error: 'Error interno del servidor al dar de alta.' });
  }
});

// PUT /api/enrollments/:id - Editar matrícula (periodicidad, cuota, modalidad, libro)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const enrollmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { monthlyFee, billingPeriod, modality, hasBook, bookPrice, academicYear } = req.body;

  try {
    const existing = await prisma.academyEnrollment.findUnique({ where: { id: enrollmentId } });
    if (!existing) {
      return res.status(404).json({ error: 'Matrícula no encontrada.' });
    }

    const updated = await prisma.academyEnrollment.update({
      where: { id: enrollmentId },
      data: {
        monthlyFee: monthlyFee !== undefined ? Number(monthlyFee) : existing.monthlyFee,
        billingPeriod: billingPeriod ? (billingPeriod as BillingPeriod) : existing.billingPeriod,
        modality: modality ? (modality as Modality) : existing.modality,
        hasBook: hasBook !== undefined ? Boolean(hasBook) : existing.hasBook,
        bookPrice: hasBook ? (bookPrice !== undefined ? Number(bookPrice) : existing.bookPrice) : null,
        academicYear: academicYear || existing.academicYear
      }
    });

    // Sincronizar también la modalidad en el perfil del usuario
    if (modality) {
      await prisma.user.update({
        where: { id: existing.studentId },
        data: { modality: modality as Modality }
      });
    }

    // Recalcular pagos futuros manteniendo los pagados y personalizados
    await ensureStudentPaymentScheduleById(prisma, existing.studentId);

    return res.json({ message: 'Matrícula actualizada correctamente.', enrollment: updated });
  } catch (error) {
    console.error('Error actualizando matrícula:', error);
    return res.status(500).json({ error: 'Error al actualizar la matrícula.' });
  }
});

// POST /api/enrollments/unenroll - Tramitar baja de alumno y archivar en histórico
router.post('/unenroll', authenticateToken, requireTeacher, async (req, res) => {
  const { studentId } = req.body;

  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { academyEnrollments: { where: { endDate: null } } }
    });

    if (!student) {
      return res.status(404).json({ error: 'Alumno no encontrado.' });
    }

    if (student.status !== 'ACTIVE' || student.academyEnrollments.length === 0) {
      return res.status(400).json({ error: 'El alumno ya está dado de baja o no tiene matrícula activa.' });
    }

    const activeEnrollment = student.academyEnrollments[0];

    // 1. Cerrar matrícula
    await prisma.academyEnrollment.update({
      where: { id: activeEnrollment.id },
      data: {
        endDate: new Date(),
        status: EnrollmentStatus.INACTIVE
      }
    });

    // 2. Desactivar alumno
    const updatedUser = await prisma.user.update({
      where: { id: studentId },
      data: { status: 'INACTIVE' }
    });

    await deactivateParentIfNoActiveChildren(prisma, student.parentId);

    // 3. Eximir pagos futuros que estuvieran pendientes para que no computen como deuda
    await prisma.paymentStatus.updateMany({
      where: {
        enrollmentId: activeEnrollment.id,
        isPaid: false,
        dueDate: { gt: new Date() }
      },
      data: {
        isExempt: true,
        status: PaymentState.EXEMPT
      }
    });

    // Desvincular de clases activas
    await prisma.enrollment.deleteMany({
      where: { studentId }
    });

    return res.json({ message: 'Alumno dado de baja y archivado en histórico exitosamente', user: updatedUser });
  } catch (error) {
    console.error('Error dando de baja al alumno:', error);
    return res.status(500).json({ error: 'Error interno del servidor al dar de baja.' });
  }
});

// POST /api/enrollments/rollover - Apertura y renovación de curso escolar
router.post('/rollover', authenticateToken, requireAdmin, async (req, res) => {
  const { fromYear, toYear, studentIds, defaultFee } = req.body;

  if (!fromYear || !toYear || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'Parámetros insuficientes para la renovación de curso.' });
  }

  try {
    const [yStart] = toYear.split('-');
    const newStartDate = new Date(Number(yStart), 8, 15, 12, 0, 0); // 15 de septiembre del nuevo curso

    let renewedCount = 0;

    for (const studentId of studentIds) {
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        include: { academyEnrollments: { orderBy: { startDate: 'desc' }, take: 1 } }
      });

      if (!student) continue;

      const lastEnrollment = student.academyEnrollments[0];
      const fee = defaultFee ? Number(defaultFee) : (lastEnrollment?.monthlyFee || 65);
      const modality = lastEnrollment?.modality || student.modality || Modality.PRESENCIAL;
      const billingPeriod = lastEnrollment?.billingPeriod || BillingPeriod.MONTHLY;

      // Cerrar matrículas previas si quedaban abiertas
      if (lastEnrollment && !lastEnrollment.endDate) {
        await prisma.academyEnrollment.update({
          where: { id: lastEnrollment.id },
          data: { endDate: new Date(Number(yStart), 5, 30), status: EnrollmentStatus.INACTIVE }
        });
      }

      // Crear nueva matrícula para el nuevo curso
      await prisma.academyEnrollment.create({
        data: {
          studentId,
          academicYear: toYear,
          startDate: newStartDate,
          monthlyFee: fee,
          billingPeriod,
          modality,
          status: EnrollmentStatus.ACTIVE
        }
      });

      await prisma.user.update({
        where: { id: studentId },
        data: { status: 'ACTIVE' }
      });

      await ensureStudentPaymentScheduleById(prisma, studentId);
      renewedCount++;
    }

    return res.json({
      message: `Se han renovado ${renewedCount} alumnos para el curso ${toYear} con éxito.`,
      renewedCount
    });
  } catch (error) {
    console.error('Error en rollover de curso escolar:', error);
    return res.status(500).json({ error: 'Error al renovar curso escolar.' });
  }
});

export default router;

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { ensureStudentPaymentScheduleById } from '../services/payments';
import { sendAccountReactivationEmail, sendStudentWelcomeEmail } from '../services/email';
import bcrypt from 'bcrypt';
import { deactivateParentIfNoActiveChildren } from '../services/parentStatus';

const router = Router();
const prisma = new PrismaClient();

// POST /api/enrollments/enroll
router.post('/enroll', authenticateToken, requireAdmin, async (req, res) => {
  const { studentId, monthlyFee, billingPeriod, startDate } = req.body;
  const normalizedBillingPeriod = billingPeriod || 'MONTHLY';

  if (!monthlyFee || Number(monthlyFee) <= 0 || !startDate) {
    return res.status(400).json({ error: 'El importe y la fecha de alta son obligatorios.' });
  }
  if (normalizedBillingPeriod !== 'MONTHLY' && normalizedBillingPeriod !== 'QUARTERLY') return res.status(400).json({ error: 'La periodicidad de pago no es válida.' });

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
        startDate: new Date(startDate),
        monthlyFee: Number(monthlyFee),
        billingPeriod: normalizedBillingPeriod
      }
    });

    const updatedUser = await prisma.user.update({
      where: { id: studentId },
      data: {
        status: 'ACTIVE',
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

// POST /api/enrollments/unenroll
router.post('/unenroll', authenticateToken, requireAdmin, async (req, res) => {
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

    // Marcar endDate a ahora
    await prisma.academyEnrollment.update({
      where: { id: activeEnrollment.id },
      data: { endDate: new Date() }
    });

    const updatedUser = await prisma.user.update({
      where: { id: studentId },
      data: { status: 'INACTIVE' }
    });

    await deactivateParentIfNoActiveChildren(prisma, student.parentId);

    // Eliminar pagos pendientes futuros que se hubieran generado.
    // Solo borramos los que tengan dueDate posterior a hoy Y que sigan en estado PENDING.
    await prisma.paymentStatus.deleteMany({
      where: {
        enrollmentId: activeEnrollment.id,
        isPaid: false,
        dueDate: { gt: new Date() }
      }
    });

    // Volver a calcular schedule por si acaso
    await ensureStudentPaymentScheduleById(prisma, studentId);

    return res.json({ message: 'Alumno dado de baja exitosamente', user: updatedUser });
  } catch (error) {
    console.error('Error dando de baja al alumno:', error);
    return res.status(500).json({ error: 'Error interno del servidor al dar de baja.' });
  }
});

export default router;

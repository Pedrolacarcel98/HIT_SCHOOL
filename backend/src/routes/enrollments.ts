import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireTeacher } from '../middleware/auth';
import { ensureStudentPaymentScheduleById } from '../services/payments';

const router = Router();
const prisma = new PrismaClient();

// POST /api/enrollments/enroll
router.post('/enroll', authenticateToken, requireTeacher, async (req, res) => {
  const { studentId, monthlyFee, startDate } = req.body;

  if (!monthlyFee || !startDate) {
    return res.status(400).json({ error: 'Tarifa mensual y fecha de alta son obligatorias.' });
  }

  try {
    const student = await prisma.user.findUnique({ where: { id: studentId, role: 'STUDENT' } });
    if (!student) {
      return res.status(404).json({ error: 'Alumno no encontrado.' });
    }

    if (student.status === 'ACTIVE') {
      return res.status(400).json({ error: 'El alumno ya está dado de alta.' });
    }

    const enrollment = await prisma.academyEnrollment.create({
      data: {
        studentId,
        startDate: new Date(startDate),
        monthlyFee: Number(monthlyFee)
      }
    });

    const updatedUser = await prisma.user.update({
      where: { id: studentId },
      data: { status: 'ACTIVE' }
    });

    await ensureStudentPaymentScheduleById(prisma, studentId);

    return res.json({ message: 'Alumno dado de alta exitosamente', enrollment, user: updatedUser });
  } catch (error) {
    console.error('Error dando de alta al alumno:', error);
    return res.status(500).json({ error: 'Error interno del servidor al dar de alta.' });
  }
});

// POST /api/enrollments/unenroll
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

    // Marcar endDate a ahora
    await prisma.academyEnrollment.update({
      where: { id: activeEnrollment.id },
      data: { endDate: new Date() }
    });

    const updatedUser = await prisma.user.update({
      where: { id: studentId },
      data: { status: 'INACTIVE' }
    });

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

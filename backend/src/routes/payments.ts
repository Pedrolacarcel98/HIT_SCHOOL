import { Router } from 'express';
import { PaymentState, PrismaClient } from '@prisma/client';
import { authenticateToken, requireTeacher, AuthRequest } from '../middleware/auth';
import {
  DEFAULT_VISIBLE_MONTH_COUNT,
  ensureStudentPaymentScheduleById,
  getPaymentVisualStatus,
  getVisibleMonthTargets,
  getStudentApplicableMonthsUpToNow,
  getDueDateForEnrollmentMonth,
  isMonthWithinStudentSchedule,
  isPaymentOverdue
} from '../services/payments';

const router = Router();
const prisma = new PrismaClient();

const getQueryString = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
};

const parseMonthYear = (monthParam?: string, yearParam?: string) => {
  const now = new Date();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;
  const year = yearParam ? Number(yearParam) : now.getFullYear();

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { error: 'Mes inválido. Debe estar entre 1 y 12.' };
  }
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return { error: 'Año inválido.' };
  }
  return { month, year };
};

const parseVisibleMonthCount = (monthsParam?: string) => {
  if (!monthsParam) {
    return DEFAULT_VISIBLE_MONTH_COUNT;
  }
  const value = Number(monthsParam);
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    return DEFAULT_VISIBLE_MONTH_COUNT;
  }
  return value;
};

router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Token no válido' });
  }

  const parsed = parseMonthYear(getQueryString(req.query.month), getQueryString(req.query.year));
  if ('error' in parsed) {
    return res.status(400).json(parsed);
  }

  try {
    let targetStudentId = req.user.id;

    if (req.user.role === 'PARENT') {
      const userEmail = (req.user as any)?.email || '';
      const requestedStudentId = getQueryString(req.query.studentId);
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
        if (!child) return res.status(403).json({ error: 'No tienes permisos.' });
        targetStudentId = child.id;
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
        if (!child) return res.status(404).json({ error: 'No tienes ningún alumno asociado.' });
        targetStudentId = child.id;
      }
    }

    await ensureStudentPaymentScheduleById(prisma, targetStudentId);

    const student = await prisma.user.findUnique({
      where: { id: targetStudentId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        profile: { select: { firstName: true, lastName: true, dni: true } },
        parent: { select: { profile: { select: { dni: true, firstName: true, lastName: true } } } },
        academyEnrollments: true
      }
    });

    if (!student || student.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Alumno no encontrado.' });
    }

    const targetMonths = req.query.all === 'true' 
      ? getStudentApplicableMonthsUpToNow(student.academyEnrollments)
      : [{ month: parsed.month, year: parsed.year }];

    const allPayments = await prisma.paymentStatus.findMany({
      where: { studentId: targetStudentId }
    });

    const data = targetMonths.map(target => {
      const payment = allPayments.find(p => p.month === target.month && p.year === target.year);
      const isApplicable = isMonthWithinStudentSchedule(student.academyEnrollments, target.month, target.year);
      const dueDate = payment?.dueDate ?? null;
      const isPaid = payment?.isPaid ?? false;
      const isOverdue = isPaymentOverdue({ isPaid, dueDate });

      return {
        month: target.month,
        year: target.year,
        amount: payment?.amount ?? null,
        dueDate,
        paidAt: payment?.paidAt ?? null,
        isPaid,
        exists: Boolean(payment),
        status: isPaid ? PaymentState.PAID : PaymentState.PENDING,
        isOverdue,
        visualStatus: getPaymentVisualStatus({
          isPaid,
          month: target.month,
          year: target.year,
          dueDate
        }),
        updatedAt: payment?.updatedAt ?? null,
        isApplicable,
        student: {
          id: student.id,
          email: student.email,
          profile: student.profile,
          parent: (student as any).parent,
          enrollments: student.academyEnrollments
        }
      };
    });

    if (req.query.all !== 'true') {
      return res.json(data[0]);
    }

    return res.json(data);
  } catch (error) {
    console.error('Error obteniendo pago del alumno:', error);
    return res.status(500).json({ error: 'Error al obtener el estado del pago' });
  }
});

router.get('/', authenticateToken, requireTeacher, async (req, res) => {
  const visibleMonths = parseVisibleMonthCount(getQueryString(req.query.months));
  const parsed = parseMonthYear(getQueryString(req.query.month), getQueryString(req.query.year));

  if ('error' in parsed) {
    return res.status(400).json(parsed);
  }

  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true }
    });

    await Promise.all(students.map(student => ensureStudentPaymentScheduleById(prisma, student.id)));

    const refreshedStudents = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        email: true,
        status: true,
        modality: true,
        createdAt: true,
        profile: { select: { firstName: true, lastName: true, dni: true } },
        parent: { select: { profile: { select: { dni: true, firstName: true, lastName: true } } } },
        academyEnrollments: { orderBy: { startDate: 'asc' } },
        paymentStatuses: {
          select: {
            month: true,
            year: true,
            amount: true,
            dueDate: true,
            paidAt: true,
            status: true,
            isPaid: true,
            updatedAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = refreshedStudents.map((student) => {
      let targetMonths = getStudentApplicableMonthsUpToNow(student.academyEnrollments);
      
      if (req.query.month || req.query.year) {
         targetMonths = [{ month: parsed.month, year: parsed.year }];
      }

      const payments = targetMonths.map((target) => {
        const payment = student.paymentStatuses.find(
          (item) => item.month === target.month && item.year === target.year
        );
        const isApplicable = isMonthWithinStudentSchedule(student.academyEnrollments, target.month, target.year);
        const dueDate = payment?.dueDate ?? null;
        const isPaid = payment?.isPaid ?? false;

        return {
          month: target.month,
          year: target.year,
          amount: payment?.amount ?? null,
          dueDate,
          paidAt: payment?.paidAt ?? null,
          isPaid,
          exists: Boolean(payment),
          status: isPaid ? PaymentState.PAID : PaymentState.PENDING,
          isOverdue: isPaymentOverdue({ isPaid, dueDate }),
          visualStatus: getPaymentVisualStatus({
            isPaid,
            month: target.month,
            year: target.year,
            dueDate
          }),
          updatedAt: payment?.updatedAt ?? null,
          isApplicable
        };
      });

      return {
        id: student.id,
        email: student.email,
        firstName: student.profile?.firstName ?? 'Alumno',
        lastName: student.profile?.lastName ?? '',
        dni: student.profile?.dni ?? null,
        parent: student.parent ?? null,
        status: student.status,
        modality: student.modality,
        enrollments: student.academyEnrollments,
        payments
      };
    });

    return res.json({ months: [], students: data });
  } catch (error) {
    console.error('Error obteniendo pagos de alumnos:', error);
    return res.status(500).json({ error: 'Error al obtener pagos de alumnos' });
  }
});

router.put('/:studentId', authenticateToken, requireTeacher, async (req: AuthRequest, res) => {
  const studentId = Array.isArray(req.params.studentId) ? req.params.studentId[0] : req.params.studentId;
  const { isPaid, month, year } = req.body;

  if (typeof isPaid !== 'boolean') {
    return res.status(400).json({ error: 'El campo isPaid debe ser booleano.' });
  }

  const parsed = parseMonthYear(
    month !== undefined ? String(month) : undefined,
    year !== undefined ? String(year) : undefined
  );

  if ('error' in parsed) {
    return res.status(400).json(parsed);
  }

  try {
    await ensureStudentPaymentScheduleById(prisma, studentId);

    const targetStudent = await prisma.user.findFirst({ where: { id: studentId, role: 'STUDENT' } });
    if (!targetStudent) return res.status(404).json({ error: 'Alumno no encontrado' });

    const payment = await prisma.paymentStatus.findFirst({
      where: {
        studentId,
        month: parsed.month,
        year: parsed.year
      }
    });

    if (!payment) return res.status(404).json({ error: 'No existe una cuota generada para ese mes.' });

    const updatedPayment = await prisma.paymentStatus.update({
      where: { id: payment.id },
      data: {
        isPaid,
        status: isPaid ? PaymentState.PAID : PaymentState.PENDING,
        paidAt: isPaid ? new Date() : null,
        markedById: req.user?.id
      }
    });

    return res.json({ message: 'Pago actualizado correctamente', payment: updatedPayment });
  } catch (error) {
    console.error('Error actualizando pago:', error);
    return res.status(500).json({ error: 'Error al actualizar el pago' });
  }
});

export default router;

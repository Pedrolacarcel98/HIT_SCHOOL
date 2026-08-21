import { Router } from 'express';
import { PaymentState, PrismaClient } from '@prisma/client';
import { authenticateToken, requireTeacher, AuthRequest } from '../middleware/auth';
import {
  DEFAULT_VISIBLE_MONTH_COUNT,
  ensureStudentPaymentScheduleById,
  getDueDateForMonth,
  getPaymentVisualStatus,
  getVisibleMonthTargets,
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

const serializePayment = (input: {
  month: number;
  year: number;
  amount: number | null;
  dueDate: Date | null;
  paidAt: Date | null;
  isPaid: boolean;
  exists: boolean;
}) => {
  const dueDate = input.dueDate ?? getDueDateForMonth(input.month, input.year);
  const isOverdue = isPaymentOverdue({ isPaid: input.isPaid, dueDate });

  return {
    month: input.month,
    year: input.year,
    amount: input.amount,
    dueDate,
    paidAt: input.paidAt,
    isPaid: input.isPaid,
    exists: input.exists,
    status: input.isPaid ? PaymentState.PAID : PaymentState.PENDING,
    isOverdue,
    visualStatus: getPaymentVisualStatus({ isPaid: input.isPaid, dueDate })
  };
};

router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Token no válido' });
  }

  const parsed = parseMonthYear(
    getQueryString(req.query.month),
    getQueryString(req.query.year)
  );

  if ('error' in parsed) {
    return res.status(400).json(parsed);
  }

  try {
    await ensureStudentPaymentScheduleById(prisma, req.user.id);

    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        monthlyFee: true,
        courseDurationMonths: true,
        courseStartDate: true,
        createdAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!student || student.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Solo los alumnos pueden consultar esta vista.' });
    }

    const payment = await prisma.paymentStatus.findUnique({
      where: {
        studentId_month_year: {
          studentId: req.user.id,
          month: parsed.month,
          year: parsed.year
        }
      }
    });

    const isApplicable = isMonthWithinStudentSchedule(student, parsed.month, parsed.year);
    const serializedPayment = serializePayment({
      month: parsed.month,
      year: parsed.year,
      amount: payment?.amount ?? student.monthlyFee ?? null,
      dueDate: payment?.dueDate ?? (isApplicable ? getDueDateForMonth(parsed.month, parsed.year) : null),
      paidAt: payment?.paidAt ?? null,
      isPaid: payment?.isPaid ?? false,
      exists: Boolean(payment)
    });

    return res.json({
      ...serializedPayment,
      updatedAt: payment?.updatedAt ?? null,
      isApplicable,
      student
    });
  } catch (error) {
    console.error('Error obteniendo pago del alumno:', error);
    return res.status(500).json({ error: 'Error al obtener el estado del pago' });
  }
});

router.get('/', authenticateToken, requireTeacher, async (req, res) => {
  const visibleMonths = parseVisibleMonthCount(
    getQueryString(req.query.months)
  );
  const parsed = parseMonthYear(
    getQueryString(req.query.month),
    getQueryString(req.query.year)
  );

  if ('error' in parsed) {
    return res.status(400).json(parsed);
  }

  try {
    const monthsToQuery = req.query.month || req.query.year
      ? [{ month: parsed.month, year: parsed.year }]
      : getVisibleMonthTargets(visibleMonths);

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        email: true,
        monthlyFee: true,
        courseDurationMonths: true,
        courseStartDate: true,
        createdAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        paymentStatuses: {
          where: {
            OR: monthsToQuery.map((item) => ({ month: item.month, year: item.year }))
          },
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
      orderBy: {
        profile: {
          firstName: 'asc'
        }
      }
    });

    await Promise.all(students.map((student) => ensureStudentPaymentScheduleById(prisma, student.id)));

    const refreshedStudents = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        email: true,
        monthlyFee: true,
        courseDurationMonths: true,
        courseStartDate: true,
        createdAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        paymentStatuses: {
          where: {
            OR: monthsToQuery.map((item) => ({ month: item.month, year: item.year }))
          },
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
      orderBy: {
        profile: {
          firstName: 'asc'
        }
      }
    });

    const data = refreshedStudents.map((student) => {
      const payments = monthsToQuery.map((target) => {
        const payment = student.paymentStatuses.find(
          (item) => item.month === target.month && item.year === target.year
        );
        const isApplicable = isMonthWithinStudentSchedule(student, target.month, target.year);
        const serializedPayment = serializePayment({
          month: target.month,
          year: target.year,
          amount: payment?.amount ?? student.monthlyFee ?? null,
          dueDate: payment?.dueDate ?? (isApplicable ? getDueDateForMonth(target.month, target.year) : null),
          paidAt: payment?.paidAt ?? null,
          isPaid: payment?.isPaid ?? false,
          exists: Boolean(payment)
        });

        return {
          ...serializedPayment,
          updatedAt: payment?.updatedAt ?? null,
          isApplicable
        };
      });

      return {
        id: student.id,
        email: student.email,
        firstName: student.profile?.firstName ?? 'Alumno',
        lastName: student.profile?.lastName ?? '',
        monthlyFee: student.monthlyFee,
        courseDurationMonths: student.courseDurationMonths,
        payments
      };
    });

    return res.json({ months: monthsToQuery, students: data });
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

    if (!targetStudent) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    const payment = await prisma.paymentStatus.findUnique({
      where: {
        studentId_month_year: {
          studentId,
          month: parsed.month,
          year: parsed.year
        }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'No existe una cuota generada para ese mes.' });
    }

    const updatedPayment = await prisma.paymentStatus.update({
      where: { id: payment.id },
      data: {
        isPaid,
        status: isPaid ? PaymentState.PAID : PaymentState.PENDING,
        paidAt: isPaid ? new Date() : null,
        markedById: req.user?.id
      }
    });

    return res.json({
      message: 'Pago actualizado correctamente',
      payment: updatedPayment
    });
  } catch (error) {
    console.error('Error actualizando pago:', error);
    return res.status(500).json({ error: 'Error al actualizar el pago' });
  }
});

export default router;

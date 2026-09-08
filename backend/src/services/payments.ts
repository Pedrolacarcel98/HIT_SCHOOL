import { PaymentState, PrismaClient, Role, AcademyEnrollment } from '@prisma/client';

export const ALLOWED_MONTHLY_FEES = [35, 65] as const;
export const DEFAULT_VISIBLE_MONTH_COUNT = 3;

export interface MonthTarget {
  month: number;
  year: number;
}

const normalizeMonthDate = (year: number, month: number) => new Date(year, month - 1, 1, 12, 0, 0, 0);

export const getDueDateForEnrollmentMonth = (
  enrollment: Pick<AcademyEnrollment, 'startDate'>,
  month: number,
  year: number
) => {
  const startDay = new Date(enrollment.startDate).getDate();
  let dueDate = new Date(year, month - 1, startDay, 12, 0, 0, 0);

  if (dueDate.getMonth() !== (month - 1) % 12 && dueDate.getMonth() !== month - 1) {
    dueDate = new Date(year, month, 0, 12, 0, 0, 0); 
  }
  return dueDate;
};

const addMonths = (date: Date, offset: number) => new Date(date.getFullYear(), date.getMonth() + offset, 1, 12, 0, 0, 0);

export const getVisibleMonthTargets = (count = DEFAULT_VISIBLE_MONTH_COUNT, referenceDate = new Date()): MonthTarget[] => {
  return Array.from({ length: count }, (_, index) => {
    const date = addMonths(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 12, 0, 0, 0), -index);
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear()
    };
  });
};

export const getStudentApplicableMonthsUpToNow = (
  enrollments: Pick<AcademyEnrollment, 'startDate' | 'endDate'>[],
  referenceDate = new Date()
): MonthTarget[] => {
  const monthsSet = new Set<string>();

  enrollments.forEach(enrollment => {
    const start = new Date(enrollment.startDate);
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1, 12, 0, 0, 0);
    const end = enrollment.endDate ? new Date(enrollment.endDate) : referenceDate;
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1, 12, 0, 0, 0);

    let current = new Date(startMonth);
    while (current.getTime() <= Math.max(startMonth.getTime(), endMonth.getTime())) {
      monthsSet.add(`${current.getFullYear()}-${current.getMonth() + 1}`);
      current = addMonths(current, 1);
    }
  });

  const months = Array.from(monthsSet).map(s => {
    const [y, m] = s.split('-');
    return { year: parseInt(y), month: parseInt(m) };
  });

  return months.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
};

export const isPaymentOverdue = (
  payment: { isPaid: boolean; dueDate: Date | string | null },
  referenceDate = new Date()
) => {
  if (payment.isPaid || !payment.dueDate) {
    return false;
  }

  const dDate = new Date(payment.dueDate);
  if (isNaN(dDate.getTime())) return false;

  const warningDate = new Date(dDate);
  warningDate.setDate(warningDate.getDate() + 10);

  const refDate = new Date(referenceDate);
  return refDate.getTime() > warningDate.getTime();
};

export const getPaymentVisualStatus = (
  payment: { isPaid: boolean; month: number; year: number; dueDate?: Date | string | null },
  referenceDate = new Date()
): 'PAID' | 'PENDING' | 'OVERDUE' => {
  if (payment.isPaid) {
    return 'PAID';
  }

  if (payment.dueDate) {
    return isPaymentOverdue({ isPaid: payment.isPaid, dueDate: payment.dueDate }, referenceDate)
      ? 'OVERDUE'
      : 'PENDING';
  }

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;

  return payment.year < currentYear || (payment.year === currentYear && payment.month < currentMonth)
    ? 'OVERDUE'
    : 'PENDING';
};

export const ensureStudentPaymentScheduleById = async (prisma: PrismaClient, studentId: string) => {
  const enrollments = await prisma.academyEnrollment.findMany({
    where: { studentId }
  });

  if (enrollments.length === 0) {
    return [];
  }

  const generatedPayments = [];

  for (const enrollment of enrollments) {
    const start = new Date(enrollment.startDate);
    const startMonthDate = new Date(start.getFullYear(), start.getMonth(), 1, 12, 0, 0, 0);
    
    const end = enrollment.endDate ? new Date(enrollment.endDate) : new Date();
    const endMonthDate = new Date(end.getFullYear(), end.getMonth(), 1, 12, 0, 0, 0);

    let current = new Date(startMonthDate);
    
    while (current.getTime() <= Math.max(startMonthDate.getTime(), endMonthDate.getTime())) {
      const month = current.getMonth() + 1;
      const year = current.getFullYear();
      const dueDate = getDueDateForEnrollmentMonth(enrollment, month, year);

      const existingPayment = await prisma.paymentStatus.findFirst({
        where: {
          studentId,
          month,
          year
        }
      });

      if (!existingPayment) {
        await prisma.paymentStatus.create({
          data: {
            studentId,
            enrollmentId: enrollment.id,
            month,
            year,
            amount: enrollment.monthlyFee,
            dueDate,
            status: PaymentState.PENDING,
            isPaid: false
          }
        });
      } else if (existingPayment.enrollmentId === enrollment.id && !existingPayment.isPaid) {
        const existingTime = existingPayment.dueDate ? new Date(existingPayment.dueDate).getTime() : 0;
        if (existingPayment.amount !== enrollment.monthlyFee || existingTime !== dueDate.getTime()) {
          await prisma.paymentStatus.update({
            where: { id: existingPayment.id },
            data: {
              amount: enrollment.monthlyFee,
              dueDate,
              status: PaymentState.PENDING
            }
          });
        }
      }

      generatedPayments.push({ month, year });
      current = addMonths(current, 1);
    }
  }

  return generatedPayments;
};

export const getDueDateForMonth = (month: number, year: number) => normalizeMonthDate(year, month);

export const isMonthWithinStudentSchedule = (
  enrollments: Pick<AcademyEnrollment, 'startDate' | 'endDate'>[],
  month: number,
  year: number
) => {
  const targetMonth = normalizeMonthDate(year, month);
  
  return enrollments.some(enrollment => {
    const start = new Date(enrollment.startDate);
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1, 12, 0, 0, 0);
    const end = enrollment.endDate ? new Date(enrollment.endDate) : new Date();
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1, 12, 0, 0, 0);
    
    return targetMonth.getTime() >= startMonth.getTime() && targetMonth.getTime() <= endMonth.getTime();
  });
};
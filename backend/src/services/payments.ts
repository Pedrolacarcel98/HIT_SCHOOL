import { PaymentState, PrismaClient, Role } from '@prisma/client';

export const ALLOWED_MONTHLY_FEES = [35, 65] as const;
export const DEFAULT_VISIBLE_MONTH_COUNT = 3;
export const MAX_COURSE_DURATION_MONTHS = 60;

export interface StudentBillingSnapshot {
  id: string;
  role: Role | string;
  createdAt: Date;
  courseDurationMonths: number | null;
  monthlyFee: number | null;
  courseStartDate: Date | null;
}

export interface MonthTarget {
  month: number;
  year: number;
}

const normalizeMonthDate = (year: number, month: number) => new Date(year, month - 1, 1, 12, 0, 0, 0);

const addMonths = (date: Date, offset: number) => new Date(date.getFullYear(), date.getMonth() + offset, 1, 12, 0, 0, 0);

const startOfStudentBilling = (student: StudentBillingSnapshot) => {
  const source = student.courseStartDate ?? student.createdAt;
  return new Date(source.getFullYear(), source.getMonth(), 1, 12, 0, 0, 0);
};

export const getVisibleMonthTargets = (count = DEFAULT_VISIBLE_MONTH_COUNT, referenceDate = new Date()): MonthTarget[] => {
  return Array.from({ length: count }, (_, index) => {
    const date = addMonths(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 12, 0, 0, 0), -index);
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear()
    };
  });
};

export const isPaymentOverdue = (
  payment: { isPaid: boolean; dueDate: Date },
  referenceDate = new Date()
) => {
  if (payment.isPaid) {
    return false;
  }

  const warningDate = new Date(payment.dueDate);
  warningDate.setDate(warningDate.getDate() + 7);

  return referenceDate.getTime() > warningDate.getTime();
};

export const getPaymentVisualStatus = (
  payment: { isPaid: boolean; dueDate: Date },
  referenceDate = new Date()
): 'PAID' | 'PENDING' | 'OVERDUE' => {
  if (payment.isPaid) {
    return 'PAID';
  }

  return isPaymentOverdue(payment, referenceDate) ? 'OVERDUE' : 'PENDING';
};

export const ensureStudentPaymentSchedule = async (
  prisma: PrismaClient,
  student: StudentBillingSnapshot
) => {
  if (student.role !== 'STUDENT' || !student.courseDurationMonths || !student.monthlyFee) {
    return [];
  }

  const startMonth = startOfStudentBilling(student);
  const payments = [] as Array<{ month: number; year: number }>;

  for (let offset = 0; offset < student.courseDurationMonths; offset += 1) {
    const installmentDate = addMonths(startMonth, offset);
    const month = installmentDate.getMonth() + 1;
    const year = installmentDate.getFullYear();
    const dueDate = normalizeMonthDate(year, month);

    const existingPayment = await prisma.paymentStatus.findUnique({
      where: {
        studentId_month_year: {
          studentId: student.id,
          month,
          year
        }
      }
    });

    if (!existingPayment) {
      await prisma.paymentStatus.create({
        data: {
          studentId: student.id,
          month,
          year,
          amount: student.monthlyFee,
          dueDate,
          status: PaymentState.PENDING,
          isPaid: false
        }
      });
    } else if (!existingPayment.isPaid && (existingPayment.amount !== student.monthlyFee || existingPayment.dueDate.getTime() !== dueDate.getTime())) {
      await prisma.paymentStatus.update({
        where: { id: existingPayment.id },
        data: {
          amount: student.monthlyFee,
          dueDate,
          status: PaymentState.PENDING
        }
      });
    }

    payments.push({ month, year });
  }

  return payments;
};

export const ensureStudentPaymentScheduleById = async (prisma: PrismaClient, studentId: string) => {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      role: true,
      createdAt: true,
      courseDurationMonths: true,
      monthlyFee: true,
      courseStartDate: true
    }
  });

  if (!student) {
    return [];
  }

  return ensureStudentPaymentSchedule(prisma, student);
};

export const getDueDateForMonth = (month: number, year: number) => normalizeMonthDate(year, month);

export const isMonthWithinStudentSchedule = (
  student: Pick<StudentBillingSnapshot, 'createdAt' | 'courseDurationMonths' | 'courseStartDate'>,
  month: number,
  year: number
) => {
  if (!student.courseDurationMonths || student.courseDurationMonths <= 0) {
    return false;
  }

  const startMonth = new Date(
    (student.courseStartDate ?? student.createdAt).getFullYear(),
    (student.courseStartDate ?? student.createdAt).getMonth(),
    1,
    12,
    0,
    0,
    0
  );
  const endMonth = addMonths(startMonth, student.courseDurationMonths - 1);
  const targetMonth = normalizeMonthDate(year, month);

  return targetMonth.getTime() >= startMonth.getTime() && targetMonth.getTime() <= endMonth.getTime();
};
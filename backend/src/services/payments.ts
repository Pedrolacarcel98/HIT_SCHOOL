import { BillingPeriod, PaymentState, PrismaClient, Prisma, AcademyEnrollment, Modality } from '@prisma/client';

export const DEFAULT_VISIBLE_MONTH_COUNT = 3;

export interface MonthTarget {
  month: number;
  year: number;
}

export const getAcademicYearForDate = (date: Date = new Date()): string => {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  if (month >= 9) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
};

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

const isCurrentOrFutureMonth = (month: number, year: number, referenceDate = new Date()) => {
  const target = normalizeMonthDate(year, month).getTime();
  const current = normalizeMonthDate(referenceDate.getFullYear(), referenceDate.getMonth() + 1).getTime();
  return target >= current;
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

export const getStudentApplicableMonthsUpToNow = (
  enrollments: Pick<AcademyEnrollment, 'startDate' | 'endDate' | 'billingPeriod'>[],
  referenceDate = new Date()
): MonthTarget[] => {
  const monthsSet = new Set<string>();

  enrollments.forEach(enrollment => {
    const start = new Date(enrollment.startDate);
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1, 12, 0, 0, 0);
    const end = enrollment.endDate ? new Date(enrollment.endDate) : referenceDate;
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1, 12, 0, 0, 0);

    let current = new Date(startMonth);
    const maxEnd = Math.max(startMonth.getTime(), endMonth.getTime());

    while (current.getTime() <= maxEnd) {
      monthsSet.add(`${current.getFullYear()}-${current.getMonth() + 1}`);
      current = addMonths(current, 1);
    }

    // Si es trimestral y el inicio cae en un trimestre, asegurar que se cubran los meses del trimestre
    if (enrollment.billingPeriod === BillingPeriod.QUARTERLY) {
      const qMonths = getQuarterMonthsForDate(start);
      qMonths.forEach(target => {
        monthsSet.add(`${target.year}-${target.month}`);
      });
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

/**
 * Devuelve los meses restantes del trimestre a partir de una fecha de inicio
 * T1: Oct (10), Nov (11), Dec (12)
 * T2: Jan (1), Feb (2), Mar (3)
 * T3: Apr (4), May (5), Jun (6)
 */
export const getQuarterMonthsForDate = (date: Date): MonthTarget[] => {
  const m = date.getMonth() + 1;
  const y = date.getFullYear();

  // Trimestre 1 (Oct - Dic)
  if (m === 10) return [{ month: 10, year: y }, { month: 11, year: y }, { month: 12, year: y }];
  if (m === 11) return [{ month: 11, year: y }, { month: 12, year: y }];
  if (m === 12) return [{ month: 12, year: y }];

  // Trimestre 2 (Ene - Mar)
  if (m === 1) return [{ month: 1, year: y }, { month: 2, year: y }, { month: 3, year: y }];
  if (m === 2) return [{ month: 2, year: y }, { month: 3, year: y }];
  if (m === 3) return [{ month: 3, year: y }];

  // Trimestre 3 (Abr - Jun)
  if (m === 4) return [{ month: 4, year: y }, { month: 5, year: y }, { month: 6, year: y }];
  if (m === 5) return [{ month: 5, year: y }, { month: 6, year: y }];
  if (m === 6) return [{ month: 6, year: y }];

  // Septiembre u otros meses: devuelve el propio mes
  return [{ month: m, year: y }];
};

export const isPaymentOverdue = (
  payment: { isPaid: boolean; isExempt?: boolean; status?: string; dueDate: Date | string | null },
  referenceDate = new Date()
) => {
  if (payment.isPaid || payment.isExempt || payment.status === 'EXEMPT' || !payment.dueDate) {
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
  payment: { isPaid: boolean; isExempt?: boolean; status?: string; month: number; year: number; dueDate?: Date | string | null },
  referenceDate = new Date()
): 'PAID' | 'PENDING' | 'OVERDUE' | 'EXEMPT' => {
  if (payment.isExempt || payment.status === 'EXEMPT') {
    return 'EXEMPT';
  }

  if (payment.isPaid) {
    return 'PAID';
  }

  if (payment.dueDate) {
    return isPaymentOverdue({ isPaid: payment.isPaid, isExempt: payment.isExempt, status: payment.status, dueDate: payment.dueDate }, referenceDate)
      ? 'OVERDUE'
      : 'PENDING';
  }

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;

  return payment.year < currentYear || (payment.year === currentYear && payment.month < currentMonth)
    ? 'OVERDUE'
    : 'PENDING';
};

/**
 * Genera o sincroniza el calendario de pagos de un alumno
 * - Respeta la regla del 15 de septiembre (50% solo en presencial)
 * - Respeta trimestres (Oct-Dic, Ene-Mar, Abr-Jun) generando las cartas correspondientes
 * - Genera el concepto 'Material / Libro' si la matrícula tiene libro configurado
 * - Respeta pagos con isCustom o isExempt para mantener la 'memoria'
 */
export const ensureStudentPaymentScheduleById = async (prisma: PrismaClient | Prisma.TransactionClient, studentId: string) => {
  const enrollments = await prisma.academyEnrollment.findMany({
    where: { studentId }
  });

  if (enrollments.length === 0) {
    return [];
  }

  const generatedPayments: Array<{ month: number; year: number; concept: string }> = [];

  for (const enrollment of enrollments) {
    const start = new Date(enrollment.startDate);
    const academicYear = enrollment.academicYear || getAcademicYearForDate(start);
    const startDay = start.getDate();
    const startMonth = start.getMonth() + 1;
    const startYear = start.getFullYear();

    // 1. Manejo del cobro de Material / Libro si está activado
    if (enrollment.hasBook && enrollment.bookPrice && enrollment.bookPrice > 0) {
      const bookAcademicYear = getAcademicYearForDate(start);
      const existingBookPayment = await prisma.paymentStatus.findFirst({
        where: {
          studentId,
          concept: 'Material / Libro'
        }
      });

      const wasDeletedBook = await prisma.deletedPaymentRecord.findFirst({
        where: {
          studentId,
          concept: 'Material / Libro'
        }
      });

      if (!existingBookPayment && !wasDeletedBook) {
        await prisma.paymentStatus.create({
          data: {
            studentId,
            enrollmentId: enrollment.id,
            academicYear: bookAcademicYear,
            month: startMonth,
            year: startYear,
            amount: enrollment.bookPrice,
            concept: 'Material / Libro',
            isCustom: true,
            isExempt: false,
            dueDate: start,
            status: PaymentState.PENDING,
            isPaid: false
          }
        });
        generatedPayments.push({ month: startMonth, year: startYear, concept: 'Material / Libro' });
      } else if (existingBookPayment && existingBookPayment.academicYear !== bookAcademicYear) {
        await prisma.paymentStatus.update({
          where: { id: existingBookPayment.id },
          data: { academicYear: bookAcademicYear }
        });
      }
    }

    // 2. Determinar los meses a generar según la periodicidad
    const monthsToSchedule: MonthTarget[] = [];
    const end = enrollment.endDate ? new Date(enrollment.endDate) : new Date();
    const endMonthDate = new Date(end.getFullYear(), end.getMonth(), 1, 12, 0, 0, 0);

    if (enrollment.billingPeriod === BillingPeriod.QUARTERLY) {
      // Si empezó en septiembre, septiembre es independiente + los meses del T1
      if (startMonth === 9) {
        monthsToSchedule.push({ month: 9, year: startYear });
        // Además, genera el T1 completo (10, 11, 12)
        monthsToSchedule.push({ month: 10, year: startYear });
        monthsToSchedule.push({ month: 11, year: startYear });
        monthsToSchedule.push({ month: 12, year: startYear });
      } else {
        // Generar los meses restantes del trimestre del inicio
        const qMonths = getQuarterMonthsForDate(start);
        qMonths.forEach(target => {
          if (!monthsToSchedule.some(m => m.month === target.month && m.year === target.year)) {
            monthsToSchedule.push(target);
          }
        });
      }

      // Además, si el mes actual ya ha avanzado a trimestres posteriores dentro de la fecha fin, agregarlos
      let cur = new Date(start.getFullYear(), start.getMonth(), 1, 12, 0, 0, 0);
      while (cur.getTime() <= endMonthDate.getTime()) {
        const qRest = getQuarterMonthsForDate(cur);
        qRest.forEach(target => {
          if (!monthsToSchedule.some(m => m.month === target.month && m.year === target.year)) {
            monthsToSchedule.push(target);
          }
        });
        cur = addMonths(cur, 3);
      }
    } else {
      // MONTHLY: Mes a mes desde start hasta endMonthDate (o mes actual)
      let cur = new Date(start.getFullYear(), start.getMonth(), 1, 12, 0, 0, 0);
      while (cur.getTime() <= Math.max(new Date(start.getFullYear(), start.getMonth(), 1, 12, 0, 0, 0).getTime(), endMonthDate.getTime())) {
        monthsToSchedule.push({
          month: cur.getMonth() + 1,
          year: cur.getFullYear()
        });
        cur = addMonths(cur, 1);
      }
    }

    // 3. Crear o actualizar cada cuota mensual
    for (const target of monthsToSchedule) {
      const month = target.month;
      const year = target.year;
      if (month === 7 || month === 8) continue;
      const dueDate = getDueDateForEnrollmentMonth(enrollment, month, year);
      const targetAcademicYear = getAcademicYearForDate(new Date(year, month - 1, 1));

      // Calcular importe base aplicando la Regla del 15 de Septiembre
      let calculatedAmount = enrollment.monthlyFee;
      if (
        month === 9 &&
        year === startYear &&
        enrollment.modality === Modality.PRESENCIAL &&
        startMonth === 9 &&
        startDay >= 15
      ) {
        calculatedAmount = Math.round((enrollment.monthlyFee / 2) * 100) / 100;
      }

      const existingPayment = await prisma.paymentStatus.findFirst({
        where: {
          studentId,
          month,
          year,
          concept: 'Cuota mensual'
        }
      });

      // Si este mes fue eliminado explícitamente por el administrador por error, no regenerar
      const wasDeletedMonth = await prisma.deletedPaymentRecord.findFirst({
        where: {
          studentId,
          month,
          year,
          concept: 'Cuota mensual'
        }
      });

      if (!existingPayment && !wasDeletedMonth) {
        await prisma.paymentStatus.create({
          data: {
            studentId,
            enrollmentId: enrollment.id,
            academicYear: targetAcademicYear,
            month,
            year,
            amount: calculatedAmount,
            concept: 'Cuota mensual',
            isCustom: false,
            isExempt: false,
            dueDate,
            status: PaymentState.PENDING,
            isPaid: false
          }
        });
        generatedPayments.push({ month, year, concept: 'Cuota mensual' });
      } else if (existingPayment) {
        // Asegurar que academicYear esté actualizado al curso correcto si era un valor previo incorrecto
        if (existingPayment.academicYear !== targetAcademicYear) {
          await prisma.paymentStatus.update({
            where: { id: existingPayment.id },
            data: { academicYear: targetAcademicYear }
          });
        }

        // Si el pago existe y no fue personalizado manualmente, ni está exento, ni está pagado, actualizar dueDate e importe si cambió la cuota
        if (!existingPayment.isCustom && !existingPayment.isExempt && !existingPayment.isPaid) {
          const shouldUpdateAmount = isCurrentOrFutureMonth(month, year) && existingPayment.amount !== calculatedAmount;
          const existingTime = existingPayment.dueDate ? new Date(existingPayment.dueDate).getTime() : 0;

          if (shouldUpdateAmount || existingTime !== dueDate.getTime()) {
            await prisma.paymentStatus.update({
              where: { id: existingPayment.id },
              data: {
                amount: shouldUpdateAmount ? calculatedAmount : existingPayment.amount,
                dueDate
              }
            });
          }
        }
        generatedPayments.push({ month, year, concept: 'Cuota mensual' });
      }
    }
  }

  return generatedPayments;
};

export const getDueDateForMonth = (month: number, year: number) => normalizeMonthDate(year, month);

export const isMonthWithinStudentSchedule = (
  enrollments: Pick<AcademyEnrollment, 'startDate' | 'endDate' | 'billingPeriod'>[],
  month: number,
  year: number
) => {
  const targetMonth = normalizeMonthDate(year, month);

  return enrollments.some(enrollment => {
    const start = new Date(enrollment.startDate);
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1, 12, 0, 0, 0);
    const end = enrollment.endDate ? new Date(enrollment.endDate) : new Date();
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1, 12, 0, 0, 0);

    if (enrollment.billingPeriod === BillingPeriod.QUARTERLY) {
      const qMonths = getQuarterMonthsForDate(start);
      if (qMonths.some(m => m.month === month && m.year === year)) {
        return true;
      }
    }

    return targetMonth.getTime() >= startMonth.getTime() && targetMonth.getTime() <= endMonth.getTime();
  });
};

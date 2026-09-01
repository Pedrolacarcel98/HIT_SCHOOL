export type PaymentVisualStatus = 'PAID' | 'PENDING' | 'OVERDUE';

export const getPaymentVisualStatus = (
  isPaid: boolean,
  month: number,
  year: number,
  referenceDate = new Date()
): PaymentVisualStatus => {
  if (isPaid) {
    return 'PAID';
  }

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;

  return year < currentYear || (year === currentYear && month < currentMonth)
    ? 'OVERDUE'
    : 'PENDING';
};
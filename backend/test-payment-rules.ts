import {
  getAcademicYearForDate,
  getQuarterMonthsForDate,
  getPaymentVisualStatus,
  isPaymentOverdue,
  ensureStudentPaymentScheduleById
} from './src/services/payments';
import type { PrismaClient } from '@prisma/client';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { AddressInfo } from 'node:net';
import { createEnrollmentsRouter } from './src/routes/enrollments';
import { createPaymentsRouter } from './src/routes/payments';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

console.log('\n==================================================');
console.log('🧪 SUITE DE PRUEBAS: CONTROL DE PAGOS Y MATRÍCULAS');
console.log('==================================================\n');

// 1. Pruebas de Cursos Académicos
console.log('🔹 1. Curso Académico (Año Escolar)');
const academicYearSep2024 = getAcademicYearForDate(new Date(2024, 8, 15)); // 15 Sep 2024
assert(academicYearSep2024 === '2024-2025', '15 Sep 2024 pertenece al curso 2024-2025');

const academicYearNov2024 = getAcademicYearForDate(new Date(2024, 10, 10)); // 10 Nov 2024
assert(academicYearNov2024 === '2024-2025', '10 Nov 2024 pertenece al curso 2024-2025');

const academicYearMar2025 = getAcademicYearForDate(new Date(2025, 2, 20)); // 20 Mar 2025
assert(academicYearMar2025 === '2024-2025', '20 Mar 2025 pertenece al curso 2024-2025');

const academicYearSep2025 = getAcademicYearForDate(new Date(2025, 8, 1)); // 1 Sep 2025
assert(academicYearSep2025 === '2025-2026', '1 Sep 2025 pertenece al nuevo curso 2025-2026');

// 2. Pruebas de Trimestres
console.log('\n🔹 2. Sistema de Trimestres y Meses Restantes');
const qOct = getQuarterMonthsForDate(new Date(2024, 9, 1)); // Octubre 2024
assert(qOct.length === 3 && qOct[0].month === 10 && qOct[1].month === 11 && qOct[2].month === 12,
  'Inicio en Octubre genera los 3 meses del T1 (Oct, Nov, Dic)');

const qNov = getQuarterMonthsForDate(new Date(2024, 10, 10)); // 10 Noviembre 2024
assert(qNov.length === 2 && qNov[0].month === 11 && qNov[1].month === 12,
  'Inicio en 10 Noviembre genera solo los meses restantes del T1 (Nov y Dic)');

const qDec = getQuarterMonthsForDate(new Date(2024, 11, 20)); // Diciembre 2024
assert(qDec.length === 1 && qDec[0].month === 12,
  'Inicio en Diciembre genera solo Diciembre del T1');

const qJan = getQuarterMonthsForDate(new Date(2025, 0, 15)); // Enero 2025
assert(qJan.length === 3 && qJan[0].month === 1 && qJan[1].month === 2 && qJan[2].month === 3,
  'Inicio en Enero genera los 3 meses del T2 (Ene, Feb, Mar)');

const qFeb = getQuarterMonthsForDate(new Date(2025, 1, 5)); // Febrero 2025
assert(qFeb.length === 2 && qFeb[0].month === 2 && qFeb[1].month === 3,
  'Inicio en Febrero genera los meses restantes del T2 (Feb, Mar)');

const qApr = getQuarterMonthsForDate(new Date(2025, 3, 1)); // Abril 2025
assert(qApr.length === 3 && qApr[0].month === 4 && qApr[1].month === 5 && qApr[2].month === 6,
  'Inicio en Abril genera los 3 meses del T3 (Abr, May, Jun)');

// 3. Pruebas de Regla de Septiembre (Presencial vs Online)
console.log('\n🔹 3. Regla del 15 de Septiembre');
function calculateSeptemberAmount(fee: number, modality: string, startMonth: number, startDay: number) {
  if (modality === 'PRESENCIAL' && startMonth === 9 && startDay >= 15) {
    return Math.round((fee / 2) * 100) / 100;
  }
  return fee;
}

const feePresencial15Sep = calculateSeptemberAmount(60, 'PRESENCIAL', 9, 15);
assert(feePresencial15Sep === 30, 'Alta 15 Sep Presencial (cuota 60€) cobra el 50% (30€)');

const feeOnline15Sep = calculateSeptemberAmount(60, 'ONLINE', 9, 15);
assert(feeOnline15Sep === 60, 'Alta 15 Sep Online (cuota 60€) cobra el 100% íntegro (60€)');

const feePresencial05Sep = calculateSeptemberAmount(60, 'PRESENCIAL', 9, 5);
assert(feePresencial05Sep === 60, 'Alta 05 Sep Presencial (antes del día 15) cobra el 100% (60€)');

const feePresencial15Nov = calculateSeptemberAmount(60, 'PRESENCIAL', 11, 15);
assert(feePresencial15Nov === 60, 'Alta 15 Noviembre Presencial cobra el 100% (la regla es exclusiva de septiembre)');

const feeHalfDecimals = calculateSeptemberAmount(65, 'PRESENCIAL', 9, 15);
assert(feeHalfDecimals === 32.5, 'Cuota impar (65€) en 15 Sep Presencial divide con precisión a 32.50€');

// 4. Pruebas de Visual Status y Exenciones
console.log('\n🔹 4. Estados Visuales y Exenciones (Vacaciones)');
const exemptStatus = getPaymentVisualStatus({
  isPaid: false,
  isExempt: true,
  month: 10,
  year: 2024,
  dueDate: new Date(2024, 9, 1)
});
assert(exemptStatus === 'EXEMPT', 'Pago marcado como isExempt devuelve visualStatus EXEMPT');

const paidStatus = getPaymentVisualStatus({
  isPaid: true,
  isExempt: false,
  month: 10,
  year: 2024,
  dueDate: new Date(2024, 9, 1)
});
assert(paidStatus === 'PAID', 'Pago liquidado isPaid = true devuelve visualStatus PAID');

const overdueStatus = getPaymentVisualStatus({
  isPaid: false,
  isExempt: false,
  month: 1,
  year: 2023,
  dueDate: new Date(2023, 0, 1)
});
assert(overdueStatus === 'OVERDUE', 'Pago del pasado no pagado devuelve visualStatus OVERDUE');

async function checkGeneratedSchedules() {
  const scenarios = [
    { name: 'Monthly 65', billingPeriod: 'MONTHLY', modality: 'PRESENCIAL', fee: 65, start: '2025-09-15T12:00:00', end: '2025-11-30T12:00:00', amounts: [32.5, 65, 65] },
    { name: 'Quarterly 60 per month', billingPeriod: 'QUARTERLY', modality: 'PRESENCIAL', fee: 60, start: '2025-10-01T12:00:00', end: '2025-12-31T12:00:00', amounts: [60, 60, 60] },
    { name: 'September plus first quarter', billingPeriod: 'QUARTERLY', modality: 'PRESENCIAL', fee: 60, start: '2025-09-15T12:00:00', end: '2025-12-31T12:00:00', amounts: [30, 60, 60, 60] },
    { name: 'Online September full fee', billingPeriod: 'MONTHLY', modality: 'ONLINE', fee: 65, start: '2025-09-15T12:00:00', end: '2025-09-30T12:00:00', amounts: [65] },
    { name: 'No ordinary July or August fees', billingPeriod: 'MONTHLY', modality: 'PRESENCIAL', fee: 65, start: '2025-06-01T12:00:00', end: '2025-08-31T12:00:00', amounts: [65] }
    ,{ name: 'Editable future rate', billingPeriod: 'MONTHLY', modality: 'PRESENCIAL', fee: 65, start: '2099-09-15T12:00:00', end: '2099-12-31T12:00:00', amounts: [32.5, 65, 65, 65] }
  ];
  for (const scenario of scenarios) {
    const records: any[] = [];
    const enrollment = {
      id: 'enrollment', studentId: 'student', monthlyFee: scenario.fee,
      startDate: new Date(scenario.start), endDate: new Date(scenario.end),
      academicYear: '2025-2026', billingPeriod: scenario.billingPeriod,
      modality: scenario.modality, hasBook: false
    };
    const database = {
      academyEnrollment: { findMany: async () => [enrollment] },
      deletedPaymentRecord: { findFirst: async () => null },
      paymentStatus: {
        findFirst: async ({ where }: any) => records.find(record => Object.entries(where).every(([key, value]) => record[key] === value)) || null,
        create: async ({ data }: any) => { const record = { id: String(records.length + 1), ...data }; records.push(record); return record; },
        update: async ({ where, data }: any) => Object.assign(records.find(record => record.id === where.id), data)
      }
    };
    await ensureStudentPaymentScheduleById(database as unknown as PrismaClient, 'student');
    assert(JSON.stringify(records.map(record => record.amount)) === JSON.stringify(scenario.amounts), `${scenario.name}: actual generated amounts ${records.map(record => record.amount)}`);
    assert(records.every(record => record.isPaid === false && record.status === 'PENDING'), `${scenario.name}: alta generates debt, not received money`);
    const count = records.length;
    records[0].isPaid = true;
    records[0].amount = 17;
    await ensureStudentPaymentScheduleById(database as unknown as PrismaClient, 'student');
    assert(records.length === count && records[0].amount === 17, `${scenario.name}: repeat does not duplicate or alter paid fees`);
    if (scenario.name === 'Editable future rate') {
      records[1].isCustom = true;
      records[1].amount = 21;
      records[2].isExempt = true;
      records[2].amount = 0;
      enrollment.monthlyFee = 70;
      await ensureStudentPaymentScheduleById(database as unknown as PrismaClient, 'student');
      assert(JSON.stringify(records.map(record => record.amount)) === '[17,21,0,70]', 'Rate edit changes ordinary future fees only, preserving paid, custom and exempt amounts');
    }
  }
}

async function checkEnrollmentTransactions() {
  let student: any;
  let enrollments: any[] = [];
  let payments: any[] = [];
  let failPayments = false;
  let notificationsSent = 0;
  const reset = () => {
    student = { id: 'student', role: 'STUDENT', status: 'INACTIVE', email: 'student@example.invalid', profile: { firstName: 'Test' } };
    enrollments = [];
    payments = [];
  };
  reset();
  const database: any = {
    user: {
      findUnique: async () => ({ ...student, academyEnrollments: enrollments }),
      updateMany: async () => { if (student.status === 'ACTIVE') return { count: 0 }; student.status = 'ACTIVE'; return { count: 1 }; },
      update: async ({ data }: any) => Object.assign(student, data)
    },
    academyEnrollment: {
      create: async ({ data }: any) => { const enrollment = { id: 'enrollment', ...data }; enrollments.push(enrollment); return enrollment; },
      findMany: async () => enrollments
    },
    deletedPaymentRecord: { findFirst: async () => null },
    paymentStatus: {
      findFirst: async ({ where }: any) => payments.find(payment => Object.entries(where).every(([key, value]) => payment[key] === value)) || null,
      findUnique: async ({ where }: any) => payments.find(payment => payment.id === where.id) || null,
      update: async ({ where, data }: any) => Object.assign(payments.find(payment => payment.id === where.id), data),
      create: async ({ data }: any) => { if (failPayments) throw new Error('Simulated payment failure'); const payment = { id: String(payments.length + 1), ...data }; payments.push(payment); return payment; }
    },
    $transaction: async (operation: (transaction: any) => Promise<unknown>) => {
      const before = structuredClone({ student, enrollments, payments });
      try { return await operation(database); }
      catch (error) { ({ student, enrollments, payments } = before); throw error; }
    }
  };
  const notify = async () => { notificationsSent++; return true; };
  const app = express();
  app.use(express.json());
  app.use('/enrollments', createEnrollmentsRouter(database as PrismaClient, { welcome: notify, reactivation: async () => { await notify(); } }));
  app.use('/payments', createPaymentsRouter(database as PrismaClient));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/enrollments/enroll`;
  const token = jwt.sign({ id: 'admin', role: 'ADMIN' }, process.env.JWT_SECRET || 'secret');
  const request = (body: any) => fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    for (const billingPeriod of ['MONTHLY', 'QUARTERLY']) {
      reset();
      const body = { studentId: 'student', monthlyFee: billingPeriod === 'MONTHLY' ? 65 : 60, billingPeriod, startDate: '2099-10-01', modality: 'PRESENCIAL' };
      const response = await request(body);
      assert(response.status === 200 && student.status === 'ACTIVE' && enrollments.length === 1, `${billingPeriod}: actual HTTP signup activates and enrolls`);
      assert(payments.length === (billingPeriod === 'MONTHLY' ? 1 : 3) && payments.every(payment => payment.amount === body.monthlyFee && !payment.isPaid), `${billingPeriod}: actual HTTP signup generates the correct pending monthly amounts`);
      assert((await request(body)).status === 400 && enrollments.length === 1, `${billingPeriod}: repeated signup cannot duplicate enrollment`);
      const mark = (studentId: string, isPaid: boolean) => fetch(url.replace('/enrollments/enroll', `/payments/${studentId}`), {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: payments[0].id, isPaid })
      });
      assert((await mark('student', true)).status === 200 && payments[0].isPaid && payments[0].status === 'PAID' && payments[0].paidAt && payments[0].markedById === 'admin', `${billingPeriod}: marking paid stores status, date and administrator`);
      assert((await mark('student', false)).status === 200 && !payments[0].isPaid && payments[0].status === 'PENDING' && payments[0].paidAt === null, `${billingPeriod}: unmark restores pending and clears paid date`);
      assert((await mark('other-student', true)).status === 404 && !payments[0].isPaid, `${billingPeriod}: mismatched student/payment cannot change a different student's fee`);
      payments[0].isExempt = true;
      assert((await mark('student', true)).status === 400 && !payments[0].isPaid, `${billingPeriod}: exempt fee cannot be charged`);
    }
    reset();
    failPayments = true;
    const response = await request({ studentId: 'student', monthlyFee: 65, startDate: '2099-10-01' });
    assert(response.status === 500 && student.status === 'INACTIVE' && enrollments.length === 0 && payments.length === 0, 'Payment-generation failure rolls back activation and enrollment');
    assert(notificationsSent === 2, 'No notification is sent for failed or repeated signup');
    assert((await request({ studentId: 'student', monthlyFee: 'invalid', startDate: '2099-10-01' })).status === 400, 'Invalid amount is rejected before activation');
    assert((await request({ studentId: 'student', monthlyFee: 65, startDate: 'invalid' })).status === 400, 'Invalid date is rejected before activation');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

checkGeneratedSchedules().then(checkEnrollmentTransactions).then(() => {
console.log('\n==================================================');
console.log(`🏁 RESULTADO: ${passedTests} PRUEBAS SUPERADAS, ${failedTests} FALLOS.`);
console.log('==================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ¡Todas las reglas de negocio han sido verificadas exitosamente!');
  process.exit(0);
}
}).catch(error => { console.error(error); process.exitCode = 1; });


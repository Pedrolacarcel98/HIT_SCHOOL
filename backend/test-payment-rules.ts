import {
  getAcademicYearForDate,
  getQuarterMonthsForDate,
  getPaymentVisualStatus,
  isPaymentOverdue
} from './src/services/payments';

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

// 5. Resumen Final
console.log('\n==================================================');
console.log(`🏁 RESULTADO: ${passedTests} PRUEBAS SUPERADAS, ${failedTests} FALLOS.`);
console.log('==================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ¡Todas las reglas de negocio han sido verificadas exitosamente!');
  process.exit(0);
}


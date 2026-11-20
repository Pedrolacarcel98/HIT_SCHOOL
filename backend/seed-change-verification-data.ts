import assert from 'node:assert/strict';
import { BillingPeriod, EnrollmentStatus, Modality, PaymentState, PrismaClient, Role, UserStatus } from '@prisma/client';
import { ensureStudentPaymentScheduleById } from './src/services/payments';

const databaseUrl = process.env.DATABASE_URL || '';
const target = new URL(databaseUrl);
assert.equal(target.hostname, '127.0.0.1', 'Refusing to seed a non-local database host.');
assert.equal(target.port, '5432', 'Refusing to seed an unexpected database port.');
assert.equal(target.pathname, '/hitschool', 'Refusing to seed a database other than local hitschool.');

const prisma = new PrismaClient();
const marker = 'PRUEBA CAMBIOS 2026-11';
const identities = {
  admin: 'admin@hitschool.com',
  teacher: 'profesor@hitschool.com',
  secondTeacher: 'profesor2@hitschool.com',
  student: 'marpargut@hitschool.com',
  parent: 'marpargut@hitschool.com'
};

const requireAccount = async (email: string, role: Role) => {
  const account = await prisma.user.findFirst({ where: { email, role }, select: { id: true, email: true, role: true, status: true } });
  assert.ok(account, `Required test account not found: ${email} (${role}).`);
  assert.equal(account.status, UserStatus.ACTIVE, `Test account must already be active: ${email} (${role}).`);
  return account;
};

async function main() {
  const [admin, teacher, secondTeacher, student, parent] = await Promise.all([
    requireAccount(identities.admin, Role.ADMIN),
    requireAccount(identities.teacher, Role.TEACHER),
    requireAccount(identities.secondTeacher, Role.TEACHER),
    requireAccount(identities.student, Role.STUDENT),
    requireAccount(identities.parent, Role.PARENT)
  ]);
  assert.notEqual(student.id, parent.id, 'Student and parent share an email, not a user record.');
  const familyLink = await prisma.user.findFirst({ where: { id: student.id, parentId: parent.id }, select: { id: true } });
  assert.ok(familyLink, 'The listed student must already be linked to the listed parent.');

  const columnCheck = await prisma.$queryRaw<Array<{ termOverride: boolean; taskMode: boolean }>>`
    SELECT
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'TermGrade' AND column_name = 'gradeOverrides') AS "termOverride",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'TaskDelivery' AND column_name = 'gradeMode') AS "taskMode"
  `;
  assert.ok(columnCheck[0]?.termOverride && columnCheck[0]?.taskMode, 'Apply the additive grade SQL before seeding verification data.');

  const result = await prisma.$transaction(async transaction => {
    const courseTitle = `${marker} · Clase presencial`;
    let course = await transaction.course.findFirst({ where: { title: courseTitle, teacherId: teacher.id } });
    if (!course) {
      course = await transaction.course.create({ data: { title: courseTitle, teacherId: teacher.id, modality: Modality.PRESENCIAL } });
    }
    await transaction.enrollment.upsert({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
      create: { studentId: student.id, courseId: course.id },
      update: {}
    });

    const ensureTask = async (title: string, grade: number, mode: 'MANUAL' | 'AUTO', category: 'WRITING' | 'GRAMMAR_VOCABULARY') => {
      let task = await transaction.structuredTask.findFirst({ where: { title, courseId: course.id }, include: { steps: true } });
      if (!task) {
        task = await transaction.structuredTask.create({
          data: {
            title, courseId: course.id, teacherId: teacher.id, term: 1, category,
            description: `${marker}: datos preparados para probar la nota del paso y la nota global ${mode}.`,
            steps: { create: [{ order: 1, title: `${title} · Paso 1`, requiresSubmission: true }] }
          },
          include: { steps: true }
        });
      }
      const step = task.steps[0];
      assert.ok(step, `Expected one step for ${title}.`);
      let assignment = await transaction.assignment.findUnique({ where: { structuredTaskStepId: step.id } });
      if (!assignment) {
        assignment = await transaction.assignment.create({
          data: {
            teacherId: teacher.id, courseId: course.id, structuredTaskStepId: step.id,
            title: `${title} · Entrega`, description: marker, category
          }
        });
      }
      await transaction.submission.upsert({
        where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
        create: { assignmentId: assignment.id, studentId: student.id, structuredTaskId: task.id, grade: grade === 7.5 ? 8.5 : 6, content: `${marker}: entrega de prueba.` },
        update: {}
      });
      await transaction.taskDelivery.upsert({
        where: { taskId_studentId: { taskId: task.id, studentId: student.id } },
        create: { taskId: task.id, studentId: student.id, grade, gradeMode: mode, status: 'GRADED', feedback: `${marker}: evaluación ${mode}.` },
        update: {}
      });
      return task;
    };

    const manualTask = await ensureTask(`${marker} · Tarea presencial MANUAL`, 7.5, 'MANUAL', 'WRITING');
    const automaticTask = await ensureTask(`${marker} · Tarea AUTO`, 6, 'AUTO', 'GRAMMAR_VOCABULARY');

    const gradeKey = { studentId: student.id, courseId: course.id, term: 1, academicYear: '2025-2026' };
    const existingGrade = await transaction.termGrade.findUnique({ where: { studentId_courseId_term_academicYear: gradeKey } });
    if (!existingGrade) {
      await transaction.termGrade.create({
        data: {
          ...gradeKey,
          middleGrammar: 8, middleReading: 8, middleWriting: 8, middleListening: 8, middleSpeaking: 8,
          finalGrammar: 9, finalReading: 9, finalWriting: 9, finalListening: 9, finalSpeaking: 9,
          middleExamGrade: 8, finalExamGrade: 9,
          tasksAverage: 6.75, overallGrade: 8.13,
          grammar: 7, reading: 8, writing: 7.5, listening: 8, speaking: 8,
          gradeOverrides: { tasksAverage: 7.25 },
          observations: `${marker}: puedes editar la media manual de tareas y volver a automática. Usa curso 2025-2026, trimestre 1.`
        }
      });
    }

    const enrollmentStart = new Date('2026-10-01T12:00:00.000Z');
    let academyEnrollment = await transaction.academyEnrollment.findFirst({
      where: { studentId: student.id, academicYear: '2026-2027', startDate: enrollmentStart, billingPeriod: BillingPeriod.MONTHLY }
    });
    if (!academyEnrollment) {
      academyEnrollment = await transaction.academyEnrollment.create({
        data: {
          studentId: student.id, academicYear: '2026-2027', startDate: enrollmentStart,
          endDate: new Date('2026-12-31T12:00:00.000Z'), monthlyFee: 65,
          billingPeriod: BillingPeriod.MONTHLY, modality: Modality.PRESENCIAL,
          status: EnrollmentStatus.ACTIVE, hasBook: false
        }
      });
    } else if (academyEnrollment.endDate?.toISOString() !== '2026-12-31T12:00:00.000Z') {
      academyEnrollment = await transaction.academyEnrollment.update({
        where: { id: academyEnrollment.id },
        data: { endDate: new Date('2026-12-31T12:00:00.000Z') }
      });
    }

    const quarterlyStart = new Date('2027-10-01T12:00:00.000Z');
    let quarterlyEnrollment = await transaction.academyEnrollment.findFirst({
      where: { studentId: student.id, academicYear: '2027-2028', startDate: quarterlyStart, billingPeriod: BillingPeriod.QUARTERLY }
    });
    if (!quarterlyEnrollment) {
      quarterlyEnrollment = await transaction.academyEnrollment.create({
        data: {
          studentId: student.id, academicYear: '2027-2028', startDate: quarterlyStart,
          endDate: new Date('2027-12-31T12:00:00.000Z'), monthlyFee: 60,
          billingPeriod: BillingPeriod.QUARTERLY, modality: Modality.PRESENCIAL,
          status: EnrollmentStatus.ACTIVE, hasBook: false
        }
      });
    }
    return { course, manualTask, automaticTask, academyEnrollment, quarterlyEnrollment };
  });

  await ensureStudentPaymentScheduleById(prisma, student.id);

  const chatSeeds = [
    { senderId: teacher.id, recipientId: student.id, studentId: student.id, content: `${marker}: nuevo mensaje del profesor al alumno.` },
    { senderId: student.id, recipientId: teacher.id, studentId: student.id, content: `${marker}: respuesta del alumno al profesor.` },
    { senderId: student.id, recipientId: admin.id, studentId: student.id, content: `${marker}: mensaje del alumno a administración.` },
    { senderId: teacher.id, recipientId: parent.id, studentId: student.id, content: `${marker}: conversación del tutor sobre el alumno.` },
    { senderId: admin.id, recipientId: parent.id, studentId: student.id, content: `${marker}: conversación de administración sobre el alumno.` },
    { senderId: secondTeacher.id, recipientId: parent.id, studentId: student.id, content: `${marker}: verificación de chat por contexto familiar.` },
    { senderId: parent.id, recipientId: admin.id, studentId: student.id, content: `${marker}: mensaje del tutor a administración.` }
  ];
  for (const data of chatSeeds) {
    const existing = await prisma.chatMessage.findFirst({ where: { senderId: data.senderId, recipientId: data.recipientId, studentId: data.studentId, content: data.content }, select: { id: true } });
    if (!existing) await prisma.chatMessage.create({ data });
  }

  const payments = await prisma.paymentStatus.findMany({
    where: { studentId: student.id, academicYear: { in: ['2026-2027', '2027-2028'] }, concept: 'Cuota mensual' },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
    select: { academicYear: true, month: true, year: true, amount: true, status: true, isPaid: true }
  });
  const seededMessages = await prisma.chatMessage.count({ where: { content: { startsWith: marker }, readAt: null } });
  const logins = await prisma.user.findMany({
    where: { id: { in: [admin.id, teacher.id, secondTeacher.id, student.id, parent.id] } },
    select: { email: true, role: true, status: true }
  });
  assert.equal(logins.length, 5);
  assert.ok(logins.every(user => user.status === UserStatus.ACTIVE));

  console.log(JSON.stringify({
    marker,
    accountsVerifiedOnly: logins.map(({ email, role, status }) => ({ email, role, status })),
    course: { id: result.course.id, title: result.course.title, modality: result.course.modality },
    termGrade: { courseId: result.course.id, term: 1, academicYear: '2025-2026', middle: 8, final: 9, tasksOverride: 7.25 },
    tasks: [
      { title: result.manualTask.title, mode: 'MANUAL', grade: 7.5, stepGrade: 8.5 },
      { title: result.automaticTask.title, mode: 'AUTO', grade: 6, stepGrade: 6 }
    ],
    billingExamples: [
      { period: 'MONTHLY', academicYear: '2026-2027', monthlyFee: 65, enrollmentId: result.academyEnrollment.id },
      { period: 'QUARTERLY', academicYear: '2027-2028', monthlyFee: 60, enrollmentId: result.quarterlyEnrollment.id }
    ],
    paymentSchedule: payments,
    unreadDemoMessages: seededMessages,
    credentialsModifiedBySeed: false
  }, null, 2));
}

main()
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
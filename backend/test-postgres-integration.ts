import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import express from 'express';
import jwt from 'jsonwebtoken';
import { BillingPeriod, Modality, PrismaClient, Role, UserStatus } from '@prisma/client';
import { authenticateToken, requireTeacher } from './src/middleware/auth';
import { createAssignmentsRouter } from './src/routes/assignments';
import { createChatRouter } from './src/routes/chat';
import { createEnrollmentsRouter } from './src/routes/enrollments';
import { createPaymentsRouter } from './src/routes/payments';
import { createTaskDeliveryGradingHandler } from './src/routes/structuredTasks';
import { createTermGradesRouter } from './src/routes/termGrades';

const databaseUrl = process.env.DATABASE_URL || '';
if (!databaseUrl.includes('127.0.0.1:57306/hitschool_test')) {
  throw new Error('Safety check: this integration test only accepts the disposable PostgreSQL test database.');
}

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use('/api/term-grades', createTermGradesRouter(prisma));
app.use('/api/assignments', createAssignmentsRouter(prisma));
app.use('/api/chat', createChatRouter(prisma));
app.use('/api/enrollments', createEnrollmentsRouter(prisma, {
  welcome: async () => true,
  reactivation: async () => undefined
}));
app.use('/api/payments', createPaymentsRouter(prisma));
app.post('/api/structured-tasks/:id/grade-delivery', authenticateToken, requireTeacher, createTaskDeliveryGradingHandler(prisma));

const server = app.listen(0, '127.0.0.1');
const jwtSecret = process.env.JWT_SECRET || 'temporary-postgres-integration-secret';
let baseUrl = '';
const tokenFor = (id: string, role: Role, email: string) => jwt.sign({ id, role, email }, jwtSecret);
const request = async (token: string, path: string, method = 'GET', body?: unknown) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
};
const pass = (name: string) => console.log(`PASS PostgreSQL: ${name}`);

async function createUser(role: Role, email: string, status: UserStatus = UserStatus.ACTIVE, parentId?: string) {
  return prisma.user.create({
    data: {
      role, email, status, passwordHash: 'integration-test-hash',
      ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
      profile: { create: { firstName: role, lastName: 'Integration' } }
    },
    include: { profile: true }
  });
}

async function main() {
  await new Promise<void>(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const marker = `pg-test-${Date.now()}`;
  const admin = await createUser(Role.ADMIN, `${marker}-admin@example.invalid`);
  const teacher = await createUser(Role.TEACHER, `${marker}-teacher@example.invalid`);
  const parent = await createUser(Role.PARENT, `${marker}-parent@example.invalid`);
  const student = await createUser(Role.STUDENT, `${marker}-student@example.invalid`, UserStatus.ACTIVE, parent.id);
  const sibling = await createUser(Role.STUDENT, `${marker}-sibling@example.invalid`, UserStatus.ACTIVE, parent.id);
  const otherStudent = await createUser(Role.STUDENT, `${marker}-other@example.invalid`);
  const adminToken = tokenFor(admin.id, Role.ADMIN, admin.email);
  const teacherToken = tokenFor(teacher.id, Role.TEACHER, teacher.email);
  const parentToken = tokenFor(parent.id, Role.PARENT, parent.email);
  const studentToken = tokenFor(student.id, Role.STUDENT, student.email);
  const course = await prisma.course.create({ data: { title: `${marker}-course`, teacherId: teacher.id, modality: Modality.PRESENCIAL } });
  await prisma.enrollment.create({ data: { studentId: student.id, courseId: course.id } });

  const competencies = {
    middleGrammar: 0, middleReading: 6, middleWriting: 7, middleListening: 8, middleSpeaking: 9,
    finalGrammar: 10, finalReading: 9, finalWriting: 8, finalListening: 7, finalSpeaking: 6
  };
  const gradePath = `/term-grades/course/${course.id}`;
  const saved = await request(teacherToken, gradePath, 'PUT', {
    studentId: student.id, term: 1, academicYear: '2025-2026', ...competencies,
    gradeOverrides: { tasksAverage: 7.25, overallGrade: 0 }
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.overallGrade, 0);
  assert.equal(saved.data.tasksAverage, 7.25);
  const matrix = await request(teacherToken, `${gradePath}?term=1&academicYear=2025-2026`);
  const record = matrix.data.students.find((row: any) => row.studentId === student.id);
  assert.equal(record.middleGrammar, 0);
  assert.equal(record.overallGrade, 0);
  assert.equal(record.tasksAverage, 7.25);
  const studentGrades = await request(studentToken, `/term-grades/student/me?courseId=${course.id}&academicYear=2025-2026`);
  assert.equal(studentGrades.data.terms[1].middleGrammar, 0);
  assert.equal(studentGrades.data.terms[1].overallGrade, 0);
  const feedbackOnly = await request(teacherToken, gradePath, 'PUT', {
    studentId: student.id, term: 1, academicYear: '2025-2026', observations: 'PostgreSQL persistence check'
  });
  assert.equal(feedbackOnly.status, 200);
  const persistedGrade = await prisma.termGrade.findUnique({
    where: { studentId_courseId_term_academicYear: { studentId: student.id, courseId: course.id, term: 1, academicYear: '2025-2026' } }
  });
  assert.equal(persistedGrade?.middleGrammar, 0);
  assert.equal(persistedGrade?.gradeOverrides && (persistedGrade.gradeOverrides as any).overallGrade, 0);
  pass('TermGrade PUT/GET and feedback-only save persist competencies and manual zero across a real PostgreSQL connection');

  const resetTermOverrides = await request(teacherToken, gradePath, 'PUT', {
    studentId: student.id, term: 1, academicYear: '2025-2026', gradeOverrides: { tasksAverage: null, overallGrade: null }
  });
  assert.equal(resetTermOverrides.status, 200);

  const task = await prisma.structuredTask.create({
    data: {
      title: `${marker}-task`, courseId: course.id, teacherId: teacher.id, term: 1,
      steps: { create: [{ order: 1, title: 'Integration step', requiresSubmission: true }] }
    },
    include: { steps: true }
  });
  const step = task.steps[0];
  const assignment = await prisma.assignment.create({
    data: { title: 'Integration assignment', teacherId: teacher.id, courseId: course.id, structuredTaskStepId: step.id }
  });
  await prisma.submission.create({ data: { assignmentId: assignment.id, studentId: student.id, structuredTaskId: task.id, grade: 8, content: 'done' } });
  const taskPath = `/structured-tasks/${task.id}/grade-delivery`;
  const manualTask = await request(teacherToken, taskPath, 'POST', {
    studentId: student.id, grade: 0, gradeMode: 'MANUAL', stepEvaluations: [{ stepId: step.id, grade: 8 }]
  });
  assert.equal(manualTask.status, 200);
  assert.equal(manualTask.data.delivery.grade, 0);
  assert.equal(manualTask.data.delivery.gradeMode, 'MANUAL');
  let taskGrades = await request(teacherToken, `${gradePath}?term=1&academicYear=2025-2026`);
  let taskRecord = taskGrades.data.students.find((row: any) => row.studentId === student.id);
  assert.equal(taskRecord.tasksAverage, 0);
  const autoTask = await request(teacherToken, taskPath, 'POST', {
    studentId: student.id, gradeMode: 'AUTO', stepEvaluations: [{ stepId: step.id, grade: 8 }]
  });
  assert.equal(autoTask.status, 200);
  assert.equal(autoTask.data.delivery.grade, 8);
  assert.equal(autoTask.data.delivery.gradeMode, 'AUTO');
  taskGrades = await request(teacherToken, `${gradePath}?term=1&academicYear=2025-2026`);
  taskRecord = taskGrades.data.students.find((row: any) => row.studentId === student.id);
  assert.equal(taskRecord.tasksAverage, 8);
  pass('TaskDelivery MANUAL zero persists, then AUTO follows the saved step grade in PostgreSQL');

  const parentToAdmin = await request(parentToken, '/chat', 'POST', {
    recipientId: admin.id, studentId: student.id, content: 'First child context'
  });
  const parentToAdminSibling = await request(parentToken, '/chat', 'POST', {
    recipientId: admin.id, studentId: sibling.id, content: 'Second child context'
  });
  assert.equal(parentToAdmin.status, 201);
  assert.equal(parentToAdminSibling.status, 201);
  const parentHistory = await request(parentToken, `/chat?partnerId=${admin.id}&studentId=${student.id}`);
  assert.equal(parentHistory.status, 200);
  assert.deepEqual(parentHistory.data.map((message: any) => message.id), [parentToAdmin.data.id]);
  const unreadSibling = await prisma.chatMessage.findUnique({ where: { id: parentToAdminSibling.data.id } });
  const readOne = await request(adminToken, '/chat/read', 'POST', {
    partnerId: parent.id, studentId: student.id, messageIds: [parentToAdmin.data.id]
  });
  assert.equal(readOne.status, 200);
  assert.equal(readOne.data.unreadCount, 0);
  assert.equal((await prisma.chatMessage.findUnique({ where: { id: parentToAdmin.data.id } }))?.readAt instanceof Date, true);
  assert.equal((await prisma.chatMessage.findUnique({ where: { id: unreadSibling!.id } }))?.readAt, null);
  pass('ChatMessage readAt persists and tutor/admin histories and reads remain separated by child');

  const payment = await prisma.paymentStatus.create({
    data: { studentId: student.id, academicYear: '2025-2026', month: 11, year: 2026, amount: 65, dueDate: new Date('2026-11-10T12:00:00Z') }
  });
  const marked = await request(adminToken, `/payments/${student.id}`, 'PUT', { paymentId: payment.id, isPaid: true });
  assert.equal(marked.status, 200);
  assert.equal(marked.data.payment.status, 'PAID');
  assert.ok(marked.data.payment.paidAt);
  assert.equal(marked.data.payment.markedById, admin.id);
  const crossStudent = await request(adminToken, `/payments/${otherStudent.id}`, 'PUT', { paymentId: payment.id, isPaid: false });
  assert.equal(crossStudent.status, 404);
  const unmarked = await request(adminToken, `/payments/${student.id}`, 'PUT', { paymentId: payment.id, isPaid: false });
  assert.equal(unmarked.status, 200);
  assert.equal(unmarked.data.payment.status, 'PENDING');
  assert.equal(unmarked.data.payment.paidAt, null);
  pass('PaymentStatus marks/unmarks against PostgreSQL and rejects a payment ID belonging to another student');

  for (const [period, fee, expectedMonths] of [
    [BillingPeriod.MONTHLY, 65, 1], [BillingPeriod.QUARTERLY, 60, 3]
  ] as const) {
    const inactiveStudent = await createUser(Role.STUDENT, `${marker}-${period.toLowerCase()}@example.invalid`, UserStatus.INACTIVE);
    const response = await request(adminToken, '/enrollments/enroll', 'POST', {
      studentId: inactiveStudent.id,
      monthlyFee: fee,
      billingPeriod: period,
      modality: Modality.PRESENCIAL,
      academicYear: '2099-2100',
      startDate: '2099-10-01T12:00:00.000Z'
    });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    const generated = await prisma.paymentStatus.findMany({ where: { studentId: inactiveStudent.id }, orderBy: { month: 'asc' } });
    assert.equal(generated.length, expectedMonths);
    assert.ok(generated.every(item => item.amount === fee && !item.isPaid && item.status === 'PENDING'));
    const state = await prisma.user.findUnique({ where: { id: inactiveStudent.id } });
    assert.equal(state?.status, 'ACTIVE');
    const duplicate = await request(adminToken, '/enrollments/enroll', 'POST', {
      studentId: inactiveStudent.id, monthlyFee: fee, billingPeriod: period, modality: Modality.PRESENCIAL,
      academicYear: '2099-2100', startDate: '2099-10-01T12:00:00.000Z'
    });
    assert.equal(duplicate.status, 400);
  }
  assert.equal(await prisma.academyEnrollment.count({ where: { academicYear: '2099-2100' } }), 2);
  pass('Monthly 65 and quarterly 60/month enrollments generate real pending monthly rows; duplicate signup is rejected');
}

main()
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(async () => {
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
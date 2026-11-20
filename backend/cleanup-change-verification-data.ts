import assert from 'node:assert/strict';
import { PrismaClient, Role } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL || '';
const target = new URL(databaseUrl);
assert.equal(target.hostname, '127.0.0.1', 'Refusing to clean a non-local database host.');
assert.equal(target.port, '5432', 'Refusing to clean an unexpected database port.');
assert.equal(target.pathname, '/hitschool', 'Refusing to clean a database other than local hitschool.');

const prisma = new PrismaClient();
const marker = 'PRUEBA CAMBIOS 2026-11';

async function main() {
  const student = await prisma.user.findFirst({ where: { email: 'marpargut@hitschool.com', role: Role.STUDENT }, select: { id: true } });
  const teacher = await prisma.user.findFirst({ where: { email: 'profesor@hitschool.com', role: Role.TEACHER }, select: { id: true } });
  if (!student || !teacher) throw new Error('Expected demo accounts were not found; no records were removed.');

  const result = await prisma.$transaction(async transaction => {
    const course = await transaction.course.findFirst({
      where: { title: `${marker} · Clase presencial`, teacherId: teacher.id },
      select: { id: true }
    });
    const academyEnrollments = await transaction.academyEnrollment.findMany({
      where: {
        studentId: student.id,
        OR: [
          { academicYear: '2026-2027', startDate: new Date('2026-10-01T12:00:00.000Z') },
          { academicYear: '2027-2028', startDate: new Date('2027-10-01T12:00:00.000Z') }
        ]
      },
      select: { id: true }
    });
    const chat = await transaction.chatMessage.deleteMany({ where: { content: { startsWith: marker } } });
    let paymentCount = 0;
    for (const academyEnrollment of academyEnrollments) {
      const payments = await transaction.paymentStatus.deleteMany({ where: { enrollmentId: academyEnrollment.id } });
      paymentCount += payments.count;
      await transaction.academyEnrollment.delete({ where: { id: academyEnrollment.id } });
    }
    if (course) await transaction.course.delete({ where: { id: course.id } });
    return { course: course ? 1 : 0, enrollments: academyEnrollments.length, payments: paymentCount, messages: chat.count };
  });

  console.log(JSON.stringify({ marker, removedDemoRows: result, loginAccountsModified: false }, null, 2));
}

main()
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
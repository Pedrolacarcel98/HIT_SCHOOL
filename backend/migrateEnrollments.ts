import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando migración de matrículas...');
  
  // Buscar a todos los alumnos que tengan courseStartDate y monthlyFee
  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      courseStartDate: { not: null },
      monthlyFee: { not: null }
    }
  });

  console.log(`Encontrados ${students.length} alumnos para migrar.`);

  for (const student of students) {
    if (!student.courseStartDate || student.monthlyFee === null) continue;

    // Crear AcademyEnrollment activo
    const enrollment = await prisma.academyEnrollment.create({
      data: {
        studentId: student.id,
        startDate: student.courseStartDate,
        monthlyFee: student.monthlyFee
      }
    });

    // Actualizar estado del usuario a ACTIVE
    await prisma.user.update({
      where: { id: student.id },
      data: { status: 'ACTIVE' }
    });

    // Vincular todos sus pagos a este enrollment
    await prisma.paymentStatus.updateMany({
      where: { studentId: student.id },
      data: { enrollmentId: enrollment.id }
    });

    console.log(`Migrado alumno ${student.email} -> Enrollment ${enrollment.id}`);
  }

  console.log('Migración completada con éxito.');
}

main()
  .catch(e => {
    console.error('Error durante la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

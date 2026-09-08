import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAlex() {
  const alex = await prisma.user.findUnique({
    where: { email: 'alumno.independiente@hitschool.com' },
    include: {
      profile: true,
      academyEnrollments: true,
      enrollments: true
    }
  });

  if (!alex) {
    console.error('No se encontró al alumno Álex.');
    return;
  }

  const alexId = alex.id;
  console.log('Resetting data for Alex (ID:', alexId, ')...');

  // 1. Eliminar todas las entregas / exámenes completados
  const deletedSubmissions = await prisma.submission.deleteMany({
    where: { studentId: alexId }
  });
  console.log('✔ Submissions eliminadas:', deletedSubmissions.count);

  // 2. Eliminar evaluación final por competencias y observaciones
  const deletedEvaluation = await prisma.finalEvaluation.deleteMany({
    where: { studentId: alexId }
  });
  console.log('✔ Evaluaciones eliminadas:', deletedEvaluation.count);

  // 3. Eliminar progreso en tareas estructuradas
  const deletedStepProgress = await prisma.structuredTaskStepProgress.deleteMany({
    where: { studentId: alexId }
  });
  console.log('✔ Progreso en pasos de tareas estructuradas eliminado:', deletedStepProgress.count);

  // 4. Eliminar asignaciones de tareas estructuradas a Álex
  const deletedStructuredAssignments = await prisma.structuredTaskStudent.deleteMany({
    where: { studentId: alexId }
  });
  console.log('✔ Asignaciones de tareas estructuradas eliminadas:', deletedStructuredAssignments.count);

  // 5. Eliminar asignaciones de material directo
  const deletedMaterialAssignments = await prisma.materialAssignment.deleteMany({
    where: { studentId: alexId }
  });
  console.log('✔ Asignaciones directas de material eliminadas:', deletedMaterialAssignments.count);

  // 6. Eliminar tareas individuales creadas específicamente para Álex
  const deletedIndividualAssignments = await prisma.assignment.deleteMany({
    where: { studentId: alexId }
  });
  console.log('✔ Tareas individuales eliminadas:', deletedIndividualAssignments.count);

  // 8. Eliminar mensajes de chat / comentarios relacionados con Álex
  const deletedChatMessages = await prisma.chatMessage.deleteMany({
    where: {
      OR: [
        { senderId: alexId },
        { recipientId: alexId },
        { studentId: alexId }
      ]
    }
  });
  console.log('✔ Mensajes de chat eliminados:', deletedChatMessages.count);

  // 9. Cursos: desvincular de B2 (que tiene las tareas y exámenes de Mateo) y mantenerlo matriculado en C1 (limpio, sin tareas)
  const courseB2 = await prisma.course.findFirst({
    where: { title: { contains: 'B2' } }
  });
  if (courseB2) {
    await prisma.enrollment.deleteMany({
      where: {
        studentId: alexId,
        courseId: courseB2.id
      }
    });
    console.log('✔ Desmatriculado de B2 para que no tenga tareas pendientes heredadas.');
  }

  const courseC1 = await prisma.course.findFirst({
    where: { title: { contains: 'C1' } }
  });
  if (courseC1) {
    await prisma.enrollment.upsert({
      where: {
        studentId_courseId: {
          studentId: alexId,
          courseId: courseC1.id
        }
      },
      update: {},
      create: {
        studentId: alexId,
        courseId: courseC1.id
      }
    });
    console.log('✔ Confirmada matrícula en C1 (curso limpio con Profesor Carlos).');
  }

  // 10. Matrícula de Academia (AcademyEnrollment) y cuotas:
  // Dejar como recién matriculado este mes (Septiembre 2026, 65€/mes)
  let academyEnrollment = await prisma.academyEnrollment.findFirst({
    where: { studentId: alexId }
  });
  const currentMonthStart = new Date('2026-09-01T10:00:00.000Z');
  if (academyEnrollment) {
    academyEnrollment = await prisma.academyEnrollment.update({
      where: { id: academyEnrollment.id },
      data: {
        startDate: currentMonthStart,
        monthlyFee: 65,
        endDate: null
      }
    });
  } else {
    academyEnrollment = await prisma.academyEnrollment.create({
      data: {
        studentId: alexId,
        startDate: currentMonthStart,
        monthlyFee: 65
      }
    });
  }

  // Eliminar cuotas anteriores (Abril a Agosto) y dejar únicamente la cuota del mes actual
  await prisma.paymentStatus.deleteMany({
    where: { studentId: alexId }
  });

  await prisma.paymentStatus.create({
    data: {
      studentId: alexId,
      enrollmentId: academyEnrollment.id,
      month: 9,
      year: 2026,
      amount: 65,
      isPaid: false,
      status: 'PENDING',
      dueDate: new Date('2026-09-05T12:00:00.000Z')
    }
  });
  console.log('✔ Matrícula de academia reseteada a Septiembre 2026 (65€/mes) con cuota del mes pendiente.');

  // 11. Limpiar nombre para que se vea como alumno real
  await prisma.profile.updateMany({
    where: { userId: alexId },
    data: {
      firstName: 'Álex',
      lastName: 'Ruiz'
    }
  });
  console.log('✔ Perfil actualizado a: Álex Ruiz');

  console.log('\n🎉 ¡ÁLEX HA SIDO RESETEADO CON ÉXITO COMO ALUMNO RECIÉN MATRICULADO!');
}

resetAlex()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

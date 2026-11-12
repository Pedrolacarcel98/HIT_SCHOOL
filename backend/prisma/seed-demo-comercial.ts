import { PrismaClient, Level, MaterialType, SkillCategory, Role, UserStatus, Modality, PaymentState, BillingPeriod } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedDemoComercial() {
  console.log('--- Iniciando Seed Demo Comercial HitSchool ---');

  // 1. Limpieza ordenada respetando claves foráneas
  console.log('1. Limpiando datos previos...');
  await prisma.$transaction([
    prisma.structuredTaskStepProgress.deleteMany(),
    prisma.taskDelivery.deleteMany(),
    prisma.structuredTaskStudent.deleteMany(),
    prisma.submission.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.structuredTaskStep.deleteMany(),
    prisma.structuredTask.deleteMany(),
    prisma.termGrade.deleteMany(),
    prisma.materialAssignment.deleteMany(),
    prisma.paymentStatus.deleteMany(),
    prisma.academyEnrollment.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.courseTeacher.deleteMany(),
    prisma.post.deleteMany(),
    prisma.material.deleteMany(),
    prisma.course.deleteMany(),
    prisma.finalEvaluation.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.user.deleteMany()
  ]);

  // Contraseña unificada para la demo: Demo1234!
  const defaultPassword = await bcrypt.hash('Demo1234!', 10);

  // 2. Usuarios Principales
  console.log('2. Creando roles principales de demo...');
  
  // Dirección / Admin: Marta Pardo
  const admin = await prisma.user.create({
    data: {
      email: 'admin@hitschool.es',
      passwordHash: defaultPassword,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          firstName: 'Marta',
          lastName: 'Pardo (Dirección)',
          phone: '+34 611 22 33 44',
          dni: '30236969L',
          address: 'Calle Sierpes 45, 41004 Sevilla'
        }
      }
    }
  });

  // Profesor Titular: David Miller
  const teacherDavid = await prisma.user.create({
    data: {
      email: 'profesor@hitschool.es',
      passwordHash: defaultPassword,
      role: Role.TEACHER,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          firstName: 'David',
          lastName: 'Miller',
          phone: '+34 622 33 44 55',
          dni: 'X8923412P'
        }
      }
    }
  });

  // Profesora Infantil (Kids 3)
  const teacherMarta = await prisma.user.create({
    data: {
      email: 'marta.ruiz@hitschool.es',
      passwordHash: defaultPassword,
      role: Role.TEACHER,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          firstName: 'Marta',
          lastName: 'Ruiz Morales',
          phone: '+34 633 44 55 66'
        }
      }
    }
  });

  // Tutora Multihijo (Carmen García)
  const parentCarmen = await prisma.user.create({
    data: {
      email: 'tutor@hitschool.es',
      passwordHash: defaultPassword,
      role: Role.PARENT,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          firstName: 'Carmen',
          lastName: 'García Pérez',
          phone: '+34 655 88 99 00',
          dni: '28934125B',
          address: 'Avda. San Francisco Javier 12, 41005 Sevilla'
        }
      }
    }
  });

  // Hijo 1: Lucas García (B2 First)
  const studentLucas = await prisma.user.create({
    data: {
      email: 'alumno@hitschool.es',
      passwordHash: defaultPassword,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      parentId: parentCarmen.id,
      modality: Modality.PRESENCIAL,
      profile: {
        create: {
          firstName: 'Lucas',
          lastName: 'García Pérez',
          birthDate: new Date('2008-05-14'),
          dni: '28934126N'
        }
      }
    }
  });

  // Hija 2: Sofía García (Kids 3 Movers)
  const studentSofia = await prisma.user.create({
    data: {
      email: 'sofia.garcia@hitschool.es',
      passwordHash: defaultPassword,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      parentId: parentCarmen.id,
      modality: Modality.PRESENCIAL,
      profile: {
        create: {
          firstName: 'Sofía',
          lastName: 'García Pérez',
          birthDate: new Date('2015-11-20')
        }
      }
    }
  });

  // Alumnos adicionales en B2 para que la clase se vea llena y creíble
  const extraStudentsData = [
    { firstName: 'Alejandro', lastName: 'Romero Vega', email: 'alejandro.romero@hitschool.es' },
    { firstName: 'Paula', lastName: 'Navarro Silva', email: 'paula.navarro@hitschool.es' },
    { firstName: 'Marcos', lastName: 'Delgado Castillo', email: 'marcos.delgado@hitschool.es' },
    { firstName: 'Elena', lastName: 'Benítez Cruz', email: 'elena.benitez@hitschool.es' }
  ];

  const extraStudents = [];
  for (const s of extraStudentsData) {
    const created = await prisma.user.create({
      data: {
        email: s.email,
        passwordHash: defaultPassword,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        profile: { create: { firstName: s.firstName, lastName: s.lastName } }
      }
    });
    extraStudents.push(created);
  }

  // 3. Cursos Oficiales (Title)
  console.log('3. Creando cursos oficiales...');
  const courseB2 = await prisma.course.create({
    data: {
      title: 'B2 First Certificate (FCE) - Cambridge',
      modality: Modality.PRESENCIAL,
      teacherId: teacherDavid.id
    }
  });

  const courseKids = await prisma.course.create({
    data: {
      title: 'Kids 3 (Movers) - Primaria',
      modality: Modality.PRESENCIAL,
      teacherId: teacherMarta.id
    }
  });

  const courseC1 = await prisma.course.create({
    data: {
      title: 'C1 Advanced (CAE) - Intensivo',
      modality: Modality.PRESENCIAL,
      teacherId: teacherDavid.id
    }
  });

  // 4. Matrículas de Clases (Enrollment: studentId + courseId)
  console.log('4. Asignando alumnos a clases...');
  await prisma.enrollment.create({ data: { courseId: courseB2.id, studentId: studentLucas.id } });
  for (const s of extraStudents) {
    await prisma.enrollment.create({ data: { courseId: courseB2.id, studentId: s.id } });
  }
  await prisma.enrollment.create({ data: { courseId: courseKids.id, studentId: studentSofia.id } });

  // 5. Altas Académicas y Cuotas de Facturación
  console.log('5. Generando altas académicas y calendario de pagos...');
  
  // Alta Lucas (75 €/mes)
  const enrollmentLucas = await prisma.academyEnrollment.create({
    data: {
      studentId: studentLucas.id,
      monthlyFee: 75,
      billingPeriod: BillingPeriod.MONTHLY,
      startDate: new Date('2026-09-01')
    }
  });

  // Alta Sofía (65 €/mes)
  const enrollmentSofia = await prisma.academyEnrollment.create({
    data: {
      studentId: studentSofia.id,
      monthlyFee: 65,
      billingPeriod: BillingPeriod.MONTHLY,
      startDate: new Date('2026-09-01')
    }
  });

  // Pagos de Lucas: Septiembre y Octubre PAGADOS (para descargar factura), Noviembre PENDIENTE
  await prisma.paymentStatus.create({
    data: {
      studentId: studentLucas.id,
      enrollmentId: enrollmentLucas.id,
      month: 9,
      year: 2026,
      amount: 75,
      status: PaymentState.PAID,
      isPaid: true,
      paidAt: new Date('2026-09-04T10:30:00Z'),
      dueDate: new Date('2026-09-05T00:00:00Z'),
      markedById: admin.id
    }
  });

  await prisma.paymentStatus.create({
    data: {
      studentId: studentLucas.id,
      enrollmentId: enrollmentLucas.id,
      month: 10,
      year: 2026,
      amount: 75,
      status: PaymentState.PAID,
      isPaid: true,
      paidAt: new Date('2026-10-03T11:15:00Z'),
      dueDate: new Date('2026-10-05T00:00:00Z'),
      markedById: admin.id
    }
  });

  await prisma.paymentStatus.create({
    data: {
      studentId: studentLucas.id,
      enrollmentId: enrollmentLucas.id,
      month: 11,
      year: 2026,
      amount: 75,
      status: PaymentState.PENDING,
      isPaid: false,
      dueDate: new Date('2026-11-05T00:00:00Z')
    }
  });

  // Pagos de Sofía: Septiembre y Octubre PAGADOS, Noviembre PENDIENTE
  await prisma.paymentStatus.create({
    data: {
      studentId: studentSofia.id,
      enrollmentId: enrollmentSofia.id,
      month: 9,
      year: 2026,
      amount: 65,
      status: PaymentState.PAID,
      isPaid: true,
      paidAt: new Date('2026-09-04T10:30:00Z'),
      dueDate: new Date('2026-09-05T00:00:00Z'),
      markedById: admin.id
    }
  });

  await prisma.paymentStatus.create({
    data: {
      studentId: studentSofia.id,
      enrollmentId: enrollmentSofia.id,
      month: 10,
      year: 2026,
      amount: 65,
      status: PaymentState.PAID,
      isPaid: true,
      paidAt: new Date('2026-10-03T11:15:00Z'),
      dueDate: new Date('2026-10-05T00:00:00Z'),
      markedById: admin.id
    }
  });

  // Pagos de los demás alumnos para rellenar la tabla de Dirección
  for (const s of extraStudents) {
    const enroll = await prisma.academyEnrollment.create({
      data: {
        studentId: s.id,
        monthlyFee: 75,
        billingPeriod: BillingPeriod.MONTHLY,
        startDate: new Date('2026-09-01')
      }
    });

    await prisma.paymentStatus.create({
      data: {
        studentId: s.id,
        enrollmentId: enroll.id,
        month: 10,
        year: 2026,
        amount: 75,
        status: PaymentState.PAID,
        isPaid: true,
        paidAt: new Date('2026-10-02T09:00:00Z'),
        dueDate: new Date('2026-10-05T00:00:00Z'),
        markedById: admin.id
      }
    });

    await prisma.paymentStatus.create({
      data: {
        studentId: s.id,
        enrollmentId: enroll.id,
        month: 11,
        year: 2026,
        amount: 75,
        status: PaymentState.PENDING,
        isPaid: false,
        dueDate: new Date('2026-11-05T00:00:00Z')
      }
    });
  }

  // 6. El examen, el PDF de lectura y la tarea estructurada se crean EN DIRECTO durante la grabación.
  console.log('6. (Examen, PDF y tarea se crean en directo en la demo)');

  // 7. Calificaciones Ponderadas previas
  console.log('7. Registrando ponderaciones de calificaciones...');
  await prisma.termGrade.create({
    data: {
      studentId: studentLucas.id,
      courseId: courseB2.id,
      term: 1,
      academicYear: '2026-2027',
      middleExamGrade: 8.50,
      finalExamGrade: 9.00,
      tasksAverage: 8.70,
      overallGrade: 8.75,
      grammar: 9.0,
      reading: 8.5,
      writing: 8.5,
      listening: 9.0,
      speaking: 8.8,
      observations: 'Progreso excelente en el primer trimestre. Muy participativo en clase.'
    }
  });

  // 8. Mensaje de Chat Inicial
  console.log('8. Creando conversación de chat inicial...');
  await prisma.chatMessage.create({
    data: {
      senderId: studentLucas.id,
      recipientId: teacherDavid.id,
      studentId: studentLucas.id,
      content: 'Hello David! Do we need to prepare the vocabulary for Unit 3 for tomorrow?'
    }
  });

  console.log('--- ¡Seed Demo Comercial Completado con Éxito! ---');
}

if (require.main === module) {
  seedDemoComercial()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

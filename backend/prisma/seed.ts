import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { ensureStudentPaymentSchedule, getVisibleMonthTargets } from '../src/services/payments';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');
  
  const hashedPassword = await bcrypt.hash('1234', 10);
  
  const teacher = await prisma.user.upsert({
    where: { email: 'profesor@hitschool.com' },
    update: {},
    create: {
      email: 'profesor@hitschool.com',
      passwordHash: hashedPassword,
      role: 'TEACHER',
      profile: {
        create: {
          firstName: 'Carlos',
          lastName: 'Profesor',
        }
      }
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'alumno@hitschool.com' },
    update: {
      monthlyFee: 35,
      courseDurationMonths: 9,
      courseStartDate: new Date('2026-06-01T12:00:00.000Z')
    },
    create: {
      email: 'alumno@hitschool.com',
      passwordHash: hashedPassword, // 1234
      role: 'STUDENT',
      monthlyFee: 35,
      courseDurationMonths: 9,
      courseStartDate: new Date('2026-06-01T12:00:00.000Z'),
      profile: {
        create: {
          firstName: 'Laura',
          lastName: 'Alumno',
        }
      }
    },
  });

  console.log('Profesor de prueba creado:', teacher.email);
  console.log('Alumno de prueba creado:', student.email);

  await ensureStudentPaymentSchedule(prisma, {
    id: student.id,
    role: student.role,
    createdAt: student.createdAt,
    courseDurationMonths: student.courseDurationMonths,
    monthlyFee: student.monthlyFee,
    courseStartDate: student.courseStartDate
  });

  const visibleMonths = getVisibleMonthTargets(3, new Date('2026-08-21T12:00:00.000Z'));

  for (const target of visibleMonths) {
    await prisma.paymentStatus.updateMany({
      where: {
        studentId: student.id,
        month: target.month,
        year: target.year
      },
      data: {
        amount: 35,
        markedById: target.month === 8 ? teacher.id : null,
        isPaid: target.month === 8,
        status: target.month === 8 ? 'PAID' : 'PENDING',
        paidAt: target.month === 8 ? new Date('2026-08-03T12:00:00.000Z') : null
      }
    });
  }

  // --- NUEVA SECCIÓN: CREAR CLASE Y VINCULAR ALUMNO ---
  let demoCourse = await prisma.course.findFirst({ where: { teacherId: teacher.id } });
  if (!demoCourse) {
    demoCourse = await prisma.course.create({
      data: {
        title: 'Inglés B2 - Grupo Mañana',
        teacherId: teacher.id
      }
    });
    console.log('Clase de demostración creada:', demoCourse.title);
  }

  // Matricular al alumno en la clase
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: student.id,
        courseId: demoCourse.id
      }
    }
  });

  if (!existingEnrollment) {
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId: demoCourse.id
      }
    });
    console.log('Alumno matriculado en la clase de demostración.');
  }

  // Crear materiales de ejemplo para la biblioteca
  const existingMaterial = await prisma.material.findFirst({ where: { teacherId: teacher.id } });
  if (!existingMaterial) {
    // 1. Examen interactivo de Listening (Form)
    await prisma.material.create({
      data: {
        title: 'B2 First: Listening Practice Mock Test - Part 1',
        description: 'Simulacro oficial de Listening con pistas de audio por pregunta y corrección automática.',
        type: 'FORM',
        level: 'B2',
        category: 'MOCK_EXAM',
        teacherId: teacher.id,
        formData: {
          questions: [
            {
              id: 'q-1',
              questionText: '1. You hear a young woman talking about her career. What does she enjoy most about her job?',
              audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
              type: 'MULTIPLE_CHOICE',
              options: [
                'Traveling to international conferences',
                'Working in a collaborative and creative team',
                'The flexible schedule and autonomy'
              ],
              correctAnswer: 1,
              points: 2
            },
            {
              id: 'q-2',
              questionText: '2. True or False: The speaker worked in London for more than five years before moving.',
              audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
              type: 'TRUE_FALSE',
              options: ['True', 'False'],
              correctAnswer: 1,
              points: 1
            },
            {
              id: 'q-3',
              questionText: '3. Fill in the blank with the exact word mentioned: "Her manager congratulated her on the recent ________."',
              type: 'SHORT_ANSWER',
              correctAnswer: 'promotion',
              points: 2
            }
          ]
        }
      }
    });

    // 2. Audio de Listening suelto
    await prisma.material.create({
      data: {
        title: 'C1 Advanced: Academic Lecture on Renewable Energy',
        description: 'Audio completo para práctica de toma de notas y comprensión auditiva.',
        type: 'AUDIO',
        level: 'C1',
        category: 'LISTENING',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        teacherId: teacher.id
      }
    });

    // 3. Vídeo explicativo
    await prisma.material.create({
      data: {
        title: 'Mastering Conditionals (Zero, 1st, 2nd, 3rd & Mixed)',
        description: 'Clase en vídeo con ejemplos prácticos para dominar todas las estructuras condicionales.',
        type: 'VIDEO',
        level: 'B2',
        category: 'GRAMMAR_VOCABULARY',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        teacherId: teacher.id
      }
    });

    // 4. Documento PDF
    await prisma.material.create({
      data: {
        title: 'Cambridge B2 First - Writing Guide & Connectors Cheat Sheet',
        description: 'Guía de conectores, estructuras formales y plantillas de Essays, Reviews y Reports.',
        type: 'DOCUMENT',
        level: 'B2',
        category: 'WRITING',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        teacherId: teacher.id
      }
    });

    console.log('Materiales de demostración creados con éxito.');

    // Asignar una tarea de ejemplo para que el dashboard del alumno no esté vacío
    const materialForTask = await prisma.material.findFirst({ where: { teacherId: teacher.id } });
    if (materialForTask && demoCourse) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await prisma.assignment.create({
        data: {
          title: 'Simulacro B2 Listening - Obligatorio',
          description: 'Por favor, completad este simulacro antes de la clase de mañana.',
          category: 'MOCK_EXAM',
          dueDate: tomorrow,
          teacherId: teacher.id,
          courseId: demoCourse.id,
          materialId: materialForTask.id
        }
      });
      console.log('Tarea de demostración asignada a la clase.');
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

import { PrismaClient, Level, MaterialType, SkillCategory } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Limpiando base de datos...');

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

  console.log('Creando usuarios de acceso...');

  const hashedPassword = await bcrypt.hash('1234', 10);
  const tutorPasswordHash = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@hitschool.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      profile: {
        create: {
          firstName: 'Admin',
          lastName: 'HitSchool'
        }
      }
    }
  });

  const teacher = await prisma.user.create({
    data: {
      email: 'profesor@hitschool.com',
      passwordHash: hashedPassword,
      role: 'TEACHER',
      status: 'ACTIVE',
      profile: {
        create: {
          firstName: 'Laura',
          lastName: 'Profesor'
        }
      }
    }
  });

  const secondaryTeacher = await prisma.user.create({
    data: {
      email: 'profesor2@hitschool.com',
      passwordHash: hashedPassword,
      role: 'TEACHER',
      status: 'ACTIVE',
      profile: {
        create: {
          firstName: 'Profesor',
          lastName: 'Secundario'
        }
      }
    }
  });

  const parent = await prisma.user.create({
    data: {
      email: 'marpargut@hitschool.com',
      passwordHash: tutorPasswordHash,
      role: 'PARENT',
      status: 'ACTIVE',
      profile: {
        create: {
          firstName: 'Marta',
          lastName: 'Madre'
        }
      }
    }
  });

  const student = await prisma.user.create({
    data: {
      email: 'alumno@hitschool.com',
      passwordHash: hashedPassword,
      role: 'STUDENT',
      status: 'ACTIVE',
      parentId: parent.id,
      profile: {
        create: {
          firstName: 'Laura',
          lastName: 'Alumna'
        }
      }
    }
  });

  const materials = [
    {
      title: 'Grammar Masterclass: Present Perfect vs Past Simple',
      description: 'Video explicativo sobre las diferencias de uso entre el Present Perfect y el Past Simple con situaciones de la vida real.',
      type: MaterialType.VIDEO,
      level: Level.B2,
      category: SkillCategory.GRAMMAR_VOCABULARY,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      teacherId: teacher.id
    },
    {
      title: 'Pronunciation Guide: Connected Speech & Intonation',
      description: 'Pildora en video con ejercicios de ritmo y enlace de palabras para el examen oral de Speaking.',
      type: MaterialType.VIDEO,
      level: Level.B1,
      category: SkillCategory.SPEAKING,
      url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
      teacherId: secondaryTeacher.id
    },
    {
      title: 'Guia de Conectores y Estructura de Redaccion (Essay B2)',
      description: 'PDF de referencia rapida con conectores formales y plantilla para essays.',
      type: MaterialType.DOCUMENT,
      level: Level.B2,
      category: SkillCategory.WRITING,
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      teacherId: teacher.id
    },
    {
      title: 'Ficha de Vocabulario y Phrasal Verbs con Ejemplos',
      description: 'Documento con lista de 50 phrasal verbs indispensables en contexto con ejercicios practicos.',
      type: MaterialType.DOCUMENT,
      level: Level.A2,
      category: SkillCategory.GRAMMAR_VOCABULARY,
      url: 'https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c461_sample_explanation.pdf',
      teacherId: secondaryTeacher.id
    },
    {
      title: 'Listening Comprehension: Short Conversations (Track 01)',
      description: 'Audio en formato MP3 para practica auditiva de conversaciones breves en un aeropuerto.',
      type: MaterialType.AUDIO,
      level: Level.B2,
      category: SkillCategory.LISTENING,
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      teacherId: teacher.id
    },
    {
      title: 'Test Interactivo: Diagnostico B2 Use of English',
      description: 'Examen interactivo con correccion automatica inmediata de 4 preguntas.',
      type: MaterialType.FORM,
      level: Level.B2,
      category: SkillCategory.GRAMMAR_VOCABULARY,
      teacherId: teacher.id,
      formData: {
        title: 'Test Diagnostico B2 Use of English',
        description: 'Demuestra tu dominio gramatical respondiendo a las siguientes preguntas.',
        questions: [
          {
            id: 'q1',
            questionText: 'By the time we arrived at the cinema, the film ______ already started.',
            type: 'MULTIPLE_CHOICE',
            options: ['has', 'had', 'was', 'would'],
            correctAnswer: 1,
            points: 2.5
          },
          {
            id: 'q2',
            questionText: 'The phrasal verb "give up" means to abandon or surrender.',
            type: 'TRUE_FALSE',
            options: ['Verdadero', 'Falso'],
            correctAnswer: 0,
            points: 2.5
          },
          {
            id: 'q3',
            questionText: 'Complete with the correct preposition: She is very good ______ playing tennis.',
            type: 'SHORT_ANSWER',
            correctAnswer: 'at',
            points: 2.5
          },
          {
            id: 'q4',
            questionText: 'Which modal verb indicates past deduction? "He ______ have forgotten his keys."',
            type: 'MULTIPLE_CHOICE',
            options: ['must', 'should', 'can', 'ought'],
            correctAnswer: 0,
            points: 2.5
          }
        ]
      }
    },
    {
      title: 'Quiz Rapido: Vocabulario de Viajes & Turismo A2/B1',
      description: 'Test interactivo de 3 preguntas para consolidar vocabulario de viajes y transportes.',
      type: MaterialType.FORM,
      level: Level.A2,
      category: SkillCategory.GRAMMAR_VOCABULARY,
      teacherId: secondaryTeacher.id,
      formData: {
        title: 'Quiz de Vocabulario: Travel & Transport',
        description: 'Comprueba tus conocimientos sobre vocabulario de transportes y viajes.',
        questions: [
          {
            id: 'q1',
            questionText: 'Where do you go to catch an airplane?',
            type: 'MULTIPLE_CHOICE',
            options: ['Train station', 'Airport', 'Harbour', 'Bus stop'],
            correctAnswer: 1,
            points: 3.33
          },
          {
            id: 'q2',
            questionText: 'A "boarding pass" is needed to get onto an airplane.',
            type: 'TRUE_FALSE',
            options: ['Verdadero', 'Falso'],
            correctAnswer: 0,
            points: 3.33
          },
          {
            id: 'q3',
            questionText: 'Write the word: The person who drives a taxi is a taxi ______',
            type: 'SHORT_ANSWER',
            correctAnswer: 'driver',
            points: 3.34
          }
        ]
      }
    }
  ];

  await prisma.material.createMany({ data: materials });

  console.log('Admin creado:', admin.email);
  console.log('Profesor creado:', teacher.email);
  console.log('Profesor secundario creado:', secondaryTeacher.email);
  console.log('Tutor creado:', parent.email);
  console.log('Alumno creado:', student.email);
  console.log('Materiales creados:', materials.length);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

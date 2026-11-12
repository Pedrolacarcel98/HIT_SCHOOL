import { PrismaClient, Role, MaterialType, SkillCategory, Level } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 INICIANDO LIMPIEZA COMPLETA DE LA BASE DE DATOS...');
  console.log('📌 Manteniendo usuarios, fichas y credenciales. Eliminando clases, tareas y entregas.\n');

  // 1. Eliminar entregas y progreso
  console.log('1. Eliminando entregas de tareas y progreso...');
  const delSubmissions = await prisma.submission.deleteMany();
  const delDeliveries = await prisma.taskDelivery.deleteMany();
  const delProgress = await prisma.structuredTaskStepProgress.deleteMany();
  const delTaskStudents = await prisma.structuredTaskStudent.deleteMany();
  console.log(`   ✔ Entregas clásicas eliminadas: ${delSubmissions.count}`);
  console.log(`   ✔ Entregas de tareas estructuradas eliminadas: ${delDeliveries.count}`);
  console.log(`   ✔ Registros de progreso de pasos eliminados: ${delProgress.count}`);
  console.log(`   ✔ Asignaciones de alumnos a tareas eliminadas: ${delTaskStudents.count}`);

  // 2. Eliminar asignaciones y pasos de tareas
  console.log('\n2. Eliminando asignaciones y tareas estructuradas...');
  const delAssignments = await prisma.assignment.deleteMany();
  const delSteps = await prisma.structuredTaskStep.deleteMany();
  const delTasks = await prisma.structuredTask.deleteMany();
  const delMatAssignments = await prisma.materialAssignment.deleteMany();
  console.log(`   ✔ Asignaciones eliminadas: ${delAssignments.count}`);
  console.log(`   ✔ Pasos de tareas estructuradas eliminados: ${delSteps.count}`);
  console.log(`   ✔ Tareas estructuradas eliminadas: ${delTasks.count}`);
  console.log(`   ✔ Asignaciones directas de material eliminadas: ${delMatAssignments.count}`);

  // 3. Eliminar notas trimestrales y evaluaciones finales
  console.log('\n3. Eliminando libro de notas y evaluaciones...');
  const delTermGrades = await prisma.termGrade.deleteMany();
  const delFinalEval = await prisma.finalEvaluation.deleteMany();
  console.log(`   ✔ Calificaciones trimestrales eliminadas: ${delTermGrades.count}`);
  console.log(`   ✔ Evaluaciones finales eliminadas: ${delFinalEval.count}`);

  // 4. Eliminar cursos, tablón e inscripciones a clases
  console.log('\n4. Eliminando clases, grupos e inscripciones...');
  const delPosts = await prisma.post.deleteMany();
  const delEnrollments = await prisma.enrollment.deleteMany();
  const delCourses = await prisma.course.deleteMany();
  console.log(`   ✔ Posts de tablón eliminados: ${delPosts.count}`);
  console.log(`   ✔ Matriculaciones a clases eliminadas: ${delEnrollments.count}`);
  console.log(`   ✔ Cursos/Grupos eliminados: ${delCourses.count}`);

  // 5. Eliminar mensajes de chat y pagos antiguos
  console.log('\n5. Limpiando historial de chats y pagos anteriores...');
  const delChats = await prisma.chatMessage.deleteMany();
  const delPayments = await prisma.paymentStatus.deleteMany();
  console.log(`   ✔ Mensajes de chat eliminados: ${delChats.count}`);
  console.log(`   ✔ Recibos/estados de pago eliminados: ${delPayments.count}`);

  // 6. Eliminar materiales existentes para dejar únicamente los materiales limpios de prueba
  console.log('\n6. Renovando repositorio de materiales...');
  await prisma.material.deleteMany();

  // Obtener profesores para asociarles materiales de prueba
  const teachers = await prisma.user.findMany({
    where: { role: Role.TEACHER }
  });

  if (teachers.length === 0) {
    console.error('❌ No se encontraron profesores en el sistema.');
    return;
  }

  const primaryTeacherId = teachers[0].id;
  const secondaryTeacherId = teachers.length > 1 ? teachers[1].id : primaryTeacherId;

  // Materiales de prueba listos para seleccionar al crear pasos de tareas
  const testMaterials = [
    // Videos
    {
      title: 'Grammar Masterclass: Present Perfect vs Past Simple',
      description: 'Vídeo explicativo sobre las diferencias de uso entre el Present Perfect y el Past Simple con situaciones de la vida real.',
      type: MaterialType.VIDEO,
      level: Level.B2,
      category: SkillCategory.GRAMMAR_VOCABULARY,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      teacherId: primaryTeacherId
    },
    {
      title: 'Pronunciation Guide: Connected Speech & Intonation',
      description: 'Píldora en vídeo con ejercicios de ritmo y enlace de palabras para el examen oral de Speaking.',
      type: MaterialType.VIDEO,
      level: Level.B1,
      category: SkillCategory.SPEAKING,
      url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
      teacherId: secondaryTeacherId
    },
    // Documentos / PDFs
    {
      title: 'Guía de Conectores y Estructura de Redacción (Essay B2)',
      description: 'PDF de referencia rápida con conectores formales (Furthermore, In contrast, On the other hand) y plantilla para essays.',
      type: MaterialType.DOCUMENT,
      level: Level.B2,
      category: SkillCategory.WRITING,
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      teacherId: primaryTeacherId
    },
    {
      title: 'Ficha de Vocabulario y Phrasal Verbs con Ejemplos',
      description: 'Documento con lista de 50 phrasal verbs indispensables en contexto con ejercicios prácticos.',
      type: MaterialType.DOCUMENT,
      level: Level.A2,
      category: SkillCategory.GRAMMAR_VOCABULARY,
      url: 'https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c461_sample_explanation.pdf',
      teacherId: secondaryTeacherId
    },
    // Audios
    {
      title: 'Listening Comprehension: Short Conversations (Track 01)',
      description: 'Audio en formato MP3 para práctica auditiva de conversaciones breves en un aeropuerto.',
      type: MaterialType.AUDIO,
      level: Level.B2,
      category: SkillCategory.LISTENING,
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      teacherId: primaryTeacherId
    },
    // Exámenes / Cuestionarios interactivos autocorregibles
    {
      title: 'Test Interactivo: Diagnóstico B2 Use of English',
      description: 'Examen interactivo con corrección automática inmediata de 4 preguntas (opción múltiple, V/F y respuesta corta).',
      type: MaterialType.FORM,
      level: Level.B2,
      category: SkillCategory.GRAMMAR_VOCABULARY,
      teacherId: primaryTeacherId,
      formData: {
        title: 'Test Diagnóstico B2 Use of English',
        description: 'Demuestra tu dominio gramatical respondiendo a las siguientes preguntas.',
        questions: [
          {
            id: 'q1',
            questionText: 'By the time we arrived at the cinema, the film ______ already started.',
            type: 'MULTIPLE_CHOICE',
            options: ['has', 'had', 'was', 'would'],
            correctAnswer: 1, // 'had'
            points: 2.5
          },
          {
            id: 'q2',
            questionText: 'The phrasal verb "give up" means to abandon or surrender.',
            type: 'TRUE_FALSE',
            options: ['Verdadero', 'Falso'],
            correctAnswer: 0, // 'Verdadero'
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
            correctAnswer: 0, // 'must'
            points: 2.5
          }
        ]
      }
    },
    {
      title: 'Quiz Rápido: Vocabulario de Viajes & Turismo A2/B1',
      description: 'Test interactivo de 3 preguntas para consolidar vocabulario de viajes y transportes.',
      type: MaterialType.FORM,
      level: Level.A2,
      category: SkillCategory.GRAMMAR_VOCABULARY,
      teacherId: secondaryTeacherId,
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

  for (const mat of testMaterials) {
    await prisma.material.create({
      data: mat
    });
  }

  console.log(`   ✔ Insertados ${testMaterials.length} materiales de prueba (vídeos, documentos, audios y exámenes interactivos).`);

  // 7. Resumen final de usuarios y estado
  const allUsers = await prisma.user.findMany({
    include: {
      profile: true,
      parent: { select: { email: true } },
      children: { select: { email: true } }
    },
    orderBy: [{ role: 'asc' }, { email: 'asc' }]
  });

  console.log('\n======================================================');
  console.log('✅ BASE DE DATOS COMPLETAMENTE LIMPIA Y LISTA PARA PRUEBAS');
  console.log('======================================================');
  console.log(`Total usuarios activos: ${allUsers.length}\n`);

  allUsers.forEach((u) => {
    const name = u.profile ? `${u.profile.firstName} ${u.profile.lastName}`.trim() : 'Sin nombre';
    const rolePill = `[${u.role}]`.padEnd(10);
    const parentInfo = u.parent ? ` | Tutor: ${u.parent.email}` : '';
    const childrenInfo = u.children.length > 0 ? ` | Hijos: ${u.children.map((c) => c.email).join(', ')}` : '';
    console.log(`${rolePill} ${u.email.padEnd(32)} ${name}${parentInfo}${childrenInfo}`);
  });

  const finalCounts = {
    courses: await prisma.course.count(),
    enrollments: await prisma.enrollment.count(),
    structuredTasks: await prisma.structuredTask.count(),
    assignments: await prisma.assignment.count(),
    submissions: await prisma.submission.count(),
    taskDeliveries: await prisma.taskDelivery.count(),
    termGrades: await prisma.termGrade.count(),
    chatMessages: await prisma.chatMessage.count(),
    materials: await prisma.material.count()
  };

  console.log('\n📊 ESTADO FINAL DE LA BASE DE DATOS:');
  console.log(finalCounts);
}

main()
  .catch((e) => {
    console.error('Error durante la limpieza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

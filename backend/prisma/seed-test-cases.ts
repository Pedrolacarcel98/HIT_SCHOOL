import {
  PrismaClient,
  Role,
  UserStatus,
  Modality,
  Level,
  SkillCategory,
  MaterialType,
  PaymentState,
  StructuredTaskAssignmentType
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando inserción de casos de prueba exhaustivos en HitSchool...');

  const passwordHash = await bcrypt.hash('1234', 10);

  // ==========================================
  // 1. PROFESORES (2 TEACHERS)
  // ==========================================
  console.log('--- Creando Profesores ---');
  const teacher1 = await prisma.user.upsert({
    where: { email: 'profesor1@hitschool.com' },
    update: { passwordHash, role: Role.TEACHER, status: UserStatus.ACTIVE },
    create: {
      email: 'profesor1@hitschool.com',
      passwordHash,
      role: Role.TEACHER,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          firstName: 'Carlos',
          lastName: 'Profesor B2/C1',
          dni: '12345674T',
          phone: '611222333',
          address: 'Av. de la Constitución 12, Madrid'
        }
      }
    },
    include: { profile: true }
  });
  console.log('✔ Profesor 1:', teacher1.email, teacher1.profile?.firstName);

  const teacher2 = await prisma.user.upsert({
    where: { email: 'profesor2@hitschool.com' },
    update: { passwordHash, role: Role.TEACHER, status: UserStatus.ACTIVE },
    create: {
      email: 'profesor2@hitschool.com',
      passwordHash,
      role: Role.TEACHER,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          firstName: 'Elena',
          lastName: 'Profesora Infantil/A2',
          dni: '12345675E',
          phone: '622333444',
          address: 'Calle Alcalá 45, Madrid'
        }
      }
    },
    include: { profile: true }
  });
  console.log('✔ Profesor 2:', teacher2.email, teacher2.profile?.firstName);

  // ==========================================
  // 2. PADRES (2 PARENTS)
  // ==========================================
  console.log('--- Creando Padres / Tutores ---');
  const parent1 = await prisma.user.upsert({
    where: { email: 'padre.unhijo@hitschool.com' },
    update: { passwordHash, role: Role.PARENT, status: UserStatus.ACTIVE },
    create: {
      email: 'padre.unhijo@hitschool.com',
      passwordHash,
      role: Role.PARENT,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          firstName: 'Marcos (Padre UnHijo)',
          lastName: 'García Tutor',
          dni: '11111111P',
          phone: '633444555',
          address: 'Paseo de la Castellana 80, Madrid'
        }
      }
    },
    include: { profile: true }
  });
  console.log('✔ Padre 1 (1 Hijo):', parent1.email);

  const parent2 = await prisma.user.upsert({
    where: { email: 'padre.doshijos@hitschool.com' },
    update: { passwordHash, role: Role.PARENT, status: UserStatus.ACTIVE },
    create: {
      email: 'padre.doshijos@hitschool.com',
      passwordHash,
      role: Role.PARENT,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          firstName: 'Lucía (Madre DosHijos)',
          lastName: 'Martínez Tutora',
          dni: '33333333M',
          phone: '644555666',
          address: 'Calle Gran Vía 28, Madrid'
        }
      }
    },
    include: { profile: true }
  });
  console.log('✔ Padre 2 (2 Hijos):', parent2.email);

  // ==========================================
  // 3. ALUMNOS CON PADRES (3 STUDENTS WITH PARENTS)
  // ==========================================
  console.log('--- Creando Alumnos con Padres Asignados ---');
  // Hijo único de Padre 1
  const student1 = await prisma.user.upsert({
    where: { email: 'hijo.unico@hitschool.com' },
    update: {
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      modality: Modality.PRESENCIAL,
      parentId: parent1.id
    },
    create: {
      email: 'hijo.unico@hitschool.com',
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      modality: Modality.PRESENCIAL,
      parentId: parent1.id,
      profile: {
        create: {
          firstName: 'Hugo (Hijo Único)',
          lastName: 'García',
          dni: '22222221H',
          phone: '633444556',
          birthDate: new Date('2014-05-15'),
          address: 'Paseo de la Castellana 80, Madrid'
        }
      }
    },
    include: { profile: true }
  });
  console.log('✔ Alumno Hijo Único:', student1.email, '-> Tutor:', parent1.email);

  // Hermano Mayor (Hijo 1 de Padre 2)
  const student2 = await prisma.user.upsert({
    where: { email: 'hermano.mayor@hitschool.com' },
    update: {
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      modality: Modality.PRESENCIAL,
      parentId: parent2.id
    },
    create: {
      email: 'hermano.mayor@hitschool.com',
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      modality: Modality.PRESENCIAL,
      parentId: parent2.id,
      profile: {
        create: {
          firstName: 'Mateo (Hermano Mayor)',
          lastName: 'Martínez',
          dni: '44444441M',
          phone: '644555667',
          birthDate: new Date('2009-03-20'),
          address: 'Calle Gran Vía 28, Madrid'
        }
      }
    },
    include: { profile: true }
  });
  console.log('✔ Alumno Hermano Mayor:', student2.email, '-> Tutora:', parent2.email);

  // Hermana Menor (Hija 2 de Padre 2)
  const student3 = await prisma.user.upsert({
    where: { email: 'hermano.menor@hitschool.com' },
    update: {
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      modality: Modality.ONLINE,
      parentId: parent2.id
    },
    create: {
      email: 'hermano.menor@hitschool.com',
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      modality: Modality.ONLINE,
      parentId: parent2.id,
      profile: {
        create: {
          firstName: 'Sofía (Hermana Menor)',
          lastName: 'Martínez',
          dni: '44444442S',
          phone: '644555668',
          birthDate: new Date('2015-11-10'),
          address: 'Calle Gran Vía 28, Madrid'
        }
      }
    },
    include: { profile: true }
  });
  console.log('✔ Alumna Hermana Menor:', student3.email, '-> Tutora:', parent2.email);

  // ==========================================
  // 4. ALUMNO INDEPENDIENTE (1 INDEPENDENT STUDENT)
  // ==========================================
  console.log('--- Creando Alumno Independiente (Sin Tutor) ---');
  const studentIndependent = await prisma.user.upsert({
    where: { email: 'alumno.independiente@hitschool.com' },
    update: {
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      modality: Modality.ONLINE,
      parentId: null
    },
    create: {
      email: 'alumno.independiente@hitschool.com',
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      modality: Modality.ONLINE,
      parentId: null,
      profile: {
        create: {
          firstName: 'Álex (Alumno Independiente)',
          lastName: 'Ruiz Adulto',
          dni: '55555555A',
          phone: '655666777',
          birthDate: new Date('1998-08-14'),
          address: 'Calle Princesa 10, Madrid'
        }
      }
    },
    include: { profile: true }
  });
  console.log('✔ Alumno Independiente:', studentIndependent.email, '(parentId: null)');

  // ==========================================
  // 5. MATRÍCULAS DE ACADEMIA Y CUOTAS MENSUALES
  // ==========================================
  console.log('--- Configurando Matrículas de Academia (AcademyEnrollment) ---');

  const setupAcademyEnrollment = async (studentId: string, startDate: Date, monthlyFee: number) => {
    let enrollment = await prisma.academyEnrollment.findFirst({ where: { studentId } });
    if (!enrollment) {
      enrollment = await prisma.academyEnrollment.create({
        data: { studentId, startDate, monthlyFee }
      });
    } else {
      enrollment = await prisma.academyEnrollment.update({
        where: { id: enrollment.id },
        data: { startDate, monthlyFee }
      });
    }
    return enrollment;
  };

  const enrollHugo = await setupAcademyEnrollment(student1.id, new Date('2026-06-01T10:00:00.000Z'), 35);
  const enrollMateo = await setupAcademyEnrollment(student2.id, new Date('2026-05-01T10:00:00.000Z'), 65);
  const enrollSofia = await setupAcademyEnrollment(student3.id, new Date('2026-05-01T10:00:00.000Z'), 35);
  const enrollAlex = await setupAcademyEnrollment(studentIndependent.id, new Date('2026-04-01T10:00:00.000Z'), 65);

  // ==========================================
  // 6. ESTADOS DE PAGO (PAYMENT STATUSES)
  // ==========================================
  console.log('--- Configurando Mensualidades y Recibos ---');

  const upsertPayment = async (data: {
    studentId: string;
    enrollmentId: string;
    month: number;
    year: number;
    amount: number;
    isPaid: boolean;
    dueDate: Date;
    paidAt?: Date | null;
    markedById?: string | null;
  }) => {
    const existing = await prisma.paymentStatus.findUnique({
      where: { studentId_month_year: { studentId: data.studentId, month: data.month, year: data.year } }
    });

    if (existing) {
      return prisma.paymentStatus.update({
        where: { id: existing.id },
        data: {
          enrollmentId: data.enrollmentId,
          amount: data.amount,
          isPaid: data.isPaid,
          status: data.isPaid ? PaymentState.PAID : PaymentState.PENDING,
          dueDate: data.dueDate,
          paidAt: data.paidAt ?? null,
          markedById: data.markedById ?? null
        }
      });
    }

    return prisma.paymentStatus.create({
      data: {
        studentId: data.studentId,
        enrollmentId: data.enrollmentId,
        month: data.month,
        year: data.year,
        amount: data.amount,
        isPaid: data.isPaid,
        status: data.isPaid ? PaymentState.PAID : PaymentState.PENDING,
        dueDate: data.dueDate,
        paidAt: data.paidAt ?? null,
        markedById: data.markedById ?? null
      }
    });
  };

  // Hugo (Hijo Único): Junio pagado, Julio pagado, Agosto impagado (overdue), Septiembre pendiente
  await upsertPayment({ studentId: student1.id, enrollmentId: enrollHugo.id, month: 6, year: 2026, amount: 35, isPaid: true, dueDate: new Date('2026-06-05'), paidAt: new Date('2026-06-03'), markedById: teacher1.id });
  await upsertPayment({ studentId: student1.id, enrollmentId: enrollHugo.id, month: 7, year: 2026, amount: 35, isPaid: true, dueDate: new Date('2026-07-05'), paidAt: new Date('2026-07-04'), markedById: teacher1.id });
  await upsertPayment({ studentId: student1.id, enrollmentId: enrollHugo.id, month: 8, year: 2026, amount: 35, isPaid: false, dueDate: new Date('2026-08-05') });
  await upsertPayment({ studentId: student1.id, enrollmentId: enrollHugo.id, month: 9, year: 2026, amount: 35, isPaid: false, dueDate: new Date('2026-09-05') });

  // Mateo (Hermano Mayor): TODO AL DÍA (Mayo a Septiembre pagados)
  await upsertPayment({ studentId: student2.id, enrollmentId: enrollMateo.id, month: 5, year: 2026, amount: 65, isPaid: true, dueDate: new Date('2026-05-05'), paidAt: new Date('2026-05-04'), markedById: teacher1.id });
  await upsertPayment({ studentId: student2.id, enrollmentId: enrollMateo.id, month: 6, year: 2026, amount: 65, isPaid: true, dueDate: new Date('2026-06-05'), paidAt: new Date('2026-06-02'), markedById: teacher1.id });
  await upsertPayment({ studentId: student2.id, enrollmentId: enrollMateo.id, month: 7, year: 2026, amount: 65, isPaid: true, dueDate: new Date('2026-07-05'), paidAt: new Date('2026-07-05'), markedById: teacher1.id });
  await upsertPayment({ studentId: student2.id, enrollmentId: enrollMateo.id, month: 8, year: 2026, amount: 65, isPaid: true, dueDate: new Date('2026-08-05'), paidAt: new Date('2026-08-03'), markedById: teacher1.id });
  await upsertPayment({ studentId: student2.id, enrollmentId: enrollMateo.id, month: 9, year: 2026, amount: 65, isPaid: true, dueDate: new Date('2026-09-05'), paidAt: new Date('2026-09-02'), markedById: teacher1.id });

  // Sofía (Hermana Menor): Mayo y Junio pagados; Julio y Agosto impagados (overdue), Septiembre pendiente
  await upsertPayment({ studentId: student3.id, enrollmentId: enrollSofia.id, month: 5, year: 2026, amount: 35, isPaid: true, dueDate: new Date('2026-05-05'), paidAt: new Date('2026-05-04'), markedById: teacher2.id });
  await upsertPayment({ studentId: student3.id, enrollmentId: enrollSofia.id, month: 6, year: 2026, amount: 35, isPaid: true, dueDate: new Date('2026-06-05'), paidAt: new Date('2026-06-03'), markedById: teacher2.id });
  await upsertPayment({ studentId: student3.id, enrollmentId: enrollSofia.id, month: 7, year: 2026, amount: 35, isPaid: false, dueDate: new Date('2026-07-05') });
  await upsertPayment({ studentId: student3.id, enrollmentId: enrollSofia.id, month: 8, year: 2026, amount: 35, isPaid: false, dueDate: new Date('2026-08-05') });
  await upsertPayment({ studentId: student3.id, enrollmentId: enrollSofia.id, month: 9, year: 2026, amount: 35, isPaid: false, dueDate: new Date('2026-09-05') });

  // Álex (Alumno Independiente): Abril a Agosto pagados, Septiembre pendiente
  await upsertPayment({ studentId: studentIndependent.id, enrollmentId: enrollAlex.id, month: 4, year: 2026, amount: 65, isPaid: true, dueDate: new Date('2026-04-05'), paidAt: new Date('2026-04-05'), markedById: teacher1.id });
  await upsertPayment({ studentId: studentIndependent.id, enrollmentId: enrollAlex.id, month: 5, year: 2026, amount: 65, isPaid: true, dueDate: new Date('2026-05-05'), paidAt: new Date('2026-05-05'), markedById: teacher1.id });
  await upsertPayment({ studentId: studentIndependent.id, enrollmentId: enrollAlex.id, month: 6, year: 2026, amount: 65, isPaid: true, dueDate: new Date('2026-06-05'), paidAt: new Date('2026-06-05'), markedById: teacher1.id });
  await upsertPayment({ studentId: studentIndependent.id, enrollmentId: enrollAlex.id, month: 7, year: 2026, amount: 65, isPaid: true, dueDate: new Date('2026-07-05'), paidAt: new Date('2026-07-05'), markedById: teacher1.id });
  await upsertPayment({ studentId: studentIndependent.id, enrollmentId: enrollAlex.id, month: 8, year: 2026, amount: 65, isPaid: true, dueDate: new Date('2026-08-05'), paidAt: new Date('2026-08-04'), markedById: teacher1.id });
  await upsertPayment({ studentId: studentIndependent.id, enrollmentId: enrollAlex.id, month: 9, year: 2026, amount: 65, isPaid: false, dueDate: new Date('2026-09-05') });

  console.log('✔ Mensualidades y recibos configurados con éxito.');

  // ==========================================
  // 7. CURSOS Y AULAS VIRTUALES (COURSES)
  // ==========================================
  console.log('--- Creando Aulas Virtuales ---');

  // Curso 1: B2 Cambridge (Profesor 1)
  let course1 = await prisma.course.findFirst({
    where: { title: 'Inglés B2 - Cambridge First Certificate', teacherId: teacher1.id }
  });
  if (!course1) {
    course1 = await prisma.course.create({
      data: {
        title: 'Inglés B2 - Cambridge First Certificate',
        teacherId: teacher1.id
      }
    });
  }

  // Curso 2: A2 Primaria & Kids (Profesor 2)
  let course2 = await prisma.course.findFirst({
    where: { title: 'Inglés A2 - Primaria & Young Learners', teacherId: teacher2.id }
  });
  if (!course2) {
    course2 = await prisma.course.create({
      data: {
        title: 'Inglés A2 - Primaria & Young Learners',
        teacherId: teacher2.id
      }
    });
  }

  // Curso 3: C1 Advanced (Profesor 1)
  let course3 = await prisma.course.findFirst({
    where: { title: 'Inglés C1 - Advanced Professional Skills', teacherId: teacher1.id }
  });
  if (!course3) {
    course3 = await prisma.course.create({
      data: {
        title: 'Inglés C1 - Advanced Professional Skills',
        teacherId: teacher1.id
      }
    });
  }

  console.log('✔ Cursos creados:', course1.title, '|', course2.title, '|', course3.title);

  // Matriculaciones en cursos
  const enrollInCourse = async (studentId: string, courseId: string) => {
    return prisma.enrollment.upsert({
      where: { studentId_courseId: { studentId, courseId } },
      update: {},
      create: { studentId, courseId }
    });
  };

  // Mateo (Hermano Mayor) y Álex (Independiente) -> Curso B2
  await enrollInCourse(student2.id, course1.id);
  await enrollInCourse(studentIndependent.id, course1.id);

  // Hugo (Hijo Único) y Sofía (Hermana Menor) -> Curso A2
  await enrollInCourse(student1.id, course2.id);
  await enrollInCourse(student3.id, course2.id);

  // Álex (Independiente) -> también en Curso C1
  await enrollInCourse(studentIndependent.id, course3.id);

  console.log('✔ Alumnos matriculados en sus correspondientes cursos.');

  // ==========================================
  // 8. TABLÓN DE ANUNCIOS (POSTS)
  // ==========================================
  console.log('--- Creando Anuncios en el Tablón ---');
  const addPostIfEmpty = async (courseId: string, content: string) => {
    const count = await prisma.post.count({ where: { courseId, content } });
    if (count === 0) {
      await prisma.post.create({ data: { courseId, content } });
    }
  };

  await addPostIfEmpty(
    course1.id,
    '📢 ¡Bienvenidos al curso de B2 First! Recordad repasar los conectores de contraste y adición para el writing del viernes.'
  );
  await addPostIfEmpty(
    course1.id,
    '📝 Os he dejado en el trabajo de clase el nuevo simulacro interactivo de examen. ¡Mucho ánimo!'
  );
  await addPostIfEmpty(
    course2.id,
    '🌟 ¡Hola a todos! Mañana en clase practicaremos speaking describiendo nuestras mascotas y animales favoritos.'
  );
  await addPostIfEmpty(
    course3.id,
    '💼 Próximo martes: Mesa redonda y debate sobre inteligencia artificial en el entorno corporativo.'
  );

  // ==========================================
  // 9. MATERIALES DIDÁCTICOS (MATERIALS)
  // ==========================================
  console.log('--- Creando Biblioteca de Materiales Didácticos ---');

  // Material 1: Examen interactivo B2 (Teacher 1)
  let materialFormB2 = await prisma.material.findFirst({
    where: { title: 'B2 First: Listening & Reading Mock Exam - Test 1', teacherId: teacher1.id }
  });
  if (!materialFormB2) {
    materialFormB2 = await prisma.material.create({
      data: {
        title: 'B2 First: Listening & Reading Mock Exam - Test 1',
        description: 'Examen de prueba autocorregible con audios y preguntas de opción múltiple, V/F y respuesta corta.',
        type: MaterialType.FORM,
        level: Level.B2,
        category: SkillCategory.MOCK_EXAM,
        teacherId: teacher1.id,
        formData: {
          questions: [
            {
              id: 'b2-q1',
              questionText: '1. What is the speaker\'s primary concern about the new public transport project?',
              type: 'MULTIPLE_CHOICE',
              audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
              options: [
                'The construction delays in residential zones',
                'The increased operational costs and environmental impact',
                'The lack of accessibility for disabled passengers'
              ],
              correctAnswer: 1,
              points: 2
            },
            {
              id: 'b2-q2',
              questionText: '2. True or False: The exhibition will remain open to the public until the end of November.',
              type: 'TRUE_FALSE',
              options: ['True', 'False'],
              correctAnswer: 0,
              points: 2
            },
            {
              id: 'b2-q3',
              questionText: '3. Fill in the blank: "Despite the bad weather, they decided to go on with the ________."',
              type: 'SHORT_ANSWER',
              correctAnswer: 'journey',
              points: 2
            },
            {
              id: 'b2-q4',
              questionText: '4. According to the text, what skill is considered essential for 21st century leaders?',
              type: 'MULTIPLE_CHOICE',
              options: [
                'Authoritarian decision making',
                'Empathy and emotional intelligence',
                'Financial speculation'
              ],
              correctAnswer: 1,
              points: 2
            }
          ]
        }
      }
    });
  }

  // Material 2: Documento PDF Guía de Writing B2 (Teacher 1)
  let materialDocB2 = await prisma.material.findFirst({
    where: { title: 'Guía B2 First: Writing Formal & Informal Templates', teacherId: teacher1.id }
  });
  if (!materialDocB2) {
    materialDocB2 = await prisma.material.create({
      data: {
        title: 'Guía B2 First: Writing Formal & Informal Templates',
        description: 'Compendio de estructuras gramaticales, conectores C1/B2 y plantillas para redacciones.',
        type: MaterialType.DOCUMENT,
        level: Level.B2,
        category: SkillCategory.WRITING,
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        teacherId: teacher1.id
      }
    });
  }

  // Material 3: Audio de Listening C1 (Teacher 1)
  let materialAudioC1 = await prisma.material.findFirst({
    where: { title: 'Listening C1: Conference on Climate Economics', teacherId: teacher1.id }
  });
  if (!materialAudioC1) {
    materialAudioC1 = await prisma.material.create({
      data: {
        title: 'Listening C1: Conference on Climate Economics',
        description: 'Grabación de una ponencia sobre transición energética y economía circular.',
        type: MaterialType.AUDIO,
        level: Level.C1,
        category: SkillCategory.LISTENING,
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        teacherId: teacher1.id
      }
    });
  }

  // Material 4: Vídeo A2 (Teacher 2)
  let materialVideoA2 = await prisma.material.findFirst({
    where: { title: 'Present Simple vs Continuous en 8 Minutos', teacherId: teacher2.id }
  });
  if (!materialVideoA2) {
    materialVideoA2 = await prisma.material.create({
      data: {
        title: 'Present Simple vs Continuous en 8 Minutos',
        description: 'Vídeo dinámico para aprender cuándo usar cada tiempo verbal con ejemplos claros.',
        type: MaterialType.VIDEO,
        level: Level.A2,
        category: SkillCategory.GRAMMAR_VOCABULARY,
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        teacherId: teacher2.id
      }
    });
  }

  // Material 5: Form A2 Quiz (Teacher 2)
  let materialFormA2 = await prisma.material.findFirst({
    where: { title: 'A2 Quiz: Rutinas Diarias y Hábitos', teacherId: teacher2.id }
  });
  if (!materialFormA2) {
    materialFormA2 = await prisma.material.create({
      data: {
        title: 'A2 Quiz: Rutinas Diarias y Hábitos',
        description: 'Test sencillo de repaso de vocabulario de la mañana y la tarde.',
        type: MaterialType.FORM,
        level: Level.A2,
        category: SkillCategory.GRAMMAR_VOCABULARY,
        teacherId: teacher2.id,
        formData: {
          questions: [
            {
              id: 'a2-q1',
              questionText: '1. She ________ up at seven o\'clock every morning.',
              type: 'MULTIPLE_CHOICE',
              options: ['wake', 'wakes', 'waking'],
              correctAnswer: 1,
              points: 3
            },
            {
              id: 'a2-q2',
              questionText: '2. True or False: We use "do" with "He", "She" and "It".',
              type: 'TRUE_FALSE',
              options: ['True', 'False'],
              correctAnswer: 1,
              points: 3
            },
            {
              id: 'a2-q3',
              questionText: '3. What is the opposite of "always"?',
              type: 'SHORT_ANSWER',
              correctAnswer: 'never',
              points: 4
            }
          ]
        }
      }
    });
  }

  console.log('✔ Materiales didácticos creados (Tests, PDFs, Audios y Vídeos).');

  // ==========================================
  // 10. TAREAS Y ENTREGAS (ASSIGNMENTS & SUBMISSIONS)
  // ==========================================
  console.log('--- Configurando Tareas, Exámenes y Calificaciones ---');

  // Tarea 1: Examen B2 (Course 1, Teacher 1)
  let assignment1 = await prisma.assignment.findFirst({
    where: { title: 'Simulacro B2 First: Listening & Reading', courseId: course1.id }
  });
  if (!assignment1) {
    const due = new Date();
    due.setDate(due.getDate() + 5);
    assignment1 = await prisma.assignment.create({
      data: {
        title: 'Simulacro B2 First: Listening & Reading',
        description: 'Completad el examen interactivo antes del viernes. Se corrige automáticamente.',
        category: SkillCategory.MOCK_EXAM,
        dueDate: due,
        teacherId: teacher1.id,
        courseId: course1.id,
        materialId: materialFormB2.id
      }
    });
  }

  // Entregas de Tarea 1:
  // Mateo: corregido con nota 8.0 y feedback
  await prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId: assignment1.id, studentId: student2.id } },
    update: { grade: 8.0, feedback: '¡Gran trabajo Mateo! Muy buena comprensión general, repasa los distractores del ejercicio 1.' },
    create: {
      assignmentId: assignment1.id,
      studentId: student2.id,
      content: 'Examen completado en el reproductor interactivo.',
      formId: materialFormB2.id,
      grade: 8.0,
      feedback: '¡Gran trabajo Mateo! Muy buena comprensión general, repasa los distractores del ejercicio 1.',
      submittedAt: new Date('2026-09-02T16:30:00.000Z')
    }
  });

  // Álex (Independiente): corregido con nota 10.0 y feedback
  await prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId: assignment1.id, studentId: studentIndependent.id } },
    update: { grade: 10.0, feedback: '¡Impecable Álex! Puntuación perfecta en todos los apartados.' },
    create: {
      assignmentId: assignment1.id,
      studentId: studentIndependent.id,
      content: 'Examen completado sin errores.',
      formId: materialFormB2.id,
      grade: 10.0,
      feedback: '¡Impecable Álex! Puntuación perfecta en todos los apartados.',
      submittedAt: new Date('2026-09-03T11:00:00.000Z')
    }
  });

  // Tarea 2: Redacción B2 (Course 1, Teacher 1)
  let assignment2 = await prisma.assignment.findFirst({
    where: { title: 'B2 Essay: The Impact of Artificial Intelligence on Jobs', courseId: course1.id }
  });
  if (!assignment2) {
    const due = new Date();
    due.setDate(due.getDate() + 3);
    assignment2 = await prisma.assignment.create({
      data: {
        title: 'B2 Essay: The Impact of Artificial Intelligence on Jobs',
        description: 'Escribir un ensayo de entre 140 y 190 palabras siguiendo las pautas de la guía.',
        category: SkillCategory.WRITING,
        dueDate: due,
        teacherId: teacher1.id,
        courseId: course1.id,
        materialId: materialDocB2.id
      }
    });
  }

  // Entrega de Mateo: PENDIENTE DE CALIFICAR (grade: null) -> para probar "Calificar" en el panel del profesor
  await prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId: assignment2.id, studentId: student2.id } },
    update: { grade: null, feedback: null },
    create: {
      assignmentId: assignment2.id,
      studentId: student2.id,
      content: 'In contemporary society, artificial intelligence has emerged as one of the most prominent technological breakthroughs. While some critics argue that automation could displace routine employment, historical evidence indicates that technological evolution frequently generates novel industries. In conclusion, adaptation and continuous education will be crucial for the upcoming generation of workers.',
      grade: null,
      feedback: null,
      submittedAt: new Date('2026-09-07T18:45:00.000Z')
    }
  });

  // Tarea 3: Cuestionario A2 Rutinas (Course 2, Teacher 2)
  let assignment3 = await prisma.assignment.findFirst({
    where: { title: 'A2 Test: Rutinas Diarias', courseId: course2.id }
  });
  if (!assignment3) {
    const due = new Date();
    due.setDate(due.getDate() + 4);
    assignment3 = await prisma.assignment.create({
      data: {
        title: 'A2 Test: Rutinas Diarias',
        description: 'Responded a las preguntas del cuestionario interactivo sobre hábitos diarios.',
        category: SkillCategory.GRAMMAR_VOCABULARY,
        dueDate: due,
        teacherId: teacher2.id,
        courseId: course2.id,
        materialId: materialFormA2.id
      }
    });
  }

  // Entrega de Hugo (Hijo Único): calificado con 7.0
  await prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId: assignment3.id, studentId: student1.id } },
    update: { grade: 7.0, feedback: '¡Bien resuelto Hugo! Cuidado con la conjugación en tercera persona.' },
    create: {
      assignmentId: assignment3.id,
      studentId: student1.id,
      content: 'Test completado.',
      formId: materialFormA2.id,
      grade: 7.0,
      feedback: '¡Bien resuelto Hugo! Cuidado con la conjugación en tercera persona.',
      submittedAt: new Date('2026-09-04T17:15:00.000Z')
    }
  });

  // Entrega de Sofía (Hermana Menor): calificado con 10.0
  await prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId: assignment3.id, studentId: student3.id } },
    update: { grade: 10.0, feedback: '¡Excelente Sofía! Todo el vocabulario dominado al 100%.' },
    create: {
      assignmentId: assignment3.id,
      studentId: student3.id,
      content: 'Test completado con puntuación máxima.',
      formId: materialFormA2.id,
      grade: 10.0,
      feedback: '¡Excelente Sofía! Todo el vocabulario dominado al 100%.',
      submittedAt: new Date('2026-09-04T18:00:00.000Z')
    }
  });

  console.log('✔ Tareas y entregas (corregidas y pendientes de corrección) preparadas.');

  // ==========================================
  // 11. EVALUACIONES FINALES POR COMPETENCIAS (FINAL EVALUATIONS)
  // ==========================================
  console.log('--- Configurando Evaluaciones por Competencias CEFR ---');

  const upsertFinalEvaluation = async (data: {
    studentId: string;
    grammar: number;
    reading: number;
    writing: number;
    listening: number;
    speaking: number;
    overallGrade: number;
    observations: string;
  }) => {
    return prisma.finalEvaluation.upsert({
      where: { studentId: data.studentId },
      update: data,
      create: data
    });
  };

  // Mateo (Hermano Mayor - B2)
  await upsertFinalEvaluation({
    studentId: student2.id,
    grammar: 8.0,
    reading: 8.5,
    writing: 7.5,
    listening: 8.5,
    speaking: 8.0,
    overallGrade: 8.1,
    observations: 'Mateo demuestra un dominio consistente del nivel B2. Participa activamente en los debates y muestra gran soltura en comprensión auditiva.'
  });

  // Hugo (Hijo Único - A2)
  await upsertFinalEvaluation({
    studentId: student1.id,
    grammar: 7.0,
    reading: 7.0,
    writing: 6.5,
    listening: 7.5,
    speaking: 7.0,
    overallGrade: 7.0,
    observations: 'Hugo avanza a buen ritmo. Le gusta interactuar en inglés en el aula presencial. Conviene reforzar la ortografía y redacción básica.'
  });

  // Sofía (Hermana Menor - A2)
  await upsertFinalEvaluation({
    studentId: student3.id,
    grammar: 9.0,
    reading: 9.5,
    writing: 8.5,
    listening: 9.0,
    speaking: 9.0,
    overallGrade: 9.0,
    observations: 'Sofía muestra una facilidad innata y gran motivación en las clases online. Su pronunciación y comprensión lectora son sobresalientes.'
  });

  // Álex (Independiente - C1)
  await upsertFinalEvaluation({
    studentId: studentIndependent.id,
    grammar: 9.5,
    reading: 9.5,
    writing: 9.0,
    listening: 9.5,
    speaking: 9.0,
    overallGrade: 9.3,
    observations: 'Nivel avanzado muy sólido. Vocabulario técnico y precisión comunicativa adecuada para certificaciones de nivel superior (C1/C2).'
  });

  console.log('✔ Evaluaciones CEFR registradas.');

  // ==========================================
  // 12. MENSAJERÍA DIRECTA / CHAT PRIVADO
  // ==========================================
  console.log('--- Creando Hilos de Chat Contextuales ---');

  // Limpiar mensajes antiguos de prueba entre estos usuarios para no duplicar en re-ejecución
  const userIds = [teacher1.id, teacher2.id, parent1.id, parent2.id, student1.id, student2.id, student3.id, studentIndependent.id];
  await prisma.chatMessage.deleteMany({
    where: {
      OR: [
        { senderId: { in: userIds } },
        { recipientId: { in: userIds } }
      ]
    }
  });

  // Hilo 1: Padre 1 (Marcos) ↔ Profesor 1 (Carlos) sobre Hugo (studentId: student1.id)
  await prisma.chatMessage.createMany({
    data: [
      {
        senderId: parent1.id,
        recipientId: teacher1.id,
        studentId: student1.id,
        content: 'Buenos días Carlos, le escribo para consultar qué tal ve la adaptación de Hugo a las clases de este mes.',
        createdAt: new Date('2026-09-05T09:30:00.000Z')
      },
      {
        senderId: teacher1.id,
        recipientId: parent1.id,
        studentId: student1.id,
        content: '¡Hola Marcos! Hugo está muy participativo y tiene un oído fantástico para el listening. Elena y yo estamos muy contentos con su actitud.',
        createdAt: new Date('2026-09-05T10:15:00.000Z')
      }
    ]
  });

  // Hilo 2: Madre 2 (Lucía) ↔ Profesor 1 (Carlos) sobre Mateo (Hermano Mayor)
  await prisma.chatMessage.createMany({
    data: [
      {
        senderId: parent2.id,
        recipientId: teacher1.id,
        studentId: student2.id,
        content: 'Hola Carlos, ¿crees que Mateo estará listo para presentarse a la convocatoria oficial de Cambridge B2?',
        createdAt: new Date('2026-09-06T12:00:00.000Z')
      },
      {
        senderId: teacher1.id,
        recipientId: parent2.id,
        studentId: student2.id,
        content: 'Totalmente Lucía. Sus simulacros están por encima del 80%. Solo necesita pulir la estructura formal del Essay y estará más que preparado.',
        createdAt: new Date('2026-09-06T12:45:00.000Z')
      }
    ]
  });

  // Hilo 3: Madre 2 (Lucía) ↔ Profesora 2 (Elena) sobre Sofía (Hermana Menor)
  await prisma.chatMessage.createMany({
    data: [
      {
        senderId: teacher2.id,
        recipientId: parent2.id,
        studentId: student3.id,
        content: 'Buenas tardes Lucía, solo quería felicitarte por el examen de Sofía de esta tarde, ha sacado un 10 perfecto.',
        createdAt: new Date('2026-09-06T18:10:00.000Z')
      },
      {
        senderId: parent2.id,
        recipientId: teacher2.id,
        studentId: student3.id,
        content: '¡Qué gran noticia Elena! Le encanta tu clase online y las canciones en inglés que ponéis.',
        createdAt: new Date('2026-09-06T18:30:00.000Z')
      }
    ]
  });

  // Hilo 4: Alumno Independiente (Álex) ↔ Profesor 1 (Carlos) directo
  await prisma.chatMessage.createMany({
    data: [
      {
        senderId: studentIndependent.id,
        recipientId: teacher1.id,
        content: 'Hola Carlos, ¿tienes algún artículo de opinión o podcast que me recomiendes para enriquecer vocabulario de C1?',
        createdAt: new Date('2026-09-07T10:00:00.000Z')
      },
      {
        senderId: teacher1.id,
        recipientId: studentIndependent.id,
        content: 'Hola Álex, te he subido a la biblioteca el audio sobre transición energética. Escúchalo y el martes lo comentamos.',
        createdAt: new Date('2026-09-07T10:20:00.000Z')
      }
    ]
  });

  console.log('✔ Hilos de chat contextuales creados.');

  // ==========================================
  // 13. TAREA ESTRUCTURADA PASO A PASO (STRUCTURED TASK)
  // ==========================================
  console.log('--- Creando Tarea Estructurada Multi-Paso ---');

  let structuredTask = await prisma.structuredTask.findFirst({
    where: { title: 'Módulo Intensivo: Conditionals & Writing B2', courseId: course1.id }
  });

  if (!structuredTask) {
    structuredTask = await prisma.structuredTask.create({
      data: {
        title: 'Módulo Intensivo: Conditionals & Writing B2',
        courseId: course1.id,
        teacherId: teacher1.id,
        assignmentType: StructuredTaskAssignmentType.CLASS,
        isSequential: true,
        steps: {
          create: [
            {
              order: 1,
              title: 'Paso 1: Vídeo explicativo de estructuras condicionales',
              materialId: materialVideoA2.id
            },
            {
              order: 2,
              title: 'Paso 2: Lectura de la Guía Oficial de Redacción y Conectores',
              materialId: materialDocB2.id
            },
            {
              order: 3,
              title: 'Paso 3: Cuestionario de consolidación de conceptos',
              materialId: materialFormB2.id
            }
          ]
        }
      },
      include: { steps: true }
    });
  }

  // Progreso de Mateo en la tarea estructurada (Pasos 1 y 2 completados, Paso 3 pendiente)
  const steps = await prisma.structuredTaskStep.findMany({
    where: { taskId: structuredTask.id },
    orderBy: { order: 'asc' }
  });

  if (steps.length >= 2) {
    await prisma.structuredTaskStepProgress.upsert({
      where: { stepId_studentId: { stepId: steps[0].id, studentId: student2.id } },
      update: {},
      create: { stepId: steps[0].id, studentId: student2.id, completedAt: new Date('2026-09-06T11:00:00.000Z') }
    });

    await prisma.structuredTaskStepProgress.upsert({
      where: { stepId_studentId: { stepId: steps[1].id, studentId: student2.id } },
      update: {},
      create: { stepId: steps[1].id, studentId: student2.id, completedAt: new Date('2026-09-06T11:30:00.000Z') }
    });
  }

  console.log('✔ Tarea estructurada multi-paso y progresos asignados.');

  console.log('\n===========================================================');
  console.log('🎉 SEED COMPLETADO CON ÉXITO — CASOS DE PRUEBA LISTOS');
  console.log('===========================================================');
  console.log('Contraseña universal para todas las cuentas: 1234\n');
  console.log('1. PROFESORES:');
  console.log('   - profesor1@hitschool.com (Carlos - B2/C1)');
  console.log('   - profesor2@hitschool.com (Elena - A2/Infantil)');
  console.log('2. PADRE 1 (1 Hijo):');
  console.log('   - padre.unhijo@hitschool.com (Marcos)');
  console.log('   └─ Hijo: hijo.unico@hitschool.com (Hugo - 35€/mes, Presencial)');
  console.log('3. PADRE 2 (2 Hijos - Hermanos):');
  console.log('   - padre.doshijos@hitschool.com (Lucía)');
  console.log('   ├─ Hermano Mayor: hermano.mayor@hitschool.com (Mateo - 65€/mes, Presencial)');
  console.log('   └─ Hermana Menor: hermano.menor@hitschool.com (Sofía - 35€/mes, Online)');
  console.log('4. ALUMNO INDEPENDIENTE (Sin Padre/Tutor):');
  console.log('   - alumno.independiente@hitschool.com (Álex - 65€/mes, Online)');
  console.log('===========================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error al ejecutar seed de pruebas:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient, Role, UserStatus, Modality } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  console.log('Inserting test data...');

  // 1. Teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'profesor@test.com' },
    update: {},
    create: {
      email: 'profesor@test.com',
      passwordHash,
      role: Role.TEACHER,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          firstName: 'Profesor',
          lastName: 'Prueba',
          dni: '12345678T',
          phone: '600100100',
        },
      },
    },
  });
  console.log('Created teacher:', teacher.email);

  // 2. Parents
  const parent1 = await prisma.user.upsert({
    where: { email: 'padre1@test.com' },
    update: {},
    create: {
      email: 'padre1@test.com',
      passwordHash,
      role: Role.PARENT,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          firstName: 'Padre',
          lastName: 'Ejemplar',
          dni: '11111111A',
          phone: '611111111',
        },
      },
    },
  });
  console.log('Created parent:', parent1.email);

  const parent2 = await prisma.user.upsert({
    where: { email: 'madre2@test.com' },
    update: {},
    create: {
      email: 'madre2@test.com',
      passwordHash,
      role: Role.PARENT,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          firstName: 'Madre',
          lastName: 'Fantástica',
          dni: '22222222B',
          phone: '622222222',
        },
      },
    },
  });
  console.log('Created parent:', parent2.email);

  // 3. Students with parents
  const studentWithParent1 = await prisma.user.upsert({
    where: { email: 'hijo1@test.com' },
    update: {},
    create: {
      email: 'hijo1@test.com',
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      modality: Modality.PRESENCIAL,
      parentId: parent1.id,
      profile: {
        create: {
          firstName: 'Hijo',
          lastName: 'de Ejemplar',
          dni: '33333333C',
        },
      },
      academyEnrollments: {
        create: {
          startDate: new Date('2023-09-01'),
          monthlyFee: 35,
        }
      }
    },
  });
  console.log('Created student with parent:', studentWithParent1.email);

  const studentWithParent2 = await prisma.user.upsert({
    where: { email: 'hija2@test.com' },
    update: {},
    create: {
      email: 'hija2@test.com',
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      modality: Modality.ONLINE,
      parentId: parent2.id,
      profile: {
        create: {
          firstName: 'Hija',
          lastName: 'de Fantástica',
          dni: '44444444D',
        },
      },
      academyEnrollments: {
        create: {
          startDate: new Date('2023-10-01'),
          monthlyFee: 35,
        }
      }
    },
  });
  console.log('Created student with parent:', studentWithParent2.email);

  // 4. Students without parents
  const studentAlone1 = await prisma.user.upsert({
    where: { email: 'alumno1@test.com' },
    update: {},
    create: {
      email: 'alumno1@test.com',
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      modality: Modality.HIBRIDO,
      profile: {
        create: {
          firstName: 'Alumno',
          lastName: 'Solitario',
          dni: '55555555E',
        },
      },
      academyEnrollments: {
        create: {
          startDate: new Date('2024-01-01'),
          monthlyFee: 65,
        }
      }
    },
  });
  console.log('Created student without parent:', studentAlone1.email);

  const studentAlone2 = await prisma.user.upsert({
    where: { email: 'alumno2@test.com' },
    update: {},
    create: {
      email: 'alumno2@test.com',
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.INACTIVE, // Baja
      modality: Modality.PRESENCIAL,
      profile: {
        create: {
          firstName: 'Alumno',
          lastName: 'Independiente',
          dni: '66666666F',
        },
      },
      academyEnrollments: {
        create: {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-06-01'),
          monthlyFee: 35,
        }
      }
    },
  });
  console.log('Created student without parent (inactive):', studentAlone2.email);

  console.log('Data seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

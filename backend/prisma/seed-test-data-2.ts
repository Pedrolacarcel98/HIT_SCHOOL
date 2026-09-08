import { PrismaClient, Role, UserStatus, Modality } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  console.log('Inserting second child for Padre Ejemplar...');

  // Get the first parent
  const parent1 = await prisma.user.findUnique({
    where: { email: 'padre1@test.com' }
  });

  if (!parent1) {
    console.log('Padre Ejemplar not found');
    return;
  }

  // Create second child
  const secondChild = await prisma.user.upsert({
    where: { email: 'hijo2_ejemplar@test.com' },
    update: {},
    create: {
      email: 'hijo2_ejemplar@test.com',
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      modality: Modality.PRESENCIAL,
      parentId: parent1.id,
      profile: {
        create: {
          firstName: 'Segundo Hijo',
          lastName: 'de Ejemplar',
          dni: '33333334C',
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

  console.log('Created second child for parent:', secondChild.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

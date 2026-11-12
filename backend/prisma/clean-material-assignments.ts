import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.materialAssignment.count();
  const materialsBefore = await prisma.material.count();
  const deleted = await prisma.materialAssignment.deleteMany();
  const after = await prisma.materialAssignment.count();
  const materialsAfter = await prisma.material.count();

  console.log(`Asignaciones de materiales: ${before} -> ${after} (eliminadas: ${deleted.count})`);
  console.log(`Materiales conservados: ${materialsBefore} -> ${materialsAfter}`);
}

main()
  .catch((error) => {
    console.error('Error al eliminar asignaciones de materiales:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
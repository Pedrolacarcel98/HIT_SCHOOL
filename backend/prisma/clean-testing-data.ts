import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const before = {
    assignments: await prisma.assignment.count(),
    structuredTasks: await prisma.structuredTask.count(),
    submissions: await prisma.submission.count(),
    deliveries: await prisma.taskDelivery.count(),
    progress: await prisma.structuredTaskStepProgress.count(),
    taskStudents: await prisma.structuredTaskStudent.count(),
    termGrades: await prisma.termGrade.count(),
    posts: await prisma.post.count(),
    materials: await prisma.material.count(),
    materialAssignments: await prisma.materialAssignment.count()
  };

  await prisma.$transaction(async (tx) => {
    await tx.submission.deleteMany();
    await tx.taskDelivery.deleteMany();
    await tx.structuredTaskStepProgress.deleteMany();
    await tx.structuredTaskStudent.deleteMany();
    await tx.assignment.deleteMany();
    await tx.structuredTaskStep.deleteMany();
    await tx.structuredTask.deleteMany();
    await tx.termGrade.deleteMany();
    await tx.post.deleteMany();
  });

  const after = {
    assignments: await prisma.assignment.count(),
    structuredTasks: await prisma.structuredTask.count(),
    submissions: await prisma.submission.count(),
    deliveries: await prisma.taskDelivery.count(),
    progress: await prisma.structuredTaskStepProgress.count(),
    taskStudents: await prisma.structuredTaskStudent.count(),
    termGrades: await prisma.termGrade.count(),
    posts: await prisma.post.count(),
    materials: await prisma.material.count(),
    materialAssignments: await prisma.materialAssignment.count()
  };

  console.log('Datos eliminados:');
  console.log(`- Assignments: ${before.assignments} -> ${after.assignments}`);
  console.log(`- Tareas estructuradas: ${before.structuredTasks} -> ${after.structuredTasks}`);
  console.log(`- Entregas: ${before.submissions} + ${before.deliveries} -> ${after.submissions} + ${after.deliveries}`);
  console.log(`- Progreso de pasos: ${before.progress} -> ${after.progress}`);
  console.log(`- Relaciones alumno-tarea: ${before.taskStudents} -> ${after.taskStudents}`);
  console.log(`- Calificaciones trimestrales: ${before.termGrades} -> ${after.termGrades}`);
  console.log(`- Posts del tablón: ${before.posts} -> ${after.posts}`);
  console.log('Datos conservados:');
  console.log(`- Materiales: ${before.materials} -> ${after.materials}`);
  console.log(`- Asignaciones de materiales: ${before.materialAssignments} -> ${after.materialAssignments}`);
}

main()
  .catch((error) => {
    console.error('Error al limpiar los datos de pruebas:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
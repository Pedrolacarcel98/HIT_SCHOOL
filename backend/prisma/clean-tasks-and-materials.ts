import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Limpiando tareas, materiales, entregas y plantillas...');

  const delSubmissions = await prisma.submission.deleteMany();
  const delDeliveries = await prisma.taskDelivery.deleteMany();
  const delProgress = await prisma.structuredTaskStepProgress.deleteMany();
  const delTaskStudents = await prisma.structuredTaskStudent.deleteMany();
  const delAssignments = await prisma.assignment.deleteMany();
  const delSteps = await prisma.structuredTaskStep.deleteMany();
  const delTasks = await prisma.structuredTask.deleteMany();
  const delMatAssignments = await prisma.materialAssignment.deleteMany();
  const delMaterials = await prisma.material.deleteMany();
  const delTermGrades = await prisma.termGrade.deleteMany();
  const delPosts = await prisma.post.deleteMany();

  console.log(`✔ Submissions eliminadas: ${delSubmissions.count}`);
  console.log(`✔ TaskDeliveries eliminadas: ${delDeliveries.count}`);
  console.log(`✔ Progreso de pasos eliminado: ${delProgress.count}`);
  console.log(`✔ Alumnos de tareas eliminados: ${delTaskStudents.count}`);
  console.log(`✔ Assignments eliminados: ${delAssignments.count}`);
  console.log(`✔ Pasos eliminados: ${delSteps.count}`);
  console.log(`✔ Tareas estructuradas y plantillas eliminadas: ${delTasks.count}`);
  console.log(`✔ Asignaciones de material eliminadas: ${delMatAssignments.count}`);
  console.log(`✔ Materiales eliminados: ${delMaterials.count}`);
  console.log(`✔ Calificaciones trimestrales eliminadas: ${delTermGrades.count}`);
  console.log(`✔ Posts de tablón eliminados: ${delPosts.count}`);

  const userCount = await prisma.user.count();
  const courseCount = await prisma.course.count();
  const enrollmentCount = await prisma.enrollment.count();

  console.log('\n📊 Estado resultante:');
  console.log(`- Usuarios activos: ${userCount}`);
  console.log(`- Cursos/Clases activas: ${courseCount}`);
  console.log(`- Alumnos matriculados en cursos: ${enrollmentCount}`);
  console.log(`- Materiales en repositorio: ${await prisma.material.count()} (Limpio)`);
  console.log(`- Tareas y plantillas: ${await prisma.structuredTask.count()} (Limpio)`);
  console.log(`- Entregas: ${await prisma.taskDelivery.count()} (Limpio)`);
}

main()
  .catch((e) => {
    console.error('Error al limpiar:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

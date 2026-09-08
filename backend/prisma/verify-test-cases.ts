import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Verificando datos insertados en la base de datos...');

  const emails = [
    'profesor1@hitschool.com',
    'profesor2@hitschool.com',
    'padre.unhijo@hitschool.com',
    'padre.doshijos@hitschool.com',
    'hijo.unico@hitschool.com',
    'hermano.mayor@hitschool.com',
    'hermano.menor@hitschool.com',
    'alumno.independiente@hitschool.com'
  ];

  for (const email of emails) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        parent: { select: { email: true } },
        children: { select: { email: true } },
        academyEnrollments: true,
        enrollments: { include: { course: true } },
        paymentStatuses: true,
        submissions: true
      }
    });

    if (!user) {
      console.error(`❌ Usuario no encontrado: ${email}`);
      continue;
    }

    const passMatch = await bcrypt.compare('1234', user.passwordHash);
    console.log(`\n========================================`);
    console.log(`👤 ${user.profile?.firstName} ${user.profile?.lastName} (${user.email})`);
    console.log(`   Rol: ${user.role} | Estado: ${user.status} | Contraseña '1234' válida: ${passMatch ? 'SÍ ✔' : 'NO ❌'}`);
    if (user.parent) {
      console.log(`   Tutor/Padre: ${user.parent.email}`);
    }
    if (user.children.length > 0) {
      console.log(`   Hijos asignados (${user.children.length}): ${user.children.map(c => c.email).join(', ')}`);
    }
    if (user.academyEnrollments.length > 0) {
      console.log(`   Cuota mensual: ${user.academyEnrollments[0].monthlyFee}€/mes`);
    }
    if (user.enrollments.length > 0) {
      console.log(`   Cursos inscritos: ${user.enrollments.map(e => e.course.title).join(' | ')}`);
    }
    if (user.paymentStatuses.length > 0) {
      const paid = user.paymentStatuses.filter(p => p.isPaid).length;
      const pending = user.paymentStatuses.filter(p => !p.isPaid).length;
      console.log(`   Mensualidades: ${paid} pagadas, ${pending} pendientes/vencidas`);
    }
    if (user.submissions.length > 0) {
      console.log(`   Entregas realizadas: ${user.submissions.length}`);
    }
  }

  // Verificar hilos de chat
  const chatCount = await prisma.chatMessage.count();
  console.log(`\n💬 Mensajes de chat en el sistema: ${chatCount}`);

  // Verificar tareas estructuradas
  const taskCount = await prisma.structuredTask.count();
  console.log(`📋 Tareas estructuradas en el sistema: ${taskCount}`);
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

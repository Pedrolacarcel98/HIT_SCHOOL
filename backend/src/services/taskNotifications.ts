import { PrismaClient, StructuredTaskAssignmentType } from '@prisma/client';
import { sendStructuredTaskNotification } from './email';

const prisma = new PrismaClient();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
let processing = false;

type Recipient = { email: string; firstName: string };

const addRecipient = (recipients: Map<string, Recipient>, user: any, teacherId: string | null) => {
  if (!user || user.status !== 'ACTIVE' || user.id === teacherId) return;
  const email = user.email.trim().toLowerCase();
  if (!email) return;
  recipients.set(email, { email: user.email, firstName: user.profile?.firstName || 'usuario' });
};

const processTask = async (task: any) => {
  const recipients = new Map<string, Recipient>();
  const students = task.assignmentType === StructuredTaskAssignmentType.CLASS
    ? (task.course?.enrollments || []).map((enrollment: any) => enrollment.student)
    : [task.assignedStudent, ...(task.assignedStudents || []).map((item: any) => item.student)];

  for (const student of students) {
    addRecipient(recipients, student, task.teacherId);
    addRecipient(recipients, student?.parent, task.teacherId);
  }

  const courseTitle = task.course?.title || 'tu espacio de tareas';
  const teacherName = `${task.teacher?.profile?.firstName || ''} ${task.teacher?.profile?.lastName || ''}`.trim() || task.teacher?.email || 'tu profesor';
  const taskUrl = task.courseId
    ? `${frontendUrl}/student/course/${task.courseId}?tab=classwork`
    : `${frontendUrl}/student/courses`;
  const results = await Promise.allSettled(Array.from(recipients.values()).map((recipient) => sendStructuredTaskNotification(
    recipient.email,
    recipient.firstName,
    task.title,
    task.description || '',
    courseTitle,
    teacherName,
    task.dueDate,
    taskUrl
  )));
  const failures = results.filter((result) => result.status === 'rejected');

  if (failures.length > 0) {
    console.error(`No se pudieron enviar ${failures.length} notificaciones de la tarea ${task.id}:`, failures.map((result: any) => result.reason));
    return false;
  }

  await prisma.structuredTask.update({
    where: { id: task.id, notificationSentAt: null },
    data: { notificationSentAt: new Date() }
  });
  return true;
};

export const processPendingTaskNotifications = async () => {
  if (processing) return;
  processing = true;

  try {
  const now = new Date();
  const tasks = await prisma.structuredTask.findMany({
    where: {
      isTemplate: false,
      notificationSentAt: null,
      OR: [{ publishAt: null }, { publishAt: { lte: now } }]
    },
    include: {
      teacher: { include: { profile: true } },
      course: {
        include: {
          enrollments: {
            include: {
              student: { include: { profile: true, parent: { include: { profile: true } } } }
            }
          }
        }
      },
      assignedStudent: { include: { profile: true, parent: { include: { profile: true } } } },
      assignedStudents: {
        include: { student: { include: { profile: true, parent: { include: { profile: true } } } } }
      }
    },
    orderBy: { createdAt: 'asc' },
    take: 20
  });

  for (const task of tasks) {
    await processTask(task);
  }
  } finally {
    processing = false;
  }
};
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireTeacher } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: any;
}

// ==========================================
// Dashboard Teacher
// ==========================================
router.get('/teacher', authenticateToken, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const activeStudents = await prisma.user.count({
      where: { role: 'STUDENT', status: 'ACTIVE' }
    });

    const activeCourses = await prisma.course.count();

    const unscoredSubmissions = await prisma.submission.count({
      where: {
        grade: null
      }
    });

    // Overdue payments roughly (isPaid false, dueDate in past)
    const overduePayments = await prisma.paymentStatus.count({
      where: {
        isPaid: false,
        dueDate: {
          lt: new Date()
        }
      }
    });

    const latestSubmissions = await prisma.submission.findMany({
      where: { grade: null },
      orderBy: { submittedAt: 'desc' },
      take: 5,
      include: {
        student: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
        assignment: {
          include: {
            course: { select: { title: true } }
          }
        }
      }
    });

    res.json({
      activeStudents,
      activeCourses,
      unscoredSubmissions,
      overduePayments,
      latestSubmissions: latestSubmissions.map(sub => ({
        id: sub.id,
        assignmentId: sub.assignmentId,
        studentName: sub.student?.profile ? `${sub.student.profile.firstName} ${sub.student.profile.lastName}`.trim() : 'Alumno',
        taskTitle: (sub as any).assignment?.title || 'Tarea',
        courseTitle: (sub as any).assignment?.course?.title || 'Curso',
        submittedAt: sub.submittedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching teacher dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// Dashboard Student / Parent
// ==========================================
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user!.role;
    let studentsToFetch = [];

    if (userRole === 'PARENT') {
      const userEmail = (req.user as any)?.email || '';
      const children = await prisma.user.findMany({
        where: {
          role: 'STUDENT',
          OR: [
            { parentId: req.user!.id },
            { parent: { email: { equals: userEmail, mode: 'insensitive' } } }
          ]
        },
        include: { profile: true }
      });
      studentsToFetch = children;
    } else {
      const student = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { profile: true }
      });
      if (student) studentsToFetch.push(student);
    }

    const dashboardData = await Promise.all(studentsToFetch.map(async (student) => {
      // 1. Payments Summary
      let pendingPaymentsCount = 0;
      let nextDueDate: Date | null = null;
      let hasParent = !!student.parentId;

      if (!hasParent || userRole === 'PARENT') {
        const payments = await prisma.paymentStatus.findMany({
          where: { studentId: student.id, isPaid: false }
        });
        pendingPaymentsCount = payments.length;
        const upcoming = payments
          .filter(p => p.dueDate)
          .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
        if (upcoming.length > 0) nextDueDate = upcoming[0].dueDate;
      }

      // 2. Pending Assignments
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: student.id },
        select: { courseId: true }
      });
      const courseIds = enrollments.map(e => e.courseId);

      const tasks = await prisma.assignment.findMany({
        where: {
          OR: [
            { studentId: student.id },
            { courseId: { in: courseIds } }
          ]
        },
        include: {
          course: { select: { title: true } },
          submissions: { where: { studentId: student.id } }
        }
      });

      let pendingTasksCount = 0;
      const upcomingTasks = [];

      for (const t of tasks) {
        const sub = t.submissions[0];
        if (!sub) {
          pendingTasksCount++;
          if (t.dueDate) upcomingTasks.push({ id: t.id, title: t.title, course: t.course?.title || 'General', deadline: t.dueDate });
        }
      }

      upcomingTasks.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

      // 3. Grades
      const gradesData = await prisma.submission.findMany({
        where: { studentId: student.id, grade: { not: null } },
        include: { assignment: { include: { course: { select: { title: true } } } } }
      });

      const courseGrades: Record<string, { total: number, count: number }> = {};
      gradesData.forEach(g => {
        if (!g.assignment?.course?.title) return;
        const title = g.assignment.course.title;
        if (!courseGrades[title]) courseGrades[title] = { total: 0, count: 0 };
        courseGrades[title].total += g.grade!;
        courseGrades[title].count++;
      });

      const averages = Object.keys(courseGrades).map(title => ({
        courseTitle: title,
        average: courseGrades[title].total / courseGrades[title].count
      }));

      return {
        student: {
          id: student.id,
          name: student.profile ? `${student.profile.firstName} ${student.profile.lastName}`.trim() : 'Alumno'
        },
        hasParent,
        payments: {
          pendingCount: pendingPaymentsCount,
          nextDueDate
        },
        assignments: {
          pendingCount: pendingTasksCount,
          upcoming: upcomingTasks.slice(0, 3)
        },
        grades: averages
      };
    }));

    res.json({ data: dashboardData });

  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

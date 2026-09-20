import { useCallback, useEffect, useMemo, useState } from 'react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type LearningNotifications = {
  hasNewGrades: boolean;
  hasNewTasks: boolean;
  newTaskCourseIds: string[];
  markGradesSeen: () => void;
  markTasksSeen: () => void;
  markCourseTasksSeen: (courseId: string) => void;
};

const getStorageKey = (suffix: string) => {
  const userId = localStorage.getItem('userId') || 'anonymous';
  const role = localStorage.getItem('userRole') || 'UNKNOWN';
  return `hit_learning_notifications:${role}:${userId}:${suffix}`;
};

const readSeenAt = (suffix: string) => Number(localStorage.getItem(getStorageKey(suffix)) || 0);
const writeSeenAt = (suffix: string, value: number) => localStorage.setItem(getStorageKey(suffix), String(value));
const timestamp = (value?: string | null) => value ? new Date(value).getTime() || 0 : 0;

const getLatestTaskData = (tasks: Array<{ courseId?: string | null; createdAt?: string; updatedAt?: string }>) => {
  const byCourse: Record<string, number> = {};
  let latest = 0;

  tasks.forEach((task) => {
    const taskTime = Math.max(timestamp(task.updatedAt), timestamp(task.createdAt));
    latest = Math.max(latest, taskTime);
    if (task.courseId) byCourse[task.courseId] = Math.max(byCourse[task.courseId] || 0, taskTime);
  });

  return { latest, byCourse };
};

export const useLearningNotifications = (targetStudentId?: string | null): LearningNotifications => {
  const [latestGrades, setLatestGrades] = useState(0);
  const [latestTasks, setLatestTasks] = useState(0);
  const [taskTimesByCourse, setTaskTimesByCourse] = useState<Record<string, number>>({});
  const role = localStorage.getItem('userRole');

  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || !role) return;
    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (role === 'STUDENT' || role === 'PARENT') {
        const studentParam = targetStudentId ? `?studentId=${encodeURIComponent(targetStudentId)}` : '';
        const [tasksResponse, gradesResponse] = await Promise.all([
          fetch(`${apiUrl}/api/structured-tasks/me${studentParam}`, { headers }),
          fetch(`${apiUrl}/api/term-grades/student/${targetStudentId || 'me'}`, { headers })
        ]);
        const tasks = tasksResponse.ok ? await tasksResponse.json() : [];
        const grades = gradesResponse.ok ? await gradesResponse.json() : null;
        const taskData = getLatestTaskData(tasks);
        const gradeTimes = Object.values(grades?.terms || {}).map((term: any) => timestamp(term.updatedAt));
        setLatestTasks(taskData.latest);
        setTaskTimesByCourse(taskData.byCourse);
        setLatestGrades(Math.max(0, ...gradeTimes));
      } else if (role === 'TEACHER' || role === 'ADMIN') {
        const response = await fetch(`${apiUrl}/api/assignments/teacher`, { headers });
        const assignments = response.ok ? await response.json() : [];
        const submissionTimes = assignments.flatMap((assignment: any) => assignment.submissions || [])
          .map((submission: any) => timestamp(submission.submittedAt));
        setLatestGrades(Math.max(0, ...submissionTimes));
      }
    } catch {
      // Notifications are supplementary and should never block the panel.
    }
  }, [role, targetStudentId]);

  useEffect(() => {
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 5000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  const markGradesSeen = useCallback(() => {
    if (latestGrades > 0) writeSeenAt('grades', latestGrades);
  }, [latestGrades]);

  const markTasksSeen = useCallback(() => {
    if (latestTasks > 0) writeSeenAt('tasks', latestTasks);
  }, [latestTasks]);

  const markCourseTasksSeen = useCallback((courseId: string) => {
    const courseTime = taskTimesByCourse[courseId] || 0;
    if (courseTime > 0) writeSeenAt(`tasks:${courseId}`, courseTime);
  }, [taskTimesByCourse]);

  const newTaskCourseIds = useMemo(() => Object.entries(taskTimesByCourse)
    .filter(([courseId, value]) => value > readSeenAt(`tasks:${courseId}`))
    .map(([courseId]) => courseId), [taskTimesByCourse]);

  return {
    hasNewGrades: latestGrades > readSeenAt('grades'),
    hasNewTasks: latestTasks > readSeenAt('tasks'),
    newTaskCourseIds,
    markGradesSeen,
    markTasksSeen,
    markCourseTasksSeen
  };
};

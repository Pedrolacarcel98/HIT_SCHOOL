import { useCallback, useEffect, useMemo, useState } from 'react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type PendingTask = {
  id: string;
  courseId: string | null;
  updatedAt: number;
};

type ReadTasks = Record<string, number>;

type LearningNotifications = {
  hasNewGrades: boolean;
  hasNewTasks: boolean;
  newTaskCourseIds: string[];
  markGradesSeen: () => void;
  markTaskAsRead: (taskId: string, updatedAt?: string | null) => void;
};

const getStorageKey = (suffix: string, studentId?: string | null) => {
  const userId = localStorage.getItem('userId') || 'anonymous';
  const role = localStorage.getItem('userRole') || 'UNKNOWN';
  const scope = studentId ? `:student:${studentId}` : '';
  return `hit_learning_notifications:${role}:${userId}${scope}:${suffix}`;
};

const readSeenAt = (suffix: string, studentId?: string | null) => Number(localStorage.getItem(getStorageKey(suffix, studentId)) || 0);
const writeSeenAt = (suffix: string, value: number, studentId?: string | null) => localStorage.setItem(getStorageKey(suffix, studentId), String(value));
const timestamp = (value?: string | null) => value ? new Date(value).getTime() || 0 : 0;

const getReadTasksKey = (studentId?: string | null) => getStorageKey('read-tasks', studentId);

const readTaskEntries = (studentId?: string | null): ReadTasks => {
  try {
    const parsed = JSON.parse(localStorage.getItem(getReadTasksKey(studentId)) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

// Varias instancias del hook conviven (sidebar, listado, pestaña) y deben compartir el estado de lectura.
const readTaskSubscribers = new Set<(key: string) => void>();

const publishReadTasks = (key: string, entries: ReadTasks) => {
  localStorage.setItem(key, JSON.stringify(entries));
  readTaskSubscribers.forEach((notify) => notify(key));
};

// Una tarea sigue pendiente mientras le quede algún paso sin completar ni entregar.
const getPendingTasks = (tasks: any[]): PendingTask[] => tasks
  .filter((task) => (task.steps || []).some((step: any) => !step.isCompleted && !step.submission))
  .map((task) => ({
    id: task.id,
    courseId: task.courseId ?? null,
    updatedAt: Math.max(timestamp(task.updatedAt), timestamp(task.createdAt))
  }));

const prunePendingReads = (studentId: string | null | undefined, pending: PendingTask[]) => {
  const current = readTaskEntries(studentId);
  const pendingIds = new Set(pending.map((task) => task.id));
  const next = Object.fromEntries(Object.entries(current).filter(([id]) => pendingIds.has(id)));
  if (Object.keys(next).length !== Object.keys(current).length) {
    publishReadTasks(getReadTasksKey(studentId), next);
  }
};

export const useLearningNotifications = (targetStudentId?: string | null): LearningNotifications => {
  const [gradeState, setGradeState] = useState<{ studentId?: string | null; latest: number }>({ studentId: targetStudentId, latest: 0 });
  const [taskState, setTaskState] = useState<{ studentId?: string | null; pending: PendingTask[] }>({ studentId: targetStudentId, pending: [] });
  const [readTasks, setReadTasks] = useState<ReadTasks>(() => readTaskEntries(targetStudentId));
  const role = localStorage.getItem('userRole');
  const gradeScope = role === 'PARENT' ? targetStudentId : null;
  const latestGrades = gradeState.studentId === targetStudentId ? gradeState.latest : 0;
  const pendingTasks = useMemo(
    () => taskState.studentId === targetStudentId ? taskState.pending : [],
    [taskState, targetStudentId]
  );

  useEffect(() => {
    setReadTasks(readTaskEntries(targetStudentId));
    const handler = (key: string) => {
      if (key === getReadTasksKey(targetStudentId)) setReadTasks(readTaskEntries(targetStudentId));
    };
    readTaskSubscribers.add(handler);
    return () => { readTaskSubscribers.delete(handler); };
  }, [targetStudentId]);

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
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
          if (!active) return;
          const pending = getPendingTasks(tasks);
          const gradeTimes = Object.values(grades?.terms || {}).map((term: any) => timestamp(term.updatedAt));
          setTaskState({ studentId: targetStudentId, pending });
          if (tasksResponse.ok) prunePendingReads(targetStudentId, pending);
          setGradeState({ studentId: targetStudentId, latest: Math.max(0, ...gradeTimes) });
        } else if (role === 'TEACHER' || role === 'ADMIN') {
          const response = await fetch(`${apiUrl}/api/assignments/teacher`, { headers });
          const assignments = response.ok ? await response.json() : [];
          if (!active) return;
          const submissionTimes = assignments.flatMap((assignment: any) => assignment.submissions || [])
            .map((submission: any) => timestamp(submission.submittedAt));
          setGradeState({ studentId: targetStudentId, latest: Math.max(0, ...submissionTimes) });
        }
      } catch {
        // Notifications are supplementary and should never block the panel.
      }
    };
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [role, targetStudentId]);

  const markGradesSeen = useCallback(() => {
    if (latestGrades > 0) writeSeenAt('grades', latestGrades, gradeScope);
  }, [latestGrades, gradeScope]);

  const markTaskAsRead = useCallback((taskId: string, updatedAt?: string | null) => {
    const current = readTaskEntries(targetStudentId);
    const readAt = timestamp(updatedAt) || Date.now();
    if ((current[taskId] ?? 0) >= readAt) return;
    publishReadTasks(getReadTasksKey(targetStudentId), { ...current, [taskId]: readAt });
  }, [targetStudentId]);

  const unreadTasks = useMemo(
    () => pendingTasks.filter((task) => (readTasks[task.id] ?? 0) < task.updatedAt),
    [pendingTasks, readTasks]
  );

  const newTaskCourseIds = useMemo(
    () => Array.from(new Set(unreadTasks.map((task) => task.courseId).filter((id): id is string => Boolean(id)))),
    [unreadTasks]
  );

  return {
    hasNewGrades: latestGrades > readSeenAt('grades', gradeScope),
    hasNewTasks: unreadTasks.length > 0,
    newTaskCourseIds,
    markGradesSeen,
    markTaskAsRead
  };
};

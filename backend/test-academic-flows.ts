import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { PrismaClient } from '@prisma/client';
import { createTermGradesRouter } from './src/routes/termGrades';
import { createAssignmentsRouter } from './src/routes/assignments';
import { createTaskDeliveryGradingHandler } from './src/routes/structuredTasks';
import { authenticateToken, requireTeacher } from './src/middleware/auth';

async function checkRole(role: 'ADMIN' | 'TEACHER', modality: 'PRESENCIAL' | 'ONLINE') {
  const student = {
    id: 'student', email: 'student@example.invalid', modality,
    profile: { firstName: 'Test', lastName: 'Student' },
    enrollments: [{ courseId: 'course', course: { id: 'course', title: 'Test course' } }]
  };
  let saved: Record<string, any> | null = null;
  let tasks: any[] = [];
  let submissionAllowed = true;
  const submission: Record<string, any> = { id: 'submission', assignmentId: 'assignment', studentId: student.id, grade: 5, content: '{"answers":{"q":0},"score":1,"total":2}' };
  const database = {
    course: {
      findFirst: async () => ({ id: 'course', title: 'Test course', enrollments: [{ student }] }),
      findMany: async () => [{ id: 'course' }]
    },
    user: { findUnique: async () => student },
    enrollment: { findUnique: async () => ({ id: 'enrollment' }) },
    structuredTask: {
      findMany: async () => tasks,
      findFirst: async ({ where }: any) => tasks.find(task => task.id === where.id) || null
    },
    taskDelivery: {
      upsert: async ({ where, create, update }: any) => {
        const task = tasks.find(item => item.id === where.taskId_studentId.taskId);
        const delivery = task.deliveries[0];
        const result = { ...delivery, ...(delivery ? update : create) };
        task.deliveries = [result];
        return result;
      }
    },
    $transaction: async (operation: (transaction: any) => Promise<unknown>) => operation(database),
    submission: {
      findUnique: async () => submission,
      update: async ({ data }: any) => Object.assign(submission, Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)))
    },
    assignment: { findFirst: async () => submissionAllowed ? { id: 'assignment' } : null },
    termGrade: {
      findUnique: async () => saved,
      findMany: async () => saved ? [saved] : [],
      upsert: async ({ create, update }: any) => {
        const values = saved ? update : create;
        saved = { ...saved, ...Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) };
        return saved;
      }
    }
  };
  const app = express();
  app.use(express.json());
  app.use('/api/term-grades', createTermGradesRouter(database as unknown as PrismaClient));
  app.use('/api/assignments', createAssignmentsRouter(database as unknown as PrismaClient));
  app.post('/api/structured-tasks/:id/grade-delivery', authenticateToken, requireTeacher, createTaskDeliveryGradingHandler(database as unknown as PrismaClient));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/term-grades`;
  const token = jwt.sign({ id: 'teacher', role }, process.env.JWT_SECRET || 'secret');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const grades = {
    middleGrammar: 0, middleReading: 6, middleWriting: 7, middleListening: 8, middleSpeaking: 9,
    finalGrammar: 10, finalReading: 9, finalWriting: 8, finalListening: 7, finalSpeaking: 6
  };
  try {
    const put = await fetch(`${base}/course/course`, {
      method: 'PUT', headers,
      body: JSON.stringify({ studentId: student.id, term: 1, academicYear: '2025-2026', ...grades })
    });
    assert.equal(put.status, 200);
    for (const [field, grade] of Object.entries(grades)) assert.equal((await put.clone().json())[field], grade);

    const readGrades = async () => {
      const courseResponse = await fetch(`${base}/course/course?term=1&academicYear=2025-2026`, { headers });
      assert.equal(courseResponse.status, 200);
      const courseData = await courseResponse.json();
      const studentResponse = await fetch(`${base}/student/student?courseId=course&academicYear=2025-2026`, { headers });
      assert.equal(studentResponse.status, 200);
      const studentData = await studentResponse.json();
      for (const [field, grade] of Object.entries(grades)) {
        assert.equal(courseData.students[0][field], grade, `course ${role}/${modality}/${field}`);
        assert.equal(studentData.terms[1][field], grade, `student ${role}/${modality}/${field}`);
      }
    };
    await readGrades();
    const feedbackOnly = await fetch(`${base}/course/course`, {
      method: 'PUT', headers,
      body: JSON.stringify({ studentId: student.id, term: 1, observations: 'Feedback only' })
    });
    assert.equal(feedbackOnly.status, 200);
    await readGrades();
    const saveAdjustment = async (gradeOverrides: Record<string, number | null>, extra = {}) => {
      const response = await fetch(`${base}/course/course`, {
        method: 'PUT', headers,
        body: JSON.stringify({ studentId: student.id, term: 1, gradeOverrides, ...extra })
      });
      assert.equal(response.status, 200);
      return response.json();
    };
    const adjusted = await saveAdjustment({ tasksAverage: 7, overallGrade: 0, middleExamGrade: 9, grammar: 4 });
    assert.equal(adjusted.tasksAverage, 7);
    assert.equal(adjusted.overallGrade, 0);
    assert.equal(adjusted.middleExamGrade, 9);
    assert.equal(adjusted.grammar, 4);
    const refreshed = await fetch(`${base}/student/student?courseId=course`, { headers }).then(response => response.json());
    assert.equal(refreshed.terms[1].overallGrade, 0);
    assert.equal(refreshed.terms[1].tasksAverage, 7);
    const changedBase = await saveAdjustment({}, { middleReading: 10 });
    assert.equal(changedBase.middleExamGrade, 9);
    assert.equal(changedBase.overallGrade, 0);
    const automatic = await saveAdjustment({ tasksAverage: null, overallGrade: null, middleExamGrade: null, grammar: null });
    assert.deepEqual(automatic.gradeOverrides, {});
    assert.equal(automatic.middleExamGrade, 6.8);
    assert.equal(automatic.tasksAverage, null);
    assert.equal(automatic.overallGrade, modality === 'ONLINE' ? null : 5.18);
    const invalid = await fetch(`${base}/course/course`, {
      method: 'PUT', headers,
      body: JSON.stringify({ studentId: student.id, term: 1, gradeOverrides: { tasksAverage: 11 } })
    });
    assert.equal(invalid.status, 400);
    tasks = [10, 10, 0].map((grade, index) => ({
      id: `task-${index}`, title: `Task ${index}`, courseId: 'course', term: 1,
      category: index < 2 ? 'GRAMMAR_VOCABULARY' : 'READING',
      deliveries: [], steps: [{ id: `step-${index}`, title: 'Step', requiresSubmission: true,
        material: null, progress: [], assignment: { submissions: [{ studentId: student.id, grade }] } }]
    }));
    const withTasks = await saveAdjustment({});
    const readWithTasks = await fetch(`${base}/student/student?courseId=course`, { headers }).then(response => response.json());
    assert.equal(withTasks.tasksAverage, 6.67);
    assert.equal(withTasks.overallGrade, modality === 'ONLINE' ? 5 : 7.18);
    assert.equal(readWithTasks.terms[1].overallGrade, withTasks.overallGrade, 'save and read use the displayed automatic rule');
    tasks[0].deliveries = [{ studentId: student.id, grade: 2, status: 'GRADED' }];
    const manuallyGradedTask = await saveAdjustment({});
    assert.equal(manuallyGradedTask.tasksAverage, 4, 'manual task grade participates in averages');
    const manualTaskRead = await fetch(`${base}/student/student?courseId=course`, { headers }).then(response => response.json());
    assert.equal(manualTaskRead.terms[1].tasks[0].taskGrade, 2);
    assert.equal(manualTaskRead.terms[1].tasksAverage, 4);
    const inClassTasks = await saveAdjustment({ tasksAverage: 8 });
    assert.equal(inClassTasks.overallGrade, modality === 'ONLINE' ? 8 : 7.58);
    const resetInClassTasks = await saveAdjustment({ tasksAverage: null });
    assert.equal(resetInClassTasks.tasksAverage, 4);
    const taskUrl = base.replace('/term-grades', '/structured-tasks/task-0/grade-delivery');
    const manualTask = await fetch(taskUrl, { method: 'POST', headers, body: JSON.stringify({ studentId: student.id, grade: 0, gradeMode: 'MANUAL' }) });
    assert.equal(manualTask.status, 200);
    assert.equal((await manualTask.json()).delivery.grade, 0);
    assert.equal((await saveAdjustment({})).tasksAverage, 3.33);
    const automaticTask = await fetch(taskUrl, { method: 'POST', headers, body: JSON.stringify({ studentId: student.id, gradeMode: 'AUTO' }) });
    assert.equal(automaticTask.status, 200);
    assert.equal((await automaticTask.json()).delivery.grade, 10);
    tasks[0].steps[0].assignment.submissions[0].grade = 8;
    assert.equal((await saveAdjustment({})).tasksAverage, 6, 'automatic task follows new step grades after reset');
    const submissionUrl = base.replace('/term-grades', '/assignments/submissions/submission/grade');
    const manualExam = await fetch(submissionUrl, { method: 'POST', headers, body: JSON.stringify({ grade: 3.5 }) });
    assert.equal(manualExam.status, 200);
    assert.equal((await manualExam.json()).grade, 3.5);
    const examFeedback = await fetch(submissionUrl, { method: 'POST', headers, body: JSON.stringify({ feedback: 'Feedback without changing grade' }) });
    assert.equal((await examFeedback.json()).grade, 3.5, 'feedback-only must preserve manual exam grade');
    const zeroExam = await fetch(submissionUrl, { method: 'POST', headers, body: JSON.stringify({ grade: 0 }) });
    assert.equal((await zeroExam.json()).grade, 0);
    const invalidExam = await fetch(submissionUrl, { method: 'POST', headers, body: JSON.stringify({ grade: '8invalid' }) });
    assert.equal(invalidExam.status, 400);
    submissionAllowed = false;
    const inaccessibleExam = await fetch(submissionUrl, { method: 'POST', headers, body: JSON.stringify({ grade: 6 }) });
    assert.equal(inaccessibleExam.status, role === 'ADMIN' ? 200 : 403);
    assert.equal(submission.grade, role === 'ADMIN' ? 6 : 0);
    submissionAllowed = true;
    const studentToken = jwt.sign({ id: student.id, role: 'STUDENT' }, process.env.JWT_SECRET || 'secret');
    const forbidden = await fetch(`${base}/course/course`, {
      method: 'PUT', headers: { ...headers, Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ studentId: student.id, term: 1, middleGrammar: 10 })
    });
    assert.equal(forbidden.status, 403);
    const forbiddenSubmission = await fetch(submissionUrl, {
      method: 'POST', headers: { ...headers, Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ grade: 10 })
    });
    assert.equal(forbiddenSubmission.status, 403);
    assert.equal((await fetch(`${base}/course/course`)).status, 401);
    console.log(`PASS ${role}/${modality}: save/read, zero, manual averages, preserve on base change, reset, invalid grade and permissions`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

async function main() {
  for (const role of ['ADMIN', 'TEACHER'] as const) {
    for (const modality of ['PRESENCIAL', 'ONLINE'] as const) await checkRole(role, modality);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { jsPDF } from 'jspdf';

const base = process.env.TEST_FRONTEND_URL || 'http://127.0.0.1:4173';
const screenshots = join(tmpdir(), 'hitschool-flow-checks');
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch();
let checks = 0;

async function prepare(role, viewport, handleApi) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(role => {
    localStorage.setItem('token', 'isolated-browser-test');
    localStorage.setItem('userRole', role);
    localStorage.setItem('userId', 'viewer');
    localStorage.setItem('selectedStudentId', 'student');
  }, role);
  await context.route('**/src/main.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export {};' }));
  await context.route('**/api/**', handleApi);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  return { context, page, errors };
}

async function mount(page, path, props, parent = false) {
  await page.evaluate(async ({ path, props, parent }) => {
    await import('/src/index.css');
    await import('/src/App.css');
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const ReactDOM = await import('/node_modules/.vite/deps/react-dom_client.js');
    const createRoot = ReactDOM.createRoot || ReactDOM.default.createRoot;
    const { default: Component } = await import(path);
    let element = React.createElement(Component, props);
    if (parent) {
      const { ParentProvider } = await import('/src/context/ParentContext.tsx');
      element = React.createElement(ParentProvider, null, element);
    }
    const container = document.createElement('main');
    container.id = 'flow-test';
    document.body.replaceChildren(container);
    createRoot(container).render(element);
  }, { path, props, parent });
}

async function checkNotes(role, modality, viewport) {
  let overrides = {};
  let failSave = false;
  let lastGradeSave;
  let taskGrade = 5;
  let taskMode = 'AUTO';
  let lastTaskSave;
  const taskSteps = [{ stepId: 'step', title: 'Practice step', materialType: 'DOCUMENT',
    isEvaluable: true, isCompleted: true, grade: 5, feedback: null, content: 'Completed in class' }];
  const automatic = { middleExamGrade: 7, finalExamGrade: 8, tasksAverage: 5, overallGrade: 6.75,
    grammar: 4, reading: 6, writing: null, listening: null, speaking: null };
  const evaluation = () => ({ term: 1, academicYear: '2025-2026', observations: '',
    middleGrammar: 7, middleReading: 7, middleWriting: 7, middleListening: 7, middleSpeaking: 7,
    finalGrammar: 8, finalReading: 8, finalWriting: 8, finalListening: 8, finalSpeaking: 8,
    ...automatic, ...overrides, automaticGrades: automatic, gradeOverrides: overrides,
    tasks: [{ taskId: 'task', title: 'Practice task', taskGrade, gradeMode: taskMode, steps: taskSteps, isCompleted: true }] });
  const { context, page, errors } = await prepare(role, viewport, async route => {
    if (new URL(route.request().url()).pathname.endsWith('/grade-delivery')) {
      lastTaskSave = route.request().postDataJSON();
      taskMode = lastTaskSave.gradeMode;
      taskGrade = taskMode === 'MANUAL' ? lastTaskSave.grade : 5;
      return route.fulfill({ json: { success: true, delivery: { grade: taskGrade, gradeMode: taskMode } } });
    }
    if (route.request().method() === 'PUT') {
      if (failSave) return route.fulfill({ status: 500, json: { error: 'Test save failure' } });
      const body = route.request().postDataJSON();
      lastGradeSave = body;
      for (const [field, value] of Object.entries(body.gradeOverrides)) {
        if (value === null) delete overrides[field];
        else overrides[field] = value;
      }
      return route.fulfill({ json: evaluation() });
    }
    return route.fulfill({ json: { terms: { 1: evaluation() } } });
  });
  try {
    await mount(page, '/src/components/ExpedienteAcademico.tsx', {
      studentId: 'student', classId: 'course',
      student: { id: 'student', email: 'student@example.invalid', fullName: 'Test Student', modality, submissions: [{
        id: 'submission', assignmentId: 'assignment', studentId: 'student', content: 'Completed in class',
        grade: 5, feedback: null, submittedAt: '2025-11-13T10:00:00Z', assignmentTitle: 'Practice step',
        assignmentCategory: 'WRITING', courseId: 'course', isDirect: false, materialType: 'DOCUMENT', materialUrl: null,
        materialFormData: null, studentName: 'Test Student', studentEmail: 'student@example.invalid',
        structuredTaskId: 'task', structuredTaskTitle: 'Practice task', structuredTaskCategory: 'WRITING',
        structuredStepOrder: 1, structuredStepTitle: 'Practice step', structuredStepRequiresSubmission: true
      }] },
      course: { id: 'course', title: 'Test Course' }
    });
    const edit = page.getByRole('button', { name: /Editar Evaluaci/ });
    await expect(edit).toBeEnabled();
    await edit.click();
    if (modality === 'PRESENCIAL') {
      const modal = page.locator('.modal-card');
      for (const [index, exam] of ['MIDTERM (35%)', 'FINAL TERM (35%)'].entries()) {
        await modal.getByRole('button', { name: new RegExp(exam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();
        if (viewport.width >= 600) {
          const average = modal.getByLabel(new RegExp(`^Media ${exam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
          const grammar = modal.getByLabel('Grammar and Vocabulary', { exact: true }).nth(index);
          const [averageBox, grammarBox] = await Promise.all([average.boundingBox(), grammar.boundingBox()]);
          assert.ok(averageBox && grammarBox && Math.abs(averageBox.y - grammarBox.y) < 1, `${exam} media and Grammar input are vertically aligned at ${viewport.width}px`);
        }
      }
    }
    const taskAverage = page.getByLabel(/^Media de tareas/);
    if (modality === 'PRESENCIAL') await expect(page.getByText('MIDTERM (35%)', { exact: true })).toBeVisible();
    await taskAverage.fill('7.5');
    await page.getByLabel(/^Calificaci.*trimestral/).fill('0');
    await page.getByRole('button', { name: /Guardar Evaluaci/ }).click();
    await expect(taskAverage).toHaveCount(0);
    assert.deepEqual(overrides, { tasksAverage: 7.5, overallGrade: 0 });
    await edit.click();
    await expect(taskAverage).toHaveValue('7.5');
    await expect(taskAverage).toHaveAttribute('data-manual', 'true');
    await expect(page.getByLabel(/^Calificaci.*trimestral/)).toHaveValue('0');
    await taskAverage.press('Control+A');
    await taskAverage.press('Backspace');
    await expect(taskAverage).toHaveAttribute('data-manual', 'true');
    await expect(taskAverage).toHaveValue('');
    await taskAverage.pressSequentially('6,79');
    await expect(taskAverage).toHaveValue('6,79');
    await page.getByRole('button', { name: /Guardar Evaluaci/ }).click();
    await expect(taskAverage).toHaveCount(0);
    assert.equal(overrides.tasksAverage, 6.79, 'clearing a manual numeric field allows the replacement value to be typed');
    assert.equal(lastGradeSave.tasksAverage, '6.79', 'decimal comma is normalized for the API');
    await edit.click();
    await expect(taskAverage).toHaveValue('6.79');
    await page.getByTitle('Volver a autom\u00e1tica: Media de tareas', { exact: true }).click();
    await expect(taskAverage).toHaveValue('5');
    failSave = true;
    await page.getByRole('button', { name: /Guardar Evaluaci/ }).click();
    await expect(page.locator('.modal-card').getByRole('alert')).toHaveText('Test save failure');
    assert.equal(overrides.tasksAverage, 6.79, 'failed save leaves persisted value unchanged');
    await page.screenshot({ path: join(screenshots, `notes-${role}-${modality}-${viewport.width}.png`), fullPage: true });
    failSave = false;
    await page.getByRole('button', { name: /Guardar Evaluaci/ }).click();
    await expect(taskAverage).toHaveCount(0);
    assert.equal(overrides.tasksAverage, undefined);
    assert.equal(overrides.overallGrade, 0, 'resetting one field preserves other manual values');
    const editTask = page.getByRole('button', { name: 'Evaluar tarea', exact: true });
    await editTask.click();
    const taskGradeInput = page.getByLabel('Nota Final Bloque (0-10)', { exact: true });
    await expect(taskGradeInput).toHaveValue('5');
    await taskGradeInput.fill('9');
    await page.getByRole('button', { name: /Guardar Calificaci.*Tarea/ }).click();
    await expect(taskGradeInput).toHaveCount(0);
    assert.equal(lastTaskSave.gradeMode, 'MANUAL');
    assert.equal(lastTaskSave.grade, 9);
    assert.equal(lastTaskSave.stepEvaluations[0].grade, 5);
    await editTask.click();
    await expect(taskGradeInput).toHaveValue('9');
    await page.getByTitle('Volver a autom\u00e1tica: nota de tarea', { exact: true }).click();
    await expect(taskGradeInput).toHaveValue('5');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'task modal has no horizontal overflow');
    await page.screenshot({ path: join(screenshots, `task-${role}-${modality}-${viewport.width}.png`), fullPage: true });
    await page.getByRole('button', { name: /Guardar Calificaci.*Tarea/ }).click();
    await expect(taskGradeInput).toHaveCount(0);
    assert.equal(lastTaskSave.gradeMode, 'AUTO');
    if (role === 'ADMIN' && viewport.width === 1366) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.evaluate(async modality => {
          const { generateReportCardPDF } = await import('/src/utils/reportCard.ts');
          generateReportCardPDF({ studentName: 'Test Student', courseTitle: 'Test Course',
            term: 1, academicYear: '2025-2026', modality, overallGrade: 0,
            tasksAverage: 7.5, middleExamGrade: 9, finalExamGrade: 8, tasks: [] });
        }, modality)
      ]);
      const pdfPath = join(screenshots, `report-${modality}.pdf`);
      await download.saveAs(pdfPath);
      const pdfText = (await readFile(pdfPath)).toString('latin1');
      assert.ok(pdfText.startsWith('%PDF-'));
      assert.ok(pdfText.includes('(0.0)'), 'PDF keeps manual zero grade');
      assert.ok(pdfText.includes('7.5 / 10'), 'PDF keeps manual task average');
      if (modality === 'PRESENCIAL') assert.ok(pdfText.includes('MIDTERM') && !pdfText.includes('Middle Term'));
      console.log(`PASS PDF ${modality}: manual values and visible labels`);
    }
    assert.deepEqual(errors, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow');
    console.log(`PASS browser notes ${role}/${modality}/${viewport.width}: edit, zero, reopen, reset and failed save`);
    checks++;
  } finally { await context.close(); }
}

async function checkChat(role, viewport) {
  let reads = 0;
  let unreadCount = 1;
  const child = role === 'STUDENT' ? 'viewer' : 'student';
  const partnerRole = role === 'ADMIN' || role === 'TEACHER' ? 'STUDENT' : 'TEACHER';
  const { context, page, errors } = await prepare(role, viewport, async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: {
      id: 'viewer', role, children: [{ id: 'student', status: 'ACTIVE', profile: { firstName: 'Test' } }]
    } });
    if (path.endsWith('/contacts')) return route.fulfill({ json: [
      { id: 'partner', name: 'Pending Contact', email: 'pending@example.invalid', role: partnerRole, studentId: child, unreadCount },
      { id: 'read-partner', name: 'Read Contact', email: 'read@example.invalid', role: partnerRole, studentId: child, unreadCount: 0 }
    ] });
    if (path.endsWith('/read')) {
      assert.deepEqual(route.request().postDataJSON().messageIds, ['incoming']);
      reads++;
      unreadCount = 0;
      return route.fulfill({ json: { unreadCount: 0 } });
    }
    return route.fulfill({ json: [{ id: 'incoming', senderId: 'partner', recipientId: 'viewer', studentId: child,
      senderRole: partnerRole, content: 'New received message', createdAt: new Date().toISOString(), readAt: unreadCount ? null : new Date().toISOString() }] });
  });
  try {
    await mount(page, '/src/pages/Chat.tsx', { role: role === 'ADMIN' || role === 'TEACHER' ? 'TEACHER' : 'STUDENT' }, true);
    const pending = page.locator('.chat-contact-list strong').filter({ hasText: 'Pending Contact' });
    const read = page.locator('.chat-contact-list strong').filter({ hasText: 'Read Contact' });
    await expect(pending).toHaveCSS('font-weight', '700');
    await expect(read).toHaveCSS('font-weight', '400');
    assert.equal(reads, 0, 'listing contacts does not mark read');
    await pending.click();
    await expect.poll(() => reads).toBe(1);
    await expect(pending).toHaveCSS('font-weight', '400');
    await page.screenshot({ path: join(screenshots, `chat-${role}-${viewport.width}.png`), fullPage: true });
    assert.deepEqual(errors, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow');
    console.log(`PASS browser chat ${role}/${viewport.width}: unread bold, no read on list and normal after opening`);
    checks++;
  } finally { await context.close(); }
}

async function checkStudentExamGrades(path, role, viewport) {
  const term = {
    middleExamGrade: 7, finalExamGrade: 8, tasksAverage: 6, overallGrade: 7,
    middleGrammar: 0, middleReading: 7.5, middleWriting: null, middleListening: 8, middleSpeaking: 9,
    finalGrammar: 10, finalReading: 6, finalWriting: 5, finalListening: null, finalSpeaking: 7,
    tasks: []
  };
  const { context, page, errors } = await prepare(role, viewport, async route => {
    const requestPath = new URL(route.request().url()).pathname;
    if (requestPath.endsWith('/auth/me')) return route.fulfill({ json: {
      id: 'viewer', role, children: [{ id: 'student', status: 'ACTIVE', profile: { firstName: 'Test' } }]
    } });
    return route.fulfill({ json: {
      student: { fullName: 'Test Student', modality: 'PRESENCIAL' },
      terms: { 1: term, 2: { ...term, middleGrammar: 4 } }
    } });
  });
  try {
    await mount(page, path, { courseId: 'course' }, true);
    await page.getByRole('button', { name: '1º Trimestre' }).click();
    const midterm = page.getByRole('button', { name: /MIDTERM/ });
    await expect(midterm).toHaveAttribute('aria-expanded', 'false');
    await midterm.click();
    await expect(midterm).toHaveClass(/exam-grades-button--active/);
    const details = page.locator('.exam-grades-details');
    await expect(details.getByRole('heading', { name: 'Desglose por destrezas · MIDTERM' })).toBeVisible();
    await expect(details.locator('div').filter({ hasText: 'Grammar & Vocabulary' })).toContainText('0.0 / 10');
    await expect(details.locator('div').filter({ hasText: 'Writing' })).toContainText('- / 10');
    await expect(details.getByRole('progressbar', { name: 'Grammar & Vocabulary' })).toHaveAttribute('aria-valuenow', '0');
    await expect(details.getByRole('progressbar', { name: 'Reading' }).locator('.exam-grades-progress-fill')).toHaveCSS('width', /px/);
    await expect(details.getByRole('progressbar', { name: 'Reading' }).locator('.exam-grades-progress-fill')).toHaveAttribute('style', 'width: 75%;');
    await expect(details.getByRole('progressbar', { name: 'Writing' })).toHaveCount(0);
    const columns = await details.locator('.exam-grades-skills').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(columns, viewport.width >= 768 ? 5 : viewport.width >= 640 ? 3 : 2);
    await page.getByRole('button', { name: /FINAL TERM.*Ver destrezas/ }).click();
    await expect(midterm).not.toHaveClass(/exam-grades-button--active/);
    await expect(details.getByRole('heading', { name: 'Desglose por destrezas · FINAL TERM' })).toBeVisible();
    await expect(details.locator('div').filter({ hasText: 'Grammar & Vocabulary' })).toContainText('10.0 / 10');
    await expect(details.getByRole('progressbar', { name: 'Grammar & Vocabulary' })).toHaveAttribute('aria-valuenow', '10');
    await page.getByRole('button', { name: /FINAL TERM.*Ocultar destrezas/ }).click();
    await expect(details).toBeHidden();
    await page.getByRole('button', { name: /MIDTERM.*Ver destrezas/ }).click();
    await page.getByRole('button', { name: '2º Trimestre' }).click();
    await expect(details).toBeHidden();
    await page.getByRole('button', { name: /MIDTERM.*Ver destrezas/ }).click();
    await expect(page.locator('.exam-grades-details').locator('div').filter({ hasText: 'Grammar & Vocabulary' })).toContainText('4.0 / 10');
    assert.deepEqual(errors, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow');
    console.log(`PASS student exam grades ${path}/${role}/${viewport.width}`);
    checks++;
  } finally { await context.close(); }
}

async function checkTeacherExamGrades(role, viewport) {
  const term = {
    term: 1, middleExamGrade: 7, finalExamGrade: 8, tasksAverage: 6, overallGrade: 7,
    middleGrammar: 0, middleReading: 7, middleWriting: null, middleListening: 8, middleSpeaking: 9,
    finalGrammar: 10, finalReading: 6, finalWriting: 5, finalListening: null, finalSpeaking: 7,
    tasks: []
  };
  const { context, page, errors } = await prepare(role, viewport, route =>
    route.fulfill({ json: { terms: { 1: term, 2: { ...term, middleGrammar: 4 } } } })
  );
  try {
    await mount(page, '/src/components/ExpedienteAcademico.tsx', {
      studentId: 'student', classId: 'course',
      student: { id: 'student', email: 'student@example.invalid', fullName: 'Test Student', modality: 'PRESENCIAL', submissions: [] },
      course: { id: 'course', title: 'Test Course' }
    });
    const midterm = page.getByRole('button', { name: /MIDTERM.*Ver destrezas/ });
    await midterm.click();
    const details = page.locator('.exam-grades-details');
    await expect(details.getByRole('heading', { name: 'Desglose por destrezas · MIDTERM' })).toBeVisible();
    await expect(details.locator('div').filter({ hasText: 'Grammar & Vocabulary' })).toContainText('0.0 / 10');
    await page.getByRole('button', { name: /FINAL TERM.*Ver destrezas/ }).click();
    await expect(details.getByRole('heading', { name: 'Desglose por destrezas · FINAL TERM' })).toBeVisible();
    await expect(details.locator('div').filter({ hasText: 'Grammar & Vocabulary' })).toContainText('10.0 / 10');
    await page.getByRole('tab', { name: '2º Trimestre' }).click();
    await expect(details).toBeHidden();
    await page.getByRole('button', { name: /MIDTERM.*Ver destrezas/ }).click();
    await expect(page.locator('.exam-grades-details').locator('div').filter({ hasText: 'Grammar & Vocabulary' })).toContainText('4.0 / 10');
    await expect(page.getByRole('button', { name: /Editar Evaluaci/ })).toBeVisible();
    assert.deepEqual(errors, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow');
    console.log(`PASS teacher exam grades ${role}/${viewport.width}`);
    checks++;
  } finally { await context.close(); }
}

async function checkDashboard(role, viewport, hasUpdates) {
  const isParent = role === 'PARENT';
  const isStudent = role === 'STUDENT' || isParent;
  let unreadCount = hasUpdates ? 3 : 0;
  const child = { id: 'student', status: 'ACTIVE', email: 'child@example.invalid', profile: { firstName: 'First', lastName: 'Student' } };
  const sibling = { id: 'sibling', status: 'ACTIVE', email: 'sibling@example.invalid', profile: { firstName: 'Second', lastName: 'Student' } };
  const studentDashboard = {
    student: { id: 'student', name: 'First Student' }, hasParent: isParent,
    payments: { pendingCount: 0, nextDueDate: null }, assignments: { pendingCount: 0, upcoming: [] },
    grades: [{ courseTitle: 'Clase A', average: 6 }],
    examGrades: [
      { courseId: 'course-a', courseTitle: 'Clase A', academicYear: '2025-2026', term: 1, middleExamGrade: 0, finalExamGrade: null },
      { courseId: 'course-a', courseTitle: 'Clase A', academicYear: '2024-2025', term: 2, middleExamGrade: 7, finalExamGrade: 8 }
    ]
  };
  const siblingDashboard = {
    ...studentDashboard, student: { id: 'sibling', name: 'Second Student' }, grades: [],
    examGrades: [{ courseId: 'course-b', courseTitle: 'Clase B', academicYear: '2025-2026', term: 3, middleExamGrade: null, finalExamGrade: 9 }]
  };
  const { context, page, errors } = await prepare(role, viewport, async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'viewer', role, profile: { firstName: 'Test' }, children: isParent ? [child, sibling] : [] } });
    if (path.endsWith('/dashboard/me')) return route.fulfill({ json: { data: isParent ? [studentDashboard, siblingDashboard] : [studentDashboard] } });
    if (path.endsWith('/dashboard/teacher')) return route.fulfill({ json: { activeStudents: 2, activeCourses: 1, unscoredSubmissions: 0, overduePayments: 0, latestSubmissions: [] } });
    if (path.endsWith('/chat/unread-count')) return route.fulfill({ json: { unreadCount } });
    if (path.includes('/term-grades/student/')) return route.fulfill({ json: {
      terms: hasUpdates ? { 1: { updatedAt: path.endsWith('/sibling') ? '2025-01-01T00:00:00Z' : '2026-01-01T00:00:00Z' } } : {}
    } });
    if (path.endsWith('/structured-tasks/me')) return route.fulfill({ json: hasUpdates && url.searchParams.get('studentId') !== 'sibling' ? [
      { id: 'task', courseId: 'course-a', updatedAt: '2026-01-01T00:00:00Z', steps: [{ isCompleted: false }] }
    ] : [] });
    if (path.endsWith('/assignments/teacher')) return route.fulfill({ json: hasUpdates ? [{ submissions: [{ submittedAt: '2026-01-01T00:00:00Z' }] }] : [] });
    if (path.endsWith('/payments/me')) return route.fulfill({ json: [] });
    return route.fulfill({ json: {} });
  });
  try {
    const learningResponse = page.waitForResponse(response => response.url().includes(isStudent ? '/term-grades/student/' : '/assignments/teacher')).catch(() => null);
    const chatResponse = page.waitForResponse(response => response.url().includes('/chat/unread-count')).catch(() => null);
    await page.evaluate(async ({ isStudent }) => {
      await import('/src/index.css');
      await import('/src/App.css');
      const { default: React } = await import('/node_modules/.vite/deps/react.js');
      const ReactDOM = await import('/node_modules/.vite/deps/react-dom_client.js');
      const createRoot = ReactDOM.createRoot || ReactDOM.default.createRoot;
      const layoutPath = isStudent ? '/src/components/StudentLayout.tsx' : '/src/components/TeacherLayout.tsx';
      const layoutSource = await fetch(layoutPath).then(response => response.text());
      const routerPath = layoutSource.match(/from "([^"]*react-router-dom\.js\?[^"]+)"/)?.[1];
      if (!routerPath) throw new Error('Cannot locate Vite router dependency');
      const { MemoryRouter, Routes, Route, Link } = await import(routerPath);
      const { ParentProvider } = await import('/src/context/ParentContext.tsx');
      const { default: Layout } = await import(layoutPath);
      const { default: Dashboard } = await import(isStudent ? '/src/pages/DashboardStudent.tsx' : '/src/pages/DashboardTeacher.tsx');
      const rootPath = isStudent ? '/student' : '/teacher';
      const routes = React.createElement(MemoryRouter, { initialEntries: [rootPath] },
        React.createElement(Routes, null,
          React.createElement(Route, { path: rootPath, element: React.createElement(Layout) },
            React.createElement(Route, { index: true, element: React.createElement(Dashboard) }),
            React.createElement(Route, { path: 'grades', element: React.createElement(Link, { to: rootPath }, 'Volver al inicio') })
          )
        )
      );
      const container = document.createElement('main');
      document.body.replaceChildren(container);
      createRoot(container).render(React.createElement(ParentProvider, null, routes));
    }, { isStudent });
    const responses = await Promise.all([learningResponse, chatResponse]);
    assert.ok(responses.every(Boolean), `notification requests completed; page errors: ${errors.join('; ')}`);
    const shortcuts = page.locator('.dashboard-quick-actions');
    const grades = shortcuts.getByRole('button', { name: /Calificaciones/ });
    const chat = shortcuts.getByRole('button', { name: isStudent ? /Chat con Profesor/ : /Mensajes/ });
    await expect(grades).toBeVisible();
    await expect(grades.locator('.quick-action-notification')).toHaveCount(hasUpdates ? 1 : 0);
    await expect(chat.locator('.quick-action-notification')).toHaveCount(0);
    await expect(chat.locator('.quick-action-chat-count')).toHaveCount(hasUpdates ? 1 : 0);
    if (hasUpdates) {
      await expect(grades).toHaveClass(/quick-action-pill--unread/);
      await expect(grades.getByRole('status', { name: isStudent ? 'Hay nuevas calificaciones' : 'Hay nuevas entregas' })).toHaveText('Nuevo');
      await expect(grades.locator('svg')).toHaveAttribute('stroke', '#059669');
      await expect(chat).toHaveClass(/quick-action-pill--unread/);
      await expect(chat.getByRole('status', { name: '3 mensajes sin leer' })).toHaveText('3');
      await expect(chat.locator('svg')).toHaveAttribute('stroke', '#059669');
      await expect(grades).toHaveCSS('background-color', 'rgba(236, 253, 245, 0.7)');
      await expect(chat).toHaveCSS('background-color', 'rgba(236, 253, 245, 0.7)');
      await expect(grades.locator('.quick-action-notification')).toHaveCSS('background-color', await chat.locator('.quick-action-chat-count').evaluate(el => getComputedStyle(el).backgroundColor));
    } else {
      await expect(grades).not.toHaveClass(/quick-action-pill--unread/);
      await expect(chat).not.toHaveClass(/quick-action-pill--unread/);
    }
    if (isStudent) {
      const courses = shortcuts.getByRole('button', { name: /Mis Clases y Tareas/ });
      await expect(courses.locator('.quick-action-notification')).toHaveCount(hasUpdates ? 1 : 0);
      if (hasUpdates) {
        await expect(courses).toHaveClass(/quick-action-pill--unread/);
        await expect(courses.getByRole('status', { name: 'Hay tareas nuevas' })).toHaveText('Nuevo');
        await expect(courses.locator('svg')).toHaveAttribute('stroke', '#059669');
      } else {
        await expect(courses).not.toHaveClass(/quick-action-pill--unread/);
      }
      const cards = page.locator('.dashboard-card--purple');
      await expect(cards.first()).toContainText('⭐ 6.0 / 10');
      await expect(cards.first()).toContainText('1º trimestre · 2025-2026');
      await expect(cards.first()).toContainText('Midterm: 0.0 / 10');
      await expect(cards.first()).toContainText('Final Term: —');
      await expect(cards.first()).toContainText('2º trimestre · 2024-2025');
      if (isParent) {
        await expect(cards.nth(1)).toContainText('Aún no hay entregas calificadas.');
        await expect(cards.nth(1)).toContainText('Final Term: 9.0 / 10');
        await expect(cards.nth(1)).not.toContainText('⭐');
      }
    }
    if (hasUpdates) {
      await grades.click();
      const scope = isParent ? ':student:student' : '';
      const key = `hit_learning_notifications:${role}:viewer${scope}:grades`;
      await expect.poll(() => page.evaluate(key => localStorage.getItem(key), key)).not.toBeNull();
      await page.getByRole('link', { name: 'Volver al inicio' }).click();
      await expect(page.locator('.dashboard-quick-actions').getByRole('button', { name: /Calificaciones/ }).locator('.quick-action-notification')).toHaveCount(0);
      await expect(page.locator('.dashboard-quick-actions').getByRole('button', { name: /Calificaciones/ })).not.toHaveClass(/quick-action-pill--unread/);
      if (isParent) {
        if (viewport.width <= 900) await page.getByRole('button', { name: 'Abrir menú' }).click();
        await page.getByRole('button', { name: /First Student/ }).click();
        await page.getByRole('option', { name: /Second Student/ }).click();
        if (viewport.width <= 900) await page.getByRole('button', { name: 'Cerrar menú' }).click();
        await expect(page.locator('.dashboard-quick-actions').getByRole('button', { name: /Calificaciones/ }).locator('.quick-action-notification')).toHaveCount(1);
        await expect(page.locator('.dashboard-quick-actions').getByRole('button', { name: /Mis Clases y Tareas/ }).locator('.quick-action-notification')).toHaveCount(0);
      }
    }
    if (hasUpdates && role === 'STUDENT' && viewport.width === 390) {
      unreadCount = 0;
      const currentChat = page.locator('.dashboard-quick-actions').getByRole('button', { name: /Chat con Profesor/ });
      await expect(currentChat.locator('.quick-action-chat-count')).toHaveCount(0, { timeout: 8000 });
      await expect(currentChat).not.toHaveClass(/quick-action-pill--unread/);
      unreadCount = 1;
      await expect(currentChat.getByRole('status', { name: '1 mensaje sin leer' })).toHaveText('1', { timeout: 8000 });
      await expect(currentChat).toHaveClass(/quick-action-pill--unread/);
    }
    assert.deepEqual(errors, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow');
    console.log(`PASS dashboard ${role}/${viewport.width}/${hasUpdates ? 'new' : 'no updates'}`);
    checks++;
  } finally { await context.close(); }
}

async function checkReportCard() {
  const { context, page, errors } = await prepare('STUDENT', { width: 1366, height: 900 }, route => route.abort());
  const measure = new jsPDF();
  measure.setFont('helvetica', 'bold');
  const pointsPerMm = 72 / 25.4;
  const cases = [
    { grade: null, score: 'Pendiente', detail: 'En proceso' },
    { grade: 0, score: '0.0', detail: 'INSUFICIENTE' },
    { grade: 7, score: '7.0', detail: 'NOTABLE' },
    { grade: 10, score: '10.0', detail: 'SOBRESALIENTE' }
  ];
  try {
    for (const modality of ['PRESENCIAL', 'ONLINE']) {
      for (const { grade, score, detail } of cases) {
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          page.evaluate(async ({ modality, grade }) => {
            const { generateReportCardPDF } = await import('/src/utils/reportCard.ts');
            generateReportCardPDF({ studentName: 'Test Student', courseTitle: 'Test Course',
              term: 1, academicYear: '2025-2026', modality, overallGrade: grade,
              tasksAverage: 7.5, middleExamGrade: 9, finalExamGrade: 8 });
          }, { modality, grade })
        ]);
        const pdf = (await readFile(await download.path())).toString('latin1');
        const blocks = [...pdf.matchAll(/([\d.]+) ([\d.]+) Td\s*\((.*?)\) Tj/gs)]
          .map(match => ({ x: Number(match[1]), y: Number(match[2]), text: match[3] }));
        const scoreIndex = blocks.findIndex(block => block.text === score);
        assert.ok(scoreIndex >= 0, `${modality}/${score}: score is present`);
        const scoreBlock = blocks[scoreIndex];
        const detailBlock = blocks[scoreIndex + 1];
        assert.ok(detailBlock?.text.includes(detail), `${modality}/${score}: correct detail follows the score`);
        assert.equal(detailBlock.text.includes('/ 10'), grade !== null, `${modality}/${score}: scale only shown for a grade`);
        assert.ok(Math.abs(scoreBlock.y - detailBlock.y) < 24, `${modality}/${score}: detail is in the summary`);
        measure.setFontSize(24);
        const scoreEnd = scoreBlock.x + measure.getTextWidth(score) * pointsPerMm;
        measure.setFontSize(10);
        const detailText = detailBlock.text.replace(/\x95/g, '•');
        const detailEnd = detailBlock.x + measure.getTextWidth(detailText) * pointsPerMm;
        assert.ok(detailBlock.x - scoreEnd >= 2 * pointsPerMm, `${modality}/${score}: score and detail do not overlap`);
        assert.ok(detailEnd < 115 * pointsPerMm, `${modality}/${score}: detail does not reach the right column`);
        assert.ok(pdf.includes('7.5 / 10'), `${modality}/${score}: task average is retained`);
        if (modality === 'PRESENCIAL') assert.ok(pdf.includes('MIDTERM') && pdf.includes('Final Term'));
        else assert.ok(pdf.includes('Media Tareas y Pruebas:'));
        checks++;
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS report card: non-overlapping summary for both modalities and pending, zero, 7 and 10');
  } finally { await context.close(); }
}

try {
  if (process.argv.includes('--report-card')) {
    await checkReportCard();
  } else for (const viewport of [{ width: 1366, height: 900 }, { width: 650, height: 844 }, { width: 390, height: 844 }]) {
    if (process.argv.includes('--dashboard')) {
      for (const role of ['STUDENT', 'PARENT', 'TEACHER', 'ADMIN']) {
        for (const hasUpdates of [true, false]) await checkDashboard(role, viewport, hasUpdates);
      }
      continue;
    }
    for (const role of ['STUDENT', 'PARENT']) {
      for (const path of ['/src/pages/StudentGrades.tsx', '/src/components/StudentGradesTab.tsx']) {
        await checkStudentExamGrades(path, role, viewport);
      }
    }
    for (const role of ['ADMIN', 'TEACHER']) await checkTeacherExamGrades(role, viewport);
    if (!process.argv.includes('--exam-grades')) {
      for (const role of ['ADMIN', 'TEACHER']) {
        for (const modality of ['PRESENCIAL', 'ONLINE']) await checkNotes(role, modality, viewport);
      }
      for (const role of ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT']) await checkChat(role, viewport);
    }
  }
  console.log(`${checks} browser scenarios passed. Screenshots: ${screenshots}`);
} finally { await browser.close(); }
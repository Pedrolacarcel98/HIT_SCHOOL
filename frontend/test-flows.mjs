import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';

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

try {
  for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
    for (const role of ['ADMIN', 'TEACHER']) {
      for (const modality of ['PRESENCIAL', 'ONLINE']) await checkNotes(role, modality, viewport);
    }
    for (const role of ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT']) await checkChat(role, viewport);
  }
  console.log(`${checks} browser scenarios passed. Screenshots: ${screenshots}`);
} finally { await browser.close(); }
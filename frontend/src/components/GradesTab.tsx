import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  FileText,
  Save,
  Search,
  Users,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import ExamReviewModal from './ExamReviewModal';
import TaskDeliveryReviewModal, { type TaskForReview } from './TaskDeliveryReviewModal';
import { generateReportCardPDF, type ReportCardData, type ReportCardTaskItem } from '../utils/reportCard';

interface SubmissionItem {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string | null;
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
  student?: {
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
  assignmentTitle: string;
  assignmentCategory: string;
  dueDate?: string | null;
  materialType?: string;
  materialUrl?: string | null;
  materialFormData?: any;
  studentName: string;
  studentEmail: string;
}

interface ParsedExamData {
  answers: Record<string, string | number>;
  score?: number | null;
  total?: number | null;
}

const parseSavedExam = (content?: string | null): ParsedExamData | null => {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed.answers || typeof parsed.score === 'number') {
      return {
        answers: parsed.answers || {},
        score: typeof parsed.score === 'number' ? parsed.score : null,
        total: typeof parsed.total === 'number' ? parsed.total : null
      };
    }
    return null;
  } catch {
    return null;
  }
};

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const GradesTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  // Trimestres: 1, 2, 3 (detección automática según mes actual)
  const getCurrentTerm = () => {
    const m = new Date().getMonth() + 1;
    if (m >= 9 && m <= 12) return 1;
    if (m >= 1 && m <= 3) return 2;
    return 3;
  };

  const [selectedTerm, setSelectedTerm] = useState<number>(getCurrentTerm());
  const [activeTab, setActiveTab] = useState<'EVALUATION' | 'TASKS' | 'SUBMISSIONS'>('EVALUATION');

  // Estado de evaluación trimestral
  const [termData, setTermData] = useState<any>(null);
  const [loadingTerm, setLoadingTerm] = useState(true);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Formulario local de cada alumno para notas y CEFR
  const [studentForms, setStudentForms] = useState<Record<string, {
    middleExamGrade: string;
    finalExamGrade: string;
    grammar: string;
    reading: string;
    writing: string;
    listening: string;
    speaking: string;
    observations: string;
  }>>({});

  // Estado de entregas sueltas / historial
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submissionFilter, setSubmissionFilter] = useState<'ALL' | 'PENDING' | 'GRADED' | 'EXAMS'>('ALL');

  // Modales
  const [evaluatingSubmission, setEvaluatingSubmission] = useState<SubmissionItem | null>(null);
  const [gradeInput, setGradeInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Modal para revisar tarea estructurada
  const [reviewingTask, setReviewingTask] = useState<TaskForReview | null>(null);
  const [activeReviewStudent, setActiveReviewStudent] = useState<{ id: string; name: string } | null>(null);

  // Modal para revisar examen interactivo
  const [reviewingExam, setReviewingExam] = useState<{
    title: string;
    questions?: any[];
    answers: Record<string, any>;
    score: number | null;
    total?: number | null;
  } | null>(null);

  // Cargar datos trimestrales del curso
  const fetchTermGrades = async () => {
    try {
      setLoadingTerm(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/term-grades/course/${courseId}?term=${selectedTerm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setTermData(data);

        // Inicializar formularios de estudiantes
        const initialForms: Record<string, any> = {};
        (data.students || []).forEach((st: any) => {
          initialForms[st.studentId] = {
            middleExamGrade: st.middleExamGrade !== null && st.middleExamGrade !== undefined ? String(st.middleExamGrade) : '',
            finalExamGrade: st.finalExamGrade !== null && st.finalExamGrade !== undefined ? String(st.finalExamGrade) : '',
            grammar: st.grammar !== null && st.grammar !== undefined ? String(st.grammar) : '',
            reading: st.reading !== null && st.reading !== undefined ? String(st.reading) : '',
            writing: st.writing !== null && st.writing !== undefined ? String(st.writing) : '',
            listening: st.listening !== null && st.listening !== undefined ? String(st.listening) : '',
            speaking: st.speaking !== null && st.speaking !== undefined ? String(st.speaking) : '',
            observations: st.observations || ''
          };
        });
        setStudentForms(initialForms);
      }
    } catch (err) {
      console.error('Error al cargar notas trimestrales del curso:', err);
    } finally {
      setLoadingTerm(false);
    }
  };

  // Cargar entregas directas
  const fetchTeacherAssignments = async () => {
    try {
      setLoadingSubmissions(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/assignments/teacher`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const assignments = await res.json();
        const courseAssignments = assignments.filter((a: any) => a.courseId === courseId);

        const flattened: SubmissionItem[] = courseAssignments.flatMap((assignment: any) =>
          assignment.submissions.map((sub: any) => ({
            ...sub,
            assignmentTitle: assignment.title,
            assignmentCategory: assignment.category || 'GRAMMAR_VOCABULARY',
            dueDate: assignment.dueDate,
            materialType: assignment.material?.type || (sub.content?.includes('"answers"') ? 'FORM' : 'DOCUMENT'),
            materialUrl: assignment.material?.url || null,
            materialFormData: assignment.material?.formData || null,
            studentName: sub.student?.profile ? `${sub.student.profile.firstName} ${sub.student.profile.lastName}`.trim() : (sub.student?.email || 'Alumno'),
            studentEmail: sub.student?.email || ''
          }))
        ).sort((a: SubmissionItem, b: SubmissionItem) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

        setSubmissions(flattened);
      }
    } catch (err) {
      console.error('Error al cargar entregas directas:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchTermGrades();
  }, [courseId, selectedTerm]);

  useEffect(() => {
    if (activeTab === 'SUBMISSIONS') {
      fetchTeacherAssignments();
    }
  }, [courseId, activeTab]);

  // Guardar evaluación trimestral de un alumno
  const handleSaveTermGrade = async (studentId: string) => {
    const form = studentForms[studentId];
    if (!form) return;

    try {
      setSavingStudentId(studentId);
      const token = localStorage.getItem('token');

      const res = await fetch(`${apiUrl}/api/term-grades/course/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId,
          term: selectedTerm,
          academicYear: termData?.academicYear || '2025-2026',
          middleExamGrade: form.middleExamGrade !== '' ? parseFloat(form.middleExamGrade) : null,
          finalExamGrade: form.finalExamGrade !== '' ? parseFloat(form.finalExamGrade) : null,
          grammar: form.grammar !== '' ? parseFloat(form.grammar) : null,
          reading: form.reading !== '' ? parseFloat(form.reading) : null,
          writing: form.writing !== '' ? parseFloat(form.writing) : null,
          listening: form.listening !== '' ? parseFloat(form.listening) : null,
          speaking: form.speaking !== '' ? parseFloat(form.speaking) : null,
          observations: form.observations
        })
      });

      if (res.ok) {
        await fetchTermGrades();
      }
    } catch (err) {
      console.error('Error al guardar notas trimestrales:', err);
    } finally {
      setSavingStudentId(null);
    }
  };

  // Descargar Boletín Trimestral PDF
  const handleDownloadReportCard = (st: any) => {
    const form = studentForms[st.studentId] || {};
    const middle = form.middleExamGrade !== '' ? parseFloat(form.middleExamGrade) : st.middleExamGrade;
    const final = form.finalExamGrade !== '' ? parseFloat(form.finalExamGrade) : st.finalExamGrade;
    const grammar = form.grammar !== '' ? parseFloat(form.grammar) : st.grammar;
    const reading = form.reading !== '' ? parseFloat(form.reading) : st.reading;
    const writing = form.writing !== '' ? parseFloat(form.writing) : st.writing;
    const listening = form.listening !== '' ? parseFloat(form.listening) : st.listening;
    const speaking = form.speaking !== '' ? parseFloat(form.speaking) : st.speaking;
    const observations = form.observations !== undefined ? form.observations : st.observations;

    const reportData: ReportCardData = {
      studentName: st.fullName,
      studentEmail: st.email,
      courseTitle: termData?.course?.title || 'Curso de Inglés',
      term: selectedTerm,
      academicYear: termData?.academicYear || '2025-2026',
      modality: st.modality,
      middleExamGrade: middle,
      finalExamGrade: final,
      tasksAverage: st.tasksAverage,
      overallGrade: st.overallGrade,
      grammar,
      reading,
      writing,
      listening,
      speaking,
      observations,
      tasks: (st.tasks || []).map((t: any): ReportCardTaskItem => ({
        title: t.taskTitle,
        category: t.category,
        grade: t.taskGrade,
        stepsSummary: (t.steps || [])
          .map((s: any) =>
            !s.isEvaluable
              ? (s.isCompleted ? `✓ ${s.title}` : `○ ${s.title}`)
              : (s.grade !== null && s.grade !== undefined ? `${s.grade.toFixed(1)}/10 ${s.title}` : `⏳ ${s.title}`)
          )
          .join(', ')
      }))
    };

    generateReportCardPDF(reportData);
  };

  // Guardar calificación de tarea completa desde el modal
  const handleSaveTaskDeliveryGrade = async (grade: number | null, feedback: string) => {
    if (!reviewingTask || !activeReviewStudent) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/structured-tasks/${reviewingTask.taskId}/grade-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: activeReviewStudent.id,
          grade,
          feedback
        })
      });

      if (res.ok) {
        setReviewingTask(null);
        setActiveReviewStudent(null);
        await fetchTermGrades();
      }
    } catch (err) {
      console.error('Error al guardar calificación de la tarea:', err);
    }
  };

  // Guardar calificación de entrega directa
  const handleSaveSingleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingSubmission) return;

    const numGrade = gradeInput.trim() !== '' ? parseFloat(gradeInput) : null;
    if (numGrade !== null && (isNaN(numGrade) || numGrade < 0 || numGrade > 10)) {
      setSaveError('La calificación debe ser un número válido entre 0 y 10.');
      return;
    }

    try {
      setIsSavingGrade(true);
      setSaveError('');
      const token = localStorage.getItem('token');

      const res = await fetch(`${apiUrl}/api/assignments/submissions/${evaluatingSubmission.id}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          grade: numGrade,
          feedback: feedbackInput.trim() || null
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setSaveError(errData.error || 'Error al guardar la calificación.');
        return;
      }

      setSubmissions((prev) =>
        prev.map((s) => (s.id === evaluatingSubmission.id ? { ...s, grade: numGrade, feedback: feedbackInput.trim() || null } : s))
      );

      setEvaluatingSubmission(null);
    } catch (err) {
      console.error(err);
      setSaveError('Error de conexión al calificar.');
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Filtrado de entregas directas
  const filteredSubmissions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return submissions.filter((sub) => {
      const matchesSearch =
        !q ||
        sub.studentName.toLowerCase().includes(q) ||
        sub.studentEmail.toLowerCase().includes(q) ||
        sub.assignmentTitle.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (submissionFilter === 'PENDING') {
        return sub.materialType !== 'FORM' && (sub.grade === null || sub.grade === undefined);
      }
      if (submissionFilter === 'GRADED') {
        return sub.grade !== null && sub.grade !== undefined;
      }
      if (submissionFilter === 'EXAMS') {
        return sub.materialType === 'FORM' || Boolean(parseSavedExam(sub.content));
      }
      return true;
    });
  }, [submissions, searchTerm, submissionFilter]);

  const studentsList: any[] = termData?.students || [];
  const tasksSummary: any[] = termData?.tasksSummary || [];

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem 0', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Panel Superior: Selector de Trimestres y Estadísticas */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.65rem', borderRadius: '10px' }}>
              <Award size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-main)' }}>
                Libro de Calificaciones y Evaluaciones
              </h2>
              <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Middle Term, Final Term, tareas continuas y generación de boletines oficiales
              </p>
            </div>
          </div>

          {/* Selector de Trimestre */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-alt)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
            {[1, 2, 3].map((termNum) => (
              <button
                key={termNum}
                type="button"
                onClick={() => setSelectedTerm(termNum)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: selectedTerm === termNum ? 'var(--primary)' : 'transparent',
                  color: selectedTerm === termNum ? '#ffffff' : 'var(--text-main)',
                  fontWeight: selectedTerm === termNum ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {termNum}º Trimestre
              </button>
            ))}
          </div>
        </div>

        {/* Pestañas de Vista */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('EVALUATION')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'EVALUATION' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'EVALUATION' ? 'var(--primary-text)' : 'var(--text-muted)',
              fontWeight: activeTab === 'EVALUATION' ? 700 : 500,
              cursor: 'pointer',
              fontSize: '0.88rem'
            }}
          >
            <Award size={16} /> Evaluación Trimestral y Boletines ({studentsList.length} alumnos)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TASKS')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'TASKS' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'TASKS' ? 'var(--primary-text)' : 'var(--text-muted)',
              fontWeight: activeTab === 'TASKS' ? 700 : 500,
              cursor: 'pointer',
              fontSize: '0.88rem'
            }}
          >
            <BookOpen size={16} /> Bloques de Tareas ({tasksSummary.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SUBMISSIONS')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'SUBMISSIONS' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'SUBMISSIONS' ? 'var(--primary-text)' : 'var(--text-muted)',
              fontWeight: activeTab === 'SUBMISSIONS' ? 700 : 500,
              cursor: 'pointer',
              fontSize: '0.88rem'
            }}
          >
            <FileText size={16} /> Entregas Directas
          </button>
        </div>
      </div>

      {/* VISTA 1: EVALUACIÓN TRIMESTRAL Y BOLETINES */}
      {activeTab === 'EVALUATION' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          {loadingTerm ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Cargando libro de calificaciones del {selectedTerm}º Trimestre...
            </div>
          ) : studentsList.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Users size={40} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
              <p>No hay alumnos matriculados en esta clase.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Alumnos Presenciales: <strong>50% Exámenes (Middle + Final) + 50% Tareas</strong>. Alumnos Online: <strong>100% Automático (Media de Tareas)</strong>.
                </span>
              </div>

              {studentsList.map((st) => {
                const form = studentForms[st.studentId] || {
                  middleExamGrade: '',
                  finalExamGrade: '',
                  grammar: '',
                  reading: '',
                  writing: '',
                  listening: '',
                  speaking: '',
                  observations: ''
                };
                const isOnline = st.modality === 'ONLINE';
                const isExpanded = expandedStudentId === st.studentId;
                const isSaving = savingStudentId === st.studentId;

                return (
                  <div
                    key={st.studentId}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      background: 'var(--surface)',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Fila Principal de Calificación */}
                    <div
                      style={{
                        padding: '1.1rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        background: 'var(--surface)'
                      }}
                    >
                      {/* Info del alumno */}
                      <div style={{ minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>{st.fullName}</strong>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: isOnline ? '#e0f2fe' : '#eaf4ef',
                              color: isOnline ? '#0369a1' : '#24583e',
                              border: `1px solid ${isOnline ? '#bae6fd' : '#bfe0d0'}`
                            }}
                          >
                            {isOnline ? 'Online' : 'Presencial'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{st.email}</span>
                      </div>

                      {/* Inputs de Exámenes y Medias */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                        {!isOnline ? (
                          <>
                            {/* Middle Exam */}
                            <div style={{ textAlign: 'center', width: '85px' }}>
                              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                MIDDLE
                              </span>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                placeholder="-"
                                value={form.middleExamGrade}
                                onChange={(e) =>
                                  setStudentForms((prev) => ({
                                    ...prev,
                                    [st.studentId]: { ...form, middleExamGrade: e.target.value }
                                  }))
                                }
                                style={{
                                  width: '100%',
                                  padding: '0.35rem',
                                  textAlign: 'center',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border)',
                                  fontWeight: 700,
                                  fontSize: '0.95rem',
                                  color: 'var(--primary)'
                                }}
                              />
                            </div>

                            {/* Final Exam */}
                            <div style={{ textAlign: 'center', width: '85px' }}>
                              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                FINAL
                              </span>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                placeholder="-"
                                value={form.finalExamGrade}
                                onChange={(e) =>
                                  setStudentForms((prev) => ({
                                    ...prev,
                                    [st.studentId]: { ...form, finalExamGrade: e.target.value }
                                  }))
                                }
                                style={{
                                  width: '100%',
                                  padding: '0.35rem',
                                  textAlign: 'center',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border)',
                                  fontWeight: 700,
                                  fontSize: '0.95rem',
                                  color: 'var(--primary)'
                                }}
                              />
                            </div>
                          </>
                        ) : (
                          <div style={{ padding: '0.4rem 0.8rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '0.78rem', color: '#0369a1', fontWeight: 600 }}>
                            100% Automático
                          </div>
                        )}

                        {/* Media Tareas */}
                        <div style={{ textAlign: 'center', padding: '0.4rem 0.8rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)', minWidth: '95px' }}>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            TAREAS ({st.completedTasksCount}/{st.tasksCount})
                          </span>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                            {st.tasksAverage !== null && st.tasksAverage !== undefined ? `${st.tasksAverage.toFixed(1)}` : '-'}
                          </strong>
                        </div>

                        {/* Nota Final */}
                        <div style={{ textAlign: 'center', padding: '0.4rem 0.85rem', background: 'var(--primary-light)', borderRadius: '8px', border: '1px solid var(--primary-border)', minWidth: '100px' }}>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--primary-text)', fontWeight: 700 }}>
                            NOTA FINAL
                          </span>
                          <strong style={{ fontSize: '1.15rem', color: 'var(--primary-text)' }}>
                            {st.overallGrade !== null && st.overallGrade !== undefined ? `${st.overallGrade.toFixed(1)} / 10` : '-'}
                          </strong>
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleSaveTermGrade(st.studentId)}
                          disabled={isSaving}
                          className="btn-primary"
                          style={{
                            padding: '0.45rem 0.85rem',
                            fontSize: '0.82rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            borderRadius: '8px'
                          }}
                        >
                          <Save size={14} /> {isSaving ? 'Guardando...' : 'Guardar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadReportCard(st)}
                          className="btn-secondary"
                          style={{
                            padding: '0.45rem 0.85rem',
                            fontSize: '0.82rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            borderRadius: '8px'
                          }}
                          title="Descargar Boletín Oficial Trimestral en PDF"
                        >
                          <Download size={14} /> Boletín PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedStudentId(isExpanded ? null : st.studentId)}
                          style={{
                            padding: '0.45rem 0.6rem',
                            background: 'none',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.8rem'
                          }}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          <span style={{ fontSize: '0.75rem' }}>Competencias</span>
                        </button>
                      </div>
                    </div>

                    {/* Desplegable de Competencias CEFR y Observaciones */}
                    {isExpanded && (
                      <div style={{ padding: '1.25rem', background: 'var(--surface-alt)', borderTop: '1px solid var(--border)' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          Competencias Clave CEFR (Opcionales para el boletín)
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                          {[
                            { key: 'grammar', label: 'Grammar' },
                            { key: 'reading', label: 'Reading' },
                            { key: 'writing', label: 'Writing' },
                            { key: 'listening', label: 'Listening' },
                            { key: 'speaking', label: 'Speaking' }
                          ].map(({ key, label }) => (
                            <div key={key} style={{ padding: '0.45rem', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>{label}</span>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                placeholder="-"
                                value={(form as any)[key]}
                                onChange={(e) =>
                                  setStudentForms((prev) => ({
                                    ...prev,
                                    [st.studentId]: { ...form, [key]: e.target.value }
                                  }))
                                }
                                style={{
                                  width: '100%',
                                  textAlign: 'center',
                                  padding: '0.3rem',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border)',
                                  fontSize: '0.88rem',
                                  fontWeight: 700,
                                  color: 'var(--primary)',
                                  marginTop: '0.2rem'
                                }}
                              />
                            </div>
                          ))}
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                            Observaciones Pedagógicas del Profesor (aparecerán en el boletín)
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Comentarios sobre el progreso, actitud y áreas de mejora del alumno durante este trimestre..."
                            value={form.observations}
                            onChange={(e) =>
                              setStudentForms((prev) => ({
                                ...prev,
                                [st.studentId]: { ...form, observations: e.target.value }
                              }))
                            }
                            style={{
                              width: '100%',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              background: 'var(--surface)',
                              fontSize: '0.85rem',
                              color: 'var(--text-main)',
                              resize: 'vertical'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: BLOQUES DE TAREAS Y EJERCICIOS */}
      {activeTab === 'TASKS' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          {loadingTerm ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Cargando tareas estructuradas...
            </div>
          ) : tasksSummary.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <BookOpen size={40} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
              <p>No hay tareas estructuradas asignadas para el {selectedTerm}º Trimestre en este curso.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  Las tareas estructuradas se evalúan como bloques completos integrados. Los pasos no evaluables se marcan con tick (✓) y los evaluables reciben calificación.
                </span>
              </div>

              {tasksSummary.map((taskMeta) => {
                return (
                  <div
                    key={taskMeta.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      background: 'var(--surface)',
                      padding: '1.25rem'
                    }}
                  >
                    {/* Cabecera de la tarea */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '5px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
                            {taskMeta.category || 'GENERAL'}
                          </span>
                          {taskMeta.dueDate && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Plazo: {new Date(taskMeta.dueDate).toLocaleDateString('es-ES')}
                            </span>
                          )}
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{taskMeta.title}</h3>
                      </div>
                    </div>

                    {/* Alumnos y sus entregas en esta tarea */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {studentsList.map((st) => {
                        const studentTask = (st.tasks || []).find((t: any) => t.taskId === taskMeta.id);
                        if (!studentTask) return null;

                        const hasTaskGrade = studentTask.taskGrade !== null && studentTask.taskGrade !== undefined;
                        const isCompleted = studentTask.isCompleted;

                        const taskForReview: TaskForReview = {
                          taskId: studentTask.taskId,
                          title: studentTask.taskTitle,
                          category: studentTask.category,
                          dueDate: studentTask.dueDate,
                          steps: studentTask.steps || [],
                          taskGrade: studentTask.taskGrade,
                          taskFeedback: studentTask.taskFeedback
                        };

                        return (
                          <div
                            key={st.studentId}
                            style={{
                              padding: '0.85rem 1rem',
                              borderRadius: '8px',
                              background: 'var(--surface-alt)',
                              border: '1px solid var(--border)',
                              borderLeft: `4px solid ${isCompleted ? '#22c55e' : '#f59e0b'}`
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.45rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>{st.fullName}</strong>
                                {isCompleted ? (
                                  <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <CheckCircle2 size={13} /> Tarea Entregada
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.72rem', color: '#854d0e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <Clock3 size={13} /> En Progreso
                                  </span>
                                )}
                                {isCompleted && studentTask.dueDate && (
                                  <span style={{ fontSize: '0.72rem', color: studentTask.isLate ? '#92400e' : '#166534', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.12rem 0.45rem', borderRadius: '10px', background: studentTask.isLate ? '#fef3c7' : '#ecfdf5', border: `1px solid ${studentTask.isLate ? '#fde68a' : '#bbf7d0'}` }}>
                                    {studentTask.isLate ? 'Fuera de plazo' : 'Dentro de plazo'}
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                {hasTaskGrade ? (
                                  <span
                                    style={{
                                      padding: '0.25rem 0.65rem',
                                      borderRadius: '12px',
                                      fontWeight: 700,
                                      fontSize: '0.85rem',
                                      background: studentTask.taskGrade >= 5 ? '#eaf4ef' : '#fdf0f0',
                                      color: studentTask.taskGrade >= 5 ? '#24583e' : '#9e2a2b',
                                      border: `1px solid ${studentTask.taskGrade >= 5 ? '#bfe0d0' : '#f7caca'}`
                                    }}
                                  >
                                    Nota: {studentTask.taskGrade.toFixed(1)} / 10
                                  </span>
                                ) : (
                                  <span style={{ padding: '0.25rem 0.65rem', borderRadius: '12px', fontWeight: 600, fontSize: '0.78rem', background: '#fef7e8', color: '#8d5b12', border: '1px solid #fae0b0' }}>
                                    Sin calificar
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewingTask(taskForReview);
                                    setActiveReviewStudent({ id: st.studentId, name: st.fullName });
                                  }}
                                  className="btn-primary"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', borderRadius: '6px' }}
                                >
                                  <Edit3 size={13} /> Revisar Entrega Completa
                                </button>
                              </div>
                            </div>

                            {/* Chips de Pasos */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: '0.4rem 0' }}>
                              {(studentTask.steps || []).map((step: any, sIdx: number) => {
                                const isEvaluable = step.isEvaluable;
                                const hasGrade = step.grade !== null && step.grade !== undefined;

                                return (
                                  <span
                                    key={step.stepId || sIdx}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      background: !isEvaluable
                                        ? (step.isCompleted ? '#ecfdf5' : '#f1f5f9')
                                        : (hasGrade ? (step.grade >= 5 ? '#eaf4ef' : '#fdf0f0') : '#fef7e8'),
                                      color: !isEvaluable
                                        ? (step.isCompleted ? '#065f46' : '#64748b')
                                        : (hasGrade ? (step.grade >= 5 ? '#24583e' : '#9e2a2b') : '#8d5b12'),
                                      border: '1px solid rgba(0,0,0,0.06)'
                                    }}
                                  >
                                    {!isEvaluable ? (
                                      <>
                                        {step.isCompleted ? '✓' : '○'} {step.title}
                                      </>
                                    ) : (
                                      <>
                                        {hasGrade ? `${step.grade.toFixed(1)}/10` : '⏳'} {step.title}
                                      </>
                                    )}
                                  </span>
                                );
                              })}
                            </div>

                            {studentTask.taskFeedback && (
                              <div style={{ marginTop: '0.35rem', padding: '0.35rem 0.6rem', background: '#f8fafc', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', border: '1px solid #e2e8f0' }}>
                                💬 Feedback del profesor: "{studentTask.taskFeedback}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VISTA 3: ENTREGAS DIRECTAS (HISTORIAL) */}
      {activeTab === 'SUBMISSIONS' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          {/* Filtros de entregas */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {([
                ['ALL', `Todas (${submissions.length})`],
                ['PENDING', `Pendientes de evaluar`],
                ['GRADED', `Evaluadas`],
                ['EXAMS', `Exámenes`]
              ] as const).map(([filterKey, label]) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setSubmissionFilter(filterKey)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: submissionFilter === filterKey ? 'var(--primary)' : 'var(--border)',
                    background: submissionFilter === filterKey ? 'var(--primary-light)' : 'var(--surface)',
                    color: submissionFilter === filterKey ? 'var(--primary-text)' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: submissionFilter === filterKey ? 600 : 400,
                    cursor: 'pointer'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar alumno o tarea..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem 0.4rem 2rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-alt)',
                  fontSize: '0.82rem'
                }}
              />
            </div>
          </div>

          {loadingSubmissions ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando entregas...</div>
          ) : filteredSubmissions.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No se han encontrado entregas con los filtros actuales.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredSubmissions.map((sub) => {
                const examData = parseSavedExam(sub.content);
                const isExam = sub.materialType === 'FORM' || Boolean(examData);
                const hasGrade = sub.grade !== null && sub.grade !== undefined;

                return (
                  <div
                    key={sub.id}
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      borderLeft: `4px solid ${hasGrade ? (sub.grade! >= 5 ? '#22c55e' : '#ef4444') : '#f59e0b'}`
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)', display: 'block' }}>
                        {sub.assignmentTitle}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {sub.studentName} ({sub.studentEmail}) · {new Date(sub.submittedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {sub.dueDate && new Date(sub.submittedAt) > new Date(sub.dueDate) && <span style={{ display: 'inline-flex', marginLeft: '0.5rem', padding: '0.15rem 0.45rem', borderRadius: '10px', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.7rem', fontWeight: 700 }}>Fuera de plazo</span>}
                        {examData && examData.total !== null && examData.score !== null && (
                          <span style={{ marginLeft: '6px', fontWeight: 600, color: 'var(--primary)' }}>
                            · {examData.score} / {examData.total} aciertos
                          </span>
                        )}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {hasGrade ? (
                        <span style={{ padding: '0.35rem 0.75rem', borderRadius: '16px', fontWeight: 700, fontSize: '0.88rem', background: sub.grade! >= 5 ? '#eaf4ef' : '#fdf0f0', color: sub.grade! >= 5 ? '#24583e' : '#9e2a2b' }}>
                          {sub.grade!.toFixed(1)} / 10
                        </span>
                      ) : (
                        <span style={{ padding: '0.35rem 0.75rem', borderRadius: '16px', fontWeight: 600, fontSize: '0.78rem', background: '#fef7e8', color: '#8d5b12' }}>
                          Pendiente
                        </span>
                      )}

                      {isExam && (
                        <button
                          type="button"
                          onClick={() =>
                            setReviewingExam({
                              title: sub.assignmentTitle,
                              questions: sub.materialFormData?.questions || [],
                              answers: examData?.answers || {},
                              score: sub.grade,
                              total: examData?.total
                            })
                          }
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
                        >
                          Ver Examen
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEvaluatingSubmission(sub);
                          setGradeInput(sub.grade !== null && sub.grade !== undefined ? String(sub.grade) : '');
                          setFeedbackInput(sub.feedback || '');
                          setSaveError('');
                        }}
                        className="btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
                      >
                        <Edit3 size={13} /> {hasGrade ? 'Editar Nota' : 'Calificar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Calificación de Entrega Individual */}
      {evaluatingSubmission && (
        <div className="modal-backdrop" onClick={() => setEvaluatingSubmission(null)}>
          <div className="glass-panel modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Calificar Entrega</h3>
              <button onClick={() => setEvaluatingSubmission(null)} className="modal-close"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveSingleGrade}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Calificación (0 - 10)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  placeholder="Ej: 8.5"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Feedback u Observaciones
                </label>
                <textarea
                  rows={3}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="Comentarios sobre la entrega..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>

              {saveError && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{saveError}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setEvaluatingSubmission(null)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={isSavingGrade} className="btn-primary">
                  {isSavingGrade ? 'Guardando...' : 'Guardar Calificación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Revisión de Tarea Estructurada Completa */}
      {reviewingTask && activeReviewStudent && (
        <TaskDeliveryReviewModal
          task={reviewingTask}
          studentName={activeReviewStudent.name}
          onClose={() => {
            setReviewingTask(null);
            setActiveReviewStudent(null);
          }}
          onSaveGrade={handleSaveTaskDeliveryGrade}
          onReviewExam={(examStep) => {
            const parsed = parseSavedExam(examStep.content);
            setReviewingExam({
              title: examStep.title,
              questions: [],
              answers: parsed?.answers || {},
              score: examStep.grade,
              total: parsed?.total
            });
          }}
        />
      )}

      {/* Modal de Revisión de Examen */}
      {reviewingExam && (
        <ExamReviewModal
          title={reviewingExam.title}
          questions={reviewingExam.questions}
          answers={reviewingExam.answers}
          score={reviewingExam.score}
          total={reviewingExam.total}
          onClose={() => setReviewingExam(null)}
        />
      )}
    </div>
  );
};

export default GradesTab;

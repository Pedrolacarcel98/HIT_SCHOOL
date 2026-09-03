import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Edit3,
  ExternalLink,
  FileText,
  GraduationCap,
  Laptop,
  Search,
  Sparkles,
  Users,
  X
} from 'lucide-react';
import ExamReviewModal from '../components/ExamReviewModal';
import type { ReviewQuestion } from '../components/ExamReviewModal';

interface StudentData {
  id: string;
  email: string;
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  monthlyFee?: number | null;
  courseDurationMonths?: number | null;
}

interface FinalEvaluationData {
  id?: string;
  studentId?: string;
  grammar?: number | null;
  reading?: number | null;
  writing?: number | null;
  listening?: number | null;
  speaking?: number | null;
  overallGrade?: number | null;
  observations?: string | null;
}

interface CourseData {
  id: string;
  title: string;
  teacherId: string;
  students?: { id: string; name?: string; email: string }[];
}

interface SubmissionItem {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string | null;
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
  student?: {
    id: string;
    email: string;
    profile?: { firstName: string; lastName: string };
  };
}

interface FlatSubmission extends SubmissionItem {
  assignmentTitle: string;
  assignmentCategory: string;
  courseId?: string | null;
  courseTitle?: string;
  isDirect: boolean;
  materialType: string;
  materialUrl: string | null;
  materialFormData: any;
  studentName: string;
  studentEmail: string;
}

interface StudentWithMeta extends StudentData {
  fullName: string;
  enrolledCourses: CourseData[];
  submissions: FlatSubmission[];
  totalSubmissions: number;
  gradedSubmissions: number;
  pendingSubmissions: number;
  averageGrade: string | null;
  modality: 'PRESENCIAL' | 'ONLINE';
}

interface AssignmentItem {
  id: string;
  title: string;
  category: string;
  courseId?: string | null;
  studentId?: string | null;
  dueDate?: string | null;
  course?: { id: string; title: string } | null;
  student?: { id: string; email: string; profile?: { firstName: string; lastName: string } } | null;
  material?: { id: string; title: string; type: string; url?: string | null; formData?: any; description?: string | null } | null;
  submissions: SubmissionItem[];
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

const TeacherGrades: React.FC = () => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Vistas y Filtros
  const [viewMode, setViewMode] = useState<'STUDENTS' | 'CLASSES'>('STUDENTS');
  const [modalityFilter, setModalityFilter] = useState<'ALL' | 'PRESENCIAL' | 'ONLINE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState<StudentWithMeta | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Modales
  const [evaluatingSubmission, setEvaluatingSubmission] = useState<{
    subId: string;
    studentName: string;
    assignmentTitle: string;
    submittedAt: string;
    content: string | null;
    currentGrade: number | null;
    currentFeedback: string | null;
  } | null>(null);
  const [gradeInput, setGradeInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [reviewingExam, setReviewingExam] = useState<{ subId: string; title: string; questions?: ReviewQuestion[]; answers: Record<string, any>; score: number | null; total?: number | null; feedback: string | null } | null>(null);

  // Evaluación Final por Competencias
  const [currentEvaluation, setCurrentEvaluation] = useState<FinalEvaluationData | null>(null);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [evaluationForm, setEvaluationForm] = useState({
    grammar: '',
    reading: '',
    writing: '',
    listening: '',
    speaking: '',
    overallGrade: '',
    observations: ''
  });
  const [isSavingEvaluation, setIsSavingEvaluation] = useState(false);

  useEffect(() => {
    if (selectedStudentForDossier) {
      const fetchEvaluation = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${apiUrl}/api/students/${selectedStudentForDossier.id}/evaluation`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentEvaluation(data);
          } else {
            setCurrentEvaluation(null);
          }
        } catch (err) {
          console.error('Error al obtener evaluación final:', err);
        }
      };
      fetchEvaluation();
    } else {
      setCurrentEvaluation(null);
    }
  }, [selectedStudentForDossier?.id]);

  const openEvaluationModal = () => {
    if (currentEvaluation) {
      setEvaluationForm({
        grammar: currentEvaluation.grammar !== null && currentEvaluation.grammar !== undefined ? String(currentEvaluation.grammar) : '',
        reading: currentEvaluation.reading !== null && currentEvaluation.reading !== undefined ? String(currentEvaluation.reading) : '',
        writing: currentEvaluation.writing !== null && currentEvaluation.writing !== undefined ? String(currentEvaluation.writing) : '',
        listening: currentEvaluation.listening !== null && currentEvaluation.listening !== undefined ? String(currentEvaluation.listening) : '',
        speaking: currentEvaluation.speaking !== null && currentEvaluation.speaking !== undefined ? String(currentEvaluation.speaking) : '',
        overallGrade: currentEvaluation.overallGrade !== null && currentEvaluation.overallGrade !== undefined ? String(currentEvaluation.overallGrade) : '',
        observations: currentEvaluation.observations || ''
      });
    } else {
      setEvaluationForm({
        grammar: '',
        reading: '',
        writing: '',
        listening: '',
        speaking: '',
        overallGrade: '',
        observations: ''
      });
    }
    setIsEvaluationModalOpen(true);
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForDossier) return;
    try {
      setIsSavingEvaluation(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/students/${selectedStudentForDossier.id}/evaluation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(evaluationForm)
      });
      if (res.ok) {
        const updated = await res.json();
        setCurrentEvaluation(updated);
        setIsEvaluationModalOpen(false);
      }
    } catch (err) {
      console.error('Error al guardar evaluación final:', err);
    } finally {
      setIsSavingEvaluation(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [studentsRes, coursesRes, assignmentsRes] = await Promise.all([
        fetch(`${apiUrl}/api/students`, { headers }),
        fetch(`${apiUrl}/api/courses`, { headers }),
        fetch(`${apiUrl}/api/assignments/teacher`, { headers })
      ]);

      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (coursesRes.ok) {
        const loadedCourses = await coursesRes.json();
        // Cargar alumnos para cada clase
        const coursesWithStudents = await Promise.all(
          loadedCourses.map(async (c: CourseData) => {
            try {
              const stRes = await fetch(`${apiUrl}/api/courses/${c.id}/students`, { headers });
              if (stRes.ok) {
                const classStudents = await stRes.json();
                return { ...c, students: classStudents };
              }
            } catch {
              // fallback
            }
            return c;
          })
        );
        setCourses(coursesWithStudents);
      }
      if (assignmentsRes.ok) setAssignments(await assignmentsRes.json());
    } catch (err) {
      console.error('Error al cargar datos de calificaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Extraer todas las entregas aplanadas
  const allSubmissionsFlat = useMemo(() => {
    return assignments.flatMap(assignment =>
      assignment.submissions.map(sub => ({
        ...sub,
        assignmentTitle: assignment.title,
        assignmentCategory: assignment.category || 'GRAMMAR_VOCABULARY',
        courseId: assignment.courseId,
        courseTitle: assignment.course?.title,
        isDirect: Boolean(assignment.studentId),
        materialType: assignment.material?.type || (sub.content?.includes('"answers"') ? 'FORM' : 'DOCUMENT'),
        materialUrl: assignment.material?.url || null,
        materialFormData: assignment.material?.formData || null,
        studentName: sub.student?.profile ? `${sub.student.profile.firstName} ${sub.student.profile.lastName}`.trim() : (sub.student?.email || 'Alumno'),
        studentEmail: sub.student?.email || ''
      }))
    ).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [assignments]);

  // Asignar cursos a cada alumno
  const studentsWithMeta = useMemo(() => {
    return students.map(student => {
      const studentName = student.profile ? `${student.profile.firstName} ${student.profile.lastName}`.trim() : student.email;
      
      // Clases donde está matriculado
      const enrolledCourses = courses.filter(c => c.students?.some(s => s.id === student.id));

      // Entregas de este alumno
      const studentSubs = allSubmissionsFlat.filter(s => s.studentId === student.id);
      const gradedSubs = studentSubs.filter(s => s.grade !== null && s.grade !== undefined);
      const pendingSubs = studentSubs.filter(s => s.materialType !== 'FORM' && (s.grade === null || s.grade === undefined));

      // Media aritmética
      const averageGrade = gradedSubs.length > 0
        ? (gradedSubs.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedSubs.length).toFixed(1)
        : null;

      // Inferencia de Modalidad (Online si tiene asignaciones directas o clase online, Presencial por defecto)
      const hasDirectAssignments = assignments.some(a => a.studentId === student.id);
      const isOnline = hasDirectAssignments || enrolledCourses.some(c => c.title.toLowerCase().includes('online') || c.title.toLowerCase().includes('particular') || c.title.toLowerCase().includes('individual'));
      const modality: 'PRESENCIAL' | 'ONLINE' = isOnline ? 'ONLINE' : 'PRESENCIAL';

      return {
        ...student,
        fullName: studentName,
        enrolledCourses,
        submissions: studentSubs,
        totalSubmissions: studentSubs.length,
        gradedSubmissions: gradedSubs.length,
        pendingSubmissions: pendingSubs.length,
        averageGrade,
        modality
      };
    });
  }, [students, courses, assignments, allSubmissionsFlat]);

  // Filtrado de Alumnos
  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return studentsWithMeta.filter(st => {
      const matchesSearch = !q || st.fullName.toLowerCase().includes(q) || st.email.toLowerCase().includes(q) || st.enrolledCourses.some(c => c.title.toLowerCase().includes(q));
      const matchesModality = modalityFilter === 'ALL' || st.modality === modalityFilter;
      return matchesSearch && matchesModality;
    });
  }, [studentsWithMeta, searchTerm, modalityFilter]);

  // Clases con métricas
  const coursesWithMeta = useMemo(() => {
    return courses.map(course => {
      const isOnline = course.title.toLowerCase().includes('online') || course.title.toLowerCase().includes('particular') || course.title.toLowerCase().includes('individual');
      const modality: 'PRESENCIAL' | 'ONLINE' = isOnline ? 'ONLINE' : 'PRESENCIAL';

      const classSubs = allSubmissionsFlat.filter(s => s.courseId === course.id);
      const gradedSubs = classSubs.filter(s => s.grade !== null && s.grade !== undefined);
      const pendingSubs = classSubs.filter(s => s.materialType !== 'FORM' && (s.grade === null || s.grade === undefined));

      const averageGrade = gradedSubs.length > 0
        ? (gradedSubs.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedSubs.length).toFixed(1)
        : null;

      return {
        ...course,
        modality,
        totalStudents: course.students?.length || 0,
        submissions: classSubs,
        totalSubmissions: classSubs.length,
        pendingSubmissions: pendingSubs.length,
        averageGrade
      };
    });
  }, [courses, allSubmissionsFlat]);

  // Filtrado de Clases
  const filteredCourses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return coursesWithMeta.filter(c => {
      const matchesSearch = !q || c.title.toLowerCase().includes(q);
      const matchesModality = modalityFilter === 'ALL' || c.modality === modalityFilter;
      return matchesSearch && matchesModality;
    });
  }, [coursesWithMeta, searchTerm, modalityFilter]);

  // Abrir Modal de Calificación
  const openGradingModal = (sub: {
    id: string;
    studentName: string;
    assignmentTitle: string;
    submittedAt: string;
    content: string | null;
    grade: number | null;
    feedback: string | null;
  }) => {
    setEvaluatingSubmission({
      subId: sub.id,
      studentName: sub.studentName,
      assignmentTitle: sub.assignmentTitle,
      submittedAt: sub.submittedAt,
      content: sub.content,
      currentGrade: sub.grade,
      currentFeedback: sub.feedback
    });
    setGradeInput(sub.grade !== null && sub.grade !== undefined ? String(sub.grade) : '');
    setFeedbackInput(sub.feedback || '');
    setSaveError('');
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingSubmission) return;

    const savedExam = parseSavedExam(evaluatingSubmission.content);
    const calculatedExamGrade = savedExam?.score !== null && savedExam?.score !== undefined && savedExam.total
      ? (savedExam.score / savedExam.total) * 10
      : null;
    const numGrade = calculatedExamGrade ?? (gradeInput.trim() !== '' ? parseFloat(gradeInput) : null);
    if (numGrade !== null && (isNaN(numGrade) || numGrade < 0 || numGrade > 10)) {
      setSaveError('La calificación debe ser un número entre 0 y 10.');
      return;
    }

    try {
      setIsSavingGrade(true);
      setSaveError('');
      const token = localStorage.getItem('token');

      const res = await fetch(`${apiUrl}/api/assignments/submissions/${evaluatingSubmission.subId}/grade`, {
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

      // Actualizar estado local en assignments
      setAssignments(prev => prev.map(assignment => ({
        ...assignment,
        submissions: assignment.submissions.map(s => {
          if (s.id === evaluatingSubmission.subId) {
            return {
              ...s,
              grade: numGrade,
              feedback: feedbackInput.trim() || null
            };
          }
          return s;
        })
      })));

      setEvaluatingSubmission(null);
    } catch (err) {
      console.error(err);
      setSaveError('Error de conexión al guardar la calificación.');
    } finally {
      setIsSavingGrade(false);
    }
  };

  const handleSaveExamFeedback = async (feedback: string) => {
    if (!reviewingExam) return;

    const token = localStorage.getItem('token');
    const res = await fetch(`${apiUrl}/api/assignments/submissions/${reviewingExam.subId}/grade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ grade: reviewingExam.score, feedback: feedback || null })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al guardar el feedback.');
    }

    setAssignments(prev => prev.map(assignment => ({
      ...assignment,
      submissions: assignment.submissions.map(sub => sub.id === reviewingExam.subId ? { ...sub, feedback: feedback || null } : sub)
    })));
    setReviewingExam(null);
  };

  // Métricas globales
  const totalSubmissionsCount = allSubmissionsFlat.length;
  const totalPendingCount = allSubmissionsFlat.filter(s => s.materialType !== 'FORM' && (s.grade === null || s.grade === undefined)).length;
  const totalGradedCount = allSubmissionsFlat.filter(s => s.grade !== null && s.grade !== undefined).length;
  const gradingExamData = evaluatingSubmission ? parseSavedExam(evaluatingSubmission.content) : null;
  const isAutocorrectedExam = Boolean(gradingExamData?.total && gradingExamData.score !== null && gradingExamData.score !== undefined);

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Principal */}
      <header style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Award style={{ color: 'var(--primary)' }} /> Centro de Calificaciones
            </h1>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>
              Supervisa el rendimiento académico general por alumnos o agrupado por clases presenciales y online
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div style={{ padding: '0.45rem 0.85rem', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
              Entregas: <strong style={{ color: 'var(--text-main)' }}>{totalSubmissionsCount}</strong>
            </div>
            <div style={{ padding: '0.45rem 0.85rem', background: totalPendingCount > 0 ? '#fef7e8' : 'var(--surface)', border: totalPendingCount > 0 ? '1px solid #fae0b0' : '1px solid var(--border)', borderRadius: '10px', fontSize: '0.85rem', color: totalPendingCount > 0 ? '#8d5b12' : 'var(--text-muted)' }}>
              Por corregir: <strong>{totalPendingCount}</strong>
            </div>
            <div style={{ padding: '0.45rem 0.85rem', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--primary-text)' }}>
              Corregidas: <strong>{totalGradedCount}</strong>
            </div>
          </div>
        </div>
      </header>

      {/* Selector de Macro-Sección y Modos de Vista */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.75rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Tabs Principales: Vista por Alumnos vs Vista por Clases */}
          <div style={{ display: 'flex', background: 'var(--surface-alt)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => { setViewMode('STUDENTS'); setSelectedClassId(null); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.1rem',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'STUDENTS' ? 'var(--surface)' : 'transparent',
                color: viewMode === 'STUDENTS' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: viewMode === 'STUDENTS' ? 700 : 500,
                boxShadow: viewMode === 'STUDENTS' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Users size={17} /> Vista General por Alumnos ({students.length})
            </button>

            <button
              type="button"
              onClick={() => { setViewMode('CLASSES'); setSelectedStudentForDossier(null); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.1rem',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'CLASSES' ? 'var(--surface)' : 'transparent',
                color: viewMode === 'CLASSES' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: viewMode === 'CLASSES' ? 700 : 500,
                boxShadow: viewMode === 'CLASSES' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.15s ease'
              }}
            >
              <BookOpen size={17} /> Vista Agrupada por Clases ({courses.length})
            </button>
          </div>

          {/* Macro Filtro: Presencial vs Online */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Modalidad:</span>
            {([
              ['ALL', 'Todas las modalidades', null],
              ['PRESENCIAL', 'Presencial (Academia)', <GraduationCap size={15} />],
              ['ONLINE', 'Online / Individuales', <Laptop size={15} />]
            ] as const).map(([val, label, icon]) => (
              <button
                key={val}
                type="button"
                onClick={() => setModalityFilter(val)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '16px',
                  border: modalityFilter === val ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: modalityFilter === val ? 'var(--primary-light)' : 'var(--surface)',
                  color: modalityFilter === val ? 'var(--primary-text)' : 'var(--text-muted)',
                  fontWeight: modalityFilter === val ? 700 : 500,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Barra de Búsqueda */}
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={viewMode === 'STUDENTS' ? 'Buscar alumno por nombre, email o clase...' : 'Buscar clase o grupo...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.7rem 1rem 0.7rem 2.6rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface-alt)',
              color: 'var(--text-main)',
              fontSize: '0.92rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* =========================================================================
          VISTA 1: VISTA GENERAL POR ALUMNOS
         ========================================================================= */}
      {viewMode === 'STUDENTS' && (
        <>
          {loading ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Cargando alumnos y calificaciones...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <Users size={48} style={{ color: 'var(--primary)', opacity: 0.35, marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)' }}>No se encontraron alumnos</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                Prueba cambiando los filtros de modalidad o los términos de búsqueda.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
              {/* Listado de Alumnos */}
              <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  ALUMNOS REGISTRADOS ({filteredStudents.length})
                </div>

                <div style={{ maxHeight: '680px', overflowY: 'auto' }}>
                  {filteredStudents.map(student => {
                    const isSelected = selectedStudentForDossier?.id === student.id;

                    return (
                      <div
                        key={student.id}
                        onClick={() => setSelectedStudentForDossier(student)}
                        style={{
                          padding: '1.1rem 1.25rem',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--primary-subtle)' : 'transparent',
                          borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'var(--primary)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem'
                            }}>
                              {student.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)', display: 'block' }}>
                                {student.fullName}
                              </strong>
                              <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{student.email}</small>
                            </div>
                          </div>

                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: student.modality === 'ONLINE' ? '#eef2ff' : '#f0fdf4',
                            color: student.modality === 'ONLINE' ? '#4338ca' : '#15803d',
                            border: `1px solid ${student.modality === 'ONLINE' ? '#c7d2fe' : '#bbf7d0'}`
                          }}>
                            {student.modality === 'ONLINE' ? <Laptop size={12} /> : <GraduationCap size={12} />}
                            {student.modality === 'ONLINE' ? 'Online' : 'Presencial'}
                          </span>
                        </div>

                        {/* Clases matriculadas */}
                        <div style={{ margin: '0.5rem 0', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {student.enrolledCourses.length > 0 ? (
                            student.enrolledCourses.map(c => (
                              <span key={c.id} style={{ fontSize: '0.72rem', background: 'var(--surface-alt)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-main)' }}>
                                📖 {c.title}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                              Sin clases grupales (Alumno individual)
                            </span>
                          )}
                        </div>

                        {/* Resumen de Calificaciones */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px dashed var(--border)', fontSize: '0.82rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>
                            Tareas: <strong>{student.totalSubmissions}</strong>
                            {student.pendingSubmissions > 0 && (
                              <span style={{ color: '#8d5b12', fontWeight: 600, marginLeft: '4px' }}>
                                ({student.pendingSubmissions} pend.)
                              </span>
                            )}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Nota media:</span>
                            {student.averageGrade ? (
                              <span style={{
                                fontWeight: 700,
                                color: parseFloat(student.averageGrade) >= 5 ? '#24583e' : '#9e2a2b',
                                background: parseFloat(student.averageGrade) >= 5 ? '#eaf4ef' : '#fdf0f0',
                                padding: '1px 7px',
                                borderRadius: '12px',
                                border: `1px solid ${parseFloat(student.averageGrade) >= 5 ? '#bfe0d0' : '#f7caca'}`
                              }}>
                                {student.averageGrade} / 10
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>- / 10</span>
                            )}
                            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expediente Académico Detallado del Alumno Seleccionado */}
              {selectedStudentForDossier && (
                createPortal(
                <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: '260px', zIndex: 50, minHeight: '100vh', overflowY: 'auto', background: '#f8fafc', padding: '2rem' }}>
                  <div className="animate-fade-in" style={{ maxWidth: '1024px', margin: '0 auto', padding: '2rem', background: '#fff', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentForDossier(null)}
                      className="btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}
                    >
                      <ArrowLeft size={17} /> Volver a Calificaciones
                    </button>
                  {/* Encabezado del Expediente */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <span style={{ display: 'inline-flex', padding: '0.25rem 0.55rem', borderRadius: '999px', background: 'var(--primary-light)', color: 'var(--primary-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        EXPEDIENTE ACADÉMICO DEL ALUMNO
                      </span>
                      <h1 style={{ margin: '0.35rem 0 0', fontSize: '1.75rem', color: 'var(--text-main)' }}>
                        {selectedStudentForDossier.fullName}
                      </h1>
                      <p style={{ margin: '0.15rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {selectedStudentForDossier.email} · {selectedStudentForDossier.modality === 'ONLINE' ? '💻 Modalidad Online' : '🏫 Modalidad Presencial'}
                      </p>
                    </div>

                  </div>

                  {/* Sección de Evaluación Final por Competencias */}
                  <div
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      background: 'var(--surface-alt)',
                      border: '1px solid var(--border)',
                      marginBottom: '1.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '8px', color: 'var(--primary)' }}>
                          <Award size={20} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>Evaluación Final / Competencias</h3>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={openEvaluationModal}
                        className="btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                      >
                        <Edit3 size={15} />
                        {currentEvaluation ? 'Editar Evaluación Final' : 'Asignar Notas Finales'}
                      </button>
                    </div>

                    {currentEvaluation ? (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.65rem', marginBottom: '0.85rem' }}>
                          <div style={{ padding: '0.65rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>GRAMMAR</span>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>
                              {currentEvaluation.grammar !== null && currentEvaluation.grammar !== undefined ? `${currentEvaluation.grammar} / 10` : '-'}
                            </strong>
                          </div>

                          <div style={{ padding: '0.65rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>READING</span>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>
                              {currentEvaluation.reading !== null && currentEvaluation.reading !== undefined ? `${currentEvaluation.reading} / 10` : '-'}
                            </strong>
                          </div>

                          <div style={{ padding: '0.65rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>WRITING</span>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>
                              {currentEvaluation.writing !== null && currentEvaluation.writing !== undefined ? `${currentEvaluation.writing} / 10` : '-'}
                            </strong>
                          </div>

                          <div style={{ padding: '0.65rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>LISTENING</span>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>
                              {currentEvaluation.listening !== null && currentEvaluation.listening !== undefined ? `${currentEvaluation.listening} / 10` : '-'}
                            </strong>
                          </div>

                          <div style={{ padding: '0.65rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>SPEAKING</span>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>
                              {currentEvaluation.speaking !== null && currentEvaluation.speaking !== undefined ? `${currentEvaluation.speaking} / 10` : '-'}
                            </strong>
                          </div>

                          <div style={{ padding: '0.65rem', background: 'var(--primary-light)', borderRadius: '8px', border: '1px solid var(--primary-border)', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--primary-text)', display: 'block', fontWeight: 700 }}>NOTA GLOBAL</span>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--primary-text)' }}>
                              {currentEvaluation.overallGrade !== null && currentEvaluation.overallGrade !== undefined ? `${currentEvaluation.overallGrade} / 10` : '-'}
                            </strong>
                          </div>
                        </div>

                        {currentEvaluation.observations && (
                          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-main)', fontStyle: 'italic', background: 'var(--surface)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            💬 Observaciones: "{currentEvaluation.observations}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '0.75rem 0.9rem', background: '#fef7e8', borderRadius: '8px', border: '1px solid #fae0b0', color: '#8d5b12', fontSize: '0.85rem' }}>
                        ⚠️ Pendiente de evaluación final.
                      </div>
                    )}
                  </div>

                  {/* Listado de Entregas del Alumno */}
                  <h4 style={{ margin: '0 0 0.85rem', fontSize: '1rem', color: 'var(--text-main)' }}>
                    Historial de Tareas y Exámenes ({selectedStudentForDossier.submissions.length})
                  </h4>

                  {selectedStudentForDossier.submissions.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface-alt)', borderRadius: '10px' }}>
                      Este alumno aún no ha realizado entregas de tareas ni exámenes.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {selectedStudentForDossier.submissions.map(sub => {
                        const examData = parseSavedExam(sub.content);
                        const isExam = sub.materialType === 'FORM' || Boolean(examData);
                        const hasGrade = sub.grade !== null && sub.grade !== undefined;
                        const documentUrl = (sub.content && /^https?:\/\//i.test(sub.content)) ? sub.content : sub.materialUrl;

                        return (
                          <div
                            key={sub.id}
                            style={{
                              padding: '1.1rem 1.25rem',
                              borderRadius: '10px',
                              border: '1px solid var(--border)',
                              background: 'var(--surface)',
                              borderLeft: `4px solid ${hasGrade ? (sub.grade! >= 5 ? '#22c55e' : '#ef4444') : '#f59e0b'}`
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <div>
                                <strong style={{ fontSize: '1rem', color: 'var(--text-main)', display: 'block' }}>
                                  {sub.assignmentTitle}
                                </strong>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  Entregado el {new Date(sub.submittedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {hasGrade ? (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '16px',
                                    fontWeight: 700,
                                    fontSize: '0.92rem',
                                    background: sub.grade! >= 5 ? '#eaf4ef' : '#fdf0f0',
                                    color: sub.grade! >= 5 ? '#24583e' : '#9e2a2b',
                                    border: `1px solid ${sub.grade! >= 5 ? '#bfe0d0' : '#f7caca'}`
                                  }}>
                                    <CheckCircle2 size={15} /> {sub.grade!.toFixed(1)} / 10
                                  </span>
                                ) : (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '16px',
                                    fontWeight: 600,
                                    fontSize: '0.82rem',
                                    background: '#fef7e8',
                                    color: '#8d5b12',
                                    border: '1px solid #fae0b0'
                                  }}>
                                    <Clock3 size={14} /> Pendiente de evaluar
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Contenido / Texto entregado o Examen */}
                            {sub.content && (() => {
                              if (examData) {
                                return (
                                  <div style={{
                                    margin: '0.6rem 0',
                                    padding: '0.75rem 1rem',
                                    background: 'var(--surface-alt)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '0.75rem'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                      <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.4rem', borderRadius: '6px' }}>
                                        <FileText size={18} />
                                      </div>
                                      <div>
                                        <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                          Examen tipo test completado
                                        </strong>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setReviewingExam({
                                        subId: sub.id,
                                        title: sub.assignmentTitle,
                                        questions: sub.materialFormData?.questions || [],
                                        answers: examData.answers,
                                        score: sub.grade,
                                        total: examData.total,
                                        feedback: sub.feedback
                                      })}
                                      className="btn-secondary"
                                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                    >
                                      <FileText size={14} /> Revisar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openGradingModal(sub)}
                                      className="btn-primary"
                                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                    >
                                      <Edit3 size={14} /> Editar Nota y Feedback
                                    </button>
                                  </div>
                                );
                              }

                              if (/^https?:\/\//i.test(sub.content)) {
                                return (
                                  <div style={{ margin: '0.5rem 0', padding: '0.6rem 0.8rem', background: 'var(--surface-alt)', borderRadius: '6px', fontSize: '0.85rem' }}>
                                    <a href={sub.content} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                                      <ExternalLink size={14} /> Abrir documento entregado en la nube
                                    </a>
                                  </div>
                                );
                              }

                              return (
                                <div style={{ margin: '0.5rem 0', padding: '0.6rem 0.8rem', background: 'var(--surface-alt)', borderRadius: '6px', fontSize: '0.85rem' }}>
                                  <p style={{ margin: 0, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                                    {sub.content}
                                  </p>
                                </div>
                              );
                            })()}

                            {/* Feedback del profesor */}
                            {sub.feedback && (
                              <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--primary-subtle)', borderRadius: '6px', border: '1px solid var(--primary-border)', fontSize: '0.84rem' }}>
                                <strong style={{ color: 'var(--primary-text)', display: 'block', marginBottom: '0.2rem', fontSize: '0.78rem' }}>
                                  💬 Observaciones del profesor:
                                </strong>
                                <span style={{ color: 'var(--text-main)' }}>{sub.feedback}</span>
                              </div>
                            )}

                            {/* Botones de acción (para tareas manuales o documentos adjuntos) */}
                            {(!isExam || documentUrl) && (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                                {documentUrl && (
                                  <a
                                    href={documentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-secondary"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.7rem', fontSize: '0.8rem', textDecoration: 'none' }}
                                  >
                                    <ExternalLink size={14} /> Abrir Doc
                                  </a>
                                )}

                                {!isExam && (
                                  <button
                                    type="button"
                                    onClick={() => openGradingModal(sub)}
                                    className="btn-primary"
                                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
                                  >
                                    <Edit3 size={14} /> {hasGrade ? 'Editar Nota y Feedback' : 'Evaluar Tarea'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                </div>
                , document.body)
              )}
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          VISTA 2: VISTA AGRUPADA POR CLASES / GRUPOS
         ========================================================================= */}
      {viewMode === 'CLASSES' && (
        <>
          {loading ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Cargando clases y calificaciones...
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <BookOpen size={48} style={{ color: 'var(--primary)', opacity: 0.35, marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)' }}>No se encontraron clases</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                Prueba cambiando el filtro de modalidad o buscando otro título.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredCourses.map(course => {
                const isExpanded = selectedClassId === course.id;

                return (
                  <div key={course.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Header de la Tarjeta de Clase */}
                    <div
                      onClick={() => setSelectedClassId(isExpanded ? null : course.id)}
                      style={{
                        padding: '1.25rem 1.75rem',
                        background: isExpanded ? 'var(--surface-alt)' : 'var(--surface)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        borderBottom: isExpanded ? '1px solid var(--border)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          padding: '0.75rem',
                          borderRadius: '12px',
                          background: course.modality === 'ONLINE' ? '#eef2ff' : 'var(--primary-light)',
                          color: course.modality === 'ONLINE' ? '#4338ca' : 'var(--primary)'
                        }}>
                          {course.modality === 'ONLINE' ? <Laptop size={24} /> : <BookOpen size={24} />}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{course.title}</h3>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: course.modality === 'ONLINE' ? '#eef2ff' : '#f0fdf4',
                              color: course.modality === 'ONLINE' ? '#4338ca' : '#15803d',
                              border: `1px solid ${course.modality === 'ONLINE' ? '#c7d2fe' : '#bbf7d0'}`
                            }}>
                              {course.modality === 'ONLINE' ? 'Online' : 'Presencial'}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {course.totalStudents} alumnos matriculados · {course.totalSubmissions} entregas totales
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {course.pendingSubmissions > 0 && (
                          <span style={{ padding: '0.3rem 0.7rem', background: '#fef7e8', color: '#8d5b12', border: '1px solid #fae0b0', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                            {course.pendingSubmissions} por corregir
                          </span>
                        )}

                        <div style={{ textAlign: 'right' }}>
                          <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Media de la clase</small>
                          <strong style={{ fontSize: '1.05rem', color: course.averageGrade && parseFloat(course.averageGrade) >= 5 ? '#24583e' : 'var(--text-main)' }}>
                            {course.averageGrade ? `${course.averageGrade} / 10` : '- / 10'}
                          </strong>
                        </div>

                        {isExpanded ? <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />}
                      </div>
                    </div>

                    {/* Desglose de Entregas de los Alumnos de la Clase */}
                    {isExpanded && (
                      <div style={{ padding: '1.5rem 1.75rem', background: 'var(--background)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                            Entregas de los alumnos de {course.title} ({course.submissions.length})
                          </h4>
                        </div>

                        {course.submissions.length === 0 ? (
                          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: '10px' }}>
                            Aún no hay entregas de tareas ni exámenes en esta clase.
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--surface)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                              <thead>
                                <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>ALUMNO</th>
                                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>TAREA</th>
                                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>FECHA</th>
                                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>CALIFICACIÓN</th>
                                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>FEEDBACK</th>
                                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600, textAlign: 'right' }}>ACCIONES</th>
                                </tr>
                              </thead>
                              <tbody>
                                {course.submissions.map(sub => {
                                  const examData = parseSavedExam(sub.content);
                                  const isExam = sub.materialType === 'FORM' || Boolean(examData);
                                  const hasGrade = sub.grade !== null && sub.grade !== undefined;
                                  const documentUrl = (sub.content && /^https?:\/\//i.test(sub.content)) ? sub.content : sub.materialUrl;

                                  return (
                                    <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                        {sub.studentName}
                                      </td>
                                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                        {sub.assignmentTitle}
                                      </td>
                                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                        {new Date(sub.submittedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                      </td>
                                      <td style={{ padding: '0.85rem 1rem' }}>
                                        {hasGrade ? (
                                          <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            padding: '0.25rem 0.65rem',
                                            borderRadius: '12px',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            background: sub.grade! >= 5 ? '#eaf4ef' : '#fdf0f0',
                                            color: sub.grade! >= 5 ? '#24583e' : '#9e2a2b',
                                            border: `1px solid ${sub.grade! >= 5 ? '#bfe0d0' : '#f7caca'}`
                                          }}>
                                            {sub.grade!.toFixed(1)} / 10
                                          </span>
                                        ) : (
                                          <span style={{ padding: '0.25rem 0.65rem', borderRadius: '12px', fontSize: '0.78rem', background: '#fef7e8', color: '#8d5b12', border: '1px solid #fae0b0', fontWeight: 600 }}>
                                            Pendiente
                                          </span>
                                        )}
                                      </td>
                                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {sub.feedback || '—'}
                                      </td>
                                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                          {documentUrl && (
                                            <a
                                              href={documentUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="btn-secondary"
                                              style={{ display: 'inline-flex', alignItems: 'center', padding: '0.3rem 0.6rem', fontSize: '0.78rem', textDecoration: 'none' }}
                                            >
                                              Doc
                                            </a>
                                          )}

                                          {isExam ? (
                                            <>
                                            <button
                                              type="button"
                                              onClick={() => setReviewingExam({
                                                subId: sub.id,
                                                title: sub.assignmentTitle,
                                                questions: sub.materialFormData?.questions || [],
                                                answers: examData?.answers || {},
                                                score: sub.grade,
                                                total: examData?.total,
                                                feedback: sub.feedback
                                              })}
                                              className="btn-secondary"
                                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                                            >
                                              Ver Test
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => openGradingModal(sub)}
                                              className="btn-primary"
                                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                                            >
                                              Editar Nota y Feedback
                                            </button>
                                            </>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => openGradingModal(sub)}
                                              className="btn-primary"
                                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                            >
                                              {hasGrade ? 'Editar' : 'Evaluar'}
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          MODAL DE CALIFICACIÓN Y FEEDBACK
         ========================================================================= */}
      {evaluatingSubmission && createPortal(
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1rem'
        }}>
          <div className="glass-panel modal-card" style={{
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setEvaluatingSubmission(null)}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>

            {saveError && (
              <div style={{ padding: '0.75rem 1rem', background: '#fdf0f0', color: '#9e2a2b', border: '1px solid #f7caca', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
                {saveError}
              </div>
            )}

            <div style={{ padding: '1rem', background: 'var(--surface-alt)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{evaluatingSubmission.assignmentTitle}</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {new Date(evaluatingSubmission.submittedAt).toLocaleDateString('es-ES')}
                </span>
              </div>

              {evaluatingSubmission.content && (() => {
                const examData = parseSavedExam(evaluatingSubmission.content);
                if (examData) {
                  const examGrade = examData.score !== null && examData.total
                    ? ((examData.score / examData.total) * 10).toFixed(1)
                    : '-';
                  return (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ color: 'var(--primary-text)', fontWeight: 700, fontSize: '1.65rem', lineHeight: 1, textAlign: 'center' }}>
                        {examGrade} <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>/ 10</span>
                      </div>
                    </div>
                  );
                }

                if (/^https?:\/\//i.test(evaluatingSubmission.content)) {
                  return (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
                      <a href={evaluatingSubmission.content} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                        <ExternalLink size={15} /> Abrir documento entregado
                      </a>
                    </div>
                  );
                }

                return null;
              })()}
            </div>

            <form onSubmit={handleSaveGrade} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {!isAutocorrectedExam && <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Calificación Numérica (0 - 10)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    required
                    placeholder="Ej. 8.5"
                    value={gradeInput}
                    onChange={e => setGradeInput(e.target.value)}
                    style={{
                      width: '120px',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-alt)',
                      color: 'var(--text-main)',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[5, 7, 8, 9, 10].map(qGrade => (
                      <button
                        key={qGrade}
                        type="button"
                        onClick={() => setGradeInput(String(qGrade))}
                        style={{
                          padding: '0.4rem 0.65rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: gradeInput === String(qGrade) ? 'var(--primary)' : 'var(--surface)',
                          color: gradeInput === String(qGrade) ? '#ffffff' : 'var(--text-main)',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 600
                        }}
                      >
                        {qGrade}
                      </button>
                    ))}
                  </div>
                </div>
              </div>}

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Observaciones y Feedback (Visible para el alumno)
                </label>
                <textarea
                  rows={4}
                  placeholder="Escribe comentarios formativos, correcciones de gramática, vocabulario o pronunciación..."
                  value={feedbackInput}
                  onChange={e => setFeedbackInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-alt)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    outline: 'none',
                    lineHeight: '1.45'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEvaluatingSubmission(null)}
                  disabled={isSavingGrade}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingGrade}
                  className="btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem'
                  }}
                >
                  <Sparkles size={16} />
                  {isSavingGrade ? 'Guardando...' : 'Guardar Calificación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body
      )}

      {/* =========================================================================
          MODAL DE REVISIÓN DE EXAMEN TIPO TEST
         ========================================================================= */}
      {reviewingExam && createPortal(
        <ExamReviewModal
          title={reviewingExam.title}
          questions={reviewingExam.questions}
          answers={reviewingExam.answers}
          score={reviewingExam.score}
          total={reviewingExam.total}
          feedback={reviewingExam.feedback}
          onSaveFeedback={handleSaveExamFeedback}
          onClose={() => setReviewingExam(null)}
        />
      , document.body
      )}

      {/* =========================================================================
          MODAL DE EVALUACIÓN FINAL POR COMPETENCIAS
         ========================================================================= */}
      {isEvaluationModalOpen && selectedStudentForDossier && createPortal(
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel modal-card" style={{ width: '100%', maxWidth: '520px', padding: '2rem', background: 'var(--surface)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  EVALUACIÓN DOCENTE
                </span>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award style={{ color: 'var(--primary)' }} /> Evaluación Final / Competencias
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {selectedStudentForDossier.fullName}
                </p>
              </div>
              <button type="button" onClick={() => setIsEvaluationModalOpen(false)} className="modal-close" aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEvaluation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                    Grammar
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={evaluationForm.grammar}
                    onChange={e => setEvaluationForm({ ...evaluationForm, grammar: e.target.value })}
                    placeholder="0 - 10"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                    Reading
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={evaluationForm.reading}
                    onChange={e => setEvaluationForm({ ...evaluationForm, reading: e.target.value })}
                    placeholder="0 - 10"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                    Writing
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={evaluationForm.writing}
                    onChange={e => setEvaluationForm({ ...evaluationForm, writing: e.target.value })}
                    placeholder="0 - 10"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                    Listening
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={evaluationForm.listening}
                    onChange={e => setEvaluationForm({ ...evaluationForm, listening: e.target.value })}
                    placeholder="0 - 10"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', outline: 'none' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                    Speaking
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={evaluationForm.speaking}
                    onChange={e => setEvaluationForm({ ...evaluationForm, speaking: e.target.value })}
                    placeholder="0 - 10"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>
                    Nota Global
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const vals = [
                        evaluationForm.grammar,
                        evaluationForm.reading,
                        evaluationForm.writing,
                        evaluationForm.listening,
                        evaluationForm.speaking
                      ]
                        .map(Number)
                        .filter(n => !isNaN(n) && n > 0);
                      if (vals.length > 0) {
                        const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
                        setEvaluationForm({ ...evaluationForm, overallGrade: avg });
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                  >
                    ⚡ Calcular Media Automática
                  </button>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={evaluationForm.overallGrade}
                  onChange={e => setEvaluationForm({ ...evaluationForm, overallGrade: e.target.value })}
                  placeholder="Ej. 8.5"
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--primary-border)', background: 'var(--primary-light)', fontWeight: 700, color: 'var(--primary-text)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                  Observaciones y Feedback del Profesor
                </label>
                <textarea
                  rows={3}
                  value={evaluationForm.observations}
                  onChange={e => setEvaluationForm({ ...evaluationForm, observations: e.target.value })}
                  placeholder="Comentarios sobre la evolución, recomendaciones de estudio..."
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsEvaluationModalOpen(false)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isSavingEvaluation} className="btn-primary" style={{ padding: '0.55rem 1.25rem' }}>
                  {isSavingEvaluation ? 'Guardando...' : 'Guardar Evaluación Final'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body
      )}
    </div>
  );
};

export default TeacherGrades;

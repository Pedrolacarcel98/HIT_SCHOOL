import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Award,
  BookOpen,
  ChevronRight,
  Laptop,
  Search,
  Users
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import ModalityBadge from '../components/ModalityBadge';
import ExpedienteAcademico from '../components/ExpedienteAcademico';
import type { CourseData, FlatSubmission, StudentWithMeta } from '../components/ExpedienteAcademico';
import ClassGradesDetail from '../components/ClassGradesDetail';

interface StudentData {
  id: string;
  email: string;
  modality?: 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO';
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  monthlyFee?: number | null;
  courseDurationMonths?: number | null;
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
  structuredTaskStep?: {
    id: string;
    order: number;
    title: string;
    requiresSubmission: boolean;
    task?: { id: string; title: string; category: string; dueDate?: string | null } | null;
  } | null;
  submissions: SubmissionItem[];
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ParsedExamData {
  answers: Record<string, string | number | string[]>;
  score: number | null;
  total: number | null;
  hasOpenText?: boolean;
  openTextCount?: number;
  questionScores?: Record<string, number>;
}

const parseSavedExam = (content?: string | null): ParsedExamData | null => {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed.answers || typeof parsed.score === 'number' || parsed.hasOpenText) {
      return {
        answers: parsed.answers || {},
        score: typeof parsed.score === 'number' ? parsed.score : null,
        total: typeof parsed.total === 'number' ? parsed.total : null,
        hasOpenText: Boolean(parsed.hasOpenText),
        openTextCount: typeof parsed.openTextCount === 'number' ? parsed.openTextCount : (parsed.hasOpenText ? 1 : 0),
        questionScores: parsed.questionScores && typeof parsed.questionScores === 'object' ? parsed.questionScores : {}
      };
    }
    return null;
  } catch {
    return null;
  }
};

const isSubmissionPending = (s: { materialType?: string; grade?: number | null; content?: string | null }) => {
  if (s.grade !== null && s.grade !== undefined) return false;
  if (s.materialType !== 'FORM') return true;
  const exam = parseSavedExam(s.content);
  return Boolean(exam?.hasOpenText || (exam?.openTextCount ?? 0) > 0);
};

const TeacherGrades: React.FC = () => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [courseTermGrades, setCourseTermGrades] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  const [searchParams] = useSearchParams();
  const initialStudentQuery = searchParams.get('student') || '';

  // Vistas y Filtros
  const [viewMode, setViewMode] = useState<'STUDENTS' | 'CLASSES'>('CLASSES');
  const [modalityFilter, setModalityFilter] = useState<'ALL' | 'PRESENCIAL' | 'ONLINE'>('ALL');
  const [searchTerm, setSearchTerm] = useState(initialStudentQuery);
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState<StudentWithMeta | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedTerm] = useState(1);
  const [kpiFilter, setKpiFilter] = useState<'ALL' | 'PENDING' | 'GRADED'>('ALL');
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [, setMobileStep] = useState<'CLASSES_LIST' | 'CLASS_STUDENTS' | 'STUDENT_GRADES'>('CLASSES_LIST');

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
    const query = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const fetchCourseTermGrades = async () => {
      if (courses.length === 0) {
        setCourseTermGrades({});
        return;
      }

      const token = localStorage.getItem('token');
      const entries = await Promise.all(courses.map(async (course) => {
        try {
          const response = await fetch(`${apiUrl}/api/term-grades/course/${course.id}?term=${selectedTerm}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok) return [course.id, []] as const;
          const data = await response.json();
          return [course.id, data.students || []] as const;
        } catch {
          return [course.id, []] as const;
        }
      }));

      setCourseTermGrades(Object.fromEntries(entries));
    };

    fetchCourseTermGrades();
  }, [courses, selectedTerm]);

  useEffect(() => {
    if (initialStudentQuery) setViewMode('STUDENTS');
  }, [initialStudentQuery]);

  // Entregas aplanadas
  const allSubmissionsFlat: FlatSubmission[] = useMemo(() => {
    return assignments.flatMap(assignment =>
      assignment.submissions
        .filter(sub => (typeof sub.content === 'string' && sub.content.trim().length > 0) || (typeof sub.grade === 'number' && !Number.isNaN(sub.grade)))
        .map(sub => ({
          ...sub,
          assignmentTitle: assignment.title,
          assignmentCategory: assignment.category || 'GRAMMAR_VOCABULARY',
          dueDate: assignment.dueDate || assignment.structuredTaskStep?.task?.dueDate || null,
          courseId: assignment.courseId,
          courseTitle: assignment.course?.title,
          isDirect: Boolean(assignment.studentId),
          materialType: assignment.material?.type || (sub.content?.includes('"answers"') ? 'FORM' : 'DOCUMENT'),
          materialUrl: assignment.material?.url || null,
          materialFormData: assignment.material?.formData || null,
          structuredTaskId: assignment.structuredTaskStep?.task?.id || null,
          structuredTaskTitle: assignment.structuredTaskStep?.task?.title || null,
          structuredTaskCategory: assignment.structuredTaskStep?.task?.category || null,
          structuredStepOrder: assignment.structuredTaskStep?.order || null,
          structuredStepTitle: assignment.structuredTaskStep?.title || null,
          structuredStepRequiresSubmission: assignment.structuredTaskStep?.requiresSubmission || false,
          studentName: sub.student?.profile ? `${sub.student.profile.firstName} ${sub.student.profile.lastName}`.trim() : (sub.student?.email || 'Alumno'),
          studentEmail: sub.student?.email || ''
        }))
    ).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [assignments]);

  // Alumnos con metadatos globales
  const studentsWithMeta: StudentWithMeta[] = useMemo(() => {
    const role = localStorage.getItem('userRole');
    const visibleStudents = role === 'ADMIN'
      ? students
      : students.filter(student => courses.some(course => course.students?.some(courseStudent => courseStudent.id === student.id)));

    return visibleStudents.map(student => {
      const studentName = student.profile ? `${student.profile.firstName} ${student.profile.lastName}`.trim() : student.email;
      const enrolledCourses = courses.filter(c => c.students?.some(s => s.id === student.id));
      const studentSubs = allSubmissionsFlat.filter(s => s.studentId === student.id);
      const gradedSubs = studentSubs.filter(s => s.grade !== null && s.grade !== undefined);
      const pendingSubs = studentSubs.filter(s => isSubmissionPending(s));

      const averageGrade = gradedSubs.length > 0
        ? (gradedSubs.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedSubs.length).toFixed(1)
        : null;

      const modality: 'PRESENCIAL' | 'ONLINE' = student.modality === 'ONLINE' ? 'ONLINE' : 'PRESENCIAL';

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
  }, [students, courses, allSubmissionsFlat]);

  // Clases con métricas
  const coursesWithMeta = useMemo(() => {
    return courses.map(course => {
      const modality: 'PRESENCIAL' | 'ONLINE' = course.modality === 'ONLINE' ? 'ONLINE' : 'PRESENCIAL';
      const classSubs = allSubmissionsFlat.filter(s => s.courseId === course.id);
      const gradedSubs = classSubs.filter(s => s.grade !== null && s.grade !== undefined);
      const pendingSubs = classSubs.filter(s => isSubmissionPending(s));

      const averageGrade = gradedSubs.length > 0
        ? (gradedSubs.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedSubs.length).toFixed(1)
        : null;
      const termGrades = courseTermGrades[course.id] || [];
      const globalGrades = termGrades
        .map(student => student.overallGrade)
        .filter((grade): grade is number => typeof grade === 'number' && !Number.isNaN(grade));
      const classOverallGrade = globalGrades.length > 0
        ? (globalGrades.reduce((sum, grade) => sum + grade, 0) / globalGrades.length).toFixed(1)
        : null;

      return {
        ...course,
        modality,
        totalStudents: course.students?.length || 0,
        submissions: classSubs,
        totalSubmissions: classSubs.length,
        pendingSubmissions: pendingSubs.length,
        averageGrade,
        termGrades,
        classOverallGrade
      };
    });
  }, [courses, allSubmissionsFlat, courseTermGrades]);

  // Filtrado de Alumnos
  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return studentsWithMeta.filter(st => {
      const matchesSearch = !q || st.fullName.toLowerCase().includes(q) || st.email.toLowerCase().includes(q) || (st.enrolledCourses && st.enrolledCourses.some(c => c.title.toLowerCase().includes(q)));
      const matchesModality = modalityFilter === 'ALL' || st.modality === modalityFilter;
      const matchesKpi = kpiFilter === 'ALL'
        || (kpiFilter === 'PENDING' && st.submissions && st.submissions.some(sub => isSubmissionPending(sub)))
        || (kpiFilter === 'GRADED' && st.submissions && st.submissions.some(sub => sub.grade !== null && sub.grade !== undefined));
      return matchesSearch && matchesModality && matchesKpi;
    });
  }, [studentsWithMeta, searchTerm, modalityFilter, kpiFilter]);

  // Filtrado de Clases
  const filteredCourses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return coursesWithMeta.filter(c => {
      const matchesSearch = !q || c.title.toLowerCase().includes(q);
      const matchesModality = modalityFilter === 'ALL' || c.modality === modalityFilter;
      const matchesKpi = kpiFilter === 'ALL'
        || (kpiFilter === 'PENDING' && c.pendingSubmissions > 0)
        || (kpiFilter === 'GRADED' && c.totalSubmissions - c.pendingSubmissions > 0);
      return matchesSearch && matchesModality && matchesKpi;
    });
  }, [coursesWithMeta, searchTerm, modalityFilter, kpiFilter]);

  const selectedClassForDossier = useMemo(
    () => coursesWithMeta.find(course => course.id === selectedClassId) || null,
    [coursesWithMeta, selectedClassId]
  );

  const selectedClassStudents = useMemo(
    () => selectedClassForDossier?.students?.flatMap(courseStudent => {
      const student = studentsWithMeta.find(candidate => candidate.id === courseStudent.id);
      return student ? [student] : [];
    }) || [],
    [selectedClassForDossier, studentsWithMeta]
  );

  const openClassDossier = (course: typeof coursesWithMeta[number]) => {
    setSelectedClassId(course.id);
  };

  // KPIs globales
  const totalSubmissionsCount = allSubmissionsFlat.length;
  const totalPendingCount = allSubmissionsFlat.filter(s => isSubmissionPending(s)).length;
  const totalGradedCount = allSubmissionsFlat.filter(s => s.grade !== null && s.grade !== undefined).length;

  return (
    <div
      className="page-container animate-fade-in pb-8"
      style={{
        maxWidth: selectedClassId ? '1440px' : '1240px',
        margin: '0 auto',
        width: '100%',
        paddingBottom: '2rem'
      }}
    >
      {/* Header Principal con KPIs (Solo si no estamos en detalle de clase) */}
      {!selectedClassId && (
        <header style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Award style={{ color: 'var(--primary)' }} size={24} /> Calificaciones
              </h1>
            </div>

            <div className="grades-kpis">
              <button
                type="button"
                onClick={() => setKpiFilter('ALL')}
                className={`grades-kpi ${kpiFilter === 'ALL' ? 'is-active' : ''}`}
                aria-pressed={kpiFilter === 'ALL'}
              >
                Entregas: <strong>{totalSubmissionsCount}</strong>
              </button>
              <button
                type="button"
                onClick={() => setKpiFilter(current => current === 'PENDING' ? 'ALL' : 'PENDING')}
                className={`grades-kpi ${totalPendingCount > 0 ? 'is-alert' : ''} ${kpiFilter === 'PENDING' ? 'is-active' : ''}`}
                aria-pressed={kpiFilter === 'PENDING'}
              >
                Por corregir: <strong>{totalPendingCount}</strong>
              </button>
              <button
                type="button"
                onClick={() => setKpiFilter(current => current === 'GRADED' ? 'ALL' : 'GRADED')}
                className={`grades-kpi ${kpiFilter === 'GRADED' ? 'is-active' : ''}`}
                aria-pressed={kpiFilter === 'GRADED'}
              >
                Corregidas: <strong>{totalGradedCount}</strong>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* =========================================================================
          1. CONDICIONAL RENDER ESTRICTO: VISTA DETALLE DE CLASE vs VISTA PRINCIPAL
         ========================================================================= */}
      {selectedClassId && selectedClassForDossier ? (
        <ClassGradesDetail
          classId={selectedClassId}
          initialCourse={selectedClassForDossier}
          initialStudents={selectedClassStudents}
          initialSubmissions={allSubmissionsFlat}
          onBack={() => {
            setSelectedClassId(null);
            setSelectedStudentForDossier(null);
            setMobileStep('CLASSES_LIST');
          }}
          onGradeSaved={fetchData}
        />
      ) : (
        /* =========================================================================
           VISTA PRINCIPAL: BUSCADOR GLOBAL, TABS Y LISTADOS GENERALES
           ========================================================================= */
        <>
          {selectedStudentForDossier && viewMode === 'STUDENTS' ? (
            <div className="w-full">
              <ExpedienteAcademico
                studentId={selectedStudentForDossier.id}
                classId={null}
                student={selectedStudentForDossier}
                allSubmissions={allSubmissionsFlat}
                onBack={() => setSelectedStudentForDossier(null)}
                onGradeSaved={fetchData}
              />
            </div>
          ) : (
            <>
              {/* Selector de Macro-Sección y Modos de Vista */}
              <div className="glass-panel grades-mobile-filter-panel" style={{ padding: '1.25rem 1.75rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  {/* Tabs Principales: Vista por Alumnos vs Vista por Clases */}
                  <div style={{ display: 'flex', background: 'var(--surface-alt)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => { setViewMode('STUDENTS'); setSelectedClassId(null); setSelectedStudentForDossier(null); setMobileStep('CLASSES_LIST'); }}
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
                      onClick={() => { setViewMode('CLASSES'); setSelectedClassId(null); setSelectedStudentForDossier(null); setMobileStep('CLASSES_LIST'); }}
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
                </div>

                {/* Barra de Búsqueda y filtro de modalidad */}
                <div className="grades-filters-row">
                  <div className="filters-panel__search">
                    <Search size={17} />
                    <input
                      type="text"
                      placeholder={viewMode === 'STUDENTS' ? (isMobile ? 'Buscar alumno...' : 'Buscar alumno por nombre, email o clase...') : (isMobile ? 'Buscar clase...' : 'Buscar clase o grupo...')}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      aria-label="Buscar en calificaciones"
                    />
                  </div>

                  <div className="grades-filters-row__select">
                    <CustomSelect
                      value={modalityFilter}
                      onChange={setModalityFilter}
                      ariaLabel="Filtrar por modalidad"
                      options={[
                        { value: 'ALL', label: 'Todas las modalidades' },
                        { value: 'PRESENCIAL', label: 'Presencial (Academia)' },
                        { value: 'ONLINE', label: 'Online / Individuales' }
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* VISTA 1: ALUMNOS */}
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
                      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                          ALUMNOS REGISTRADOS ({filteredStudents.length})
                        </div>

                        <div style={{ maxHeight: '680px', overflowY: 'auto' }}>
                          {filteredStudents.map(student => (
                            <div
                              key={student.id}
                              onClick={() => setSelectedStudentForDossier(student)}
                              style={{
                                padding: '1.1rem 1.25rem',
                                borderBottom: '1px solid var(--border)',
                                cursor: 'pointer',
                                background: 'transparent',
                                borderLeft: '4px solid transparent',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  flexShrink: 0,
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
                                <div style={{ minWidth: 0 }}>
                                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {student.fullName}
                                  </strong>
                                  <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.76rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.email}</small>
                                  <ModalityBadge modality={student.modality} className="student-card-modality" />
                                </div>
                              </div>

                              <div style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
                                <span style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  Tareas: <strong>{student.totalSubmissions ?? 0}</strong>
                                  {(student.pendingSubmissions ?? 0) > 0 && (
                                    <span style={{ color: '#92400e', fontWeight: 700, marginLeft: '4px' }}>
                                      ({student.pendingSubmissions} pend.)
                                    </span>
                                  )}
                                </span>

                                <div className="student-grade-row">
                                  <span className="student-grade-row__course">Media global de tareas</span>
                                  <span className={`student-grade-row__pill ${student.averageGrade === null ? 'is-empty' : Number(student.averageGrade) >= 5 ? 'is-pass' : 'is-fail'}`}>
                                    {student.averageGrade !== null ? `${student.averageGrade} / 10` : '- / 10'}
                                  </span>
                                  <ChevronRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* VISTA 2: CLASES */}
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
                      {filteredCourses.map(course => (
                        <div key={course.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                          <div
                            onClick={() => openClassDossier(course)}
                            className="class-card-header"
                            style={{
                              background: 'var(--surface)',
                              cursor: 'pointer'
                            }}
                          >
                            <div className="class-card-header__main">
                              <div style={{
                                padding: '0.6rem',
                                borderRadius: '10px',
                                flexShrink: 0,
                                background: course.modality === 'ONLINE' ? '#eef2ff' : 'var(--primary-light)',
                                color: course.modality === 'ONLINE' ? '#4338ca' : 'var(--primary)'
                              }}>
                                {course.modality === 'ONLINE' ? <Laptop size={20} /> : <BookOpen size={20} />}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <h3 className="class-card-header__title">{course.title}</h3>
                                  <ModalityBadge modality={course.modality} />
                                </div>
                                <span className="class-card-header__meta">
                                  {`${course.totalStudents} alumno${course.totalStudents === 1 ? '' : 's'} matriculado${course.totalStudents === 1 ? '' : 's'} · ${course.totalSubmissions} entrega${course.totalSubmissions === 1 ? '' : 'es'}`}
                                </span>
                                <span className={`class-card-header__status ${course.pendingSubmissions > 0 ? 'is-pending' : 'is-clear'}`}>
                                  {course.pendingSubmissions > 0
                                    ? `${course.pendingSubmissions} por corregir`
                                    : 'Al día'}
                                </span>
                              </div>
                            </div>

                            <div className="class-card-header__aside">
                              <div style={{ textAlign: 'right', minWidth: 0 }}>
                                <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem' }}>Nota {selectedTerm}º trim.</small>
                                <strong style={{ fontSize: '1.05rem', whiteSpace: 'nowrap', color: course.classOverallGrade && parseFloat(course.classOverallGrade) >= 5 ? '#24583e' : 'var(--text-main)' }}>
                                  {course.classOverallGrade ? `${course.classOverallGrade} / 10` : '- / 10'}
                                </strong>
                              </div>
                              <ChevronRight size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherGrades;

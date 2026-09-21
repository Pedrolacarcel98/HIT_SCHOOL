import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Search } from 'lucide-react';
import ExpedienteAcademico, {
  type CourseData,
  type FlatSubmission,
  type StudentWithMeta
} from './ExpedienteAcademico';

export interface ClassGradesDetailProps {
  classId: string;
  onBack?: () => void;
  // Opcionales para renderizado instantáneo (Zero-delay) si el componente padre ya dispone de ellos
  initialCourse?: CourseData | null;
  initialStudents?: StudentWithMeta[];
  initialSubmissions?: FlatSubmission[];
  onGradeSaved?: () => void;
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
        openTextCount: typeof parsed.openTextCount === 'number' ? parsed.openTextCount : 0,
        questionScores: parsed.questionScores || {}
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

export const ClassGradesDetail: React.FC<ClassGradesDetailProps> = ({
  classId,
  onBack,
  initialCourse,
  initialStudents,
  initialSubmissions,
  onGradeSaved
}) => {
  const [course, setCourse] = useState<CourseData | null>(initialCourse || null);
  const [students, setStudents] = useState<StudentWithMeta[]>(initialStudents || []);
  const [allSubmissions, setAllSubmissions] = useState<FlatSubmission[]>(initialSubmissions || []);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithMeta | null>(null);
  const [loading, setLoading] = useState(!initialStudents || initialStudents.length === 0);
  const [mobileStudentQuery, setMobileStudentQuery] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sincronizar detección móvil
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  // Cerrar popover al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Función para obtener y procesar datos de la clase de manera autónoma
  const fetchClassData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [courseRes, studentsRes, assignmentsRes] = await Promise.all([
        fetch(`${apiUrl}/api/courses/${classId}`, { headers }),
        fetch(`${apiUrl}/api/courses/${classId}/students`, { headers }),
        fetch(`${apiUrl}/api/assignments/teacher`, { headers })
      ]);

      let loadedCourse: CourseData | null = null;
      if (courseRes.ok) {
        loadedCourse = await courseRes.json();
        setCourse(loadedCourse);
      }

      let flatSubs: FlatSubmission[] = [];
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        flatSubs = assignmentsData.flatMap((assignment: any) =>
          (assignment.submissions || [])
            .filter((sub: any) => (typeof sub.content === 'string' && sub.content.trim().length > 0) || (typeof sub.grade === 'number' && !Number.isNaN(sub.grade)))
            .map((sub: any) => ({
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
        ).sort((a: FlatSubmission, b: FlatSubmission) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setAllSubmissions(flatSubs);
      }

      if (studentsRes.ok) {
        const loadedRawStudents = await studentsRes.json();
        const mappedStudents: StudentWithMeta[] = loadedRawStudents.map((st: any) => {
          const studentName = st.profile ? `${st.profile.firstName} ${st.profile.lastName}`.trim() : st.email;
          const studentSubs = flatSubs.filter((s: FlatSubmission) => s.studentId === st.id && s.courseId === classId);
          const gradedSubs = studentSubs.filter(s => s.grade !== null && s.grade !== undefined);
          const pendingSubs = studentSubs.filter(s => isSubmissionPending(s));
          const averageGrade = gradedSubs.length > 0
            ? (gradedSubs.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedSubs.length).toFixed(1)
            : null;

          return {
            id: st.id,
            email: st.email,
            fullName: studentName,
            profile: st.profile,
            modality: (st.modality || loadedCourse?.modality || 'PRESENCIAL') as 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO',
            enrolledCourses: loadedCourse ? [loadedCourse] : [],
            submissions: studentSubs,
            totalSubmissions: studentSubs.length,
            gradedSubmissions: gradedSubs.length,
            pendingSubmissions: pendingSubs.length,
            averageGrade
          };
        });

        setStudents(mappedStudents);

        if (mappedStudents.length > 0) {
          setSelectedStudent(prev => {
            if (prev) {
              const matched = mappedStudents.find(s => s.id === prev.id);
              if (matched) return matched;
            }
            return mappedStudents[0];
          });
        } else {
          setSelectedStudent(null);
        }
      }
    } catch (err) {
      console.error('Error al cargar datos en ClassGradesDetail:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carga o sincronización al montar o cambiar props
  useEffect(() => {
    if (initialStudents && initialStudents.length > 0) {
      setStudents(initialStudents);
      if (initialCourse) setCourse(initialCourse);
      if (initialSubmissions) setAllSubmissions(initialSubmissions);
      setLoading(false);

      setSelectedStudent(prev => {
        if (prev) {
          const matched = initialStudents.find(s => s.id === prev.id);
          if (matched) return matched;
        }
        return initialStudents[0] || null;
      });
    } else {
      fetchClassData();
    }
  }, [classId, initialStudents, initialCourse, initialSubmissions]);

  // Selección de alumno con aislamiento de entregas
  const handleSelectStudent = (student: StudentWithMeta) => {
    const classSubs = (student.submissions || allSubmissions.filter(s => s.studentId === student.id)).filter(s => s.courseId === classId);
    const gradedSubs = classSubs.filter(s => s.grade !== null && s.grade !== undefined);
    const averageGrade = gradedSubs.length > 0
      ? (gradedSubs.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedSubs.length).toFixed(1)
      : null;

    setSelectedStudent({
      ...student,
      submissions: classSubs,
      totalSubmissions: classSubs.length,
      gradedSubmissions: gradedSubs.length,
      pendingSubmissions: classSubs.filter(s => isSubmissionPending(s)).length,
      averageGrade
    });
  };

  const handleGradeSaved = async () => {
    if (onGradeSaved) {
      onGradeSaved();
    }
    // Si no venía con initialSubmissions o para refresco en curso aislado
    if (!initialSubmissions || initialSubmissions.length === 0) {
      await fetchClassData();
    }
  };

  // Filtrado de alumnos en móvil
  const filteredMobileStudents = useMemo(() => {
    if (!mobileStudentQuery.trim()) return students;
    const q = mobileStudentQuery.toLowerCase();
    return students.filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [students, mobileStudentQuery]);

  return (
    <div className="w-full pb-8 animate-fade-in">
      {/* =========================================================================
          1. SELECTOR DE ALUMNOS EN MÓVIL (block md:hidden): Barra compacta superior con Popover
         ========================================================================= */}
      <div
        ref={dropdownRef}
        className="block md:hidden mb-4 bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 grades-class-mobile-bar relative"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          padding: '0.85rem 1rem',
          display: isMobile ? 'flex' : 'none',
          flexDirection: 'column',
          gap: '0.75rem',
          position: 'relative'
        }}
      >
        {/* Fila 1: Botón Volver y Badge de Clase */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer bg-transparent border-none p-0"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <ArrowLeft size={16} />
              <span>Volver a Clases</span>
            </button>
          )}

          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--primary)',
              background: 'var(--primary-light)',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {course?.title || 'Clase'} ({students.length})
          </span>
        </div>

        {/* Fila 2: Botón Activador del Desplegable Custom */}
        <button
          type="button"
          onClick={() => setIsDropdownOpen(prev => !prev)}
          className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-all cursor-pointer text-left active:scale-[0.99]"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '12px',
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            textAlign: 'left'
          }}
          aria-expanded={isDropdownOpen}
          aria-haspopup="listbox"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--primary, #059669)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.75rem',
                flexShrink: 0
              }}
            >
              {selectedStudent ? selectedStudent.fullName.slice(0, 2).toUpperCase() : '?'}
            </div>
            <div className="min-w-0 flex-1">
              <strong
                className="block text-xs font-bold text-slate-800 truncate"
                style={{
                  display: 'block',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {selectedStudent ? selectedStudent.fullName : 'Seleccionar alumno'}
              </strong>
              <span
                className="block text-[11px] text-slate-500 truncate"
                style={{
                  display: 'block',
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {selectedStudent?.email || 'Toca para abrir la lista'}
              </span>
            </div>
          </div>
          <ChevronDown
            size={17}
            className={`text-slate-400 shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-emerald-600' : ''}`}
            style={{
              transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              color: isDropdownOpen ? 'var(--primary)' : 'var(--text-muted)',
              flexShrink: 0
            }}
          />
        </button>

        {/* Popover Menú Desplegable */}
        {isDropdownOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 50,
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden'
            }}
          >
            {/* Buscador interno de alumnos */}
            <div className="p-3 border-b border-slate-100 bg-slate-50" style={{ padding: '0.65rem 0.85rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Buscar alumno por nombre o correo..."
                  value={mobileStudentQuery}
                  onChange={(e) => setMobileStudentQuery(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: '#ffffff',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                  aria-label="Buscar alumnos"
                />
              </div>
            </div>

            {/* Lista con avatares e indicador de selección */}
            <div
              className="max-h-60 overflow-y-auto divide-y divide-slate-100"
              style={{
                maxHeight: '240px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column'
              }}
              role="listbox"
            >
              {filteredMobileStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No se encontraron alumnos
                </div>
              ) : (
                filteredMobileStudents.map((st) => {
                  const isSelected = selectedStudent?.id === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        handleSelectStudent(st);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-3 p-3 text-left transition-colors cursor-pointer border-none ${
                        isSelected ? 'bg-emerald-50 text-emerald-900' : 'bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        padding: '0.7rem 0.9rem',
                        border: 'none',
                        background: isSelected ? 'var(--primary-subtle)' : '#ffffff',
                        color: isSelected ? 'var(--primary-text)' : 'var(--text-main)',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            background: isSelected ? 'var(--primary)' : 'var(--border)',
                            color: isSelected ? '#ffffff' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            flexShrink: 0
                          }}
                        >
                          {st.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <strong
                            className="block text-xs font-semibold truncate"
                            style={{
                              display: 'block',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              color: isSelected ? 'var(--primary-text)' : 'var(--text-main)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {st.fullName}
                          </strong>
                          <span
                            className="block text-[11px] text-slate-400 truncate mt-0.5"
                            style={{
                              display: 'block',
                              fontSize: '0.72rem',
                              color: 'var(--text-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {st.email}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <Check
                          size={15}
                          className="text-emerald-600 shrink-0"
                          style={{ color: 'var(--primary)', flexShrink: 0 }}
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          2. LAYOUT MASTER-DETAIL (CSS Grid para escritorio / Flujo en móvil)
         ========================================================================= */}
      <div
        className="w-full grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 items-stretch grades-class-layout"
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '320px 1fr',
          gap: '1.5rem',
          alignItems: 'stretch'
        }}
      >
        {/* A) COLUMNA IZQUIERDA: Pila Lateral de Alumnos (hidden md:flex) */}
        <aside
          className="hidden md:flex w-full h-full bg-white rounded-2xl shadow-sm border border-slate-200 flex-col overflow-hidden grades-class-sidebar"
          style={{
            width: '100%',
            height: '100%',
            minHeight: '100%',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            display: isMobile ? 'none' : 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header Fijo del Sidebar: Botón Volver + Título de Clase */}
          <div className="shrink-0" style={{ flexShrink: 0 }}>
            {onBack && (
              <div className="p-4 border-b border-slate-100 flex items-center justify-between" style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer bg-transparent border-none p-0"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <ArrowLeft size={16} />
                  <span>Volver a Clases</span>
                </button>
              </div>
            )}

            {/* Cabecera: Nombre de la clase y contador de alumnos */}
            <div className="p-4 bg-slate-50 border-b border-slate-100" style={{ padding: '1rem 1.25rem', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1" style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)' }}>
                Clase
              </span>
              <h2 className="text-base font-bold text-slate-800 truncate m-0" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                CLASE: {course?.title || 'Cargando...'}
              </h2>
              <span className="text-xs text-slate-500 mt-1 block" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {students.length} {students.length === 1 ? 'alumno matriculado' : 'alumnos matriculados'}
              </span>
            </div>
          </div>

          {/* Listado vertical de alumnos: ocupa el espacio disponible (flex-1) */}
          <div className="flex-1 divide-y divide-slate-100 grades-class-sidebar__students" style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
            {students.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {loading ? 'Cargando alumnos...' : 'No hay alumnos matriculados en esta clase.'}
              </div>
            ) : (
              students.map((student) => {
                const isSelected = selectedStudent?.id === student.id;
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleSelectStudent(student)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-all cursor-pointer border-none border-l-4 ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-500 font-semibold'
                        : 'bg-white text-slate-700 border-transparent hover:bg-slate-50'
                    }`}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      border: 'none',
                      borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                      background: isSelected ? 'var(--primary-subtle)' : 'transparent',
                      color: isSelected ? 'var(--primary-text)' : 'var(--text-main)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)'
                    }}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isSelected ? 'var(--primary)' : 'var(--border)',
                        color: isSelected ? '#ffffff' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        flexShrink: 0
                      }}
                    >
                      {student.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <strong className="block text-xs font-semibold text-slate-800 truncate" style={{ display: 'block', fontSize: '0.84rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student.fullName}
                      </strong>
                      <span className="block text-[11px] text-slate-400 truncate mt-0.5" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student.email}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* B) COLUMNA DERECHA: Expediente Académico del Alumno (Expansión Natural) */}
        <main
          className="w-full min-w-0 h-full flex flex-col grades-class-main"
          style={{
            width: '100%',
            minWidth: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {loading && !selectedStudent ? (
            <div
              className="w-full h-full bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex items-center justify-center text-center text-slate-400"
              style={{
                width: '100%',
                height: '100%',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                padding: '3rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)'
              }}
            >
              Cargando expediente de la clase...
            </div>
          ) : selectedStudent ? (
            <ExpedienteAcademico
              studentId={selectedStudent.id}
              classId={classId}
              student={selectedStudent}
              course={course}
              allSubmissions={allSubmissions}
              onGradeSaved={handleGradeSaved}
            />
          ) : (
            <div
              className="w-full h-full bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex items-center justify-center text-center text-slate-400"
              style={{
                width: '100%',
                height: '100%',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                padding: '3rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)'
              }}
            >
              No hay alumnos seleccionados en esta clase.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ClassGradesDetail;

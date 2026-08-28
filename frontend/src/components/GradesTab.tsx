import React, { useEffect, useMemo, useState } from 'react';
import { Award, Edit3, ExternalLink, FileText, Search, Sparkles, X } from 'lucide-react';
import ExamReviewModal from './ExamReviewModal';
import type { ReviewQuestion } from './ExamReviewModal';

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

const parseSavedAnswers = (content?: string | null): Record<string, string | number> => {
  const parsed = parseSavedExam(content);
  return parsed ? parsed.answers : {};
};

const GradesTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'GRADED' | 'EXAMS'>('ALL');

  // Modales
  const [evaluatingSubmission, setEvaluatingSubmission] = useState<SubmissionItem | null>(null);
  const [gradeInput, setGradeInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Modal Ver Examen
  const [reviewingExam, setReviewingExam] = useState<SubmissionItem | null>(null);

  const fetchTeacherAssignments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const res = await fetch(`${apiUrl}/api/assignments/teacher`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const assignments = await res.json();
        // Filtrar por curso
        const courseAssignments = assignments.filter((a: any) => a.courseId === courseId);

        // Aplanar entregas con datos del alumno y de la tarea
        const flattened: SubmissionItem[] = courseAssignments.flatMap((assignment: any) =>
          assignment.submissions.map((sub: any) => ({
            ...sub,
            assignmentTitle: assignment.title,
            assignmentCategory: assignment.category || 'GRAMMAR_VOCABULARY',
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
      console.error('Error al cargar entregas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherAssignments();
  }, [courseId]);

  const openGradingModal = (sub: SubmissionItem) => {
    setEvaluatingSubmission(sub);
    setGradeInput(sub.grade !== null && sub.grade !== undefined ? String(sub.grade) : '');
    setFeedbackInput(sub.feedback || '');
    setSaveError('');
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

      // Actualizar localmente
      setSubmissions(prev =>
        prev.map(s => (s.id === evaluatingSubmission.id ? { ...s, grade: numGrade, feedback: feedbackInput.trim() || null } : s))
      );

      setEvaluatingSubmission(null);
    } catch (err) {
      console.error(err);
      setSaveError('Error de conexión al calificar.');
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Filtros y Buscador
  const filteredSubmissions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return submissions.filter(sub => {
      const matchesSearch =
        !q ||
        sub.studentName.toLowerCase().includes(q) ||
        sub.studentEmail.toLowerCase().includes(q) ||
        sub.assignmentTitle.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (activeFilter === 'PENDING') {
        return sub.materialType !== 'FORM' && (sub.grade === null || sub.grade === undefined);
      }
      if (activeFilter === 'GRADED') {
        return sub.grade !== null && sub.grade !== undefined;
      }
      if (activeFilter === 'EXAMS') {
        return sub.materialType === 'FORM' || Boolean(parseSavedExam(sub.content));
      }
      return true;
    });
  }, [submissions, searchTerm, activeFilter]);

  // Contadores
  const pendingCount = submissions.filter(s => s.materialType !== 'FORM' && (s.grade === null || s.grade === undefined)).length;
  const gradedCount = submissions.filter(s => s.grade !== null && s.grade !== undefined).length;
  const examsCount = submissions.filter(s => s.materialType === 'FORM' || Boolean(parseSavedExam(s.content))).length;

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Cargando libro de calificaciones...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Encabezado y Estadísticas */}
      <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.65rem', borderRadius: '10px' }}>
              <Award size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-main)' }}>
                Calificaciones y Entregas
              </h2>
              <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Revisa las entregas del aula, asigna notas y redacta feedback pedagógico
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ padding: '0.4rem 0.8rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.82rem' }}>
              Total: <strong style={{ color: 'var(--text-main)' }}>{submissions.length}</strong>
            </div>
            <div style={{ padding: '0.4rem 0.8rem', background: pendingCount > 0 ? '#fef7e8' : 'var(--surface-alt)', border: pendingCount > 0 ? '1px solid #fae0b0' : '1px solid var(--border)', borderRadius: '8px', fontSize: '0.82rem', color: pendingCount > 0 ? '#8d5b12' : 'var(--text-muted)' }}>
              Pendientes: <strong>{pendingCount}</strong>
            </div>
            <div style={{ padding: '0.4rem 0.8rem', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--primary-text)' }}>
              Evaluadas: <strong>{gradedCount}</strong>
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Chips de filtro */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {([
              ['ALL', `Todas (${submissions.length})`],
              ['PENDING', `Pendientes de evaluar (${pendingCount})`],
              ['GRADED', `Evaluadas (${gradedCount})`],
              ['EXAMS', `Exámenes (${examsCount})`]
            ] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setActiveFilter(val)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '16px',
                  border: activeFilter === val ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: activeFilter === val ? 'var(--primary-light)' : 'transparent',
                  color: activeFilter === val ? 'var(--primary-text)' : 'var(--text-muted)',
                  fontWeight: activeFilter === val ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '340px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar alumno o tarea..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface-alt)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* Tabla de Entregas */}
      {filteredSubmissions.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <Award size={44} style={{ color: 'var(--primary)', opacity: 0.4, marginBottom: '0.75rem' }} />
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)', fontSize: '1.15rem' }}>
            No se encontraron entregas
          </h3>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.88rem' }}>
            {searchTerm ? 'Prueba con otros términos de búsqueda.' : 'Los alumnos aún no han completado tareas en esta clase.'}
          </p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>ALUMNO</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>TAREA ASIGNADA</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>FECHA ENTREGA</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>CALIFICACIÓN</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>OBSERVACIONES</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map(sub => {
                  const examData = parseSavedExam(sub.content);
                  const isExam = sub.materialType === 'FORM' || Boolean(examData);
                  const hasGrade = sub.grade !== null && sub.grade !== undefined;
                  const documentUrl = (sub.content && /^https?:\/\//i.test(sub.content)) ? sub.content : sub.materialUrl;

                  return (
                    <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s ease' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.82rem' }}>
                            {sub.studentName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>{sub.studentName}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{sub.studentEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                          {sub.assignmentTitle}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'var(--primary-subtle)', color: 'var(--primary-text)', border: '1px solid var(--primary-border)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                            {isExam ? 'Examen Interactivo' : sub.assignmentCategory.replace('_', ' ')}
                          </span>
                          {examData && examData.total !== null && examData.score !== null && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                              ({examData.score}/{examData.total} aciertos)
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(sub.submittedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {hasGrade ? (
                          <span style={{ padding: '0.35rem 0.75rem', borderRadius: '16px', fontWeight: 700, fontSize: '0.9rem', background: sub.grade! >= 5 ? '#eaf4ef' : '#fdf0f0', color: sub.grade! >= 5 ? '#24583e' : '#9e2a2b', border: `1px solid ${sub.grade! >= 5 ? '#bfe0d0' : '#f7caca'}` }}>
                            {sub.grade!.toFixed(1)} / 10
                          </span>
                        ) : (
                          <span style={{ padding: '0.35rem 0.75rem', borderRadius: '16px', fontWeight: 600, fontSize: '0.82rem', background: '#fef7e8', color: '#8d5b12', border: '1px solid #fae0b0' }}>
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', maxWidth: '200px' }}>
                        <span style={{ color: sub.feedback ? 'var(--text-main)' : 'var(--text-light)', fontSize: '0.85rem', fontStyle: !sub.feedback ? 'italic' : 'normal' }}>
                          {sub.feedback || 'Sin observaciones'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          {documentUrl && (
                            <button onClick={() => window.open(documentUrl, '_blank')} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', cursor: 'pointer' }}>
                              <ExternalLink size={16} />
                            </button>
                          )}
                          {isExam ? (
                            <button onClick={() => setReviewingExam(sub)} style={{ padding: '0.45rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500 }}>
                              <FileText size={16} /> Ver
                            </button>
                          ) : (
                            <button onClick={() => openGradingModal(sub)} className="btn-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}>
                              <Edit3 size={14} /> {hasGrade ? 'Editar' : 'Evaluar'}
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
        </div>
      )}

      {/* Modal: Calificar / Editar Nota Manual */}
      {evaluatingSubmission && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>EVALUACIÓN DE TAREA</span>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.3rem', color: 'var(--text-main)' }}>Calificar a {evaluatingSubmission.studentName}</h3>
              </div>
              <button onClick={() => setEvaluatingSubmission(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {saveError && <div style={{ padding: '0.75rem', background: '#fdf0f0', color: '#9e2a2b', border: '1px solid #f7caca', borderRadius: '8px', marginBottom: '1rem' }}>{saveError}</div>}
            
            <div style={{ padding: '1rem', background: 'var(--surface-alt)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '0.95rem' }}>{evaluatingSubmission.assignmentTitle}</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(evaluatingSubmission.submittedAt).toLocaleDateString('es-ES')}</span>
              </div>
              
              {evaluatingSubmission.content && (() => {
                const examData = parseSavedExam(evaluatingSubmission.content);
                if (examData) {
                  return (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontSize: '0.78rem', fontWeight: 600 }}>Resultado del examen interactivo:</span>
                      <div style={{ padding: '0.6rem 0.8rem', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.88rem' }}>
                        {examData.score !== null && examData.total !== null
                          ? `🎯 ${examData.score} / ${examData.total} preguntas acertadas (${Math.round((examData.score! / (examData.total! || 1)) * 100)}%)`
                          : `🎯 ${Object.keys(examData.answers).length} preguntas respondidas`}
                      </div>
                    </div>
                  );
                }
                if (/^https?:\/\//i.test(evaluatingSubmission.content)) {
                  return (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)', fontSize: '0.88rem' }}>
                      <a href={evaluatingSubmission.content} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                        <ExternalLink size={15} /> Abrir documento entregado en nueva pestaña
                      </a>
                    </div>
                  );
                }
                return (
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontSize: '0.78rem', fontWeight: 600 }}>Contenido entregado por el alumno:</span>
                    <p style={{ margin: 0, color: 'var(--text-main)', background: 'var(--surface)', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>{evaluatingSubmission.content}</p>
                  </div>
                );
              })()}
            </div>

            <form onSubmit={handleSaveGrade} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>Calificación Numérica (0 - 10)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input type="number" min="0" max="10" step="0.1" required placeholder="Ej. 8.5" value={gradeInput} onChange={e => setGradeInput(e.target.value)} style={{ width: '120px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center', outline: 'none' }} autoFocus />
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[5, 7, 8, 9, 10].map(qGrade => (
                      <button key={qGrade} type="button" onClick={() => setGradeInput(String(qGrade))} style={{ padding: '0.4rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: gradeInput === String(qGrade) ? 'var(--primary)' : 'var(--surface)', color: gradeInput === String(qGrade) ? '#ffffff' : 'var(--text-main)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>{qGrade}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>Feedback Pedagógico y Observaciones (Visible para el alumno)</label>
                <textarea rows={4} placeholder="Escribe comentarios formativos, correcciones de gramática, vocabulario o pronunciación..." value={feedbackInput} onChange={e => setFeedbackInput(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', fontSize: '0.9rem', resize: 'vertical', outline: 'none', lineHeight: '1.45' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEvaluatingSubmission(null)} disabled={isSavingGrade} style={{ padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                <button type="submit" disabled={isSavingGrade} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', opacity: isSavingGrade ? 0.7 : 1 }}>
                  <Sparkles size={16} /> {isSavingGrade ? 'Guardando...' : 'Guardar Calificación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver Corrección de Examen Interactivo */}
      {reviewingExam && (
        <ExamReviewModal
          title={reviewingExam.assignmentTitle}
          questions={(reviewingExam.materialFormData?.questions || []) as ReviewQuestion[]}
          answers={parseSavedAnswers(reviewingExam.content)}
          score={reviewingExam.grade}
          total={parseSavedExam(reviewingExam.content)?.total}
          onClose={() => setReviewingExam(null)}
        />
      )}
    </div>
  );
};

export default GradesTab;

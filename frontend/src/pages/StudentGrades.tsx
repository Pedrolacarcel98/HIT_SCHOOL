import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Award, CheckCircle2, Clock3, ExternalLink, FileText, MessageSquare, X } from 'lucide-react';
import ExamReviewModal from '../components/ExamReviewModal';
import { useParent } from '../context/ParentContext';

interface Question {
  id: string;
  questionText: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  options?: string[];
  correctAnswer: string | number;
  points?: number;
}

interface AssignmentGrade {
  id: string;
  title: string;
  course?: { title: string } | null;
  material?: { type: string; url?: string | null; formData?: { questions?: Question[] } | null } | null;
  submissions?: { grade?: number | null; submittedAt: string; content?: string | null; feedback?: string | null }[];
}

interface Attempt {
  answers: Record<string, string | number>;
  score?: number | null;
  total?: number | null;
}

interface FinalEvaluationData {
  grammar?: number | null;
  reading?: number | null;
  writing?: number | null;
  listening?: number | null;
  speaking?: number | null;
  overallGrade?: number | null;
  observations?: string | null;
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const parseAttempt = (content?: string | null): Attempt | null => {
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

const StudentGrades: React.FC = () => {
  const [assignments, setAssignments] = useState<AssignmentGrade[]>([]);
  const [evaluation, setEvaluation] = useState<FinalEvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<{ title: string; questions?: any[]; answers: Record<string, any>; score: number | null; total?: number | null } | null>(null);
  const [document, setDocument] = useState<AssignmentGrade | null>(null);
  const { selectedStudentId } = useParent();

  useEffect(() => {
    const loadGradesAndEvaluation = async () => {
      try {
        setLoading(true);
        const studentParam = selectedStudentId ? `?studentId=${selectedStudentId}` : '';
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [resAssignments, resEvaluation] = await Promise.all([
          fetch(`${apiUrl}/api/assignments/me${studentParam}`, { headers }),
          fetch(`${apiUrl}/api/students/me/evaluation${studentParam}`, { headers })
        ]);

        if (resAssignments.ok) setAssignments(await resAssignments.json());
        if (resEvaluation.ok) {
          const evalData = await resEvaluation.json();
          setEvaluation(evalData);
        } else {
          setEvaluation(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadGradesAndEvaluation();
  }, [selectedStudentId]);

  const openDocument = (assignment: AssignmentGrade) => {
    const submittedUrl = assignment.submissions?.[0]?.content;
    const url = submittedUrl && /^https?:\/\//i.test(submittedUrl) ? submittedUrl : assignment.material?.url;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else setDocument(assignment);
  };

  return (
    <div className="page-container animate-fade-in">
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}><Award style={{ color: 'var(--primary)' }} /> Calificaciones</h1>
        <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>Consulta tus resultados de clases y asignaciones directas.</p>
      </header>

      {/* Tarjeta Destacada de Calificaciones Finales / Evaluaciones por Competencias */}
      <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '10px', color: 'var(--primary)' }}>
            <Award size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Calificaciones Finales / Evaluaciones</h2>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Evaluación docente por competencias lingüísticas
            </p>
          </div>
        </div>

        {evaluation ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.85rem', background: 'var(--surface-alt)', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>GRAMMAR</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>
                  {evaluation.grammar !== null && evaluation.grammar !== undefined ? `${evaluation.grammar} / 10` : '-'}
                </strong>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--surface-alt)', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>READING</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>
                  {evaluation.reading !== null && evaluation.reading !== undefined ? `${evaluation.reading} / 10` : '-'}
                </strong>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--surface-alt)', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>WRITING</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>
                  {evaluation.writing !== null && evaluation.writing !== undefined ? `${evaluation.writing} / 10` : '-'}
                </strong>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--surface-alt)', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>LISTENING</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>
                  {evaluation.listening !== null && evaluation.listening !== undefined ? `${evaluation.listening} / 10` : '-'}
                </strong>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--surface-alt)', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>SPEAKING</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>
                  {evaluation.speaking !== null && evaluation.speaking !== undefined ? `${evaluation.speaking} / 10` : '-'}
                </strong>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--primary-light)', borderRadius: '10px', border: '1px solid var(--primary-border)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary-text)', display: 'block', fontWeight: 700 }}>NOTA GLOBAL</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--primary-text)' }}>
                  {evaluation.overallGrade !== null && evaluation.overallGrade !== undefined ? `${evaluation.overallGrade} / 10` : '-'}
                </strong>
              </div>
            </div>

            {evaluation.observations && (
              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-main)', fontStyle: 'italic' }}>
                💬 Observaciones del profesor: "{evaluation.observations}"
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '0.85rem 1rem', background: '#fef7e8', borderRadius: '8px', border: '1px solid #fae0b0', color: '#8d5b12', fontSize: '0.88rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock3 size={18} /> Pendiente de evaluación final
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <p style={emptyStyle}>Cargando calificaciones...</p> : assignments.length === 0 ? <p style={emptyStyle}>Aún no hay tareas o exámenes registrados.</p> : assignments.map(assignment => {
          const submission = assignment.submissions?.[0];
          const attempt = parseAttempt(submission?.content);
          const submitted = Boolean(submission);
          const isExam = assignment.material?.type === 'FORM' || Boolean(attempt);
          const hasGrade = submission?.grade !== null && submission?.grade !== undefined;
          const hasFeedback = Boolean(submission?.feedback);
          return <div key={assignment.id} style={rowStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={iconStyle}><FileText size={19} /></div>
              <div>
                <strong>{assignment.title}</strong>
                <small style={{ display: 'block', color: 'var(--text-muted)' }}>
                  {assignment.course?.title || 'Asignación directa'}{isExam ? ' · Examen interactivo' : ''}
                  {attempt && attempt.total !== null && attempt.score !== null && (
                    <span style={{ marginLeft: '6px', fontWeight: 600, color: 'var(--primary)' }}>
                      · {attempt.score} / {attempt.total} aciertos
                    </span>
                  )}
                </small>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
              {hasGrade ? <span style={gradeStyle}><CheckCircle2 size={15} /> {submission!.grade!.toFixed(1)} / 10</span> : <span style={pendingStyle}>{submitted ? <CheckCircle2 size={15} /> : <Clock3 size={15} />} {submitted ? 'Entregado' : 'Pendiente'}</span>}
              {hasFeedback && <button className="btn-secondary" onClick={() => setDocument(assignment)} style={smallButtonStyle}><MessageSquare size={14} /> Feedback</button>}
              {submitted && (isExam ? (
                <button
                  className="btn-secondary"
                  onClick={() => setReviewing({
                    title: assignment.title,
                    questions: assignment.material?.formData?.questions || [],
                    answers: attempt?.answers || {},
                    score: submission?.grade || null,
                    total: attempt?.total
                  })}
                  style={smallButtonStyle}
                >
                  Ver Examen Corregido
                </button>
              ) : (
                <button className="btn-secondary" onClick={() => openDocument(assignment)} style={smallButtonStyle}><ExternalLink size={14} /> Abrir documento</button>
              ))}
            </div>
          </div>;
        })}
      </div>
      {reviewing && (
        <ExamReviewModal
          title={reviewing.title}
          questions={reviewing.questions}
          answers={reviewing.answers}
          score={reviewing.score}
          total={reviewing.total}
          onClose={() => setReviewing(null)}
        />
      )}
      {document && createPortal(
        <div className="modal-backdrop" onClick={() => setDocument(null)}>
          <div className="glass-panel modal-card" onClick={event => event.stopPropagation()}>
            <button onClick={() => setDocument(null)} aria-label="Cerrar" className="modal-close"><X size={20} /></button>
            <h2 style={{ marginTop: 0 }}>Comentarios del profesor</h2>
            <p style={{ color: 'var(--text-main)', background: 'var(--surface-alt)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
              {document.submissions?.[0]?.feedback || 'El profesor aún no ha añadido comentarios.'}
            </p>
          </div>
        </div>,
        globalThis.document.body
      )}
    </div>
  );
};

const emptyStyle: React.CSSProperties = { padding: '3rem', color: 'var(--text-muted)', textAlign: 'center' };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' };
const iconStyle: React.CSSProperties = { display: 'grid', placeItems: 'center', width: '38px', height: '38px', borderRadius: '9px', background: 'var(--primary-light)', color: 'var(--primary)' };
const gradeStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.75rem', borderRadius: '16px', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', color: 'var(--primary-text)', fontWeight: 700 };
const pendingStyle: React.CSSProperties = { ...gradeStyle, color: '#8d5b12', background: '#fef7e8', borderColor: '#fae0b0' };
const smallButtonStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.7rem', fontSize: '0.8rem' };

export default StudentGrades;

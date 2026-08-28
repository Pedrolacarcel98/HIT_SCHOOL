import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Clock3, ExternalLink, FileText, MessageSquare, X } from 'lucide-react';
import ExamReviewModal from '../components/ExamReviewModal';

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
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<{ title: string; questions?: any[]; answers: Record<string, any>; score: number | null; total?: number | null } | null>(null);
  const [document, setDocument] = useState<AssignmentGrade | null>(null);

  useEffect(() => {
    const loadGrades = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/assignments/me`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        if (response.ok) setAssignments(await response.json());
      } finally {
        setLoading(false);
      }
    };
    loadGrades();
  }, []);

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
      {document && <div style={backdropStyle} onClick={() => setDocument(null)}><div className="glass-panel" onClick={event => event.stopPropagation()} style={{ width: 'min(100%, 520px)', padding: '1.5rem' }}><button onClick={() => setDocument(null)} aria-label="Cerrar" style={closeStyle}><X size={20} /></button><h2 style={{ marginTop: 0 }}>Comentarios del profesor</h2><p style={{ color: 'var(--text-main)', background: 'var(--surface-alt)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{document.submissions?.[0]?.feedback || 'El profesor aún no ha añadido comentarios.'}</p></div></div>}
    </div>
  );
};

const emptyStyle: React.CSSProperties = { padding: '3rem', color: 'var(--text-muted)', textAlign: 'center' };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' };
const iconStyle: React.CSSProperties = { display: 'grid', placeItems: 'center', width: '38px', height: '38px', borderRadius: '9px', background: 'var(--primary-light)', color: 'var(--primary)' };
const gradeStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.75rem', borderRadius: '16px', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', color: 'var(--primary-text)', fontWeight: 700 };
const pendingStyle: React.CSSProperties = { ...gradeStyle, color: '#8d5b12', background: '#fef7e8', borderColor: '#fae0b0' };
const smallButtonStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.7rem', fontSize: '0.8rem' };
const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', background: '#aeb4b7' };
const closeStyle: React.CSSProperties = { display: 'flex', marginLeft: 'auto', border: 'none', background: 'transparent', color: '#6b7280', cursor: 'pointer', padding: '0.1rem' };

export default StudentGrades;

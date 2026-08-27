import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Clock3, ExternalLink, FileText, X, XCircle } from 'lucide-react';

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
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const parseAttempt = (content?: string | null): Attempt | null => {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as Attempt;
    return parsed.answers ? parsed : null;
  } catch {
    return null;
  }
};

const isAnswerCorrect = (question: Question, answer: string | number | undefined) => question.type === 'SHORT_ANSWER'
  ? String(answer || '').trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase()
  : answer !== undefined && Number(answer) === Number(question.correctAnswer);

const StudentGrades: React.FC = () => {
  const [assignments, setAssignments] = useState<AssignmentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<AssignmentGrade | null>(null);
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
          const submitted = Boolean(submission);
          const isExam = assignment.material?.type === 'FORM';
          const hasGrade = submission?.grade !== null && submission?.grade !== undefined;
          return <div key={assignment.id} style={rowStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><div style={iconStyle}><FileText size={19} /></div><div><strong>{assignment.title}</strong><small style={{ display: 'block', color: 'var(--text-muted)' }}>{assignment.course?.title || 'Asignación directa'}{isExam ? ' · Examen interactivo' : ''}</small></div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
              {hasGrade ? <span style={gradeStyle}><CheckCircle2 size={15} /> {submission!.grade!.toFixed(1)} / 10</span> : <span style={pendingStyle}>{submitted ? <CheckCircle2 size={15} /> : <Clock3 size={15} />} {submitted ? 'Entregado' : 'Pendiente'}</span>}
              {submitted && (isExam ? <button className="btn-secondary" onClick={() => setReviewing(assignment)} style={smallButtonStyle}>Ver Examen Corregido</button> : <button className="btn-secondary" onClick={() => openDocument(assignment)} style={smallButtonStyle}><ExternalLink size={14} /> Abrir documento</button>)}
            </div>
          </div>;
        })}
      </div>
      {reviewing && <ExamReview assignment={reviewing} onClose={() => setReviewing(null)} />}
      {document && <div style={backdropStyle} onClick={() => setDocument(null)}><div className="glass-panel" onClick={event => event.stopPropagation()} style={{ width: 'min(100%, 520px)', padding: '1.5rem' }}><button onClick={() => setDocument(null)} aria-label="Cerrar" style={closeStyle}><X size={20} /></button><h2 style={{ marginTop: 0 }}>Comentarios del profesor</h2><p style={{ color: 'var(--text-muted)' }}>{document.submissions?.[0]?.feedback || 'El profesor aún no ha añadido comentarios.'}</p></div></div>}
    </div>
  );
};

const ExamReview: React.FC<{ assignment: AssignmentGrade; onClose: () => void }> = ({ assignment, onClose }) => {
  const submission = assignment.submissions?.[0];
  const attempt = parseAttempt(submission?.content);
  const questions = assignment.material?.formData?.questions || [];
  const score = questions.reduce((total, question) => total + (isAnswerCorrect(question, attempt?.answers[question.id]) ? question.points || 1 : 0), 0);
  const total = questions.reduce((totalPoints, question) => totalPoints + (question.points || 1), 0);
  const percentage = total ? Math.round((score / total) * 100) : 0;

  return <div style={backdropStyle} onClick={onClose}>
    <div className="glass-panel" onClick={event => event.stopPropagation()} style={reviewModalStyle}>
      <div style={reviewHeaderStyle}>
        <div><h2 style={{ margin: 0, fontSize: '1.3rem' }}>Corrección de Examen: {assignment.title}</h2></div>
        <button type="button" onClick={onClose} style={closeStyle} aria-label="Cerrar revisión"><X size={20} /></button>
      </div>
      <div style={scorePanelStyle}>
        <span style={{ display: 'block', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600 }}>Puntuación final</span>
        <strong style={{ display: 'block', marginTop: '0.35rem', color: '#374151', fontSize: '1.35rem' }}>{score} / {total} ({percentage}%)</strong>
      </div>
      <div style={reviewListStyle}>
        {questions.map((question, index) => {
          const answer = attempt?.answers[question.id];
          const correct = isAnswerCorrect(question, answer);
          const answerText = question.type === 'SHORT_ANSWER' ? String(answer || 'No respondida') : answer === undefined ? 'No respondida' : question.options?.[Number(answer)] || 'No respondida';
          const correctText = question.type === 'SHORT_ANSWER' ? String(question.correctAnswer) : question.options?.[Number(question.correctAnswer)] || String(question.correctAnswer);
          return <div key={question.id || index} style={{ ...questionCardStyle, borderColor: correct ? 'var(--primary-border)' : '#f7caca', borderLeftColor: correct ? 'var(--primary)' : '#ef4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}><span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: correct ? 'var(--primary-text)' : '#9e2a2b', fontWeight: 700 }}>{correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />} Pregunta {index + 1} ({correct ? `+${question.points || 1} pts` : '0 pts'})</span><span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{question.type === 'MULTIPLE_CHOICE' ? 'Opción Múltiple' : question.type === 'TRUE_FALSE' ? 'Verdadero/Falso' : 'Respuesta Corta'}</span></div>
            <p style={{ margin: '0 0 0.7rem', fontWeight: 600 }}>{question.questionText}</p>
            <p style={{ margin: 0, color: correct ? 'var(--primary-text)' : '#9e2a2b' }}>Tu respuesta: <strong>{answerText}</strong></p>
            {!correct && <p style={{ margin: '0.35rem 0 0', color: 'var(--primary-text)' }}>Respuesta correcta: <strong>{correctText}</strong></p>}
          </div>;
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}><button type="button" onClick={onClose} className="btn-secondary">Volver a mis Calificaciones</button></div>
    </div>
  </div>;
};

const emptyStyle: React.CSSProperties = { padding: '3rem', color: 'var(--text-muted)', textAlign: 'center' };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' };
const iconStyle: React.CSSProperties = { display: 'grid', placeItems: 'center', width: '38px', height: '38px', borderRadius: '9px', background: 'var(--primary-light)', color: 'var(--primary)' };
const gradeStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.75rem', borderRadius: '16px', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', color: 'var(--primary-text)', fontWeight: 700 };
const pendingStyle: React.CSSProperties = { ...gradeStyle, color: '#8d5b12', background: '#fef7e8', borderColor: '#fae0b0' };
const smallButtonStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.7rem', fontSize: '0.8rem' };
const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', background: '#aeb4b7' };
const reviewModalStyle: React.CSSProperties = { width: 'min(92vw, 570px)', height: 'min(90vh, 540px)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem 1.5rem 0.9rem', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 12px 28px rgba(31, 41, 55, 0.16)' };
const reviewHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid #e5e7eb' };
const scorePanelStyle: React.CSSProperties = { margin: '0.55rem auto 0.2rem', padding: '0.55rem 1.5rem', minWidth: '180px', textAlign: 'center', borderRadius: '9px', background: '#f3f4f6', border: '1px solid #e5e7eb' };
const reviewListStyle: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.7rem 0.1rem 0.25rem 0' };
const questionCardStyle: React.CSSProperties = { padding: '0.85rem 1rem', marginBottom: '0.7rem', border: '1px solid var(--border)', borderLeft: '4px solid var(--border)', borderRadius: '9px', background: 'var(--surface)' };
const closeStyle: React.CSSProperties = { display: 'flex', marginLeft: 'auto', border: 'none', background: 'transparent', color: '#6b7280', cursor: 'pointer', padding: '0.1rem' };

export default StudentGrades;

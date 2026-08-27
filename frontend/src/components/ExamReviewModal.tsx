import React from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';

export interface ReviewQuestion {
  id: string;
  questionText: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  options?: string[];
  correctAnswer: string | number;
  points?: number;
}

interface ExamReviewModalProps {
  title: string;
  questions: ReviewQuestion[];
  answers: Record<string, string | number>;
  score?: number | null;
  onClose: () => void;
}

const isCorrect = (question: ReviewQuestion, answer: string | number | undefined) => question.type === 'SHORT_ANSWER'
  ? String(answer || '').trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase()
  : answer !== undefined && Number(answer) === Number(question.correctAnswer);

const ExamReviewModal: React.FC<ExamReviewModalProps> = ({ title, questions, answers, score, onClose }) => {
  const total = questions.reduce((sum, question) => sum + (question.points || 1), 0);
  const earned = questions.reduce((sum, question) => sum + (isCorrect(question, answers[question.id]) ? question.points || 1 : 0), 0);
  const percentage = total ? Math.round((earned / total) * 100) : 0;

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div className="glass-panel" onClick={(event) => event.stopPropagation()} style={modalStyle}>
        <header style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#1f2937' }}>Corrección de Examen: {title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar revisión" style={closeStyle}><X size={19} /></button>
        </header>
        <div style={scoreStyle}>
          <span style={{ display: 'block', color: '#6b7280', fontSize: '0.75rem', fontWeight: 600 }}>Puntuación final</span>
          <strong style={{ display: 'block', marginTop: '0.25rem', color: '#374151', fontSize: '1.15rem' }}>{score === null || score === undefined ? `${earned} / ${total}` : `${score.toFixed(1)} / 10`} ({percentage}%)</strong>
        </div>
        <div style={listStyle}>
          {questions.map((question, index) => {
            const answer = answers[question.id];
            const correct = isCorrect(question, answer);
            const answerText = question.type === 'SHORT_ANSWER' ? String(answer || 'No respondida') : answer === undefined ? 'No respondida' : question.options?.[Number(answer)] || 'No respondida';
            const correctText = question.type === 'SHORT_ANSWER' ? String(question.correctAnswer) : question.options?.[Number(question.correctAnswer)] || String(question.correctAnswer);
            return <article key={question.id || index} style={{ ...questionStyle, borderColor: correct ? '#bfe0d0' : '#f7caca', borderLeftColor: correct ? '#4e9b75' : '#ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.45rem' }}><strong style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: correct ? '#24583e' : '#9e2a2b', fontSize: '0.88rem' }}>{correct ? <CheckCircle2 size={15} /> : <XCircle size={15} />} Pregunta {index + 1} ({correct ? `+${question.points || 1} pts` : '0 pts'})</strong><small style={{ color: '#6b7280' }}>{question.type === 'MULTIPLE_CHOICE' ? 'Opción Múltiple' : question.type === 'TRUE_FALSE' ? 'Verdadero/Falso' : 'Respuesta Corta'}</small></div>
              <p style={{ margin: '0 0 0.6rem', color: '#1f2937', fontWeight: 600 }}>{question.questionText}</p>
              <p style={{ margin: 0, color: correct ? '#24583e' : '#9e2a2b' }}>Tu respuesta: <strong>{answerText}</strong></p>
              {!correct && <p style={{ margin: '0.3rem 0 0', color: '#24583e' }}>Respuesta correcta: <strong>{correctText}</strong></p>}
            </article>;
          })}
        </div>
        <footer style={footerStyle}><button type="button" onClick={onClose} className="btn-secondary">Volver a mis Calificaciones</button></footer>
      </div>
    </div>
  );
};

const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', background: '#aeb4b7' };
const modalStyle: React.CSSProperties = { width: 'min(92vw, 570px)', height: 'min(90vh, 540px)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem 1.5rem 0.9rem', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 12px 28px rgba(31, 41, 55, 0.16)' };
const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid #e5e7eb' };
const scoreStyle: React.CSSProperties = { margin: '0.55rem auto 0.2rem', padding: '0.55rem 1.5rem', minWidth: '180px', textAlign: 'center', borderRadius: '9px', background: '#f3f4f6', border: '1px solid #e5e7eb' };
const listStyle: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.7rem 0.1rem 0.25rem 0' };
const questionStyle: React.CSSProperties = { padding: '0.85rem 1rem', marginBottom: '0.7rem', border: '1px solid #e5e7eb', borderLeft: '4px solid #9ca3af', borderRadius: '9px', background: '#ffffff' };
const footerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', padding: '0.75rem 0 0.85rem', borderTop: '1px solid #e5e7eb', background: '#ffffff' };
const closeStyle: React.CSSProperties = { display: 'flex', border: 'none', background: 'transparent', color: '#6b7280', cursor: 'pointer', padding: '0.1rem' };

export default ExamReviewModal;

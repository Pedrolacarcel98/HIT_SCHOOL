import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X, XCircle } from 'lucide-react';

export interface ReviewQuestion {
  id: string;
  questionText: string;
  blankText?: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_THE_BLANKS';
  options?: string[];
  correctAnswer: string | number;
  imageUrl?: string;
  caseSensitive?: boolean;
  points?: number;
}

interface ExamReviewModalProps {
  title: string;
  questions?: ReviewQuestion[];
  answers: Record<string, string | number | string[]>;
  score?: number | null;
  total?: number | null;
  feedback?: string | null;
  onSaveFeedback?: (feedback: string) => Promise<void>;
  onClose: () => void;
}

const getBlankAnswers = (questionText: string) => Array.from(questionText.matchAll(/\(([^)]+)\)/g), (match) => match[1]);

const getBlankText = (question: ReviewQuestion) => question.blankText || question.questionText;

const isCorrect = (question: ReviewQuestion, answer: string | number | string[] | undefined) => {
  if (question.type === 'FILL_IN_THE_BLANKS') {
    const expectedAnswers = getBlankAnswers(getBlankText(question));
    const submittedAnswers = Array.isArray(answer) ? answer : [];
    return expectedAnswers.length > 0 && expectedAnswers.every((expected, index) => {
      const submitted = String(submittedAnswers[index] || '').trim();
      const correct = expected.trim();
      return question.caseSensitive ? submitted === correct : submitted.toLowerCase() === correct.toLowerCase();
    });
  }

  return question.type === 'SHORT_ANSWER'
    ? String(answer || '').trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase()
    : answer !== undefined && Number(answer) === Number(question.correctAnswer);
};

const ExamReviewModal: React.FC<ExamReviewModalProps> = ({ title, questions = [], answers = {}, score, total: passedTotal, feedback, onSaveFeedback, onClose }) => {
  const [feedbackInput, setFeedbackInput] = useState(feedback || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setFeedbackInput(feedback || '');
  }, [feedback]);

  const calculatedTotal = questions.length > 0
    ? questions.reduce((sum, question) => sum + (question.points || 1), 0)
    : (passedTotal || Object.keys(answers).length || 1);

  const calculatedEarned = questions.length > 0
    ? questions.reduce((sum, question) => sum + (isCorrect(question, answers[question.id]) ? question.points || 1 : 0), 0)
    : (score !== null && score !== undefined ? (score <= 10 && calculatedTotal > 10 ? Math.round((score / 10) * calculatedTotal) : score) : 0);

  const gradeOutOfTen = calculatedTotal ? ((calculatedEarned / calculatedTotal) * 10).toFixed(1) : (score !== null && score !== undefined ? score.toFixed(1) : '-');

  const handleSaveFeedback = async () => {
    if (!onSaveFeedback) return;

    try {
      setIsSaving(true);
      setSaveError('');
      await onSaveFeedback(feedbackInput.trim());
    } catch (error) {
      console.error(error);
      setSaveError('No se pudieron guardar las observaciones.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="modal-backdrop" style={backdropStyle} onClick={onClose}>
      <div className="glass-panel modal-card" onClick={(event) => event.stopPropagation()} style={modalStyle}>
        <header style={headerStyle}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
              REVISIÓN
            </span>
            <h2 style={{ margin: '0.15rem 0 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>
              Corrección: {title}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar revisión" className="modal-close"><X size={20} /></button>
        </header>

        {/* Resumen de Puntuación */}
        <div style={scoreStyle}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', alignItems: 'center' }}>
            <div>
              <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Aciertos</span>
              <strong style={{ display: 'block', marginTop: '0.15rem', color: 'var(--text-main)', fontSize: '1.15rem' }}>
                {calculatedEarned} / {calculatedTotal}
              </strong>
            </div>
            <div style={{ width: '1px', height: '32px', background: 'var(--border)' }} />
            <div>
              <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Calificación</span>
              <strong style={{ display: 'block', marginTop: '0.15rem', color: parseFloat(gradeOutOfTen) >= 5 ? '#24583e' : '#9e2a2b', fontSize: '1.15rem' }}>
                {gradeOutOfTen} / 10
              </strong>
            </div>
          </div>
        </div>

        {/* Listado de Preguntas */}
        <div style={listStyle}>
          {questions.length > 0 ? (
            questions.map((question, index) => {
              const answer = answers[question.id];
              const correct = isCorrect(question, answer);
              const answerText = question.type === 'FILL_IN_THE_BLANKS'
                ? (Array.isArray(answer) && answer.length > 0 ? answer.join(' | ') : 'No respondida')
                : question.type === 'SHORT_ANSWER' ? String(answer || 'No respondida') : answer === undefined ? 'No respondida' : question.options?.[Number(answer)] || 'No respondida';
              const correctText = question.type === 'FILL_IN_THE_BLANKS'
                ? getBlankAnswers(getBlankText(question)).join(' | ')
                : question.type === 'SHORT_ANSWER' ? String(question.correctAnswer) : question.options?.[Number(question.correctAnswer)] || String(question.correctAnswer);

              return (
                <article key={question.id || index} style={{ ...questionStyle, borderColor: correct ? '#bfe0d0' : '#f7caca', borderLeftColor: correct ? '#22c55e' : '#ef4444' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.45rem' }}>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: correct ? '#24583e' : '#9e2a2b', fontSize: '0.88rem' }}>
                      {correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />} Pregunta {index + 1} ({correct ? `+${question.points || 1} pts` : '0 pts'})
                    </strong>
                    <small style={{ color: 'var(--text-muted)' }}>
                      {question.type === 'MULTIPLE_CHOICE' ? 'Opción Múltiple' : question.type === 'TRUE_FALSE' ? 'Verdadero/Falso' : question.type === 'FILL_IN_THE_BLANKS' ? 'Completar espacios' : 'Respuesta Corta'}
                    </small>
                  </div>
                  <p style={{ margin: '0 0 0.6rem', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.92rem' }}>{question.questionText}</p>
                  {question.type === 'FILL_IN_THE_BLANKS' && <p style={{ margin: '0 0 0.6rem', color: 'var(--text-main)', fontSize: '0.88rem' }}>{getBlankText(question).replace(/\([^)]+\)/g, '_____')}</p>}
                  {question.imageUrl && <img src={question.imageUrl} alt={`Imagen de apoyo de la pregunta ${index + 1}`} style={{ display: 'block', maxWidth: '100%', maxHeight: '240px', margin: '0 0 0.6rem', objectFit: 'contain', borderRadius: '6px', border: '1px solid var(--border)' }} />}
                  <p style={{ margin: 0, color: correct ? '#24583e' : '#9e2a2b', fontSize: '0.88rem' }}>Respuesta del alumno: <strong>{answerText}</strong></p>
                  {!correct && <p style={{ margin: '0.3rem 0 0', color: '#24583e', fontSize: '0.88rem' }}>Respuesta correcta esperada: <strong>{correctText}</strong></p>}
                </article>
              );
            })
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Respuestas registradas en el intento:
              </div>
              {Object.entries(answers).map(([key, val], idx) => (
                <div key={key} style={{ ...questionStyle, padding: '0.75rem 1rem' }}>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    Pregunta {idx + 1}
                  </strong>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                    Respuesta: <strong>{String(val)}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {onSaveFeedback && (
          <div style={{ paddingTop: '0.65rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 700 }}>
              Observaciones del profesor
            </label>
            <textarea
              rows={3}
              value={feedbackInput}
              onChange={(event) => setFeedbackInput(event.target.value)}
              placeholder="Añade comentarios pedagógicos visibles para el alumno..."
              style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', fontSize: '0.88rem', lineHeight: '1.4', resize: 'vertical', outline: 'none' }}
            />
            {saveError && <p style={{ margin: '0.4rem 0 0', color: '#b91c1c', fontSize: '0.82rem' }}>{saveError}</p>}
          </div>
        )}

        <footer style={footerStyle}>
          {onSaveFeedback && (
            <button type="button" onClick={handleSaveFeedback} disabled={isSaving} className="btn-primary" style={{ padding: '0.5rem 1.25rem', marginRight: '0.65rem' }}>
              {isSaving ? 'Guardando...' : 'Guardar Feedback'}
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>
            Cerrar
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', background: '#aeb4b7' };
const modalStyle: React.CSSProperties = { width: 'min(92vw, 570px)', height: 'min(90vh, 620px)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem 1.5rem 0.9rem', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 12px 28px rgba(31, 41, 55, 0.16)' };
const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid #e5e7eb' };
const scoreStyle: React.CSSProperties = { margin: '0.55rem auto 0.2rem', padding: '0.55rem 1.5rem', minWidth: '180px', textAlign: 'center', borderRadius: '9px', background: '#f3f4f6', border: '1px solid #e5e7eb' };
const listStyle: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.7rem 0.1rem 0.25rem 0' };
const questionStyle: React.CSSProperties = { padding: '0.85rem 1rem', marginBottom: '0.7rem', border: '1px solid #e5e7eb', borderLeft: '4px solid #9ca3af', borderRadius: '9px', background: '#ffffff' };
const footerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', padding: '0.75rem 0 0.85rem', borderTop: '1px solid #e5e7eb', background: '#ffffff' };

export default ExamReviewModal;

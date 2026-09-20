import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X, XCircle, Clock } from 'lucide-react';
import AudioPlayer from './AudioPlayer';

export interface ReviewQuestion {
  id: string;
  questionText: string;
  blankText?: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_THE_BLANKS' | 'OPEN_TEXT';
  options?: string[];
  correctAnswer?: string | number;
  imageUrl?: string;
  audioUrl?: string;
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
  questionScores?: Record<string, number>;
  onSaveFeedback?: (feedback: string) => Promise<void>;
  onSaveGradeAndFeedback?: (data: { grade: number; feedback: string; questionScores: Record<string, number> }) => Promise<void>;
  onClose: () => void;
  audioMode?: 'drive-preview' | 'backend-proxy';
}

const getBlankAnswers = (questionText: string) => Array.from(questionText.matchAll(/\(([^)]+)\)/g), (match) => match[1]);

const getBlankText = (question: ReviewQuestion) => question.blankText || question.questionText;

const isCorrect = (question: ReviewQuestion, answer: string | number | string[] | undefined) => {
  if (question.type === 'OPEN_TEXT') return false;
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

const ExamReviewModal: React.FC<ExamReviewModalProps> = ({
  title,
  questions = [],
  answers = {},
  score,
  total: passedTotal,
  feedback,
  questionScores = {},
  onSaveFeedback,
  onSaveGradeAndFeedback,
  onClose,
  audioMode = 'drive-preview'
}) => {
  const [feedbackInput, setFeedbackInput] = useState(feedback || '');
  const [scoresState, setScoresState] = useState<Record<string, number | undefined>>(questionScores || {});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setFeedbackInput(feedback || '');
  }, [feedback]);

  useEffect(() => {
    setScoresState(questionScores || {});
  }, [questionScores]);

  const openTextQuestions = questions.filter((q) => q.type === 'OPEN_TEXT');
  const hasOpenText = openTextQuestions.length > 0;
  const unratedOpenTextCount = openTextQuestions.filter((q) => {
    const s = scoresState[q.id];
    return s === undefined || s === null || isNaN(Number(s));
  }).length;

  const calculatedTotal = questions.length > 0
    ? questions.reduce((sum, question) => sum + (question.points || 1), 0)
    : (passedTotal || Object.keys(answers).length || 1);

  const calculatedObjectiveEarned = questions.length > 0
    ? questions.reduce((sum, question) => {
        if (question.type === 'OPEN_TEXT') return sum;
        return sum + (isCorrect(question, answers[question.id]) ? question.points || 1 : 0);
      }, 0)
    : (score !== null && score !== undefined ? (score <= 10 && calculatedTotal > 10 ? Math.round((score / 10) * calculatedTotal) : score) : 0);

  const openTextEarned = openTextQuestions.reduce((sum, q) => {
    const val = scoresState[q.id];
    return sum + (val !== undefined && val !== null && !isNaN(Number(val)) ? Number(val) : 0);
  }, 0);

  const calculatedEarned = calculatedObjectiveEarned + openTextEarned;

  const gradeOutOfTen = calculatedTotal ? ((calculatedEarned / calculatedTotal) * 10).toFixed(1) : (score !== null && score !== undefined ? score.toFixed(1) : '-');

  const handleSave = async () => {
    if (!onSaveGradeAndFeedback && !onSaveFeedback) return;

    try {
      setIsSaving(true);
      setSaveError('');

      if (onSaveGradeAndFeedback) {
        const cleanScores: Record<string, number> = {};
        openTextQuestions.forEach((q) => {
          const val = scoresState[q.id];
          cleanScores[q.id] = val !== undefined && val !== null && !isNaN(Number(val)) ? Number(val) : 0;
        });
        const numericGrade = parseFloat(gradeOutOfTen);
        await onSaveGradeAndFeedback({
          grade: isNaN(numericGrade) ? 0 : numericGrade,
          feedback: feedbackInput.trim(),
          questionScores: cleanScores
        });
      } else if (onSaveFeedback) {
        await onSaveFeedback(feedbackInput.trim());
      }
    } catch (error: any) {
      console.error(error);
      setSaveError(error.message || 'No se pudieron guardar las observaciones.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="modal-backdrop" style={backdropStyle} onClick={onClose}>
      <div className="glass-panel modal-card modal-card--review" onClick={(event) => event.stopPropagation()} style={modalStyle}>
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
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Puntos</span>
              <strong style={{ display: 'block', marginTop: '0.15rem', color: 'var(--text-main)', fontSize: '1.15rem' }}>
                {calculatedEarned} / {calculatedTotal}
              </strong>
            </div>
            <div style={{ width: '1px', height: '32px', background: 'var(--border)' }} />
            <div>
              <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Calificación</span>
              {hasOpenText && unratedOpenTextCount > 0 ? (
                <div style={{ marginTop: '0.15rem' }}>
                  <span style={{ color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '6px', fontSize: '0.86rem', fontWeight: 700 }}>
                    ⏳ {unratedOpenTextCount} {unratedOpenTextCount === 1 ? 'pregunta abierta por calificar' : 'preguntas abiertas por calificar'}
                  </span>
                </div>
              ) : (
                <strong style={{ display: 'block', marginTop: '0.15rem', color: parseFloat(gradeOutOfTen) >= 5 ? '#24583e' : '#9e2a2b', fontSize: '1.15rem' }}>
                  {gradeOutOfTen} / 10
                </strong>
              )}
            </div>
          </div>
        </div>

        {/* Listado de Preguntas */}
        <div style={listStyle}>
          {questions.length > 0 ? (
            questions.map((question, index) => {
              const answer = answers[question.id];

              if (question.type === 'OPEN_TEXT') {
                const isQuestionGraded = scoresState[question.id] !== undefined && scoresState[question.id] !== null && !isNaN(Number(scoresState[question.id]));
                const assignedPoints = isQuestionGraded ? Number(scoresState[question.id]) : null;

                return (
                  <article
                    key={question.id || index}
                    style={{
                      ...questionStyle,
                      borderColor: isQuestionGraded ? '#bfe0d0' : '#fde68a',
                      borderLeftColor: isQuestionGraded ? '#22c55e' : '#f59e0b',
                      background: isQuestionGraded ? '#ffffff' : '#fffdfa'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.45rem' }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isQuestionGraded ? '#24583e' : '#b45309', fontSize: '0.88rem' }}>
                        {isQuestionGraded ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                        Pregunta {index + 1} {isQuestionGraded ? `(+${assignedPoints} / ${question.points || 1} pts)` : '(⏳ Pendiente de calificar)'}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        Texto Libre / Redacción
                      </span>
                    </div>

                    <p style={{ margin: '0 0 0.6rem', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.92rem' }}>{question.questionText}</p>

                    {question.imageUrl && (
                      <img
                        src={question.imageUrl}
                        alt={`Imagen de apoyo de la pregunta ${index + 1}`}
                        style={{ display: 'block', maxWidth: '100%', maxHeight: '240px', margin: '0 0 0.6rem', objectFit: 'contain', borderRadius: '6px', border: '1px solid var(--border)' }}
                      />
                    )}

                    {question.audioUrl && (
                      <div style={{ margin: '0 0 0.6rem' }}>
                        <AudioPlayer src={question.audioUrl} title={`Pista de Audio - Pregunta ${index + 1}`} audioMode={audioMode} />
                      </div>
                    )}

                    <div style={{ marginTop: '0.5rem', marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                        Respuesta del alumno:
                      </span>
                      <div style={{
                        padding: '0.85rem 1rem',
                        background: 'var(--surface-alt)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-main)',
                        fontSize: '0.92rem',
                        lineHeight: '1.55',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '260px',
                        overflowY: 'auto'
                      }}>
                        {answer ? String(answer) : <em style={{ color: 'var(--text-muted)' }}>No respondida</em>}
                      </div>
                    </div>

                    {Boolean(onSaveGradeAndFeedback) ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '0.65rem 0.9rem',
                        borderRadius: '8px',
                        background: isQuestionGraded ? 'var(--surface-alt)' : '#fef3c7',
                        border: `1px solid ${isQuestionGraded ? 'var(--border)' : '#fde68a'}`
                      }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isQuestionGraded ? 'var(--text-main)' : '#92400e' }}>
                          Puntuación de esta pregunta:
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input
                            type="number"
                            min="0"
                            max={question.points || 1}
                            step="0.25"
                            value={scoresState[question.id] ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const val = raw === '' ? undefined : Math.min(Math.max(0, parseFloat(raw) || 0), question.points || 1);
                              setScoresState((prev) => ({
                                ...prev,
                                [question.id]: val
                              }));
                            }}
                            placeholder="0.0"
                            style={{
                              width: '85px',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: '#ffffff',
                              color: 'var(--text-main)',
                              fontSize: '0.92rem',
                              fontWeight: 'bold',
                              textAlign: 'center'
                            }}
                          />
                          <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            / {question.points || 1} pts
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.88rem', color: isQuestionGraded ? '#24583e' : '#b45309' }}>
                        {isQuestionGraded ? (
                          <>Calificación obtenida: <strong>{assignedPoints} / {question.points || 1} pts</strong></>
                        ) : (
                          <em>⏳ Pendiente de calificación por el profesor</em>
                        )}
                      </p>
                    )}
                  </article>
                );
              }

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
                  {question.audioUrl && (
                    <div style={{ margin: '0 0 0.6rem' }}>
                      <AudioPlayer src={question.audioUrl} title={`Pista de Audio - Pregunta ${index + 1}`} audioMode={audioMode} />
                    </div>
                  )}
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

        {(onSaveGradeAndFeedback || onSaveFeedback) && (
          <div style={{ paddingTop: '0.65rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 700 }}>
              Observaciones generales del profesor
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
          {(onSaveGradeAndFeedback || onSaveFeedback) && (
            <button type="button" onClick={handleSave} disabled={isSaving} className="btn-primary" style={{ padding: '0.5rem 1.25rem', marginRight: '0.65rem' }}>
              {isSaving ? 'Guardando...' : (hasOpenText && onSaveGradeAndFeedback ? 'Guardar Calificación y Feedback' : 'Guardar Feedback')}
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

const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)' };
const modalStyle: React.CSSProperties = { width: 'min(100%, 960px)', maxHeight: '92vh', overflowY: 'auto', padding: '1.75rem 2rem', background: '#ffffff', border: '1px solid rgba(226, 232, 240, 0.9)', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' };
const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid #e5e7eb' };
const scoreStyle: React.CSSProperties = { margin: '0.55rem auto 0.2rem', padding: '0.55rem 1.5rem', minWidth: '180px', textAlign: 'center', borderRadius: '9px', background: '#f3f4f6', border: '1px solid #e5e7eb' };
const listStyle: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.7rem 0.1rem 0.25rem 0' };
const questionStyle: React.CSSProperties = { padding: '0.85rem 1rem', marginBottom: '0.7rem', border: '1px solid #e5e7eb', borderLeft: '4px solid #9ca3af', borderRadius: '9px', background: '#ffffff' };
const footerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', padding: '0.75rem 0 0.85rem', borderTop: '1px solid #e5e7eb', background: '#ffffff' };

export default ExamReviewModal;

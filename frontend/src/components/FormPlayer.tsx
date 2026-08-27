import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Award } from 'lucide-react';
import AudioPlayer from './AudioPlayer';

interface Question {
  id: string;
  questionText: string;
  audioUrl?: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  options?: string[];
  correctAnswer: string | number; // index or string
  points: number;
}

interface FormPlayerProps {
  title: string;
  description?: string;
  questions: Question[];
  onFinish?: (score: number, total: number, answers: { [key: string]: any }) => void;
  readOnly?: boolean;
  allowRetry?: boolean;
  initialAnswers?: { [key: string]: any };
}

const FormPlayer: React.FC<FormPlayerProps> = ({ title, description, questions = [], onFinish, readOnly = false, allowRetry = true, initialAnswers = {} }) => {
  const [answers, setAnswers] = useState<{ [key: string]: any }>(initialAnswers);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  // Estados del Pop-up: 'COMPLETED' -> 'GRADE' -> 'REVIEW'
  const [showResultModal, setShowResultModal] = useState(false);
  const [modalStep, setModalStep] = useState<'COMPLETED' | 'GRADE' | 'REVIEW'>('COMPLETED');

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isSubmitted || readOnly) return;
    setAnswers({ ...answers, [questionId]: optionIndex });
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    if (isSubmitted || readOnly) return;
    setAnswers({ ...answers, [questionId]: text });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let earned = 0;
    let max = 0;

    questions.forEach((q) => {
      const qPoints = q.points || 1;
      max += qPoints;
      const userAnswer = answers[q.id];

      if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
        if (userAnswer !== undefined && Number(userAnswer) === Number(q.correctAnswer)) {
          earned += qPoints;
        }
      } else if (q.type === 'SHORT_ANSWER') {
        if (
          userAnswer &&
          String(userAnswer).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
        ) {
          earned += qPoints;
        }
      }
    });

    setScore(earned);
    setTotalPoints(max);
    setIsSubmitted(true);
    setModalStep('COMPLETED');
    setShowResultModal(true);
    onFinish?.(earned, max, answers);
  };

  const handleReset = () => {
    setAnswers({});
    setIsSubmitted(false);
    setScore(0);
    setShowResultModal(false);
    setModalStep('COMPLETED');
  };

  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
      {/* Cabecera del Examen */}
      <div className="glass-panel" style={{ padding: '2rem', borderTop: '4px solid var(--primary)' }}>
        <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text)', fontSize: '1.6rem' }}>{title}</h2>
        {description && <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: '1.5' }}>{description}</p>}
      </div>

      {/* Pop-up Modal de Resultado */}
      {showResultModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%',
            maxWidth: modalStep === 'REVIEW' ? '700px' : '460px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: modalStep === 'REVIEW' ? '1.5rem 2rem' : '2.5rem 2rem',
            textAlign: modalStep === 'REVIEW' ? 'left' : 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            border: '1px solid var(--border)',
            overflow: 'hidden'
          }}>
            {modalStep === 'COMPLETED' && (
              <div>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  color: 'var(--primary-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  border: '1px solid var(--primary-border)',
                  boxShadow: 'var(--shadow-primary)'
                }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text)', fontSize: '1.5rem' }}>¡Examen completado!</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0 0 2rem', lineHeight: '1.5' }}>
                  Has respondido a todas las preguntas. Pulsa el botón para ver tu resultado detallado.
                </p>
                <button
                  type="button"
                  onClick={() => setModalStep('GRADE')}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  <Award size={18} /> Ver Calificación
                </button>
              </div>
            )}

            {modalStep === 'GRADE' && (
              <div>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: percentage >= 60 ? 'var(--primary-light)' : 'rgba(239, 68, 68, 0.12)',
                  color: percentage >= 60 ? 'var(--primary-text)' : '#9e2a2b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  border: `1px solid ${percentage >= 60 ? 'var(--primary-border)' : '#f7caca'}`
                }}>
                  <Award size={36} />
                </div>

                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text)', fontSize: '1.5rem' }}>Tu Calificación</h3>
                
                <div style={{
                  margin: '1.5rem 0',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  background: percentage >= 60 ? 'var(--primary-subtle)' : '#fdf0f0',
                  border: `1px solid ${percentage >= 60 ? 'var(--primary-border)' : '#f7caca'}`
                }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: percentage >= 60 ? 'var(--primary-text)' : '#9e2a2b' }}>
                    {score} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/ {totalPoints}</span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text)', marginTop: '0.25rem' }}>
                    {percentage}% de Acierto
                  </div>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {percentage >= 60 ? '🎉 ¡Enhorabuena! Has superado el examen.' : '💪 Puedes reintentarlo para mejorar tu puntuación.'}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {allowRetry && <button
                    type="button"
                    onClick={() => setModalStep('REVIEW')}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    <CheckCircle2 size={16} /> Revisar Respuestas (Aciertos y Fallos)
                  </button>}

                  {allowRetry && <button
                    type="button"
                    onClick={handleReset}
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--text)',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={16} /> Reintentar Examen
                  </button>}
                </div>
              </div>
            )}

            {modalStep === 'REVIEW' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {/* Header de Revisión */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text)' }}>Revisión de Respuestas</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                      Puntuación final: {score} / {totalPoints} ({percentage}%)
                    </span>
                  </div>
                  {allowRetry && <button
                    type="button"
                    onClick={() => setModalStep('GRADE')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    ← Volver a mi Calificación
                  </button>}
                </div>

                {/* Lista Resumida de Preguntas */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
                  {questions.map((q, idx) => {
                    const userAnswer = answers[q.id];
                    const isCorrect = (q.type === 'SHORT_ANSWER' && String(userAnswer || '').trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) ||
                      (q.type !== 'SHORT_ANSWER' && Number(userAnswer) === Number(q.correctAnswer));

                    let userSelectedText = 'No respondida';
                    let correctText = '';

                    if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
                      if (userAnswer !== undefined && q.options?.[userAnswer]) {
                        userSelectedText = q.options[userAnswer];
                      }
                      if (q.options?.[Number(q.correctAnswer)]) {
                        correctText = q.options[Number(q.correctAnswer)];
                      }
                    } else {
                      userSelectedText = userAnswer || 'No respondida';
                      correctText = String(q.correctAnswer);
                    }

                    return (
                      <div
                        key={q.id || idx}
                        style={{
                          padding: '1.25rem',
                          borderRadius: '10px',
                          background: 'var(--surface)',
                          border: `1px solid ${isCorrect ? 'var(--primary-border)' : '#f7caca'}`,
                          borderLeft: `4px solid ${isCorrect ? 'var(--primary)' : '#ef4444'}`
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: isCorrect ? 'var(--primary-text)' : '#9e2a2b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            Pregunta {idx + 1} ({isCorrect ? `+${q.points || 1} pts` : '0 pts'})
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {q.type === 'MULTIPLE_CHOICE' ? 'Opción Múltiple' : q.type === 'TRUE_FALSE' ? 'Verdadero/Falso' : 'Respuesta Corta'}
                          </span>
                        </div>

                        <p style={{ margin: '0 0 0.75rem', fontWeight: '500', color: 'var(--text)', fontSize: '0.95rem' }}>
                          {q.questionText}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Tu respuesta: </span>
                            <strong style={{ color: isCorrect ? '#22c55e' : '#ef4444' }}>
                              {userSelectedText}
                            </strong>
                          </div>

                          {!isCorrect && (
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Respuesta correcta: </span>
                              <strong style={{ color: '#22c55e' }}>{correctText}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer de Revisión */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setModalStep('GRADE')}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    ← Volver a Calificación
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="btn-primary"
                    style={{
                      padding: '0.6rem 1.25rem',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={15} /> Reintentar Examen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista de Preguntas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {questions.map((q, idx) => {
          const userAnswer = answers[q.id];
          const isCorrect = isSubmitted && (
            (q.type === 'SHORT_ANSWER' && String(userAnswer || '').trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) ||
            (q.type !== 'SHORT_ANSWER' && Number(userAnswer) === Number(q.correctAnswer))
          );

          return (
            <div
              key={q.id || idx}
              className="glass-panel"
              style={{
                padding: '1.75rem',
                borderLeft: isSubmitted ? `4px solid ${isCorrect ? '#22c55e' : '#ef4444'}` : '1px solid var(--border)'
              }}
            >
              {/* Encabezado de Pregunta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span style={{ fontWeight: '600', color: 'var(--primary)', fontSize: '0.9rem' }}>
                  Pregunta {idx + 1}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--surface)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  {q.points || 1} {q.points === 1 ? 'punto' : 'puntos'}
                </span>
              </div>

              <h4 style={{ margin: '0 0 1rem', color: 'var(--text)', fontSize: '1.1rem', fontWeight: '500' }}>
                {q.questionText}
              </h4>

              {/* Reproductor de Audio asociado a la pregunta (Listening) */}
              {q.audioUrl && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <AudioPlayer src={q.audioUrl} title={`Pista de Audio - Pregunta ${idx + 1}`} />
                </div>
              )}

              {/* Opciones Tipo Test / True False */}
              {(q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') && q.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {q.options.map((opt, optIdx) => {
                    const isSelected = userAnswer === optIdx;
                    const isOptionCorrect = Number(q.correctAnswer) === optIdx;

                    let bg = 'var(--background)';
                    let border = '1px solid var(--border)';
                    let textColor = 'var(--text)';

                    if (isSubmitted) {
                      if (isOptionCorrect) {
                        bg = 'var(--primary-light)';
                        border = '1px solid var(--primary)';
                      } else if (isSelected && !isOptionCorrect) {
                        bg = 'rgba(239, 68, 68, 0.12)';
                        border = '1px solid #ef4444';
                      }
                    } else if (isSelected) {
                      bg = 'var(--primary-light)';
                      border = '1px solid var(--primary)';
                    }

                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.85rem 1.25rem',
                          borderRadius: '8px',
                          background: bg,
                          border: border,
                          cursor: isSubmitted ? 'default' : 'pointer',
                          transition: 'all 0.2s ease',
                          color: textColor
                        }}
                      >
                        <input
                          type="radio"
                          name={`question-${q.id}`}
                          checked={isSelected}
                          disabled={isSubmitted || readOnly}
                          onChange={() => handleSelectOption(q.id, optIdx)}
                          style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                        <span style={{ flex: 1, fontSize: '0.95rem' }}>{opt}</span>
                        {isSubmitted && isOptionCorrect && (
                          <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
                        )}
                        {isSubmitted && isSelected && !isOptionCorrect && (
                          <XCircle size={18} style={{ color: '#ef4444' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Respuesta Corta */}
              {q.type === 'SHORT_ANSWER' && (
                <div>
                  <input
                    type="text"
                    disabled={isSubmitted || readOnly}
                    value={userAnswer || ''}
                    onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                    placeholder="Escribe tu respuesta aquí..."
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: isSubmitted
                        ? (isCorrect ? '1px solid #22c55e' : '1px solid #ef4444')
                        : '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--text)',
                      outline: 'none'
                    }}
                  />
                  {isSubmitted && !isCorrect && (
                    <p style={{ margin: '0.5rem 0 0', color: '#ef4444', fontSize: '0.85rem' }}>
                      Respuesta correcta esperada: <strong>{q.correctAnswer}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!readOnly && !isSubmitted && questions.length > 0 && (
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-primary"
            style={{
              padding: '1rem 2.5rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              alignSelf: 'center',
              boxShadow: 'var(--shadow-primary)',
              cursor: 'pointer'
            }}
          >
            Enviar y Corregir Examen
          </button>
        )}
      </div>
    </div>
  );
};

export default FormPlayer;

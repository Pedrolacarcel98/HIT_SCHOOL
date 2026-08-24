import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle, Eye, Save, Music, HelpCircle } from 'lucide-react';
import FormPlayer from './FormPlayer';

interface Question {
  id: string;
  questionText: string;
  audioUrl?: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  options: string[];
  correctAnswer: string | number;
  points: number;
}

interface FormBuilderModalProps {
  onClose: () => void;
  onSaveSuccess: () => void;
  initialData?: any;
}

const FormBuilderModal: React.FC<FormBuilderModalProps> = ({ onClose, onSaveSuccess, initialData }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [level, setLevel] = useState(initialData?.level || 'B2');
  const [category, setCategory] = useState(initialData?.category || 'MOCK_EXAM');
  const [questions, setQuestions] = useState<Question[]>(
    initialData?.formData?.questions || [
      {
        id: 'q-1',
        questionText: 'Listen to the conversation and choose the correct answer:',
        audioUrl: '',
        type: 'MULTIPLE_CHOICE',
        options: ['Option A', 'Option B', 'Option C'],
        correctAnswer: 0,
        points: 1
      }
    ]
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addQuestion = () => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      questionText: '',
      audioUrl: '',
      type: 'MULTIPLE_CHOICE',
      options: ['Opción 1', 'Opción 2', 'Opción 3'],
      correctAnswer: 0,
      points: 1
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const q = questions[qIndex];
    updateQuestion(qIndex, {
      options: [...q.options, `Opción ${q.options.length + 1}`]
    });
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length <= 2) return;
    const newOptions = q.options.filter((_, i) => i !== optIndex);
    let newCorrect = q.correctAnswer;
    if (Number(newCorrect) >= newOptions.length) {
      newCorrect = 0;
    }
    updateQuestion(qIndex, { options: newOptions, correctAnswer: newCorrect });
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    const q = questions[qIndex];
    const newOptions = [...q.options];
    newOptions[optIndex] = text;
    updateQuestion(qIndex, { options: newOptions });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Por favor, indica un título para el formulario/examen');
      return;
    }

    if (questions.length === 0) {
      setError('Debes añadir al menos una pregunta');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const isEditing = !!initialData?.id;

      const payload = {
        title,
        description,
        type: 'FORM',
        level,
        category,
        formData: {
          questions
        }
      };

      const url = isEditing
        ? `${apiUrl}/api/materials/${initialData.id}`
        : `${apiUrl}/api/materials`;

      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSaveSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al guardar el formulario');
      }
    } catch (err) {
      setError('Error de conexión al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 60,
      padding: '1rem'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '900px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--surface-alt)',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle style={{ color: 'var(--primary)' }} />
              {initialData?.id ? 'Editar Examen Interactivo' : 'Creador de Examen / Formulario'}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Crea cuestionarios interactivos y simulacros con audios reproducibles
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: previewMode ? 'var(--primary)' : 'var(--surface)',
                color: previewMode ? '#ffffff' : 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              <Eye size={16} /> {previewMode ? 'Modo Editor' : 'Vista Previa'}
            </button>

            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {error && (
            <div style={{ padding: '0.75rem 1rem', background: '#fdf0f0', color: '#9e2a2b', border: '1px solid #f7caca', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {previewMode ? (
            <FormPlayer
              title={title || 'Título del Examen'}
              description={description}
              questions={questions}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Form Config Bar */}
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Título del Examen / Test</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. B2 First Listening Mock Exam - Part 1"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '1rem', fontWeight: 'bold' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Instrucciones / Descripción</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Instrucciones para el alumno..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', minHeight: '60px', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nivel</label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                    >
                      <option value="A1">A1 (Beginner)</option>
                      <option value="A2">A2 (Elementary)</option>
                      <option value="B1">B1 (Intermediate)</option>
                      <option value="B2">B2 (Upper-Intermediate)</option>
                      <option value="C1">C1 (Advanced)</option>
                      <option value="C2">C2 (Proficiency)</option>
                      <option value="GENERAL">General</option>
                    </select>
                  </div>

                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pilar (Skill)</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                    >
                      <option value="MOCK_EXAM">Mock Exams</option>
                      <option value="LISTENING">Listening</option>
                      <option value="READING">Reading</option>
                      <option value="GRAMMAR_VOCABULARY">Grammar and Vocabulary</option>
                      <option value="WRITING">Writing</option>
                      <option value="SPEAKING">Speaking</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '1.1rem' }}>Preguntas del Examen ({questions.length})</h4>

                {questions.map((q, qIndex) => (
                  <div key={q.id || qIndex} className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Pregunta #{qIndex + 1}</span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIndex)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                        >
                          <Trash2 size={16} /> Eliminar
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Enunciado de la Pregunta</label>
                        <input
                          type="text"
                          value={q.questionText}
                          onChange={(e) => updateQuestion(qIndex, { questionText: e.target.value })}
                          placeholder="Ej. What is the speaker suggesting in the recording?"
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                        />
                      </div>

                      {/* Audio URL Input */}
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <Music size={15} style={{ color: 'var(--primary)' }} /> URL de Audio para esta pregunta (Opcional para Listening)
                        </label>
                        <input
                          type="url"
                          value={q.audioUrl || ''}
                          onChange={(e) => updateQuestion(qIndex, { audioUrl: e.target.value })}
                          placeholder="https://ejemplo.com/audio-track-1.mp3"
                          style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tipo de Pregunta</label>
                          <select
                            value={q.type}
                            onChange={(e: any) => {
                              const newType = e.target.value;
                              let newOptions = q.options;
                              if (newType === 'TRUE_FALSE') {
                                newOptions = ['True', 'False'];
                              }
                              updateQuestion(qIndex, { type: newType, options: newOptions, correctAnswer: 0 });
                            }}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                          >
                            <option value="MULTIPLE_CHOICE">Opción Múltiple (Test)</option>
                            <option value="TRUE_FALSE">Verdadero / Falso</option>
                            <option value="SHORT_ANSWER">Respuesta Corta</option>
                          </select>
                        </div>

                        <div style={{ width: '120px' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Puntos</label>
                          <input
                            type="number"
                            min="1"
                            value={q.points || 1}
                            onChange={(e) => updateQuestion(qIndex, { points: parseInt(e.target.value) || 1 })}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                          />
                        </div>
                      </div>

                      {/* Options Config */}
                      {(q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Opciones (marca el círculo verde en la opción correcta):
                          </label>

                          {q.options.map((opt, optIdx) => {
                            const isCorrect = Number(q.correctAnswer) === optIdx;

                            return (
                              <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                  type="radio"
                                  name={`correct-${q.id}`}
                                  checked={isCorrect}
                                  onChange={() => updateQuestion(qIndex, { correctAnswer: optIdx })}
                                  title="Marcar como respuesta correcta"
                                  style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '18px', height: '18px' }}
                                />
                                <input
                                  type="text"
                                  value={opt}
                                  disabled={q.type === 'TRUE_FALSE'}
                                  onChange={(e) => updateOptionText(qIndex, optIdx, e.target.value)}
                                  placeholder={`Opción ${optIdx + 1}`}
                                  style={{
                                    flex: 1,
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '6px',
                                    border: isCorrect ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    background: isCorrect ? 'var(--primary-subtle)' : 'var(--background)',
                                    color: 'var(--text)'
                                  }}
                                />
                                {q.type === 'MULTIPLE_CHOICE' && q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOption(qIndex, optIdx)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                  >
                                    <X size={16} />
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {q.type === 'MULTIPLE_CHOICE' && (
                            <button
                              type="button"
                              onClick={() => addOption(qIndex)}
                              style={{
                                alignSelf: 'flex-start',
                                background: 'none',
                                border: '1px dashed var(--border)',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '6px',
                                color: 'var(--primary)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                marginTop: '0.25rem'
                              }}
                            >
                              + Añadir opción
                            </button>
                          )}
                        </div>
                      )}

                      {q.type === 'SHORT_ANSWER' && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Respuesta Correcta Esperada (el sistema no distinguirá mayúsculas/minúsculas)
                          </label>
                          <input
                            type="text"
                            value={String(q.correctAnswer || '')}
                            onChange={(e) => updateQuestion(qIndex, { correctAnswer: e.target.value })}
                            placeholder="Ej. was walking"
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addQuestion}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    border: '2px dashed var(--primary-border)',
                    background: 'var(--primary-subtle)',
                    color: 'var(--primary-text)',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={18} /> Añadir Otra Pregunta
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1.25rem 2rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text)',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem' }}
          >
            <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Formulario'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormBuilderModal;

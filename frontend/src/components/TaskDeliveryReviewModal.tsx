import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Award,
  BookOpen,
  Download,
  Eye,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import ExamReviewModal from './ExamReviewModal';
import AttachmentViewerModal, { isAttachmentImage } from './AttachmentViewerModal';
import type { AttachmentData } from './AttachmentViewerModal';

export interface TaskStepDetail {
  stepId: string;
  title: string;
  materialType: string;
  materialUrl?: string | null;
  formData?: any;
  isEvaluable: boolean;
  isCompleted: boolean;
  grade?: number | null;
  feedback?: string | null;
  content?: string | null;
}

export interface TaskForReview {
  taskId: string;
  title: string;
  category?: string;
  dueDate?: string | null;
  steps: TaskStepDetail[];
  taskGrade?: number | null;
  taskFeedback?: string | null;
}

export interface StepEvaluationPayload {
  stepId: string;
  grade: number | null;
  feedback: string | null;
}

interface TaskDeliveryReviewModalProps {
  task: TaskForReview;
  studentName: string;
  onClose: () => void;
  onSaveGrade?: (
    overallGrade: number | null,
    overallFeedback: string,
    stepEvaluations: StepEvaluationPayload[]
  ) => Promise<void>;
  onReviewExam?: (examStep: {
    title: string;
    content: string | null;
    grade: number | null;
    questions?: any[];
  }) => void;
  readOnly?: boolean;
  inline?: boolean;
}

const parseSubmissionContent = (content?: string | null) => {
  if (!content) return { text: '', link: null, attachment: null, examData: null };
  try {
    const parsed = JSON.parse(content);
    if (parsed.answers || typeof parsed.score === 'number') {
      return {
        text: '',
        link: null,
        attachment: null,
        examData: {
          answers: parsed.answers || {},
          score: typeof parsed.score === 'number' ? parsed.score : null,
          total: typeof parsed.total === 'number' ? parsed.total : null
        }
      };
    }
    const attachment =
      parsed.attachment && typeof parsed.attachment === 'object'
        ? {
            name: typeof parsed.attachment.name === 'string' ? parsed.attachment.name : 'archivo-adjunto',
            dataUrl: typeof parsed.attachment.dataUrl === 'string' ? parsed.attachment.dataUrl : ''
          }
        : null;

    return {
      text: typeof parsed.text === 'string' ? parsed.text : (typeof parsed.content === 'string' ? parsed.content : ''),
      link: typeof parsed.link === 'string' ? parsed.link : null,
      attachment,
      examData: null
    };
  } catch {
    return {
      text: content,
      link: /^https?:\/\//i.test(content) ? content : null,
      attachment: null,
      examData: null
    };
  }
};

const TaskDeliveryReviewModal: React.FC<TaskDeliveryReviewModalProps> = ({
  task,
  studentName,
  onClose,
  onSaveGrade,
  onReviewExam,
  readOnly = false,
  inline = false
}) => {
  // Estado para visualización interna del examen en caso de no pasar onReviewExam
  const [internalExamReview, setInternalExamReview] = useState<{
    title: string;
    questions?: any[];
    answers: Record<string, any>;
    score: number | null;
    total?: number | null;
  } | null>(null);

  // Estado individual para cada paso evaluable (nota y feedback)
  const [stepForms, setStepForms] = useState<Record<string, { grade: string; feedback: string }>>(() => {
    const initial: Record<string, { grade: string; feedback: string }> = {};
    task.steps.forEach((s) => {
      initial[s.stepId] = {
        grade: s.grade !== null && s.grade !== undefined ? String(s.grade) : '',
        feedback: s.feedback || ''
      };
    });
    return initial;
  });

  const [feedbackInput, setFeedbackInput] = useState<string>(task.taskFeedback || '');
  const [customOverallGrade, setCustomOverallGrade] = useState<string>(
    task.taskGrade !== null && task.taskGrade !== undefined ? String(task.taskGrade) : ''
  );
  const [isManualOverride, setIsManualOverride] = useState(
    task.taskGrade !== null && task.taskGrade !== undefined
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewingAttachment, setViewingAttachment] = useState<AttachmentData | null>(null);

  const handleReviewExamStep = (step: TaskStepDetail) => {
    if (onReviewExam) {
      onReviewExam({
        title: step.title,
        content: step.content || null,
        grade: step.grade ?? null,
        questions: step.formData?.questions || []
      });
    } else {
      const parsed = parseSubmissionContent(step.content);
      setInternalExamReview({
        title: step.title,
        questions: step.formData?.questions || [],
        answers: parsed.examData?.answers || {},
        score: step.grade ?? parsed.examData?.score ?? null,
        total: parsed.examData?.total || step.formData?.questions?.length || 0
      });
    }
  };

  const evaluableSteps = useMemo(() => task.steps.filter((s) => s.isEvaluable), [task.steps]);
  const nonEvaluableSteps = useMemo(() => task.steps.filter((s) => !s.isEvaluable), [task.steps]);

  // Cálculo automático de la media sugerida a partir de las notas de los pasos evaluables
  const autoCalculatedGrade = useMemo(() => {
    const validScores: number[] = [];
    evaluableSteps.forEach((s) => {
      const stepVal = stepForms[s.stepId]?.grade;
      if (stepVal !== undefined && stepVal.trim() !== '') {
        const parsed = parseFloat(stepVal);
        if (!isNaN(parsed)) validScores.push(parsed);
      } else if (s.grade !== null && s.grade !== undefined) {
        validScores.push(s.grade);
      }
    });

    if (validScores.length === 0) return null;
    const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    return Number(avg.toFixed(1));
  }, [evaluableSteps, stepForms]);

  // Nota efectiva mostrada
  const effectiveOverallGrade = isManualOverride
    ? customOverallGrade
    : autoCalculatedGrade !== null
    ? String(autoCalculatedGrade)
    : '';

  const handleStepGradeChange = (stepId: string, value: string) => {
    setStepForms((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], grade: value }
    }));
  };

  const handleStepFeedbackChange = (stepId: string, value: string) => {
    setStepForms((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], feedback: value }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalGradeNum =
      effectiveOverallGrade.trim() !== '' ? parseFloat(effectiveOverallGrade) : autoCalculatedGrade;

    if (finalGradeNum !== null && (isNaN(finalGradeNum) || finalGradeNum < 0 || finalGradeNum > 10)) {
      setError('La calificación global debe ser un número entre 0 y 10.');
      return;
    }

    // Validar notas de pasos evaluables
    for (const step of evaluableSteps) {
      const stepVal = stepForms[step.stepId]?.grade;
      if (stepVal && stepVal.trim() !== '') {
        const num = parseFloat(stepVal);
        if (isNaN(num) || num < 0 || num > 10) {
          setError(`La nota para "${step.title}" debe ser un número entre 0 y 10.`);
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      setError('');

      const stepPayload: StepEvaluationPayload[] = evaluableSteps.map((s) => {
        const form = stepForms[s.stepId] || { grade: '', feedback: '' };
        return {
          stepId: s.stepId,
          grade: form.grade.trim() !== '' ? parseFloat(form.grade) : (s.grade ?? null),
          feedback: form.feedback.trim() !== '' ? form.feedback.trim() : null
        };
      });

      if (onSaveGrade) {
        await onSaveGrade(finalGradeNum, feedbackInput.trim(), stepPayload);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la calificación.');
    } finally {
      setIsSaving(false);
    }
  };

  const reviewContent = (
    <div
      className={inline ? 'animate-fade-in' : 'modal-backdrop animate-fade-in'}
      style={{
        ...(inline ? {
          width: '100%',
          marginTop: '0.75rem'
        } : {
          position: 'fixed',
          inset: 0,
          zIndex: 110,
          display: 'grid',
          placeItems: 'center',
          padding: '1rem',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)'
        })
      }}
      onClick={inline ? undefined : onClose}
    >
      <div
        className={inline ? 'glass-panel' : 'glass-panel modal-card modal-card--review'}
        style={{
          ...(inline ? {
            width: '100%',
            maxHeight: 'none',
            overflow: 'visible',
            padding: '1.25rem',
            background: 'var(--surface)',
            borderRadius: '10px',
            boxShadow: 'none',
            border: '1px solid var(--border)'
          } : {
            width: 'min(100%, 960px)',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '1.75rem 2rem',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(226, 232, 240, 0.9)'
          })
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
                {readOnly ? 'DETALLE Y CORRECCIÓN DE LA TAREA' : 'REVISIÓN DE TAREA PASO A PASO'}
              </span>
              {task.category && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  • {task.category}
                </span>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-main)' }}>
              {task.title}
            </h2>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Alumno: <strong style={{ color: 'var(--text-main)' }}>{studentName}</strong>
            </p>
          </div>
          {!inline && <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="modal-close"
            style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>}
        </div>

        {/* Resumen de Pasos */}
        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '0.4rem 0.8rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
            Total pasos: <strong>{task.steps.length}</strong>
          </div>
          <div style={{ padding: '0.4rem 0.8rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.8rem', color: '#15803d' }}>
            ✓ Pasos completados: <strong>{task.steps.filter((s) => s.isCompleted).length} / {task.steps.length}</strong>
          </div>
          <div style={{ padding: '0.4rem 0.8rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.8rem', color: '#1d4ed8' }}>
            📝 Evaluables: <strong>{evaluableSteps.length}</strong>
          </div>
          {nonEvaluableSteps.length > 0 && (
            <div style={{ padding: '0.4rem 0.8rem', background: '#faf5ff', borderRadius: '8px', border: '1px solid #e9d5ff', fontSize: '0.8rem', color: '#7e22ce' }}>
              📖 Formativos / Guías: <strong>{nonEvaluableSteps.length}</strong>
            </div>
          )}
        </div>

        {/* Desglose paso a paso */}
        <h4 style={{ margin: '0 0 0.85rem', fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <BookOpen size={17} style={{ color: 'var(--primary)' }} /> Desglose de Pasos de la Tarea
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
          {task.steps.map((step, idx) => {
            const parsed = parseSubmissionContent(step.content);
            const isExam = step.materialType === 'FORM' || Boolean(parsed.examData);
            const stepForm = stepForms[step.stepId] || { grade: '', feedback: '' };

            return (
              <div
                key={step.stepId}
                style={{
                  padding: '1.1rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: step.isCompleted ? '#fafcfb' : '#fff',
                  borderLeft: `4px solid ${step.isCompleted ? '#22c55e' : '#cbd5e1'}`
                }}
              >
                {/* Cabecera del paso */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'var(--primary-light)',
                        color: 'var(--primary-text)',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)' }}>
                        {step.title}
                      </strong>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {step.isEvaluable
                          ? (isExam ? '📝 Cuestionario / Examen (Evaluación automática)' : '✍️ Entrega manual (Evaluación docente)')
                          : '📖 Material didáctico (No evaluable)'}
                      </span>
                    </div>
                  </div>

                  {/* Estado del paso */}
                  <div>
                    {!step.isEvaluable ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '12px',
                          background: step.isCompleted ? '#ecfdf5' : '#f1f5f9',
                          color: step.isCompleted ? '#065f46' : '#64748b',
                          border: `1px solid ${step.isCompleted ? '#a7f3d0' : '#e2e8f0'}`,
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        {step.isCompleted ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
                        {step.isCompleted ? 'Completado ✓' : 'Pendiente'}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* CASO 1: Paso NO evaluable (Vídeo / Guía / Tips) */}
                {!step.isEvaluable && !step.content && (
                  <div style={{ marginTop: '0.4rem', padding: '0.45rem 0.75rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {step.isCompleted
                      ? '✓ El alumno ha visualizado y marcado este recurso como completado.'
                      : '⏳ El alumno aún no ha accedido a este recurso formativo.'}
                    {step.materialUrl && (
                      <a
                        href={step.materialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft: '8px', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                      >
                        <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Ver material
                      </a>
                    )}
                  </div>
                )}

                {/* CASO 2: Paso evaluable AUTOMÁTICO (Cuestionario / Test) */}
                {step.isEvaluable && isExam && (
                  <div style={{ marginTop: '0.65rem', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 600 }}>
                        {parsed.examData && parsed.examData.score !== null && parsed.examData.total !== null
                          ? `📊 Resultado: ${parsed.examData.score} de ${parsed.examData.total} aciertos`
                          : 'Examen completado'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleReviewExamStep(step)}
                        className="btn-secondary"
                        style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', borderRadius: '6px' }}
                      >
                        <FileText size={13} /> Ver Cuestionario Corregido
                      </button>
                    </div>

                    {/* Feedback pedagógico para el examen */}
                    {!readOnly ? (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                          <MessageSquare size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                          Comentarios / Feedback pedagógico para este cuestionario:
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Muy bien en los condicionales, repasa la pregunta 2..."
                          value={stepForm.feedback}
                          onChange={(e) => handleStepFeedbackChange(step.stepId, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: '#fff',
                            fontSize: '0.82rem',
                            color: 'var(--text-main)'
                          }}
                        />
                      </div>
                    ) : (
                      step.feedback && (
                        <div style={{ marginTop: '0.45rem', padding: '0.4rem 0.65rem', background: '#eff6ff', borderRadius: '6px', fontSize: '0.78rem', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                          💬 <strong>Comentarios del profesor:</strong> "{step.feedback}"
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* CASO 3: Paso evaluable MANUAL (Documento PDF, Texto/Redacción, Enlace) */}
                {(step.isEvaluable || Boolean(step.content)) && !isExam && (
                  <div style={{ marginTop: '0.65rem', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {/* Contenido entregado por el alumno */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                        Entrega del Alumno:
                      </span>

                      {!step.content ? (
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                          El alumno aún no ha realizado la entrega para este paso.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {parsed.text && (
                            <div style={{ padding: '0.6rem 0.8rem', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', maxHeight: '160px', overflowY: 'auto' }}>
                              {parsed.text}
                            </div>
                          )}

                          {parsed.attachment && parsed.attachment.dataUrl && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', padding: '0.6rem 0.75rem', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                                  <FileText size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }} title={parsed.attachment.name}>
                                    {parsed.attachment.name}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <button
                                    type="button"
                                    onClick={() => setViewingAttachment(parsed.attachment)}
                                    className="btn-secondary"
                                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                    title="Ver archivo online sin descargar"
                                  >
                                    <Eye size={13} /> Ver en línea
                                  </button>
                                  <a
                                    href={parsed.attachment.dataUrl}
                                    download={parsed.attachment.name}
                                    className="btn-secondary"
                                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                                    title="Descargar archivo"
                                  >
                                    <Download size={13} /> Descargar
                                  </a>
                                </div>
                              </div>
                              {isAttachmentImage(parsed.attachment) && (
                                <div style={{ marginTop: '0.25rem' }}>
                                  <img
                                    src={parsed.attachment.dataUrl}
                                    alt={parsed.attachment.name}
                                    onClick={() => setViewingAttachment(parsed.attachment)}
                                    style={{
                                      maxHeight: '150px',
                                      maxWidth: '100%',
                                      borderRadius: '6px',
                                      border: '1px solid #e2e8f0',
                                      cursor: 'pointer',
                                      objectFit: 'contain',
                                      background: '#f8fafc',
                                      display: 'block'
                                    }}
                                    title="Clic para ampliar y rotar"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {parsed.link && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                              <ExternalLink size={14} style={{ color: 'var(--primary)' }} />
                              <a
                                href={parsed.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                              >
                                Abrir enlace entregado ({parsed.link})
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Controles de calificación docente o visualización para este paso manual */}
                    {!readOnly ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '0.75rem', alignItems: 'start', paddingTop: '0.65rem', borderTop: '1px solid #e2e8f0' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                            Nota del Paso (0-10)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            placeholder="Ej: 8.5"
                            value={stepForm.grade}
                            onChange={(e) => handleStepGradeChange(step.stepId, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.45rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: '#fff',
                              fontSize: '0.95rem',
                              fontWeight: 700,
                              color: 'var(--primary)'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                            Comentarios / Correcciones del Paso
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Feedback específico sobre esta redacción o archivo (ej: Bien organizada la estructura, cuida la concordancia en el segundo párrafo)..."
                            value={stepForm.feedback}
                            onChange={(e) => handleStepFeedbackChange(step.stepId, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.45rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: '#fff',
                              fontSize: '0.82rem',
                              color: 'var(--text-main)',
                              resize: 'vertical'
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      ((step.grade !== null && step.grade !== undefined) || step.feedback) && (
                        <div style={{ paddingTop: '0.65rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {step.grade !== null && step.grade !== undefined && (
                            <div>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                background: step.grade >= 5 ? '#eaf4ef' : '#fdf0f0',
                                color: step.grade >= 5 ? '#24583e' : '#9e2a2b',
                                border: `1px solid ${step.grade >= 5 ? '#bfe0d0' : '#f7caca'}`
                              }}>
                                Nota del Paso: {step.grade.toFixed(1)} / 10
                              </span>
                            </div>
                          )}
                          {step.feedback && (
                            <div style={{ padding: '0.45rem 0.75rem', background: '#eff6ff', borderRadius: '6px', fontSize: '0.82rem', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                              💬 <strong>Comentarios del profesor:</strong> "{step.feedback}"
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Calificación Global: Modo Solo Lectura (Alumno/Padre) vs Modo Edición (Profesor) */}
        {readOnly ? (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Award size={20} style={{ color: 'var(--primary)' }} /> Calificación Global de la Tarea
              </h4>
              {task.taskGrade !== null && task.taskGrade !== undefined ? (
                <span style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: task.taskGrade >= 5 ? '#15803d' : '#b91c1c',
                  background: task.taskGrade >= 5 ? '#dcfce7' : '#fee2e2',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${task.taskGrade >= 5 ? '#86efac' : '#fca5a5'}`
                }}>
                  {task.taskGrade.toFixed(1)} / 10
                </span>
              ) : (
                <span style={{
                  fontSize: '0.85rem',
                  color: '#8d5b12',
                  background: '#fef7e8',
                  padding: '0.3rem 0.7rem',
                  borderRadius: '8px',
                  border: '1px solid #fae0b0',
                  fontWeight: 600
                }}>
                  Pendiente de Calificar
                </span>
              )}
            </div>

            {task.taskFeedback && (
              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
                💬 <strong>Feedback pedagógico del profesor:</strong>
                <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap' }}>{task.taskFeedback}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ padding: '0.55rem 1.5rem', fontWeight: 600 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Award size={20} style={{ color: 'var(--primary)' }} /> Calificación Global del Bloque
              </h4>
              {autoCalculatedGrade !== null && (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Media sugerida de los pasos evaluables: <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>{autoCalculatedGrade} / 10</strong>
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Nota Final Bloque (0-10)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  placeholder={autoCalculatedGrade !== null ? String(autoCalculatedGrade) : 'Ej: 8.5'}
                  value={effectiveOverallGrade}
                  onChange={(e) => {
                    setIsManualOverride(true);
                    setCustomOverallGrade(e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-alt)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Feedback Pedagógico Global para el Alumno
                </label>
                <textarea
                  rows={3}
                  placeholder="Observaciones para el bloque completo (ej: Muy buen desempeño en esta unidad. Has superado el test y la redacción cumple los objetivos)..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-alt)',
                    color: 'var(--text-main)',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{ padding: '0.6rem 0.8rem', marginBottom: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem' }}
              >
                <Sparkles size={15} /> {isSaving ? 'Guardando...' : 'Guardar Calificación de Tarea'}
              </button>
            </div>
          </form>
        )}
      </div>

      {internalExamReview && (
        <ExamReviewModal
          title={internalExamReview.title}
          questions={internalExamReview.questions}
          answers={internalExamReview.answers}
          score={internalExamReview.score}
          total={internalExamReview.total}
          onClose={() => setInternalExamReview(null)}
        />
      )}

      {/* Visor Online de Archivos Adjuntos */}
      <AttachmentViewerModal
        attachment={viewingAttachment}
        onClose={() => setViewingAttachment(null)}
      />
    </div>
  );

  return inline ? reviewContent : createPortal(reviewContent, document.body);
};

export default TaskDeliveryReviewModal;

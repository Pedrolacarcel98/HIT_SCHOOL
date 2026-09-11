import React, { useState } from 'react';
import {
  CheckCircle2,
  CalendarDays,
  FileText,
  Video,
  Headphones,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Play,
  Pencil,
  Copy,
  BookmarkPlus,
  Trash2,
  Users,
  Award
} from 'lucide-react';

export interface TaskStepItem {
  id: string;
  order: number;
  title: string;
  materialId?: string | null;
  requiresSubmission?: boolean;
  isEvaluable?: boolean;
  isCompleted?: boolean;
  submission?: {
    id?: string;
    content?: string | null;
    grade?: number | null;
    feedback?: string | null;
    submittedAt?: string | null;
  } | null;
  material?: {
    id: string;
    title: string;
    type: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FORM';
    url?: string | null;
    description?: string | null;
    level?: string | null;
    category?: string | null;
    formData?: any;
  } | null;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  publishAt?: string | null;
  category?: string;
  isSequential?: boolean;
  isTemplate?: boolean;
  assignmentType?: 'CLASS' | 'INDIVIDUAL';
  assignedStudentName?: string | null;
  assignedStudentNames?: string[];
  courseId?: string | null;
  courseTitle?: string | null;
  steps: TaskStepItem[];
  stats?: {
    totalTargetStudents: number;
    completedStudentsCount: number;
    completionRate: number;
    completedStudents?: { id: string; name: string; email?: string }[];
    pendingStudents?: { id: string; name: string; email?: string }[];
  };
}

interface TaskCardProps {
  task: TaskItem;
  mode?: 'STUDENT' | 'TEACHER';
  defaultExpanded?: boolean;
  onOpenStep?: (step: TaskStepItem, task: TaskItem) => void;
  onReviewStep?: (step: TaskStepItem, task: TaskItem) => void;
  onEditTask?: (task: TaskItem) => void;
  onDuplicateTask?: (task: TaskItem) => void;
  onSaveAsTemplate?: (task: TaskItem) => void;
  onDeleteTask?: (task: TaskItem) => void;
  onViewSubmissions?: (task: TaskItem) => void;
}

const getCategoryLabel = (category?: string) => {
  switch (category) {
    case 'GRAMMAR_VOCABULARY': return 'Grammar & Vocabulary';
    case 'READING': return 'Reading';
    case 'WRITING': return 'Writing';
    case 'LISTENING': return 'Listening';
    case 'SPEAKING': return 'Speaking';
    case 'MOCK_EXAM': return 'Mock Exam';
    default: return category || 'General';
  }
};

const getMaterialIcon = (type?: string, size = 16) => {
  switch (type) {
    case 'FORM': return <ClipboardCheck size={size} style={{ color: '#059669' }} />;
    case 'VIDEO': return <Video size={size} style={{ color: '#ef4444' }} />;
    case 'AUDIO': return <Headphones size={size} style={{ color: '#f59e0b' }} />;
    default: return <FileText size={size} style={{ color: '#0284c7' }} />;
  }
};

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  mode = 'STUDENT',
  defaultExpanded,
  onOpenStep,
  onReviewStep,
  onEditTask,
  onDuplicateTask,
  onSaveAsTemplate,
  onDeleteTask,
  onViewSubmissions
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? false);
  const [isStudentsExpanded, setIsStudentsExpanded] = useState(false);

  const totalSteps = task.steps?.length || 0;
  const completedSteps = task.steps?.filter((s) => s.isCompleted).length || 0;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const teacherCompletionRate = task.stats?.completionRate;
  const isAllCompleted = mode === 'TEACHER' && typeof teacherCompletionRate === 'number'
    ? teacherCompletionRate >= 100
    : totalSteps > 0 && completedSteps >= totalSteps;

  const formatDueDate = (due?: string | null) => {
    if (!due) return null;
    const date = new Date(due);
    if (isNaN(date.getTime())) return null;
    const isOverdue = date.getTime() < Date.now() && !isAllCompleted;
    return {
      text: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      isOverdue
    };
  };

  const dueInfo = formatDueDate(task.dueDate);
  const publishInfo = formatDueDate(task.publishAt);

  return (
    <div
      className="glass-panel"
      style={{
        width: '100%',
        padding: '1.25rem',
        borderRadius: '12px',
        border: isAllCompleted ? '1px solid #a7f3d0' : '1px solid var(--border)',
        background: isAllCompleted ? 'rgba(236, 253, 245, 0.4)' : 'var(--surface)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
      }}
    >
      {/* Cabecera de la Tarjeta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.15rem 0.55rem',
                borderRadius: '10px',
                background: 'var(--primary-light)',
                color: 'var(--primary-text)',
                border: '1px solid var(--primary-border)',
                textTransform: 'uppercase'
              }}
            >
              {getCategoryLabel(task.category)}
            </span>

            {task.isSequential && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  color: '#92400e'
                }}
              >
                Paso a paso
              </span>
            )}

            {task.isTemplate && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '10px',
                  background: '#e0e7ff',
                  color: '#3730a3'
                }}
              >
                Plantilla Reutilizable
              </span>
            )}

            {publishInfo && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '10px',
                  background: '#eef2ff',
                  color: '#3730a3',
                  border: '1px solid #c7d2fe'
                }}
              >
                <CalendarDays size={13} /> Programada: {publishInfo.text}
              </span>
            )}

            {dueInfo && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: dueInfo.isOverdue ? '#b91c1c' : 'var(--text-muted)'
                }}
              >
                <CalendarDays size={13} /> Fecha límite: {dueInfo.text} {dueInfo.isOverdue && '(Vencida)'}
              </span>
            )}
          </div>

          <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.15rem', color: 'var(--text)', fontWeight: 600 }}>
            {task.title}
          </h3>

          {task.description && (
            <p style={{ margin: '0 0 0.75rem', color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: '1.45' }}>
              {task.description}
            </p>
          )}

          {/* Barra de progreso para el alumno */}
          {mode === 'STUDENT' && (
            <div style={{ marginTop: '0.5rem', maxWidth: '320px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                <span>{completedSteps} de {totalSteps} pasos completados</span>
                <strong style={{ color: isAllCompleted ? '#059669' : 'var(--primary-text)' }}>{progressPercent}%</strong>
              </div>
              <div style={{ width: '100%', height: '6px', borderRadius: '4px', background: 'var(--surface-alt)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: isAllCompleted ? '#10b981' : 'var(--primary)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          )}

          {/* Estadísticas para el profesor */}
          {mode === 'TEACHER' && task.stats && (
            <div style={{ marginTop: '0.65rem' }}>
              {!task.isTemplate && (
                <div style={{ background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsStudentsExpanded(!isStudentsExpanded);
                    }}
                    style={{
                      padding: '0.45rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      userSelect: 'none',
                      background: isStudentsExpanded ? 'rgba(0,0,0,0.02)' : 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <Users size={14} style={{ color: task.stats.completionRate >= 100 ? '#059669' : 'var(--primary)' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        Alumnos:
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '10px',
                          background: task.stats.completionRate >= 100 ? '#ecfdf5' : '#fef9c3',
                          color: task.stats.completionRate >= 100 ? '#047857' : '#854d0e',
                          border: `1px solid ${task.stats.completionRate >= 100 ? '#a7f3d0' : '#fef08a'}`
                        }}
                      >
                        {task.stats.completedStudentsCount}/{task.stats.totalTargetStudents}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: task.stats.completionRate >= 100 ? '#059669' : 'var(--text-muted)', fontWeight: 500 }}>
                        ({task.stats.completionRate}% completada)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsStudentsExpanded(!isStudentsExpanded);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '0.15rem 0.35rem',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontSize: '0.74rem',
                        fontWeight: 600
                      }}
                    >
                      {isStudentsExpanded ? (
                        <><ChevronUp size={14} /> Plegar alumnos</>
                      ) : (
                        <><ChevronDown size={14} /> Ver alumnos ({task.stats.completedStudentsCount}/{task.stats.totalTargetStudents})</>
                      )}
                    </button>
                  </div>

                  {isStudentsExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '0.55rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {/* Alumnos con entrega completa (en verde) */}
                      {task.stats.completedStudents && task.stats.completedStudents.length > 0 && (
                        <div>
                          <strong style={{ fontSize: '0.74rem', color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                            <CheckCircle2 size={13} style={{ color: '#059669' }} /> Entrega completa ({task.stats.completedStudents.length}):
                          </strong>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {task.stats.completedStudents.map(student => (
                              <span
                                key={student.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.18rem 0.55rem',
                                  borderRadius: '12px',
                                  background: '#ecfdf5',
                                  border: '1px solid #a7f3d0',
                                  color: '#047857',
                                  fontSize: '0.74rem',
                                  fontWeight: 600
                                }}
                              >
                                ✓ {student.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Alumnos pendientes (en amarillo) */}
                      {task.stats.pendingStudents && task.stats.pendingStudents.length > 0 && (
                        <div>
                          <strong style={{ fontSize: '0.74rem', color: '#854d0e', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                            ⏳ Pendientes ({task.stats.pendingStudents.length}):
                          </strong>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {task.stats.pendingStudents.map(student => (
                              <span
                                key={student.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.18rem 0.55rem',
                                  borderRadius: '12px',
                                  background: '#fefce8',
                                  border: '1px solid #fef08a',
                                  color: '#854d0e',
                                  fontSize: '0.74rem',
                                  fontWeight: 600
                                }}
                              >
                                ⏳ {student.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(!task.stats.completedStudents?.length && !task.stats.pendingStudents?.length) && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No hay alumnos asignados a esta tarea.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acciones Superiores */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {mode === 'TEACHER' && (
            <>
              {onViewSubmissions && (
                <button
                  type="button"
                  onClick={() => onViewSubmissions(task)}
                  className="btn-primary"
                  style={{ padding: '0.45rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Award size={14} /> Entregas y Calificaciones
                </button>
              )}

              {onDuplicateTask && (
                <button
                  type="button"
                  onClick={() => onDuplicateTask(task)}
                  title="Duplicar / Reutilizar Tarea"
                  className="btn-secondary"
                  style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
                >
                  <Copy size={14} /> Duplicar
                </button>
              )}

              {onSaveAsTemplate && !task.isTemplate && (
                <button
                  type="button"
                  onClick={() => onSaveAsTemplate(task)}
                  title="Guardar como Plantilla en el Catálogo"
                  className="btn-secondary"
                  style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
                >
                  <BookmarkPlus size={14} /> Guardar Plantilla
                </button>
              )}

              {onEditTask && (
                <button
                  type="button"
                  onClick={() => onEditTask(task)}
                  title="Editar Tarea"
                  className="btn-secondary"
                  style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
                >
                  <Pencil size={14} />
                </button>
              )}

              {onDeleteTask && (
                <button
                  type="button"
                  onClick={() => onDeleteTask(task)}
                  title="Eliminar Tarea"
                  className="btn-secondary"
                  style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem', color: '#b91c1c' }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Contraer pasos' : 'Expandir pasos'}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.4rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Lista de Pasos */}
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
          {task.steps.map((step, idx) => {
            const isPreviousCompleted = idx === 0 || !task.isSequential || Boolean(task.steps[idx - 1]?.isCompleted);
            const isCurrentAvailable = isPreviousCompleted || Boolean(step.isCompleted);
            const hasSubmission = Boolean(step.submission);
            const hasGrade = typeof step.submission?.grade === 'number';

            return (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: (mode === 'STUDENT' && step.isCompleted) ? '#f0fdf4' : 'var(--surface-alt)',
                  border: `1px solid ${(mode === 'STUDENT' && step.isCompleted) ? '#bbf7d0' : 'var(--border)'}`,
                  opacity: (mode === 'STUDENT' && !isCurrentAvailable) ? 0.6 : 1,
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '220px', flex: 1 }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: (mode === 'STUDENT' && step.isCompleted) ? '#10b981' : 'var(--primary-light)',
                      color: (mode === 'STUDENT' && step.isCompleted) ? '#fff' : 'var(--primary-text)',
                      flexShrink: 0
                    }}
                  >
                    {(mode === 'STUDENT' && step.isCompleted) ? '✓' : step.order}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {step.material && getMaterialIcon(step.material.type, 14)}
                      <strong
                        onClick={() => mode === 'TEACHER' && step.material && onOpenStep?.(step, task)}
                        style={{ fontSize: '0.9rem', color: 'var(--text)', cursor: mode === 'TEACHER' && step.material ? 'pointer' : 'default', textDecoration: mode === 'TEACHER' && step.material ? 'underline' : 'none' }}
                        title={mode === 'TEACHER' && step.material ? 'Abrir recurso' : undefined}
                      >
                        {step.title}
                      </strong>
                    </div>
                    {step.material && (
                      <span
                        onClick={() => mode === 'TEACHER' && onOpenStep?.(step, task)}
                        style={{ fontSize: '0.75rem', color: mode === 'TEACHER' ? 'var(--primary)' : 'var(--text-muted)', cursor: mode === 'TEACHER' ? 'pointer' : 'default', textDecoration: mode === 'TEACHER' ? 'underline' : 'none' }}
                        title={mode === 'TEACHER' ? 'Abrir recurso' : undefined}
                      >
                        {step.material.title}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones y Estados del Paso */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {mode === 'STUDENT' && (
                    hasGrade ? (
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: '#dcfce7',
                          color: '#15803d'
                        }}
                      >
                        Nota: {step.submission?.grade}/10
                      </span>
                    ) : hasSubmission ? (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          background: '#e0f2fe',
                          color: '#0369a1'
                        }}
                      >
                        Entregado
                      </span>
                    ) : null
                  )}

                  {mode === 'STUDENT' && (
                    <>
                      {step.material?.type === 'FORM' ? (
                        step.isCompleted ? (
                          onReviewStep && (
                            <button
                              type="button"
                              onClick={() => onReviewStep(step, task)}
                              className="btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <CheckCircle2 size={13} /> Ver Corrección
                            </button>
                          )
                        ) : (
                          onOpenStep && (
                            <button
                              type="button"
                              disabled={!isCurrentAvailable}
                              onClick={() => onOpenStep(step, task)}
                              className="btn-primary"
                              style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem', opacity: isCurrentAvailable ? 1 : 0.5 }}
                            >
                              <Play size={13} /> Realizar Examen
                            </button>
                          )
                        )
                      ) : (
                        onOpenStep && (
                          <button
                            type="button"
                            disabled={!isCurrentAvailable}
                            onClick={() => onOpenStep(step, task)}
                            className={step.isCompleted ? 'btn-secondary' : 'btn-primary'}
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem', opacity: isCurrentAvailable ? 1 : 0.5 }}
                          >
                            <Play size={13} /> {step.isCompleted ? 'Volver a Ver' : (step.material ? 'Ver Material' : 'Marcar Hecho')}
                          </button>
                        )
                      )}
                    </>
                  )}
                </div>

                {mode === 'STUDENT' && step.submission?.feedback && (
                  <div style={{ width: '100%', marginTop: '0.45rem', padding: '0.4rem 0.65rem', background: '#eff6ff', borderRadius: '6px', fontSize: '0.78rem', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                    💬 <strong>Comentario del profesor:</strong> "{step.submission.feedback}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskCard;

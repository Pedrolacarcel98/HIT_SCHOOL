import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink
} from 'lucide-react';
import TaskDeliveryReviewModal, { type TaskForReview } from './TaskDeliveryReviewModal';
import StudentCompetencyGrades from './StudentCompetencyGrades';
import { generateReportCardPDF, type ReportCardData, type ReportCardTaskItem } from '../utils/reportCard';
import { useParent } from '../context/ParentContext';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const StudentGradesTab: React.FC<{ courseId: string; courseTitle?: string }> = ({ courseId, courseTitle }) => {
  const getCurrentTerm = () => {
    const m = new Date().getMonth() + 1;
    if (m >= 9 && m <= 12) return 1;
    if (m >= 1 && m <= 3) return 2;
    return 3;
  };

  const [selectedTerm, setSelectedTerm] = useState<number>(getCurrentTerm());
  const [termGradesData, setTermGradesData] = useState<any>(null);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedTaskForReview, setSelectedTaskForReview] = useState<TaskForReview | null>(null);

  const { selectedStudentId } = useParent();

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const targetStudentId = selectedStudentId || 'me';
      const headers = { Authorization: `Bearer ${token}` };

      const resTermGrades = await fetch(`${apiUrl}/api/term-grades/student/${targetStudentId}?courseId=${courseId}`, { headers });

      if (resTermGrades.ok) {
        const data = await resTermGrades.json();
        setStudentInfo(data.student);
        setTermGradesData(data.terms || {});
      }

    } catch (err) {
      console.error('Error al cargar calificaciones del alumno:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, [courseId, selectedStudentId]);

  const currentTermInfo = termGradesData?.[selectedTerm];
  const isOnline = studentInfo?.modality === 'ONLINE';

  // Descargar Boletín Trimestral PDF
  const handleDownloadReportCard = () => {
    if (!currentTermInfo || !studentInfo) return;

    const reportData: ReportCardData = {
      studentName: studentInfo.fullName,
      studentEmail: studentInfo.email,
      courseTitle: courseTitle || 'Hit School - Curso de Inglés',
      term: selectedTerm,
      academicYear: currentTermInfo.academicYear || '2025-2026',
      modality: studentInfo.modality || 'PRESENCIAL',
      middleExamGrade: currentTermInfo.middleExamGrade,
      finalExamGrade: currentTermInfo.finalExamGrade,
      tasksAverage: currentTermInfo.tasksAverage,
      overallGrade: currentTermInfo.overallGrade,
      grammar: currentTermInfo.grammar,
      reading: currentTermInfo.reading,
      writing: currentTermInfo.writing,
      listening: currentTermInfo.listening,
      speaking: currentTermInfo.speaking,
      observations: currentTermInfo.observations,
      tasks: (currentTermInfo.tasks || []).map((t: any): ReportCardTaskItem => ({
        title: t.title,
        category: t.category,
        grade: t.taskGrade,
        stepsSummary: (t.steps || [])
          .map((s: any) =>
            !s.isEvaluable
              ? (s.isCompleted ? `✓ ${s.title}` : `○ ${s.title}`)
              : (s.grade !== null && s.grade !== undefined ? `${s.grade.toFixed(1)}/10 ${s.title}` : `⏳ ${s.title}`)
          )
          .join(', ')
      }))
    };

    generateReportCardPDF(reportData);
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando calificaciones...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem 0', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Cabecera Principal y Selector de Trimestre */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--primary-light)', padding: '0.65rem', borderRadius: '12px', color: 'var(--primary)' }}>
              <Award size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-main)' }}>Mis Calificaciones y Expediente</h2>
              <p style={{ margin: '0.15rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Progreso continuo, exámenes trimestrales y boletines oficiales
              </p>
            </div>
          </div>

          {/* Selector de Trimestre */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-alt)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
            {[1, 2, 3].map((termNum) => (
              <button
                key={termNum}
                type="button"
                onClick={() => setSelectedTerm(termNum)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: selectedTerm === termNum ? 'var(--primary)' : 'transparent',
                  color: selectedTerm === termNum ? '#ffffff' : 'var(--text-main)',
                  fontWeight: selectedTerm === termNum ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {termNum}º Trimestre
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tarjeta Destacada de Evaluación Trimestral */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>
              Evaluación del {selectedTerm}º Trimestre
            </h3>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                background: isOnline ? '#e0f2fe' : '#eaf4ef',
                color: isOnline ? '#0369a1' : '#24583e',
                border: `1px solid ${isOnline ? '#bae6fd' : '#bfe0d0'}`
              }}
            >
              {isOnline ? 'Online (Media Continua)' : 'Presencial (50% Exámenes + 50% Tareas)'}
            </span>
          </div>

          {currentTermInfo && (
            <button
              type="button"
              onClick={handleDownloadReportCard}
              className="btn-secondary"
              style={{
                padding: '0.45rem 0.9rem',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderRadius: '8px'
              }}
            >
              <Download size={15} /> Descargar Boletín Trimestral PDF
            </button>
          )}
        </div>

        <StudentCompetencyGrades
          grammar={currentTermInfo?.grammar}
          reading={currentTermInfo?.reading}
          writing={currentTermInfo?.writing}
          listening={currentTermInfo?.listening}
          speaking={currentTermInfo?.speaking}
          overallGrade={currentTermInfo?.overallGrade}
        />

        {/* Observaciones del profesor */}
        {currentTermInfo?.observations && (
          <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-main)', fontStyle: 'italic' }}>
            💬 Observaciones pedagógicas del profesor: "{currentTermInfo.observations}"
          </div>
        )}
      </div>

      {/* Bloques de Tareas y Ejercicios del Trimestre */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <BookOpen size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>
            Bloques de Tareas y Ejercicios del {selectedTerm}º Trimestre
          </h3>
        </div>

        {(!currentTermInfo?.tasks || currentTermInfo.tasks.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            No hay tareas estructuradas registradas para el {selectedTerm}º Trimestre en esta clase.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {currentTermInfo.tasks.map((task: any) => {
              const hasTaskGrade = task.taskGrade !== null && task.taskGrade !== undefined;
              const isCompleted = task.isCompleted;

              return (
                <div
                  key={task.taskId}
                  onClick={() => setSelectedTaskForReview(task)}
                  style={{
                    padding: '1.1rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    borderLeft: `4px solid ${isCompleted ? '#22c55e' : '#f59e0b'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
                          {task.category || 'GENERAL'}
                        </span>
                        {task.dueDate && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Plazo: {new Date(task.dueDate).toLocaleDateString('es-ES')}
                          </span>
                        )}
                        {task.isCompleted && task.dueDate && (
                          <span style={{ fontSize: '0.75rem', color: task.isLate ? '#92400e' : '#166534', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '10px', background: task.isLate ? '#fef3c7' : '#ecfdf5', border: `1px solid ${task.isLate ? '#fde68a' : '#bbf7d0'}` }}>
                            {task.isLate ? 'Fuera de plazo' : 'Dentro de plazo'}
                          </span>
                        )}
                      </div>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-main)', display: 'block' }}>
                        {task.title}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {hasTaskGrade ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '16px',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            background: task.taskGrade >= 5 ? '#eaf4ef' : '#fdf0f0',
                            color: task.taskGrade >= 5 ? '#24583e' : '#9e2a2b',
                            border: `1px solid ${task.taskGrade >= 5 ? '#bfe0d0' : '#f7caca'}`
                          }}
                        >
                          <CheckCircle2 size={15} /> Nota Tarea: {task.taskGrade.toFixed(1)} / 10
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '16px',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            background: '#fef7e8',
                            color: '#8d5b12',
                            border: '1px solid #fae0b0'
                          }}
                        >
                          <Clock3 size={14} /> {isCompleted ? 'Entregado (Pendiente de Calificar)' : 'En progreso'}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskForReview(task);
                        }}
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '8px' }}
                      >
                        <ExternalLink size={14} /> Ver Detalle
                      </button>
                    </div>
                  </div>

                  {/* Pasos y desglose */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: '0.45rem 0' }}>
                    {(task.steps || []).map((step: any, sIdx: number) => {
                      const isEvaluable = step.isEvaluable;
                      const hasGrade = step.grade !== null && step.grade !== undefined;

                      return (
                        <span
                          key={step.stepId || sIdx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: !isEvaluable
                              ? (step.isCompleted ? '#ecfdf5' : '#f1f5f9')
                              : (hasGrade ? (step.grade >= 5 ? '#eaf4ef' : '#fdf0f0') : '#fef7e8'),
                            color: !isEvaluable
                              ? (step.isCompleted ? '#065f46' : '#64748b')
                              : (hasGrade ? (step.grade >= 5 ? '#24583e' : '#9e2a2b') : '#8d5b12'),
                            border: '1px solid rgba(0,0,0,0.06)'
                          }}
                        >
                          {!isEvaluable ? (
                            <>
                              {step.isCompleted ? '✓' : '○'} {step.title}
                            </>
                          ) : (
                            <>
                              {hasGrade ? `${step.grade.toFixed(1)}/10` : '⏳'} {step.title}
                            </>
                          )}
                        </span>
                      );
                    })}
                  </div>

                  {task.taskFeedback && (
                    <div style={{ marginTop: '0.45rem', padding: '0.4rem 0.65rem', background: '#f8fafc', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', border: '1px solid #e2e8f0' }}>
                      💬 <strong>Feedback global:</strong> "{task.taskFeedback}"
                    </div>
                  )}

                  {/* Feedback individual de cada paso */}
                  {(task.steps || []).some((s: any) => s.feedback) && (
                    <div style={{ marginTop: '0.45rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {(task.steps || []).filter((s: any) => s.feedback).map((step: any) => (
                        <div key={step.stepId} style={{ padding: '0.35rem 0.65rem', background: '#eff6ff', borderRadius: '6px', fontSize: '0.78rem', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                          <span style={{ fontWeight: 700 }}>• {step.title}:</span> "{step.feedback}"
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedTaskForReview && (
        <TaskDeliveryReviewModal
          task={selectedTaskForReview}
          studentName={studentInfo?.fullName || 'Mi Entrega'}
          onClose={() => setSelectedTaskForReview(null)}
          readOnly={true}
        />
      )}

    </div>
  );
};

export default StudentGradesTab;

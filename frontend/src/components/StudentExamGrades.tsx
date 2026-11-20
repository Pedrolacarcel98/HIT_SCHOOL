import React, { useId, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

type Grade = number | null | undefined;

interface ExamGrades {
  middleExamGrade?: Grade;
  finalExamGrade?: Grade;
  tasksAverage?: Grade;
  overallGrade?: Grade;
  middleGrammar?: Grade;
  middleReading?: Grade;
  middleWriting?: Grade;
  middleListening?: Grade;
  middleSpeaking?: Grade;
  finalGrammar?: Grade;
  finalReading?: Grade;
  finalWriting?: Grade;
  finalListening?: Grade;
  finalSpeaking?: Grade;
}

const formatGrade = (grade: Grade) => typeof grade === 'number' ? `${grade.toFixed(1)} / 10` : '- / 10';

const StudentExamGrades: React.FC<{
  grades: ExamGrades;
  teacherView?: boolean;
  tasksSubtitle?: string;
}> = ({ grades, teacherView = false, tasksSubtitle = 'Prácticas (30%)' }) => {
  const [expandedExam, setExpandedExam] = useState<'middle' | 'final' | null>(null);
  const detailsId = useId();
  const hasBothExamGrades = typeof grades.middleExamGrade === 'number' && typeof grades.finalExamGrade === 'number';
  const summaries = [
    { label: 'MIDTERM', value: grades.middleExamGrade, subtitle: 'Examen parcial (35%)', exam: 'middle' as const },
    { label: 'FINAL TERM', value: grades.finalExamGrade, subtitle: 'Examen final (35%)', exam: 'final' as const },
    { label: 'MEDIA TAREAS', value: grades.tasksAverage, subtitle: tasksSubtitle },
    { label: teacherView ? 'CALIF. TRIMESTRAL' : 'NOTA GLOBAL', value: teacherView || hasBothExamGrades ? grades.overallGrade : null, subtitle: 'Nota ponderada', overall: true }
  ];
  const skills = expandedExam === 'middle'
    ? [grades.middleGrammar, grades.middleReading, grades.middleWriting, grades.middleListening, grades.middleSpeaking]
    : [grades.finalGrammar, grades.finalReading, grades.finalWriting, grades.finalListening, grades.finalSpeaking];
  const skillLabels = ['Grammar & Vocabulary', 'Reading', 'Writing', 'Listening', 'Speaking'];

  return (
    <>
      <div className="grades-summary-grid">
        {summaries.map(({ label, value, subtitle, exam, overall }) => {
          const content = (
            <>
              <span style={{ fontSize: '0.7rem', color: overall ? 'var(--primary-text)' : 'var(--text-muted)', display: 'block', fontWeight: 700 }}>{label}</span>
              <strong style={{ fontSize: '1.1rem', color: overall ? 'var(--primary-text)' : 'var(--text-main)', display: 'block', marginTop: '0.2rem' }}>{formatGrade(value)}</strong>
              <small style={{ display: 'block', marginTop: '0.15rem', color: 'var(--text-muted)', fontSize: '0.68rem' }}>{subtitle}</small>
              {exam && (
                <span className="exam-grades-toggle">
                  {expandedExam === exam ? 'Ocultar destrezas' : 'Ver destrezas'}
                  {expandedExam === exam ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                </span>
              )}
            </>
          );
          const style: React.CSSProperties = {
            padding: '0.75rem',
            background: overall ? 'var(--primary-light)' : 'var(--surface)',
            borderRadius: '8px',
            border: `1px solid ${overall ? 'var(--primary-border)' : 'var(--border)'}`,
            textAlign: 'center'
          };

          return exam ? (
            <button key={label} type="button" className={`exam-grades-button${expandedExam === exam ? ' exam-grades-button--active' : ''}`}
              aria-expanded={expandedExam === exam} aria-controls={detailsId}
              onClick={() => setExpandedExam(current => current === exam ? null : exam)}>
              {content}
            </button>
          ) : <div key={label} style={style}>{content}</div>;
        })}
      </div>
      <div id={detailsId} hidden={!expandedExam} className="exam-grades-details">
        {expandedExam && (
          <>
            <h3><BarChart3 size={15} aria-hidden="true" /> Desglose por destrezas · {expandedExam === 'middle' ? 'MIDTERM' : 'FINAL TERM'}</h3>
            <dl className="exam-grades-skills">
              {skillLabels.map((label, index) => {
                const grade = skills[index];
                const hasGrade = typeof grade === 'number' && Number.isFinite(grade);
                const progress = hasGrade ? Math.min(10, Math.max(0, grade)) : null;
                return (
                  <div className="exam-grades-skill" key={label}>
                    <dt>{label}</dt>
                    <dd><span>{hasGrade ? grade.toFixed(1) : '-'}</span><span className="exam-grades-skill-denominator"> / 10</span></dd>
                    <div className="exam-grades-progress" role={progress === null ? undefined : 'progressbar'}
                      aria-hidden={progress === null ? true : undefined}
                      aria-label={progress === null ? undefined : label}
                      aria-valuemin={progress === null ? undefined : 0}
                      aria-valuemax={progress === null ? undefined : 10}
                      aria-valuenow={progress ?? undefined}>
                      {progress !== null && <div className="exam-grades-progress-fill" style={{ width: `${progress * 10}%` }} />}
                    </div>
                  </div>
                );
              })}
            </dl>
          </>
        )}
      </div>
    </>
  );
};

export default StudentExamGrades;

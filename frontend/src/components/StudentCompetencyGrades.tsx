import React from 'react';

type GradeValue = number | null | undefined;

interface StudentCompetencyGradesProps {
  grammar?: GradeValue;
  reading?: GradeValue;
  writing?: GradeValue;
  listening?: GradeValue;
  speaking?: GradeValue;
  overallGrade?: GradeValue;
}

const formatGrade = (value: GradeValue) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '- / 10';
  return `${Number(value).toFixed(1)} / 10`;
};

const StudentCompetencyGrades: React.FC<StudentCompetencyGradesProps> = ({
  grammar,
  reading,
  writing,
  listening,
  speaking,
  overallGrade
}) => {
  const grades = [
    { label: 'GRAMMAR', value: grammar },
    { label: 'READING', value: reading },
    { label: 'WRITING', value: writing },
    { label: 'LISTENING', value: listening },
    { label: 'SPEAKING', value: speaking },
    { label: 'NOTA GLOBAL', value: overallGrade, isOverall: true }
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        overflowX: 'auto',
        paddingBottom: '0.15rem'
      }}
    >
      {grades.map((grade) => (
        <div
          key={grade.label}
          style={{
            flex: '1 0 150px',
            minWidth: '150px',
            padding: '0.85rem 0.65rem',
            background: grade.isOverall ? '#eaf4ef' : 'var(--surface)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>
            {grade.label}
          </span>
          <strong style={{ fontSize: '1.1rem', color: 'var(--primary)', display: 'block', marginTop: '0.25rem' }}>
            {formatGrade(grade.value)}
          </strong>
        </div>
      ))}
    </div>
  );
};

export default StudentCompetencyGrades;
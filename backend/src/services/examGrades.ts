import type { TermGrade } from '@prisma/client';

export const examSkillKeys = ['Grammar', 'Reading', 'Writing', 'Listening', 'Speaking'] as const;
export const skillKeys = ['grammar', 'reading', 'writing', 'listening', 'speaking'] as const;
export const calculatedGradeKeys = ['middleExamGrade', 'finalExamGrade', 'tasksAverage', 'overallGrade', ...skillKeys] as const;
export type CalculatedGradeKey = typeof calculatedGradeKeys[number];
type GradeOverrides = Partial<Record<CalculatedGradeKey, number>>;

export const averageScores = (scores: number[]) => scores.length > 0
  ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2))
  : null;

export const getExamAverage = (grades: Array<number | null>) =>
  averageScores(grades.filter((grade): grade is number => grade !== null));

export const readOverrides = (value: unknown): GradeOverrides => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: GradeOverrides = {};
  for (const key of calculatedGradeKeys) {
    const grade = (value as Record<string, unknown>)[key];
    if (typeof grade === 'number' && Number.isFinite(grade) && grade >= 0 && grade <= 10) result[key] = grade;
  }
  return result;
};

export const getAutomaticExamGrades = (record: Partial<TermGrade> | null | undefined) => ({
  middleExamGrade: getExamAverage(examSkillKeys.map(skill => record?.[`middle${skill}`] ?? null)) ?? record?.middleExamGrade ?? null,
  finalExamGrade: getExamAverage(examSkillKeys.map(skill => record?.[`final${skill}`] ?? null)) ?? record?.finalExamGrade ?? null
});

export const getEffectiveExamGrades = (record: Partial<TermGrade>) => {
  const automatic = getAutomaticExamGrades(record);
  const overrides = readOverrides(record.gradeOverrides);
  return {
    middleExamGrade: overrides.middleExamGrade ?? automatic.middleExamGrade,
    finalExamGrade: overrides.finalExamGrade ?? automatic.finalExamGrade
  };
};

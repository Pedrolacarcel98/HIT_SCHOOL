const CATEGORY_LABELS: Record<string, string> = {
  GRAMMAR_VOCABULARY: 'Grammar & Vocabulary',
  READING: 'Reading',
  WRITING: 'Writing',
  LISTENING: 'Listening',
  SPEAKING: 'Speaking',
  MOCK_EXAM: 'Mock Exam'
};

export const getCategoryLabel = (category?: string | null) => {
  if (!category) return 'General';
  return CATEGORY_LABELS[category] || category.replace(/_/g, ' ');
};

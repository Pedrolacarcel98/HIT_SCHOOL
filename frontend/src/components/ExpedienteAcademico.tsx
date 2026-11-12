import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  X
} from 'lucide-react';
import ExamReviewModal from './ExamReviewModal';
import type { ReviewQuestion } from './ExamReviewModal';
import AttachmentViewerModal from './AttachmentViewerModal';
import type { AttachmentData } from './AttachmentViewerModal';
import ModalityBadge from './ModalityBadge';

export interface FinalEvaluationData {
  id?: string;
  studentId?: string;
  grammar?: number | null;
  reading?: number | null;
  writing?: number | null;
  listening?: number | null;
  speaking?: number | null;
  overallGrade?: number | null;
  middleExamGrade?: number | null;
  finalExamGrade?: number | null;
  middleGrammar?: number | null;
  middleReading?: number | null;
  middleWriting?: number | null;
  middleListening?: number | null;
  middleSpeaking?: number | null;
  finalGrammar?: number | null;
  finalReading?: number | null;
  finalWriting?: number | null;
  finalListening?: number | null;
  finalSpeaking?: number | null;
  tasksAverage?: number | null;
  observations?: string | null;
}

export interface TermEvaluationData extends FinalEvaluationData {
  term: number;
  tasksAverage?: number | null;
  tasks?: Array<{ taskId: string; title: string; taskGrade: number | null; isCompleted: boolean }>;
}

export interface CourseData {
  id: string;
  title: string;
  teacherId?: string;
  modality?: 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO';
  students?: { id: string; name?: string; email: string }[];
}

export interface FlatSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string | null;
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
  assignmentTitle: string;
  assignmentCategory: string;
  dueDate?: string | null;
  courseId?: string | null;
  courseTitle?: string;
  isDirect: boolean;
  materialType: string;
  materialUrl: string | null;
  materialFormData: any;
  studentName: string;
  studentEmail: string;
  structuredTaskId?: string | null;
  structuredTaskTitle?: string | null;
  structuredTaskCategory?: string | null;
  structuredStepOrder?: number | null;
  structuredStepTitle?: string | null;
  structuredStepRequiresSubmission?: boolean;
}

export interface StudentWithMeta {
  id: string;
  email: string;
  fullName: string;
  modality?: 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO';
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  enrolledCourses?: CourseData[];
  submissions?: FlatSubmission[];
  totalSubmissions?: number;
  gradedSubmissions?: number;
  pendingSubmissions?: number;
  averageGrade?: string | null;
}

export interface ExpedienteAcademicoProps {
  studentId: string;
  classId?: string | null;
  student?: StudentWithMeta | null;
  course?: CourseData | null;
  allSubmissions?: FlatSubmission[];
  onBack?: () => void;
  onGradeSaved?: () => void;
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ParsedExamData {
  answers: Record<string, string | number | string[]>;
  score: number | null;
  total: number | null;
  hasOpenText?: boolean;
  openTextCount?: number;
  questionScores?: Record<string, number>;
}

interface SubmissionAttachment {
  name: string;
  mimeType: string;
  dataUrl: string;
  size?: number;
}

const parseSavedExam = (content?: string | null): ParsedExamData | null => {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed.answers || typeof parsed.score === 'number' || parsed.hasOpenText) {
      return {
        answers: parsed.answers || {},
        score: typeof parsed.score === 'number' ? parsed.score : null,
        total: typeof parsed.total === 'number' ? parsed.total : null,
        hasOpenText: Boolean(parsed.hasOpenText),
        openTextCount: typeof parsed.openTextCount === 'number' ? parsed.openTextCount : (parsed.hasOpenText ? 1 : 0),
        questionScores: parsed.questionScores && typeof parsed.questionScores === 'object' ? parsed.questionScores : {}
      };
    }
    return null;
  } catch {
    return null;
  }
};

const isSubmissionPending = (s: { materialType?: string; grade?: number | null; content?: string | null }) => {
  if (s.grade !== null && s.grade !== undefined) return false;
  if (s.materialType !== 'FORM') return true;
  const exam = parseSavedExam(s.content);
  return Boolean(exam?.hasOpenText || (exam?.openTextCount ?? 0) > 0);
};

const parseSubmissionContent = (content?: string | null): { text: string; link: string | null; attachment: SubmissionAttachment | null } => {
  if (!content) return { text: '', link: null, attachment: null };

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const attachment = parsed.attachment && typeof parsed.attachment === 'object' ? {
        name: typeof parsed.attachment.name === 'string' ? parsed.attachment.name : 'archivo-adjunto',
        mimeType: typeof parsed.attachment.mimeType === 'string' ? parsed.attachment.mimeType : 'application/octet-stream',
        dataUrl: typeof parsed.attachment.dataUrl === 'string' ? parsed.attachment.dataUrl : '',
        size: typeof parsed.attachment.size === 'number' ? parsed.attachment.size : undefined
      } : null;

      return {
        text: typeof parsed.text === 'string' ? parsed.text : (typeof parsed.content === 'string' ? parsed.content : ''),
        link: typeof parsed.link === 'string' ? parsed.link : (typeof parsed.url === 'string' ? parsed.url : null),
        attachment
      };
    }
  } catch {
    // plain content
  }

  return {
    text: content,
    link: /^https?:\/\//i.test(content) ? content : null,
    attachment: null
  };
};

const groupStructuredSubmissions = (submissions: FlatSubmission[]) => {
  const groups = new Map<string, FlatSubmission[]>();
  submissions.forEach((submission) => {
    if (!submission.structuredTaskId) return;
    const key = `${submission.structuredTaskId}:${submission.studentId}`;
    groups.set(key, [...(groups.get(key) || []), submission]);
  });
  return Array.from(groups.values()).filter((group) => group.some((submission) => {
    const examData = parseSavedExam(submission.content);
    return Boolean(submission.structuredStepRequiresSubmission || examData || submission.materialType === 'FORM');
  }));
};

const ExpedienteAcademico: React.FC<ExpedienteAcademicoProps> = ({
  studentId,
  classId,
  student,
  course,
  allSubmissions,
  onBack,
  onGradeSaved
}) => {
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [termEvaluation, setTermEvaluation] = useState<TermEvaluationData | null>(null);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);

  // Modales
  const [evaluatingSubmission, setEvaluatingSubmission] = useState<{
    subId: string;
    studentName: string;
    assignmentTitle: string;
    submittedAt: string;
    content: string | null;
    currentGrade: number | null;
    currentFeedback: string | null;
  } | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [viewingAttachment, setViewingAttachment] = useState<AttachmentData | null>(null);
  const [reviewingExam, setReviewingExam] = useState<{
    subId: string;
    title: string;
    questions?: ReviewQuestion[];
    answers: Record<string, any>;
    score: number | null;
    total?: number | null;
    feedback: string | null;
    questionScores?: Record<string, number>;
    hasOpenText?: boolean;
    openTextCount?: number;
  } | null>(null);
  const [expandedSubmissionDetailsId, setExpandedSubmissionDetailsId] = useState<string | null>(null);
  const [expandedStructuredTaskKey, setExpandedStructuredTaskKey] = useState<string | null>(null);

  // Evaluación final / Competencias
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [evaluationForm, setEvaluationForm] = useState({
    middleExamGrade: '',
    finalExamGrade: '',
    middleGrammar: '', middleReading: '', middleWriting: '', middleListening: '', middleSpeaking: '',
    finalGrammar: '', finalReading: '', finalWriting: '', finalListening: '', finalSpeaking: '',
    grammar: '',
    reading: '',
    writing: '',
    listening: '',
    speaking: '',
    overallGrade: '',
    observations: ''
  });
  const [expandedExamSections, setExpandedExamSections] = useState({ middle: false, final: false });
  const [isSavingEvaluation, setIsSavingEvaluation] = useState(false);

  // Aislamiento estricto de entregas para la clase actual
  const classSubmissions = useMemo(() => {
    const rawList = student?.submissions || (allSubmissions ? allSubmissions.filter(s => s.studentId === studentId) : []);
    if (!classId) return rawList;
    return rawList.filter(s => s.courseId === classId);
  }, [student, allSubmissions, studentId, classId]);

  const activeStructuredTaskGroups = useMemo(
    () => groupStructuredSubmissions(classSubmissions),
    [classSubmissions]
  );

  const directSubmissions = useMemo(
    () => classSubmissions.filter(sub => !sub.structuredTaskId),
    [classSubmissions]
  );

  // Media de tareas calculada estrictamente sobre la clase actual
  const gradedClassSubs = useMemo(
    () => classSubmissions.filter(s => s.grade !== null && s.grade !== undefined),
    [classSubmissions]
  );

  const localTasksAverage = useMemo(() => {
    if (gradedClassSubs.length === 0) return null;
    return Number((gradedClassSubs.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedClassSubs.length).toFixed(1));
  }, [gradedClassSubs]);

  // Carga de evaluación trimestral aislada por clase
  const fetchEvaluation = async () => {
    if (!studentId) return;
    try {
      setLoadingEvaluation(true);
      const token = localStorage.getItem('token');
      const targetCourseId = classId || student?.enrolledCourses?.[0]?.id;
      if (!targetCourseId) {
        setTermEvaluation(null);
        return;
      }
      const res = await fetch(`${apiUrl}/api/term-grades/student/${studentId}?courseId=${targetCourseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const selectedTermData = data.terms?.[selectedTerm] || null;
        setTermEvaluation(selectedTermData);
      } else {
        setTermEvaluation(null);
      }
    } catch (err) {
      console.error('Error al obtener evaluación del alumno:', err);
      setTermEvaluation(null);
    } finally {
      setLoadingEvaluation(false);
    }
  };

  useEffect(() => {
    fetchEvaluation();
  }, [studentId, classId, selectedTerm]);

  const effectiveTasksAverage = typeof termEvaluation?.tasksAverage === 'number'
    ? termEvaluation.tasksAverage
    : localTasksAverage;

  const displayedTermOverall = termEvaluation?.overallGrade;

  const openEvaluationModal = () => {
    if (termEvaluation) {
      setEvaluationForm({
        middleExamGrade: termEvaluation.middleExamGrade !== null && termEvaluation.middleExamGrade !== undefined ? String(termEvaluation.middleExamGrade) : '',
        finalExamGrade: termEvaluation.finalExamGrade !== null && termEvaluation.finalExamGrade !== undefined ? String(termEvaluation.finalExamGrade) : '',
        middleGrammar: termEvaluation.middleGrammar !== null && termEvaluation.middleGrammar !== undefined ? String(termEvaluation.middleGrammar) : '',
        middleReading: termEvaluation.middleReading !== null && termEvaluation.middleReading !== undefined ? String(termEvaluation.middleReading) : '',
        middleWriting: termEvaluation.middleWriting !== null && termEvaluation.middleWriting !== undefined ? String(termEvaluation.middleWriting) : '',
        middleListening: termEvaluation.middleListening !== null && termEvaluation.middleListening !== undefined ? String(termEvaluation.middleListening) : '',
        middleSpeaking: termEvaluation.middleSpeaking !== null && termEvaluation.middleSpeaking !== undefined ? String(termEvaluation.middleSpeaking) : '',
        finalGrammar: termEvaluation.finalGrammar !== null && termEvaluation.finalGrammar !== undefined ? String(termEvaluation.finalGrammar) : '',
        finalReading: termEvaluation.finalReading !== null && termEvaluation.finalReading !== undefined ? String(termEvaluation.finalReading) : '',
        finalWriting: termEvaluation.finalWriting !== null && termEvaluation.finalWriting !== undefined ? String(termEvaluation.finalWriting) : '',
        finalListening: termEvaluation.finalListening !== null && termEvaluation.finalListening !== undefined ? String(termEvaluation.finalListening) : '',
        finalSpeaking: termEvaluation.finalSpeaking !== null && termEvaluation.finalSpeaking !== undefined ? String(termEvaluation.finalSpeaking) : '',
        grammar: termEvaluation.grammar !== null && termEvaluation.grammar !== undefined ? String(termEvaluation.grammar) : '',
        reading: termEvaluation.reading !== null && termEvaluation.reading !== undefined ? String(termEvaluation.reading) : '',
        writing: termEvaluation.writing !== null && termEvaluation.writing !== undefined ? String(termEvaluation.writing) : '',
        listening: termEvaluation.listening !== null && termEvaluation.listening !== undefined ? String(termEvaluation.listening) : '',
        speaking: termEvaluation.speaking !== null && termEvaluation.speaking !== undefined ? String(termEvaluation.speaking) : '',
        overallGrade: termEvaluation.overallGrade !== null && termEvaluation.overallGrade !== undefined ? String(termEvaluation.overallGrade) : '',
        observations: termEvaluation.observations || ''
      });
    } else {
      setEvaluationForm({
        middleExamGrade: '',
        finalExamGrade: '',
        middleGrammar: '', middleReading: '', middleWriting: '', middleListening: '', middleSpeaking: '',
        finalGrammar: '', finalReading: '', finalWriting: '', finalListening: '', finalSpeaking: '',
        grammar: '',
        reading: '',
        writing: '',
        listening: '',
        speaking: '',
        overallGrade: '',
        observations: ''
      });
    }
    setExpandedExamSections({ middle: false, final: false });
    setIsEvaluationModalOpen(true);
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCourseId = classId || course?.id || student?.enrolledCourses?.[0]?.id;
    if (!targetCourseId) return;

    try {
      setIsSavingEvaluation(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/term-grades/course/${targetCourseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId,
          term: selectedTerm,
          ...evaluationForm
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setTermEvaluation(updated);
        setIsEvaluationModalOpen(false);
        if (onGradeSaved) onGradeSaved();
      }
    } catch (err) {
      console.error('Error al guardar evaluación trimestral:', err);
    } finally {
      setIsSavingEvaluation(false);
    }
  };

  const openGradingModal = (sub: FlatSubmission) => {
    setEvaluatingSubmission({
      subId: sub.id,
      studentName: sub.studentName,
      assignmentTitle: sub.assignmentTitle,
      submittedAt: sub.submittedAt,
      content: sub.content,
      currentGrade: sub.grade,
      currentFeedback: sub.feedback
    });
    setGradeInput(sub.grade !== null && sub.grade !== undefined ? String(sub.grade) : '');
    setFeedbackInput(sub.feedback || '');
    setSaveError('');
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingSubmission) return;

    const savedExam = parseSavedExam(evaluatingSubmission.content);
    const calculatedExamGrade = savedExam?.score !== null && savedExam?.score !== undefined && savedExam.total
      ? (savedExam.score / savedExam.total) * 10
      : null;
    const numGrade = calculatedExamGrade ?? (gradeInput.trim() !== '' ? parseFloat(gradeInput) : null);
    if (numGrade !== null && (isNaN(numGrade) || numGrade < 0 || numGrade > 10)) {
      setSaveError('La calificación debe ser un número entre 0 y 10.');
      return;
    }

    try {
      setIsSavingGrade(true);
      setSaveError('');
      const token = localStorage.getItem('token');

      const res = await fetch(`${apiUrl}/api/assignments/submissions/${evaluatingSubmission.subId}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          grade: numGrade,
          feedback: feedbackInput.trim() || null
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setSaveError(errData.error || 'Error al guardar la calificación.');
        return;
      }

      setEvaluatingSubmission(null);
      fetchEvaluation();
      if (onGradeSaved) onGradeSaved();
    } catch (err) {
      console.error(err);
      setSaveError('Error de conexión al guardar la calificación.');
    } finally {
      setIsSavingGrade(false);
    }
  };

  const handleSaveExamGradeAndFeedback = async (data: { grade: number; feedback: string; questionScores: Record<string, number> }) => {
    if (!reviewingExam) return;
    const token = localStorage.getItem('token');
    const updatedFeedback = data.feedback ? data.feedback.trim() : null;

    const res = await fetch(`${apiUrl}/api/assignments/submissions/${reviewingExam.subId}/grade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        grade: data.grade,
        feedback: updatedFeedback,
        questionScores: data.questionScores
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al guardar la calificación del examen.');
    }

    setReviewingExam(null);
    fetchEvaluation();
    if (onGradeSaved) onGradeSaved();
  };

  const handleSaveExamFeedback = async (feedback: string) => {
    if (!reviewingExam) return;
    const token = localStorage.getItem('token');
    const updatedFeedback = feedback ? feedback.trim() : null;

    const res = await fetch(`${apiUrl}/api/assignments/submissions/${reviewingExam.subId}/grade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ grade: reviewingExam.score, feedback: updatedFeedback })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al guardar el feedback.');
    }

    setReviewingExam(null);
    fetchEvaluation();
    if (onGradeSaved) onGradeSaved();
  };

  const studentFullName = student?.fullName || (student?.profile ? `${student.profile.firstName} ${student.profile.lastName}`.trim() : 'Expediente del Alumno');
  const studentEmail = student?.email || '';
  const studentModality = student?.modality || 'PRESENCIAL';
  const classTitle = course?.title || (classId ? `Clase: ${classId}` : null);

  const gradingExamData = evaluatingSubmission ? parseSavedExam(evaluatingSubmission.content) : null;
  const isAutocorrectedExam = Boolean(gradingExamData?.total && gradingExamData.score !== null && gradingExamData.score !== undefined);

  return (
    <div
      className="w-full h-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-6 animate-fade-in"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100%',
        flex: '1 1 auto',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}
    >
      {/* Botón Volver opcional */}
      {onBack && (
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer bg-transparent border-none p-0"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            <span>Volver</span>
          </button>
        </div>
      )}

      {/* Encabezado del Expediente */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-5" style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg text-white shrink-0 shadow-xs"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '1.1rem',
            flexShrink: 0
          }}
        >
          {studentFullName.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 mb-1"
            style={{ display: 'inline-flex', padding: '0.2rem 0.55rem', borderRadius: '999px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}
          >
            {classTitle ? `EXPEDIENTE · ${classTitle}` : 'EXPEDIENTE ACADÉMICO'}
          </span>
          <h1 className="text-xl font-bold text-slate-800 truncate m-0" style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {studentFullName}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{studentEmail}</span>
            <ModalityBadge modality={studentModality} />
          </div>
        </div>
      </div>

      {/* Sección de Evaluación Trimestral por Competencias */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.25rem' }}>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div className="flex items-center gap-2.5" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800" style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
              <Award size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 m-0" style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                Evaluación Trimestral / Competencias
              </h3>
              <span className="text-xs text-slate-400" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {classTitle ? `Aislado a ${classTitle}` : 'Evaluación global'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={openEvaluationModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', cursor: 'pointer' }}
          >
            <Edit3 size={15} />
            <span>{termEvaluation ? 'Editar Evaluación' : 'Asignar Notas'}</span>
          </button>
        </div>

        {/* Pestañas de Trimestres */}
        <div className="flex gap-2 mb-4" role="tablist" aria-label="Seleccionar trimestre" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {[1, 2, 3].map((termNum) => {
            const isTermActive = selectedTerm === termNum;
            return (
              <button
                key={termNum}
                type="button"
                role="tab"
                aria-selected={isTermActive}
                onClick={() => setSelectedTerm(termNum)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  isTermActive
                    ? 'bg-white text-emerald-800 border-emerald-500 shadow-xs'
                    : 'bg-transparent text-slate-500 border-slate-200 hover:bg-white/60'
                }`}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: isTermActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: isTermActive ? 'var(--surface)' : 'transparent',
                  color: isTermActive ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: isTermActive ? 700 : 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                {termNum}º Trimestre
              </button>
            );
          })}
        </div>

        {/* Resumen de Calificaciones Presencial (2x2 en móvil, 4 cols en desktop) */}
        {studentModality !== 'ONLINE' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mb-3 grades-eval-cards-grid">
            {[
              ['MIDDLE TERM', termEvaluation?.middleExamGrade, 'Examen parcial (35%)', false],
              ['FINAL TERM', termEvaluation?.finalExamGrade, 'Examen final (35%)', false],
              ['MEDIA TAREAS', effectiveTasksAverage, `Prácticas de ${classTitle ? 'clase' : 'curso'} (30%)`, false],
              ['CALIFICACIÓN', displayedTermOverall, 'Nota ponderada', true]
            ].map(([label, val, subtitle, isOverall]) => (
              <div
                key={String(label)}
                className={`p-2.5 sm:p-3 rounded-lg border text-center grades-eval-card ${
                  isOverall
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-white border-slate-200'
                }`}
                style={{
                  borderRadius: '8px',
                  border: isOverall ? '1px solid var(--primary-border, #bfe0d0)' : '1px solid var(--border)',
                  background: isOverall ? 'var(--primary-light)' : 'var(--surface)',
                  textAlign: 'center'
                }}
              >
                <span
                  className={`block text-xs font-bold uppercase tracking-wider grades-eval-card__title ${
                    isOverall ? 'text-emerald-800' : 'text-slate-500'
                  }`}
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    color: isOverall ? 'var(--primary)' : 'var(--text-muted)',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {label === 'CALIFICACIÓN' ? 'CALIF. TRIMESTRAL' : label}
                </span>
                <strong
                  className={`block text-base sm:text-lg font-extrabold mt-1 grades-eval-card__score ${
                    isOverall ? 'text-emerald-900' : 'text-slate-800'
                  }`}
                  style={{
                    fontSize: '1.1rem',
                    display: 'block',
                    marginTop: '0.15rem',
                    color: isOverall ? 'var(--primary)' : 'var(--text-main)'
                  }}
                >
                  {typeof val === 'number' ? `${val.toFixed(1)} / 10` : '- / 10'}
                </strong>
                <small
                  className="block text-[10px] text-slate-400 mt-0.5 grades-eval-card__subtitle"
                  style={{
                    fontSize: '0.62rem',
                    color: 'var(--text-muted)',
                    display: 'block',
                    marginTop: '0.1rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {subtitle}
                </small>
              </div>
            ))}
          </div>
        )}

        {/* Resumen Destrezas Online */}
        {studentModality === 'ONLINE' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {[
              ['GRAMMAR', termEvaluation?.grammar],
              ['READING', termEvaluation?.reading],
              ['WRITING', termEvaluation?.writing],
              ['LISTENING', termEvaluation?.listening],
              ['SPEAKING', termEvaluation?.speaking],
              ['NOTA GLOBAL', termEvaluation?.overallGrade]
            ].map(([label, val]) => {
              const isGlobal = label === 'NOTA GLOBAL';
              return (
                <div
                  key={String(label)}
                  className={`p-2.5 rounded-lg border text-center ${
                    isGlobal ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'
                  }`}
                  style={{
                    padding: '0.65rem 0.4rem',
                    borderRadius: '8px',
                    border: isGlobal ? '1px solid var(--primary-border, #bfe0d0)' : '1px solid var(--border)',
                    background: isGlobal ? 'var(--primary-light)' : 'var(--surface)',
                    textAlign: 'center'
                  }}
                >
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider" style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>
                    {label}
                  </span>
                  <strong className="block text-base font-extrabold text-emerald-800 mt-1" style={{ fontSize: '1rem', color: 'var(--primary)', display: 'block', marginTop: '0.2rem' }}>
                    {typeof val === 'number' ? `${val.toFixed(1)} / 10` : '- / 10'}
                  </strong>
                </div>
              );
            })}
          </div>
        )}

        {/* Observaciones del profesor */}
        {termEvaluation?.observations && (
          <p className="m-0 text-xs text-slate-600 italic bg-white p-3 rounded-lg border border-slate-200" style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-main)', fontStyle: 'italic', background: 'var(--surface)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            💬 Observaciones: "{termEvaluation.observations}"
          </p>
        )}

        {!termEvaluation && !loadingEvaluation && (
          <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs" style={{ padding: '0.75rem 0.9rem', background: '#fef7e8', borderRadius: '8px', border: '1px solid #fae0b0', color: '#8d5b12', fontSize: '0.85rem' }}>
            ⚠️ Pendiente de evaluación trimestral para esta clase.
          </div>
        )}
      </div>

      {/* Historial de Tareas y Exámenes */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 className="text-sm font-bold text-slate-800 m-0" style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)' }}>
            Historial de Tareas y Exámenes ({classSubmissions.length})
          </h4>
          {classTitle && (
            <span className="text-xs text-slate-400" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Filtrado por: {classTitle}
            </span>
          )}
        </div>

        {classSubmissions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl text-sm" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface-alt)', borderRadius: '10px', border: '1px solid var(--border)' }}>
            Este alumno aún no tiene entregas de tareas ni exámenes en esta clase.
          </div>
        ) : (
          <div className="flex flex-col gap-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Tareas estructuradas */}
            {activeStructuredTaskGroups.map((group) => {
              const ordered = [...group].sort((a, b) => (a.structuredStepOrder || 0) - (b.structuredStepOrder || 0));
              const first = ordered[0];
              const blockKey = `${first.structuredTaskId}:${first.studentId}`;
              const isExpanded = expandedStructuredTaskKey === blockKey;
              const gradedSteps = ordered.filter(s => s.grade !== null && s.grade !== undefined);
              const groupAvg = gradedSteps.length > 0
                ? gradedSteps.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSteps.length
                : null;
              const dueDate = first.dueDate;
              const latestSubmissionAt = Math.max(...ordered.map(s => new Date(s.submittedAt).getTime()));
              const isLate = Boolean(dueDate && latestSubmissionAt > new Date(dueDate).getTime());

              return (
                <article
                  key={blockKey}
                  onClick={() => setExpandedStructuredTaskKey(isExpanded ? null : blockKey)}
                  className="p-4 rounded-xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white hover:shadow-xs transition-shadow cursor-pointer"
                  style={{ padding: '1rem 1.15rem', borderRadius: '10px', border: '1px solid var(--border)', borderLeft: '4px solid var(--primary)', background: 'var(--surface)', cursor: 'pointer' }}
                >
                  <div className="flex justify-between items-center gap-3 flex-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 mb-1" style={{ display: 'inline-block', marginBottom: '0.25rem', padding: '0.18rem 0.5rem', borderRadius: '6px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 700 }}>
                        {first.structuredTaskCategory || first.assignmentCategory}
                      </span>
                      <strong className="block text-slate-800 text-sm" style={{ display: 'block', color: 'var(--text-main)', fontSize: '0.98rem' }}>
                        {first.structuredTaskTitle || first.assignmentTitle}
                      </strong>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span>{ordered.length} pasos</span>
                        {isLate && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700" style={{ padding: '0.16rem 0.45rem', borderRadius: '10px', background: '#fee2e2', color: '#b91c1c', fontSize: '0.7rem', fontWeight: 700 }}>Fuera de plazo</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200" style={{ padding: '0.3rem 0.7rem', borderRadius: '16px', background: groupAvg !== null && groupAvg >= 5 ? '#eaf4ef' : '#fef7e8', color: groupAvg !== null && groupAvg >= 5 ? '#24583e' : '#8d5b12', border: `1px solid ${groupAvg !== null && groupAvg >= 5 ? '#bfe0d0' : '#fae0b0'}`, fontWeight: 700, fontSize: '0.85rem' }}>
                        {groupAvg !== null ? `Nota tarea: ${groupAvg.toFixed(1)} / 10` : 'Pendiente'}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {isExpanded ? 'Ocultar' : 'Ver'} {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="flex flex-col gap-2.5 mt-3 pt-3 border-t border-slate-100" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)' }}>
                      {ordered.map((sub, idx) => {
                        const examData = parseSavedExam(sub.content);
                        const isExam = sub.materialType === 'FORM' || Boolean(examData);
                        const isEvaluable = Boolean(sub.structuredStepRequiresSubmission || isExam);
                        const parsed = parseSubmissionContent(sub.content);

                        return (
                          <div key={sub.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200" style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                            <div className="flex justify-between items-center gap-2 flex-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <strong className="text-xs font-semibold text-slate-800" style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>
                                Paso {idx + 1}: {sub.structuredStepTitle || sub.assignmentTitle}
                              </strong>
                              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                {sub.grade !== null && sub.grade !== undefined && (
                                  <span
                                    className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold shadow-2xs"
                                    style={{
                                      padding: '0.25rem 0.55rem',
                                      borderRadius: '10px',
                                      background: sub.grade >= 5 ? '#eaf4ef' : '#fdf0f0',
                                      color: sub.grade >= 5 ? '#24583e' : '#9e2a2b',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      border: sub.grade >= 5 ? '1px solid #c3e6d5' : '1px solid #f9caca'
                                    }}
                                  >
                                    {sub.grade.toFixed(1)} / 10
                                  </span>
                                )}
                                {isExam && examData && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReviewingExam({
                                        subId: sub.id,
                                        title: sub.assignmentTitle,
                                        questions: sub.materialFormData?.questions || [],
                                        answers: examData.answers,
                                        score: sub.grade,
                                        total: examData.total,
                                        feedback: sub.feedback,
                                        questionScores: examData.questionScores,
                                        hasOpenText: examData.hasOpenText,
                                        openTextCount: examData.openTextCount
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                  >
                                    <FileText size={12} className="inline mr-0.5" />
                                    {isSubmissionPending(sub) ? `Corregir (${examData.openTextCount || 1} pend.)` : 'Ver Test'}
                                  </button>
                                )}
                                {isEvaluable && !isExam && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); openGradingModal(sub); }}
                                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 border-none"
                                    title="Evaluar este paso"
                                  >
                                    <Edit3 size={13} />
                                    <span>Evaluar</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            {parsed.text && (
                              <p className="mt-2 mb-0 text-xs text-slate-600" style={{ marginTop: '0.4rem', color: 'var(--text-main)', fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>
                                {parsed.text}
                              </p>
                            )}
                            {sub.feedback && (
                              <div className="mt-2 text-xs text-blue-800 bg-blue-50 p-2 rounded border border-blue-100" style={{ marginTop: '0.4rem', color: '#1e40af', fontSize: '0.78rem' }}>
                                💬 {sub.feedback}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}

            {/* Tareas sueltas directas */}
            {directSubmissions.map((sub) => {
              const examData = parseSavedExam(sub.content);
              const isExam = sub.materialType === 'FORM' || Boolean(examData);
              const hasGrade = sub.grade !== null && sub.grade !== undefined;
              const isLate = Boolean(sub.dueDate && new Date(sub.submittedAt) > new Date(sub.dueDate));
              const submissionDetails = parseSubmissionContent(sub.content);
              const isExpanded = expandedSubmissionDetailsId === sub.id;

              return (
                <div
                  key={sub.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white border-l-4"
                  style={{
                    padding: '1.1rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    borderLeft: `4px solid ${hasGrade ? (sub.grade! >= 5 ? '#22c55e' : '#ef4444') : '#f59e0b'}`
                  }}
                >
                  <div className="flex justify-between items-start flex-wrap gap-2 mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <strong className="block text-sm font-bold text-slate-800" style={{ fontSize: '1rem', color: 'var(--text-main)', display: 'block' }}>
                        {sub.assignmentTitle}
                      </strong>
                      <span className="text-xs text-slate-400" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Entregado el {new Date(sub.submittedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isLate && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" style={{ display: 'inline-flex', alignItems: 'center', marginTop: '0.3rem', padding: '0.18rem 0.45rem', borderRadius: '10px', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.72rem', fontWeight: 700 }}>
                          Fuera de plazo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {hasGrade ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '16px', fontWeight: 700, fontSize: '0.92rem', background: sub.grade! >= 5 ? '#eaf4ef' : '#fdf0f0', color: sub.grade! >= 5 ? '#24583e' : '#9e2a2b', border: `1px solid ${sub.grade! >= 5 ? '#bfe0d0' : '#f7caca'}` }}>
                          <CheckCircle2 size={14} /> {sub.grade!.toFixed(1)} / 10
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '16px', fontWeight: 600, fontSize: '0.82rem', background: '#fef7e8', color: '#8d5b12', border: '1px solid #fae0b0' }}>
                          <Clock3 size={14} /> Pendiente
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedSubmissionDetailsId(isExpanded ? null : sub.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2 text-xs" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                      {/* Contenido / Respuestas */}
                      {isExam ? (
                        <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between flex-wrap gap-2" style={{ padding: '0.75rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <div>
                            <strong className="block text-slate-800" style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                              {examData?.hasOpenText ? 'Cuestionario con preguntas abiertas' : 'Examen tipo test completado'}
                            </strong>
                            {examData?.score !== null && examData?.score !== undefined && (
                              <span className="text-slate-500" style={{ color: 'var(--text-muted)' }}>
                                {examData.score} de {examData.total} puntos objetivos
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setReviewingExam({
                              subId: sub.id,
                              title: sub.assignmentTitle,
                              questions: sub.materialFormData?.questions || [],
                              answers: examData?.answers || {},
                              score: sub.grade,
                              total: examData?.total,
                              feedback: sub.feedback,
                              questionScores: examData?.questionScores,
                              hasOpenText: examData?.hasOpenText,
                              openTextCount: examData?.openTextCount
                            })}
                            className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer border-none"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: isSubmissionPending(sub) ? '#d97706' : undefined, borderColor: isSubmissionPending(sub) ? '#b45309' : undefined }}
                          >
                            <FileText size={13} className="inline mr-1" />
                            {isSubmissionPending(sub) ? 'Corregir Examen' : 'Revisar Test'}
                          </button>
                        </div>
                      ) : (
                        <div>
                          {submissionDetails.text && (
                            <div className="p-3 bg-slate-50 rounded-lg text-slate-700 whitespace-pre-wrap" style={{ padding: '0.6rem 0.8rem', background: 'var(--surface-alt)', borderRadius: '6px', fontSize: '0.85rem' }}>
                              {submissionDetails.text}
                            </div>
                          )}
                          {submissionDetails.link && (
                            <a
                              href={submissionDetails.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline mt-2"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                            >
                              <ExternalLink size={13} /> Abrir documento en la nube
                            </a>
                          )}
                          {submissionDetails.attachment?.dataUrl && (
                            <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between" style={{ padding: '0.6rem 0.8rem', background: 'var(--surface-alt)', borderRadius: '6px', fontSize: '0.85rem' }}>
                              <span className="font-semibold text-slate-700 truncate" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                                Archivo: {submissionDetails.attachment.name}
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingAttachment(submissionDetails.attachment)}
                                  className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.28rem 0.6rem', fontSize: '0.78rem' }}
                                >
                                  <Eye size={12} className="inline mr-1" /> Ver en línea
                                </button>
                                <a
                                  href={submissionDetails.attachment.dataUrl}
                                  download={submissionDetails.attachment.name}
                                  className="p-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.3rem', borderRadius: '6px', color: 'var(--primary)', textDecoration: 'none' }}
                                >
                                  <Download size={14} />
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Feedback */}
                      {sub.feedback && (
                        <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900" style={{ marginTop: '0.65rem', padding: '0.65rem 0.85rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.86rem' }}>
                          <strong className="block text-blue-800 text-[11px] mb-1" style={{ color: '#1d4ed8', display: 'block', marginBottom: '0.25rem', fontSize: '0.78rem', fontWeight: 700 }}>
                            💬 Observaciones del profesor:
                          </strong>
                          <p className="m-0 whitespace-pre-wrap" style={{ margin: 0, color: '#1e3a8a', whiteSpace: 'pre-wrap', lineHeight: '1.45' }}>{sub.feedback}</p>
                        </div>
                      )}

                      {/* Botón calificar */}
                      {!isExam && (
                        <div className="flex justify-end mt-2" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                          <button
                            type="button"
                            onClick={() => openGradingModal(sub)}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 border-none"
                          >
                            <Edit3 size={13} />
                            <span>{hasGrade ? 'Editar Nota y Feedback' : 'Evaluar Tarea'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL DE CALIFICACIÓN RÁPIDA
         ========================================================================= */}
      {evaluatingSubmission && createPortal(
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '1rem' }}>
          <div className="glass-panel modal-card" style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Evaluar Entrega</h3>
              <button type="button" onClick={() => setEvaluatingSubmission(null)} className="modal-close" aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            {saveError && (
              <div style={{ padding: '0.75rem 1rem', background: '#fdf0f0', color: '#9e2a2b', border: '1px solid #f7caca', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
                {saveError}
              </div>
            )}

            <div style={{ padding: '1rem', background: 'var(--surface-alt)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{evaluatingSubmission.assignmentTitle}</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {new Date(evaluatingSubmission.submittedAt).toLocaleDateString('es-ES')}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveGrade} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {!isAutocorrectedExam && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Calificación Numérica (0 - 10)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    required
                    placeholder="Ej. 8.5"
                    value={gradeInput}
                    onChange={e => setGradeInput(e.target.value)}
                    style={{
                      width: '120px',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-alt)',
                      color: 'var(--text-main)',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Observaciones y Feedback
                </label>
                <textarea
                  rows={4}
                  placeholder="Escribe comentarios formativos o correcciones..."
                  value={feedbackInput}
                  onChange={e => setFeedbackInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-alt)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEvaluatingSubmission(null)}
                  disabled={isSavingGrade}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingGrade}
                  className="btn-primary"
                  style={{ padding: '0.75rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <CheckCircle2 size={16} />
                  {isSavingGrade ? 'Guardando...' : 'Guardar Calificación'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================================
          MODAL DE REVISIÓN DE EXAMEN TIPO TEST
         ========================================================================= */}
      {reviewingExam && createPortal(
        <ExamReviewModal
          title={reviewingExam.title}
          questions={reviewingExam.questions}
          answers={reviewingExam.answers}
          score={reviewingExam.score}
          total={reviewingExam.total}
          audioMode="backend-proxy"
          feedback={reviewingExam.feedback}
          questionScores={reviewingExam.questionScores}
          onSaveFeedback={handleSaveExamFeedback}
          onSaveGradeAndFeedback={handleSaveExamGradeAndFeedback}
          onClose={() => setReviewingExam(null)}
        />,
        document.body
      )}

      {/* =========================================================================
          VISOR DE ARCHIVOS ADJUNTOS
         ========================================================================= */}
      {viewingAttachment && createPortal(
        <AttachmentViewerModal
          attachment={viewingAttachment}
          onClose={() => setViewingAttachment(null)}
        />,
        document.body
      )}

      {/* =========================================================================
          MODAL DE EVALUACIÓN FINAL / COMPETENCIAS
         ========================================================================= */}
      {isEvaluationModalOpen && createPortal(
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel modal-card" style={{ width: '100%', maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--surface)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  EVALUACIÓN DOCENTE · {selectedTerm}º TRIMESTRE
                </span>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award style={{ color: 'var(--primary)' }} /> Evaluación Final / Competencias
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {studentFullName} {classTitle ? `· ${classTitle}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => setIsEvaluationModalOpen(false)} className="modal-close" aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEvaluation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {studentModality !== 'ONLINE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {([
                    ['middle', 'MIDDLE TERM (35%)'],
                    ['final', 'FINAL TERM (35%)']
                  ] as const).map(([exam, label]) => {
                    const skillFields = [
                      [`${exam}Grammar`, 'Grammar and Vocabulary'],
                      [`${exam}Reading`, 'Reading'],
                      [`${exam}Speaking`, 'Speaking'],
                      [`${exam}Listening`, 'Listening'],
                      [`${exam}Writing`, 'Writing']
                    ] as const;
                    const enteredGrades = skillFields
                      .map(([field]) => (evaluationForm as any)[field].trim())
                      .filter((value) => value !== '')
                      .map(Number)
                      .filter((grade) => Number.isFinite(grade) && grade >= 0 && grade <= 10);
                    const average = enteredGrades.length > 0 ? (enteredGrades.reduce((sum, grade) => sum + grade, 0) / enteredGrades.length).toFixed(1) : null;

                    return (
                      <div key={exam} style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-alt)', overflow: 'hidden' }}>
                        <button type="button" onClick={() => setExpandedExamSections((current) => ({ ...current, [exam]: !current[exam] }))} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.85rem 1rem', border: 'none', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'left' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{label}</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>{average ? `Media: ${average} / 10` : 'Añadir destrezas'}</span>
                        </button>
                        {expandedExamSections[exam] && (
                          <div style={{ padding: '0 1rem 1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
                            {skillFields.map(([field, skill]) => (
                              <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                {skill}
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="10"
                                  value={(evaluationForm as any)[field]}
                                  onChange={e => setEvaluationForm({ ...evaluationForm, [field]: e.target.value })}
                                  placeholder="Sin calificar"
                                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', outline: 'none' }}
                                />
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {studentModality === 'ONLINE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {[
                    ['grammar', 'Grammar'],
                    ['reading', 'Reading'],
                    ['writing', 'Writing'],
                    ['listening', 'Listening'],
                    ['speaking', 'Speaking'],
                    ['overallGrade', 'Nota Global']
                  ].map(([field, label]) => (
                    <div key={field}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                        {label}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={(evaluationForm as any)[field]}
                        onChange={e => setEvaluationForm({ ...evaluationForm, [field]: e.target.value })}
                        placeholder="0 - 10"
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', outline: 'none' }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                  Observaciones pedagógicas
                </label>
                <textarea
                  rows={3}
                  value={evaluationForm.observations}
                  onChange={e => setEvaluationForm({ ...evaluationForm, observations: e.target.value })}
                  placeholder="Comentarios sobre su evolución en esta clase..."
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEvaluationModalOpen(false)}
                  disabled={isSavingEvaluation}
                  style={{ padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEvaluation}
                  className="btn-primary"
                  style={{ padding: '0.75rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <CheckCircle2 size={16} />
                  {isSavingEvaluation ? 'Guardando...' : 'Guardar Evaluación'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ExpedienteAcademico;

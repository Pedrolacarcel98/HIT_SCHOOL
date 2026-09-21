import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, BookOpen, Users, Copy, X, Award } from 'lucide-react';
import StreamTab from '../components/StreamTab';
import ClassworkTab from '../components/ClassworkTab';
import PeopleTab from '../components/PeopleTab';
import ClassGradesDetail from '../components/ClassGradesDetail';

const CourseView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [duplicateModality, setDuplicateModality] = useState<'PRESENCIAL' | 'ONLINE' | 'HIBRIDO'>('PRESENCIAL');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');

  type CourseTab = 'stream' | 'classwork' | 'people' | 'grades';
  const paramTab = searchParams.get('tab') as CourseTab | null;
  const savedTab = id ? sessionStorage.getItem(`hit_teacher_course_tab_${id}`) as CourseTab | null : null;
  const initialTab: CourseTab = 
    (paramTab === 'classwork' || paramTab === 'people' || paramTab === 'stream' || paramTab === 'grades')
      ? paramTab
      : (savedTab === 'classwork' || savedTab === 'people' || savedTab === 'grades' ? savedTab : 'stream');

  const [activeTab, setActiveTabState] = useState<CourseTab>(initialTab);
  const [course, setCourse] = useState<any>(null);

  const setActiveTab = (tab: CourseTab) => {
    setActiveTabState(tab);
    if (id) {
      sessionStorage.setItem(`hit_teacher_course_tab_${id}`, tab);
    }
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === 'stream') {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (paramTab && (paramTab === 'stream' || paramTab === 'classwork' || paramTab === 'people' || paramTab === 'grades') && paramTab !== activeTab) {
      setActiveTabState(paramTab);
    }
  }, [paramTab]);

  useEffect(() => {
    fetchCourseDetails();
  }, [id]);

  const fetchCourseDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setCourse(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openDuplicateModal = () => {
    if (!course) return;
    setDuplicateTitle(`${course.title} (Copia)`);
    setDuplicateModality(course.modality || 'PRESENCIAL');
    setDuplicateError('');
    setIsDuplicateModalOpen(true);
  };

  const handleDuplicateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicateTitle.trim()) return;

    try {
      setIsDuplicating(true);
      setDuplicateError('');
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses/${id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: duplicateTitle.trim(),
          modality: duplicateModality
        })
      });

      if (res.ok) {
        const created = await res.json();
        setIsDuplicateModalOpen(false);
        navigate(`/teacher/course/${created.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setDuplicateError(data.error || 'No se pudo duplicar la clase.');
      }
    } catch (err) {
      console.error('Error duplicating course', err);
      setDuplicateError('Error de conexión al duplicar la clase.');
    } finally {
      setIsDuplicating(false);
    }
  };

  if (!course) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando aula...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#e0f2fe' }}>
      {/* Navbar Superior */}
      <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
            <button
              onClick={() => navigate('/teacher/courses')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)', padding: '4px' }}
              aria-label="Volver a mis clases"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {course.title}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={openDuplicateModal}
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                fontSize: '0.85rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              title="Duplicar esta clase para otro alumno"
            >
              <Copy size={16} /> Duplicar clase
            </button>
          </div>
        </div>

        {/* Pestañas con scroll horizontal en móvil */}
        <div className="scrollable-tabs" style={{ padding: '0 1.5rem', height: '48px', alignItems: 'center', gap: '1.5rem' }}>
          <TabButton active={activeTab === 'stream'} onClick={() => setActiveTab('stream')} icon={<MessageSquare size={18}/>} label="Tablón" />
          <TabButton active={activeTab === 'classwork'} onClick={() => setActiveTab('classwork')} icon={<BookOpen size={18}/>} label="Trabajo de clase" />
          <TabButton active={activeTab === 'people'} onClick={() => setActiveTab('people')} icon={<Users size={18}/>} label="Personas" />
          <TabButton active={activeTab === 'grades'} onClick={() => setActiveTab('grades')} icon={<Award size={18}/>} label="Calificaciones" />
        </div>
      </nav>

      {/* Contenido Principal */}
      <div className="page-container" style={{ maxWidth: activeTab === 'grades' ? '1440px' : '1000px', width: '100%' }}>
        {activeTab === 'stream' && <StreamTab courseId={id!} />}
        {activeTab === 'classwork' && <ClassworkTab courseId={id!} />}
        {activeTab === 'people' && <PeopleTab courseId={id!} />}
        {activeTab === 'grades' && (
          <ClassGradesDetail
            classId={id!}
            initialCourse={course}
            onBack={() => navigate('/teacher/courses')}
          />
        )}
      </div>

      {/* Modal Duplicar Clase */}
      {isDuplicateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: '1rem', background: 'rgba(34, 49, 43, 0.35)' }} onClick={() => !isDuplicating && setIsDuplicateModalOpen(false)}>
          <div className="glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ width: 'min(100%, 480px)', padding: '1.5rem' }}>
            <button onClick={() => !isDuplicating && setIsDuplicateModalOpen(false)} aria-label="Cerrar" style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', float: 'right', padding: '0.35rem' }}>
              <X size={19} />
            </button>
            <form onSubmit={handleDuplicateCourse}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '8px', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                  <Copy size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>Duplicar Clase</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: '1.45', margin: '0 0 1rem' }}>
                Se creará una nueva aula con las <strong>tareas estructuradas y pasos</strong> de “{course.title}”. Las fechas de entrega y publicación se resetearán para adaptarlas al nuevo ritmo, sin alumnos ni entregas previas.
              </p>

              {duplicateError && (
                <div style={{ padding: '0.6rem 0.85rem', marginBottom: '0.85rem', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', fontSize: '0.85rem' }}>
                  {duplicateError}
                </div>
              )}

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Nombre de la nueva clase:
              </label>
              <input
                value={duplicateTitle}
                onChange={(e) => setDuplicateTitle(e.target.value)}
                placeholder="Ej. B2 First Cambridge (Alumno 2)"
                autoFocus
                required
                disabled={isDuplicating}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', outline: 'none' }}
              />

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.85rem', marginBottom: '0.35rem' }}>
                Modalidad:
              </label>
              <select
                value={duplicateModality}
                onChange={(e) => setDuplicateModality(e.target.value as 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO')}
                disabled={isDuplicating}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', outline: 'none' }}
              >
                <option value="PRESENCIAL">Presencial (Academia)</option>
                <option value="ONLINE">Online / Particulares</option>
                <option value="HIBRIDO">Híbrido</option>
              </select>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsDuplicateModalOpen(false)} disabled={isDuplicating}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isDuplicating || !duplicateTitle.trim()}>
                  {isDuplicating ? 'Duplicando clase...' : 'Duplicar clase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    style={{ 
      background: 'none', 
      border: 'none',
      borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent',
      color: active ? 'var(--primary)' : 'var(--text-muted)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontWeight: active ? '600' : '400',
      padding: '0 0.5rem',
      height: '100%',
      whiteSpace: 'nowrap',
      fontSize: '0.9rem'
    }}
  >
    {icon} {label}
  </button>
);

export default CourseView;

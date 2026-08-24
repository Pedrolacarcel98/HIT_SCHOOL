import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, BookOpen, Users, Award } from 'lucide-react';
import StreamTab from '../components/StreamTab';
import ClassworkTab from '../components/ClassworkTab';
import PeopleTab from '../components/PeopleTab';
import GradesTab from '../components/GradesTab';

const CourseView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'stream' | 'classwork' | 'people' | 'grades'>('stream');
  const [course, setCourse] = useState<any>(null);

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

  if (!course) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando aula...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Navbar Superior */}
      <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
            <button
              onClick={() => navigate('/teacher')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)', padding: '4px' }}
              aria-label="Volver a mis clases"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {course.title}
            </h2>
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
      <div className="page-container" style={{ maxWidth: '1000px' }}>
        {activeTab === 'stream' && <StreamTab courseId={id!} />}
        {activeTab === 'classwork' && <ClassworkTab courseId={id!} />}
        {activeTab === 'people' && <PeopleTab courseId={id!} />}
        {activeTab === 'grades' && <GradesTab courseId={id!} />}
      </div>
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

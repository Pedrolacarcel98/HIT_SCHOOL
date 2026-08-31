import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, BookOpen, Award } from 'lucide-react';
import StudentStreamTab from '../components/StudentStreamTab';
import StudentClassworkTab from '../components/StudentClassworkTab';
import StudentGradesTab from '../components/StudentGradesTab';
import { useParent } from '../context/ParentContext';

const StudentCourseView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'stream' | 'classwork' | 'grades'>('stream');
  const [course, setCourse] = useState<any>(null);
  const { selectedStudentId } = useParent();

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const studentParam = selectedStudentId ? `?studentId=${selectedStudentId}` : '';
        const res = await fetch(`${apiUrl}/api/courses${studentParam}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const courses = await res.json();
          const currentCourse = courses.find((c: any) => c.id === id);
          if (currentCourse) {
            setCourse(currentCourse);
          } else {
            navigate('/student');
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCourseDetails();
  }, [id, navigate, selectedStudentId]);

  if (!course) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando aula...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Navbar Superior */}
      <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
            <button
              onClick={() => navigate('/student')}
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

        {/* Pestañas */}
        <div className="scrollable-tabs" style={{ padding: '0 1.5rem', height: '48px', alignItems: 'center', gap: '1.5rem' }}>
          <TabButton active={activeTab === 'stream'} onClick={() => setActiveTab('stream')} icon={<MessageSquare size={18}/>} label="Tablón" />
          <TabButton active={activeTab === 'classwork'} onClick={() => setActiveTab('classwork')} icon={<BookOpen size={18}/>} label="Material Asignado / Tareas" />
          <TabButton active={activeTab === 'grades'} onClick={() => setActiveTab('grades')} icon={<Award size={18}/>} label="Calificaciones" />
        </div>
      </nav>

      {/* Contenido Principal */}
      <main>
        {activeTab === 'stream' && <StudentStreamTab courseId={id!} />}
        {activeTab === 'classwork' && <StudentClassworkTab courseId={id!} />}
        {activeTab === 'grades' && <StudentGradesTab courseId={id!} />}
      </main>
    </div>
  );
};

// Componente auxiliar para las pestañas
const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '0 0.5rem',
      height: '100%',
      color: active ? 'var(--primary)' : 'var(--text-muted)',
      fontWeight: active ? 600 : 500,
      borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent',
      transition: 'all 0.2s',
      whiteSpace: 'nowrap'
    }}
  >
    {icon}
    {label}
  </button>
);

export default StudentCourseView;

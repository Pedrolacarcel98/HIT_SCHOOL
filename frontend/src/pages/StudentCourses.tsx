import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useParent } from '../context/ParentContext';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Course {
  id: string;
  title: string;
  teacherId: string;
  createdAt: string;
}

const StudentCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedStudent, selectedStudentId } = useParent();
  const userRole = localStorage.getItem('userRole');

  const activeStudentName = selectedStudent?.profile?.firstName || 'Alumno';

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    if (!token || (role !== 'STUDENT' && role !== 'PARENT')) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const studentParam = selectedStudentId ? `?studentId=${selectedStudentId}` : '';
        const res = await fetch(`${apiUrl}/api/courses${studentParam}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setCourses(await res.json());
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [selectedStudentId]);

  return (
    <div className="page-container animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookOpen style={{ color: 'var(--primary)' }} /> Mis Clases
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>
            {userRole === 'PARENT' ? `Clases matriculadas de ${activeStudentName}` : 'Aquí verás todas las clases en las que estás matriculado.'}
          </p>
        </div>
      </header>

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          Cargando tus clases...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
          {courses.map(course => (
            <div 
              key={course.id} 
              className="glass-panel" 
              style={{ cursor: 'pointer', transition: 'all 0.2s ease', padding: '1.5rem', border: '1px solid var(--border)' }}
              onClick={() => navigate(`/student/course/${course.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: 'var(--primary)', padding: '0.75rem', borderRadius: '12px', color: 'white' }}>
                  <BookOpen size={24} />
                </div>
                <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1.2rem' }}>{course.title}</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Haz clic para ver el material, tareas y calificaciones →</p>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', gridColumn: '1 / -1' }}>
              <BookOpen size={40} style={{ color: 'var(--primary)', opacity: 0.5, marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                {userRole === 'PARENT' ? `Aún no hay clases matriculadas para ${activeStudentName}.` : 'Aún no estás matriculado en ninguna clase.'}
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default StudentCourses;

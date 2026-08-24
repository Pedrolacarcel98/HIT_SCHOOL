import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';

const StudentPeopleTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/courses/${courseId}/students`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setStudents(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [courseId]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando compañeros...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.4rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', color: 'var(--primary)' }}>
          Compañeros de clase
        </h2>
        
        {students.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No hay compañeros en esta clase todavía.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {students.map(student => (
              <div key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {student.profile?.firstName?.charAt(0) || <User size={20} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)' }}>
                    {student.profile?.firstName} {student.profile?.lastName}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPeopleTab;

import React, { useState, useEffect } from 'react';
import { UserPlus, Mail, Users, X, CheckSquare, Square, AlertCircle } from 'lucide-react';

const PeopleTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [courseStudents, setCourseStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [modalLoading, setModalLoading] = useState(false);

  // Form states for creating new student
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCourseStudents();
  }, [courseId]);

  const fetchCourseStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses/${courseId}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setCourseStudents(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenModal = async () => {
    setIsModalOpen(true);
    setSelectedStudentIds(new Set());
    setModalLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAllStudents(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStudent = (id: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedStudentIds(newSet);
  };

  const handleEnrollSelected = async () => {
    if (selectedStudentIds.size === 0) return;
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentIds: Array.from(selectedStudentIds) }),
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        fetchCourseStudents(); // refresh the list
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/students`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // We pass monthlyFee and courseDurationMonths defaults to avoid errors
        body: JSON.stringify({ email, firstName, lastName, courseId, monthlyFee: 35, courseDurationMonths: 1 }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al añadir alumno');
        return;
      }

      setMessage(`Alumno creado (Notificado por n8n).`);
      setEmail('');
      setFirstName('');
      setLastName('');
      // No enrolls automatically unless backend is modified, so we just show message
    } catch (err) {
      setError('Error de conexión');
    }
  };

  // Filtrar los alumnos para no mostrar los que ya están en esta clase
  const availableStudents = allStudents.filter(student => !courseStudents.some(cs => cs.id === student.id));

  return (
    <div className="animate-fade-in">
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>
          <UserPlus size={20} /> Crear Nuevo Alumno (Desde cero)
        </h3>

        {message && (
          <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nombre</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }} />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Apellidos</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }} />
            </div>
            <div style={{ flex: 2, minWidth: '250px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Correo Electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }} />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}>
            Crear Alumno
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        <h3 style={{ color: 'var(--primary)', margin: 0 }}>
          Alumnos Matriculados en la Clase
        </h3>
        <button onClick={handleOpenModal} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
          <Users size={18} /> Invitar Alumnos Matriculados
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {courseStudents.map((student: any) => (
          <div key={student.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {student.profile?.firstName?.[0]}{student.profile?.lastName?.[0]}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: '500' }}>{student.profile?.firstName} {student.profile?.lastName}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{student.email}</p>
              </div>
            </div>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Mail size={18} />
            </button>
          </div>
        ))}
        {courseStudents.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No hay alumnos en esta clase aún.</p>}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} style={{ color: 'var(--primary)' }} /> Invitar Alumnos
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              {modalLoading ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando alumnos...</p>
              ) : availableStudents.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay más alumnos para invitar.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {availableStudents.map(student => {
                    const isSelected = selectedStudentIds.has(student.id);
                    const isEnrolledInOtherCourses = student.enrollments && student.enrollments.length > 0;
                    
                    return (
                      <div 
                        key={student.id} 
                        onClick={() => handleToggleStudent(student.id)}
                        style={{ 
                          padding: '1rem', 
                          border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)', 
                          borderRadius: '8px',
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '1rem',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--primary-light)' : 'var(--surface)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
                          {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: 600 }}>{student.profile?.firstName} {student.profile?.lastName}</p>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{student.email}</p>
                        </div>
                        {isEnrolledInOtherCourses && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#d97706', background: '#fef3c7', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                            <AlertCircle size={14} /> Ya en {student.enrollments.length} clase(s)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'var(--surface-alt)' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>
                Cancelar
              </button>
              <button 
                onClick={handleEnrollSelected} 
                disabled={selectedStudentIds.size === 0}
                className="btn-primary" 
                style={{ padding: '0.5rem 1.5rem', opacity: selectedStudentIds.size === 0 ? 0.5 : 1 }}
              >
                Añadir Seleccionados ({selectedStudentIds.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeopleTab;

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, UserMinus, Users, X, CheckSquare, Square, AlertCircle, GraduationCap, Info } from 'lucide-react';

const PeopleTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const userRole = localStorage.getItem('userRole');
  const [courseStudents, setCourseStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  
  // Teachers state
  const [courseDetails, setCourseDetails] = useState<any>(null);
  const [teachersData, setTeachersData] = useState<{ titular: any; assigned: any[] }>({ titular: null, assigned: [] });
  const [allTeachersList, setAllTeachersList] = useState<any[]>([]);
  const [isAssignTeacherOpen, setIsAssignTeacherOpen] = useState(false);
  const [selectedTeacherToAssign, setSelectedTeacherToAssign] = useState('');
  const [assigningTeacherLoading, setAssigningTeacherLoading] = useState(false);
  const [teacherActionMsg, setTeacherActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const canAssignTeacher = userRole === 'ADMIN'
    || courseDetails?.teacherId === localStorage.getItem('userId')
    || teachersData.assigned.some((teacher: any) => teacher.id === localStorage.getItem('userId'));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Form states for creating new student
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCourseStudents();
    fetchCourseTeachers();
  }, [courseId]);

  const fetchCourseTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const [resCourse, resTeachers] = await Promise.all([
        fetch(`${apiUrl}/api/courses/${courseId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/courses/${courseId}/teachers`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (resCourse.ok) setCourseDetails(await resCourse.json());
      if (resTeachers.ok) setTeachersData(await resTeachers.json());
    } catch (err) {
      console.error('Error fetching course teachers:', err);
    }
  };

  const handleOpenAssignTeacher = async () => {
    setIsAssignTeacherOpen(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/teachers`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const teachers = await res.json();
        setAllTeachersList(teachers.filter((t: any) => t.status === 'ACTIVE'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedTeacherToAssign) return;
    setAssigningTeacherLoading(true);
    setTeacherActionMsg(null);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses/${courseId}/teachers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ teacherId: selectedTeacherToAssign })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al asignar profesor');
      setTeacherActionMsg({ text: 'Profesor asignado a la clase con éxito', type: 'success' });
      setIsAssignTeacherOpen(false);
      setSelectedTeacherToAssign('');
      fetchCourseTeachers();
    } catch (err: any) {
      setTeacherActionMsg({ text: err.message || 'Error al asignar profesor', type: 'error' });
    } finally {
      setAssigningTeacherLoading(false);
    }
  };

  const handleUnassignTeacher = async (teacherId: string) => {
    setTeacherActionMsg(null);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses/${courseId}/teachers/${teacherId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al desasignar profesor');
      setTeacherActionMsg({ text: 'Profesor desasignado de la clase', type: 'success' });
      fetchCourseTeachers();
    } catch (err: any) {
      setTeacherActionMsg({ text: err.message || 'Error al desasignar profesor', type: 'error' });
    }
  };

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
    setStudentSearch('');
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

  const handleRemoveStudent = async (studentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses/${courseId}/students/${studentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setCourseStudents(students => students.filter(student => student.id !== studentId));
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
  const availableStudents = allStudents.filter(student => student.status === 'ACTIVE' && !courseStudents.some(cs => cs.id === student.id));
  const filteredAvailableStudents = availableStudents.filter(student => {
    const searchValue = `${student.profile?.firstName || ''} ${student.profile?.lastName || ''} ${student.email}`.toLowerCase();
    return searchValue.includes(studentSearch.trim().toLowerCase());
  });

  return (
    <div className="animate-fade-in">
      {/* SECCIÓN PROFESORES */}
      <div className="glass-panel people-section" style={{ marginBottom: '2rem' }}>
        <div className="people-section-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--primary)', minWidth: 0 }}>
            <GraduationCap size={22} style={{ flexShrink: 0 }} /> Profesores de la Clase
          </h3>
          {canAssignTeacher && !isAssignTeacherOpen && (
            <button
              onClick={handleOpenAssignTeacher}
              className="btn-primary people-invite-btn"
              title="Asignar Profesor"
              aria-label="Asignar Profesor"
            >
              <UserPlus size={16} />
              <span>Asignar</span>
              <span className="people-invite-label">&nbsp;Profesor</span>
            </button>
          )}
        </div>

        {courseDetails?.modality === 'PRESENCIAL' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: '#e0f2fe',
            border: '1px solid #bae6fd',
            color: '#0369a1',
            fontSize: '0.88rem',
            marginBottom: '1rem'
          }}>
            <Info size={18} style={{ flexShrink: 0 }} />
            <span>Esta es una clase <strong>Presencial</strong>: todos los profesores del centro pueden acceder y trabajar con las acciones de profesor asignado.</span>
          </div>
        )}

        {teacherActionMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: teacherActionMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: teacherActionMsg.type === 'success' ? '#166534' : '#ef4444',
            marginBottom: '1rem',
            fontSize: '0.88rem'
          }}>
            {teacherActionMsg.text}
          </div>
        )}

        {/* Formulario para asignar profesor a clase online */}
        {isAssignTeacherOpen && (
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            marginBottom: '1rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-main)' }}>
                Seleccionar profesor para conceder acceso a esta clase online:
              </label>
              <select
                value={selectedTeacherToAssign}
                onChange={(e) => setSelectedTeacherToAssign(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }}
              >
                <option value="">-- Elige un profesor --</option>
                {allTeachersList
                  .filter(t => t.id !== teachersData.titular?.id && !teachersData.assigned?.some(at => at.id === t.id))
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      {t.profile?.firstName} {t.profile?.lastName} ({t.email})
                    </option>
                  ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
              <button
                type="button"
                onClick={handleAssignTeacher}
                disabled={!selectedTeacherToAssign || assigningTeacherLoading}
                className="btn-primary"
                style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
              >
                {assigningTeacherLoading ? 'Asignando...' : 'Confirmar'}
              </button>
              <button
                type="button"
                onClick={() => { setIsAssignTeacherOpen(false); setSelectedTeacherToAssign(''); }}
                style={{ padding: '0.55rem 0.9rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista de profesores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {/* Titular */}
          {teachersData.titular && (
            <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', background: 'var(--surface-alt)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {teachersData.titular.profile?.firstName?.[0] || 'P'}{teachersData.titular.profile?.lastName?.[0] || 'T'}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)' }}>
                    {teachersData.titular.profile?.firstName} {teachersData.titular.profile?.lastName}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{teachersData.titular.email}</p>
                </div>
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: '12px',
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fde68a'
              }}>
                Profesor Titular
              </span>
            </div>
          )}

          {/* Asignados */}
          {teachersData.assigned?.map((teacher: any) => (
            <div key={teacher.id} style={{ padding: '0.85rem 1rem', borderRadius: '8px', background: 'var(--surface-alt)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {teacher.profile?.firstName?.[0] || 'P'}{teacher.profile?.lastName?.[0] || 'A'}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)' }}>
                    {teacher.profile?.firstName} {teacher.profile?.lastName}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{teacher.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: '12px',
                  background: '#e0e7ff',
                  color: '#4338ca',
                  border: '1px solid #c7d2fe'
                }}>
                  Profesor Asignado
                </span>
                {userRole === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => handleUnassignTeacher(teacher.id)}
                    title="Quitar acceso a este profesor"
                    style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', padding: '0.35rem' }}
                  >
                    <UserMinus size={17} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {!teachersData.titular && (!teachersData.assigned || teachersData.assigned.length === 0) && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.5rem 0' }}>No hay datos de profesores cargados.</p>
          )}
        </div>
      </div>

      {userRole === 'ADMIN' && (
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
      )}

      {/* SECCIÓN ALUMNOS */}
      <div className="glass-panel people-section">
        <div className="people-section-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--primary)', minWidth: 0 }}>
            <Users size={22} style={{ flexShrink: 0 }} /> Alumnos de la Clase
          </h3>
          <button onClick={handleOpenModal} className="btn-primary people-invite-btn" title="Invitar Alumnos" aria-label="Invitar Alumnos">
            <UserPlus size={16} />
            <span>Invitar</span>
            <span className="people-invite-label">&nbsp;Alumnos</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {courseStudents.map((student: any) => (
            <div key={student.id} className="people-student-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {student.profile?.firstName?.[0]}{student.profile?.lastName?.[0]}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.profile?.firstName} {student.profile?.lastName}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveStudent(student.id)}
                className="people-remove-btn"
                title="Desmatricular alumno"
                aria-label={`Desmatricular a ${student.profile?.firstName || student.email} de la clase`}
              >
                <UserMinus size={20} />
              </button>
            </div>
          ))}
          {courseStudents.length === 0 && <p style={{ color: 'var(--text-muted)', margin: 0 }}>No hay alumnos en esta clase aún.</p>}
        </div>
      </div>

      {isModalOpen && createPortal(
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel modal-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} style={{ color: 'var(--primary)' }} /> Invitar Alumnos
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="modal-close" aria-label="Cerrar modal"><X size={20} /></button>
            </div>
            
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              <input
                type="search"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Buscar por nombre o correo..."
                aria-label="Buscar alumnos para invitar"
                style={{ width: '100%', marginBottom: '0.9rem', padding: '0.7rem 0.8rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
              />
              {modalLoading ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando alumnos...</p>
              ) : filteredAvailableStudents.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{availableStudents.length === 0 ? 'No hay más alumnos para invitar.' : 'No se encontraron alumnos.'}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {filteredAvailableStudents.map(student => {
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
                          <div
                            title={student.enrollments.map((e: any) => e.course?.title).filter(Boolean).join(', ')}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#d97706', background: '#fef3c7', padding: '0.25rem 0.5rem', borderRadius: '4px', maxWidth: '240px' }}
                          >
                            <AlertCircle size={14} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Ya en {student.enrollments.length} clase(s)
                              {student.enrollments[0]?.course?.title ? ` (${student.enrollments.map((e: any) => e.course?.title).filter(Boolean).join(', ')})` : ''}
                            </span>
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
      , document.body
      )}
    </div>
  );
};

export default PeopleTab;

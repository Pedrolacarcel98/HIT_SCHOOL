import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, FileText, Search, X } from 'lucide-react';
import DocumentViewer from './DocumentViewer';
import FormPlayer from './FormPlayer';

interface AssignedMaterial {
  id: string;
  title: string;
  description: string;
  level: string;
  category: string;
  teacher: string;
  assignedAt: string;
  deadline?: string;
  rawDeadline?: string;
  status: 'PENDING' | 'COMPLETED';
  url: string;
  type?: string;
  formData?: any;
}

const StudentClassworkTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [assignedMaterials, setAssignedMaterials] = useState<AssignedMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AssignedMaterial['status']>('ALL');
  const [viewingMaterial, setViewingMaterial] = useState<AssignedMaterial | null>(null);

  const fetchAssignedMaterials = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/assignments/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const assignments = await res.json();
        // Filtrar solo los del curso actual
        const courseAssignments = assignments.filter((a: any) => a.courseId === courseId);
        
        setAssignedMaterials(courseAssignments.map((assignment: any) => {
          const hasSubmission = assignment.submissions && assignment.submissions.length > 0;
          return {
            id: assignment.id,
            title: assignment.title,
            description: assignment.description || (assignment.material ? assignment.material.title : ''),
            level: assignment.material ? (assignment.material.level || 'GENERAL') : 'GENERAL',
            category: assignment.category,
            teacher: assignment.teacher && assignment.teacher.profile ? `${assignment.teacher.profile.firstName} ${assignment.teacher.profile.lastName}`.trim() : 'Profesor',
            assignedAt: new Date(assignment.createdAt || new Date()).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
            deadline: assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : undefined,
            rawDeadline: assignment.dueDate,
            status: hasSubmission ? 'COMPLETED' : 'PENDING',
            url: assignment.material ? assignment.material.url : '',
            type: assignment.material ? assignment.material.type : 'DOCUMENT',
            formData: assignment.material ? assignment.material.formData : null
          };
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedMaterials();
  }, [courseId]);

  const filteredMaterials = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return assignedMaterials.filter((material) => {
      const matchesSearch = !query || `${material.title} ${material.description} ${material.category}`.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'ALL' || material.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, assignedMaterials]);

  const handleSubmitAssignment = async (assignmentId: string, grade?: number) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const payload: any = { content: 'Entregado por el alumno' };
      if (grade !== undefined) {
        payload.grade = grade;
        payload.content = `Nota obtenida: ${grade.toFixed(2)}/10`;
      }

      const res = await fetch(`${apiUrl}/api/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchAssignedMaterials(); // recargar
        setViewingMaterial(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormFinish = (score: number, total: number) => {
    const grade = total > 0 ? (score / total) * 10 : 0;
    handleSubmitAssignment(viewingMaterial!.id, grade);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar tarea o material..."
            style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', outline: 'none' }}
          />
        </div>
        <div className="scrollable-tabs" style={{ flexWrap: 'wrap' }}>
          {([['ALL', 'Todas'], ['PENDING', 'Pendientes'], ['COMPLETED', 'Completadas']] as const).map(([value, label]) => (
            <button key={value} onClick={() => setStatusFilter(value)} style={{ padding: '0.6rem 0.9rem', borderRadius: '18px', border: statusFilter === value ? '1px solid var(--primary)' : '1px solid var(--border)', background: statusFilter === value ? 'var(--primary-light)' : 'var(--surface)', color: statusFilter === value ? 'var(--primary-text)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>Cargando tareas de la clase...</div>
      ) : filteredMaterials.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <FileText size={46} style={{ color: 'var(--primary)', opacity: 0.45, marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No hay tareas para mostrar</h2>
          <p style={{ color: 'var(--text-muted)' }}>Prueba con otra búsqueda o cambia el filtro de estado.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
          {filteredMaterials.map((material) => (
            <article key={material.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '310px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#2b6cb0', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  <span style={{ padding: '0.45rem', borderRadius: '8px', background: '#eef6fc', display: 'flex' }}><FileText size={18} /></span>
                  {material.type === 'DOCUMENT' ? 'Documento' : material.type === 'VIDEO' ? 'Vídeo' : material.type === 'FORM' ? 'Examen Interactivo' : 'Tarea'}
                </div>
                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-text)', border: '1px solid var(--primary-border)', fontSize: '0.72rem', fontWeight: 700 }}>{material.level}</span>
              </div>
              <h2 style={{ fontSize: '1.1rem', lineHeight: 1.35, marginBottom: '0.55rem' }}>{material.title}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.45, marginBottom: '1.25rem', flex: 1 }}>{material.description}</p>
              <div style={{ display: 'grid', gap: '0.45rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {material.deadline && (() => {
                  let color = 'var(--text-muted)';
                  if (material.status === 'PENDING' && material.rawDeadline) {
                    const diff = new Date(material.rawDeadline).getTime() - new Date().getTime();
                    const hours = diff / (1000 * 60 * 60);
                    if (hours < 0) color = '#e53e3e';
                    else if (hours < 48) color = '#d69e2e';
                  }
                  return (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color, fontWeight: color !== 'var(--text-muted)' ? 'bold' : 'normal' }}>
                      <CalendarDays size={14} /> Entrega: {material.deadline}
                    </span>
                  );
                })()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1.25rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: material.status === 'COMPLETED' ? '#24583e' : '#8d5b12', background: material.status === 'COMPLETED' ? 'var(--primary-light)' : '#fef7e8', padding: '0.3rem 0.65rem', borderRadius: '14px', border: material.status === 'COMPLETED' ? '1px solid var(--primary-border)' : '1px solid #fae0b0', fontSize: '0.82rem', fontWeight: 700 }}>
                  {material.status === 'COMPLETED' ? <><CheckCircle2 size={16} /> Entregado</> : <><Clock3 size={16} /> Pendiente</>}
                </span>
                <button onClick={() => setViewingMaterial(material)} className="btn-primary" style={{ padding: '0.55rem 0.9rem', fontSize: '0.84rem' }}>
                  {material.status === 'COMPLETED' ? 'Ver Entregado' : 'Realizar Tarea'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {viewingMaterial && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'stretch', justifyContent: 'center', zIndex: 100, padding: '0.75rem 1rem 0', overflow: 'hidden' }}>
          <div className="animate-fade-in" style={{ width: '100%', maxWidth: viewingMaterial.type === 'FORM' ? '980px' : '920px', height: 'calc(100vh - 0.75rem)', background: 'var(--background)', borderRadius: '12px 12px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '0 auto' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
              <div>
                <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700 }}>{viewingMaterial.type === 'FORM' ? 'EXAMEN / TEST' : 'TAREA'}</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.1rem' }}>{viewingMaterial.title}</h2>
              </div>
              <button onClick={() => setViewingMaterial(null)} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '1.5rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {viewingMaterial.type === 'FORM' && viewingMaterial.formData ? (
                viewingMaterial.status === 'COMPLETED' ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <CheckCircle2 size={64} style={{ color: '#22c55e', margin: '0 auto 1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Examen ya completado</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Puedes ver tu nota en la pestaña de Calificaciones.</p>
                  </div>
                ) : (
                  <FormPlayer 
                    title={viewingMaterial.title} 
                    description={viewingMaterial.description} 
                    questions={viewingMaterial.formData.questions} 
                    onFinish={handleFormFinish} 
                  />
                )
              ) : (
                <>
                  {viewingMaterial.description && (
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface-alt)', borderRadius: '8px' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--text-main)' }}>Instrucciones</h3>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>{viewingMaterial.description}</p>
                    </div>
                  )}
                  {viewingMaterial.url && (
                    <DocumentViewer url={viewingMaterial.url} title={viewingMaterial.title} />
                  )}
                </>
              )}
            </div>
            
            {viewingMaterial.type !== 'FORM' && (
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', background: 'var(--surface)' }}>
                {viewingMaterial.status === 'PENDING' ? (
                  <button onClick={() => handleSubmitAssignment(viewingMaterial.id)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={18} /> Marcar como Completada
                  </button>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#24583e', fontWeight: 'bold' }}>
                    <CheckCircle2 size={18} /> Tarea Completada
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentClassworkTab;

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock3, FileText, Search, X } from 'lucide-react';
import DocumentViewer from '../components/DocumentViewer';

interface AssignedMaterial {
  id: string;
  title: string;
  description: string;
  level: string;
  category: string;
  teacher: string;
  assignedAt: string;
  deadline?: string;
  status: 'PENDING' | 'COMPLETED';
  url: string;
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [assignedMaterials, setAssignedMaterials] = useState<AssignedMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AssignedMaterial['status']>('ALL');
  const [viewingMaterial, setViewingMaterial] = useState<AssignedMaterial | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || localStorage.getItem('userRole') !== 'STUDENT') {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchAssignedMaterials = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/materials/assigned-to-me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const assignments = await res.json();
          setAssignedMaterials(assignments.map((assignment: any) => ({
            id: assignment.material.id,
            title: assignment.material.title,
            description: assignment.material.description || '',
            level: assignment.material.level,
            category: assignment.material.category,
            teacher: `${assignment.material.teacher.profile?.firstName || ''} ${assignment.material.teacher.profile?.lastName || ''}`.trim(),
            assignedAt: new Date(assignment.assignedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
            deadline: assignment.deadline ? new Date(assignment.deadline).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined,
            status: assignment.status,
            url: assignment.material.url || ''
          })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedMaterials();
  }, []);

  const filteredMaterials = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return assignedMaterials.filter((material) => {
      const matchesSearch = !query || `${material.title} ${material.description} ${material.category}`.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'ALL' || material.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const pendingCount = assignedMaterials.filter((material) => material.status === 'PENDING').length;

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText style={{ color: 'var(--primary)' }} /> Material asignado
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>
            Consulta los documentos que tus profesores han preparado para ti.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ padding: '0.7rem 1rem', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
            {pendingCount} pendientes
          </div>
          <div style={{ padding: '0.7rem 1rem', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>
            {assignedMaterials.length} documentos
          </div>
        </div>
      </header>

      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar material..."
            style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-main)', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {([
            ['ALL', 'Todos'],
            ['PENDING', 'Pendientes'],
            ['COMPLETED', 'Completados']
          ] as const).map(([value, label]) => (
            <button key={value} onClick={() => setStatusFilter(value)} style={{ padding: '0.6rem 0.9rem', borderRadius: '18px', border: statusFilter === value ? '1px solid var(--primary)' : '1px solid var(--border)', background: statusFilter === value ? 'rgba(34,197,94,0.12)' : 'var(--surface)', color: statusFilter === value ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>Cargando materiales asignados...</div>
      ) : filteredMaterials.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <FileText size={46} style={{ color: 'var(--primary)', opacity: 0.45, marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No hay materiales para mostrar</h2>
          <p style={{ color: 'var(--text-muted)' }}>Prueba con otra búsqueda o cambia el filtro de estado.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredMaterials.map((material) => (
            <article key={material.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '310px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#38bdf8', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  <span style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(56,189,248,0.1)', display: 'flex' }}><FileText size={18} /></span>
                  Documento
                </div>
                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '12px', background: 'rgba(34,197,94,0.1)', color: 'var(--primary)', fontSize: '0.72rem', fontWeight: 700 }}>{material.level}</span>
              </div>
              <h2 style={{ fontSize: '1.1rem', lineHeight: 1.35, marginBottom: '0.55rem' }}>{material.title}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.45, marginBottom: '1.25rem', flex: 1 }}>{material.description}</p>
              <div style={{ display: 'grid', gap: '0.45rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><FileText size={14} /> {material.category} · {material.teacher}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock3 size={14} /> Asignado el {material.assignedAt}</span>
                {material.deadline && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: material.status === 'PENDING' ? '#b45309' : 'var(--text-muted)' }}><CalendarDays size={14} /> Entrega: {material.deadline}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1.25rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: material.status === 'COMPLETED' ? '#15803d' : '#b45309', fontSize: '0.82rem', fontWeight: 700 }}>
                  {material.status === 'COMPLETED' ? <><CheckCircle2 size={16} /> Completado</> : <><Clock3 size={16} /> Pendiente</>}
                </span>
                <button onClick={() => setViewingMaterial(material)} className="btn-primary" style={{ padding: '0.55rem 0.9rem', fontSize: '0.84rem' }}>Abrir documento</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {viewingMaterial && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: '1.5rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700 }}>MATERIAL ASIGNADO</span><h2 style={{ margin: '0.2rem 0 0', fontSize: '1.1rem' }}>{viewingMaterial.title}</h2></div>
              <button onClick={() => setViewingMaterial(null)} aria-label="Cerrar documento" style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ overflowY: 'auto', padding: '1.25rem' }}><DocumentViewer url={viewingMaterial.url} title={viewingMaterial.title} /></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;

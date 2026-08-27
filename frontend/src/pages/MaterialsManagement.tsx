import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  Plus,
  Search,
  FileText,
  Image,
  Video,
  Headphones,
  HelpCircle,
  Play,
  Edit2,
  Trash2,
  X,
  Send
} from 'lucide-react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
import AudioPlayer from '../components/AudioPlayer';
import VideoPlayer from '../components/VideoPlayer';
import DocumentViewer from '../components/DocumentViewer';
import FormPlayer from '../components/FormPlayer';
import FormBuilderModal from '../components/FormBuilderModal';

interface Material {
  id: string;
  title: string;
  description?: string;
  type: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FORM';
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'GENERAL';
  category: 'GRAMMAR_VOCABULARY' | 'READING' | 'SPEAKING' | 'WRITING' | 'LISTENING' | 'MOCK_EXAM';
  url?: string;
  formData?: any;
  createdAt: string;
}

interface Student {
  id: string;
  email: string;
  profile?: { firstName: string; lastName: string };
}

const MaterialsManagement: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const [assigningMaterial, setAssigningMaterial] = useState<Material | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [currentAccessIds, setCurrentAccessIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [assignmentDeadline, setAssignmentDeadline] = useState('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  // Formulario nuevo recurso estándar
  const [resTitle, setResTitle] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resType, setResType] = useState<'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO'>('DOCUMENT');
  const [resLevel, setResLevel] = useState('B2');
  const [resCategory, setResCategory] = useState('GRAMMAR_VOCABULARY');
  const [resUrl, setResUrl] = useState('');

  useEffect(() => {
    fetchMaterials();
  }, [typeFilter, levelFilter, categoryFilter]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (levelFilter !== 'ALL') params.append('level', levelFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);

      const res = await fetch(`${apiUrl}/api/materials?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/students`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setStudents(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const res = await fetch(`${apiUrl}/api/materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: resTitle,
          description: resDesc,
          type: resType,
          level: resLevel,
          category: resCategory,
          url: resUrl
        })
      });

      if (res.ok) {
        setShowAddResourceModal(false);
        setResTitle('');
        setResDesc('');
        setResUrl('');
        fetchMaterials();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deletingMaterial) return;
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const res = await fetch(`${apiUrl}/api/materials/${deletingMaterial.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setDeletingMaterial(null);
        fetchMaterials();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAssignmentModal = async (material: Material) => {
    setAssigningMaterial(material);
    setSelectedStudentIds([]);
    setCurrentAccessIds([]);
    setStudentSearch('');
    setAssignmentDeadline('');
    const token = localStorage.getItem('token');
    const res = await fetch(`${apiUrl}/api/materials/${material.id}/assignments`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const access = await res.json() as { student: { id: string } }[];
      const ids = access.map(item => item.student.id);
      setCurrentAccessIds(ids);
      setSelectedStudentIds(ids);
    }
  };

  const handleAssignMaterial = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assigningMaterial || selectedStudentIds.length === 0) return;

    try {
      setAssignmentLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/materials/${assigningMaterial.id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ studentIds: selectedStudentIds, deadline: assignmentDeadline || null })
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error || 'No se pudo asignar el material');
        return;
      }
      setAssigningMaterial(null);
      window.alert('Material asignado correctamente');
    } catch (err) {
      window.alert('Error de conexión al asignar el material');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const revokeAccess = async (studentId: string) => {
    if (!assigningMaterial) return;
    const res = await fetch(`${apiUrl}/api/materials/${assigningMaterial.id}/assignments/${studentId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (res.ok) {
      setCurrentAccessIds(ids => ids.filter(id => id !== studentId));
      setSelectedStudentIds(ids => ids.filter(id => id !== studentId));
    }
  };

  const filteredMaterials = materials.filter(m => {
    const q = searchTerm.toLowerCase();
    return m.title.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
  });

  const getTypeIcon = (type: string, size = 20) => {
    switch (type) {
      case 'DOCUMENT': return <FileText size={size} style={{ color: '#38bdf8' }} />;
      case 'IMAGE': return <Image size={size} style={{ color: '#f472b6' }} />;
      case 'VIDEO': return <Video size={size} style={{ color: '#f87171' }} />;
      case 'AUDIO': return <Headphones size={size} style={{ color: '#fbbf24' }} />;
      case 'FORM': return <HelpCircle size={size} style={{ color: '#34d399' }} />;
      default: return <FileText size={size} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'DOCUMENT': return 'Documento';
      case 'IMAGE': return 'Imagen';
      case 'VIDEO': return 'Vídeo';
      case 'AUDIO': return 'Audio (Listening)';
      case 'FORM': return 'Examen Interactivo';
      default: return type;
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FolderArchive style={{ color: 'var(--primary)' }} /> Material de Clase
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>
            Biblioteca didáctica centralizada: recursos multimedia y exámenes interactivos con audios
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowAddResourceModal(true)}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <Plus size={18} /> Añadir Multimedia / Doc
          </button>

          <button
            onClick={() => { setEditingMaterial(null); setShowFormBuilder(true); }}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <HelpCircle size={18} /> Crear Examen / Formulario
          </button>
        </div>
      </div>

      {/* Tabs por Tipo de Material */}
      <div className="scrollable-tabs" style={{ marginBottom: '1.5rem' }}>
        {[
          { id: 'ALL', label: 'Todos los Recursos', icon: <FolderArchive size={16} /> },
          { id: 'DOCUMENT', label: 'Documentos', icon: <FileText size={16} /> },
          { id: 'IMAGE', label: 'Fotos e Infografías', icon: <Image size={16} /> },
          { id: 'VIDEO', label: 'Vídeos', icon: <Video size={16} /> },
          { id: 'AUDIO', label: 'Audios (Listenings)', icon: <Headphones size={16} /> },
          { id: 'FORM', label: 'Exámenes y Formularios', icon: <HelpCircle size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setTypeFilter(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.2rem',
              borderRadius: '20px',
              border: typeFilter === tab.id ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: typeFilter === tab.id ? 'var(--primary-light)' : 'var(--surface)',
              color: typeFilter === tab.id ? 'var(--primary-text)' : 'var(--text-muted)',
              fontWeight: typeFilter === tab.id ? '600' : '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '0.85rem'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Filtros de Nivel, Skill y Buscador */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por título o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.5rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--text)',
              outline: 'none',
              fontSize: '0.9rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nivel:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '0.85rem' }}
            >
              <option value="ALL">Todos los Niveles</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
              <option value="GENERAL">General</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Skill:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '0.85rem' }}
            >
              <option value="ALL">Todas las Skills</option>
              <option value="GRAMMAR_VOCABULARY">Grammar & Vocabulary</option>
              <option value="READING">Reading</option>
              <option value="LISTENING">Listening</option>
              <option value="WRITING">Writing</option>
              <option value="SPEAKING">Speaking</option>
              <option value="MOCK_EXAM">Mock Exams</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid de Materiales */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Cargando biblioteca de materiales...
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <FolderArchive size={48} style={{ color: 'var(--primary)', opacity: 0.4, marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>No se encontraron recursos</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            {searchTerm ? 'Prueba a cambiar tus términos de búsqueda o filtros.' : 'Comienza añadiendo un nuevo documento, vídeo, audio o examen interactivo.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
          {filteredMaterials.map(m => (
            <div
              key={m.id}
              className="glass-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem',
                border: '1px solid var(--border)',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {/* Badges Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'var(--surface)', display: 'flex' }}>
                    {getTypeIcon(m.type, 18)}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {getTypeLabel(m.type)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-text)', border: '1px solid var(--primary-border)' }}>
                    {m.level}
                  </span>
                </div>
              </div>

              {/* Title & Desc */}
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: 'var(--text)', fontWeight: '600' }}>
                {m.title}
              </h3>
              <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', flex: 1, lineHeight: '1.4' }}>
                {m.description || 'Sin descripción adicional.'}
              </p>

              {/* Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setViewingMaterial(m)}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    <Play size={15} /> {m.type === 'FORM' ? 'Abrir Examen' : 'Ver / Reproducir'}
                  </button>
                  <button
                    onClick={() => openAssignmentModal(m)}
                    title="Compartir con alumnos"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.8rem', border: '1px solid var(--primary-border)', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary-text)', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}
                  >
                    <Send size={15} /> Compartir / Asignar
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {m.type === 'FORM' && (
                    <button
                      onClick={() => { setEditingMaterial(m); setShowFormBuilder(true); }}
                      title="Editar Formulario"
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setDeletingMaterial(m)}
                    title="Eliminar recurso"
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Visor / Reproductor Multimedia */}
      {viewingMaterial && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 70,
          padding: '1.5rem'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%',
            maxWidth: viewingMaterial.type === 'FORM' ? '900px' : '850px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden'
          }}>
            {/* Player Header */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {getTypeIcon(viewingMaterial.type, 20)}
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>{viewingMaterial.title}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>
                    {viewingMaterial.level} • {viewingMaterial.category}
                  </span>
                </div>
              </div>
              <button onClick={() => setViewingMaterial(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* Player Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {viewingMaterial.type === 'AUDIO' && viewingMaterial.url && (
                <div style={{ padding: '2rem 0' }}>
                  <AudioPlayer src={viewingMaterial.url} title={viewingMaterial.title} />
                  {viewingMaterial.description && (
                    <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                      {viewingMaterial.description}
                    </p>
                  )}
                </div>
              )}

              {viewingMaterial.type === 'VIDEO' && viewingMaterial.url && (
                <div>
                  <VideoPlayer url={viewingMaterial.url} title={viewingMaterial.title} />
                  {viewingMaterial.description && (
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      {viewingMaterial.description}
                    </p>
                  )}
                </div>
              )}

              {viewingMaterial.type === 'DOCUMENT' && viewingMaterial.url && (
                <DocumentViewer url={viewingMaterial.url} title={viewingMaterial.title} />
              )}

              {viewingMaterial.type === 'IMAGE' && viewingMaterial.url && (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={viewingMaterial.url}
                    alt={viewingMaterial.title}
                    style={{ maxWidth: '100%', maxHeight: '550px', borderRadius: '8px', objectFit: 'contain' }}
                  />
                  {viewingMaterial.description && (
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {viewingMaterial.description}
                    </p>
                  )}
                </div>
              )}

              {viewingMaterial.type === 'FORM' && viewingMaterial.formData && (
                <FormPlayer
                  title={viewingMaterial.title}
                  description={viewingMaterial.description}
                  questions={viewingMaterial.formData.questions || []}
                  readOnly
                  initialAnswers={Object.fromEntries((viewingMaterial.formData.questions || []).map((question: { id: string; correctAnswer: string | number }) => [question.id, question.correctAnswer]))}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {assigningMaterial && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 75, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700 }}>COMPARTIR MATERIAL</span>
                <h3 style={{ margin: '0.3rem 0 0', color: 'var(--text)' }}>Asignar Material: {assigningMaterial.title}</h3>
              </div>
              <button onClick={() => setAssigningMaterial(null)} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleAssignMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ padding: '0.9rem', border: '1px solid var(--primary-border)', borderRadius: '8px', background: 'var(--primary-subtle)' }}>
                <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)' }}>Alumnos con acceso actual</strong>
                {currentAccessIds.length === 0 ? <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ningún alumno tiene acceso todavía.</span> : currentAccessIds.map(studentId => {
                  const student = students.find(candidate => candidate.id === studentId);
                  if (!student) return null;
                  return <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.35rem 0' }}><span style={{ color: 'var(--text)', fontSize: '0.88rem' }}>{student.profile?.firstName} {student.profile?.lastName} <small style={{ color: 'var(--text-muted)' }}>({student.email})</small></span><button type="button" onClick={() => revokeAccess(student.id)} style={{ border: 'none', background: 'transparent', color: '#9e2a2b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Revocar</button></div>;
                })}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Alumnos destinatarios</label>
                <input type="search" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Buscar alumno por nombre o email..." style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }} />
                <div style={{ marginTop: '0.6rem', maxHeight: '190px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  {students.filter((student) => `${student.profile?.firstName || ''} ${student.profile?.lastName || ''} ${student.email}`.toLowerCase().includes(studentSearch.toLowerCase())).map((student) => {
                    const selected = selectedStudentIds.includes(student.id);
                    return (
                      <label key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.7rem 0.8rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selected ? 'var(--primary-light)' : 'transparent' }}>
                        <input type="checkbox" checked={selected} onChange={() => selected && currentAccessIds.includes(student.id) ? revokeAccess(student.id) : setSelectedStudentIds((ids) => selected ? ids.filter((id) => id !== student.id) : [...ids, student.id])} />
                        <span style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{student.profile?.firstName} {student.profile?.lastName} <small style={{ color: 'var(--text-muted)' }}>({student.email})</small></span>
                      </label>
                    );
                  })}
                  {students.length === 0 && <p style={{ padding: '1rem', margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay alumnos matriculados.</p>}
                </div>
                <span style={{ display: 'block', marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{selectedStudentIds.length} alumno(s) seleccionado(s)</span>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Fecha de entrega (opcional)</label>
                <input type="date" value={assignmentDeadline} onChange={(event) => setAssignmentDeadline(event.target.value)} min={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setAssigningMaterial(null)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.7rem 1.1rem', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={assignmentLoading || selectedStudentIds.length === 0} className="btn-primary" style={{ padding: '0.7rem 1.1rem', opacity: assignmentLoading || selectedStudentIds.length === 0 ? 0.55 : 1 }}>{assignmentLoading ? 'Enviando...' : 'Enviar Material'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Añadir Recurso Multimedia / Documento */}
      {showAddResourceModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '1rem'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '540px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus style={{ color: 'var(--primary)' }} /> Añadir Recurso Multimedia
              </h3>
              <button onClick={() => setShowAddResourceModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateResource} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Título del Recurso</label>
                <input
                  type="text"
                  required
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  placeholder="Ej. B2 Listening Practice - The Climate Change"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tipo de Recurso</label>
                  <select
                    value={resType}
                    onChange={(e: any) => setResType(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                  >
                    <option value="DOCUMENT">📄 Documento (PDF / Guía)</option>
                    <option value="AUDIO">🎧 Pista de Audio (Listening)</option>
                    <option value="VIDEO">🎥 Vídeo (YouTube / Vimeo / MP4)</option>
                    <option value="IMAGE">🖼️ Imagen / Infografía</option>
                  </select>
                </div>

                <div style={{ width: '120px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nivel</label>
                  <select
                    value={resLevel}
                    onChange={(e) => setResLevel(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                  >
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Skill (Pilar Core)</label>
                <select
                  value={resCategory}
                  onChange={(e) => setResCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                >
                  <option value="LISTENING">Listening</option>
                  <option value="READING">Reading</option>
                  <option value="GRAMMAR_VOCABULARY">Grammar and Vocabulary</option>
                  <option value="WRITING">Writing</option>
                  <option value="SPEAKING">Speaking</option>
                  <option value="MOCK_EXAM">Mock Exams</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Enlace / URL del archivo o vídeo
                </label>
                <input
                  type="url"
                  required
                  value={resUrl}
                  onChange={(e) => setResUrl(e.target.value)}
                  placeholder="https://ejemplo.com/archivo.pdf o https://youtu.be/..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Puedes pegar enlaces de YouTube, Vimeo, audios MP3 en la nube o PDFs de Google Drive.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Descripción (Opcional)</label>
                <textarea
                  value={resDesc}
                  onChange={(e) => setResDesc(e.target.value)}
                  placeholder="Instrucciones o contexto del material..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', minHeight: '60px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddResourceModal(false)}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.75rem 1.25rem', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                  Guardar Recurso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Form Builder */}
      {showFormBuilder && (
        <FormBuilderModal
          initialData={editingMaterial}
          onClose={() => { setShowFormBuilder(false); setEditingMaterial(null); }}
          onSaveSuccess={() => { fetchMaterials(); }}
        />
      )}

      {/* Modal: Confirmar Borrado */}
      {deletingMaterial && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1rem'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <Trash2 size={36} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>¿Eliminar recurso?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
              Se eliminará <strong>{deletingMaterial.title}</strong> de la biblioteca.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button
                onClick={() => setDeletingMaterial(null)}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                style={{ background: '#ef4444', border: 'none', color: '#ffffff', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsManagement;

import React from 'react';
import { FileText, HelpCircle, Image, Video, Headphones, X } from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import VideoPlayer from './VideoPlayer';
import DocumentViewer from './DocumentViewer';
import FormPlayer from './FormPlayer';

export interface ViewerMaterial {
  id: string;
  title: string;
  description?: string | null;
  type: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FORM' | 'EXAM';
  level?: string | null;
  category?: string | null;
  url?: string | null;
  formData?: { questions?: any[] } | null;
}

interface MaterialViewerModalProps {
  material: ViewerMaterial | null;
  onClose: () => void;
}

const getTypeIcon = (type: ViewerMaterial['type']) => {
  switch (type) {
    case 'DOCUMENT': return <FileText size={20} style={{ color: '#38bdf8' }} />;
    case 'IMAGE': return <Image size={20} style={{ color: '#f472b6' }} />;
    case 'VIDEO': return <Video size={20} style={{ color: '#f87171' }} />;
    case 'AUDIO': return <Headphones size={20} style={{ color: '#fbbf24' }} />;
    default: return <HelpCircle size={20} style={{ color: '#34d399' }} />;
  }
};

const getImageDisplayUrl = (url?: string | null) => {
  if (!url) return '';
  const driveFileId = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1] || url.match(/[?&]id=([^&/?]+)/)?.[1] || url.match(/lh3\.googleusercontent\.com\/d\/([^=/?]+)/)?.[1];
  return driveFileId ? `https://lh3.googleusercontent.com/d/${driveFileId}=w1600` : url;
};

const MaterialViewerModal: React.FC<MaterialViewerModalProps> = ({ material, onClose }) => {
  if (!material) return null;
  const isForm = material.type === 'FORM' || material.type === 'EXAM';

  return <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem' }} onClick={onClose}>
    <div className="glass-panel modal-card modal-card--wide" style={{ width: '100%', maxWidth: isForm ? '900px' : '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }} onClick={(event) => event.stopPropagation()}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>{getTypeIcon(material.type)}<div><h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>{material.title}</h3><span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{material.level || 'GENERAL'}{material.category ? ` • ${material.category}` : ''}</span></div></div><button type="button" onClick={onClose} aria-label="Cerrar visor" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={22} /></button></div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {material.type === 'AUDIO' && material.url && <><AudioPlayer src={material.url} title={material.title} />{material.description && <p style={{ color: 'var(--text-muted)' }}>{material.description}</p>}</>}
        {material.type === 'VIDEO' && material.url && <><VideoPlayer url={material.url} title={material.title} />{material.description && <p style={{ color: 'var(--text-muted)' }}>{material.description}</p>}</>}
        {material.type === 'DOCUMENT' && material.url && <DocumentViewer url={material.url} title={material.title} />}
        {material.type === 'IMAGE' && material.url && <img src={getImageDisplayUrl(material.url)} alt={material.title} referrerPolicy="no-referrer" style={{ maxWidth: '100%', maxHeight: 550, display: 'block', margin: 'auto', objectFit: 'contain' }} />}
        {isForm && material.formData && <FormPlayer title={material.title} description={material.description || undefined} questions={material.formData.questions || []} readOnly initialAnswers={Object.fromEntries((material.formData.questions || []).map((question: { id: string; correctAnswer: string | number }) => [question.id, question.correctAnswer]))} />}
        {!material.url && !material.formData && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Este recurso no tiene contenido disponible.</p>}
      </div>
    </div>
  </div>;
};

export default MaterialViewerModal;

import React from 'react';
import { ExternalLink, FileText } from 'lucide-react';

interface DocumentViewerProps {
  url: string;
  title?: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ url, title }) => {
  // If it's a PDF link or external document
  const isGoogleDrive = url.includes('drive.google.com') || url.includes('docs.google.com');
  const embedUrl = isGoogleDrive ? url.replace('/view', '/preview') : url;

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: 'min(600px, 70vh)',
      boxShadow: 'var(--shadow-lg)'
    }}>
      {/* Header bar */}
      <div style={{
        padding: '0.75rem 1.25rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: '600', color: 'var(--text)', fontSize: '0.95rem' }}>
            {title || 'Documento de Estudio'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              color: 'var(--primary)',
              textDecoration: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--background)'
            }}
          >
            <ExternalLink size={14} /> Abrir en pestaña nueva
          </a>
        </div>
      </div>

      {/* Frame / Embed */}
      <div style={{ flex: 1, position: 'relative', background: '#2d3748' }}>
        <iframe
          src={embedUrl}
          title={title || 'Visor de Documento'}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  );
};

export default DocumentViewer;

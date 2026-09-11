import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ExternalLink, FileText, Image as ImageIcon, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';

export interface AttachmentData {
  name: string;
  mimeType?: string;
  dataUrl: string;
  size?: number;
}

export const isAttachmentImage = (attachment?: AttachmentData | null): boolean => {
  if (!attachment) return false;
  const mime = (attachment.mimeType || '').toLowerCase();
  const name = (attachment.name || '').toLowerCase();
  const dataUrl = (attachment.dataUrl || '').toLowerCase();
  return (
    mime.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(name) ||
    dataUrl.startsWith('data:image/')
  );
};

export const isAttachmentPdf = (attachment?: AttachmentData | null): boolean => {
  if (!attachment) return false;
  const mime = (attachment.mimeType || '').toLowerCase();
  const name = (attachment.name || '').toLowerCase();
  const dataUrl = (attachment.dataUrl || '').toLowerCase();
  return (
    mime === 'application/pdf' ||
    /\.pdf$/i.test(name) ||
    dataUrl.startsWith('data:application/pdf')
  );
};

export const dataUrlToBlobUrl = (dataUrl: string): string => {
  if (!dataUrl) return '';
  if (dataUrl.startsWith('blob:') || dataUrl.startsWith('http')) return dataUrl;
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return dataUrl;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Error creating Blob URL:', err);
    return dataUrl;
  }
};

interface AttachmentViewerModalProps {
  attachment: AttachmentData | null;
  onClose: () => void;
}

export const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({ attachment, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const isImage = isAttachmentImage(attachment);
  const isPdf = isAttachmentPdf(attachment);

  const blobUrl = useMemo(() => {
    if (!attachment?.dataUrl) return null;
    return dataUrlToBlobUrl(attachment.dataUrl);
  }, [attachment?.dataUrl]);

  useEffect(() => {
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [attachment]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!attachment) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isPdf ? '1100px' : '900px',
          height: '90vh',
          maxHeight: '92vh',
          background: 'var(--surface)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior de herramientas */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-alt)',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            {isImage ? (
              <ImageIcon size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            ) : (
              <FileText size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={attachment.name}
              >
                {attachment.name}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {isImage ? 'Imagen / Fotografía' : isPdf ? 'Documento PDF' : 'Archivo adjunto'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isImage && (
              <>
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                  title="Rotar 90°"
                >
                  <RotateCw size={14} /> Rotar
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.25))}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                  title="Alejar"
                >
                  <ZoomOut size={14} />
                </button>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', minWidth: '40px', textAlign: 'center' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.min(3, prev + 0.25))}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                  title="Acercar"
                >
                  <ZoomIn size={14} />
                </button>
              </>
            )}

            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem', fontSize: '0.8rem', textDecoration: 'none' }}
                title="Abrir en pestaña nueva"
              >
                <ExternalLink size={14} /> En pestaña
              </a>
            )}

            <a
              href={attachment.dataUrl}
              download={attachment.name}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}
              title="Descargar archivo"
            >
              <Download size={14} /> Descargar
            </a>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.35rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '0.25rem'
              }}
              title="Cerrar (Esc)"
              aria-label="Cerrar visor"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenedor principal de visualización */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: isImage ? '#1e293b' : 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            padding: isImage ? '1rem' : 0
          }}
        >
          {isPdf ? (
            blobUrl ? (
              <iframe
                src={blobUrl}
                title={attachment.name}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block'
                }}
              />
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No se pudo cargar la vista previa del PDF.
              </div>
            )
          ) : isImage ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto'
              }}
            >
              <img
                src={attachment.dataUrl}
                alt={attachment.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transition: 'transform 0.2s ease',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  borderRadius: '4px'
                }}
              />
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={56} style={{ color: 'var(--primary)', margin: '0 auto 1rem', opacity: 0.8 }} />
              <h4 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Vista previa en línea no disponible para este tipo de archivo
              </h4>
              <p style={{ fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                Este formato no puede previsualizarse de forma nativa en el navegador, pero puedes descargarlo en tu equipo.
              </p>
              <a
                href={attachment.dataUrl}
                download={attachment.name}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', margin: '0 auto' }}
              >
                <Download size={15} /> Descargar {attachment.name}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AttachmentViewerModal;

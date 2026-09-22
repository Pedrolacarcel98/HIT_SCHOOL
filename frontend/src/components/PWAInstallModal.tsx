import React from 'react';
import { X, Share, PlusSquare, Check, CheckCircle2, MoreHorizontal } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'ios' | 'already-installed';
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  type = 'ios',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        padding: '1rem',
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '400px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          overflow: 'hidden',
          animation: 'modal-zoom-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          type="button"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            transition: 'all 0.15s ease',
          }}
          aria-label="Cerrar modal"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
            e.currentTarget.style.color = '#1e293b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <X size={18} />
        </button>

        {/* Encabezado con Icono Oficial */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
          <img
            src="/logo-hitschool-192.png"
            alt="HitSchool"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)',
              objectFit: 'cover',
            }}
          />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
              {type === 'already-installed' ? 'HitSchool ya instalada' : 'Instalar HitSchool en tu iPhone'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
              {type === 'already-installed' ? 'Acceso directo activo' : 'Acceso rápido y directo'}
            </p>
          </div>
        </div>

        {type === 'already-installed' ? (
          /* Mensaje si la aplicación ya está instalada */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
                padding: '0.85rem 1rem',
                borderRadius: '14px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={18} />
              </div>
              <div style={{ fontSize: '0.86rem', color: '#065f46', lineHeight: 1.45 }}>
                <strong>La app Hit School ya se encuentra en el equipo.</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#047857' }}>
                  Actualmente estás navegando desde el acceso directo instalado.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Pasos de instalación para iOS */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Paso 1 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.75rem 1rem',
                borderRadius: '14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontWeight: 800,
                  fontSize: '0.85rem',
                }}
              >
                1
              </div>
              <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}>
                Pulsa en el botón de los tres puntos <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#0284c7', background: '#e0f2fe', padding: '0.15rem 0.45rem', borderRadius: '6px', fontWeight: 700 }}>"•••" <MoreHorizontal size={13} strokeWidth={2.5} /></span> situado en la esquina inferior derecha.
              </div>
            </div>

            {/* Paso 2 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.75rem 1rem',
                borderRadius: '14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#f0fdf4',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontWeight: 800,
                  fontSize: '0.85rem',
                }}
              >
                2
              </div>
              <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}>
                Selecciona la opción <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#16a34a', background: '#f0fdf4', padding: '0.15rem 0.45rem', borderRadius: '6px', fontWeight: 700 }}>"Compartir" <Share size={13} strokeWidth={2.5} /></span> en el menú emergente.
              </div>
            </div>

            {/* Paso 3 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.75rem 1rem',
                borderRadius: '14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontWeight: 800,
                  fontSize: '0.85rem',
                }}
              >
                3
              </div>
              <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}>
                Toca en <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#059669', background: '#ecfdf5', padding: '0.15rem 0.45rem', borderRadius: '6px', fontWeight: 700 }}>"Añadir a la pantalla de inicio" <PlusSquare size={13} strokeWidth={2.5} /></span>.
              </div>
            </div>
          </div>
        )}

        {/* Botón de Aceptar */}
        <div style={{ marginTop: '1.25rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem',
              borderRadius: '12px',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              width: '100%',
              transition: 'background-color 0.15s ease',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#047857';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
            }}
          >
            <Check size={16} /> Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallModal;

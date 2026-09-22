import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import PWAInstallModal from './PWAInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  style = {},
}) => {
  const { isStandalone, isIOS, installApp } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'ios' | 'already-installed'>('ios');

  const handleClick = async () => {
    // 1. Si la app ya está abierta desde el acceso directo instalado (standalone)
    if (isStandalone) {
      setModalType('already-installed');
      setIsModalOpen(true);
      return;
    }

    // 2. En iPhone / iPad (iOS Safari): abrir modal con los pasos de instalación
    if (isIOS) {
      setModalType('ios');
      setIsModalOpen(true);
      return;
    }

    // 3. En Android / Chrome / Edge: ejecutar deferredPrompt.prompt() INMEDIATAMENTE
    const result = await installApp();
    if (result === 'already-installed') {
      setModalType('already-installed');
      setIsModalOpen(true);
    } else if (result === 'ios') {
      setModalType('ios');
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`fixed bottom-6 right-6 z-40 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-full shadow-lg border border-emerald-500/30 flex items-center gap-2 transition-all active:scale-95 ${className}`}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 40,
          backgroundColor: '#059669',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.75rem',
          padding: '0.625rem 1rem',
          borderRadius: '9999px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          transition: 'all 0.15s ease-in-out',
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#047857';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#059669';
        }}
        title="Descargar e instalar aplicación HitSchool"
        aria-label="Descargar e instalar aplicación HitSchool"
      >
        <Download size={15} strokeWidth={2.5} />
        <span>Descargar App</span>
      </button>

      {/* Modal explicativo para iOS o confirmación de app ya instalada */}
      <PWAInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={modalType}
      />
    </>
  );
};

export default PWAInstallButton;

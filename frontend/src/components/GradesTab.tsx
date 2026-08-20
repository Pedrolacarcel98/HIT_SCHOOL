import React from 'react';
import { Clock } from 'lucide-react';

const GradesTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  return (
    <div className="animate-fade-in glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <Clock size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.5 }} />
      <h2 style={{ color: 'var(--text)', marginBottom: '1rem' }}>Módulo de Calificaciones en Desarrollo</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>
        Esta vista mostrará una cuadrícula completa donde podrás poner notas a tus alumnos rápidamente. ¡Próximamente!
      </p>
    </div>
  );
};

export default GradesTab;

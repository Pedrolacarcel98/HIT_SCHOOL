import React from 'react';

type ModalityValue = 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO' | string | null | undefined;

const getModalityLabel = (modality: ModalityValue) => {
  if (modality === 'ONLINE') return 'Online';
  if (modality === 'HIBRIDO') return 'Híbrido';
  return 'Presencial';
};

// Híbrido comparte el tono sky de Online: ambas implican sesiones a distancia.
const getModalityVariant = (modality: ModalityValue) =>
  modality === 'ONLINE' || modality === 'HIBRIDO' ? 'is-online' : 'is-presencial';

interface ModalityBadgeProps {
  modality: ModalityValue;
  className?: string;
}

const ModalityBadge: React.FC<ModalityBadgeProps> = ({ modality, className = '' }) => (
  <span className={`modality-badge ${getModalityVariant(modality)} ${className}`.trim()}>
    {getModalityLabel(modality)}
  </span>
);

export default ModalityBadge;

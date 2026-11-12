/**
 * Utilidades para manejo de fechas y conversión bidireccional entre UTC (ISO 8601)
 * y el formato local de los inputs HTML <input type="datetime-local"> (YYYY-MM-DDTHH:mm).
 */

/**
 * Convierte una fecha ISO (o Date) proveniente del backend/BD al formato requerido
 * por <input type="datetime-local"> en la ZONA HORARIA LOCAL del usuario.
 */
export const toLocalDatetimeInput = (dateValue?: string | Date | null): string => {
  if (!dateValue) return '';
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Convierte el valor local de un <input type="datetime-local"> a un string ISO 8601 (con Z / UTC)
 * para enviar al backend, evitando desajustes de zona horaria entre cliente y servidor.
 */
export const toIsoDateString = (localValue?: string | null): string | undefined => {
  if (!localValue || !localValue.trim()) return undefined;
  const date = new Date(localValue);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

/**
 * Devuelve la fecha/hora local actual en formato YYYY-MM-DDTHH:mm para usar en el atributo `min`.
 */
export const getCurrentLocalDatetimeInput = (): string => {
  return toLocalDatetimeInput(new Date());
};

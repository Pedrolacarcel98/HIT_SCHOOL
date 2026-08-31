import jsPDF from 'jspdf';

export interface InvoiceData {
  invoiceNumber?: string;
  issueDate?: string;
  studentName: string;
  studentDni?: string | null;
  studentEmail?: string | null;
  month: number;
  year: number;
  monthLabel: string; // ej: "Julio 2026"
  amount: number; // ej: 35
  paidAt?: string | Date | null;
}

export const generateInvoicePDF = (data: InvoiceData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // 1. Número de Factura Dinámico: FACT-${año}-${mes.padStart(2, '0')}${alumno.nombre.substring(0,4).toUpperCase()}
  const monthPadded = String(data.month).padStart(2, '0');
  const sanitizedName = (data.studentName || 'ALUMNO')
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 4)
    .toUpperCase() || 'ALUM';

  const invoiceNumber = data.invoiceNumber || `FACT-${data.year}-${monthPadded}${sanitizedName}`;

  // 2. Fecha de emisión actual de generación
  const issueDateStr = data.issueDate || new Date().toLocaleDateString('es-ES');

  // Colores corporativos
  const greenCorporate = [35, 108, 57]; // #236c39
  const darkText = [33, 37, 41];
  const mutedText = [108, 117, 125];

  // 3. Fondo / Franja Superior suave en gris/verde menta claro
  doc.setFillColor(240, 246, 243);
  doc.rect(0, 0, 210, 42, 'F');

  // Marca "HIT SCHOOL" en verde corporativo negrita a la izquierda con datos de la academia
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('HIT SCHOOL', 15, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('C. Concepción Soto 36, Las Pajanosas', 15, 25);
  doc.text('NIF: B-93821045', 15, 30);
  doc.text('Email: info@hitschool.es', 15, 35);

  // A la derecha: "FACTURA", Nº de factura y Fecha de emisión
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FACTURA', 195, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(`Nº Factura: ${invoiceNumber}`, 195, 25, { align: 'right' });
  doc.text(`Fecha de emisión: ${issueDateStr}`, 195, 30, { align: 'right' });

  // Línea divisoria suave
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(15, 46, 195, 46);

  // 4. Tarjeta de Datos del Cliente (Recuadro con bordes redondeados)
  doc.setFillColor(250, 252, 250);
  doc.setDrawColor(220, 230, 222);
  doc.roundedRect(15, 52, 180, 28, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.text('DATOS DEL CLIENTE / ALUMNO', 20, 60);

  // Datos estructurados en 2 columnas: Nombre y DNI a la izquierda; Email a la derecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text('Nombre:', 20, 67);
  doc.setFont('helvetica', 'normal');
  doc.text(data.studentName || 'Alumno', 42, 67);

  doc.setFont('helvetica', 'bold');
  doc.text('DNI / NIE:', 20, 73);
  doc.setFont('helvetica', 'normal');
  doc.text(data.studentDni || 'No registrado', 42, 73);

  if (data.studentEmail) {
    doc.setFont('helvetica', 'bold');
    doc.text('Email:', 115, 67);
    doc.setFont('helvetica', 'normal');
    doc.text(data.studentEmail, 130, 67);
  }

  // 5. Tabla de Contenido
  const tableTop = 90;

  // Cabecera con fondo verde sólido (#236c39), texto blanco
  doc.setFillColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.rect(15, tableTop, 180, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CONCEPTO / DESCRIPCIÓN', 20, tableTop + 6.5);
  doc.text('IMPORTE', 190, tableTop + 6.5, { align: 'right' });

  // Fila única con el concepto del mes e importe
  doc.setFillColor(255, 255, 255);
  doc.rect(15, tableTop + 10, 180, 16, 'F');
  doc.setDrawColor(230, 230, 230);
  doc.line(15, tableTop + 26, 195, tableTop + 26);

  const conceptText = `Cuota Mensual - ${data.monthLabel}`;
  const numAmount = typeof data.amount === 'number' && !isNaN(data.amount) ? data.amount : 35;
  const formattedAmount = `${numAmount},00 EUR`;

  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(conceptText, 20, tableTop + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(formattedAmount, 190, tableTop + 20, { align: 'right' });

  // 6. Bloque de Resumen (Derecha)
  const totalTop = tableTop + 35;
  doc.setFillColor(245, 248, 245);
  doc.roundedRect(115, totalTop, 80, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text('Base Imponible:', 120, totalTop + 8);
  doc.text(formattedAmount, 190, totalTop + 8, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('TOTAL FACTURA:', 120, totalTop + 16);
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.text(formattedAmount, 190, totalTop + 16, { align: 'right' });

  // 7. Pie de Página y Texto legal de exención de IVA
  const noteTop = totalTop + 32;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Operación exenta de IVA según el Art. 20.Uno.9º de la Ley 37/1992 de Impuesto sobre el Valor Añadido.', 15, noteTop);

  doc.setDrawColor(220, 220, 220);
  doc.line(15, 275, 195, 275);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('HitSchool — Plataforma Educativa. C. Concepción Soto 36, Las Pajanosas.', 105, 281, { align: 'center' });

  // Guardar archivo PDF
  doc.save(`${invoiceNumber}.pdf`);
};

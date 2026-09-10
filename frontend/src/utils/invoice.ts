import jsPDF from 'jspdf';

const ACADEMY_NAME = 'Hit School Academia de idiomas';
const ACADEMY_OWNER = 'Laura Gómez Ruiz';
const ACADEMY_DNI = '30236969L';
const ACADEMY_ADDRESS = 'Calle Concepcion Soto 36 Bajo, 41219 Las Pajanosas';

export interface InvoiceData {
  invoiceNumber?: string;
  issueDate?: string;
  studentName: string;
  studentDni?: string | null;
  studentEmail?: string | null;
  studentAddress?: string | null;
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
  doc.text(ACADEMY_NAME, 15, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Titular: ${ACADEMY_OWNER}`, 15, 23);
  doc.text(`DNI: ${ACADEMY_DNI}`, 15, 29);
  doc.text(ACADEMY_ADDRESS, 15, 35);

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

  if (data.studentAddress) {
    doc.setFont('helvetica', 'bold');
    doc.text('Dirección:', 20, 79);
    doc.setFont('helvetica', 'normal');
    doc.text(data.studentAddress, 42, 79);
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
  doc.text(`${ACADEMY_NAME}. ${ACADEMY_ADDRESS}.`, 105, 281, { align: 'center' });

  // Guardar archivo PDF
  doc.save(`${invoiceNumber}.pdf`);
};

import autoTable from 'jspdf-autotable';

export interface StatementData {
  studentName: string;
  studentDni?: string | null;
  studentEmail?: string | null;
  studentAddress?: string | null;
  year?: number | string | null;
  payments: {
    monthLabel: string;
    amount: number;
    isPaid: boolean;
    paidAt?: string | Date | null;
    year?: number;
  }[];
}

export const generateStatementPDF = (data: StatementData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const greenCorporate = [35, 108, 57]; // #236c39
  const darkText = [33, 37, 41];
  const mutedText = [108, 117, 125];

  // 1. Fondo / Franja Superior suave en gris/verde menta claro
  doc.setFillColor(240, 246, 243);
  doc.rect(0, 0, 210, 42, 'F');

  // Marca "HIT SCHOOL" en verde corporativo negrita a la izquierda con datos de la academia
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(ACADEMY_NAME, 15, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Titular: ${ACADEMY_OWNER}`, 15, 23);
  doc.text(`DNI: ${ACADEMY_DNI}`, 15, 29);
  doc.text(ACADEMY_ADDRESS, 15, 35);

  // A la derecha: "EXTRACTO DE PAGOS", Ejercicio y Fecha de emisión
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('EXTRACTO DE PAGOS', 195, 16, { align: 'right' });

  const yearLabel = data.year && data.year !== 'ALL'
    ? `Ejercicio: ${data.year}`
    : 'Ejercicio: Histórico Completo';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(yearLabel, 195, 23, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  const issueDateStr = new Date().toLocaleDateString('es-ES');
  doc.text(`Fecha de emisión: ${issueDateStr}`, 195, 29, { align: 'right' });

  // Línea divisoria suave
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(15, 46, 195, 46);

  // 2. Tarjeta de Datos del Cliente / Alumno (Recuadro con bordes redondeados)
  doc.setFillColor(250, 252, 250);
  doc.setDrawColor(220, 230, 222);
  doc.roundedRect(15, 50, 180, 28, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.text('DATOS DEL ALUMNO / TITULAR', 20, 58);

  // Datos estructurados en 2 columnas: Nombre y DNI a la izquierda; Email a la derecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text('Nombre:', 20, 65);
  doc.setFont('helvetica', 'normal');
  doc.text(data.studentName || 'Alumno', 42, 65);

  doc.setFont('helvetica', 'bold');
  doc.text('DNI / NIE:', 20, 71);
  doc.setFont('helvetica', 'normal');
  doc.text(data.studentDni || 'No registrado', 42, 71);

  if (data.studentEmail) {
    doc.setFont('helvetica', 'bold');
    doc.text('Email:', 115, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(data.studentEmail, 130, 65);
  }

  if (data.studentAddress) {
    doc.setFont('helvetica', 'bold');
    doc.text('Dirección:', 20, 77);
    doc.setFont('helvetica', 'normal');
    doc.text(data.studentAddress, 42, 77);
  }

  // 3. El extracto contiene exclusivamente mensualidades abonadas.
  const paidPayments = data.payments.filter((payment) => payment.isPaid);
  const totalPaid = paidPayments.reduce((acc, payment) => acc + (Number(payment.amount) || 0), 0);

  // 4. Tabla de Mensualidades abonadas
  const tableData = paidPayments.map(p => {
    return [
      p.monthLabel,
      `${Number(p.amount).toFixed(2)} €`,
      p.paidAt ? new Date(p.paidAt).toLocaleDateString('es-ES') : '-'
    ];
  });

  autoTable(doc, {
    startY: 84,
    head: [['Periodo / Mensualidad', 'Importe', 'Fecha de Pago']],
    body: tableData,
    foot: [
      [
        'TOTAL',
        `${totalPaid.toFixed(2)} €`,
        ''
      ]
    ],
    headStyles: {
      fillColor: [35, 108, 57],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    footStyles: {
      fillColor: [240, 246, 243],
      textColor: [33, 37, 41],
      fontStyle: 'bold',
      fontSize: 9
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3
    }
  });

  // 5. Pie de Página para todas las páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(15, 280, 195, 280);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(`${ACADEMY_NAME}. ${ACADEMY_ADDRESS}.`, 15, 285);
    doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: 'right' });
  }

  const sanitizedName = (data.studentName || 'ALUMNO').replace(/\s+/g, '_');
  const yearSuffix = data.year && data.year !== 'ALL' ? `_${data.year}` : '_Historico';
  doc.save(`Extracto_${sanitizedName}${yearSuffix}.pdf`);
};

export interface FamilyPaymentLine {
  studentName: string;
  studentDni?: string | null;
  studentEmail?: string | null;
  month: number;
  year: number;
  monthLabel: string;
  amount: number;
  paidAt?: string | Date | null;
}

export interface FamilyDocumentData {
  parentName: string;
  parentDni?: string | null;
  parentEmail?: string | null;
  payments: FamilyPaymentLine[];
  month?: number;
  year?: number;
  monthLabel?: string;
}

const drawHitSchoolHeader = (doc: jsPDF, title: string, subtitle: string) => {
  const greenCorporate = [35, 108, 57];
  const mutedText = [108, 117, 125];

  doc.setFillColor(240, 246, 243);
  doc.rect(0, 0, 210, 42, 'F');
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(ACADEMY_NAME, 15, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Titular: ${ACADEMY_OWNER}`, 15, 23);
  doc.text(`DNI: ${ACADEMY_DNI}`, 15, 29);
  doc.text(ACADEMY_ADDRESS, 15, 35);
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, 195, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(subtitle, 195, 27, { align: 'right' });
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}`, 195, 33, { align: 'right' });
  doc.setDrawColor(220, 220, 220);
  doc.line(15, 46, 195, 46);
};

const drawFamilyHolder = (doc: jsPDF, data: Pick<FamilyDocumentData, 'parentName' | 'parentDni' | 'parentEmail'>) => {
  doc.setFillColor(250, 252, 250);
  doc.setDrawColor(220, 230, 222);
  doc.roundedRect(15, 52, 180, 28, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(35, 108, 57);
  doc.text('TITULAR / RECEPTOR FAMILIAR', 20, 60);
  doc.setFontSize(9);
  doc.setTextColor(33, 37, 41);
  doc.text('Nombre:', 20, 67);
  doc.setFont('helvetica', 'normal');
  doc.text(data.parentName || 'Tutor / Padre', 42, 67);
  doc.setFont('helvetica', 'bold');
  doc.text('DNI / NIE:', 20, 73);
  doc.setFont('helvetica', 'normal');
  doc.text(data.parentDni || 'No registrado', 42, 73);
  if (data.parentEmail) {
    doc.setFont('helvetica', 'bold');
    doc.text('Email:', 115, 67);
    doc.setFont('helvetica', 'normal');
    doc.text(data.parentEmail, 130, 67);
  }
};

export const generateFamilyStatementPDF = (data: FamilyDocumentData) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const paidPayments = data.payments.filter((payment) => Number(payment.amount) > 0);
  const totalPaid = paidPayments.reduce((acc, payment) => acc + Number(payment.amount), 0);

  drawHitSchoolHeader(doc, 'EXTRACTO FAMILIAR DE PAGOS', 'Histórico consolidado de mensualidades pagadas');
  drawFamilyHolder(doc, data);

  autoTable(doc, {
    startY: 88,
    head: [['Alumno', 'Periodo / Mensualidad', 'Importe', 'Fecha de Pago']],
    body: paidPayments.map((payment) => [
      payment.studentName,
      payment.monthLabel,
      `${Number(payment.amount).toFixed(2)} €`,
      payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('es-ES') : '-'
    ]),
    foot: [['TOTAL ABONADO', '', `${totalPaid.toFixed(2)} €`, '']],
    headStyles: { fillColor: [35, 108, 57], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    footStyles: { fillColor: [240, 246, 243], textColor: [33, 37, 41], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 3 }
  });

  doc.save(`Extracto_Familiar_${data.parentName.replace(/\s+/g, '_')}.pdf`);
};

export const generateFamilyMonthlyInvoicePDF = (data: FamilyDocumentData) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const lines = data.payments.filter((payment) => Number(payment.amount) > 0);
  const total = lines.reduce((acc, payment) => acc + Number(payment.amount), 0);
  const periodLabel = data.monthLabel || (lines[0]?.monthLabel ?? 'Periodo seleccionado');
  const invoiceNumber = `FACT-FAM-${data.year || new Date().getFullYear()}-${String(data.month || new Date().getMonth() + 1).padStart(2, '0')}`;

  drawHitSchoolHeader(doc, 'FACTURA FAMILIAR', `Nº Factura: ${invoiceNumber}`);
  drawFamilyHolder(doc, data);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(35, 108, 57);
  doc.text(`Periodo facturado: ${periodLabel}`, 15, 88);

  autoTable(doc, {
    startY: 94,
    head: [['Alumno', 'Concepto', 'Importe']],
    body: lines.map((payment) => [
      payment.studentName,
      `Cuota mensual - ${payment.monthLabel}`,
      `${Number(payment.amount).toFixed(2)} €`
    ]),
    foot: [['TOTAL FACTURA', '', `${total.toFixed(2)} €`]],
    headStyles: { fillColor: [35, 108, 57], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    footStyles: { fillColor: [240, 246, 243], textColor: [33, 37, 41], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 3 }
  });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(108, 117, 125);
  doc.text('Operación exenta de IVA según el Art. 20.Uno.9º de la Ley 37/1992 de Impuesto sobre el Valor Añadido.', 15, 265);
  doc.save(`${invoiceNumber}.pdf`);
};

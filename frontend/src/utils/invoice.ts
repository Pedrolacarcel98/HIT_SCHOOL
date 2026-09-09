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

import autoTable from 'jspdf-autotable';

export interface StatementData {
  studentName: string;
  studentDni?: string | null;
  studentEmail?: string | null;
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
  doc.text('HIT SCHOOL', 15, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('C. Concepción Soto 36, Las Pajanosas', 15, 25);
  doc.text('NIF: B-93821045', 15, 30);
  doc.text('Email: info@hitschool.es', 15, 35);

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

  // 3. Cálculos de Totales
  const totalBilled = data.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalPaid = data.payments.filter(p => p.isPaid).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const pendingBalance = Math.max(0, totalBilled - totalPaid);
  const isFullyPaid = pendingBalance === 0;
  const countTotal = data.payments.length;
  const countPaid = data.payments.filter(p => p.isPaid).length;
  const countPending = data.payments.filter(p => !p.isPaid).length;

  // 4. Tabla de Mensualidades
  const tableData = data.payments.map(p => {
    return [
      p.monthLabel,
      `${Number(p.amount).toFixed(2)} €`,
      p.isPaid ? 'Pagado' : 'Pendiente / Impago',
      p.paidAt ? new Date(p.paidAt).toLocaleDateString('es-ES') : '-'
    ];
  });

  autoTable(doc, {
    startY: 84,
    head: [['Periodo / Mensualidad', 'Importe', 'Estado', 'Fecha de Pago']],
    body: tableData,
    foot: [
      [
        'TOTALES',
        `${totalBilled.toFixed(2)} €`,
        isFullyPaid ? 'Al corriente' : `Pendiente: ${pendingBalance.toFixed(2)} €`,
        `Abonado: ${totalPaid.toFixed(2)} €`
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
    },
    didParseCell: (dataCell) => {
      if (dataCell.section === 'body' && dataCell.column.index === 2) {
        if (dataCell.cell.raw === 'Pagado') {
          dataCell.cell.styles.textColor = [35, 108, 57]; // green
          dataCell.cell.styles.fontStyle = 'bold';
        } else {
          dataCell.cell.styles.textColor = [190, 30, 30]; // red
          dataCell.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // 5. Cuadro Resumen de Totales al final de la tabla
  const lastTableFinalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 180;
  let summaryY = lastTableFinalY + 8;

  // Si queda poco espacio antes del pie (275), añadir nueva página
  if (summaryY > 225) {
    doc.addPage();
    summaryY = 25;
  }

  // Título de la sección de totales
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.text('RESUMEN Y TOTALES DEL EXTRACTO', 15, summaryY);

  summaryY += 4;

  const cardWidth = 56;
  const cardHeight = 24;
  const cardGap = 6;
  const startX = 15;

  // Tarjeta 1: Total Facturado
  const card1X = startX;
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(220, 224, 230);
  doc.roundedRect(card1X, summaryY, cardWidth, cardHeight, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('TOTAL FACTURADO', card1X + 5, summaryY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(`${totalBilled.toFixed(2)} €`, card1X + 5, summaryY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`${countTotal} mensualidades emitidas`, card1X + 5, summaryY + 19.5);

  // Tarjeta 2: Total Abonado
  const card2X = card1X + cardWidth + cardGap;
  doc.setFillColor(240, 249, 243);
  doc.setDrawColor(180, 220, 195);
  doc.roundedRect(card2X, summaryY, cardWidth, cardHeight, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.text('TOTAL ABONADO', card2X + 5, summaryY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.text(`${totalPaid.toFixed(2)} €`, card2X + 5, summaryY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.text(`${countPaid} mensualidades pagadas`, card2X + 5, summaryY + 19.5);

  // Tarjeta 3: Saldo Pendiente
  const card3X = card2X + cardWidth + cardGap;
  if (!isFullyPaid) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(248, 180, 180);
    doc.roundedRect(card3X, summaryY, cardWidth, cardHeight, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28);
    doc.text('SALDO PENDIENTE', card3X + 5, summaryY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(185, 28, 28);
    doc.text(`${pendingBalance.toFixed(2)} €`, card3X + 5, summaryY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(185, 28, 28);
    doc.text(`${countPending} mensualidad(es) pendiente(s)`, card3X + 5, summaryY + 19.5);
  } else {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(card3X, summaryY, cardWidth, cardHeight, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52);
    doc.text('ESTADO DE CUENTA', card3X + 5, summaryY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(22, 101, 52);
    doc.text('0,00 €', card3X + 5, summaryY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(22, 101, 52);
    doc.text('Al corriente de pago (0 € deuda)', card3X + 5, summaryY + 19.5);
  }

  // 6. Pie de Página para todas las páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(15, 280, 195, 280);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('HitSchool — Plataforma Educativa. C. Concepción Soto 36, Las Pajanosas.', 15, 285);
    doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: 'right' });
  }

  const sanitizedName = (data.studentName || 'ALUMNO').replace(/\s+/g, '_');
  const yearSuffix = data.year && data.year !== 'ALL' ? `_${data.year}` : '_Historico';
  doc.save(`Extracto_${sanitizedName}${yearSuffix}.pdf`);
};

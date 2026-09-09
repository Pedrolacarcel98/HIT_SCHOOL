import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportCardTaskItem {
  title: string;
  category?: string;
  grade?: number | null;
  stepsSummary?: string; // e.g. "✓ Video, 8.5 Quiz, ✓ Guía"
  completedAt?: string;
}

export interface ReportCardData {
  studentName: string;
  studentEmail?: string;
  courseTitle: string;
  teacherName?: string;
  term: number; // 1, 2, 3
  academicYear: string; // "2025-2026"
  modality: 'PRESENCIAL' | 'ONLINE';
  
  // Notas
  middleExamGrade?: number | null;
  finalExamGrade?: number | null;
  tasksAverage?: number | null;
  overallGrade?: number | null;

  // CEFR Skills
  grammar?: number | null;
  reading?: number | null;
  writing?: number | null;
  listening?: number | null;
  speaking?: number | null;

  observations?: string | null;
  tasks?: ReportCardTaskItem[];
}

export const generateReportCardPDF = (data: ReportCardData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const greenCorporate = [35, 108, 57]; // #236c39
  const darkText = [33, 37, 41];
  const mutedText = [108, 117, 125];
  const accentLight = [240, 246, 243];

  // 1. Cabecera
  doc.setFillColor(accentLight[0], accentLight[1], accentLight[2]);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('HIT SCHOOL', 15, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Academia de Idiomas & Centro Examinador Oficial', 15, 25);
  doc.text('C. Concepción Soto 36, Las Pajanosas | info@hitschool.es', 15, 30);

  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('INFORME DE EVALUACIÓN', 195, 18, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(`${data.term}º TRIMESTRE (${data.academicYear})`, 195, 26, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 195, 32, { align: 'right' });

  // 2. Ficha del Alumno y Curso
  let currentY = 48;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(225, 230, 227);
  doc.roundedRect(15, currentY, 180, 26, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text('DATOS DEL ALUMNO Y CURSO', 20, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Alumno:', 20, currentY + 14);
  doc.text('Curso:', 20, currentY + 20);

  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(data.studentName || '-', 40, currentY + 14);
  doc.text(data.courseTitle || '-', 40, currentY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Modalidad:', 115, currentY + 14);
  doc.text('Profesor:', 115, currentY + 20);

  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(data.modality === 'PRESENCIAL' ? 'Presencial (Exámenes + Tareas)' : 'Online (Evaluación Continua)', 135, currentY + 14);
  doc.text(data.teacherName || 'Claustro Docente HitSchool', 135, currentY + 20);

  // 3. Resumen Global de Calificación (Tarjeta Destacada)
  currentY += 32;

  doc.setFillColor(242, 248, 244);
  doc.setDrawColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.setLineWidth(0.6);
  doc.roundedRect(15, currentY, 180, 28, 3, 3, 'FD');

  const overallStr = data.overallGrade !== null && data.overallGrade !== undefined
    ? Number(data.overallGrade).toFixed(1)
    : 'Pendiente';

  const getQualitativeGrade = (g: number | null | undefined) => {
    if (g === null || g === undefined) return 'En proceso';
    if (g >= 9) return 'SOBRESALIENTE';
    if (g >= 7) return 'NOTABLE';
    if (g >= 6) return 'BIEN';
    if (g >= 5) return 'SUFICIENTE';
    return 'INSUFICIENTE';
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.text('CALIFICACIÓN TRIMESTRAL GLOBAL', 22, currentY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(overallStr, 22, currentY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`/ 10  •  ${getQualitativeGrade(data.overallGrade)}`, 48, currentY + 20);

  // Columnas desglosadas a la derecha
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);

  if (data.modality === 'PRESENCIAL') {
    doc.text('Evaluación Continua (50%):', 115, currentY + 9);
    doc.text('Middle Term Exam:', 115, currentY + 15);
    doc.text('Final Term Exam:', 115, currentY + 21);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text(data.tasksAverage !== null && data.tasksAverage !== undefined ? `${Number(data.tasksAverage).toFixed(1)} / 10` : '-', 165, currentY + 9);
    doc.text(data.middleExamGrade !== null && data.middleExamGrade !== undefined ? `${Number(data.middleExamGrade).toFixed(1)} / 10` : '-', 165, currentY + 15);
    doc.text(data.finalExamGrade !== null && data.finalExamGrade !== undefined ? `${Number(data.finalExamGrade).toFixed(1)} / 10` : '-', 165, currentY + 21);
  } else {
    doc.text('Sistema:', 115, currentY + 10);
    doc.text('Media Tareas y Pruebas:', 115, currentY + 18);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text('100% Automático Continuo', 150, currentY + 10);
    doc.text(data.tasksAverage !== null && data.tasksAverage !== undefined ? `${Number(data.tasksAverage).toFixed(1)} / 10` : '-', 150, currentY + 18);
  }

  // 4. Competencias Lingüísticas (CEFR Skills)
  currentY += 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.text('DESGLOSE POR COMPETENCIAS CLAVE (CEFR)', 15, currentY);

  const skillsData = [
    ['Grammar & Vocabulary', data.grammar !== null && data.grammar !== undefined ? `${Number(data.grammar).toFixed(1)} / 10` : '-', getQualitativeGrade(data.grammar)],
    ['Reading Comprehension', data.reading !== null && data.reading !== undefined ? `${Number(data.reading).toFixed(1)} / 10` : '-', getQualitativeGrade(data.reading)],
    ['Writing Expression', data.writing !== null && data.writing !== undefined ? `${Number(data.writing).toFixed(1)} / 10` : '-', getQualitativeGrade(data.writing)],
    ['Listening Comprehension', data.listening !== null && data.listening !== undefined ? `${Number(data.listening).toFixed(1)} / 10` : '-', getQualitativeGrade(data.listening)],
    ['Speaking & Fluency', data.speaking !== null && data.speaking !== undefined ? `${Number(data.speaking).toFixed(1)} / 10` : '-', getQualitativeGrade(data.speaking)],
  ];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Competencia', 'Calificación', 'Nivel Alcanzado']],
    body: skillsData,
    theme: 'grid',
    headStyles: { fillColor: greenCorporate as [number, number, number], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5, textColor: darkText as [number, number, number] },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 60, halign: 'center' }
    },
    margin: { left: 15, right: 15 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 5. Tareas y Bloques de Ejercicios del Trimestre
  if (data.tasks && data.tasks.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
    doc.text(`TRABAJO Y ENTREGAS DEL ${data.term}º TRIMESTRE`, 15, currentY);

    const taskRows = data.tasks.map((t) => [
      t.title,
      t.stepsSummary || 'Completado',
      t.grade !== null && t.grade !== undefined ? `${Number(t.grade).toFixed(1)} / 10` : 'Apto'
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Bloque / Tarea', 'Pasos Realizados', 'Nota Tarea']],
      body: taskRows,
      theme: 'striped',
      headStyles: { fillColor: [78, 155, 117], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: darkText as [number, number, number] },
      columnStyles: {
        0: { cellWidth: 85, fontStyle: 'bold' },
        1: { cellWidth: 65 },
        2: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
      },
      margin: { left: 15, right: 15 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. Observaciones Pedagógicas
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(greenCorporate[0], greenCorporate[1], greenCorporate[2]);
  doc.text('OBSERVACIONES PEDAGÓGICAS DEL PROFESOR', 15, currentY);

  currentY += 4;
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(220, 225, 222);
  doc.roundedRect(15, currentY, 180, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  const obsText = data.observations && data.observations.trim().length > 0
    ? data.observations.trim()
    : 'Evolución positiva a lo largo del trimestre. Se recomienda seguir afianzando la expresión oral y la práctica diaria de vocabulario.';
  
  const splitLines = doc.splitTextToSize(obsText, 172);
  doc.text(splitLines, 19, currentY + 7);

  // 7. Pie con firma
  currentY += 30;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Firma del Docente / Dirección Pedagógica:', 15, currentY);
  doc.line(15, currentY + 12, 75, currentY + 12);
  doc.text('HitSchool - Cambridge Assessment Preparation Centre', 15, currentY + 17);

  // Guardar / Descargar PDF
  const sanitizedStudent = (data.studentName || 'Alumno').replace(/\s+/g, '_');
  const filename = `Boletin_T${data.term}_${sanitizedStudent}_${data.academicYear}.pdf`;
  doc.save(filename);
};
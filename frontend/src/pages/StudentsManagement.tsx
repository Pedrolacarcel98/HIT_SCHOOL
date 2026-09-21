import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CustomSelect from '../components/CustomSelect';
import ModalityBadge from '../components/ModalityBadge';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Users,
  Phone,
  Eye,
  UserCheck,
  FileText,
  FileSpreadsheet
} from 'lucide-react';

interface ParentData {
  id: string;
  email: string;
  status?: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  profile?: {
    firstName: string;
    lastName: string;
    dni?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  children?: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  }[];
}

interface Student {
  id: string;
  email: string;
  status?: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  modality?: 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO';
  parentId?: string | null;
  profile?: {
    firstName: string;
    lastName: string;
    dni?: string | null;
    phone?: string | null;
    birthDate?: string | null;
    address?: string | null;
    schoolYear?: string | null;
    allergies?: string | null;
    imageAuthorization?: boolean | null;
    imageAuthorizationScope?: string | null;
    observations?: string | null;
  };
  parent?: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      phone?: string | null;
      dni?: string | null;
    };
  } | null;
  enrollments?: {
    courseId: string;
    course: {
      title: string;
    };
  }[];
  academyEnrollments?: {
    id: string;
    monthlyFee: number;
    billingPeriod?: 'MONTHLY' | 'QUARTERLY';
    startDate?: string;
    endDate?: string | null;
  }[];
  paymentStatuses?: {
    month: number;
    year: number;
    amount: number;
    isPaid: boolean;
  }[];
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const IMAGE_AUTHORIZATION_OPTIONS = [
  'No',
  'Sí, Para envío personal y familias del grupo de clase',
  'Sí, Para envío personal, familias del grupo de clase y redes sociales'
] as const;

const normalizeSearchValue = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

type ImageAuthorizationOption = typeof IMAGE_AUTHORIZATION_OPTIONS[number];

const getImageAuthorizationValue = (profile?: Student['profile']): ImageAuthorizationOption => {
  if (profile?.imageAuthorizationScope && IMAGE_AUTHORIZATION_OPTIONS.includes(profile.imageAuthorizationScope as ImageAuthorizationOption)) {
    return profile.imageAuthorizationScope as ImageAuthorizationOption;
  }
  if (profile?.imageAuthorization === true) return 'Sí, Para envío personal y familias del grupo de clase';
  return 'No';
};

const StudentsManagement: React.FC = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  const canManageStudents = userRole === 'ADMIN' || userRole === 'TEACHER';
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<ParentData[]>([]);
  const [parentSearchTerm, setParentSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalityFilter, setModalityFilter] = useState<'ALL' | 'PRESENCIAL' | 'ONLINE'>('ALL');
  const [familyFilter, setFamilyFilter] = useState<'ALL' | 'WITH_PARENT' | 'INDEPENDENT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [loading, setLoading] = useState(true);

  // Modal Dar de Alta
  const [showAltaModal, setShowAltaModal] = useState(false);
  const [selectedStudentForAlta, setSelectedStudentForAlta] = useState<Student | null>(null);
  const [newMonthlyFee, setNewMonthlyFee] = useState('35');
  const [newBillingPeriod, setNewBillingPeriod] = useState<'MONTHLY' | 'QUARTERLY'>('MONTHLY');
  const [newStartDate, setNewStartDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Modal Ver Ficha
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  // Modal Crear
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDni, setNewDni] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCursoEscolar, setNewCursoEscolar] = useState('');
  const [newAlergias, setNewAlergias] = useState('');
  const [newAutorizacionImagen, setNewAutorizacionImagen] = useState<ImageAuthorizationOption>('No');
  const [newObservaciones, setNewObservaciones] = useState('');
  const [newModality, setNewModality] = useState<'PRESENCIAL' | 'ONLINE' | 'HIBRIDO'>('PRESENCIAL');

  // Gestión de Tutor en Crear
  const [hasParent, setHasParent] = useState(false);
  const [parentOption, setParentOption] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [newParentFirstName, setNewParentFirstName] = useState('');
  const [newParentLastName, setNewParentLastName] = useState('');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newParentDni, setNewParentDni] = useState('');

  // Modal Editar
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDni, setEditDni] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCursoEscolar, setEditCursoEscolar] = useState('');
  const [editAlergias, setEditAlergias] = useState('');
  const [editAutorizacionImagen, setEditAutorizacionImagen] = useState<ImageAuthorizationOption>('No');
  const [editObservaciones, setEditObservaciones] = useState('');
  const [editParentId, setEditParentId] = useState('');
  const [editModality, setEditModality] = useState<'PRESENCIAL' | 'ONLINE' | 'HIBRIDO'>('PRESENCIAL');
  const [editBillingPeriod, setEditBillingPeriod] = useState<'MONTHLY' | 'QUARTERLY'>('MONTHLY');
  const [editBillingAmount, setEditBillingAmount] = useState('');

  // Modal Eliminar
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // Alertas
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchStudents();
    fetchParents();
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[style*="position: fixed"]') || target.closest('.glass-panel')) return;
      setViewingStudent(null);
      setEditingStudent(null);
      setDeletingStudent(null);
      setShowCreateModal(false);
      setShowAltaModal(false);
      setSelectedStudentForAlta(null);
    };
    document.addEventListener('click', closeOnOutsideClick);
    return () => document.removeEventListener('click', closeOnOutsideClick);
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error al cargar la lista de alumnos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchParents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/students/parents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setParents(data);
      }
    } catch (err) {
      console.error('Error al cargar tutores:', err);
    }
  };

  const calculateAge = (birthDateString?: string | null) => {
    if (!birthDateString) return null;
    const birthDate = new Date(birthDateString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      let parentPayload = null;
      let finalParentId = null;

      if (hasParent) {
        if (parentOption === 'EXISTING') {
          finalParentId = selectedParentId || null;
        } else {
          parentPayload = {
            firstName: newParentFirstName.trim(),
            lastName: newParentLastName.trim(),
            email: newParentEmail.trim().toLowerCase(),
            phone: newParentPhone.trim() || null,
            dni: newParentDni.trim() || null
          };
        }
      }

      const res = await fetch(`${apiUrl}/api/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: newFirstName.trim(),
          lastName: newLastName.trim(),
          email: newEmail.trim().toLowerCase(),
          dni: newDni.trim() || null,
          phone: newPhone.trim() || null,
          birthDate: newBirthDate ? newBirthDate : null,
          address: newAddress.trim() || null,
          schoolYear: newCursoEscolar.trim() || null,
          allergies: newAlergias.trim() || null,
          imageAuthorization: newAutorizacionImagen !== 'No',
          imageAuthorizationScope: newAutorizacionImagen,
          observations: newObservaciones.trim() || null,
          modality: newModality,
          parentId: finalParentId,
          parentData: parentPayload
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Error al crear alumno', 'error');
        return;
      }

      showToast(`Alumno creado con éxito (credenciales generadas: ${data.generatedPassword}).`);
      setShowCreateModal(false);
      resetCreateForm();
      fetchStudents();
      fetchParents();
    } catch (err) {
      showToast('Error de conexión', 'error');
    }
  };

  const resetCreateForm = () => {
    setNewFirstName('');
    setNewLastName('');
    setNewEmail('');
    setNewDni('');
    setNewPhone('');
    setNewBirthDate('');
    setNewAddress('');
    setNewCursoEscolar('');
    setNewAlergias('');
    setNewAutorizacionImagen('No');
    setNewObservaciones('');
    setNewModality('PRESENCIAL');
    setHasParent(false);
    setParentSearchTerm('');
    setSelectedParentId('');
    setNewParentFirstName('');
    setNewParentLastName('');
    setNewParentEmail('');
    setNewParentPhone('');
    setNewParentDni('');
  };

  const handleStartEdit = (student: Student) => {
    const activeEnrollment = student.academyEnrollments
      ?.filter((enrollment) => !enrollment.endDate)
      .sort((a, b) => (new Date(b.startDate || 0).getTime()) - (new Date(a.startDate || 0).getTime()))[0];
    setEditingStudent(student);
    setEditFirstName(student.profile?.firstName || '');
    setEditLastName(student.profile?.lastName || '');
    setEditEmail(student.email);
    setEditDni(student.profile?.dni || '');
    setEditPhone(student.profile?.phone || '');
    setEditBirthDate(student.profile?.birthDate ? student.profile.birthDate.split('T')[0] : '');
    setEditAddress(student.profile?.address || '');
    setEditCursoEscolar(student.profile?.schoolYear || '');
    setEditAlergias(student.profile?.allergies || '');
    setEditAutorizacionImagen(getImageAuthorizationValue(student.profile));
    setEditObservaciones(student.profile?.observations || '');
    setEditParentId(student.parentId || '');
    setParentSearchTerm('');
    setEditModality(student.modality || 'PRESENCIAL');
    setEditBillingPeriod(activeEnrollment?.billingPeriod || 'MONTHLY');
    setEditBillingAmount(activeEnrollment ? String(activeEnrollment.monthlyFee) : '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const hasActiveEnrollment = editingStudent.academyEnrollments?.some((enrollment) => !enrollment.endDate) || false;
    const normalizedBillingAmount = editBillingAmount.trim() ? Number(editBillingAmount) : undefined;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.trim().toLowerCase(),
          dni: editDni.trim() || null,
          phone: editPhone.trim() || null,
          birthDate: editBirthDate ? editBirthDate : null,
          address: editAddress.trim() || null,
          schoolYear: editCursoEscolar.trim() || null,
          allergies: editAlergias.trim() || null,
          imageAuthorization: editAutorizacionImagen !== 'No',
          imageAuthorizationScope: editAutorizacionImagen,
          observations: editObservaciones.trim() || null,
          parentId: editParentId || null,
          modality: editModality,
          billingPeriod: hasActiveEnrollment ? editBillingPeriod : undefined,
          billingAmount: hasActiveEnrollment ? normalizedBillingAmount : undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Error al actualizar alumno', 'error');
        return;
      }

      showToast('Alumno y ficha extendida actualizados correctamente.');
      setEditingStudent(null);
      fetchStudents();
      fetchParents();
    } catch (err) {
      showToast('Error de conexión al actualizar', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/students/${deletingStudent.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Error al eliminar alumno', 'error');
        return;
      }

      showToast('Alumno eliminado del sistema.');
      setDeletingStudent(null);
      fetchStudents();
    } catch (err) {
      showToast('Error de conexión al eliminar', 'error');
    }
  };

  const handleOpenAlta = (student: Student) => {
    const lastEnrollment = student.academyEnrollments?.[0];
    setSelectedStudentForAlta(student);
    setNewMonthlyFee(lastEnrollment ? String(lastEnrollment.monthlyFee) : '35');
    setNewBillingPeriod(lastEnrollment?.billingPeriod || 'MONTHLY');
    setNewStartDate(new Date().toISOString().split('T')[0]);
    setShowAltaModal(true);
  };

  const handleAlta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForAlta) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/enrollments/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: selectedStudentForAlta.id,
          monthlyFee: Number(newMonthlyFee),
          billingPeriod: newBillingPeriod,
          startDate: newStartDate
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Error al dar de alta', 'error');
        return;
      }

      showToast('Alumno dado de alta correctamente.');
      setShowAltaModal(false);
      setSelectedStudentForAlta(null);
      fetchStudents();
    } catch (err) {
      showToast('Error de conexión', 'error');
    }
  };

  const handleBaja = async (student: Student) => {
    const studentName = `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim() || student.email;
    if (!window.confirm(`¿Estás seguro de que deseas dar de baja a ${studentName}? Se detendrá la generación de sus pagos.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/enrollments/unenroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: student.id
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Error al dar de baja', 'error');
        return;
      }

      showToast('Alumno dado de baja correctamente.');
      fetchStudents();
    } catch (err) {
      showToast('Error de conexión', 'error');
    }
  };

  const downloadUnpaidPDF = (student: Student) => {
    const unpaid = student.paymentStatuses?.filter(p => !p.isPaid) || [];
    if (unpaid.length === 0) {
      showToast('Este alumno no tiene pagos pendientes.', 'error');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Informe de Impagos', 14, 22);

    doc.setFontSize(12);
    doc.text(`Alumno: ${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim(), 14, 32);
    if (student.profile?.dni) {
      doc.text(`DNI: ${student.profile.dni}`, 14, 40);
    }

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const tableData = unpaid.map(p => [
      `${monthNames[p.month - 1]} ${p.year}`,
      `${p.amount} €`
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Periodo', 'Importe Pendiente']],
      body: tableData,
    });

    const studentName = `${student.profile?.firstName || 'Alumno'}_${student.profile?.lastName || ''}`.trim();
    doc.save(`Impagos_${studentName}.pdf`);
  };

  const filteredStudents = students.filter(s => {
    const fullName = `${s.profile?.firstName || ''} ${s.profile?.lastName || ''}`.toLowerCase();
    const email = s.email.toLowerCase();
    const dni = (s.profile?.dni || '').toLowerCase();
    const phone = (s.profile?.phone || '').toLowerCase();
    const parentName = s.parent?.profile ? `${s.parent.profile.firstName} ${s.parent.profile.lastName}`.toLowerCase() : '';
    const query = searchTerm.toLowerCase();

    const matchesSearch =
      !query ||
      fullName.includes(query) ||
      email.includes(query) ||
      dni.includes(query) ||
      phone.includes(query) ||
      parentName.includes(query);

    const modality = s.modality || 'PRESENCIAL';

    if (modalityFilter === 'PRESENCIAL' && modality !== 'PRESENCIAL') return false;
    if (modalityFilter === 'ONLINE' && modality !== 'ONLINE' && modality !== 'HIBRIDO') return false;

    if (familyFilter === 'WITH_PARENT' && !s.parentId) return false;
    if (familyFilter === 'INDEPENDENT' && s.parentId) return false;

    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;

    return matchesSearch;
  });

  const filteredParents = parents.filter((parent) => {
    if (parent.status !== 'ACTIVE') return false;
    const searchableValues = [
      parent.profile?.firstName,
      parent.profile?.lastName,
      parent.email,
      parent.profile?.dni,
      parent.profile?.phone
    ].filter(Boolean).map((value) => normalizeSearchValue(value || ''));
    const searchableText = searchableValues.join(' ');
    const query = normalizeSearchValue(parentSearchTerm);
    return !query || searchableText.includes(query);
  });

  const handleExportExcel = () => {
    const valueOrDash = (value?: string | null) => value?.trim() || '-';
    const formatBirthDate = (birthDate?: string | null) => {
      if (!birthDate) return '-';
      const date = new Date(birthDate);
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-ES');
    };

    const rows = students.map((student) => ({
      'NOMBRE ALUMNO': valueOrDash(student.profile?.firstName),
      'APELLIDOS ALUMNO': valueOrDash(student.profile?.lastName),
      'CORREO': valueOrDash(student.email),
      'FECHA NACIMIENTO': formatBirthDate(student.profile?.birthDate),
      'CURSO ESCOLAR': valueOrDash(student.profile?.schoolYear),
      'PADRE/MADRE': student.parent?.profile ? valueOrDash(`${student.parent.profile.firstName} ${student.parent.profile.lastName}`) : '-',
      'MOVIL': valueOrDash(student.profile?.phone || student.parent?.profile?.phone),
      'GRUPO': student.enrollments?.map((enrollment) => enrollment.course.title).join(', ') || '-',
      'ALERGIAS': valueOrDash(student.profile?.allergies),
      'AUTORIZACIÓN IMAGEN': student.profile?.imageAuthorizationScope || (student.profile?.imageAuthorization === true ? 'Sí' : student.profile?.imageAuthorization === false ? 'No' : '-'),
      'OBSERVACIONES': valueOrDash(student.profile?.observations)
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: ['NOMBRE ALUMNO', 'APELLIDOS ALUMNO', 'CORREO', 'FECHA NACIMIENTO', 'CURSO ESCOLAR', 'PADRE/MADRE', 'MOVIL', 'GRUPO', 'ALERGIAS', 'AUTORIZACIÓN IMAGEN', 'OBSERVACIONES']
    });
    worksheet['!cols'] = [22, 24, 30, 18, 18, 26, 16, 28, 24, 22, 34].map((width) => ({ wch: width }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Alumnos');
    XLSX.writeFile(workbook, `Alumnos_HitSchool_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          background: notification.type === 'success' ? 'var(--primary)' : '#991b1b',
          color: '#ffffff',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 100,
          animation: 'fadeIn 0.3s ease'
        }}>
          {notification.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Users style={{ color: 'var(--primary)' }} size={24} /> Alumnos
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={handleExportExcel} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#ecfdf5', color: '#047857', border: '1px solid #6ee7b7', padding: '0.65rem 1rem', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s ease' }}>
            <FileSpreadsheet size={17} /> Exportar a Excel
          </button>
          {canManageStudents && (
            <button
              onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
            >
              <UserPlus size={18} /> Nuevo Alumno
            </button>
          )}
        </div>
      </div>

      {/* Filtros & Buscador */}
      <div className="filters-panel">
        <div className="filters-panel__search">
          <Search size={17} />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI, teléfono, tutor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar alumnos"
          />
        </div>

        <div className="filters-panel__selects">
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            ariaLabel="Filtrar por estado"
            options={[
              { value: 'ALL', label: 'Todos los estados' },
              { value: 'ACTIVE', label: 'Alta' },
              { value: 'INACTIVE', label: 'Baja' }
            ]}
          />

          <CustomSelect
            value={modalityFilter}
            onChange={setModalityFilter}
            ariaLabel="Filtrar por modalidad"
            options={[
              { value: 'ALL', label: 'Todas las modalidades' },
              { value: 'PRESENCIAL', label: 'Presencial' },
              { value: 'ONLINE', label: 'Online / Híbrido' }
            ]}
          />

          <CustomSelect
            value={familyFilter}
            onChange={setFamilyFilter}
            ariaLabel="Filtrar por tipo de cuenta"
            options={[
              { value: 'ALL', label: 'Todas las cuentas' },
              { value: 'WITH_PARENT', label: 'Con Padre/Tutor' },
              { value: 'INDEPENDENT', label: 'Independientes' }
            ]}
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="glass-panel students-table-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem' }}>ALUMNO Y CONTACTO</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem' }}>DNI / NIE</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem' }}>CUENTA / TUTOR</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem' }}>ESTADO</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem' }}>MATRÍCULA ACTIVA</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem', textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Cargando alumnos y fichas...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {searchTerm ? 'No se encontraron alumnos con ese criterio.' : 'No hay alumnos registrados en el sistema.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const initials = `${s.profile?.firstName?.[0] || ''}${s.profile?.lastName?.[0] || ''}`.toUpperCase() || 'AL';
                  const age = calculateAge(s.profile?.birthDate);
                  const modality = s.modality || 'PRESENCIAL';
                  const isActive = s.status === 'ACTIVE';
                  const activeEnrollment = s.academyEnrollments?.find(e => !e.endDate);
                  const hasUnpaid = s.paymentStatuses?.some(p => !p.isPaid);

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s ease' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            flexShrink: 0
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                              {s.profile?.firstName} {s.profile?.lastName}
                              {age !== null && (
                                <span style={{ marginLeft: '0.45rem', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                  ({age} años)
                                </span>
                              )}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{s.email}</div>
                            {s.profile?.phone && (
                              <div style={{ color: 'var(--primary)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '2px' }}>
                                <Phone size={12} /> {s.profile.phone}
                              </div>
                            )}
                            <ModalityBadge modality={modality} className="student-card-modality" />
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-main)', fontSize: '0.88rem' }}>
                        {s.profile?.dni ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.profile.dni}</span>
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.82rem' }}>No asignado</span>
                        )}
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        {s.parent ? (
                          <div style={{ padding: '0.35rem 0.65rem', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '8px', display: 'inline-block' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-text)' }}>
                              👨‍👧 {s.parent.profile?.firstName} {s.parent.profile?.lastName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {s.parent.email}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Independiente
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '0.35rem 0.65rem',
                            background: isActive ? '#dcfce7' : '#fee2e2',
                            color: isActive ? '#166534' : '#991b1b',
                            borderRadius: '16px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            {isActive ? 'Alta' : 'Baja'}
                          </span>
                          {canManageStudents && (
                            <button
                              type="button"
                              onClick={() => isActive ? handleBaja(s) : handleOpenAlta(s)}
                              style={{
                                padding: '0.3rem 0.55rem',
                                borderRadius: '6px',
                                border: `1px solid ${isActive ? '#fca5a5' : '#86efac'}`,
                                background: isActive ? '#fff1f2' : '#f0fdf4',
                                color: isActive ? '#b91c1c' : '#15803d',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}
                            >
                              {isActive ? 'Dar de baja' : 'Dar de alta'}
                            </button>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-main)' }}>
                        {activeEnrollment ? (
                          <span style={{ fontSize: '0.88rem' }}>
                            Desde {new Date(activeEnrollment.startDate || '').toLocaleDateString('es-ES')} - {activeEnrollment.monthlyFee}€ / {activeEnrollment.billingPeriod === 'QUARTERLY' ? 'trimestre' : 'mes'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.82rem' }}>Sin matrícula activa</span>
                        )}
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem', alignItems: 'center' }}>
                          {userRole === 'ADMIN' && hasUnpaid && !isActive && (
                            <button
                              type="button"
                              onClick={() => downloadUnpaidPDF(s)}
                              title="Descargar PDF de Impagos"
                              style={{
                                background: '#fee2e2',
                                border: '1px solid #f87171',
                                borderRadius: '6px',
                                padding: '0.35rem 0.65rem',
                                cursor: 'pointer',
                                color: '#991b1b',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                              }}
                            >
                              <FileText size={13} /> PDF Impagos
                            </button>
                          )}
                          <button
                            onClick={() => setViewingStudent(s)}
                            title="Ver ficha completa"
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              padding: '0.4rem',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                          >
                            <Eye size={16} />
                          </button>

                          {canManageStudents && (
                            <>
                              <button
                                onClick={() => handleStartEdit(s)}
                                title="Editar ficha de alumno"
                                style={{
                                  background: 'transparent',
                                  border: '1px solid var(--border)',
                                  borderRadius: '6px',
                                  padding: '0.4rem',
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                              >
                                <Edit2 size={16} />
                              </button>

                              <button
                                onClick={() => setDeletingStudent(s)}
                                title="Eliminar alumno"
                                style={{
                                  background: 'transparent',
                                  border: '1px solid var(--border)',
                                  borderRadius: '6px',
                                  padding: '0.4rem',
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Misma información en tarjetas: la tabla de 6 columnas no cabe bajo 768px */}
      <div className="students-card-list">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>Cargando alumnos y fichas...</p>
        ) : filteredStudents.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
            {searchTerm ? 'No se encontraron alumnos con ese criterio.' : 'No hay alumnos registrados en el sistema.'}
          </p>
        ) : (
          filteredStudents.map((s) => {
            const initials = `${s.profile?.firstName?.[0] || ''}${s.profile?.lastName?.[0] || ''}`.toUpperCase() || 'AL';
            const age = calculateAge(s.profile?.birthDate);
            const modality = s.modality || 'PRESENCIAL';
            const isActive = s.status === 'ACTIVE';
            const activeEnrollment = s.academyEnrollments?.find(e => !e.endDate);
            const hasUnpaid = s.paymentStatuses?.some(p => !p.isPaid);

            return (
              <div key={s.id} className="glass-panel students-card">
                <div className="students-card__header">
                  <div style={{ width: '38px', height: '38px', flexShrink: 0, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    {initials}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="students-card__name">
                      {s.profile?.firstName} {s.profile?.lastName}
                      {age !== null && (
                        <span style={{ marginLeft: '0.45rem', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 400 }}>({age} años)</span>
                      )}
                    </div>
                    <div className="students-card__email">{s.email}</div>
                    {s.profile?.phone && (
                      <div style={{ color: 'var(--primary)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '2px' }}>
                        <Phone size={12} /> {s.profile.phone}
                      </div>
                    )}
                    <ModalityBadge modality={modality} className="student-card-modality" />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', flexShrink: 0 }}>
                    <span style={{ padding: '0.3rem 0.6rem', background: isActive ? '#dcfce7' : '#fee2e2', color: isActive ? '#166534' : '#991b1b', borderRadius: '16px', fontSize: '0.72rem', fontWeight: 600 }}>
                      {isActive ? 'Alta' : 'Baja'}
                    </span>
                    {canManageStudents && (
                      <button
                        type="button"
                        onClick={() => isActive ? handleBaja(s) : handleOpenAlta(s)}
                        style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', border: `1px solid ${isActive ? '#fecaca' : '#bbf7d0'}`, background: isActive ? '#fef2f2' : '#f0fdf4', color: isActive ? '#dc2626' : '#16a34a', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500, whiteSpace: 'nowrap' }}
                      >
                        {isActive ? 'Dar de baja' : 'Dar de alta'}
                      </button>
                    )}
                  </div>
                </div>

                <dl className="students-card__data">
                  <dt>DNI / NIE</dt>
                  <dd>
                    {s.profile?.dni
                      ? <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.profile.dni}</span>
                      : <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>No asignado</span>}
                  </dd>

                  <dt>Cuenta / Tutor</dt>
                  <dd>
                    {s.parent
                      ? <>👨‍👧 {s.parent.profile?.firstName} {s.parent.profile?.lastName} <span style={{ color: 'var(--text-muted)' }}>({s.parent.email})</span></>
                      : <span style={{ color: 'var(--text-muted)' }}>Independiente</span>}
                  </dd>

                  <dt>Matrícula activa</dt>
                  <dd>
                    {activeEnrollment
                      ? `Desde ${new Date(activeEnrollment.startDate || '').toLocaleDateString('es-ES')} · ${activeEnrollment.monthlyFee}€ / ${activeEnrollment.billingPeriod === 'QUARTERLY' ? 'trimestre' : 'mes'}`
                      : <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Sin matrícula activa</span>}
                  </dd>
                </dl>

                <div className="students-card__actions">
                  {userRole === 'ADMIN' && hasUnpaid && !isActive && (
                    <button
                      type="button"
                      onClick={() => downloadUnpaidPDF(s)}
                      title="Descargar PDF de Impagos"
                      aria-label="Descargar PDF de Impagos"
                      className="is-unpaid"
                    >
                      <FileText size={16} />
                    </button>
                  )}
                  <button onClick={() => setViewingStudent(s)} title="Ver ficha completa" aria-label="Ver ficha completa">
                    <Eye size={16} />
                  </button>
                  {canManageStudents && (
                    <>
                      <button onClick={() => handleStartEdit(s)} title="Editar ficha de alumno" aria-label="Editar ficha de alumno">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setDeletingStudent(s)} title="Eliminar alumno" aria-label="Eliminar alumno">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Ver Ficha Completa del Alumno */}
      {viewingStudent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1rem'
        }}>
          <div className="glass-panel modal-card modal-card--wide" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  {`${viewingStudent.profile?.firstName?.[0] || ''}${viewingStudent.profile?.lastName?.[0] || ''}`}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-main)' }}>
                    {viewingStudent.profile?.firstName} {viewingStudent.profile?.lastName}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>{viewingStudent.email}</span>
                    {viewingStudent.status === 'ACTIVE' ? (
                      <span style={{ padding: '0.2rem 0.5rem', background: '#dcfce7', color: '#166534', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600 }}>Alta</span>
                    ) : (
                      <span style={{ padding: '0.2rem 0.5rem', background: '#fee2e2', color: '#991b1b', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600 }}>Baja</span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingStudent(null)} className="modal-close" aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>DNI / NIE</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{viewingStudent.profile?.dni || 'No registrado'}</strong>
              </div>

              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Teléfono / WhatsApp</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{viewingStudent.profile?.phone || 'No registrado'}</strong>
              </div>

              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Fecha de Nacimiento / Edad</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {viewingStudent.profile?.birthDate
                    ? `${new Date(viewingStudent.profile.birthDate).toLocaleDateString('es-ES')} (${calculateAge(viewingStudent.profile.birthDate)} años)`
                    : 'No registrada'}
                </strong>
              </div>

              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Modalidad</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {viewingStudent.modality}
                </strong>
              </div>

              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Curso Escolar</span>
                <strong style={{ fontSize: '0.95rem', color: viewingStudent.profile?.schoolYear ? 'var(--text-main)' : 'var(--text-light)' }}>{viewingStudent.profile?.schoolYear || 'Sin registrar'}</strong>
              </div>

              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Alergias</span>
                <strong style={{ fontSize: '0.95rem', color: viewingStudent.profile?.allergies ? 'var(--text-main)' : 'var(--text-light)' }}>{viewingStudent.profile?.allergies || 'Sin registrar'}</strong>
              </div>

              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Autorización de Imagen</span>
                <strong style={{ fontSize: '0.95rem', color: getImageAuthorizationValue(viewingStudent.profile) !== 'No' ? 'var(--text-main)' : 'var(--text-light)' }}>{getImageAuthorizationValue(viewingStudent.profile)}</strong>
              </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Dirección Completa</span>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {viewingStudent.profile?.address || 'Sin dirección registrada'}
              </p>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Observaciones</span>
              <p style={{ margin: '0.25rem 0 0', color: viewingStudent.profile?.observations ? 'var(--text-main)' : 'var(--text-light)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                {viewingStudent.profile?.observations || 'Sin registrar'}
              </p>
            </div>

            {/* Ficha del Tutor Asociado */}
            <div style={{ marginTop: '1.25rem', padding: '1rem', background: viewingStudent.parent ? 'var(--primary-subtle)' : 'var(--surface-alt)', borderRadius: '10px', border: viewingStudent.parent ? '1px solid var(--primary-border)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <UserCheck size={18} style={{ color: 'var(--primary)' }} />
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  {viewingStudent.parent ? 'Padre / Tutor Responsable' : 'Cuenta de Alumno Independiente'}
                </strong>
              </div>
              {viewingStudent.parent ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.4rem' }}>
                  <div><strong>Nombre:</strong> {viewingStudent.parent.profile?.firstName} {viewingStudent.parent.profile?.lastName}</div>
                  <div><strong>Email del tutor:</strong> {viewingStudent.parent.email}</div>
                  {viewingStudent.parent.profile?.phone && <div><strong>Teléfono:</strong> {viewingStudent.parent.profile.phone}</div>}
                  {viewingStudent.parent.profile?.dni && <div><strong>DNI Tutor:</strong> {viewingStudent.parent.profile.dni}</div>}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Este alumno no tiene un padre/tutor asociado. Gestiona sus pagos y accesos directamente.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
              >
                Cerrar
              </button>
              {canManageStudents && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const query = viewingStudent.profile?.firstName || viewingStudent.email;
                      setViewingStudent(null);
                      navigate(`/teacher/payments?student=${encodeURIComponent(query)}`);
                    }}
                    className="btn-secondary"
                    style={{ padding: '0.6rem 1.15rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}
                  >
                    <FileText size={16} /> Facturas y Pagos
                  </button>
                  <button
                    type="button"
                    onClick={() => { const s = viewingStudent; setViewingStudent(null); handleStartEdit(s); }}
                    className="btn-primary"
                    style={{ padding: '0.6rem 1.25rem' }}
                  >
                    Editar Ficha
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Alumno con Ficha Extendida & Tutor */}
      {showCreateModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1rem'
        }}>
          <div className="glass-panel modal-card modal-card--wide" style={{ width: '100%', maxWidth: '900px', maxHeight: '92vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.3rem' }}>
                <UserPlus style={{ color: 'var(--primary)' }} /> Alta de Nuevo Alumno
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="modal-close" aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Nombre *</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Ej. Laura"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Ej. Gómez Pérez"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Correo Electrónico (Acceso del Alumno) *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="alumno@ejemplo.com"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>DNI / NIE</label>
                  <input
                    type="text"
                    value={newDni}
                    onChange={(e) => setNewDni(e.target.value)}
                    placeholder="12345678Z"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="600123456"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Dirección Completa</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Calle, número, piso, ciudad"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Modalidad</label>
                  <select
                    required
                    value={newModality}
                    onChange={(e) => setNewModality(e.target.value as 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO')}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  >
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="ONLINE">Online</option>
                    <option value="HIBRIDO">Híbrido</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Curso Escolar</label>
                  <input
                    type="text"
                    value={newCursoEscolar}
                    onChange={(e) => setNewCursoEscolar(e.target.value)}
                    placeholder="5º Primaria"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Alergias</label>
                  <input
                    type="text"
                    value={newAlergias}
                    onChange={(e) => setNewAlergias(e.target.value)}
                    placeholder="No / Polen / Lactosa"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Autorización Imagen</label>
                <select
                  value={newAutorizacionImagen}
                  onChange={(e) => setNewAutorizacionImagen(e.target.value as ImageAuthorizationOption)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                >
                  {IMAGE_AUTHORIZATION_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Observaciones</label>
                <textarea
                  value={newObservaciones}
                  onChange={(e) => setNewObservaciones(e.target.value)}
                  rows={3}
                  placeholder="Observaciones relevantes sobre el alumno..."
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', resize: 'vertical' }}
                />
              </div>

              {/* Sección Familiar / Tutor */}
              <div style={{ padding: '1rem', background: 'var(--surface-alt)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={hasParent}
                    onChange={(e) => setHasParent(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <span>👨‍👧 Asignar Padre / Tutor (Para menores o cuentas familiares)</span>
                </label>

                {hasParent && (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border)' }}>
                    <div style={{ display: 'flex', gap: '1.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="radio"
                          name="parentOption"
                          value="EXISTING"
                          checked={parentOption === 'EXISTING'}
                          onChange={() => setParentOption('EXISTING')}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        Vincular a Padre/Tutor existente
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="radio"
                          name="parentOption"
                          value="NEW"
                          checked={parentOption === 'NEW'}
                          onChange={() => setParentOption('NEW')}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        Crear nuevo Padre/Tutor
                      </label>
                    </div>

                    {parentOption === 'EXISTING' ? (
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Selecciona el tutor de la lista</label>
                        <input
                          type="search"
                          value={parentSearchTerm}
                          onChange={(e) => setParentSearchTerm(e.target.value)}
                          placeholder="Filtrar tutor por nombre, DNI o correo..."
                          style={{ width: '100%', marginBottom: '0.5rem', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }}
                        />
                        <select
                          value={selectedParentId}
                          onChange={(e) => setSelectedParentId(e.target.value)}
                          required={hasParent && parentOption === 'EXISTING'}
                          style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }}
                        >
                          <option value="">-- Seleccionar Padre/Tutor --</option>
                          {filteredParents.length === 0 ? (
                            <option value="" disabled>No hay tutores activos que coincidan</option>
                          ) : filteredParents.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.profile?.firstName} {p.profile?.lastName} ({p.email}) - {p.children?.length || 0} hijos
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <input
                            type="text"
                            placeholder="Nombre del Padre/Tutor *"
                            required={hasParent && parentOption === 'NEW'}
                            value={newParentFirstName}
                            onChange={(e) => setNewParentFirstName(e.target.value)}
                            style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                          />
                          <input
                            type="text"
                            placeholder="Apellidos del Padre/Tutor *"
                            required={hasParent && parentOption === 'NEW'}
                            value={newParentLastName}
                            onChange={(e) => setNewParentLastName(e.target.value)}
                            style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <input
                            type="email"
                            placeholder="Correo del Tutor (Para acceso a pagos y notas) *"
                            required={hasParent && parentOption === 'NEW'}
                            value={newParentEmail}
                            onChange={(e) => setNewParentEmail(e.target.value)}
                            style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                          />
                          <input
                            type="tel"
                            placeholder="Teléfono del Tutor"
                            value={newParentPhone}
                            onChange={(e) => setNewParentPhone(e.target.value)}
                            style={{ width: '160px', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="DNI / NIE del Tutor (para facturas)"
                          value={newParentDni}
                          onChange={(e) => setNewParentDni(e.target.value)}
                          style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '0.7rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.7rem 1.5rem' }}>
                  Crear y Enviar Credenciales
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Alumno */}
      {editingStudent && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1rem'
        }}>
          <div className="glass-panel modal-card modal-card--wide" style={{ width: '100%', maxWidth: '900px', maxHeight: '92vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 style={{ color: 'var(--primary)' }} /> Editar Ficha del Alumno
              </h3>
              <button onClick={() => setEditingStudent(null)} className="modal-close" aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Nombre *</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>DNI / NIE</label>
                  <input
                    type="text"
                    value={editDni}
                    onChange={(e) => setEditDni(e.target.value)}
                    placeholder="12345678Z"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="600123456"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Dirección Completa</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Calle, número, piso, ciudad"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Padre / Tutor Responsable</label>
                <input
                  type="search"
                  value={parentSearchTerm}
                  onChange={(e) => setParentSearchTerm(e.target.value)}
                  placeholder="Filtrar tutor por nombre, DNI o correo..."
                  style={{ width: '100%', marginBottom: '0.5rem', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                />
                <select
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                >
                  <option value="">-- Sin tutor asignado (Alumno Independiente) --</option>
                  {filteredParents.length === 0 ? (
                    <option value="" disabled>No hay tutores activos que coincidan</option>
                  ) : filteredParents.map(p => (
                    <option key={p.id} value={p.id}>
                      👨‍👧 {p.profile?.firstName} {p.profile?.lastName} ({p.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Modalidad</label>
                  <select
                    required
                    value={editModality}
                    onChange={(e) => setEditModality(e.target.value as 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO')}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  >
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="ONLINE">Online</option>
                    <option value="HIBRIDO">Híbrido</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Curso Escolar</label>
                  <input
                    type="text"
                    value={editCursoEscolar}
                    onChange={(e) => setEditCursoEscolar(e.target.value)}
                    placeholder="5º Primaria"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Alergias</label>
                  <input
                    type="text"
                    value={editAlergias}
                    onChange={(e) => setEditAlergias(e.target.value)}
                    placeholder="No / Polen / Lactosa"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Autorización Imagen</label>
                <select
                  value={editAutorizacionImagen}
                  onChange={(e) => setEditAutorizacionImagen(e.target.value as ImageAuthorizationOption)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                >
                  {IMAGE_AUTHORIZATION_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Observaciones</label>
                <textarea
                  value={editObservaciones}
                  onChange={(e) => setEditObservaciones(e.target.value)}
                  rows={3}
                  placeholder="Observaciones relevantes sobre el alumno..."
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', resize: 'vertical' }}
                />
              </div>

              {editingStudent.academyEnrollments?.some((enrollment) => !enrollment.endDate) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 130px', gap: '0.75rem', padding: '0.9rem', border: '1px solid var(--primary-border)', borderRadius: '8px', background: 'var(--primary-subtle)' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Tipo de pago</label>
                    <select value={editBillingPeriod} onChange={(event) => setEditBillingPeriod(event.target.value as 'MONTHLY' | 'QUARTERLY')} style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }}>
                      <option value="MONTHLY">Mensual</option>
                      <option value="QUARTERLY">Trimestral</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Importe (€)</label>
                    <input type="number" min="1" step="0.01" required value={editBillingAmount} onChange={(event) => setEditBillingAmount(event.target.value)} style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '0.7rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.7rem 1.5rem' }}>
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación */}
      {deletingStudent && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1rem'
        }}>
          <div className="glass-panel modal-card" style={{ width: '100%', maxWidth: '420px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)' }}>¿Eliminar alumno?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
              Estás a punto de eliminar a <strong>{deletingStudent.profile?.firstName} {deletingStudent.profile?.lastName}</strong> ({deletingStudent.email}). Esta acción no se puede deshacer.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dar de Alta Matrícula */}
      {showAltaModal && selectedStudentForAlta && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1rem'
        }}>
          <div className="glass-panel modal-card" style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.3rem' }}>
                <UserCheck style={{ color: 'var(--primary)' }} /> Nueva Matrícula
              </h3>
              <button onClick={() => { setShowAltaModal(false); setSelectedStudentForAlta(null); }} className="modal-close" aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Dando de alta a: <strong>{selectedStudentForAlta.profile?.firstName} {selectedStudentForAlta.profile?.lastName}</strong> ({selectedStudentForAlta.email})
            </p>

            <form onSubmit={handleAlta} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 130px', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Periodicidad</label>
                  <select value={newBillingPeriod} onChange={(e) => setNewBillingPeriod(e.target.value as 'MONTHLY' | 'QUARTERLY')} style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}>
                    <option value="MONTHLY">Mensual</option>
                    <option value="QUARTERLY">Trimestral</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Importe (€)</label>
                  <input type="number" min="1" step="0.01" required value={newMonthlyFee} onChange={(e) => setNewMonthlyFee(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Fecha de Alta</label>
                <input
                  type="date"
                  required
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowAltaModal(false); setSelectedStudentForAlta(null); }}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '0.7rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.7rem 1.5rem' }}>
                  Dar de Alta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManagement;

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  Users,
  Edit2,
  UserX,
  CheckCircle2,
  RefreshCw,
  X,
  CreditCard
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import ModalityBadge from '../components/ModalityBadge';

interface EnrollmentStudent {
  id: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  modality: 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO';
  profile?: {
    firstName: string;
    lastName: string;
    dni?: string | null;
    phone?: string | null;
  } | null;
  parent?: {
    profile?: {
      firstName: string;
      lastName: string;
      dni?: string | null;
      phone?: string | null;
    } | null;
  } | null;
}

interface EnrollmentItem {
  id: string;
  studentId: string;
  academicYear: string;
  startDate: string;
  endDate: string | null;
  monthlyFee: number;
  billingPeriod: 'MONTHLY' | 'QUARTERLY';
  modality: 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  hasBook: boolean;
  bookPrice: number | null;
  student: EnrollmentStudent;
}

const EnrollmentsManagement: React.FC = () => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [periodicityFilter, setPeriodicityFilter] = useState<'ALL' | 'MONTHLY' | 'QUARTERLY'>('ALL');
  const [modalityFilter, setModalityFilter] = useState<'ALL' | 'PRESENCIAL' | 'ONLINE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Modal Editar Matrícula
  const [editingEnrollment, setEditingEnrollment] = useState<EnrollmentItem | null>(null);
  const [editMonthlyFee, setEditMonthlyFee] = useState<string>('35');
  const [editBillingPeriod, setEditBillingPeriod] = useState<'MONTHLY' | 'QUARTERLY'>('MONTHLY');
  const [editModality, setEditModality] = useState<'PRESENCIAL' | 'ONLINE' | 'HIBRIDO'>('PRESENCIAL');
  const [editHasBook, setEditHasBook] = useState(false);
  const [editBookPrice, setEditBookPrice] = useState<string>('35');
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal Rollover / Nuevo Curso
  const [showRolloverModal, setShowRolloverModal] = useState(false);
  const [rolloverFromYear, setRolloverFromYear] = useState('');
  const [rolloverToYear, setRolloverToYear] = useState('');
  const [rolloverSelectedIds, setRolloverSelectedIds] = useState<string[]>([]);
  const [rolloverDefaultFee, setRolloverDefaultFee] = useState('65');
  const [submittingRollover, setSubmittingRollover] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchAcademicYears = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/payments/academic-years`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const years: string[] = await res.json();
        setAcademicYears(years);
        if (years.length > 0 && selectedAcademicYear === 'ALL') {
          setSelectedAcademicYear(years[0]);
        }
      }
    } catch (err) {
      console.error('Error obteniendo cursos escolares:', err);
    }
  };

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const yearParam = selectedAcademicYear !== 'ALL' ? `?academicYear=${selectedAcademicYear}` : '';
      const res = await fetch(`${apiUrl}/api/enrollments/all${yearParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'No se pudieron cargar las matrículas.');
        return;
      }

      const data: EnrollmentItem[] = await res.json();
      setEnrollments(data);
    } catch (err) {
      console.error('Error cargando matrículas:', err);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    fetchEnrollments();
  }, [selectedAcademicYear]);

  const handleOpenEdit = (enr: EnrollmentItem) => {
    setEditingEnrollment(enr);
    setEditMonthlyFee(String(enr.monthlyFee));
    setEditBillingPeriod(enr.billingPeriod);
    setEditModality(enr.modality);
    setEditHasBook(Boolean(enr.hasBook));
    setEditBookPrice(enr.bookPrice ? String(enr.bookPrice) : '35');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEnrollment) return;

    try {
      setSavingEdit(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const res = await fetch(`${apiUrl}/api/enrollments/${editingEnrollment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          monthlyFee: Number(editMonthlyFee),
          billingPeriod: editBillingPeriod,
          modality: editModality,
          hasBook: editHasBook,
          bookPrice: editHasBook ? Number(editBookPrice) : null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Error al actualizar matrícula');
        return;
      }

      showToast('Matrícula y calendario de pagos actualizados con éxito.');
      setEditingEnrollment(null);
      fetchEnrollments();
    } catch (err) {
      showToast('Error de conexión al actualizar matrícula');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDropEnrollment = async (enr: EnrollmentItem) => {
    const studentName = `${enr.student.profile?.firstName || ''} ${enr.student.profile?.lastName || ''}`.trim() || enr.student.email;
    if (!window.confirm(`¿Confirmas la baja de la matrícula de ${studentName}? Se detendrán los pagos futuros y el alumno pasará al histórico de bajas.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const res = await fetch(`${apiUrl}/api/enrollments/unenroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ studentId: enr.studentId })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Error al dar de baja matrícula');
        return;
      }

      showToast('Matrícula cerrada y alumno archivado en histórico.');
      fetchEnrollments();
    } catch (err) {
      showToast('Error de conexión al procesar la baja');
    }
  };

  const handleOpenRollover = () => {
    const from = selectedAcademicYear !== 'ALL' ? selectedAcademicYear : (academicYears[0] || '2024-2025');
    const [yStart] = from.split('-');
    const to = `${Number(yStart) + 1}-${Number(yStart) + 2}`;
    setRolloverFromYear(from);
    setRolloverToYear(to);

    // Preseleccionar alumnos activos del curso from
    const activeStudentIds = enrollments
      .filter(e => (from === 'ALL' || e.academicYear === from) && e.status === 'ACTIVE')
      .map(e => e.studentId);
    setRolloverSelectedIds(Array.from(new Set(activeStudentIds)));
    setShowRolloverModal(true);
  };

  const handleExecuteRollover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rolloverSelectedIds.length === 0) {
      alert('Debes seleccionar al menos un alumno para renovar.');
      return;
    }

    try {
      setSubmittingRollover(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const res = await fetch(`${apiUrl}/api/enrollments/rollover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fromYear: rolloverFromYear,
          toYear: rolloverToYear,
          studentIds: rolloverSelectedIds,
          defaultFee: Number(rolloverDefaultFee)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Error al renovar curso');
        return;
      }

      showToast(data.message || 'Curso renovado con éxito');
      setShowRolloverModal(false);
      setSelectedAcademicYear(rolloverToYear);
      fetchAcademicYears();
      fetchEnrollments();
    } catch (err) {
      showToast('Error de conexión al ejecutar renovación');
    } finally {
      setSubmittingRollover(false);
    }
  };

  // Filtrado de matrículas
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((enr) => {
      if (statusFilter !== 'ALL') {
        const isEnrActive = enr.status === 'ACTIVE' && !enr.endDate;
        if (statusFilter === 'ACTIVE' && !isEnrActive) return false;
        if (statusFilter === 'INACTIVE' && isEnrActive) return false;
      }

      if (periodicityFilter !== 'ALL' && enr.billingPeriod !== periodicityFilter) {
        return false;
      }

      if (modalityFilter !== 'ALL' && enr.modality !== modalityFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${enr.student.profile?.firstName || ''} ${enr.student.profile?.lastName || ''}`.toLowerCase();
        const email = enr.student.email.toLowerCase();
        const dni = (enr.student.profile?.dni || '').toLowerCase();
        if (!fullName.includes(q) && !email.includes(q) && !dni.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [enrollments, statusFilter, periodicityFilter, modalityFilter, searchQuery]);

  // Métricas
  const totalActivas = useMemo(
    () => enrollments.filter(e => e.status === 'ACTIVE' && !e.endDate).length,
    [enrollments]
  );
  const totalPresencial = useMemo(
    () => enrollments.filter(e => e.status === 'ACTIVE' && !e.endDate && e.modality === 'PRESENCIAL').length,
    [enrollments]
  );
  const totalOnline = useMemo(
    () => enrollments.filter(e => e.status === 'ACTIVE' && !e.endDate && e.modality === 'ONLINE').length,
    [enrollments]
  );
  const totalLibros = useMemo(
    () => enrollments.filter(e => e.status === 'ACTIVE' && !e.endDate && e.hasBook).length,
    [enrollments]
  );

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: '#065f46',
          color: '#ffffff',
          padding: '0.85rem 1.4rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.92rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} /> {toastMessage}
        </div>
      )}

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.65rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <GraduationCap style={{ color: '#ea580c' }} size={26} /> Gestión de Matrículas
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Auditoría de altas, periodicidad de cobro, libros de texto y sincronización de cuotas.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Curso:</label>
            <CustomSelect
              value={selectedAcademicYear}
              onChange={(val) => setSelectedAcademicYear(val)}
              options={[
                { value: 'ALL', label: 'Todos los cursos' },
                ...academicYears.map(y => ({ value: y, label: `Curso ${y}` }))
              ]}
              size="sm"
              triggerStyle={{ minWidth: '145px' }}
            />
          </div>

          <button
            type="button"
            onClick={handleOpenRollover}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              fontSize: '0.88rem',
              background: '#ea580c',
              borderColor: '#ea580c'
            }}
          >
            <RefreshCw size={16} /> Apertura / Nuevo Curso
          </button>
        </div>
      </header>

      {/* Métricas Bento Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', background: '#fff' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>MATRÍCULAS ACTIVAS</p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '1.6rem', fontWeight: 700, color: '#047857' }}>{totalActivas}</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', background: '#fff' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>ALUMNOS PRESENCIALES</p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '1.6rem', fontWeight: 700, color: '#1682b3' }}>{totalPresencial}</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', background: '#fff' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>ALUMNOS ONLINE</p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '1.6rem', fontWeight: 700, color: '#7950b8' }}>{totalOnline}</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', background: '#fff' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>CON LIBRO / MATERIAL</p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '1.6rem', fontWeight: 700, color: '#b45309' }}>{totalLibros}</p>
        </div>
      </div>

      {/* Filtros y Buscador */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', background: '#fff', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '340px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por alumno, email o DNI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.8rem 0.5rem 2.1rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface-alt)',
              fontSize: '0.88rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
            options={[
              { value: 'ALL', label: 'Todos los estados' },
              { value: 'ACTIVE', label: 'Matrículas Activas' },
              { value: 'INACTIVE', label: 'Bajas / Inactivas' }
            ]}
            size="sm"
            triggerStyle={{ minWidth: '150px' }}
          />

          <CustomSelect
            value={periodicityFilter}
            onChange={(val) => setPeriodicityFilter(val as any)}
            options={[
              { value: 'ALL', label: 'Periodicidad (Todas)' },
              { value: 'MONTHLY', label: 'Mensual' },
              { value: 'QUARTERLY', label: 'Trimestral' }
            ]}
            size="sm"
            triggerStyle={{ minWidth: '160px' }}
          />

          <CustomSelect
            value={modalityFilter}
            onChange={(val) => setModalityFilter(val as any)}
            options={[
              { value: 'ALL', label: 'Modalidad (Todas)' },
              { value: 'PRESENCIAL', label: 'Presencial' },
              { value: 'ONLINE', label: 'Online' }
            ]}
            size="sm"
            triggerStyle={{ minWidth: '150px' }}
          />
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* Tabla de Matrículas */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', background: '#fff' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>ALUMNO</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>MODALIDAD</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>PERIODICIDAD</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>CUOTA MENSUAL</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>LIBRO / MATERIAL</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>FECHA ALTA</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>ESTADO</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Cargando matrículas...
                  </td>
                </tr>
              ) : filteredEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Users size={40} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
                    <p style={{ margin: 0 }}>No se encontraron matrículas con los filtros seleccionados.</p>
                  </td>
                </tr>
              ) : (
                filteredEnrollments.map((enr) => {
                  const studentName = `${enr.student.profile?.firstName || ''} ${enr.student.profile?.lastName || ''}`.trim() || 'Alumno';
                  const isActive = enr.status === 'ACTIVE' && !enr.endDate;

                  return (
                    <tr
                      key={enr.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: isActive ? 'transparent' : 'rgba(241, 245, 249, 0.5)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                          {studentName}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {enr.student.email} {enr.student.profile?.dni ? `· DNI: ${enr.student.profile.dni}` : ''}
                        </div>
                      </td>

                      <td style={{ padding: '0.9rem 1rem' }}>
                        <ModalityBadge modality={enr.modality} />
                      </td>

                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          background: enr.billingPeriod === 'QUARTERLY' ? '#ede9fe' : '#ecfdf5',
                          color: enr.billingPeriod === 'QUARTERLY' ? '#6d28d9' : '#047857'
                        }}>
                          {enr.billingPeriod === 'QUARTERLY' ? 'Trimestral' : 'Mensual'}
                        </span>
                      </td>

                      <td style={{ padding: '0.9rem 1rem' }}>
                        <strong style={{ color: 'var(--text-main)', fontSize: '0.94rem' }}>
                          {enr.monthlyFee.toFixed(2)} €
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}> / mes</span>
                      </td>

                      <td style={{ padding: '0.9rem 1rem' }}>
                        {enr.hasBook ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            background: '#fffbeb',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                            fontSize: '0.78rem',
                            fontWeight: 600
                          }}>
                            📚 {enr.bookPrice ? `${enr.bookPrice.toFixed(2)} €` : 'Incluido'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No incluye</span>
                        )}
                      </td>

                      <td style={{ padding: '0.9rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {new Date(enr.startDate).toLocaleDateString('es-ES')}
                        {enr.endDate && (
                          <div style={{ color: '#be123c', fontSize: '0.74rem' }}>
                            Baja: {new Date(enr.endDate).toLocaleDateString('es-ES')}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: isActive ? '#ecfdf5' : '#f1f5f9',
                          color: isActive ? '#047857' : '#64748b',
                          border: `1px solid ${isActive ? '#a7f3d0' : '#cbd5e1'}`
                        }}>
                          {isActive ? '✓ Activa' : 'Baja'}
                        </span>
                      </td>

                      <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => navigate(`/teacher/payments?student=${encodeURIComponent(studentName)}`)}
                            title="Ver estado de pagos y mensualidades"
                            style={{
                              background: 'var(--surface-alt)',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.55rem',
                              cursor: 'pointer',
                              color: 'var(--text-main)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.78rem'
                            }}
                          >
                            <CreditCard size={14} /> Pagos
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(enr)}
                            title="Editar periodicidad, cuota o libro"
                            style={{
                              background: 'var(--surface-alt)',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.55rem',
                              cursor: 'pointer',
                              color: 'var(--primary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.78rem'
                            }}
                          >
                            <Edit2 size={14} /> Editar
                          </button>

                          {isActive && (
                            <button
                              type="button"
                              onClick={() => handleDropEnrollment(enr)}
                              title="Dar de baja matrícula"
                              style={{
                                background: '#fff1f2',
                                border: '1px solid #fecdd3',
                                borderRadius: '6px',
                                padding: '0.35rem 0.55rem',
                                cursor: 'pointer',
                                color: '#be123c',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.78rem'
                              }}
                            >
                              <UserX size={14} /> Baja
                            </button>
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

      {/* Modal: Editar Matrícula */}
      {editingEnrollment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '1.75rem', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={20} style={{ color: 'var(--primary)' }} /> Modificar Matrícula
              </h3>
              <button
                type="button"
                onClick={() => setEditingEnrollment(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Alumno: <strong style={{ color: 'var(--text-main)' }}>{editingEnrollment.student.profile?.firstName} {editingEnrollment.student.profile?.lastName}</strong> ({editingEnrollment.student.email})
            </p>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Modalidad</label>
                <CustomSelect<'PRESENCIAL' | 'ONLINE' | 'HIBRIDO'>
                  value={editModality}
                  onChange={(val) => setEditModality(val)}
                  options={[
                    { value: 'PRESENCIAL', label: 'Presencial' },
                    { value: 'ONLINE', label: 'Online' },
                    { value: 'HIBRIDO', label: 'Híbrido' }
                  ]}
                  variant="subtle"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 130px', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Periodicidad</label>
                  <CustomSelect<'MONTHLY' | 'QUARTERLY'>
                    value={editBillingPeriod}
                    onChange={(val) => setEditBillingPeriod(val)}
                    options={[
                      { value: 'MONTHLY', label: 'Mensual' },
                      { value: 'QUARTERLY', label: 'Trimestral' }
                    ]}
                    variant="subtle"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Cuota Mensual (€)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={editMonthlyFee}
                    onChange={(e) => setEditMonthlyFee(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              {/* Checkbox Material / Libro */}
              <div style={{ padding: '0.85rem', borderRadius: '8px', border: '1px solid #fde68a', background: editHasBook ? '#fffbeb' : '#fafafa', transition: 'background 0.2s' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: editHasBook ? '#92400e' : 'var(--text-main)' }}>
                  <input
                    type="checkbox"
                    checked={editHasBook}
                    onChange={(e) => setEditHasBook(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span>📚 Incluir Material / Libro de texto</span>
                </label>

                {editHasBook && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #fde68a' }}>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: '#92400e' }}>
                      Precio del Libro / Material (€)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required={editHasBook}
                      value={editBookPrice}
                      onChange={(e) => setEditBookPrice(e.target.value)}
                      placeholder="35.00"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #fde68a', background: '#fff', color: 'var(--text-main)', fontSize: '0.9rem' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingEnrollment(null)}
                  style={{ background: 'none', border: '1px solid var(--border)', padding: '0.65rem 1.1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-main)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-primary"
                  style={{ padding: '0.65rem 1.4rem' }}
                >
                  {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Apertura de Nuevo Curso / Rollover */}
      {showRolloverModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '1.75rem', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={20} style={{ color: '#ea580c' }} /> Apertura y Renovación de Curso Escolar
              </h3>
              <button
                type="button"
                onClick={() => setShowRolloverModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
              Permite renovar limpiamente a los alumnos que continúan para el nuevo curso escolar sin perder los historiales ni facturas del curso anterior.
            </p>

            <form onSubmit={handleExecuteRollover} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Curso Origen</label>
                  <input
                    type="text"
                    disabled
                    value={rolloverFromYear}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Nuevo Curso Lectivo</label>
                  <input
                    type="text"
                    required
                    value={rolloverToYear}
                    onChange={(e) => setRolloverToYear(e.target.value)}
                    placeholder="2025-2026"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: '#fff', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Cuota Base para el Nuevo Curso (€)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={rolloverDefaultFee}
                  onChange={(e) => setRolloverDefaultFee(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: '#fff', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Alumnos a Renovar ({rolloverSelectedIds.length} seleccionados)
                </label>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem', background: 'var(--surface-alt)' }}>
                  {enrollments
                    .filter(e => (rolloverFromYear === 'ALL' || e.academicYear === rolloverFromYear) && e.status === 'ACTIVE')
                    .map((enr) => {
                      const isChecked = rolloverSelectedIds.includes(enr.studentId);
                      const name = `${enr.student.profile?.firstName || ''} ${enr.student.profile?.lastName || ''}`.trim() || enr.student.email;

                      return (
                        <label key={enr.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRolloverSelectedIds(prev => [...prev, enr.studentId]);
                              } else {
                                setRolloverSelectedIds(prev => prev.filter(id => id !== enr.studentId));
                              }
                            }}
                            style={{ accentColor: 'var(--primary)' }}
                          />
                          <span>{name} ({enr.monthlyFee}€/mes)</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowRolloverModal(false)}
                  style={{ background: 'none', border: '1px solid var(--border)', padding: '0.65rem 1.1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-main)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingRollover}
                  className="btn-primary"
                  style={{ padding: '0.65rem 1.4rem', background: '#ea580c', borderColor: '#ea580c' }}
                >
                  {submittingRollover ? 'Procesando...' : 'Confirmar Renovaciones'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrollmentsManagement;

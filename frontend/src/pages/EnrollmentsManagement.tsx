import React, { useState, useEffect } from 'react';
import {
  Search,
  Check,
  X,
  AlertTriangle,
  FileText,
  UserCheck,
  UserMinus
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Student {
  id: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  profile?: {
    firstName: string;
    lastName: string;
    dni?: string | null;
    phone?: string | null;
  };
  academyEnrollments?: {
    id: string;
    monthlyFee: number;
    billingPeriod?: 'MONTHLY' | 'QUARTERLY';
    startDate: string;
    endDate: string | null;
    paymentStatuses?: { month: number; year: number; amount: number; isPaid: boolean }[];
  }[];
  paymentStatuses?: { month: number; year: number; amount: number; isPaid: boolean }[];
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const EnrollmentsManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [showAltaModal, setShowAltaModal] = useState(false);
  const [selectedStudentForAlta, setSelectedStudentForAlta] = useState<Student | null>(null);
  const [newMonthlyFee, setNewMonthlyFee] = useState('35');
  const [newBillingPeriod, setNewBillingPeriod] = useState<'MONTHLY' | 'QUARTERLY'>('MONTHLY');
  const [newStartDate, setNewStartDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchStudents();
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
    if (!window.confirm(`¿Estás seguro de que deseas dar de baja a ${student.profile?.firstName} ${student.profile?.lastName}? Se detendrá la generación de sus pagos.`)) {
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
          studentId: student.id,
          endDate: new Date().toISOString()
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
    // Only current unpaid payments
    const unpaid = student.paymentStatuses?.filter(p => !p.isPaid) || [];
    
    if (unpaid.length === 0) {
      showToast('Este alumno no tiene pagos pendientes.', 'error');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Informe de Impagos', 14, 22);

    doc.setFontSize(12);
    doc.text(`Alumno: ${student.profile?.firstName} ${student.profile?.lastName}`, 14, 32);
    if (student.profile?.dni) {
      doc.text(`DNI: ${student.profile.dni}`, 14, 40);
    }

    const tableData = unpaid.map(p => {
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return [
        `${monthNames[p.month - 1]} ${p.year}`,
        `${p.amount} €`
      ];
    });

    autoTable(doc, {
      startY: 50,
      head: [['Periodo', 'Importe Pendiente']],
      body: tableData,
    });

    doc.save(`Impagos_${student.profile?.firstName}_${student.profile?.lastName}.pdf`);
  };

  const filteredStudents = students.filter(s => {
    const fullName = `${s.profile?.firstName || ''} ${s.profile?.lastName || ''}`.toLowerCase();
    const query = searchTerm.toLowerCase();
    return !query || fullName.includes(query);
  });

  return (
    <div className="page-container">
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText style={{ color: 'var(--primary)' }} /> Gestión de Matrículas
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Da de alta y baja a los alumnos en el sistema para gestionar su facturación.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', maxWidth: '440px', width: '100%' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="search"
            placeholder="Buscar alumno por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.92rem', outline: 'none', boxShadow: 'var(--shadow-sm)' }}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem' }}>ALUMNO</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem' }}>ESTADO</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem' }}>MATRÍCULA ACTIVA</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem', textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Cargando matrículas...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No se encontraron alumnos.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const activeEnrollment = s.academyEnrollments?.find(e => !e.endDate);
                  const hasUnpaid = s.paymentStatuses?.some(p => !p.isPaid);

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s ease' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                          {s.profile?.firstName} {s.profile?.lastName}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{s.email}</div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        {s.status === 'ACTIVE' ? (
                          <span style={{ padding: '0.35rem 0.65rem', background: '#dcfce7', color: '#166534', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600 }}>Alta</span>
                        ) : (
                          <span style={{ padding: '0.35rem 0.65rem', background: '#fee2e2', color: '#991b1b', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600 }}>Baja</span>
                        )}
                      </td>

                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-main)' }}>
                        {activeEnrollment ? (
                          <span style={{ fontSize: '0.88rem' }}>
                            Desde {new Date(activeEnrollment.startDate).toLocaleDateString()} - {activeEnrollment.monthlyFee}€ / {activeEnrollment.billingPeriod === 'QUARTERLY' ? 'trimestre' : 'mes'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.82rem' }}>Sin matrícula activa</span>
                        )}
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem' }}>
                          {hasUnpaid && s.status === 'INACTIVE' && (
                             <button
                               onClick={() => downloadUnpaidPDF(s)}
                               title="Descargar PDF de Impagos"
                               style={{
                                 background: '#fee2e2',
                                 border: '1px solid #f87171',
                                 borderRadius: '6px',
                                 padding: '0.4rem 0.8rem',
                                 cursor: 'pointer',
                                 color: '#991b1b',
                                 display: 'flex',
                                 alignItems: 'center',
                                 gap: '0.4rem',
                                 fontSize: '0.8rem',
                                 fontWeight: 'bold'
                               }}
                             >
                               <FileText size={14} /> PDF Impagos
                             </button>
                          )}
                          {s.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleBaja(s)}
                              title="Dar de Baja"
                              style={{
                                background: 'transparent',
                                border: '1px solid #f87171',
                                borderRadius: '6px',
                                padding: '0.4rem 0.8rem',
                                cursor: 'pointer',
                                color: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontSize: '0.8rem'
                              }}
                            >
                              <UserMinus size={14} /> Dar de Baja
                            </button>
                          ) : (
                            <button
                              onClick={() => { setSelectedStudentForAlta(s); setShowAltaModal(true); }}
                              title="Dar de Alta"
                              style={{
                                background: 'transparent',
                                border: '1px solid #4ade80',
                                borderRadius: '6px',
                                padding: '0.4rem 0.8rem',
                                cursor: 'pointer',
                                color: '#16a34a',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontSize: '0.8rem'
                              }}
                            >
                              <UserCheck size={14} /> Dar de Alta
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

      {/* Modal: Dar de Alta */}
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
          <div className="glass-panel modal-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.3rem' }}>
                <UserCheck style={{ color: 'var(--primary)' }} /> Nueva Matrícula
              </h3>
              <button onClick={() => setShowAltaModal(false)} className="modal-close" aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>
              Dando de alta a: <strong>{selectedStudentForAlta.profile?.firstName} {selectedStudentForAlta.profile?.lastName}</strong>
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
                  onClick={() => setShowAltaModal(false)}
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

export default EnrollmentsManagement;

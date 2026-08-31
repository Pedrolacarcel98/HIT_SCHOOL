import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GraduationCap, MessageCircle, Pencil, Search, Send, Trash2, UserRound, Users, X } from 'lucide-react';
import { useParent } from '../context/ParentContext';

type ChatRole = 'TEACHER' | 'STUDENT';

interface ContactUser {
  id: string;
  contactKey?: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  courseTitle?: string;
  role: 'TEACHER' | 'STUDENT' | 'PARENT';
  studentName?: string;
  studentId?: string;
  subtitle?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: 'TEACHER' | 'STUDENT' | 'PARENT';
  senderName?: string;
  studentId?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getCurrentUserId = () => {
  const storedUserId = localStorage.getItem('userId');
  if (storedUserId) return storedUserId;
  try {
    const token = localStorage.getItem('token');
    if (!token) return '';
    const payload = JSON.parse(atob(token.split('.')[1])) as { id?: string };
    return payload.id || '';
  } catch {
    return '';
  }
};

const getInitials = (name: string) =>
  name
    .replace(/[\(\)]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

const getDisplayName = (contact?: { name: string; role: string } | null, viewerRole?: string | null) => {
  if (!contact) return 'Usuario';
  if (contact.role === 'TEACHER' && viewerRole !== 'TEACHER' && viewerRole !== 'ADMIN') {
    return 'Profesor';
  }
  return contact.name;
};

const Chat: React.FC<{ role: ChatRole }> = ({ role }) => {
  const currentUserId = getCurrentUserId();
  const userRole = localStorage.getItem('userRole');
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { selectedStudent, selectedStudentId } = useParent();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Cargar lista de contactos (Alumnos para Profesor, Profesores para Alumno/Tutor)
  useEffect(() => {
    const loadContacts = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        const studentParam = (userRole === 'PARENT' && selectedStudentId) ? `?studentId=${selectedStudentId}` : '';
        const res = await fetch(`${apiUrl}/api/chat/contacts${studentParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          throw new Error('No se pudieron cargar los contactos de chat.');
        }

        const data = await res.json() as ContactUser[];
        setContacts(data);

        // Seleccionar automáticamente el primer contacto disponible si no hay ninguno seleccionado
        if (data.length > 0) {
          setSelectedContactId(prev => {
            const exists = data.some(c => (c.contactKey || c.id) === prev || c.id === prev);
            return exists ? prev : (data[0].contactKey || data[0].id);
          });
        } else {
          setSelectedContactId('');
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Error al cargar contactos de chat.');
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [role, selectedStudentId, userRole]);

  const selectedContact = useMemo(() => {
    return contacts.find(c => (c.contactKey || c.id) === selectedContactId) || contacts.find(c => c.id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

  const targetStudentIdForChat = useMemo(() => {
    if (selectedContact?.studentId) {
      return selectedContact.studentId;
    }
    if (userRole === 'PARENT') {
      return selectedStudentId;
    }
    if (userRole === 'STUDENT') {
      return currentUserId;
    }
    if (selectedContact?.role === 'STUDENT') {
      return selectedContact.id;
    }
    return '';
  }, [selectedContact, selectedStudentId, userRole, currentUserId]);

  const filteredContacts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.email.toLowerCase().includes(q) ||
      (c.courseTitle && c.courseTitle.toLowerCase().includes(q)) ||
      (c.studentName && c.studentName.toLowerCase().includes(q)) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(q))
    );
  }, [contacts, searchTerm]);

  // 2. Cargar mensajes de la conversación activa y habilitar polling en tiempo real
  const loadMessages = async (silent = false) => {
    if (!selectedContact) {
      setMessages([]);
      return;
    }

    try {
      if (!silent) setError('');
      const token = localStorage.getItem('token');
      const studentParam = targetStudentIdForChat ? `&studentId=${encodeURIComponent(targetStudentIdForChat)}` : '';
      const res = await fetch(`${apiUrl}/api/chat?partnerId=${encodeURIComponent(selectedContact.id)}${studentParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json() as ChatMessage[];
        setMessages(data);
      } else if (!silent) {
        throw new Error('No se pudo cargar la conversación.');
      }
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Error al cargar mensajes.');
      }
    }
  };

  useEffect(() => {
    if (!selectedContact) {
      setMessages([]);
      return;
    }

    // Carga inicial
    loadMessages();

    // Polling en segundo plano cada 3.5 segundos para mensajes nuevos en vivo
    const interval = setInterval(() => {
      loadMessages(true);
    }, 3500);

    return () => clearInterval(interval);
  }, [selectedContact?.id, selectedContact?.contactKey, targetStudentIdForChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !selectedContact || !currentUserId) return;

    try {
      const token = localStorage.getItem('token');
      const payload: Record<string, any> = editingMessageId
        ? { content }
        : {
            recipientId: selectedContact.id,
            content,
            studentId: targetStudentIdForChat || undefined
          };

      const res = await fetch(`${apiUrl}/api/chat${editingMessageId ? `/${editingMessageId}` : ''}`, {
        method: editingMessageId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('No se pudo enviar el mensaje.');
      }

      if (editingMessageId) {
        setMessages(current => current.map(m => m.id === editingMessageId ? { ...m, content, updatedAt: new Date().toISOString() } : m));
        setEditingMessageId(null);
      } else {
        const savedMessage = await res.json() as ChatMessage;
        setMessages(current => [...current, savedMessage]);
      }
      setDraft('');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al enviar el mensaje.');
    }
  };

  const startEditing = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setDraft(message.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setDraft('');
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/chat/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('No se pudo eliminar el mensaje.');

      setMessages(current => current.filter(m => m.id !== messageId));
      if (editingMessageId === messageId) cancelEditing();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al eliminar el mensaje.');
    }
  };

  const activeStudentName = selectedStudent?.profile?.firstName || 'Alumno';

  return (
    <div className="page-container animate-fade-in">
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <MessageCircle style={{ color: 'var(--primary)' }} />
          {role === 'TEACHER'
            ? 'Chat Alumnos'
            : userRole === 'PARENT'
              ? `Chat con Profesor de ${activeStudentName}`
              : 'Chat con Profesor'}
        </h1>
        <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>
          {role === 'TEACHER' 
            ? 'Canal directo y privado con tus alumnos matriculados.' 
            : userRole === 'PARENT'
              ? `Canal directo y privado con el profesor asignado a ${activeStudentName}.`
              : 'Canal directo y privado con tu profesor asignado.'}
        </p>
      </header>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.8rem 1rem', border: '1px solid #f7caca', borderRadius: '8px', background: '#fdf0f0', color: '#9e2a2b', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <div className="chat-layout" style={{
        display: 'grid',
        gridTemplateColumns: (role === 'TEACHER' || contacts.length > 1) ? 'minmax(250px, 320px) 1fr' : '1fr',
        minHeight: '600px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-md)'
      }}>
        {/* Barra Lateral de Contactos (Para Profesores o Alumnos con múltiples profesores) */}
        {(role === 'TEACHER' || contacts.length > 1) && (
          <aside style={{ borderRight: '1px solid var(--border)', background: 'var(--surface-alt)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
              <label htmlFor="chat-search" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {role === 'TEACHER' ? <><Users size={16} /> Alumnos ({contacts.length})</> : <><GraduationCap size={16} /> Tus Profesores</>}
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="chat-search"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={role === 'TEACHER' ? 'Buscar alumno o tutor...' : 'Buscar profesor...'}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.65rem 0.6rem 2.2rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '0.5rem', flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <p style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center' }}>
                  Cargando contactos...
                </p>
              ) : filteredContacts.length === 0 ? (
                <p style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center' }}>
                  {searchTerm ? 'No se encontraron resultados.' : (role === 'TEACHER' ? 'No hay alumnos registrados.' : 'No tienes profesores asignados.')}
                </p>
              ) : (
                filteredContacts.map(contact => {
                  const contactKey = contact.contactKey || contact.id;
                  const isSelected = selectedContactId === contactKey || selectedContactId === contact.id;

                  return (
                    <button
                      key={contactKey}
                      onClick={() => setSelectedContactId(contactKey)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 0.85rem',
                        marginBottom: '0.35rem',
                        textAlign: 'left',
                        border: isSelected ? '1px solid var(--primary-border)' : '1px solid transparent',
                        borderRadius: '10px',
                        background: isSelected ? 'var(--primary-light)' : 'transparent',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Avatar name={getDisplayName(contact, userRole)} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.92rem', color: isSelected ? 'var(--primary-text)' : 'var(--text-main)' }}>
                            {getDisplayName(contact, userRole)}
                          </strong>
                          {contact.role === 'PARENT' && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '8px', background: '#eaf4ef', color: '#24583e', border: '1px solid #bfe0d0' }}>
                              TUTOR
                            </span>
                          )}
                          {contact.role === 'STUDENT' && role === 'TEACHER' && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '8px', background: 'var(--surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                              Alumno
                            </span>
                          )}
                        </div>
                        <small style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
                          {contact.subtitle || contact.courseTitle || contact.email}
                        </small>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* Área Principal de Conversación */}
        <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
          {/* Header del Contacto Activo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)'
          }}>
            {selectedContact ? (
              <>
                <Avatar name={getDisplayName(selectedContact, userRole)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getDisplayName(selectedContact, userRole)}
                    </strong>
                    {selectedContact.role === 'PARENT' && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: '#eaf4ef',
                        color: '#24583e',
                        border: '1px solid #bfe0d0'
                      }}>
                        TUTOR
                      </span>
                    )}
                    {selectedContact.role === 'STUDENT' && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: 'var(--surface-alt)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)'
                      }}>
                        Alumno
                      </span>
                    )}
                    {userRole === 'PARENT' && selectedContact.role === 'TEACHER' && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: 'var(--primary-light)',
                        color: 'var(--primary-text)',
                        border: '1px solid var(--primary-border)'
                      }}>
                        Profesor de {activeStudentName}
                      </span>
                    )}
                  </div>
                  <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '1px' }}>
                    {selectedContact.role === 'PARENT'
                      ? `${selectedContact.email} ${selectedContact.studentName ? `· Tutor legal de ${selectedContact.studentName}` : ''}`
                      : userRole === 'PARENT'
                        ? `${selectedContact.name} — Profesor de ${activeStudentName}`
                        : (selectedContact.courseTitle ? `${selectedContact.courseTitle} · ${selectedContact.email}` : selectedContact.email)}
                  </small>
                </div>
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                {loading ? 'Cargando conversación...' : (role === 'TEACHER' ? 'Selecciona un alumno o tutor para comenzar.' : (userRole === 'PARENT' ? `${activeStudentName} no tiene profesor asignado.` : 'Selecciona un profesor para comenzar.'))}
              </span>
            )}
          </div>

          {/* Historial de Mensajes */}
          <div style={{
            flex: 1,
            padding: '1.5rem',
            overflowY: 'auto',
            background: 'var(--background)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            {contacts.length === 0 && userRole === 'PARENT' ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', maxWidth: '420px' }}>
                <MessageCircle size={48} style={{ color: 'var(--primary)', opacity: 0.35, marginBottom: '0.75rem' }} />
                <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Sin profesor asignado</h4>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', lineHeight: '1.45' }}>
                  {activeStudentName} no está matriculado/a en ninguna clase con profesor asignado.
                </p>
              </div>
            ) : messages.length === 0 && selectedContact ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                <MessageCircle size={42} style={{ color: 'var(--primary)', opacity: 0.35, marginBottom: '0.75rem' }} />
                <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>No hay mensajes anteriores</h4>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem' }}>
                  Envía el primer mensaje para iniciar la conversación con {getDisplayName(selectedContact, userRole)}.
                </p>
              </div>
            ) : null}

            {messages.map(message => {
              const isMine = message.senderId === currentUserId;

              return (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                    gap: '0.6rem'
                  }}
                >
                  {!isMine && <Avatar name={getDisplayName(selectedContact, userRole)} />}
                  
                  <div style={{
                    maxWidth: 'min(82%, 600px)',
                    padding: '0.85rem 1.1rem',
                    background: isMine ? 'var(--primary-light)' : 'var(--surface)',
                    border: `1px solid ${isMine ? 'var(--primary-border)' : 'var(--border)'}`,
                    borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.94rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: '1.45' }}>
                      {message.content}
                    </p>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '0.5rem',
                      marginTop: '0.4rem',
                      color: isMine ? 'var(--primary-text)' : 'var(--text-muted)',
                      fontSize: '0.72rem'
                    }}>
                      <span>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {message.updatedAt ? ' · editado' : ''}
                      </span>

                      {isMine && (
                        <>
                          <button
                            type="button"
                            title="Editar mensaje"
                            aria-label="Editar mensaje"
                            onClick={() => startEditing(message)}
                            style={iconButtonStyle}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            title="Borrar mensaje"
                            aria-label="Borrar mensaje"
                            onClick={() => deleteMessage(message.id)}
                            style={{ ...iconButtonStyle, color: '#9e2a2b' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Formulario de Envío de Mensaje */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '0.75rem',
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface)'
            }}
          >
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={!selectedContact || contacts.length === 0}
              placeholder={
                contacts.length === 0 && userRole === 'PARENT'
                  ? `${activeStudentName} no tiene profesor asignado`
                  : selectedContact
                    ? `Escribe un mensaje a ${getDisplayName(selectedContact)}... (Enter para enviar)`
                    : 'Selecciona una conversación'
              }
              rows={2}
              style={{
                flex: 1,
                resize: 'vertical',
                minHeight: '44px',
                maxHeight: '130px',
                padding: '0.75rem 1rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--surface-alt)',
                color: 'var(--text-main)',
                fontSize: '0.92rem',
                outline: 'none',
                lineHeight: '1.4',
                opacity: (!selectedContact || contacts.length === 0) ? 0.6 : 1
              }}
            />

            {editingMessageId && (
              <button
                type="button"
                onClick={cancelEditing}
                title="Cancelar edición"
                aria-label="Cancelar edición"
                style={{
                  ...iconButtonStyle,
                  height: '42px',
                  width: '42px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  background: 'var(--surface)'
                }}
              >
                <X size={18} />
              </button>
            )}

            <button
              type="submit"
              disabled={!selectedContact || !draft.trim() || contacts.length === 0}
              className="btn-primary"
              title={editingMessageId ? 'Guardar cambios' : 'Enviar mensaje'}
              aria-label={editingMessageId ? 'Guardar cambios' : 'Enviar mensaje'}
              style={{
                height: '44px',
                width: '48px',
                padding: 0,
                borderRadius: '8px',
                flexShrink: 0,
                opacity: (!selectedContact || !draft.trim() || contacts.length === 0) ? 0.5 : 1
              }}
            >
              <Send size={18} />
            </button>
          </form>
        </section>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .chat-layout {
            grid-template-columns: 1fr !important;
          }
          .chat-layout aside {
            border-right: 0 !important;
            border-bottom: 1px solid var(--border);
            max-height: 220px;
          }
        }
      `}</style>
    </div>
  );
};

const iconButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer'
};

const Avatar: React.FC<{ name: string }> = ({ name }) => (
  <div
    style={{
      width: '36px',
      height: '36px',
      flex: '0 0 36px',
      display: 'grid',
      placeItems: 'center',
      borderRadius: '50%',
      background: 'var(--primary)',
      color: '#ffffff',
      fontSize: '0.8rem',
      fontWeight: 700
    }}
    title={name}
  >
    {name ? getInitials(name) : <UserRound size={17} />}
  </div>
);

export default Chat;


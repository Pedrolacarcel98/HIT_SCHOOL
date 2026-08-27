import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Pencil, Search, Send, Trash2, UserRound, X } from 'lucide-react';

type ChatRole = 'TEACHER' | 'STUDENT';

interface ChatUser {
  id: string;
  name: string;
  email?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: ChatRole;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

interface StudentApiUser {
  id: string;
  email: string;
  profile?: { firstName: string; lastName: string };
}

interface CourseApiResponse {
  teacherId: string;
  teacher?: { email: string; profile?: { firstName: string; lastName: string } };
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

const getInitials = (name: string) => name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || '?';

const Chat: React.FC<{ role: ChatRole }> = ({ role }) => {
  const currentUserId = getCurrentUserId();
  const [students, setStudents] = useState<ChatUser[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [teacher, setTeacher] = useState<ChatUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPeople = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        if (role === 'TEACHER') {
          const response = await fetch(`${apiUrl}/api/students`, { headers });
          if (!response.ok) throw new Error('No se pudo cargar la lista de alumnos.');
          const data = await response.json() as StudentApiUser[];
          const loadedStudents = data.map(student => ({
            id: student.id,
            name: `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim() || student.email,
            email: student.email
          }));
          setStudents(loadedStudents);
          setSelectedStudentId(loadedStudents[0]?.id || '');
        } else {
          const coursesResponse = await fetch(`${apiUrl}/api/courses`, { headers });
          if (!coursesResponse.ok) throw new Error('No se pudo cargar el profesor asignado.');
          const courses = await coursesResponse.json() as { id: string; teacherId: string }[];
          const assignedCourse = courses[0];
          if (assignedCourse) {
            const courseResponse = await fetch(`${apiUrl}/api/courses/${assignedCourse.id}`, { headers });
            const course = await courseResponse.json() as CourseApiResponse;
            setTeacher({ id: course.teacherId, name: 'Profesor', email: course.teacher?.email });
          }
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el chat.');
      } finally {
        setLoading(false);
      }
    };
    loadPeople();
  }, [role]);

  const conversationPartner = role === 'TEACHER'
    ? students.find(student => student.id === selectedStudentId) || null
    : teacher;
  const conversationMessages = useMemo(() => messages, [messages]);
  const filteredStudents = students.filter(student => `${student.name} ${student.email || ''}`.toLowerCase().includes(searchTerm.toLowerCase()));

  useEffect(() => {
    if (!conversationPartner) {
      setMessages([]);
      return;
    }
    const loadMessages = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/chat?partnerId=${encodeURIComponent(conversationPartner.id)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('No se pudo cargar la conversación.');
        setMessages(await response.json() as ChatMessage[]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la conversación.');
      }
    };
    loadMessages();
  }, [conversationPartner?.id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !conversationPartner || !currentUserId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/chat${editingMessageId ? `/${editingMessageId}` : ''}`, {
        method: editingMessageId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editingMessageId ? { content } : { recipientId: conversationPartner.id, content })
      });
      if (!response.ok) throw new Error('No se pudo guardar el mensaje.');
      if (editingMessageId) {
        setMessages(current => current.map(message => message.id === editingMessageId ? { ...message, content, updatedAt: new Date().toISOString() } : message));
        setEditingMessageId(null);
      } else {
        const savedMessage = await response.json() as ChatMessage;
        setMessages(current => [...current, savedMessage]);
      }
      setDraft('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar el mensaje.');
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
      const response = await fetch(`${apiUrl}/api/chat/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('No se pudo borrar el mensaje.');
      setMessages(current => current.filter(message => message.id !== messageId));
      if (editingMessageId === messageId) cancelEditing();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo borrar el mensaje.');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <MessageCircle style={{ color: 'var(--primary)' }} /> {role === 'TEACHER' ? 'Chat Alumnos' : 'Chat con Profesor'}
        </h1>
        <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>
          {role === 'TEACHER' ? 'Mantén conversaciones directas con tus alumnos.' : 'Tu conversación directa con el profesor asignado.'}
        </p>
      </header>

      {error && <div style={{ marginBottom: '1rem', padding: '0.8rem 1rem', border: '1px solid #f7caca', borderRadius: '8px', background: '#fdf0f0', color: '#9e2a2b' }}>{error}</div>}

      <div className="chat-layout" style={{ display: 'grid', gridTemplateColumns: role === 'TEACHER' ? 'minmax(230px, 300px) 1fr' : '1fr', minHeight: '560px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}>
        {role === 'TEACHER' && (
          <aside style={{ borderRight: '1px solid var(--border)', background: 'var(--surface-alt)' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
              <label htmlFor="student-chat-search" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>Alumnos</label>
              <div style={{ position: 'relative' }}>
                <Search size={17} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="student-chat-search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Buscar alumno..." style={{ width: '100%', padding: '0.65rem 0.65rem 0.65rem 2.25rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', color: 'var(--text-main)', outline: 'none' }} />
              </div>
            </div>
            <div style={{ padding: '0.5rem', maxHeight: '470px', overflowY: 'auto' }}>
              {loading ? <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>Cargando alumnos...</p> : filteredStudents.length === 0 ? <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>No hay alumnos.</p> : filteredStudents.map(student => (
                <button key={student.id} onClick={() => setSelectedStudentId(student.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.75rem', marginBottom: '0.25rem', textAlign: 'left', border: 'none', borderRadius: '8px', background: selectedStudentId === student.id ? 'var(--primary-light)' : 'transparent', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <Avatar name={student.name} />
                  <span style={{ minWidth: 0 }}><strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</strong><small style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{student.email}</small></span>
                </button>
              ))}
            </div>
          </aside>
        )}

        <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            {conversationPartner ? <><Avatar name={role === 'STUDENT' ? 'Profesor' : conversationPartner.name} /><div><strong>{role === 'STUDENT' ? 'Profesor' : conversationPartner.name}</strong>{conversationPartner.email && <small style={{ display: 'block', color: 'var(--text-muted)' }}>{conversationPartner.email}</small>}</div></> : <span style={{ color: 'var(--text-muted)' }}>{loading ? 'Cargando conversación...' : 'Selecciona un alumno para comenzar.'}</span>}
          </div>
          <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', background: 'var(--background)' }}>
            {conversationMessages.length === 0 && conversationPartner && <div style={{ height: '100%', minHeight: '260px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>Aún no hay mensajes.<br />Empieza la conversación.</div>}
            {conversationMessages.map(message => {
              const isMine = message.senderId === currentUserId;
              return <div key={message.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', gap: '0.6rem', marginBottom: '0.85rem' }}>
                {!isMine && <Avatar name={conversationPartner?.name || 'Usuario'} />}
                <div style={{ maxWidth: 'min(78%, 620px)', padding: '0.8rem 1rem', background: isMine ? 'var(--primary-light)' : 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.content}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.45rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{message.updatedAt ? ' · editado' : ''}</span>
                    {isMine && <><button title="Editar mensaje" aria-label="Editar mensaje" onClick={() => startEditing(message)} style={iconButtonStyle}><Pencil size={14} /></button><button title="Borrar mensaje" aria-label="Borrar mensaje" onClick={() => deleteMessage(message.id)} style={{ ...iconButtonStyle, color: '#9e2a2b' }}><Trash2 size={14} /></button></>}
                  </div>
                </div>
              </div>;
            })}
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'flex-end', gap: '0.7rem', padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
            <textarea value={draft} onChange={event => setDraft(event.target.value)} disabled={!conversationPartner} placeholder={conversationPartner ? 'Escribe un mensaje...' : 'Selecciona una conversación'} rows={2} style={{ flex: 1, resize: 'vertical', minHeight: '44px', maxHeight: '140px', padding: '0.7rem 0.8rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-alt)', color: 'var(--text-main)', outline: 'none' }} />
            {editingMessageId && <button type="button" onClick={cancelEditing} title="Cancelar edición" aria-label="Cancelar edición" style={{ ...iconButtonStyle, height: '42px', width: '42px', border: '1px solid var(--border)' }}><X size={18} /></button>}
            <button type="submit" disabled={!conversationPartner || !draft.trim()} className="btn-primary" title={editingMessageId ? 'Guardar cambios' : 'Enviar mensaje'} aria-label={editingMessageId ? 'Guardar cambios' : 'Enviar mensaje'} style={{ height: '42px', width: '46px', padding: 0 }}><Send size={18} /></button>
          </form>
        </section>
      </div>
      <style>{`@media (max-width: 700px) { .chat-layout { grid-template-columns: 1fr !important; } .chat-layout aside { border-right: 0 !important; border-bottom: 1px solid var(--border); } .chat-layout aside > div:last-child { max-height: 170px !important; } }`}</style>
    </div>
  );
};

const iconButtonStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: 'none', background: 'transparent', color: 'var(--primary-text)', cursor: 'pointer' };

const Avatar: React.FC<{ name: string }> = ({ name }) => <div style={{ width: '36px', height: '36px', flex: '0 0 36px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: '0.78rem', fontWeight: 700 }} title={name}>{name ? getInitials(name) : <UserRound size={17} />}</div>;

export default Chat;

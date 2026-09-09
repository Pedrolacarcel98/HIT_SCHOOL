import React, { useState, useEffect } from 'react';
import { Download, ImagePlus, MessageSquare, Send, Trash2, Video, X } from 'lucide-react';

const StreamTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [postError, setPostError] = useState('');
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [courseId]);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses/${courseId}/posts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setPosts(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() && !mediaFile) return;

    try {
      setIsPublishing(true);
      setPostError('');
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const formData = new FormData();
      formData.append('content', newPost.trim());
      if (mediaFile) formData.append('media', mediaFile);
      const res = await fetch(`${apiUrl}/api/courses/${courseId}/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        setNewPost('');
        setMediaFile(null);
        setMediaPreview(null);
        fetchPosts();
      } else {
        const errorData = await res.json().catch(() => ({}));
        setPostError(errorData.error || 'No se pudo publicar el anuncio.');
      }
    } catch (err) {
      console.error(err);
      setPostError('Error de conexión al publicar el anuncio.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleMediaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setPostError('Solo puedes adjuntar imágenes o vídeos.');
      event.target.value = '';
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setPostError('El archivo no puede superar 50 MB.');
      event.target.value = '';
      return;
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setPostError('');
  };

  const removeMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
  };

  const handleDeletePost = async (postId: string) => {
    const confirmed = window.confirm('¿Seguro que quieres borrar este anuncio?');
    if (!confirmed) return;

    try {
      setDeletingPostId(postId);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses/${courseId}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((post) => post.id !== postId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingPostId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <form onSubmit={handlePost} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <textarea 
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Anuncia algo a tu clase..."
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
            />
            {postError && <p style={{ margin: '0.6rem 0 0', color: '#9e2a2b', fontSize: '0.84rem' }}>{postError}</p>}
            {mediaPreview && mediaFile && (
              <div style={{ position: 'relative', marginTop: '0.75rem', width: 'fit-content', maxWidth: '100%' }}>
                {mediaFile.type.startsWith('image/') ? (
                  <img src={mediaPreview} alt="Vista previa del adjunto" style={{ display: 'block', width: '180px', maxWidth: '100%', maxHeight: '130px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />
                ) : (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                    <Video size={18} style={{ color: 'var(--primary)' }} /> {mediaFile.name}
                  </div>
                )}
                <button type="button" onClick={removeMedia} title="Quitar archivo" aria-label="Quitar archivo" style={{ position: 'absolute', top: '-8px', right: '-8px', width: '24px', height: '24px', border: 'none', borderRadius: '50%', background: '#9e2a2b', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label title="Adjuntar imagen o vídeo" aria-label="Adjuntar imagen o vídeo" style={{ width: '42px', height: '42px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-alt)', color: 'var(--primary)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <ImagePlus size={19} />
              <input type="file" accept="image/*,video/*" onChange={handleMediaChange} style={{ display: 'none' }} />
            </label>
            <button type="submit" disabled={isPublishing} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px' }}>
              <Send size={18} /> {isPublishing ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {posts.map(post => (
          <div key={post.id} className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text)' }}>Profesor</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDeletePost(post.id)}
                disabled={deletingPostId === post.id}
                aria-label="Borrar anuncio"
                title="Borrar anuncio"
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--surface-alt)',
                  color: 'var(--text-muted)',
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: deletingPostId === post.id ? 'not-allowed' : 'pointer',
                  opacity: deletingPostId === post.id ? 0.7 : 1
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
            {post.content && <p style={{ margin: post.mediaUrl ? '0 0 1rem' : 0, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{post.content}</p>}
            {post.mediaUrl && (() => {
              const mediaUrl = post.mediaUrl.startsWith('http') ? post.mediaUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${post.mediaUrl}`;
              const isVideo = post.mediaType?.startsWith('video/');
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
                  {isVideo ? (
                    <video controls preload="metadata" style={{ display: 'block', width: '100%', maxWidth: '720px', maxHeight: '480px', borderRadius: '8px', background: '#111' }}>
                      <source src={mediaUrl} type={post.mediaType} />
                      Tu navegador no puede reproducir este vídeo.
                    </video>
                  ) : (
                    <img src={mediaUrl} alt={post.mediaName || 'Imagen compartida en el tablón'} style={{ display: 'block', width: '100%', maxWidth: '720px', maxHeight: '560px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)' }} />
                  )}
                  <a
                    href={mediaUrl}
                    download={post.mediaName || undefined}
                    title={`Descargar ${isVideo ? 'vídeo' : 'imagen'}`}
                    aria-label={`Descargar ${isVideo ? 'vídeo' : 'imagen'}`}
                    style={{ width: '34px', height: '34px', display: 'inline-grid', placeItems: 'center', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', background: 'var(--surface)', textDecoration: 'none' }}
                  >
                    <Download size={16} />
                  </a>
                </div>
              );
            })()}
          </div>
        ))}
        {posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>Aún no hay publicaciones en el tablón.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamTab;

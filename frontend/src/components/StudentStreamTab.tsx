import React, { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';

type Post = {
  id: string;
  content: string;
  createdAt: string;
};

const StudentStreamTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/courses/${courseId}/posts`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchPosts();
  }, [courseId]);

  return (
    <div className="page-container" style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
        {posts.map((post) => (
          <div key={post.id} className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <MessageSquare size={20} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text)' }}>Profesor</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <p style={{ margin: 0, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
              {post.content}
            </p>
          </div>
        ))}

        {posts.length === 0 && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
            <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p style={{ margin: 0 }}>Aun no hay anuncios en el tablon.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentStreamTab;

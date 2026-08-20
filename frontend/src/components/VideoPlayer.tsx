import React from 'react';

interface VideoPlayerProps {
  url: string;
  title?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title }) => {
  // Convert YouTube normal URL to embed URL
  const getEmbedUrl = (rawUrl: string): { type: 'youtube' | 'vimeo' | 'direct'; embedUrl: string } => {
    if (!rawUrl) return { type: 'direct', embedUrl: '' };

    // YouTube: https://www.youtube.com/watch?v=XXXX or https://youtu.be/XXXX
    const youtubeMatch = rawUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (youtubeMatch && youtubeMatch[1]) {
      return {
        type: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=0&rel=0`
      };
    }

    // Vimeo: https://vimeo.com/XXXXX
    const vimeoMatch = rawUrl.match(/vimeo\.com\/(\d+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        type: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`
      };
    }

    return { type: 'direct', embedUrl: rawUrl };
  };

  const { type, embedUrl } = getEmbedUrl(url);

  return (
    <div style={{
      background: '#000000',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid var(--border)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {title && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', color: 'var(--text)', fontWeight: '600', fontSize: '0.9rem' }}>
          {title}
        </div>
      )}

      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#0a0a0a' }}>
        {type === 'youtube' || type === 'vimeo' ? (
          <iframe
            src={embedUrl}
            title={title || 'Video Player'}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 0
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            src={url}
            controls
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          >
            Tu navegador no soporta la reproducción de este vídeo.
          </video>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, ExternalLink, AlertCircle } from 'lucide-react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const getGoogleDriveAudioFileId = (rawUrl?: string | null): string | null => {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  return (
    trimmed.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1] ||
    trimmed.match(/[?&]id=([^&/?]+)/)?.[1] ||
    trimmed.match(/drive\.usercontent\.google\.com\/download\?id=([^&/?]+)/)?.[1] ||
    null
  );
};

export const resolveAudioSourceUrl = (rawUrl?: string | null): string => {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  const driveId = getGoogleDriveAudioFileId(trimmed);
  if (driveId) {
    return `${apiUrl}/api/materials/proxy-audio?id=${driveId}`;
  }
  if (trimmed.startsWith('/uploads/')) {
    return `${apiUrl}${trimmed}`;
  }
  return trimmed;
};

interface AudioPlayerProps {
  src: string;
  title?: string;
  autoPlay?: boolean;
  audioMode?: 'drive-preview' | 'backend-proxy';
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title, autoPlay = false, audioMode = 'drive-preview' }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);

  const googleDriveFileId = getGoogleDriveAudioFileId(src);
  const audioSource = resolveAudioSourceUrl(src);

  useEffect(() => {
    setHasError(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration || 0);
      setCurrentTime(audio.currentTime || 0);
      setHasError(false);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      console.warn('No se pudo reproducir la pista de audio:', audioSource);
      setHasError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('canplay', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('canplay', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [audioSource]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
  };

  const cyclePlaybackRate = () => {
    const rates = [0.75, 1, 1.25, 1.5];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {googleDriveFileId && audioMode === 'drive-preview' ? (
        <>
          {title && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text)' }}>{title}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary-text)', fontWeight: 'bold', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', padding: '2px 8px', borderRadius: '4px' }}>
                LISTENING AUDIO
              </span>
            </div>
          )}
          <iframe
            key={googleDriveFileId}
            src={`https://drive.google.com/file/d/${googleDriveFileId}/preview`}
            title={title || 'Reproductor de audio'}
            allow="autoplay; fullscreen; encrypted-media"
            allowFullScreen
            loading="eager"
            style={{ display: 'block', width: '100%', height: '180px', border: 'none', borderRadius: '6px', background: 'var(--background)' }}
          />
        </>
      ) : (
        <>
          <audio
            ref={audioRef}
            src={audioSource}
            autoPlay={autoPlay}
            preload="metadata"
          />

      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--primary-text)', fontWeight: 'bold', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', padding: '2px 8px', borderRadius: '4px', flexShrink: 0 }}>
            LISTENING
          </span>
        </div>
      )}

      {hasError ? (
        <div style={{
          padding: '0.85rem',
          borderRadius: '8px',
          background: '#fff1f2',
          border: '1px solid #fecdd3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>No se pudo reproducir directamente en el navegador.</span>
          </div>
          {googleDriveFileId ? (
            <a
              href={`https://drive.google.com/file/d/${googleDriveFileId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#991b1b',
                textDecoration: 'underline'
              }}
            >
              Abrir en Google Drive <ExternalLink size={13} />
            </a>
          ) : (
            <a
              href={audioSource}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#991b1b',
                textDecoration: 'underline'
              }}
            >
              Abrir enlace <ExternalLink size={13} />
            </a>
          )}
        </div>
      ) : (
        <>
          {/* Slider de Progreso */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '40px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration && isFinite(duration) ? duration : 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              style={{
                flex: 1,
                accentColor: 'var(--primary)',
                cursor: 'pointer',
                height: '6px'
              }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '40px', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(duration)}
            </span>
          </div>

          {/* Controles Principales */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.15rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Rebobinar 5s */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); skip(-5); }}
                title="Rebobinar 5 segundos"
                style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center' }}
              >
                <RotateCcw size={18} />
              </button>

              {/* Play / Pause Principal */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePlay(); }}
                title={isPlaying ? 'Pausar' : 'Reproducir'}
                style={{
                  background: 'var(--primary)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-primary)',
                  transition: 'transform 0.1s ease'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
              </button>

              {/* Avanzar 5s */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); skip(5); }}
                title="Avanzar 5 segundos"
                style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center' }}
              >
                <RotateCw size={18} />
              </button>
            </div>

            {/* Velocidad y Volumen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); cyclePlaybackRate(); }}
                title="Cambiar velocidad de audio"
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  minWidth: '46px'
                }}
              >
                {playbackRate}x
              </button>

              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleMute(); }}
                title={isMuted ? 'Activar sonido' : 'Silenciar'}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
          </div>
        </>
      )}
        </>
      )}
    </div>
  );
};

export default AudioPlayer;

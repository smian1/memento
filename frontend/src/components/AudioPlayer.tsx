import React, { useState, useRef, useEffect } from 'react';
import { HiPlay, HiPause } from 'react-icons/hi';

interface AudioPlayerProps {
  lifelogId: number;
  duration?: number; // Duration in milliseconds
  onPlay?: () => void;
  onPause?: () => void;
  onError?: (error: string) => void;
  className?: string;
  shouldPause?: boolean; // External pause signal
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  lifelogId,
  duration,
  onPlay,
  onPause,
  onError,
  className = '',
  shouldPause = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioUrl = `/api/lifelogs/${lifelogId}/audio`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null); // Clear any previous errors
    };
    
    const handleCanPlay = () => setIsLoading(false);
    
    const handleLoadedMetadata = () => {
      if (isFinite(audio.duration) && !isNaN(audio.duration)) {
        setTotalDuration(audio.duration);
      }
      setIsLoading(false);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onPause?.();
    };
    
    const handleError = (_e: Event) => {
      // Only show error if user actually tried to play
      if (isPlaying || isLoading) {
        const errorMsg = 'Audio not available';
        setError(errorMsg);
        setIsLoading(false);
        setIsPlaying(false);
        onError?.(errorMsg);
      }
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [onPause, onError, isPlaying, isLoading]);

  // Handle external pause signals
  useEffect(() => {
    if (shouldPause && isPlaying) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        setIsPlaying(false);
      }
    }
  }, [shouldPause, isPlaying]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    // Clear any previous error state
    if (error) {
      setError(null);
      // Reset audio element to try again
      audio.src = '';
      audio.load();
    }

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        onPause?.();
      } else {
        // Set the audio source only when user clicks play
        if (!audio.src || error) {
          audio.src = audioUrl;
        }
        
        setIsLoading(true);
        await audio.play();
        setIsLoading(false);
        setIsPlaying(true);
        onPlay?.();
      }
    } catch (err) {
      const errorMsg = 'Audio not available';
      setError(errorMsg);
      setIsLoading(false);
      setIsPlaying(false);
      onError?.(errorMsg);
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`audio-player ${className}`}>
      <audio
        ref={audioRef}
        preload="none"
      />
      
      <div className="audio-controls">
        <button
          className={`play-button ${isPlaying ? 'playing' : ''} ${isLoading ? 'loading' : ''} ${error ? 'error' : ''}`}
          onClick={togglePlayPause}
          disabled={isLoading}
          title={error ? `${error} - Click to retry` : isPlaying ? 'Pause' : 'Play audio'}
        >
          {isLoading ? (
            <div className="loading-spinner" />
          ) : isPlaying ? (
            <HiPause />
          ) : error ? (
            <HiPlay />
          ) : (
            <HiPlay />
          )}
        </button>
        
        {(isPlaying || currentTime > 0) && (
          <div className="audio-info">
            <span className="time-display">
              {formatTime(currentTime)}
              {totalDuration > 0 && isFinite(totalDuration) && (
                <span className="duration">
                  {' / ' + formatTime(totalDuration)}
                </span>
              )}
            </span>
            
            {totalDuration > 0 && isFinite(totalDuration) && (
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
        
        {duration && !isPlaying && currentTime === 0 && (
          <span className="duration-hint">
            {formatDuration(duration)}
          </span>
        )}
      </div>
    </div>
  );
};

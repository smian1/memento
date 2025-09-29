import React, { useState, useRef, useEffect } from 'react';
import { HiPlay, HiPause } from 'react-icons/hi';

interface SegmentAudioPlayerProps {
  lifelogId: number;
  startMs: number;
  endMs: number;
  segmentName?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onError?: (error: string) => void;
  className?: string;
  shouldPause?: boolean; // External pause signal
}

export const SegmentAudioPlayer: React.FC<SegmentAudioPlayerProps> = ({
  lifelogId,
  startMs,
  endMs,
  segmentName,
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
  const [segmentDuration, setSegmentDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioUrl = `/api/lifelogs/${lifelogId}/audio`;

  // Convert milliseconds to seconds
  const startSeconds = startMs / 1000;
  const endSeconds = endMs / 1000;
  const duration = endSeconds - startSeconds;

  useEffect(() => {
    setSegmentDuration(duration);
  }, [duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };
    
    const handleCanPlay = () => setIsLoading(false);
    
    const handleLoadedMetadata = () => {
      setIsLoading(false);
    };
    
    const handleTimeUpdate = () => {
      if (audio.currentTime >= endSeconds) {
        // Stop playing when we reach the end of the segment
        audio.pause();
        setIsPlaying(false);
        setCurrentTime(0);
        onPause?.();
        return;
      }
      
      // Update current time relative to segment start
      const relativeTime = audio.currentTime - startSeconds;
      setCurrentTime(Math.max(0, relativeTime));
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onPause?.();
    };
    
    const handleError = (_e: Event) => {
      if (isPlaying || isLoading) {
        const errorMsg = 'Audio segment not available';
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
  }, [startSeconds, endSeconds, onPause, onError, isPlaying, isLoading]);

  // Handle external pause signals
  useEffect(() => {
    if (shouldPause && isPlaying) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        setIsPlaying(false);
        if (playbackTimeoutRef.current) {
          clearTimeout(playbackTimeoutRef.current);
          playbackTimeoutRef.current = null;
        }
      }
    }
  }, [shouldPause, isPlaying]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) {
      console.warn('SegmentAudioPlayer: No audio element available');
      return;
    }

    console.log('SegmentAudioPlayer: togglePlayPause called', {
      isPlaying,
      isLoading,
      error,
      startSeconds,
      endSeconds,
      duration: endSeconds - startSeconds,
      audioSrc: audio.src,
      readyState: audio.readyState
    });

    // Clear any previous error state
    if (error) {
      console.log('SegmentAudioPlayer: Clearing previous error and reloading audio');
      setError(null);
      audio.src = '';
      audio.load();
    }

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        if (playbackTimeoutRef.current) {
          clearTimeout(playbackTimeoutRef.current);
          playbackTimeoutRef.current = null;
        }
        onPause?.();
      } else {
        // Set the audio source if needed
        if (!audio.src || error) {
          console.log('SegmentAudioPlayer: Setting audio source to', audioUrl);
          audio.src = audioUrl;
        }
        
        console.log('SegmentAudioPlayer: Starting playback, setting loading state');
        setIsLoading(true);
        
        try {
          // Simple approach: try to seek and play immediately
          console.log('SegmentAudioPlayer: Attempting to seek to', startSeconds, 'and play');
          
          // Set current time first
          audio.currentTime = startSeconds;
          
          // Try to play - this will automatically load if needed
          const playPromise = audio.play();
          
          // Handle the play promise
          await playPromise;
          
          console.log('SegmentAudioPlayer: Playback started successfully');
          setIsLoading(false);
          setIsPlaying(true);
          onPlay?.();
          
          // Set timeout to stop at end of segment (backup to timeupdate handler)
          const segmentDuration = (endSeconds - startSeconds) * 1000 + 100;
          console.log('SegmentAudioPlayer: Setting timeout for', segmentDuration, 'ms');
          playbackTimeoutRef.current = setTimeout(() => {
            if (audio && !audio.paused) {
              console.log('SegmentAudioPlayer: Timeout reached, stopping playback');
              audio.pause();
              setIsPlaying(false);
              setCurrentTime(0);
              onPause?.();
            }
          }, segmentDuration);
          
        } catch (err) {
          console.error('Audio playback error:', err);
          const errorMsg = 'Audio segment not available';
          setError(errorMsg);
          setIsLoading(false);
          setIsPlaying(false);
          onError?.(errorMsg);
        }
      }
    } catch (err) {
      console.error('Audio control error:', err);
      const errorMsg = 'Audio segment not available';
      setError(errorMsg);
      setIsLoading(false);
      setIsPlaying(false);
      onError?.(errorMsg);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`audio-player segment-audio-player ${className}`}>
      <audio
        ref={audioRef}
        preload="metadata"
        crossOrigin="anonymous"
      />
      
      <div className="audio-controls">
        <button
          className={`play-button ${isPlaying ? 'playing' : ''} ${isLoading ? 'loading' : ''} ${error ? 'error' : ''}`}
          onClick={togglePlayPause}
          disabled={isLoading}
          title={
            error 
              ? `${error} - Click to retry` 
              : isPlaying 
                ? 'Pause segment' 
                : `Play segment${segmentName ? ` (${segmentName})` : ''}`
          }
          type="button"
        >
          {isLoading ? (
            <div className="loading-spinner" />
          ) : isPlaying ? (
            <HiPause />
          ) : (
            <HiPlay />
          )}
        </button>
        
        {(isPlaying || currentTime > 0) && (
          <div className="audio-info">
            <span className="time-display">
              {formatTime(currentTime)}
              {segmentDuration > 0 && (
                <span className="duration">
                  {' / ' + formatTime(segmentDuration)}
                </span>
              )}
            </span>
            
            {segmentDuration > 0 && (
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(currentTime / segmentDuration) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
        
        {!isPlaying && currentTime === 0 && (
          <span className="duration-hint">
            {formatDuration(segmentDuration)}
          </span>
        )}
      </div>
    </div>
  );
};

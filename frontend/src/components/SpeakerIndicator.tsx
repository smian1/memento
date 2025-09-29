import React, { useState, useEffect } from 'react';
import { HiUser } from 'react-icons/hi';
import { speakersApi, type SpeakerProfile } from '../api/client';

interface SpeakerIndicatorProps {
  speakerName: string;
  className?: string;
  showName?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const SpeakerIndicator: React.FC<SpeakerIndicatorProps> = ({ 
  speakerName, 
  className = '', 
  showName = false,
  size = 'small'
}) => {
  const [speaker, setSpeaker] = useState<SpeakerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpeaker = async () => {
      try {
        setLoading(true);
        const response = await speakersApi.getById(speakerName);
        setSpeaker(response.data.data);
      } catch (error) {
        // Speaker not found or error - use default styling
        setSpeaker(null);
      } finally {
        setLoading(false);
      }
    };

    if (speakerName) {
      fetchSpeaker();
    } else {
      setLoading(false);
    }
  }, [speakerName]);

  const getDefaultColor = (name: string) => {
    // Generate consistent color based on speaker name
    if (name.toLowerCase() === 'you') return '#10b981'; // Green
    if (name.toLowerCase() === 'unknown') return '#64748b'; // Gray
    
    // Generate a color based on the speaker name hash
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 65%, 55%)`;
  };

  const displayName = speaker?.displayName || speakerName;
  const color = speaker?.colorHex || getDefaultColor(speakerName);
  const avatarUrl = speaker?.avatarUrl;

  const sizeClasses = {
    small: 'speaker-indicator-small',
    medium: 'speaker-indicator-medium', 
    large: 'speaker-indicator-large'
  };

  if (loading) {
    return (
      <div className={`speaker-indicator ${sizeClasses[size]} ${className}`}>
        <div className="speaker-dot loading" style={{ backgroundColor: '#e2e8f0' }} />
        {showName && <span className="speaker-name">Loading...</span>}
      </div>
    );
  }

  return (
    <div className={`speaker-indicator ${sizeClasses[size]} ${className}`} title={speaker?.description || displayName}>
      <div className="speaker-avatar">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="speaker-avatar-image"
            onError={(e) => {
              // Fallback to default avatar if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const defaultAvatar = target.nextElementSibling as HTMLElement;
              if (defaultAvatar) defaultAvatar.style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          className="speaker-default-avatar" 
          style={{ 
            backgroundColor: color,
            display: avatarUrl ? 'none' : 'flex'
          }}
        >
          <HiUser className="speaker-default-icon" />
        </div>
      </div>
      {showName && (
        <span className="speaker-name" style={{ color: color }}>
          {displayName}
        </span>
      )}
    </div>
  );
};

export default SpeakerIndicator;

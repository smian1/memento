import React, { useState, useEffect } from 'react';
import { HiUsers, HiPlus, HiPencil, HiTrash, HiRefresh } from 'react-icons/hi';
import { speakersApi, type SpeakerProfile, type CreateSpeakerProfileData, type UpdateSpeakerProfileData } from '../api/client';

interface SpeakerManagerProps {
  onSpeakersChange?: () => void;
}

interface EditingSpeaker {
  speakerName: string;
  displayName: string;
  avatarUrl: string;
  description: string;
  colorHex: string;
  isActive: boolean;
}

export const SpeakerManager: React.FC<SpeakerManagerProps> = ({ onSpeakersChange }) => {
  const [speakers, setSpeakers] = useState<SpeakerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<EditingSpeaker | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadSpeakers();
  }, []);

  const loadSpeakers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await speakersApi.getAll();
      setSpeakers(response.data.data);
    } catch (err: any) {
      setError('Failed to load speakers');
      console.error('Error loading speakers:', err);
    } finally {
      setLoading(false);
    }
  };

  const autoDiscoverSpeakers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await speakersApi.autoDiscover();
      setSuccess(response.data.message);
      await loadSpeakers();
      onSpeakersChange?.();
    } catch (err: any) {
      setError('Failed to discover speakers');
      console.error('Error discovering speakers:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (speaker: SpeakerProfile) => {
    setEditingSpeaker({
      speakerName: speaker.speakerName,
      displayName: speaker.displayName || speaker.speakerName,
      avatarUrl: speaker.avatarUrl || '',
      description: speaker.description || '',
      colorHex: speaker.colorHex,
      isActive: speaker.isActive,
    });
    setIsCreating(false);
  };

  const startCreating = () => {
    setEditingSpeaker({
      speakerName: '',
      displayName: '',
      avatarUrl: '',
      description: '',
      colorHex: '#64748b',
      isActive: true,
    });
    setIsCreating(true);
  };

  const cancelEditing = () => {
    setEditingSpeaker(null);
    setIsCreating(false);
  };

  const saveSpeaker = async () => {
    if (!editingSpeaker) return;

    try {
      setLoading(true);
      setError(null);

      if (isCreating) {
        const createData: CreateSpeakerProfileData = {
          speakerName: editingSpeaker.speakerName.trim(),
          displayName: editingSpeaker.displayName.trim() || undefined,
          avatarUrl: editingSpeaker.avatarUrl.trim() || undefined,
          description: editingSpeaker.description.trim() || undefined,
          colorHex: editingSpeaker.colorHex,
          isActive: editingSpeaker.isActive,
        };
        await speakersApi.create(createData);
        setSuccess('Speaker created successfully');
      } else {
        const updateData: UpdateSpeakerProfileData = {
          displayName: editingSpeaker.displayName.trim() || undefined,
          avatarUrl: editingSpeaker.avatarUrl.trim() || undefined,
          description: editingSpeaker.description.trim() || undefined,
          colorHex: editingSpeaker.colorHex,
          isActive: editingSpeaker.isActive,
        };
        await speakersApi.update(editingSpeaker.speakerName, updateData);
        setSuccess('Speaker updated successfully');
      }

      setEditingSpeaker(null);
      setIsCreating(false);
      await loadSpeakers();
      onSpeakersChange?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save speaker');
      console.error('Error saving speaker:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSpeaker = async (speakerName: string) => {
    if (!confirm(`Are you sure you want to delete the speaker "${speakerName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await speakersApi.delete(speakerName);
      setSuccess('Speaker deleted successfully');
      await loadSpeakers();
      onSpeakersChange?.();
    } catch (err: any) {
      setError('Failed to delete speaker');
      console.error('Error deleting speaker:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  if (!isExpanded) {
    return (
      <div className="speaker-manager-collapsed">
        <button
          className="settings-item-button"
          onClick={() => setIsExpanded(true)}
          title="Manage Speakers"
        >
          <HiUsers size={16} />
          <span>Manage Speakers</span>
          <span className="speaker-count">{speakers.length}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="speaker-manager">
      <div className="speaker-manager-header">
        <div className="speaker-manager-title">
          <HiUsers size={16} />
          <span>Manage Speakers</span>
          <button
            className="collapse-button"
            onClick={() => setIsExpanded(false)}
            title="Collapse"
          >
            ×
          </button>
        </div>
        <div className="speaker-manager-actions">
          <button
            className="action-button secondary"
            onClick={autoDiscoverSpeakers}
            disabled={loading}
            title="Auto-discover speakers from recent conversations"
          >
            <HiRefresh size={14} />
            Discover
          </button>
          <button
            className="action-button primary"
            onClick={startCreating}
            disabled={loading}
            title="Add new speaker"
          >
            <HiPlus size={14} />
            Add
          </button>
        </div>
      </div>

      {error && (
        <div className="message error" onClick={clearMessages}>
          {error}
        </div>
      )}

      {success && (
        <div className="message success" onClick={clearMessages}>
          {success}
        </div>
      )}

      {editingSpeaker && (
        <div className="speaker-edit-form">
          <div className="form-header">
            <h4>{isCreating ? 'Add New Speaker' : `Edit ${editingSpeaker.speakerName}`}</h4>
          </div>

          <div className="form-row">
            <label>
              Speaker Name *
              <input
                type="text"
                value={editingSpeaker.speakerName}
                onChange={(e) => setEditingSpeaker({ ...editingSpeaker, speakerName: e.target.value })}
                disabled={!isCreating}
                placeholder="e.g., John, Sarah, Unknown"
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Display Name
              <input
                type="text"
                value={editingSpeaker.displayName}
                onChange={(e) => setEditingSpeaker({ ...editingSpeaker, displayName: e.target.value })}
                placeholder="How to display this speaker"
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Avatar URL
              <input
                type="url"
                value={editingSpeaker.avatarUrl}
                onChange={(e) => setEditingSpeaker({ ...editingSpeaker, avatarUrl: e.target.value })}
                placeholder="https://example.com/avatar.jpg"
              />
            </label>
            {editingSpeaker.avatarUrl && (
              <div className="avatar-preview">
                <img
                  src={editingSpeaker.avatarUrl}
                  alt="Avatar preview"
                  className="preview-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          <div className="form-row">
            <label>
              Color
              <div className="color-input-group">
                <input
                  type="color"
                  value={editingSpeaker.colorHex}
                  onChange={(e) => setEditingSpeaker({ ...editingSpeaker, colorHex: e.target.value })}
                  className="color-picker"
                />
                <div 
                  className="color-preview" 
                  style={{ backgroundColor: editingSpeaker.colorHex }}
                  title={editingSpeaker.colorHex}
                ></div>
              </div>
            </label>
          </div>

          <div className="form-row">
            <label>
              Description
              <textarea
                value={editingSpeaker.description}
                onChange={(e) => setEditingSpeaker({ ...editingSpeaker, description: e.target.value })}
                placeholder="Additional notes about this speaker"
                rows={2}
              />
            </label>
          </div>

          <div className="form-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editingSpeaker.isActive}
                onChange={(e) => setEditingSpeaker({ ...editingSpeaker, isActive: e.target.checked })}
              />
              Active (show in conversations)
            </label>
          </div>

          <div className="form-actions">
            <button
              className="action-button secondary"
              onClick={cancelEditing}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="action-button primary"
              onClick={saveSpeaker}
              disabled={loading || !editingSpeaker.speakerName.trim()}
            >
              {isCreating ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="speakers-list">
        {loading && speakers.length === 0 && (
          <div className="loading-state">Loading speakers...</div>
        )}

        {speakers.length === 0 && !loading && (
          <div className="empty-state">
            <HiUsers size={32} />
            <p>No speakers found</p>
            <p className="empty-subtitle">Click "Discover" to find speakers from your conversations</p>
          </div>
        )}

        {speakers.map((speaker) => (
          <div key={speaker.id} className={`speaker-item ${!speaker.isActive ? 'inactive' : ''}`}>
            <div className="speaker-info">
              <div className="speaker-avatar">
                {speaker.avatarUrl ? (
                  <img
                    src={speaker.avatarUrl}
                    alt={speaker.displayName || speaker.speakerName}
                    className="avatar-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div 
                    className="avatar-dot" 
                    style={{ backgroundColor: speaker.colorHex }}
                    title={speaker.colorHex}
                  />
                )}
              </div>
              <div className="speaker-details">
                <div className="speaker-name">
                  {speaker.displayName || speaker.speakerName}
                  {speaker.speakerName !== (speaker.displayName || speaker.speakerName) && (
                    <span className="speaker-original">({speaker.speakerName})</span>
                  )}
                </div>
                {speaker.description && (
                  <div className="speaker-description">{speaker.description}</div>
                )}
              </div>
            </div>
            <div className="speaker-actions">
              <button
                className="action-button small"
                onClick={() => startEditing(speaker)}
                title="Edit speaker"
              >
                <HiPencil size={12} />
              </button>
              {speaker.speakerName !== 'You' && (
                <button
                  className="action-button small danger"
                  onClick={() => deleteSpeaker(speaker.speakerName)}
                  title="Delete speaker"
                >
                  <HiTrash size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

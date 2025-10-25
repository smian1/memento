import { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { actionItemsApi, ActionItemSource } from '../api/client';
import './CreateActionItemPanel.css';

interface CreateActionItemPanelProps {
  onClose: () => void;
  onCreated: (item: any) => void;
}

export function CreateActionItemPanel({ onClose, onCreated }: CreateActionItemPanelProps) {
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!content.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const response = await actionItemsApi.create({
        content: content.trim(),
        date,
        source: ActionItemSource.CUSTOM
      });

      onCreated(response.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create action item');
    } finally {
      setCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleCreate();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="create-panel-overlay" onClick={onClose}>
      <div className="create-panel" onClick={(e) => e.stopPropagation()}>
        <div className="create-panel-header">
          <h2>
            <Plus size={24} />
            Create Action Item
          </h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="create-panel-content">
          <p className="create-panel-description">
            Add a custom action item to track tasks and to-dos from your daily activities.
          </p>

          <div className="date-input-group">
            <label>
              <Calendar size={16} />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="date-input"
            />
          </div>

          <div className="content-input-group">
            <label>Action Item</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="What do you need to do? (e.g., Follow up with Sarah about the project proposal)"
              className="content-textarea"
              autoFocus
              rows={4}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="keyboard-hint">
            <kbd>Cmd/Ctrl</kbd> + <kbd>Enter</kbd> to save • <kbd>Esc</kbd> to cancel
          </div>

          <div className="create-panel-actions">
            <button
              className="create-action-button"
              onClick={handleCreate}
              disabled={!content.trim() || creating}
            >
              {creating ? (
                <>
                  <Plus size={16} className="spinning" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Action Item
                </>
              )}
            </button>
            <button className="cancel-button" onClick={onClose} disabled={creating}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

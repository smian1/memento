import { useState, useMemo } from 'react';
import { Plus, Calendar, List } from 'lucide-react';
import { actionItemsApi, ActionItemSource } from '../api/client';
import './CreateActionItemPanel.css';

interface CreateActionItemPanelProps {
  onClose: () => void;
  onCreated: (item: any) => void;
}

type CreateMode = 'single' | 'bulk';

export function CreateActionItemPanel({ onClose, onCreated }: CreateActionItemPanelProps) {
  const [mode, setMode] = useState<CreateMode>('single');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse bulk items from content
  const bulkItems = useMemo(() => {
    if (mode !== 'bulk') return [];
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }, [mode, content]);

  const handleCreate = async () => {
    if (!content.trim()) return;

    setCreating(true);
    setError(null);

    try {
      if (mode === 'single') {
        // Single item creation
        const response = await actionItemsApi.create({
          content: content.trim(),
          date,
          source: ActionItemSource.CUSTOM
        });
        onCreated(response.data);
        onClose();
      } else {
        // Bulk creation - create all items in parallel
        const itemsToCreate = bulkItems;
        if (itemsToCreate.length === 0) return;

        const createPromises = itemsToCreate.map(itemContent =>
          actionItemsApi.create({
            content: itemContent,
            date,
            source: ActionItemSource.CUSTOM
          })
        );

        const results = await Promise.allSettled(createPromises);

        // Count successes and failures
        const successes = results.filter(r => r.status === 'fulfilled');
        const failures = results.filter(r => r.status === 'rejected');

        // Add all successfully created items to the UI
        successes.forEach((result) => {
          if (result.status === 'fulfilled') {
            onCreated(result.value.data);
          }
        });

        if (failures.length > 0) {
          setError(`Created ${successes.length} items, but ${failures.length} failed`);
          setCreating(false);
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create action item');
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
            Add custom action items to track tasks and to-dos from your daily activities.
          </p>

          <div className="mode-selector">
            <label className={mode === 'single' ? 'active' : ''}>
              <input
                type="radio"
                name="mode"
                value="single"
                checked={mode === 'single'}
                onChange={() => setMode('single')}
              />
              <Plus size={16} />
              Single Item
            </label>
            <label className={mode === 'bulk' ? 'active' : ''}>
              <input
                type="radio"
                name="mode"
                value="bulk"
                checked={mode === 'bulk'}
                onChange={() => setMode('bulk')}
              />
              <List size={16} />
              Bulk Create
            </label>
          </div>

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
            <label>
              {mode === 'single' ? 'Action Item' : 'Action Items (one per line)'}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                mode === 'single'
                  ? 'What do you need to do? (e.g., Follow up with Sarah about the project proposal)'
                  : 'Enter multiple action items, one per line:\nCall the dentist\nReview Q4 budget\nPrepare presentation slides'
              }
              className="content-textarea"
              autoFocus
              rows={mode === 'bulk' ? 8 : 4}
            />
          </div>

          {mode === 'bulk' && bulkItems.length > 0 && (
            <div className="bulk-info">
              {bulkItems.length} item{bulkItems.length !== 1 ? 's' : ''} ready to create
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="keyboard-hint">
            {mode === 'single' ? (
              <>
                <kbd>Cmd/Ctrl</kbd> + <kbd>Enter</kbd> to save • <kbd>Esc</kbd> to cancel
              </>
            ) : (
              <>
                <kbd>Esc</kbd> to cancel
              </>
            )}
          </div>

          <div className="create-panel-actions">
            <button
              className="create-action-button"
              onClick={handleCreate}
              disabled={!content.trim() || creating || (mode === 'bulk' && bulkItems.length === 0)}
            >
              {creating ? (
                <>
                  <Plus size={16} className="spinning" />
                  Creating...
                </>
              ) : mode === 'bulk' && bulkItems.length > 0 ? (
                <>
                  <List size={16} />
                  Create {bulkItems.length} Item{bulkItems.length !== 1 ? 's' : ''}
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

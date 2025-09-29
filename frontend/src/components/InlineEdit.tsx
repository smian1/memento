import React, { useState } from 'react';
import { Edit3, Check, X } from 'lucide-react';
import { formatInlineText } from '../utils/formatText';

interface InlineEditProps {
  content: string;
  onSave: (newContent: string) => void;
  disabled?: boolean;
  showEditButton?: boolean;
}

export function InlineEdit({ content, onSave, disabled = false, showEditButton = false }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);

  const handleStartEdit = () => {
    setEditValue(content);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editValue.trim() !== content.trim()) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="inline-edit editing">
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="edit-textarea"
          autoFocus
          rows={Math.max(2, editValue.split('\n').length)}
        />
        <div className="edit-actions">
          <button
            className="edit-action save"
            onClick={handleSave}
            disabled={disabled}
          >
            <Check size={14} />
          </button>
          <button
            className="edit-action cancel"
            onClick={handleCancel}
            disabled={disabled}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-edit">
      <div className="content-text">{formatInlineText(content)}</div>
      {showEditButton && !disabled && (
        <button
          className="edit-trigger"
          onClick={handleStartEdit}
          title="Click to edit"
        >
          <Edit3 size={14} />
        </button>
      )}
    </div>
  );
}
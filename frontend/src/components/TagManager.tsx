import React, { useState, useEffect } from 'react';
import { HiX, HiPlus, HiPencilAlt, HiTrash } from 'react-icons/hi';
import { tagsApi, type Tag } from '../api/client';

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onTagCreated?: (tag: Tag) => void;
  onTagUpdated?: (tag: Tag) => void;
  onTagDeleted?: (tagId: number) => void;
}

// Auto-generate unique colors based on tag name
const generateTagColor = (tagName: string): string => {
  const colors = [
    'rgba(102, 126, 234, 0.8)',   // Blue
    'rgba(139, 92, 246, 0.8)',    // Purple  
    'rgba(236, 72, 153, 0.8)',    // Pink
    'rgba(34, 197, 94, 0.8)',     // Green
    'rgba(249, 115, 22, 0.8)',    // Orange
    'rgba(6, 182, 212, 0.8)',     // Cyan
    'rgba(168, 85, 247, 0.8)',    // Violet
    'rgba(245, 101, 101, 0.8)',   // Red
    'rgba(52, 211, 153, 0.8)',    // Emerald
    'rgba(251, 191, 36, 0.8)',    // Amber
    'rgba(129, 140, 248, 0.8)',   // Indigo
    'rgba(244, 114, 182, 0.8)',   // Fuchsia
  ];
  
  // Simple hash function to get consistent color for same name
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export function TagManager({
  isOpen,
  onClose,
  onTagCreated,
  onTagUpdated,
  onTagDeleted
}: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen]);

  const loadTags = async () => {
    setLoading(true);
    try {
      const response = await tagsApi.getAll({ limit: 100 });
      setTags(response.data);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const autoColor = generateTagColor(newTagName.trim());
    
    try {
      const response = await tagsApi.create({
        name: newTagName.trim(),
        color: autoColor
      });

      const newTag = response.data;
      setTags(prev => [...prev, newTag]);
      setNewTagName('');
      setShowCreateForm(false);

      if (onTagCreated) {
        onTagCreated(newTag);
      }
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  const handleUpdateTag = async (tag: Tag, updates: { name?: string; color?: string }) => {
    try {
      const response = await tagsApi.update(tag.id, updates);
      const updatedTag = response.data;

      setTags(prev => prev.map(t => t.id === tag.id ? updatedTag : t));
      setEditingTag(null);

      if (onTagUpdated) {
        onTagUpdated(updatedTag);
      }
    } catch (error) {
      console.error('Error updating tag:', error);
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    if (!window.confirm(`Are you sure you want to delete the tag "${tag.name}"? This will remove it from all action items.`)) {
      return;
    }

    try {
      await tagsApi.delete(tag.id);
      setTags(prev => prev.filter(t => t.id !== tag.id));

      if (onTagDeleted) {
        onTagDeleted(tag.id);
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateTag();
    } else if (e.key === 'Escape') {
      setShowCreateForm(false);
      setNewTagName('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tag-manager-overlay">
      <div className="tag-manager-modal">
        <div className="tag-manager-header">
          <h2>Manage Tags</h2>
          <button className="close-button" onClick={onClose}>
            <HiX size={20} />
          </button>
        </div>

        <div className="tag-manager-content">
          {/* Create new tag section */}
          <div className="create-tag-section">
            {showCreateForm ? (
              <div className="create-tag-form">
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Tag name (color will be auto-generated)"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="tag-name-input"
                    autoFocus
                  />
                  {newTagName.trim() && (
                    <div className="color-preview">
                      <span 
                        className="preview-tag"
                        style={{ 
                          backgroundColor: generateTagColor(newTagName.trim()),
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        {newTagName.trim()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="form-actions">
                  <button className="create-button" onClick={handleCreateTag} disabled={!newTagName.trim()}>
                    Create Tag
                  </button>
                  <button className="cancel-button" onClick={() => {
                    setShowCreateForm(false);
                    setNewTagName('');
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button className="add-tag-button" onClick={() => setShowCreateForm(true)}>
                <HiPlus size={20} />
                Create New Tag
              </button>
            )}
          </div>

          {/* Tags list */}
          <div className="tags-list">
            {loading ? (
              <div className="loading-state">Loading tags...</div>
            ) : tags.length === 0 ? (
              <div className="empty-state">No tags created yet. Create your first tag above!</div>
            ) : (
              tags.map((tag) => (
                <div key={tag.id} className="tag-item">
                  {editingTag?.id === tag.id ? (
                    <EditTagForm
                      tag={tag}
                      onSave={(updates) => handleUpdateTag(tag, updates)}
                      onCancel={() => setEditingTag(null)}
                    />
                  ) : (
                    <div className="tag-display">
                      <div className="tag-info">
                        <span 
                          className="tag-pill-preview"
                          style={{ 
                            backgroundColor: tag.color,
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                          }}
                        >
                          {tag.name}
                        </span>
                      </div>
                      <div className="tag-actions">
                        <button
                          className="tag-action-button edit"
                          onClick={() => setEditingTag(tag)}
                          title="Edit tag"
                          aria-label="Edit tag"
                        >
                          <HiPencilAlt size={20} />
                        </button>
                        <button
                          className="tag-action-button delete"
                          onClick={() => handleDeleteTag(tag)}
                          title="Delete tag"
                          aria-label="Delete tag"
                        >
                          <HiTrash size={20} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditTagFormProps {
  tag: Tag;
  onSave: (updates: { name?: string; color?: string }) => void;
  onCancel: () => void;
}

function EditTagForm({ tag, onSave, onCancel }: EditTagFormProps) {
  const [name, setName] = useState(tag.name);

  const handleSave = () => {
    const updates: { name?: string; color?: string } = {};

    if (name !== tag.name) {
      updates.name = name;
      updates.color = generateTagColor(name); // Auto-generate new color for new name
    }

    if (Object.keys(updates).length > 0) {
      onSave(updates);
    } else {
      onCancel();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="edit-tag-form">
      <div className="form-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyPress}
          className="tag-name-input"
          autoFocus
        />
        <div className="color-preview">
          <span 
            className="preview-tag"
            style={{ 
              backgroundColor: generateTagColor(name),
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            {name}
          </span>
        </div>
      </div>
      <div className="form-actions">
        <button className="save-button" onClick={handleSave} disabled={!name.trim()}>
          Save
        </button>
        <button className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

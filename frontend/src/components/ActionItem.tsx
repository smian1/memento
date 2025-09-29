import { useState, useRef } from 'react';
import { Check, Square, Edit2, Tag as TagIcon, Trash2, Zap, Bot, X } from 'lucide-react';
import { actionItemsApi, tagsApi, type ActionItem as ActionItemType, type Tag, ActionItemSource } from '../api/client';
import { formatInlineText } from '../utils/formatText';
import { ConfirmDialog } from './ConfirmDialog';

interface ActionItemProps {
  item: ActionItemType;
  onUpdate: (updatedItem: ActionItemType) => void;
  onDelete?: (itemId: number) => void;
  showEditButton?: boolean;
}

export function ActionItem({ item, onUpdate, onDelete }: ActionItemProps) {
  const [updating, setUpdating] = useState(false);
  const [showHoverMenu, setShowHoverMenu] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const tagSelectorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showTagSelectorRef = useRef(showTagSelector);
  
  // Keep ref in sync with state
  showTagSelectorRef.current = showTagSelector;

  const handleCompletionToggle = async () => {
    setUpdating(true);
    try {
      const response = await actionItemsApi.update(item.id, {
        completed: !item.completed,
      });
      onUpdate(response.data);
    } catch (error) {
      console.error('Error updating action item:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleContentUpdate = async (newContent: string) => {
    try {
      const response = await actionItemsApi.update(item.id, {
        content: newContent,
      });
      onUpdate(response.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating action item content:', error);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowActionMenu(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (onDelete) {
      try {
        await actionItemsApi.delete(item.id);
        onDelete(item.id);
      } catch (error) {
        console.error('Error deleting action item:', error);
      }
    }
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const loadAvailableTags = async () => {
    if (availableTags.length === 0) {
      setLoadingTags(true);
      try {
        const response = await tagsApi.getAll({ limit: 100 });
        setAvailableTags(response.data);
      } catch (error) {
        console.error('Error loading tags:', error);
      } finally {
        setLoadingTags(false);
      }
    }
  };


  const handleTagToggle = async (tag: Tag) => {
    const isCurrentlyTagged = item.tags?.some(t => t.id === tag.id);
    try {
      if (isCurrentlyTagged) {
        await actionItemsApi.removeTag(item.id, tag.id);
      } else {
        await actionItemsApi.addTags(item.id, [tag.id]);
      }

      // Refresh the item to get updated tags
      const response = await actionItemsApi.getById(item.id);
      onUpdate(response.data);
    } catch (error) {
      console.error('Error toggling tag:', error);
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    try {
      await actionItemsApi.removeTag(item.id, tagId);
      const response = await actionItemsApi.getById(item.id);
      onUpdate(response.data);
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

  const handleActionMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowActionMenu(!showActionMenu);
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowActionMenu(false);
    setIsEditing(true);
  };

  const handleTagAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Don't close action menu immediately, let hover handle it
    loadAvailableTags();
    setShowTagSelector(true);
  };

  const clearTagSelectorTimeout = () => {
    if (tagSelectorTimeoutRef.current) {
      console.log('🔄 Clearing tag selector timeout');
      clearTimeout(tagSelectorTimeoutRef.current);
      tagSelectorTimeoutRef.current = null;
    }
  };

  const handleTagHover = () => {
    console.log('🟢 TAG HOVER - Mouse entered Add/Remove tags button');
    clearTagSelectorTimeout();
    loadAvailableTags();
    setShowTagSelector(true);
    console.log('🟢 TAG HOVER - setShowTagSelector(true) called');
  };

  const handleTagLeave = () => {
    clearTagSelectorTimeout();
    // Set a longer timeout to give user time to move to tag selector
    tagSelectorTimeoutRef.current = setTimeout(() => {
      setShowTagSelector(false);
      tagSelectorTimeoutRef.current = null;
    }, 500);
  };

  const handleActionMenuLeave = () => {
    console.log('🟡 handleActionMenuLeave: leaving action menu area');
    // Only close menus if tag selector is not active
    setTimeout(() => {
      console.log(`🟡 handleActionMenuLeave: timeout fired, showTagSelector=${showTagSelectorRef.current}`);
      // Don't close if tag selector is currently active
      if (!showTagSelectorRef.current) {
        console.log('🟡 handleActionMenuLeave: closing menus (tag selector not active)');
        setShowActionMenu(false);
        setShowTagSelector(false);
      } else {
        console.log('🟡 handleActionMenuLeave: keeping menus open (tag selector is active)');
      }
    }, 150);
  };

  return (
    <div
      className={`action-item ${item.completed ? 'completed' : ''} ${item.source === ActionItemSource.CUSTOM ? 'custom' : 'limitless'}`}
      onMouseEnter={() => setShowHoverMenu(true)}
      onMouseLeave={() => {
        // Only hide hover menu if no dropdowns are open
        if (!showActionMenu && !showTagSelector) {
          setShowHoverMenu(false);
        }
      }}
    >
      <button
        className="checkbox"
        onClick={handleCompletionToggle}
        disabled={updating}
      >
        {item.completed ? (
          <Check size={20} className="check-icon" />
        ) : (
          <Square size={20} className="square-icon" />
        )}
      </button>

      <div className="action-item-content">
        <div className="content-wrapper">
          <div className="content-left">
            {isEditing ? (
              <EditableContent
                content={item.content}
                onSave={handleContentUpdate}
                onCancel={() => setIsEditing(false)}
                disabled={updating}
              />
            ) : (
              <div className="content-display">
                <div className="content-text">{formatInlineText(item.content)}</div>
              </div>
            )}
          </div>

          <div className="content-right">
            {/* Tags display */}
            {item.tags && item.tags.length > 0 && (
              <div className="tags-container">
                {item.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="tag-pill"
                    style={{ backgroundColor: tag.color }}
                    onClick={() => handleRemoveTag(tag.id)}
                    title={`Click to remove "${tag.name}" tag`}
                  >
                    {tag.name}
                    <span className="tag-remove">×</span>
                  </span>
                ))}
              </div>
            )}

            {/* Source indicator */}
            <div className="source-indicator">
              {item.source === ActionItemSource.CUSTOM ? (
                <Zap size={14} className="custom-icon" />
              ) : (
                <Bot size={14} className="limitless-icon" />
              )}
            </div>
          </div>
        </div>

        {/* More button and dropdown container */}
        {showHoverMenu && (
          <div className="more-menu-container">
            <button
              className="more-button"
              onClick={handleActionMenuClick}
              title="More actions"
            >
              ⋯
            </button>
            
            {/* Action menu and tag selector container for better hover handling */}
            {showActionMenu && (
              <div className="menu-hover-container">
                {/* Action menu dropdown */}
                <div 
                  className="action-menu-dropdown"
                  onMouseLeave={handleActionMenuLeave}
                >
                  <button
                    className="action-menu-item"
                    onClick={(e) => {
                      console.log('🔴 EDIT BUTTON CLICKED');
                      handleStartEdit(e);
                    }}
                  >
                    <Edit2 size={14} />
                    Edit text
                  </button>
                  <button
                    className="action-menu-item"
                    onClick={(e) => {
                      console.log('🔴 TAG BUTTON CLICKED');
                      handleTagAction(e);
                    }}
                    onMouseEnter={() => {
                      console.log('🟢 TAG BUTTON MOUSE ENTER');
                      handleTagHover();
                    }}
                    onMouseLeave={() => {
                      console.log('🔴 TAG BUTTON MOUSE LEAVE');
                      handleTagLeave();
                    }}
                  >
                    <TagIcon size={14} />
                    Add/Remove tags
                  </button>
                  {item.source === ActionItemSource.CUSTOM && onDelete && (
                    <button
                      className="action-menu-item delete"
                      onClick={handleDelete}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  )}
                </div>

                {/* Tag selector dropdown - positioned relative to this container */}
                {/* Debug: showTagSelector=${showTagSelector}, showHoverMenu=${showHoverMenu} */}
                {showTagSelector && showHoverMenu && (
                  <div 
                    className="tag-selector"
                    onMouseEnter={() => {
                      console.log('🟢 Tag selector mouse enter');
                      clearTagSelectorTimeout();
                      setShowTagSelector(true);
                      console.log('🟢 Tag selector: keeping open');
                    }}
                    onMouseLeave={() => {
                      console.log('🟠 Tag selector mouse leave, setting timeout');
                      clearTagSelectorTimeout();
                      // Set timeout to hide when leaving tag selector
                      tagSelectorTimeoutRef.current = setTimeout(() => {
                        console.log('🟠 Tag selector: timeout fired, hiding');
                        setShowTagSelector(false);
                        tagSelectorTimeoutRef.current = null;
                      }, 300);
                    }}
                  >
                <div className="tag-selector-header">Select Tags</div>
                {loadingTags ? (
                  <div className="tag-loading">Loading tags...</div>
                ) : availableTags.length === 0 ? (
                  <div className="tag-loading">No tags available. Create some tags first!</div>
                ) : (
                  <div className="tag-options">
                    {availableTags.map((tag) => {
                      const isSelected = item.tags?.some(t => t.id === tag.id);
                      return (
                        <div
                          key={tag.id}
                          className={`tag-option ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleTagToggle(tag)}
                        >
                          <span
                            className="tag-color-indicator"
                            style={{ backgroundColor: tag.color }}
                          ></span>
                          {tag.name}
                          {isSelected && <span className="tag-check">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {item.completedAt && (
          <div className="completion-time">
            Completed: {new Date(item.completedAt).toLocaleDateString()}
          </div>
        )}
      </div>


      {/* Backdrop for closing dropdowns */}
      {(showActionMenu || showTagSelector) && (
        <div
          className="dropdown-backdrop"
          onClick={() => {
            setShowActionMenu(false);
            setShowTagSelector(false);
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Action Item"
        message="Are you sure you want to delete this action item? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

interface EditableContentProps {
  content: string;
  onSave: (newContent: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

function EditableContent({ content, onSave, onCancel, disabled = false }: EditableContentProps) {
  const [editValue, setEditValue] = useState(content);

  const handleSave = () => {
    if (editValue.trim() !== content.trim()) {
      onSave(editValue.trim());
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

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
          title="Save (Cmd+Enter)"
        >
          <Check size={14} />
        </button>
        <button
          className="edit-action cancel"
          onClick={onCancel}
          disabled={disabled}
          title="Cancel (Esc)"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

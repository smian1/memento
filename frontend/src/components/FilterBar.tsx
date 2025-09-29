import { useState, useEffect, useRef } from 'react';
import { Filter, X, Tag as TagIcon, Settings, Bot, Zap } from 'lucide-react';
import { tagsApi, type Tag, ActionItemSource } from '../api/client';

export interface FilterOptions {
  source?: ActionItemSource;
  tagIds?: number[];
  showCompleted?: boolean;
}

interface FilterBarProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onManageTags?: () => void;
  showHeader?: boolean;
}

export function FilterBar({ filters, onFiltersChange, onManageTags, showHeader = true }: FilterBarProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTagDropdown && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        // Check if click is inside the dropdown
        const dropdown = document.querySelector('.tag-dropdown');
        if (!dropdown || !dropdown.contains(event.target as Node)) {
          setShowTagDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTagDropdown]);

  const loadTags = async () => {
    setLoadingTags(true);
    try {
      const response = await tagsApi.getAll({ limit: 100 });
      setAvailableTags(response.data);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  const handleSourceChange = (source?: ActionItemSource) => {
    onFiltersChange({ ...filters, source });
  };

  const handleCompletedToggle = () => {
    onFiltersChange({
      ...filters,
      showCompleted: !filters.showCompleted
    });
  };

  const handleTagToggle = (tagId: number) => {
    const currentTagIds = filters.tagIds || [];
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter(id => id !== tagId)
      : [...currentTagIds, tagId];

    onFiltersChange({
      ...filters,
      tagIds: newTagIds.length > 0 ? newTagIds : undefined
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const getSelectedTags = () => {
    if (!filters.tagIds) return [];
    return availableTags.filter(tag => filters.tagIds!.includes(tag.id));
  };

  const hasActiveFilters = () => {
    return filters.source || (filters.tagIds && filters.tagIds.length > 0) || filters.showCompleted;
  };

  const handleTagDropdownToggle = () => {
    setShowTagDropdown(!showTagDropdown);
  };

  const selectedTags = getSelectedTags();

  return (
    <div className="filter-bar">
      <div className="filter-section">
        {showHeader && (
          <div className="filter-group filter-header">
            <Filter size={16} />
            <span className="filter-title">Filters</span>
          </div>
        )}

        {/* Source Filter */}
        <div className="filter-group">
          <div className="source-buttons">
            <button
              className={`source-button ${!filters.source ? 'active' : ''}`}
              onClick={() => handleSourceChange(undefined)}
            >
              All
            </button>
            <button
              className={`source-button ${filters.source === ActionItemSource.LIMITLESS ? 'active' : ''}`}
              onClick={() => handleSourceChange(ActionItemSource.LIMITLESS)}
            >
              <Bot size={14} />
              Limitless
            </button>
            <button
              className={`source-button ${filters.source === ActionItemSource.CUSTOM ? 'active' : ''}`}
              onClick={() => handleSourceChange(ActionItemSource.CUSTOM)}
            >
              <Zap size={14} />
              Custom
            </button>
          </div>
        </div>

        {/* Tags and Completed Filter - combined row */}
        <div className="filter-group">
          <div style={{ position: 'relative', flex: 1 }}>
            <button
              ref={buttonRef}
              className="tag-filter-button"
              onClick={handleTagDropdownToggle}
            >
              <TagIcon size={14} />
              Tags
              {selectedTags.length > 0 && (
                <span className="tag-count">{selectedTags.length}</span>
              )}
            </button>

            {showTagDropdown && (
              <div 
                className="tag-dropdown"
                style={{
                  zIndex: 10000
                }}
              >
                <div className="tag-dropdown-header">
                  <span>Filter by tags</span>
                  {onManageTags && (
                    <button
                      className="manage-tags-button"
                      onClick={() => {
                        onManageTags();
                        setShowTagDropdown(false);
                      }}
                    >
                      <Settings size={14} />
                    </button>
                  )}
                </div>
                {loadingTags ? (
                  <div className="tag-dropdown-loading">Loading tags...</div>
                ) : availableTags.length === 0 ? (
                  <div className="tag-dropdown-empty">
                    No tags available
                    {onManageTags && (
                      <button
                        className="create-first-tag-button"
                        onClick={() => {
                          onManageTags();
                          setShowTagDropdown(false);
                        }}
                      >
                        Create your first tag
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="tag-options">
                    {availableTags.map((tag) => {
                      const isSelected = filters.tagIds?.includes(tag.id) || false;
                      return (
                        <label key={tag.id} className="tag-option">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleTagToggle(tag.id)}
                          />
                          <span
                            className="tag-color-indicator"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="tag-name">{tag.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <label className="filter-checkbox" style={{ flex: 1 }}>
            <input
              type="checkbox"
              checked={filters.showCompleted || false}
              onChange={handleCompletedToggle}
            />
            Completed
          </label>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters() && (
          <button
            className="clear-filters-button"
            onClick={clearAllFilters}
            title="Clear all filters"
          >
            <X size={16} />
            Clear
          </button>
        )}
      </div>

      {/* Active Filter Tags */}
      {selectedTags.length > 0 && (
        <div className="active-filters">
          <span className="active-filters-label">Active tags:</span>
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="active-filter-tag"
              style={{ backgroundColor: tag.color }}
              onClick={() => handleTagToggle(tag.id)}
              title={`Click to remove "${tag.name}" filter`}
            >
              {tag.name}
              <X size={12} className="remove-filter" />
            </span>
          ))}
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showTagDropdown && (
        <div
          className="dropdown-overlay"
          onClick={() => setShowTagDropdown(false)}
        />
      )}
    </div>
  );
}
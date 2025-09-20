import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, ChevronRight } from 'lucide-react';
import { ActionItem } from './ActionItem';
import { InlineEdit } from './InlineEdit';
import { FilterBar, type FilterOptions } from './FilterBar';
import { formatInlineText } from '../utils/formatText';
import {
  actionItemsApi,
  decisionsApi,
  ideasApi,
  questionsApi,
  themesApi,
  quotesApi,
  highlightsApi,
  type ActionItem as ActionItemType,
  type Decision,
  type Idea,
  type Question,
  type Theme,
  type Quote,
  type Highlight,
  ActionItemSource,
} from '../api/client';

type SectionType =
  | 'highlights'
  | 'action_items'
  | 'decisions'
  | 'ideas'
  | 'questions'
  | 'themes'
  | 'quotes';

interface ConsolidatedViewProps {
  activeSection: SectionType;
  searchTerm?: string;
  selectedDate?: string | null;
  filters?: FilterOptions;
}

export function ConsolidatedView({ activeSection, searchTerm = '', selectedDate, filters = {} }: ConsolidatedViewProps) {
  const [sectionData, setSectionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newItemContent, setNewItemContent] = useState('');
  const [createItemDate, setCreateItemDate] = useState(new Date().toISOString().split('T')[0]);

  // Load data when activeSection or filters change
  useEffect(() => {
    loadSectionData(activeSection);
  }, [activeSection, filters]);

  const loadSectionData = async (section: SectionType) => {
    setLoading(true);
    try {
      let response;
      switch (section) {
        case 'highlights':
          response = await highlightsApi.getAll({ limit: 1000 });
          break;
        case 'action_items':
          response = await actionItemsApi.getAll({
            limit: 1000,
            completed: filters.showCompleted ? undefined : false,
            source: filters.source,
            tag_ids: filters.tagIds
          });
          break;
        case 'decisions':
          response = await decisionsApi.getAll({ limit: 1000 });
          break;
        case 'ideas':
          response = await ideasApi.getAll({ limit: 1000 });
          break;
        case 'questions':
          response = await questionsApi.getAll({ limit: 1000 });
          break;
        case 'themes':
          response = await themesApi.getAll({ limit: 1000 });
          break;
        case 'quotes':
          response = await quotesApi.getAll({ limit: 1000 });
          break;
        default:
          response = { data: [] };
      }
      setSectionData(response.data);
    } catch (error) {
      console.error(`Error loading ${section}:`, error);
      setSectionData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomItem = async () => {
    if (!newItemContent.trim()) return;

    try {
      const response = await actionItemsApi.create({
        content: newItemContent.trim(),
        date: createItemDate,
        source: ActionItemSource.CUSTOM
      });

      setSectionData(prev => [response.data, ...prev]);
      setNewItemContent('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating custom action item:', error);
    }
  };

  const handleDeleteItem = (itemId: number) => {
    setSectionData(prev => prev.filter(item => item.id !== itemId));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleCreateCustomItem();
    } else if (e.key === 'Escape') {
      setShowCreateForm(false);
      setNewItemContent('');
    }
  };


  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const groupByDate = (items: any[]) => {
    const filtered = items.filter(item => {
      // Filter by selected date if provided
      if (selectedDate && item.date !== selectedDate) {
        return false;
      }

      // Filter by search term
      if (searchTerm) {
        const searchContent = getSearchableContent(item).toLowerCase();
        if (!searchContent.includes(searchTerm.toLowerCase())) {
          return false;
        }
      }

      // Filter completed items for action items section
      if (activeSection === 'action_items' && !filters.showCompleted && item.completed) {
        return false;
      }

      return true;
    });

    const grouped = filtered.reduce((acc, item) => {
      const date = item.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({ date, items }));
  };

  const getSearchableContent = (item: any): string => {
    if (item.content) return item.content;
    if (item.text && item.speaker) return `${item.text} ${item.speaker}`;
    if (item.title && item.description) return `${item.title} ${item.description}`;
    return '';
  };

  if (loading) {
    return <div className="loading">Loading {activeSection}...</div>;
  }

  const groupedData = groupByDate(sectionData);

  if (groupedData.length === 0) {
    return <div className="no-results">No items found for {activeSection}.</div>;
  }

  return (
    <div className="section-content">

      {/* Custom Action Item Creation */}
      {activeSection === 'action_items' && showCreateForm && (
        <div className="create-section">
          <div className="create-form">
            <div className="create-form-header">
              <h3>Create Custom Action Item</h3>
              <input
                type="date"
                value={createItemDate}
                onChange={(e) => setCreateItemDate(e.target.value)}
                className="date-input"
              />
            </div>
            <textarea
              value={newItemContent}
              onChange={(e) => setNewItemContent(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter your custom action item..."
              className="create-textarea"
              autoFocus
            />
            <div className="create-actions">
              <button
                className="create-button"
                onClick={handleCreateCustomItem}
                disabled={!newItemContent.trim()}
              >
                Create Item
              </button>
              <button
                className="cancel-button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewItemContent('');
                }}
              >
                Cancel
              </button>
            </div>
            <div className="create-hint">
              Press Cmd/Ctrl + Enter to save, Esc to cancel
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Button - only show when not in create mode */}
      {activeSection === 'action_items' && !showCreateForm && (
        <button
          className="floating-add-button"
          onClick={() => setShowCreateForm(true)}
          title="Add new action item"
        >
          <Plus size={16} />
        </button>
      )}

      {groupedData.map(({ date, items }) => (
        <div key={date} className="date-group">
          <div className="date-header">
            <Calendar size={16} className="date-icon" />
            {formatDate(date)}
          </div>
          <div className="items-list">
            {items.map((item, index) => {
              const itemKey = `${date}-${item.id || index}`;
              return (
                <div
                  key={item.id || index}
                  className="group-item"
                >
                  {activeSection === 'action_items' ? (
                    <ActionItem
                      item={item as ActionItemType}
                      onUpdate={(updatedItem) => {
                        setSectionData(prev =>
                          prev.map(i => (i.id === updatedItem.id ? updatedItem : i))
                        );
                      }}
                      onDelete={handleDeleteItem}
                    />
                  ) : activeSection === 'quotes' ? (
                    <div className="quote-content">
                      <div className="quote-text">"{formatInlineText(item.text)}"</div>
                      <div className="quote-speaker">— {formatInlineText(item.speaker)}</div>
                    </div>
                  ) : activeSection === 'themes' ? (
                    <div className="theme-content">
                      <div className="theme-title">{formatInlineText(item.title)}</div>
                      <div className="theme-description">{formatInlineText(item.description)}</div>
                    </div>
                  ) : (
                    <InlineEdit
                      content={item.content}
                      onSave={(newContent) => {
                        // Handle content update based on section type
                        console.log('Update:', activeSection, item.id, newContent);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

    </div>
  );
}
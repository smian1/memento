import { useState, useEffect, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { ActionItem } from './ActionItem';
import { InlineEdit } from './InlineEdit';
import { CreateActionItemPanel } from './CreateActionItemPanel';
import type { FilterOptions } from './FilterBar';
import { formatInlineText } from '../utils/formatText';
import {
  actionItemsApi,
  decisionsApi,
  ideasApi,
  questionsApi,
  themesApi,
  quotesApi,
  highlightsApi,
  discoveryApi,
  type ActionItem as ActionItemType,
  type KnowledgeNugget,
  type MemorableExchange,
} from '../api/client';

type SectionType =
  | 'highlights'
  | 'action_items'
  | 'decisions'
  | 'ideas'
  | 'questions'
  | 'themes'
  | 'quotes'
  | 'knowledge_nuggets'
  | 'memorable_exchanges';

// Base interface for all section items
interface BaseSectionItem {
  id: number;
  date: string;
  [key: string]: unknown;
}

// Specific types for different sections
interface Highlight extends BaseSectionItem {
  content: string;
}

interface Quote extends BaseSectionItem {
  text: string;
  speaker: string;
}

interface Theme extends BaseSectionItem {
  title: string;
  description: string;
}

interface Decision extends BaseSectionItem {
  content: string;
}

interface Idea extends BaseSectionItem {
  content: string;
}

interface Question extends BaseSectionItem {
  content: string;
}

// Union type for all possible section items
type SectionItem = ActionItemType | Highlight | Quote | Theme | Decision | Idea | Question | KnowledgeNugget | MemorableExchange;

interface ConsolidatedViewProps {
  activeSection: SectionType;
  searchTerm?: string;
  selectedDate?: string | null;
  filters?: FilterOptions;
  onStatsRefresh?: () => void;
  refreshTrigger?: number;
}

export function ConsolidatedView({ activeSection, searchTerm = '', selectedDate, filters = {}, onStatsRefresh, refreshTrigger }: ConsolidatedViewProps) {
  const [sectionData, setSectionData] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  // Listen for the custom event from DashboardApp
  useEffect(() => {
    const handleShowCreateForm = () => {
      if (activeSection === 'action_items') {
        setShowCreatePanel(true);
      }
    };

    window.addEventListener('showCreateForm', handleShowCreateForm);
    return () => window.removeEventListener('showCreateForm', handleShowCreateForm);
  }, [activeSection]);

  const loadSectionData = useCallback(async (section: SectionType) => {
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
        case 'knowledge_nuggets':
          response = await discoveryApi.getKnowledgeNuggets({ limit: 1000 });
          break;
        case 'memorable_exchanges':
          response = await discoveryApi.getMemorableExchanges({ limit: 1000 });
          break;
        default:
          response = { data: [] };
      }
      setSectionData(response.data as SectionItem[]);
    } catch (error) {
      console.error(`Error loading ${section}:`, error);
      setSectionData([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load data when activeSection, filters, or refreshTrigger change
  useEffect(() => {
    loadSectionData(activeSection);
  }, [activeSection, filters, refreshTrigger, loadSectionData]);

  const handleItemCreated = (newItem: ActionItemType) => {
    setSectionData(prev => [newItem, ...prev]);

    // Refresh stats when new action item is created
    if (onStatsRefresh) {
      onStatsRefresh();
    }
  };

  const handleDeleteItem = (itemId: number) => {
    setSectionData(prev => prev.filter(item => item.id !== itemId));

    // Refresh stats when action item is deleted
    if (onStatsRefresh) {
      onStatsRefresh();
    }
  };


  const formatDate = (dateStr: string) => {
    // Parse as local date to avoid UTC timezone shift
    // When new Date("2025-09-23") is created, JS treats it as UTC midnight
    // which converts to previous day in Pacific Time. Parse components locally instead.
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const groupByDate = (items: SectionItem[]): { date: string; items: SectionItem[] }[] => {
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
      if (activeSection === 'action_items' && !filters.showCompleted && 'completed' in item && item.completed) {
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
    }, {} as Record<string, SectionItem[]>);

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({ date, items }));
  };

  const getSearchableContent = (item: SectionItem): string => {
    if ('content' in item && item.content && typeof item.content === 'string') return item.content;
    if ('text' in item && 'speaker' in item && item.text && item.speaker) return `${String(item.text)} ${String(item.speaker)}`;
    if ('title' in item && 'description' in item && item.title && item.description) return `${String(item.title)} ${String(item.description)}`;
    if ('fact' in item && item.fact) return `${(item as KnowledgeNugget).category || ''} ${String(item.fact)} ${(item as KnowledgeNugget).source || ''}`;
    if ('dialogue' in item && item.dialogue) return (item as MemorableExchange).dialogue.map(line => line.text).join(' ') + ' ' + ((item as MemorableExchange).context || '');
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
      {/* Custom Action Item Creation Modal */}
      {activeSection === 'action_items' && showCreatePanel && (
        <CreateActionItemPanel
          onClose={() => setShowCreatePanel(false)}
          onCreated={handleItemCreated}
        />
      )}

      {groupedData.map(({ date, items }) => (
        <div key={date} className="date-group">
          <div className="date-header">
            <Calendar size={16} className="date-icon" />
            {formatDate(date)}
          </div>
          <div className="items-list">
            {items.map((item: SectionItem, index: number) => {
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
                        // Refresh stats when action item completion status changes
                        if (onStatsRefresh) {
                          onStatsRefresh();
                        }
                      }}
                      onDelete={handleDeleteItem}
                    />
                  ) : activeSection === 'quotes' && 'text' in item && 'speaker' in item ? (
                    <div className="quote-content">
                      <div className="quote-text">"{formatInlineText(String(item.text))}"</div>
                      <div className="quote-speaker">— {formatInlineText(String(item.speaker))}</div>
                    </div>
                  ) : activeSection === 'themes' && 'title' in item && 'description' in item ? (
                    <div className="theme-content">
                      <div className="theme-title">{formatInlineText(String(item.title))}</div>
                      <div className="theme-description">{formatInlineText(String(item.description))}</div>
                    </div>
                  ) : activeSection === 'knowledge_nuggets' && 'fact' in item ? (
                    <div className="nugget-content">
                      {(item as KnowledgeNugget).category && (
                        <span className="nugget-category">[{(item as KnowledgeNugget).category}]</span>
                      )}
                      <div className="nugget-fact">{formatInlineText(String((item as KnowledgeNugget).fact))}</div>
                      {(item as KnowledgeNugget).source && (
                        <div className="nugget-source">Source: {formatInlineText(String((item as KnowledgeNugget).source))}</div>
                      )}
                    </div>
                  ) : activeSection === 'memorable_exchanges' && 'dialogue' in item ? (
                    <div className="exchange-content">
                      <div className="exchange-dialogue">
                        {(item as MemorableExchange).dialogue.map((line, idx) => (
                          <div key={idx} className="dialogue-line">
                            {line.speaker && <span className="dialogue-speaker">{line.speaker}:</span>}
                            <span className="dialogue-text">"{line.text}"</span>
                          </div>
                        ))}
                      </div>
                      {(item as MemorableExchange).context && (
                        <div className="exchange-context">{formatInlineText(String((item as MemorableExchange).context))}</div>
                      )}
                    </div>
                  ) : 'content' in item && typeof item.content === 'string' ? (
                    <InlineEdit
                      content={item.content}
                      onSave={(newContent) => {
                        // Handle content update based on section type
                        console.log('Update:', activeSection, item.id, newContent);
                      }}
                    />
                  ) : (
                    <div>Unknown item type</div>
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
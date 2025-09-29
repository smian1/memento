import { useState, useEffect } from 'react';
import { HiLightBulb, HiViewGrid, HiDatabase } from 'react-icons/hi';
import { Filter, MessageCircle, Plus } from 'lucide-react';
import { Calendar } from './components/Calendar';
import { DailyView } from './components/DailyView';
import { LifeLogView } from './components/LifeLogView';
import { ConsolidatedView } from './components/ConsolidatedView';
import { ConsolidatedSidebar } from './components/ConsolidatedSidebar';
import { SearchBar } from './components/SearchBar';
import { UserMenu } from './components/UserMenu';
import { FilterBar, type FilterOptions } from './components/FilterBar';
import { TagManager } from './components/TagManager';
import { ChatPanel } from './components/ChatPanel';
import { DiscoveryNotification } from './components/DiscoveryNotification';
import { DatabaseView } from './components/DatabaseView';
import { generalApi, discoveryApi, type DashboardStats } from './api/client';
import './App.css';

type ViewMode = 'daily' | 'all_insights';

type SectionType =
  | 'daily'
  | 'lifelogs'
  | 'highlights'
  | 'action_items'
  | 'decisions'
  | 'ideas'
  | 'questions'
  | 'themes'
  | 'quotes'
  | 'knowledge_nuggets'
  | 'memorable_exchanges'
  | 'database';

function DashboardApp() {
  // Initialize activeSection from localStorage or default to 'daily'
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [lastSelectedDate, setLastSelectedDate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeSection, setActiveSection] = useState<SectionType>(() => {
    // Try to restore from localStorage, default to 'lifelogs' if not found
    const savedSection = localStorage.getItem('activeSection');
    return (savedSection as SectionType) || 'lifelogs';
  });
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showTagManager, setShowTagManager] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const loadStats = async () => {
    try {
      const response = await generalApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
    
    // Restore saved date from localStorage if we're in a date-compatible view
    const savedDate = localStorage.getItem('lastSelectedDate');
    if (savedDate && (activeSection === 'daily' || activeSection === 'lifelogs')) {
      setSelectedDate(savedDate);
      setLastSelectedDate(savedDate);
    }
  }, [activeSection]);

  const handleSyncComplete = (syncResults?: any) => {
    // Reload stats when sync completes
    loadStats();
    
    // Force refresh of current view content by updating a key
    // This will trigger useEffect in ConsolidatedView and other components
    if (refreshTrigger !== undefined) {
      setRefreshTrigger(prev => prev + 1);
    }
    
    // Show sync results if available
    if (syncResults) {
      showSyncResultsFeedback(syncResults);
    }
  };

  const handleStatsRefresh = () => {
    // Callback for child components to trigger stats refresh
    loadStats();
  };

  const showSyncResultsFeedback = (syncResults: any) => {
    try {
      let message = 'Sync completed';
      const parts: string[] = [];
      
      if (syncResults.insights) {
        const insights = syncResults.insights;
        if (insights.added > 0) parts.push(`${insights.added} new insights`);
        if (insights.updated > 0) parts.push(`${insights.updated} updated insights`);
        if (insights.fetched > 0 && insights.added === 0 && insights.updated === 0) {
          parts.push(`${insights.fetched} insights checked (no changes)`);
        }
      }
      
      if (syncResults.lifelogs) {
        const lifelogs = syncResults.lifelogs;
        if (lifelogs.synced > 0) parts.push(`${lifelogs.synced} new life logs`);
        if (lifelogs.updated > 0) parts.push(`${lifelogs.updated} updated life logs`);
        if (lifelogs.skipped > 0 && lifelogs.synced === 0 && lifelogs.updated === 0) {
          parts.push(`${lifelogs.skipped} life logs checked (no changes)`);
        }
      }
      
      if (parts.length > 0) {
        message = `Sync completed: ${parts.join(', ')}`;
      } else {
        message = 'Sync completed - no new data found';
      }
      
      setSyncFeedback(message);
      
      // Clear feedback after 5 seconds
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (error) {
      console.error('Error processing sync results:', error);
      setSyncFeedback('Sync completed');
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  const handleDateSelect = (date: string) => {
    // Handle empty string as null (deselect)
    const selectedDateValue = date === '' ? null : date;
    setSelectedDate(selectedDateValue);
    
    // Store the last selected date for returning to daily view
    if (selectedDateValue) {
      setLastSelectedDate(selectedDateValue);
      // Save to localStorage for persistence
      localStorage.setItem('lastSelectedDate', selectedDateValue);
      
      // Only set viewMode to 'daily' if we're not already in a daily-compatible section
      // This preserves the current tab (daily or lifelogs) when selecting dates
      if (activeSection !== 'daily' && activeSection !== 'lifelogs') {
        setViewMode('daily');
        setActiveSection('lifelogs');
        // Save the section change to localStorage as well
        localStorage.setItem('activeSection', 'lifelogs');
      } else {
        // Keep current section but ensure viewMode is 'daily' for date-based views
        setViewMode('daily');
      }
    }
  };

  const handleSectionSelect = (section: SectionType) => {
    setActiveSection(section);
    
    // Save the selected section to localStorage for persistence
    localStorage.setItem('activeSection', section);
    
    // Update view mode based on section
    if (section === 'daily' || section === 'lifelogs') {
      setViewMode('daily');
      // Restore the last selected date when returning to daily or lifelogs view
      if (lastSelectedDate) {
        setSelectedDate(lastSelectedDate);
      }
    } else {
      setViewMode('all_insights');
      // Clear date filter when switching to consolidated view to show all time periods
      setSelectedDate(null);
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="app-branding">
            <img src="/logo.png" alt="MEMENTO" className="app-logo" />
            <h1 className="app-name">MEMENTO</h1>
          </div>
          <div className="header-controls">
            {activeSection !== 'daily' && activeSection !== 'lifelogs' && (
              <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            )}
            <UserMenu
              onSyncComplete={handleSyncComplete}
              onNavigateToSection={(section) => setActiveSection(section as SectionType)}
            />
          </div>
        </div>
        
        {/* Sync Feedback Toast */}
        {syncFeedback && (
          <div className="sync-feedback-toast">
            {syncFeedback}
          </div>
        )}
      </header>

      {/* Discovery Notification */}
      <DiscoveryNotification
        onDiscoveryApproved={() => {
          loadStats();
          setRefreshTrigger(prev => prev + 1);
        }}
      />

      <div className={`container ${isChatOpen ? 'with-chat' : ''}`}>
        <div className="sidebar">
          {/* Calendar at the top */}
          <div className="calendar-section">
            <Calendar 
              onDateSelect={handleDateSelect} 
              selectedDate={selectedDate}
              autoSelectDate={viewMode === 'daily'}
            />
          </div>

          {/* Section tabs below calendar */}
          <div className="section-tabs">
            <ConsolidatedSidebar
              stats={stats}
              activeSection={activeSection}
              onSectionSelect={handleSectionSelect}
              layout="tabs"
            />
          </div>

          {/* Show filters for action items in All Insights view */}
          {activeSection === 'action_items' && (
            <div className="sidebar-filters">
              <div className="sidebar-filters-header">
                <span className="sidebar-filters-title">
                  <Filter size={16} />
                  Filters
                </span>
              </div>
              <FilterBar
                filters={filters}
                onFiltersChange={setFilters}
                onManageTags={() => setShowTagManager(true)}
                showHeader={false}
              />
            </div>
          )}
        </div>

        <div className="main-content">
          <div className="content-header">
            <div className="content-title">
              {activeSection === 'daily' ? (
                selectedDate ? (
                  <>
                    <HiLightBulb className="content-title-icon" />
                    {`Daily Insights - ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}`}
                  </>
                ) : (
                  <>
                    <HiLightBulb className="content-title-icon" />
                    Daily Insights
                  </>
                )
              ) : activeSection === 'lifelogs' ? (
                selectedDate ? (
                  <>
                    <HiViewGrid className="content-title-icon" />
                    {`Life Logs - ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}`}
                  </>
                ) : (
                  <>
                    <HiViewGrid className="content-title-icon" />
                    Life Logs
                  </>
                )
              ) : activeSection === 'action_items' ? (
                <>
                  <HiViewGrid className="content-title-icon" />
                  Action Items
                  <button
                    className="add-action-button"
                    onClick={() => {
                      // We'll need to pass this down to ConsolidatedView
                      const event = new CustomEvent('showCreateForm');
                      window.dispatchEvent(event);
                    }}
                    title="Add new action item"
                  >
                    <Plus size={16} />
                  </button>
                </>
              ) : activeSection === 'highlights' ? (
                <>
                  <HiViewGrid className="content-title-icon" />
                  Top Highlights
                </>
              ) : activeSection === 'decisions' ? (
                <>
                  <HiViewGrid className="content-title-icon" />
                  Decisions
                </>
              ) : activeSection === 'ideas' ? (
                <>
                  <HiViewGrid className="content-title-icon" />
                  Ideas
                </>
              ) : activeSection === 'questions' ? (
                <>
                  <HiViewGrid className="content-title-icon" />
                  Questions
                </>
              ) : activeSection === 'themes' ? (
                <>
                  <HiViewGrid className="content-title-icon" />
                  Themes
                </>
              ) : activeSection === 'quotes' ? (
                <>
                  <HiViewGrid className="content-title-icon" />
                  Quotes
                </>
              ) : activeSection === 'database' ? (
                <>
                  <HiDatabase className="content-title-icon" />
                  Database Inspector
                </>
              ) : (
                <>
                  <HiViewGrid className="content-title-icon" />
                  All Insights
                </>
              )}
            </div>
          </div>

          <div className="content with-tabs">
            {activeSection === 'daily' ? (
              <DailyView selectedDate={selectedDate} refreshTrigger={refreshTrigger} />
            ) : activeSection === 'lifelogs' ? (
              <LifeLogView selectedDate={selectedDate} refreshTrigger={refreshTrigger} />
            ) : activeSection === 'database' ? (
              <DatabaseView />
            ) : (
              <ConsolidatedView
                activeSection={activeSection as Exclude<SectionType, 'daily' | 'lifelogs' | 'database'>}
                searchTerm={searchTerm}
                selectedDate={selectedDate}
                filters={filters}
                onStatsRefresh={handleStatsRefresh}
                refreshTrigger={refreshTrigger}
              />
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      </div>

      {/* Tag Manager Modal */}
      <TagManager
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
        onTagCreated={() => {
          // Reload stats when tags are created
          loadStats();
        }}
        onTagUpdated={() => {
          // Reload stats when tags are updated
          loadStats();
        }}
        onTagDeleted={() => {
          // Reload stats when tags are deleted
          loadStats();
        }}
      />

      {/* Floating Chat Button - only show when chat is closed */}
      {!isChatOpen && (
        <button
          className="floating-chat-button"
          onClick={() => setIsChatOpen(!isChatOpen)}
          title="Open Chat"
        >
          <MessageCircle size={20} />
        </button>
      )}
    </div>
  );
}

export default DashboardApp;

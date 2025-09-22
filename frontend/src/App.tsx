import { useState, useEffect } from 'react';
import { HiLightBulb, HiViewGrid } from 'react-icons/hi';
import { Filter } from 'lucide-react';
import { Calendar } from './components/Calendar';
import { DailyView } from './components/DailyView';
import { ConsolidatedView } from './components/ConsolidatedView';
import { ConsolidatedSidebar } from './components/ConsolidatedSidebar';
import { SearchBar } from './components/SearchBar';
import { SettingsDropdown } from './components/SettingsDropdown';
import { FilterBar, type FilterOptions } from './components/FilterBar';
import { TagManager } from './components/TagManager';
import { generalApi, type DashboardStats } from './api/client';
import './App.css';

type ViewMode = 'daily' | 'all_insights';

type SectionType =
  | 'daily'
  | 'highlights'
  | 'action_items'
  | 'decisions'
  | 'ideas'
  | 'questions'
  | 'themes'
  | 'quotes';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [lastSelectedDate, setLastSelectedDate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeSection, setActiveSection] = useState<SectionType>('daily');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showTagManager, setShowTagManager] = useState(false);

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
  }, []);

  const handleSyncComplete = () => {
    // Reload stats when sync completes
    loadStats();
  };

  const handleDateSelect = (date: string) => {
    // Handle empty string as null (deselect)
    const selectedDateValue = date === '' ? null : date;
    setSelectedDate(selectedDateValue);
    
    // Store the last selected date for returning to daily view
    if (selectedDateValue) {
      setLastSelectedDate(selectedDateValue);
      setViewMode('daily');
      setActiveSection('daily');
    }
  };

  const handleSectionSelect = (section: SectionType) => {
    setActiveSection(section);
    
    // Update view mode based on section
    if (section === 'daily') {
      setViewMode('daily');
      // Restore the last selected date when returning to daily view
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
            {activeSection !== 'daily' && (
              <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            )}
            <SettingsDropdown onSyncComplete={handleSyncComplete} />
          </div>
        </div>
      </header>

      <div className="container">
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
              ) : activeSection === 'action_items' ? (
                <>
                  <HiViewGrid className="content-title-icon" />
                  Action Items
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
              <DailyView selectedDate={selectedDate} />
            ) : (
              <ConsolidatedView
                activeSection={activeSection as Exclude<SectionType, 'daily'>}
                searchTerm={searchTerm}
                selectedDate={selectedDate}
                filters={filters}
              />
            )}
          </div>
        </div>
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
    </div>
  );
}

export default App;

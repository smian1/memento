import { useState, useEffect, useCallback } from 'react';
import { Clock, Filter, ChevronDown, ChevronUp, ChevronRight, Calendar, Search, Download } from 'lucide-react';
import { HiDownload } from 'react-icons/hi';
import { lifeLogsApi, type LifeLog } from '../api/client';
import { formatInlineText } from '../utils/formatText';
import { formatToLocalTime } from '../utils/timezone';
import { AudioPlayer } from './AudioPlayer';
import { SpeakerIndicator } from './SpeakerIndicator';

interface LifeLogViewProps {
  selectedDate: string | null;
  refreshTrigger?: number;
}

type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening' | 'custom';

interface TimeRange {
  start: string;
  end: string;
  label: string;
}

const TIME_RANGES: Record<TimeFilter, TimeRange | null> = {
  all: null,
  morning: { start: '00:00', end: '12:00', label: 'Morning (12 AM - 12 PM)' },
  afternoon: { start: '12:00', end: '18:00', label: 'Afternoon (12 PM - 6 PM)' },
  evening: { start: '18:00', end: '23:59', label: 'Evening (6 PM - 12 AM)' },
  custom: null,
};

export function LifeLogView({ selectedDate, refreshTrigger }: LifeLogViewProps) {
  


  const [lifeLogs, setLifeLogs] = useState<LifeLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LifeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(new Set());
  const [customTimeRange, setCustomTimeRange] = useState({ start: '00:00', end: '23:59' });
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<number | string | null>(null);

  // Load life logs when date changes
  useEffect(() => {
    if (!selectedDate) {
      setLifeLogs([]);
      setFilteredLogs([]);
      return;
    }

    const loadLifeLogs = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use timezone-aware API call instead of legacy date-only call
        const response = await lifeLogsApi.getAll({ 
          date: selectedDate,
          limit: 1000
        });
        
        
        // Sort life logs by startTime in descending order (newest first)
        const sortedLogs = response.data.sort((a, b) => {
          if (!a.startTime && !b.startTime) return 0;
          if (!a.startTime) return 1;
          if (!b.startTime) return -1;
          
          const timeA = new Date(a.startTime).getTime();
          const timeB = new Date(b.startTime).getTime();
          return timeB - timeA; // Descending order (newest first)
        });
        setLifeLogs(sortedLogs);
      } catch (err) {
        setError('Failed to load life logs for this date');
        console.error('Error loading life logs:', err);
        setLifeLogs([]);
      } finally {
        setLoading(false);
      }
    };

    loadLifeLogs();
  }, [selectedDate, refreshTrigger]);

  // Apply filters when lifeLogs, timeFilter, or searchTerm changes
  useEffect(() => {
    let filtered = [...lifeLogs];

    // Apply time filter
    if (timeFilter !== 'all') {
      const range = timeFilter === 'custom' ? customTimeRange : TIME_RANGES[timeFilter];
      if (range) {
        filtered = filtered.filter(log => {
          if (!log.startTime) return true;
          
          const logTime = new Date(log.startTime);
          const logHour = logTime.getHours();
          const logMinute = logTime.getMinutes();
          const logTimeString = `${logHour.toString().padStart(2, '0')}:${logMinute.toString().padStart(2, '0')}`;
          
          return logTimeString >= range.start && logTimeString <= range.end;
        });
      }
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.title?.toLowerCase().includes(term) ||
        log.summary?.toLowerCase().includes(term) ||
        log.markdownContent?.toLowerCase().includes(term) ||
        log.segmentType?.toLowerCase().includes(term)
      );
    }

    setFilteredLogs(filtered);
  }, [lifeLogs, timeFilter, searchTerm, customTimeRange]);

  const toggleLogExpansion = (logId: number) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const toggleSectionExpansion = (sectionKey: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
        // Also collapse all subsections when section is collapsed
        setExpandedSubsections(prevSub => {
          const newSubSet = new Set(prevSub);
          // Remove all subsections that belong to this section
          Array.from(newSubSet).forEach(key => {
            if (key.startsWith(sectionKey)) {
              newSubSet.delete(key);
            }
          });
          return newSubSet;
        });
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  const toggleSubsectionExpansion = (subsectionKey: string) => {
    setExpandedSubsections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subsectionKey)) {
        newSet.delete(subsectionKey);
      } else {
        newSet.add(subsectionKey);
      }
      return newSet;
    });
  };

  const formatTime = (timeString?: string | null) => {
    return formatToLocalTime(timeString ?? undefined);
  };

  const formatDuration = (startTime?: string | null, endTime?: string | null) => {
    if (!startTime || !endTime) return '';
    
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationMs = end.getTime() - start.getTime();
      const durationMins = Math.round(durationMs / (1000 * 60));
      
      if (durationMins < 60) {
        return `${durationMins}m`;
      } else {
        const hours = Math.floor(durationMins / 60);
        const mins = durationMins % 60;
        return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
      }
    } catch {
      return '';
    }
  };


  const downloadAsMarkdown = () => {
    if (!selectedDate || filteredLogs.length === 0) return;

    const markdown = [
      `# Life Logs - ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`,
      '',
      ...filteredLogs.map(log => {
        const time = formatTime(log.startTime ?? null);
        const duration = formatDuration(log.startTime ?? null, log.endTime ?? null);
        
        let content = `## ${time}${duration ? ` (${duration})` : ''} - ${log.title || 'Untitled'}`;
        
        if (log.segmentType) {
          content += `\n*Type: ${log.segmentType}*`;
        }
        
        if (log.summary) {
          content += `\n\n**Summary:** ${log.summary}`;
        }
        
        if (log.markdownContent) {
          content += `\n\n${log.markdownContent}`;
        }
        
        return content;
      }).join('\n\n---\n\n')
    ].join('\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifelogs-${selectedDate}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Audio player handlers
  const handleAudioPlay = useCallback((lifelogId: number | string) => {
    // Stop any currently playing audio
    if (currentlyPlayingId && currentlyPlayingId !== lifelogId) {
      setCurrentlyPlayingId(null);
      // Small delay to ensure the previous audio stops before starting new one
      setTimeout(() => {
        setCurrentlyPlayingId(lifelogId);
      }, 100);
    } else {
      setCurrentlyPlayingId(lifelogId);
    }
  }, [currentlyPlayingId]);

  const handleAudioPause = useCallback(() => {
    setCurrentlyPlayingId(null);
  }, []);

  const handleAudioError = useCallback((error: string) => {
    console.error('Audio playback error:', error);
    setCurrentlyPlayingId(null);
  }, []);

  if (!selectedDate) {
    return (
      <div className="welcome">
        <h2>Welcome to Life Logs Viewer</h2>
        <p>Select a date from the calendar to view your life logs for that day.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading life logs...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (lifeLogs.length === 0) {
    return (
      <div className="no-data">
        <Calendar size={48} className="no-data-icon" />
        <h3>No Life Logs Found</h3>
        <p>No life logs available for {new Date(selectedDate + 'T12:00:00').toLocaleDateString()}.</p>
        <p>Life logs are automatically synced from your Limitless device.</p>
      </div>
    );
  }

  return (
    <div className="lifelog-view">
      {/* Header with controls */}
      <div className="lifelog-header">
        <div className="lifelog-header-info">
          <p className="lifelog-count">
            {filteredLogs.length} of {lifeLogs.length} entries
            {timeFilter !== 'all' && ` • ${TIME_RANGES[timeFilter]?.label || 'Custom time range'}`}
          </p>
        </div>
        
        <div className="lifelog-actions">
          <button 
            onClick={downloadAsMarkdown}
            className="action-button"
            title="Download as Markdown"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="lifelog-filters">
        {/* Search */}
        <div className="filter-group">
          <div className="search-input">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search life logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Time Filter */}
        <div className="filter-group">
          <Filter size={16} />
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            className="filter-select"
          >
            <option value="all">All Day</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Custom time range inputs */}
        {timeFilter === 'custom' && (
          <div className="filter-group custom-time-range">
            <input
              type="time"
              value={customTimeRange.start}
              onChange={(e) => setCustomTimeRange(prev => ({ ...prev, start: e.target.value }))}
              className="time-input"
            />
            <span>to</span>
            <input
              type="time"
              value={customTimeRange.end}
              onChange={(e) => setCustomTimeRange(prev => ({ ...prev, end: e.target.value }))}
              className="time-input"
            />
          </div>
        )}
      </div>

      {/* Life Logs List */}
      <div className="lifelog-list">
        {filteredLogs.map((log) => {
          const hasContent = log.markdownContent && log.markdownContent.trim().length > 0;
          
          // Parse markdown content into structured sections and messages
          const parseMarkdownContent = (markdown: string) => {
            if (!markdown) return [];
            
            const lines = markdown.split('\n');
            const sections: Array<{
              title: string;
              subsections: Array<{
                title: string;
                messages: Array<{ speaker: string; timestamp: string; content: string; time: string }>;
              }>;
              messages: Array<{ speaker: string; timestamp: string; content: string; time: string }>;
            }> = [];
            
            let currentSection: {
              title: string;
              subsections: Array<{
                title: string;
                messages: Array<{ speaker: string; timestamp: string; content: string; time: string }>;
              }>;
              messages: Array<{ speaker: string; timestamp: string; content: string; time: string }>;
            } | null = null;
            let currentSubsection: {
              title: string;
              messages: Array<{ speaker: string; timestamp: string; content: string; time: string }>;
            } | null = null;
            
            for (const line of lines) {
              const trimmedLine = line.trim();
              
              // Main section header (## Header)
              if (trimmedLine.startsWith('## ')) {
                // Save previous section
                if (currentSection) {
                  if (currentSubsection) {
                    currentSection.subsections.push(currentSubsection);
                  }
                  sections.push(currentSection);
                }
                currentSection = {
                  title: trimmedLine.substring(3).trim(),
                  subsections: [],
                  messages: []
                };
                currentSubsection = null;
              }
              // Subsection header (### Header)
              else if (trimmedLine.startsWith('### ')) {
                if (currentSection) {
                  // Save previous subsection
                  if (currentSubsection) {
                    currentSection.subsections.push(currentSubsection);
                  }
                  currentSubsection = {
                    title: trimmedLine.substring(4).trim(),
                    messages: []
                  };
                }
              }
              // Message line (- Speaker (timestamp): message)
              else if (trimmedLine.startsWith('- ') && trimmedLine.includes('(') && trimmedLine.includes('):')) {
                // Enhanced regex to capture different speakers (Unknown, You, etc.)
                const messageMatch = trimmedLine.match(/^- (Unknown|You|[^(]+) \(([^)]+)\): (.+)$/);
                if (messageMatch && currentSection) {
                  const [, speaker, timestamp, content] = messageMatch;
                  
                  // Convert UTC timestamp to user's preferred timezone
                  // Parse markdown timestamp format "9/21/25 11:25 PM" which is actually UTC
                  const extractTimeFromMarkdown = (markdownTimestamp: string) => {
                    try {
                      // Parse the markdown timestamp format "9/21/25 11:25 PM"
                      const match = markdownTimestamp.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})\s([AP]M)$/);
                      if (match) {
                        const [, month, day, year, hour, minute, ampm] = match;
                        
                        // Convert 2-digit year to 4-digit (assuming 20xx)
                        const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
                        
                        // Convert to 24-hour format
                        let hour24 = parseInt(hour);
                        if (ampm === 'PM' && hour24 !== 12) {
                          hour24 += 12;
                        } else if (ampm === 'AM' && hour24 === 12) {
                          hour24 = 0;
                        }
                        
                        // Create UTC date from the parsed components
                        const utcDate = new Date(Date.UTC(fullYear, parseInt(month) - 1, parseInt(day), hour24, parseInt(minute), 0));
                        
                        // Convert to user's preferred timezone using our utility
                        return formatToLocalTime(utcDate.toISOString());
                      }
                      
                      // Fallback: just extract time portion if parsing fails
                      const timeMatch = markdownTimestamp.match(/(\d{1,2}:\d{2} [AP]M)$/);
                      if (timeMatch) {
                        return timeMatch[1];
                      }
                      
                      return markdownTimestamp;
                    } catch (error) {
                      console.warn('Error converting markdown timestamp:', markdownTimestamp, error);
                      return markdownTimestamp;
                    }
                  };
                  
                  const displayTime = extractTimeFromMarkdown(timestamp);
                  
                  // If we have a current subsection, add to that; otherwise add directly to section
                  if (currentSubsection) {
                    currentSubsection.messages.push({
                      speaker: speaker.trim(),
                      timestamp: timestamp,
                      content: content,
                      time: displayTime
                    });
                  } else if (currentSection) {
                    // Add message directly to section if no subsection exists
                    currentSection.messages.push({
                      speaker: speaker.trim(),
                      timestamp: timestamp,
                      content: content,
                      time: displayTime
                    });
                  }
                }
              }
            }
            
            // Add the last section and subsection
            if (currentSection) {
              if (currentSubsection) {
                currentSection.subsections.push(currentSubsection);
              }
              sections.push(currentSection);
            }
            
            return sections;
          };

          const sections = parseMarkdownContent(log.markdownContent || '');
          const isExpanded = expandedLogs.has(log.id);
          
          return (
            <div key={log.id} className="lifelog-entry">
              <div 
                className="lifelog-entry-header"
                onClick={() => sections.length > 0 && toggleLogExpansion(log.id)}
                style={{ cursor: sections.length > 0 ? 'pointer' : 'default' }}
              >
                <div className="lifelog-time-info">
                  <div className="lifelog-time">
                    <Clock size={14} />
                    {formatTime(log.startTime ?? null)}
                    {log.endTime && (
                      <span className="duration">
                        ({formatDuration(log.startTime ?? null, log.endTime ?? null)})
                      </span>
                    )}
                    {log.startTime && log.endTime && (
                      <>
                        <AudioPlayer
                          lifelogId={log.id}
                          duration={new Date(log.endTime).getTime() - new Date(log.startTime).getTime()}
                          onPlay={() => handleAudioPlay(log.id)}
                          onPause={handleAudioPause}
                          onError={handleAudioError}
                          className="compact"
                          shouldPause={currentlyPlayingId !== null && currentlyPlayingId !== log.id}
                        />
                        <button
                          onClick={() => window.open(`/api/lifelogs/${log.id}/download`, '_blank')}
                          className="lifelog-download-button"
                          title="Download full audio"
                        >
                          <HiDownload size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <h3 className="lifelog-title">
                  {log.title || 'Untitled Entry'}
                </h3>
                
                <div className="lifelog-entry-actions">
                  {sections.length > 0 && (
                    <div className="expand-icon">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  )}
                </div>
              </div>

              {/* Show structured content when expanded */}
              {sections.length > 0 && isExpanded && (
                <div className="lifelog-content">
                  <div className="content-divider"></div>
                  <div className="structured-content">
                    {sections.map((section, sectionIndex) => {
                      const sectionKey = `${log.id}-section-${sectionIndex}`;
                      // Sections start collapsed by default
                      const isSectionExpanded = expandedSections.has(sectionKey);
                      
                      return (
                        <div key={sectionIndex} className="conversation-section">
                          <div 
                            className="section-header"
                            onClick={() => toggleSectionExpansion(sectionKey)}
                          >
                            {isSectionExpanded ? 
                              <ChevronDown size={16} className="section-icon" /> : 
                              <ChevronRight size={16} className="section-icon" />
                            }
                            <h4>{section.title}</h4>
                          </div>
                          {isSectionExpanded && (
                            <div className="section-content">
                              {/* Render direct section messages first (if any) */}
                              {section.messages.length > 0 && (
                                <div className="section-messages">
                                  {section.messages.map((message, messageIndex) => {
                                    
                                    return (
                                      <div key={messageIndex} className={`message-item ${message.speaker.toLowerCase()}-speaker`}>
                                        <div className="message-time">{message.time}</div>
                                        <div className="message-content">
                                          <SpeakerIndicator speakerName={message.speaker} showName={true} size="small" />
                                          <span className="message-text">
                                            {message.content.split(/(daddy|Daddy)/gi).map((part, i) => 
                                              ['daddy', 'Daddy'].includes(part) ? 
                                                <span key={i} className="highlighted-word">{part}</span> : 
                                                part
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              
                              {/* Render subsections (if any) */}
                              {section.subsections.map((subsection, subsectionIndex) => {
                                const subsectionKey = `${sectionKey}-subsection-${subsectionIndex}`;
                                // Subsections start collapsed by default
                                const isSubsectionExpanded = expandedSubsections.has(subsectionKey);
                                
                                return (
                                  <div key={subsectionIndex} className="subsection">
                                    <div 
                                      className="subsection-header"
                                      onClick={() => toggleSubsectionExpansion(subsectionKey)}
                                    >
                                      {isSubsectionExpanded ? 
                                        <ChevronDown size={14} className="subsection-icon" /> : 
                                        <ChevronRight size={14} className="subsection-icon" />
                                      }
                                      <h5>{subsection.title}</h5>
                                    </div>
                                    {isSubsectionExpanded && (
                                      <div className="subsection-messages">
                                        {subsection.messages.map((message, messageIndex) => {
                                          
                                          return (
                                            <div key={messageIndex} className={`message-item ${message.speaker.toLowerCase()}-speaker`}>
                                              <div className="message-time">{message.time}</div>
                                              <div className="message-content">
                                                <SpeakerIndicator speakerName={message.speaker} showName={true} size="small" />
                                                <span className="message-text">
                                                  {message.content.split(/(daddy|Daddy)/gi).map((part, i) => 
                                                    ['daddy', 'Daddy'].includes(part) ? 
                                                      <span key={i} className="highlighted-word">{part}</span> : 
                                                      part
                                                  )}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fallback for logs without structured content */}
              {sections.length === 0 && log.summary && (
                <div className="lifelog-summary">
                  {formatInlineText(log.summary)}
                </div>
              )}

              {sections.length === 0 && hasContent && isExpanded && (
                <div className="lifelog-content">
                  <div className="content-divider"></div>
                  <div className="markdown-content">
                    {formatInlineText(log.markdownContent!)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredLogs.length === 0 && searchTerm && (
        <div className="no-search-results">
          <Search size={32} className="no-results-icon" />
          <p>No life logs match your search criteria.</p>
          <button 
            onClick={() => setSearchTerm('')}
            className="clear-search-button"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}

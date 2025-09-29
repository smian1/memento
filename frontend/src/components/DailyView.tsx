import React, { useState, useEffect } from 'react';
import { insightsApi, type Insight } from '../api/client';
import { parseInlineFormatting } from '../utils/formatText';

interface DailyViewProps {
  selectedDate: string | null;
  refreshTrigger?: number;
}

export function DailyView({ selectedDate, refreshTrigger }: DailyViewProps) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInsightDates, setAvailableInsightDates] = useState<Set<string>>(new Set());

  // Function to download the markdown content
  const downloadMarkdown = async () => {
    if (!insight || !selectedDate) return;

    // Parse as local date to avoid UTC timezone shift
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\//g, '-');

    const filename = `daily-insights-${formattedDate}.md`;
    
    // Try to use File System Access API if available (Chrome/Edge 86+)
    if ('showSaveFilePicker' in window) {
      try {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'Markdown files',
              accept: {
                'text/markdown': ['.md'],
              },
            },
          ],
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(insight.content);
        await writable.close();
        return;
      } catch (err) {
        // User cancelled or error occurred, fall back to regular download
        console.log('File picker cancelled or not supported, using fallback');
      }
    }
    
    // Fallback to regular download for older browsers
    const blob = new Blob([insight.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper function to check if a date is today or recent
  const getInsightNotAvailableMessage = (dateStr: string) => {
    const selectedDateObj = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    // Normalize dates to compare without time
    const selectedDateNormalized = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate());
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayNormalized = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    if (selectedDateNormalized.getTime() === todayNormalized.getTime()) {
      return {
        message: "Your day is still unfolding; keep recording and insights will be available tomorrow.",
        icon: "🌅", // sunrise icon for ongoing day
        isToday: true
      };
    } else if (selectedDateNormalized.getTime() === yesterdayNormalized.getTime()) {
      return {
        message: "Yesterday's insights are being processed. They should be available soon!",
        icon: "⏳", // hourglass for processing
        isToday: false
      };
    } else if (selectedDateNormalized > todayNormalized) {
      return {
        message: "This date is in the future. Insights will appear as you live each day.",
        icon: "🔮", // crystal ball for future
        isToday: false
      };
    } else {
      return {
        message: "No insights were generated for this date.",
        icon: "📅", // calendar for historical dates
        isToday: false
      };
    }
  };

  // Load available insight dates on component mount and refresh
  useEffect(() => {
    const loadAvailableDates = async () => {
      try {
        const insightsResponse = await insightsApi.getAll();
        const insightDateSet = new Set(insightsResponse.data.map(insight => insight.date));
        setAvailableInsightDates(insightDateSet);
      } catch (error) {
        console.error('Error loading available insight dates:', error);
      }
    };

    loadAvailableDates();
  }, [refreshTrigger]);

  useEffect(() => {
    if (!selectedDate) {
      setInsight(null);
      return;
    }

    const loadInsight = async () => {
      setLoading(true);
      setError(null);

      // Check if insights exist for this date before making API call
      if (!availableInsightDates.has(selectedDate)) {
        const { message } = getInsightNotAvailableMessage(selectedDate);
        setError(message);
        setLoading(false);
        return;
      }

      try {
        const response = await insightsApi.getByDate(selectedDate);
        setInsight(response.data);
      } catch (err: any) {
        const { message } = getInsightNotAvailableMessage(selectedDate);
        setError(message);
        
        // Only log actual errors, not expected 404s when insights don't exist
        if (err?.response?.status !== 404) {
          console.error('Error loading insight:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadInsight();
  }, [selectedDate, refreshTrigger, availableInsightDates]);

  if (!selectedDate) {
    return (
      <div className="welcome">
        <h2>Welcome to Daily Insights Viewer</h2>
        <p>Select a date from the calendar to view your daily insights.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading insights...</div>;
  }

  if (error) {
    const { icon, isToday } = getInsightNotAvailableMessage(selectedDate || '');
    return (
      <div className={`insight-not-available ${isToday ? 'today' : 'other'}`}>
        <div className="insight-not-available-icon">{icon}</div>
        <div className="insight-not-available-message">{error}</div>
      </div>
    );
  }

  if (!insight) {
    return <div className="no-insight">No insight found for this date.</div>;
  }


  // Convert markdown content to JSX with proper formatting
  const formatContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactElement[] = [];
    let currentList: React.ReactElement[] = [];
    let listKey = 0;

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(<ul key={`list-${listKey++}`}>{currentList}</ul>);
        currentList = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      if (trimmedLine === '') {
        flushList();
        elements.push(<br key={`br-${index}`} />);
        return;
      }

      if (line.startsWith('# ')) {
        flushList();
        const headerText = line.substring(2);
        elements.push(
          <h1 key={`h1-${index}`}>{parseInlineFormatting(headerText)}</h1>
        );
      } else if (line.startsWith('## ')) {
        flushList();
        const headerText = line.substring(3);
        elements.push(
          <h2 key={`h2-${index}`}>{parseInlineFormatting(headerText)}</h2>
        );
      } else if (line.match(/^###\s+###\s+/)) {
        flushList();
        const headerText = line.replace(/^###\s+###\s+/, '');
        elements.push(
          <h3 key={`h3-${index}`} className="triple-hash-header">{parseInlineFormatting(headerText)}</h3>
        );
      } else if (line.startsWith('### ')) {
        flushList();
        const headerText = line.substring(4);
        elements.push(
          <h3 key={`h3-${index}`}>{parseInlineFormatting(headerText)}</h3>
        );
      } else if (line.match(/^\s*[\*\-\+]\s+/)) {
        const listItemText = line.replace(/^\s*[\*\-\+]\s+/, '');
        currentList.push(
          <li key={`li-${index}`}>{parseInlineFormatting(listItemText)}</li>
        );
      } else if (line.match(/^\s*>\s*/)) {
        flushList();
        const quoteText = line.replace(/^\s*>\s*/, '');
        elements.push(
          <blockquote key={`quote-${index}`}>{parseInlineFormatting(quoteText)}</blockquote>
        );
      } else {
        flushList();
        elements.push(
          <p key={`p-${index}`}>{parseInlineFormatting(line)}</p>
        );
      }
    });

    // Flush any remaining list items
    flushList();

    return elements;
  };

  return (
    <div className="daily-content">
      {/* Download button for the daily insight */}
      <div className="daily-content-header">
        <button
          onClick={downloadMarkdown}
          className="download-icon-button"
          title="Download as Markdown"
        >
          ⬇
        </button>
      </div>
      {formatContent(insight.content)}
    </div>
  );
}
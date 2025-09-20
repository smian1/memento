import React, { useState, useEffect } from 'react';
import { insightsApi, type Insight } from '../api/client';
import { parseInlineFormatting } from '../utils/formatText';

interface DailyViewProps {
  selectedDate: string | null;
}

export function DailyView({ selectedDate }: DailyViewProps) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDate) {
      setInsight(null);
      return;
    }

    const loadInsight = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await insightsApi.getByDate(selectedDate);
        setInsight(response.data);
      } catch (err) {
        setError('Failed to load insight for this date');
        console.error('Error loading insight:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInsight();
  }, [selectedDate]);

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
    return <div className="error">{error}</div>;
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
      } else if (line.startsWith('### ')) {
        flushList();
        const headerText = line.substring(4);
        elements.push(
          <h3 key={`h3-${index}`}>{parseInlineFormatting(headerText)}</h3>
        );
      } else if (line.startsWith('* ') || line.startsWith('- ')) {
        const listItemText = line.substring(2);
        currentList.push(
          <li key={`li-${index}`}>{parseInlineFormatting(listItemText)}</li>
        );
      } else if (line.startsWith('> ')) {
        flushList();
        const quoteText = line.substring(2);
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
      {formatContent(insight.content)}
    </div>
  );
}
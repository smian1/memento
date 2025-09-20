import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { insightsApi, type Insight } from '../api/client';
import { parseInlineFormatting } from '../utils/formatText';

interface DailyViewProps {
  selectedDate: string | null;
}

export function DailyView({ selectedDate }: DailyViewProps) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to download the markdown content
  const downloadMarkdown = async () => {
    if (!insight || !selectedDate) return;

    const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
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
      {/* Download button for the daily insight */}
      <div className="daily-content-header">
        <button
          onClick={downloadMarkdown}
          className="download-button"
          title="Download as Markdown"
        >
          <Download size={16} />
          Download
        </button>
      </div>
      {formatContent(insight.content)}
    </div>
  );
}
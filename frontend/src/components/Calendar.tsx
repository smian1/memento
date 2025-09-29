import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { insightsApi, lifeLogsApi } from '../api/client';

interface CalendarProps {
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
  autoSelectDate?: boolean;
}

export function Calendar({ onDateSelect, selectedDate, autoSelectDate = true }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [insightDates, setInsightDates] = useState<Set<string>>(new Set());
  const [lifelogDates, setLifelogDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadDates = async () => {
      try {
        // Load insight dates
        const insightsResponse = await insightsApi.getAll();
        const insightDateSet = new Set(insightsResponse.data.map(insight => insight.date));
        setInsightDates(insightDateSet);

        // Load lifelog dates
        const lifelogResponse = await lifeLogsApi.getDates();
        const lifelogDateSet = new Set(lifelogResponse.data);
        setLifelogDates(lifelogDateSet);

        // Auto-select most recent date if none selected and autoSelectDate is true
        if (!selectedDate && autoSelectDate) {
          // Combine both sets and find the most recent date
          const allDates = new Set([...insightDateSet, ...lifelogDateSet]);
          if (allDates.size > 0) {
            const sortedDates = Array.from(allDates).sort().reverse();
            onDateSelect(sortedDates[0]);
          }
        }
      } catch (error) {
        console.error('Error loading dates:', error);
      }
    };

    loadDates();
  }, [selectedDate, onDateSelect, autoSelectDate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const renderCalendarDays = () => {
    const days = [];

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const dateKey = date.toISOString().split('T')[0];
      const isCurrentMonth = date.getMonth() === month;
      const hasInsight = insightDates.has(dateKey);
      const hasLifelog = lifelogDates.has(dateKey);
      const hasData = hasInsight || hasLifelog;
      const isSelected = selectedDate === dateKey;

      days.push(
        <div
          key={i}
          className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${
            hasInsight ? 'has-insight' : ''
          } ${hasLifelog ? 'has-lifelog' : ''} ${
            hasData ? 'has-data' : ''
          } ${isSelected ? 'selected' : ''}`}
          onClick={hasData && isCurrentMonth ? () => {
            if (isSelected) {
              onDateSelect(''); // Clear selection by passing empty string
            } else {
              onDateSelect(dateKey);
            }
          } : undefined}
          style={{
            cursor: hasData && isCurrentMonth ? 'pointer' : 'default',
          }}
          title={hasData ? `${hasInsight ? 'Insights' : ''}${hasInsight && hasLifelog ? ' & ' : ''}${hasLifelog ? 'Life Logs' : ''}` : ''}
        >
          <span className="calendar-day-number">{date.getDate()}</span>
          {hasData && (
            <div className="calendar-day-indicators">
              {hasInsight && <div className="indicator insight-indicator"></div>}
              {hasLifelog && <div className="indicator lifelog-indicator"></div>}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="calendar-nav" onClick={previousMonth}>
          <ChevronLeft size={16} />
        </button>
        <div className="calendar-month">
          {monthNames[month]} {year}
        </div>
        <button className="calendar-nav" onClick={nextMonth}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="calendar-grid">
        {dayHeaders.map(day => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}
        {renderCalendarDays()}
      </div>
    </div>
  );
}
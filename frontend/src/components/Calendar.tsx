import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { insightsApi } from '../api/client';

interface CalendarProps {
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
  autoSelectDate?: boolean;
}

export function Calendar({ onDateSelect, selectedDate, autoSelectDate = true }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [insightDates, setInsightDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadInsightDates = async () => {
      try {
        const response = await insightsApi.getAll();
        const dates = new Set(response.data.map(insight => insight.date));
        setInsightDates(dates);

        // Auto-select most recent date if none selected and autoSelectDate is true
        if (!selectedDate && dates.size > 0 && autoSelectDate) {
          const sortedDates = Array.from(dates).sort().reverse();
          onDateSelect(sortedDates[0]);
        }
      } catch (error) {
        console.error('Error loading insight dates:', error);
      }
    };

    loadInsightDates();
  }, [selectedDate, onDateSelect, autoSelectDate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
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
      const isSelected = selectedDate === dateKey;

      days.push(
        <div
          key={i}
          className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${
            hasInsight ? 'has-insight' : ''
          } ${isSelected ? 'selected' : ''}`}
          onClick={hasInsight && isCurrentMonth ? () => {
            if (isSelected) {
              onDateSelect(''); // Clear selection by passing empty string
            } else {
              onDateSelect(dateKey);
            }
          } : undefined}
          style={{
            cursor: hasInsight && isCurrentMonth ? 'pointer' : 'default',
          }}
        >
          {date.getDate()}
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
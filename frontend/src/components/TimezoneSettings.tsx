import { useState, useEffect } from 'react';
import { Globe, Clock } from 'lucide-react';
import { 
  getUserPreferredTimezone, 
  setUserPreferredTimezone, 
  getBrowserTimezone 
} from '../utils/timezone';

interface TimezoneSettingsProps {
  onTimezoneChange?: (timezone: string) => void;
}

export function TimezoneSettings({ onTimezoneChange }: TimezoneSettingsProps) {
  const [selectedTimezone, setSelectedTimezone] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  // Common timezones for the dropdown
  const commonTimezones = [
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  ];

  useEffect(() => {
    setSelectedTimezone(getUserPreferredTimezone());
  }, []);

  const handleTimezoneChange = (timezone: string) => {
    setSelectedTimezone(timezone);
    setUserPreferredTimezone(timezone);
    
    // Notify parent component
    if (onTimezoneChange) {
      onTimezoneChange(timezone);
    }
    
    // Close dropdown
    setIsOpen(false);
    
    // Optionally reload the page to apply timezone changes immediately
    // You might want to make this more elegant by updating the state
    window.location.reload();
  };

  const detectBrowserTimezone = () => {
    const browserTz = getBrowserTimezone();
    handleTimezoneChange(browserTz);
  };

  const getCurrentTimezoneLabel = () => {
    const current = commonTimezones.find(tz => tz.value === selectedTimezone);
    return current ? current.label : selectedTimezone;
  };

  return (
    <div className="timezone-settings">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="timezone-button"
        title="Change timezone preference"
      >
        <Globe size={16} />
        <span className="timezone-label">{getCurrentTimezoneLabel()}</span>
      </button>

      {isOpen && (
        <div className="timezone-dropdown">
          <div className="timezone-dropdown-header">
            <Clock size={16} />
            <span>Select Timezone</span>
          </div>
          
          <div className="timezone-options">
            {commonTimezones.map((timezone) => (
              <button
                key={timezone.value}
                onClick={() => handleTimezoneChange(timezone.value)}
                className={`timezone-option ${
                  selectedTimezone === timezone.value ? 'selected' : ''
                }`}
              >
                {timezone.label}
              </button>
            ))}
          </div>
          
          <div className="timezone-actions">
            <button
              onClick={detectBrowserTimezone}
              className="timezone-detect-button"
            >
              Auto-detect from browser
            </button>
          </div>
        </div>
      )}

      <style>{`
        .timezone-settings {
          position: relative;
          display: inline-block;
        }

        .timezone-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.375rem;
          color: white;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .timezone-button:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .timezone-label {
          font-size: 0.875rem;
        }

        .timezone-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.5rem;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 0.5rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          min-width: 200px;
          max-width: 250px;
        }

        .timezone-dropdown-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border-bottom: 1px solid #374151;
          font-weight: 500;
          color: #d1d5db;
          font-size: 0.875rem;
        }

        .timezone-options {
          max-height: 200px;
          overflow-y: auto;
        }

        .timezone-option {
          display: block;
          width: 100%;
          padding: 0.75rem;
          text-align: left;
          background: none;
          border: none;
          color: #d1d5db;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .timezone-option:hover {
          background: #374151;
        }

        .timezone-option.selected {
          background: #3b82f6;
          color: white;
        }

        .timezone-actions {
          border-top: 1px solid #374151;
          padding: 0.5rem;
        }

        .timezone-detect-button {
          width: 100%;
          padding: 0.5rem;
          background: #059669;
          border: none;
          border-radius: 0.375rem;
          color: white;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .timezone-detect-button:hover {
          background: #047857;
        }
      `}</style>
    </div>
  );
}

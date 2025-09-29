import React, { useState, useRef, useEffect } from 'react';
import { HiCog, HiDatabase } from 'react-icons/hi';
import { SimpleSyncStatus } from './SimpleSyncStatus';
import { TimezoneSettings } from './TimezoneSettings';
import { SpeakerManager } from './SpeakerManager';
import { DatabaseView } from './DatabaseView';
import { useAuth } from '../contexts/AuthContext';

interface SettingsDropdownProps {
  onSyncComplete?: (syncResults?: any) => void;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ onSyncComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDatabaseView, setShowDatabaseView] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="settings-dropdown" ref={dropdownRef}>
      <button
        className="settings-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Settings"
      >
        <HiCog size={18} />
      </button>

      {isOpen && (
        <div className="settings-menu">
          <div className="settings-item">
            <SimpleSyncStatus onSyncComplete={onSyncComplete} />
          </div>
          <div className="settings-item">
            <TimezoneSettings />
          </div>
          <div className="settings-item">
            <SpeakerManager />
          </div>
          {user?.isAdmin && (
            <div className="settings-item">
              <button
                onClick={() => {
                  setShowDatabaseView(true);
                  setIsOpen(false);
                }}
                className="database-view-button"
              >
                <HiDatabase size={16} />
                Database View
              </button>
            </div>
          )}
        </div>
      )}

      {/* Database View Modal */}
      {showDatabaseView && (
        <div className="database-view-overlay" onClick={() => setShowDatabaseView(false)}>
          <div className="database-view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="database-view-modal-header">
              <button
                onClick={() => setShowDatabaseView(false)}
                className="close-database-view"
              >
                ✕
              </button>
            </div>
            <DatabaseView />
          </div>
        </div>
      )}
    </div>
  );
};

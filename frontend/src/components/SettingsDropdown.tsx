import React, { useState, useRef, useEffect } from 'react';
import { HiDotsVertical, HiRefresh, HiCog } from 'react-icons/hi';
import { SyncStatus } from './SyncStatus';

interface SettingsDropdownProps {
  onSyncComplete?: () => void;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ onSyncComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
            <SyncStatus onSyncComplete={onSyncComplete} />
          </div>
        </div>
      )}
    </div>
  );
};
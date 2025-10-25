import React, { useState, useRef, useEffect } from 'react';
import { HiLogout, HiRefresh, HiClock, HiLightningBolt, HiUsers, HiDatabase } from 'react-icons/hi';
import { useAuth } from '../contexts/AuthContext';
import { syncApi } from '../api/client';
import { TimezoneSettings } from './TimezoneSettings';
import { SpeakerManager } from './SpeakerManager';
import { ReprocessPanel } from './ReprocessPanel';

interface UserMenuProps {
  onSyncComplete?: (syncResults?: any) => void;
  onNavigateToSection?: (section: string) => void;
}

interface SyncResult {
  success: boolean;
  message: string;
  insights?: any;
  lifelogs?: any;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onSyncComplete, onNavigateToSection }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showTimezoneSettings, setShowTimezoneSettings] = useState(false);
  const [showSpeakerManager, setShowSpeakerManager] = useState(false);
  const [showReprocessPanel, setShowReprocessPanel] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout, config } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowTimezoneSettings(false);
        setShowSpeakerManager(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const runSync = async (options: { force?: boolean; days_back?: number; incremental?: boolean } = {}) => {
    const { force = false, days_back, incremental = true } = options;
    
    try {
      setIsSyncing(true);
      setSyncResult(null);

      const response = await syncApi.syncAll({ force, days_back, incremental });
      setSyncResult(response.data as SyncResult);

      if (onSyncComplete) {
        onSyncComplete(response.data);
      }
    } catch (err: any) {
      console.error('Error running sync:', err);
      const errorMessage = err.response?.data?.detail || 'Sync failed';
      setSyncResult({ success: false, message: errorMessage });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  if (!user) return null;

  return (
    <div className="user-menu" ref={dropdownRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title={`Logged in as ${user.username}`}
      >
        <div className="user-avatar">
          {getInitials(user.username)}
        </div>
        <span className="user-name">{user.username}</span>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <div className="user-avatar large">
              {getInitials(user.username)}
            </div>
            <div className="user-info">
              <div className="username">{user.username}</div>
              <div className="user-role">{user.isAdmin ? 'Administrator' : 'User'}</div>
            </div>
          </div>

          <div className="menu-divider"></div>

          <div className="menu-section">
            <div className="menu-section-title">Sync Options</div>
            
            <button
              className="menu-item sync-item"
              onClick={() => runSync({ incremental: true })}
              disabled={isSyncing}
            >
              <HiLightningBolt className="menu-icon" />
              <div className="menu-item-content">
                <div className="menu-item-title">Quick Sync</div>
                <div className="menu-item-description">Only new data since last sync</div>
              </div>
              {isSyncing && <div className="sync-spinner"></div>}
            </button>

            <button
              className="menu-item sync-item"
              onClick={() => runSync({ force: true, days_back: 30, incremental: false })}
              disabled={isSyncing}
            >
              <HiRefresh className="menu-icon" />
              <div className="menu-item-content">
                <div className="menu-item-title">Full Sync</div>
                <div className="menu-item-description">Complete sync (last 30 days)</div>
              </div>
              {isSyncing && <div className="sync-spinner"></div>}
            </button>

            {syncResult && (
              <div className={`sync-result ${syncResult.success ? 'success' : 'error'}`}>
                {syncResult.message}
              </div>
            )}
          </div>

          <div className="menu-divider"></div>

          <div className="menu-section">
            <button
              className="menu-item"
              onClick={() => {
                setShowReprocessPanel(true);
                setIsOpen(false);
              }}
            >
              <HiRefresh className="menu-icon" />
              <div className="menu-item-content">
                <div className="menu-item-title">Reprocess Insights</div>
                <div className="menu-item-description">Re-extract structured data</div>
              </div>
            </button>
          </div>

          <div className="menu-divider"></div>

          <div className="menu-section">
            <button
              className="menu-item"
              onClick={() => setShowTimezoneSettings(!showTimezoneSettings)}
            >
              <HiClock className="menu-icon" />
              <div className="menu-item-content">
                <div className="menu-item-title">Timezone Settings</div>
                <div className="menu-item-description">{config?.timezone || 'UTC'}</div>
              </div>
            </button>

            {showTimezoneSettings && (
              <div className="menu-submenu">
                <TimezoneSettings />
              </div>
            )}
          </div>

          <div className="menu-section">
            <button
              className="menu-item"
              onClick={() => setShowSpeakerManager(!showSpeakerManager)}
            >
              <HiUsers className="menu-icon" />
              <div className="menu-item-content">
                <div className="menu-item-title">Manage Speakers</div>
                <div className="menu-item-description">Customize speaker profiles</div>
              </div>
            </button>

            {showSpeakerManager && (
              <div className="menu-submenu">
                <SpeakerManager />
              </div>
            )}
          </div>

          {user.isAdmin && (
            <div className="menu-section">
              <button
                className="menu-item"
                onClick={() => {
                  onNavigateToSection?.('database');
                  setIsOpen(false);
                }}
              >
                <HiDatabase className="menu-icon" />
                <div className="menu-item-content">
                  <div className="menu-item-title">Database View</div>
                  <div className="menu-item-description">Inspect database tables</div>
                </div>
              </button>
            </div>
          )}

          <div className="menu-divider"></div>

          <button
            className="menu-item logout-item"
            onClick={handleLogout}
          >
            <HiLogout className="menu-icon" />
            <div className="menu-item-content">
              <div className="menu-item-title">Sign Out</div>
            </div>
          </button>
        </div>
      )}

      {showReprocessPanel && (
        <ReprocessPanel onClose={() => setShowReprocessPanel(false)} />
      )}
    </div>
  );
};

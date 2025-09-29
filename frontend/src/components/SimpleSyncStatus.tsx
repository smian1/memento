import React, { useState, useEffect } from 'react';
import { HiCheckCircle, HiXCircle, HiClock, HiRefresh } from 'react-icons/hi';
import { syncApi, type SyncStatus as SyncStatusType, type SyncResult } from '../api/client';
import { formatRelativeTime } from '../utils/timezone';

interface SimpleSyncStatusProps {
  onSyncComplete?: (syncResults?: any) => void;
}

export const SimpleSyncStatus: React.FC<SimpleSyncStatusProps> = ({ onSyncComplete }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusType | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSyncStatus = async () => {
    try {
      setError(null);
      const response = await syncApi.getStatus();
      setSyncStatus(response.data);
    } catch (err) {
      console.error('Error loading sync status:', err);
      setError('Failed to load sync status');
    }
  };

  const runSync = async (force = false) => {
    try {
      setIsSyncing(true);
      setError(null);
      setLastSyncResult(null);

      // Run incremental sync by default, force sync if requested
      const response = await syncApi.syncAll({ 
        force, 
        days_back: force ? 7 : undefined, 
        incremental: !force 
      });
      setLastSyncResult(response.data as any);

      // Reload sync status after sync completes
      await loadSyncStatus();

      // Call onSyncComplete callback if provided, passing sync results
      if (onSyncComplete) {
        onSyncComplete(response.data);
      }
    } catch (err: any) {
      console.error('Error running sync:', err);
      const errorMessage = err.response?.data?.detail || 'Sync failed';
      setError(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const getStatusDisplay = () => {
    if (isSyncing) {
      return {
        icon: <HiRefresh className="animate-spin" />,
        text: 'Syncing...',
        color: '#f59e0b'
      };
    }
    
    if (error) {
      return {
        icon: <HiXCircle />,
        text: error,
        color: '#ef4444'
      };
    }

    if (lastSyncResult?.success) {
      const details = lastSyncResult.details;
      let message = 'Sync completed';
      if (details?.new_insights || details?.updated_insights) {
        message = `${details.new_insights || 0} new, ${details.updated_insights || 0} updated`;
      }
      return {
        icon: <HiCheckCircle />,
        text: message,
        color: '#10b981'
      };
    }

    if (syncStatus?.last_sync) {
      // Fix the timestamp formatting issue by using a safe timestamp
      let timestamp = syncStatus.last_sync.timestamp_pacific || syncStatus.last_sync.timestamp;
      
      // If we still get an invalid timestamp, use a fallback
      if (!timestamp || timestamp === 'Invalid DateTime' || timestamp === 'Never') {
        return {
          icon: <HiClock />,
          text: 'Ready to sync',
          color: '#6b7280'
        };
      }
      
      try {
        const formattedTime = formatRelativeTime(timestamp);
        return {
          icon: <HiClock />,
          text: `Last sync: ${formattedTime}`,
          color: '#6b7280'
        };
      } catch (error) {
        // If formatting fails, show a generic message
        return {
          icon: <HiClock />,
          text: 'Ready to sync',
          color: '#6b7280'
        };
      }
    }

    return {
      icon: <HiClock />,
      text: 'Ready to sync',
      color: '#6b7280'
    };
  };

  const status = getStatusDisplay();

  return (
    <div className="simple-sync-status">
      <div className="sync-info" style={{ color: status.color }}>
        <span className="sync-icon">{status.icon}</span>
        <span className="sync-text">{status.text}</span>
      </div>

      <button
        onClick={() => runSync(false)}
        disabled={isSyncing}
        className="sync-button"
        style={{
          backgroundColor: isSyncing ? '#9ca3af' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: isSyncing ? 'not-allowed' : 'pointer',
          opacity: isSyncing ? 0.7 : 1
        }}
        title="Quick sync - only new data since last sync"
      >
        {isSyncing ? (
          <>
            <HiRefresh className="animate-spin" size={16} />
            Syncing...
          </>
        ) : (
          <>
            <HiRefresh size={16} />
            Sync
          </>
        )}
      </button>
    </div>
  );
};

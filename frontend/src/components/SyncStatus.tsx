import React, { useState, useEffect } from 'react';
import { HiCheckCircle, HiXCircle, HiClock, HiRefresh } from 'react-icons/hi';
import { syncApi, type SyncStatus as SyncStatusType, type SyncResult } from '../api/client';
import { formatRelativeTime } from '../utils/timezone';

interface SyncStatusProps {
  onSyncComplete?: () => void;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ onSyncComplete }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSyncStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await syncApi.getStatus();
      setSyncStatus(response.data);
    } catch (err) {
      console.error('Error loading sync status:', err);
      setError('Failed to load sync status');
    } finally {
      setIsLoading(false);
    }
  };

  const runSync = async (options: { force?: boolean; days_back?: number; incremental?: boolean } = {}) => {
    const { force = false, days_back, incremental = true } = options;
    
    try {
      setIsSyncing(true);
      setError(null);
      setLastSyncResult(null);

      // Use the new sync all endpoint that includes life logs
      const response = await syncApi.syncAll({ force, days_back, incremental });
      setLastSyncResult(response.data as any);

      // Reload sync status after sync completes
      await loadSyncStatus();

      // Call onSyncComplete callback if provided
      if (onSyncComplete) {
        onSyncComplete();
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

  // Auto-check for sync on load if needed
  useEffect(() => {
    if (syncStatus?.should_sync && !syncStatus.in_progress && !isSyncing) {
      // Automatically run incremental sync if needed
      runSync({ incremental: true });
    }
  }, [syncStatus?.should_sync]);

  const getStatusIcon = () => {
    if (isSyncing || syncStatus?.in_progress) return <HiClock className="animate-pulse" />;
    if (error) return <HiXCircle />;
    if (lastSyncResult?.success) return <HiCheckCircle />;
    if (syncStatus?.should_sync) return <HiRefresh className="animate-spin" />;
    if (syncStatus?.last_sync?.status === 'success') return <HiCheckCircle />;
    if (syncStatus?.last_sync?.status === 'error') return <HiXCircle />;
    return <HiClock />;
  };

  const formatTimestamp = (timestamp: string) => {
    // Use the new timezone utility for consistent formatting
    return formatRelativeTime(timestamp);
  };

  const getStatusText = () => {
    if (isSyncing) return 'Syncing insights…';
    if (syncStatus?.in_progress) return 'Sync in progress...';
    if (error) return `Error: ${error}`;
    if (lastSyncResult?.success) {
      const details = lastSyncResult.details;
      if (details) {
        return `${details.new_insights} new, ${details.updated_insights} updated`;
      }
      return 'Sync completed';
    }
    if (lastSyncResult && !lastSyncResult.success) {
      return lastSyncResult.message;
    }
    if (syncStatus?.should_sync) return 'Sync needed';
    if (syncStatus?.last_sync) {
      return `Last sync: ${formatTimestamp(syncStatus.last_sync.timestamp_pacific)}`;
    }
    return 'Checking status...';
  };

  const getStatusColor = () => {
    if (isSyncing || syncStatus?.in_progress) return '#fbbf24'; // yellow
    if (error || syncStatus?.last_sync?.status === 'error') return '#ef4444'; // red
    if (lastSyncResult?.success || syncStatus?.last_sync?.status === 'success') return '#10b981'; // green
    if (syncStatus?.should_sync) return '#3b82f6'; // blue
    return '#6b7280'; // gray
  };

  return (
    <div className="sync-status">
      <div className="sync-icon" style={{ color: getStatusColor() }}>
        {getStatusIcon()}
      </div>

      <div className="sync-info">
        <span className="sync-text" style={{ color: getStatusColor() }}>
          {getStatusText()}
        </span>
      </div>

      <div className="sync-actions">
        {!isSyncing && !syncStatus?.in_progress && (
          <>
            <button
              onClick={() => runSync({ incremental: true })}
              disabled={isLoading}
              className="sync-button"
              title="Quick sync - only new data since last sync"
            >
              Quick Sync
            </button>
            <button
              onClick={() => runSync({ force: true, days_back: 30, incremental: false })}
              disabled={isLoading}
              className="sync-button full-sync"
              title="Full sync (insights + life logs, last 30 days)"
              style={{ marginLeft: '8px' }}
            >
              Full Sync
            </button>
          </>
        )}

        <button
          onClick={loadSyncStatus}
          disabled={isLoading || isSyncing}
          className="refresh-button"
          style={{ opacity: isLoading ? 0.5 : 1 }}
          title="Refresh status"
        >
          <HiRefresh />
        </button>
      </div>
    </div>
  );
};

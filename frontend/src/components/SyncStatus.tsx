import React, { useState, useEffect } from 'react';
import { HiCheckCircle, HiXCircle, HiClock, HiRefresh } from 'react-icons/hi';
import { syncApi, type SyncStatus as SyncStatusType, type SyncResult } from '../api/client';

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

  const runSync = async (force = false) => {
    try {
      setIsSyncing(true);
      setError(null);
      setLastSyncResult(null);

      const response = await syncApi.runSync(force);
      setLastSyncResult(response.data);

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
      // Automatically run sync if needed
      runSync(false);
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
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  const getStatusText = () => {
    if (isSyncing) return 'Syncing...';
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
          <button
            onClick={() => runSync(true)}
            disabled={isLoading}
            className="sync-button"
          >
            Sync Now
          </button>
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
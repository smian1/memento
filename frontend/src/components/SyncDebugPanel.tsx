import React, { useState, useEffect } from 'react';
import { HiChevronDown, HiChevronRight, HiRefresh, HiCheckCircle, HiExclamationCircle, HiClock, HiDatabase, HiCloud } from 'react-icons/hi';
import { syncApi, lifeLogsApi } from '../api/client';

interface SyncStats {
  lastSync: any;
  databaseCounts: {
    totalLifelogs: number;
    todayLifelogs: number;
    yesterdayLifelogs: number;
    last7DaysLifelogs: number;
  };
  apiStatus: {
    reachable: boolean;
    responseTime?: number;
    error?: string;
  };
}

export const SyncDebugPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [lastSyncLog, setLastSyncLog] = useState<string[]>([]);

  const loadSyncStatus = async () => {
    setIsLoading(true);
    try {
      // Get sync status
      const statusResponse = await syncApi.getStatus();
      setSyncStatus(statusResponse.data);

      // Get database statistics
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [todayLogs, yesterdayLogs, allLogs] = await Promise.all([
        lifeLogsApi.getAll({ date: today, limit: 1000 }),
        lifeLogsApi.getAll({ date: yesterday, limit: 1000 }),
        lifeLogsApi.getAll({ limit: 5000 }) // Get recent logs for total count
      ]);

      // Count logs from last 7 days
      const weekAgoDate = new Date(weekAgo);
      const last7DaysLogs = allLogs.data.filter(log => {
        if (!log.startTime) return false;
        const logDate = new Date(log.startTime);
        return logDate >= weekAgoDate;
      });

      // Test API connectivity
      let apiStatus: SyncStats['apiStatus'] = { reachable: true, responseTime: 0 };
      try {
        const startTime = Date.now();
        await syncApi.getStatus();
        apiStatus.responseTime = Date.now() - startTime;
      } catch (error: any) {
        apiStatus = { 
          reachable: false, 
          error: error.message || 'Connection failed' 
        };
      }

      setSyncStats({
        lastSync: statusResponse.data.last_sync,
        databaseCounts: {
          totalLifelogs: allLogs.data.length,
          todayLifelogs: todayLogs.data.length,
          yesterdayLifelogs: yesterdayLogs.data.length,
          last7DaysLifelogs: last7DaysLogs.length,
        },
        apiStatus
      });

    } catch (error: any) {
      console.error('Error loading sync status:', error);
      setLastSyncLog(prev => [...prev, `❌ Error loading status: ${error.message}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const runTestSync = async () => {
    setIsLoading(true);
    setLastSyncLog(['🔄 Starting test sync...']);
    
    try {
      const startTime = Date.now();
      const result = await syncApi.syncAll({ force: true, days_back: 1 });
      const duration = Date.now() - startTime;
      
      const logs = [
        `✅ Sync completed in ${duration}ms`,
        `📊 Results: ${JSON.stringify(result.data, null, 2)}`
      ];
      
      if (result.data.insights) {
        logs.push(`💡 Insights: ${result.data.insights.details?.new_insights || 0} new, ${result.data.insights.details?.updated_insights || 0} updated`);
      }
      
      if (result.data.lifelogs) {
        logs.push(`📱 Lifelogs: ${result.data.lifelogs.synced || 0} new, ${result.data.lifelogs.updated || 0} updated, ${result.data.lifelogs.skipped || 0} skipped`);
      }
      
      setLastSyncLog(logs);
      
      // Reload status after sync
      setTimeout(loadSyncStatus, 1000);
      
    } catch (error: any) {
      setLastSyncLog(prev => [...prev, `❌ Sync failed: ${error.message}`]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      loadSyncStatus();
    }
  }, [isExpanded]);

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'Never';
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }).format(new Date(timestamp));
    } catch {
      return timestamp;
    }
  };

  const getSyncStatusColor = () => {
    if (!syncStatus) return '#6b7280';
    if (syncStatus.in_progress) return '#f59e0b';
    if (syncStatus.last_sync?.error_message) return '#ef4444';
    if (syncStatus.should_sync) return '#3b82f6';
    return '#10b981';
  };

  const getSyncStatusIcon = () => {
    if (!syncStatus) return <HiClock size={20} />;
    if (syncStatus.in_progress) return <HiRefresh size={20} className="animate-spin" />;
    if (syncStatus.last_sync?.error_message) return <HiExclamationCircle size={20} />;
    return <HiCheckCircle size={20} />;
  };

  const getSyncStatusText = () => {
    if (!syncStatus) return 'Loading...';
    if (syncStatus.in_progress) return 'Syncing...';
    if (syncStatus.last_sync?.error_message) return 'Error';
    if (syncStatus.should_sync) return 'Needs Sync';
    return 'Up to Date';
  };

  return (
    <div className="sync-debug-panel">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="sync-debug-header"
        disabled={isLoading}
      >
        <div className="sync-debug-title">
          {isExpanded ? <HiChevronDown size={16} /> : <HiChevronRight size={16} />}
          <span>Sync Debug Panel</span>
          <div className="sync-status-badge" style={{ 
            backgroundColor: getSyncStatusColor() + '20',
            borderColor: getSyncStatusColor(),
            color: getSyncStatusColor()
          }}>
            {getSyncStatusIcon()}
            <span className="sync-status-text">{getSyncStatusText()}</span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="sync-debug-content">
          {/* Current Status */}
          <div className="debug-section">
            <h4><HiDatabase size={16} /> Current Status</h4>
            {syncStatus ? (
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">Should Sync:</span>
                  <span className={`status-value ${syncStatus.should_sync ? 'warning' : 'success'}`}>
                    {syncStatus.should_sync ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">In Progress:</span>
                  <span className={`status-value ${syncStatus.in_progress ? 'warning' : 'muted'}`}>
                    {syncStatus.in_progress ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Reason:</span>
                  <span className="status-value muted">{syncStatus.reason || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <div className="loading">Loading status...</div>
            )}
          </div>

          {/* Last Sync Info */}
          <div className="debug-section">
            <h4><HiClock size={16} /> Last Sync</h4>
            {syncStatus?.last_sync ? (
              <div className="sync-details">
                <div className="sync-detail-row">
                  <span className="detail-label">Time:</span>
                  <span className="detail-value">{formatTimestamp(syncStatus.last_sync.timestamp)}</span>
                </div>
                <div className="sync-detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`detail-value ${syncStatus.last_sync.status === 'success' ? 'success' : 'error'}`}>
                    {syncStatus.last_sync.status}
                  </span>
                </div>
                {syncStatus.last_sync.insights_added !== undefined && (
                  <div className="sync-detail-row">
                    <span className="detail-label">Insights:</span>
                    <span className="detail-value">
                      {syncStatus.last_sync.insights_added} added, {syncStatus.last_sync.insights_updated} updated
                    </span>
                  </div>
                )}
                {syncStatus.last_sync.error_message && (
                  <div className="sync-detail-row">
                    <span className="detail-label">Error:</span>
                    <span className="detail-value error">{syncStatus.last_sync.error_message}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data">No sync history available</div>
            )}
          </div>

          {/* Database Statistics */}
          <div className="debug-section">
            <h4><HiDatabase size={16} /> Database Statistics</h4>
            {syncStats ? (
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Today:</span>
                  <span className="stat-value">{syncStats.databaseCounts.todayLifelogs}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Yesterday:</span>
                  <span className="stat-value">{syncStats.databaseCounts.yesterdayLifelogs}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Last 7 days:</span>
                  <span className="stat-value">{syncStats.databaseCounts.last7DaysLifelogs}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total:</span>
                  <span className="stat-value">{syncStats.databaseCounts.totalLifelogs}</span>
                </div>
              </div>
            ) : (
              <div className="loading">Loading statistics...</div>
            )}
          </div>

          {/* API Connection */}
          <div className="debug-section">
            <h4><HiCloud size={16} /> API Connection</h4>
            {syncStats?.apiStatus ? (
              <div className="api-status">
                <div className="api-status-row">
                  <span className="api-label">Status:</span>
                  <span className={`api-value ${syncStats.apiStatus.reachable ? 'success' : 'error'}`}>
                    {syncStats.apiStatus.reachable ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {syncStats.apiStatus.responseTime && (
                  <div className="api-status-row">
                    <span className="api-label">Response Time:</span>
                    <span className="api-value">{syncStats.apiStatus.responseTime}ms</span>
                  </div>
                )}
                {syncStats.apiStatus.error && (
                  <div className="api-status-row">
                    <span className="api-label">Error:</span>
                    <span className="api-value error">{syncStats.apiStatus.error}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="loading">Testing connection...</div>
            )}
          </div>

          {/* Test Actions */}
          <div className="debug-section">
            <h4>Test Actions</h4>
            <div className="debug-actions">
              <button 
                onClick={runTestSync}
                disabled={isLoading}
                className="debug-action-button test-sync"
              >
                <HiRefresh size={14} />
                {isLoading ? 'Running...' : 'Test Sync (Force)'}
              </button>
              <button 
                onClick={loadSyncStatus}
                disabled={isLoading}
                className="debug-action-button refresh-status"
              >
                <HiRefresh size={14} />
                Refresh Status
              </button>
            </div>
          </div>

          {/* Sync Log */}
          {lastSyncLog.length > 0 && (
            <div className="debug-section">
              <h4>Last Sync Log</h4>
              <div className="sync-log">
                {lastSyncLog.map((log, index) => (
                  <div key={index} className="log-entry">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

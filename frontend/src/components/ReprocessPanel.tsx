import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import axios from 'axios';
import './ReprocessPanel.css';

interface ReprocessPanelProps {
  onClose: () => void;
}

type ReprocessMode = 'single' | 'range' | 'all';

export function ReprocessPanel({ onClose }: ReprocessPanelProps) {
  const [mode, setMode] = useState<ReprocessMode>('single');
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleReprocess = async () => {
    setProcessing(true);
    setResult(null);

    try {
      let response;

      switch (mode) {
        case 'single':
          response = await axios.post('/api/insights/reprocess/date', { date: singleDate });
          break;
        case 'range':
          response = await axios.post('/api/insights/reprocess/range', {
            startDate,
            endDate
          });
          break;
        case 'all':
          response = await axios.post('/api/insights/reprocess');
          break;
      }

      setResult({
        success: true,
        message: response.data.message || 'Reprocessing completed successfully'
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.message || 'Failed to reprocess insights'
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="reprocess-panel-overlay" onClick={onClose}>
      <div className="reprocess-panel" onClick={(e) => e.stopPropagation()}>
        <div className="reprocess-header">
          <h2>
            <RefreshCw size={24} />
            Reprocess Insights
          </h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="reprocess-content">
          <p className="reprocess-description">
            Reprocessing will re-extract structured data (action items, highlights, quotes, etc.)
            from your insights using the latest extraction logic.
          </p>

          <div className="mode-selector">
            <label className={mode === 'single' ? 'active' : ''}>
              <input
                type="radio"
                name="mode"
                value="single"
                checked={mode === 'single'}
                onChange={() => setMode('single')}
              />
              Single Day
            </label>
            <label className={mode === 'range' ? 'active' : ''}>
              <input
                type="radio"
                name="mode"
                value="range"
                checked={mode === 'range'}
                onChange={() => setMode('range')}
              />
              Date Range
            </label>
            <label className={mode === 'all' ? 'active' : ''}>
              <input
                type="radio"
                name="mode"
                value="all"
                checked={mode === 'all'}
                onChange={() => setMode('all')}
              />
              All Insights
            </label>
          </div>

          {mode === 'single' && (
            <div className="date-input-group">
              <label>Select Date:</label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="date-input"
              />
            </div>
          )}

          {mode === 'range' && (
            <div className="date-range-inputs">
              <div className="date-input-group">
                <label>Start Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                />
              </div>
              <div className="date-input-group">
                <label>End Date:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                />
              </div>
            </div>
          )}

          {mode === 'all' && (
            <div className="warning-message">
              This will reprocess all insights in your database. This may take a while.
            </div>
          )}

          {result && (
            <div className={`result-message ${result.success ? 'success' : 'error'}`}>
              {result.message}
            </div>
          )}

          <div className="reprocess-actions">
            <button
              className="reprocess-button"
              onClick={handleReprocess}
              disabled={processing || (mode === 'range' && (!startDate || !endDate))}
            >
              {processing ? (
                <>
                  <RefreshCw size={16} className="spinning" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Reprocess {mode === 'single' ? 'Day' : mode === 'range' ? 'Range' : 'All'}
                </>
              )}
            </button>
            <button className="cancel-button" onClick={onClose} disabled={processing}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

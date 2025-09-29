import React, { useMemo, useState } from 'react';
import { Globe2, KeyRound, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { COMMON_TIMEZONES } from './timezoneOptions';

const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';

export function ConfigPrompt() {
  const { config, updateConfig } = useAuth();
  const [timezone, setTimezone] = useState(config?.timezone ?? defaultTimezone);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const timezoneOptions = useMemo(() => {
    const options = [...COMMON_TIMEZONES];
    const currentTz = config?.timezone ?? defaultTimezone;
    if (currentTz && !options.some((tz) => tz.value === currentTz)) {
      options.unshift({ value: currentTz, label: `${currentTz} (current)` });
    }
    return options;
  }, [config?.timezone]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await updateConfig({ timezone: timezone.trim(), apiKey: apiKey.trim() });
      setSuccess('Configuration updated successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-panel">
      <div className="onboarding-title-icon">
        <Settings size={28} />
      </div>
      <h1>Finalize Configuration</h1>
      <p className="onboarding-subtitle">Add your Limitless API key and timezone to start syncing insights.</p>
      <form onSubmit={handleSubmit} className="onboarding-form">
        <div className="input-group">
          <span className="input-label">
            <Globe2 size={16} />
            Timezone
          </span>
          <div className="input-wrapper">
            <select
              className="input-field"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {timezoneOptions.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
          <small className="input-help">Used to localize timestamps and schedule daily syncs.</small>
        </div>
        <div className="input-group">
          <span className="input-label">
            <KeyRound size={16} />
            Limitless API key
          </span>
          <div className="input-wrapper">
            <input
              className="input-field"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.hasApiKey ? 'Enter a new key to replace the stored one' : '00000000-0000-0000-0000-000000000000'}
            />
          </div>
          <small className="input-help">You can leave this blank to keep the existing key.</small>
        </div>
        {error && <div className="onboarding-error">{error}</div>}
        {success && <div className="onboarding-success">{success}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save configuration'}
        </button>
      </form>
    </div>
  );
}

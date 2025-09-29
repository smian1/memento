import React, { useMemo, useState } from 'react';
import { UserPlus, LockKeyhole, KeyRound, Globe2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { COMMON_TIMEZONES } from './timezoneOptions';

const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';

const steps = [
  { id: 1, label: 'Account', icon: <UserPlus size={16} /> },
  { id: 2, label: 'Timezone', icon: <Globe2 size={16} /> },
  { id: 3, label: 'API Key', icon: <KeyRound size={16} /> }
];

export function SetupWizard() {
  const { completeSetup } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const timezoneOptions = useMemo(() => {
    const options = [...COMMON_TIMEZONES];
    if (defaultTimezone && !options.some((tz) => tz.value === defaultTimezone)) {
      options.unshift({ value: defaultTimezone, label: `${defaultTimezone} (auto)` });
    }
    return options;
  }, []);

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError('Password is required.');
      return false;
    }
    if (value.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const validateStep = () => {
    if (step === 1) {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        setError('Please choose an admin username.');
        return false;
      }
      if (!validatePassword(password)) {
        setError(null);
        return false;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return false;
      }
      setError(null);
      return true;
    }

    if (step === 2) {
      if (!timezone.trim()) {
        setError('Select a timezone so we can schedule syncs correctly.');
        return false;
      }
      setError(null);
      return true;
    }

    if (!apiKey.trim() || apiKey.trim().length < 20) {
      setError('Enter the Limitless API key from your developer settings.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateStep()) {
      return;
    }

    if (step < steps.length) {
      setStep((prev) => prev + 1);
      return;
    }

    setLoading(true);
    try {
      await completeSetup({ username: username.trim(), password, timezone: timezone.trim(), apiKey: apiKey.trim() });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Setup failed. Please verify the details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 1) return;
    setError(null);
    setStep((prev) => prev - 1);
  };

  return (
    <div className="onboarding-panel">
      <div className="onboarding-brand">
        <img src="/logo.png" alt="Memento" className="onboarding-logo" />
        <h1>Memento Setup</h1>
        <p className="onboarding-subtitle">Let’s prepare your workspace in three quick steps.</p>
      </div>

      <div className="onboarding-stepper">
        {steps.map((item, index) => {
          const status = index + 1 < step ? 'completed' : index + 1 === step ? 'active' : 'upcoming';
          return (
            <div key={item.id} className={`onboarding-step onboarding-step--${status}`}>
              <span className="onboarding-step-icon">{item.icon}</span>
              <span className="onboarding-step-label">{item.label}</span>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="onboarding-form">
        {step === 1 && (
          <>
            <div className="input-group">
              <span className="input-label">
                <UserPlus size={16} />
                Admin username
              </span>
              <div className="input-wrapper">
                <input
                  className="input-field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </div>
              <small className="input-help">Use this account to invite others and manage settings.</small>
            </div>

            <div className="input-group">
              <span className="input-label">
                <LockKeyhole size={16} />
                Password
              </span>
              <div className="input-wrapper">
                <input
                  className="input-field"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setPassword(nextValue);
                    validatePassword(nextValue);
                  }}
                />
              </div>
              <small className="input-help">Minimum 8 characters to secure admin access.</small>
              {passwordError && <small className="input-error">{passwordError}</small>}
            </div>

            <div className="input-group">
              <span className="input-label">
                <LockKeyhole size={16} />
                Confirm password
              </span>
              <div className="input-wrapper">
                <input
                  className="input-field"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
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
              <small className="input-help">We align daily syncs and timestamps to this timezone so insights stay accurate.</small>
            </div>
          </>
        )}

        {step === 3 && (
          <>
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
                  placeholder="00000000-0000-0000-0000-000000000000"
                />
              </div>
              <small className="input-help">This key lets Memento sync insights and life logs from your Limitless account.</small>
            </div>
          </>
        )}

        {error && <div className="onboarding-error">{error}</div>}

        <div className="onboarding-actions">
          {step > 1 && (
            <button type="button" className="onboarding-secondary" onClick={handleBack}>
              Back
            </button>
          )}
          <button type="submit" disabled={loading}>
            {step < steps.length ? 'Next' : loading ? 'Configuring…' : 'Complete setup'}
          </button>
        </div>
      </form>
    </div>
  );
}

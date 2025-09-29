import React, { useState } from 'react';
import { LogIn, User, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormProps {
  onSwitchToSetup?: () => void;
}

export function LoginForm({ onSwitchToSetup }: LoginFormProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ username, password });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Login failed. Check your username and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-panel">
      <div className="onboarding-title-icon">
        <LogIn size={28} />
      </div>
      <h1>Memento</h1>
      <p className="onboarding-subtitle">Welcome back — sign in to continue.</p>
      <form onSubmit={handleSubmit} className="onboarding-form">
        <div className="input-group">
          <span className="input-label">
            <User size={16} />
            Username
          </span>
          <div className="input-wrapper">
            <input
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
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
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        {error && <div className="onboarding-error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {onSwitchToSetup && (
        <button className="onboarding-link" onClick={onSwitchToSetup}>
          Need to run first-time setup?
        </button>
      )}
    </div>
  );
}

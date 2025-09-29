import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SetupWizard } from './SetupWizard';
import { LoginForm } from './LoginForm';
import { ConfigPrompt } from './ConfigPrompt';

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { loading, status } = useAuth();
  const [showSetup, setShowSetup] = useState(false);

  if (loading || !status) {
    return (
      <div className="onboarding-shell">
        <div className="onboarding-panel">
          <h1>Memento</h1>
          <p className="onboarding-subtitle">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (status.needsSetup || showSetup) {
    return (
      <div className="onboarding-shell">
        <SetupWizard />
      </div>
    );
  }

  if (!status.authenticated) {
    return (
      <div className="onboarding-shell">
        <LoginForm onSwitchToSetup={() => setShowSetup(true)} />
      </div>
    );
  }

  if (status.needsConfig) {
    return (
      <div className="onboarding-shell">
        <ConfigPrompt />
      </div>
    );
  }

  return <>{children}</>;
}

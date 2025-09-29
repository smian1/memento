import { AuthProvider } from './contexts/AuthContext';
import { OnboardingGate } from './components/onboarding/OnboardingGate';
import DashboardApp from './DashboardApp';
import './styles/index.css'; // New organized CSS
import './App.css'; // Keep original as fallback during transition
import './onboarding.css';

function App() {
  return (
    <AuthProvider>
      <OnboardingGate>
        <DashboardApp />
      </OnboardingGate>
    </AuthProvider>
  );
}

export default App;

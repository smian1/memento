import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, XCircle } from 'lucide-react';
import { discoveryApi, type SectionDiscovery } from '../api/client';
import './DiscoveryNotification.css';

interface DiscoveryNotificationProps {
  onDiscoveryApproved: () => void;
}

export function DiscoveryNotification({ onDiscoveryApproved }: DiscoveryNotificationProps) {
  const [discoveries, setDiscoveries] = useState<SectionDiscovery[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadPendingDiscoveries = async () => {
    try {
      const response = await discoveryApi.getPendingDiscoveries();
      // Handle both direct array and data wrapper
      const discoveryData = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setDiscoveries(discoveryData);
      setIsVisible(discoveryData.length > 0);
    } catch (error) {
      console.error('Failed to load pending discoveries:', error);
      setDiscoveries([]);
      setIsVisible(false);
    }
  };

  useEffect(() => {
    loadPendingDiscoveries();
  }, []);

  const handleApprove = async (discoveryId: number) => {
    setIsLoading(true);
    try {
      await discoveryApi.approveDiscovery(discoveryId);
      await loadPendingDiscoveries();
      onDiscoveryApproved();
    } catch (error) {
      console.error('Failed to approve discovery:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async (discoveryId: number) => {
    setIsLoading(true);
    try {
      await discoveryApi.dismissDiscovery(discoveryId);
      await loadPendingDiscoveries();
    } catch (error) {
      console.error('Failed to dismiss discovery:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible || !Array.isArray(discoveries) || discoveries.length === 0) {
    return null;
  }

  return (
    <div className="discovery-notification">
      <div className="discovery-notification-content">
        <div className="discovery-notification-header">
          <Bell size={18} className="discovery-notification-icon" />
          <h3>New Sections Discovered!</h3>
          <button onClick={handleClose} className="discovery-notification-close">
            <X size={16} />
          </button>
        </div>

        <div className="discovery-notification-body">
          <p>We found recurring sections in your daily insights. Would you like to extract them automatically?</p>

          {Array.isArray(discoveries) && discoveries.map((discovery) => {
            const samples = discovery.sampleContent ? JSON.parse(discovery.sampleContent) : [];

            return (
              <div key={discovery.id} className="discovery-item">
                <div className="discovery-item-header">
                  <h4>{discovery.sectionHeader}</h4>
                  <span className="discovery-count">
                    Found in {discovery.occurrenceCount} insights
                  </span>
                </div>

                {samples.length > 0 && (
                  <div className="discovery-preview">
                    <strong>Preview:</strong>
                    <div className="discovery-sample">
                      {discovery.sectionHeader === 'Knowledge Nuggets' ? (
                        <div>
                          <span className="nugget-category">[{samples[0].category}]</span> {samples[0].fact.substring(0, 100)}...
                        </div>
                      ) : discovery.sectionHeader === 'Memorable Exchanges' ? (
                        <div>
                          <em>"{samples[0].dialogue[0]?.text?.substring(0, 100)}..."</em>
                        </div>
                      ) : (
                        <div>{samples[0].content?.substring(0, 100)}...</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="discovery-actions">
                  <button
                    onClick={() => handleApprove(discovery.id)}
                    disabled={isLoading}
                    className="discovery-approve-btn"
                  >
                    <CheckCircle size={16} />
                    Extract Automatically
                  </button>
                  <button
                    onClick={() => handleDismiss(discovery.id)}
                    disabled={isLoading}
                    className="discovery-dismiss-btn"
                  >
                    <XCircle size={16} />
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
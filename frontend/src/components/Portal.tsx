import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
  containerId?: string;
}

/**
 * Portal component that renders children at the document root level
 * to avoid stacking context issues with modals and dialogs
 */
export function Portal({ children, containerId = 'portal-root' }: PortalProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Try to find existing portal container
    let portalContainer = document.getElementById(containerId);
    
    // Create portal container if it doesn't exist
    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.id = containerId;
      portalContainer.style.position = 'relative';
      portalContainer.style.zIndex = '9999';
      document.body.appendChild(portalContainer);
    }

    setContainer(portalContainer);

    // Cleanup function to remove container if we created it
    return () => {
      // Only remove if we created it and it has no children
      if (portalContainer && portalContainer.children.length === 0) {
        document.body.removeChild(portalContainer);
      }
    };
  }, [containerId]);

  // Don't render until container is ready
  if (!container) {
    return null;
  }

  return createPortal(children, container);
}

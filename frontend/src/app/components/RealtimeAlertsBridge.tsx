import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import useWebSocket from '../../hooks/useWebSocket';

declare global {
  interface Window {
    __monitoringRealtimeConnected?: boolean;
  }
}

export function RealtimeAlertsBridge() {
  const { isAuthenticated } = useAuth();

  useWebSocket({
    enabled: isAuthenticated,
    onConnectionChange: (isConnected) => {
      window.__monitoringRealtimeConnected = isConnected;
      window.dispatchEvent(
        new CustomEvent('monitoring:websocket-status', {
          detail: { isConnected },
        })
      );
    },
    onAlert: (alert) => {
      window.dispatchEvent(new CustomEvent('monitoring:alert-new', { detail: alert }));
      const method = alert.type === 'critical' ? toast.error : alert.type === 'warning' ? toast.warning : toast.info;
      method(`${alert.serverName}: ${alert.message}`);
    },
    onAlertAcknowledged: (event) => {
      window.dispatchEvent(new CustomEvent('monitoring:alert-acknowledged', { detail: event }));
    },
    onAlertResolved: (event) => {
      window.dispatchEvent(new CustomEvent('monitoring:alert-resolved', { detail: event }));
    },
  });

  useEffect(() => undefined, []);

  return null;
}

export default RealtimeAlertsBridge;

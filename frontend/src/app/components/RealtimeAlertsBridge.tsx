import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import useWebSocket from '../../hooks/useWebSocket';

export function RealtimeAlertsBridge() {
  const { isAuthenticated } = useAuth();

  useWebSocket({
    enabled: isAuthenticated,
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
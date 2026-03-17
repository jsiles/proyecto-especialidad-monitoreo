import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface RealtimeAlertEvent {
  id: string;
  serverId: string;
  serverName: string;
  type: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string | Date;
  acknowledged: boolean;
}

interface UseWebSocketOptions {
  enabled?: boolean;
  onAlert?: (alert: RealtimeAlertEvent) => void;
  onAlertAcknowledged?: (event: { alertId: string; acknowledgedBy: string; timestamp: string | Date }) => void;
  onAlertResolved?: (event: { alertId: string; resolvedAt: string | Date }) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { enabled = true, onAlert, onAlertAcknowledged, onAlertResolved } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!enabled) {
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token || socketRef.current) {
      return;
    }

    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3000', {
      path: '/ws',
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe:alerts');
      socket.emit('request:currentStatus');
    });

    socket.on('disconnect', () => setIsConnected(false));
    socket.on('alert:new', (alert) => onAlert?.(alert));
    socket.on('alert:critical', (alert) => onAlert?.(alert));
    socket.on('alert:acknowledged', (event) => onAlertAcknowledged?.(event));
    socket.on('alert:resolved', (event) => onAlertResolved?.(event));

    socketRef.current = socket;
  }, [enabled, onAlert, onAlertAcknowledged, onAlertResolved]);

  useEffect(() => {
    connect();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  return { isConnected };
}

export default useWebSocket;
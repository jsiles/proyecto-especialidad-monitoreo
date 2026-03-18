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
  onConnectionChange?: (isConnected: boolean) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { enabled = true, onAlert, onAlertAcknowledged, onAlertResolved, onConnectionChange } = options;
  const socketRef = useRef<Socket | null>(null);
  const onAlertRef = useRef(onAlert);
  const onAlertAcknowledgedRef = useRef(onAlertAcknowledged);
  const onAlertResolvedRef = useRef(onAlertResolved);
  const onConnectionChangeRef = useRef(onConnectionChange);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    onAlertRef.current = onAlert;
    onAlertAcknowledgedRef.current = onAlertAcknowledged;
    onAlertResolvedRef.current = onAlertResolved;
    onConnectionChangeRef.current = onConnectionChange;
  }, [onAlert, onAlertAcknowledged, onAlertResolved, onConnectionChange]);

  const connect = useCallback(() => {
    if (!enabled) {
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token || socketRef.current) {
      return;
    }

    const socket = io(normalizeSocketBaseUrl(import.meta.env.VITE_WS_URL || 'http://localhost:3000'), {
      path: '/ws',
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    socket.on('connect', () => {
      setIsConnected(true);
      onConnectionChangeRef.current?.(true);
      socket.emit('subscribe:alerts');
      socket.emit('request:currentStatus');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      onConnectionChangeRef.current?.(false);
    });
    socket.on('alert:new', (alert) => onAlertRef.current?.(alert));
    socket.on('alert:critical', (alert) => onAlertRef.current?.(alert));
    socket.on('alert:acknowledged', (event) => onAlertAcknowledgedRef.current?.(event));
    socket.on('alert:resolved', (event) => onAlertResolvedRef.current?.(event));

    socketRef.current = socket;
  }, [enabled]);

  useEffect(() => {
    connect();

    return () => {
      onConnectionChangeRef.current?.(false);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  return { isConnected };
}

export function normalizeSocketBaseUrl(url: string): string {
  return url.replace(/\/ws\/?$/i, '');
}

export default useWebSocket;

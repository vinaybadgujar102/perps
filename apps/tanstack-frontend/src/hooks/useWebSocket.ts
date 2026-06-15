import { useEffect, useRef } from "react";

type WebSocketOptions = {
  reconnect?: boolean;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onMessage?: (data: unknown) => void;
};

export function useWebSocket(
  url: string,
  { reconnect = true, onOpen, onClose, onMessage }: WebSocketOptions = {},
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onMessageRef = useRef(onMessage);
  onOpenRef.current = onOpen;
  onCloseRef.current = onClose;
  onMessageRef.current = onMessage;

  const connectRef = useRef<() => void>(() => {});

  const scheduleReconnect = () => {
    if (attemptRef.current >= 10) return;

    const baseDelay = Math.min(1000 * 2 ** attemptRef.current, 30000);
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;

    reconnectTimerRef.current = setTimeout(() => {
      attemptRef.current += 1;
      connectRef.current();
    }, delay);
  };

  connectRef.current = () => {
    const socket = new WebSocket(url);
    wsRef.current = socket;

    socket.onopen = () => {
      attemptRef.current = 0;
      onOpenRef.current?.();
    };

    socket.onmessage = (event: MessageEvent) => {
      try {
        onMessageRef.current?.(JSON.parse(event.data));
      } catch {
        console.error("Failed to parse websocket message");
      }
    };

    socket.onclose = (event: CloseEvent) => {
      onCloseRef.current?.(event);

      if (reconnect && event.code !== 1000) {
        scheduleReconnect();
      }
    };

    socket.onerror = () => {
      socket.close();
    };
  };

  useEffect(() => {
    connectRef.current();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      wsRef.current?.close(1000, "hook cleanup");
    };
  }, [url]);

  function send(data: unknown) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }

  return {
    send,
    wsRef,
  };
}

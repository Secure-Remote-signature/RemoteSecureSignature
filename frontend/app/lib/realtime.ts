export interface RealtimeEvent<T = Record<string, unknown>> {
  type: string;
  payload?: T;
  ts?: string;
}

function buildRealtimeUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  try {
    const url = new URL(base);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    url.search = "";
    return url.toString();
  } catch {
    return "ws://localhost:5000/ws";
  }
}

export function subscribeRealtime(onEvent: (event: RealtimeEvent) => void): () => void {
  let socket: WebSocket | null = null;
  let stopped = false;
  let retryTimer: number | null = null;

  const connect = () => {
    if (stopped) return;

    socket = new WebSocket(buildRealtimeUrl());

    socket.onmessage = (message) => {
      try {
        const parsed = JSON.parse(String(message.data)) as RealtimeEvent;
        onEvent(parsed);
      } catch {
        // Ignore malformed events.
      }
    };

    socket.onclose = () => {
      if (stopped) return;
      retryTimer = window.setTimeout(connect, 1500);
    };
  };

  connect();

  return () => {
    stopped = true;
    if (retryTimer !== null) {
      window.clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    } else if (socket) {
      try {
        socket.close();
      } catch {
        // ignore close errors
      }
    }
  };
}

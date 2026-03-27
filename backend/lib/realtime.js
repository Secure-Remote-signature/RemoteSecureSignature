import { WebSocketServer } from "ws";

let wss = null;

export function initializeRealtimeServer(server) {
  if (wss) return wss;

  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    try {
      socket.send(JSON.stringify({ type: "connected", ts: new Date().toISOString() }));
    } catch {
      // ignore send error on initial handshake
    }
  });

  return wss;
}

export function broadcastRealtimeEvent(type, payload = {}) {
  if (!wss) return;

  const data = JSON.stringify({
    type,
    payload,
    ts: new Date().toISOString(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      try {
        client.send(data);
      } catch {
        // ignore per-client send errors
      }
    }
  });
}

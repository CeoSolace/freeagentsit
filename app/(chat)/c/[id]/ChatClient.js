"use client";

import { useEffect, useRef, useState } from "react";

export default function ChatClient({ id }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const { io } = await import("socket.io-client");
      if (!active) return;

      socketRef.current = io({
        path: "/socket.io",
        transports: ["websocket"], // force browser transport
      });

      socketRef.current.on("connect", () => setConnected(true));
      socketRef.current.on("disconnect", () => setConnected(false));
    })();

    return () => {
      active = false;
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Chat {id}</h1>
      <p>Status: {connected ? "Connected" : "Disconnected"}</p>
    </div>
  );
}

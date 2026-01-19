"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import io from 'socket.io-client';

/**
 * Chat conversation page
 *
 * Displays the realtime chat interface for a specific conversation.  It
 * establishes a Socket.IO connection on mount, joins the conversation room
 * via the server, listens for incoming messages and displays them.  The
 * component cleans up when unmounted by leaving the conversation.
 */
export default function ConversationPage() {
  const params = useParams();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (!conversationId) return;
    let disposed = false;
    // Join conversation via REST API first to perform server‑side checks
    async function joinConversation() {
      try {
        const res = await fetch('/api/chat/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Unable to join conversation: ${text}`);
        }
        // Once joined via REST, establish socket connection
        const socket = io({ path: '/socket.io' });
        socketRef.current = socket;
        socket.on('connect', () => {
          // We pass a dummy userId; the server will infer the actual user via session
          socket.emit('join', { conversationId });
        });
        socket.on('history', (msgs) => {
          if (!disposed) {
            setMessages(msgs);
            scrollToBottom();
          }
        });
        socket.on('message', (msg) => {
          if (!disposed) {
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        });
      } catch (err) {
        setError(err.message);
      }
    }
    joinConversation();
    return () => {
      disposed = true;
      // Leave via REST and close socket
      fetch('/api/chat/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      }).catch(() => {});
      if (socketRef.current) {
        socketRef.current.emit('leave', { conversationId });
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [conversationId]);

  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !socketRef.current) return;
    try {
      // Optimistically add message
      const temp = { _id: Math.random().toString(36).slice(2), sender: 'You', content: input, createdAt: new Date().toISOString() };
      setMessages((prev) => [...prev, temp]);
      socketRef.current.emit('message', { conversationId, content: input });
      setInput('');
      scrollToBottom();
    } catch (err) {
      // ignore
    }
  };

  return (
    <div style={{ padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <h1>Conversation</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
        {messages.map((msg) => (
          <div key={msg._id || msg.id || Math.random()} style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>{msg.sender} &bull; {new Date(msg.createdAt).toLocaleString()}</div>
            <div>{msg.content}</div>
          </div>
        ))}
        <div ref={bottomRef}></div>
      </div>
      <div style={{ display: 'flex' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
          style={{ flex: 1, marginRight: '8px' }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
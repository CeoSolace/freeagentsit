"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * Inbox page
 *
 * Displays a list of the user's active conversations and allows the user to
 * initiate a new chat.  The page fetches the conversation list from the
 * server on mount.  When the user creates a new chat they are redirected
 * directly to that conversation.
 */
export default function InboxPage() {
  const [conversations, setConversations] = useState([]);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await fetch('/api/chat/list');
        if (!res.ok) {
          throw new Error(`Failed to load conversations (${res.status})`);
        }
        const data = await res.json();
        setConversations(data.conversations || []);
      } catch (err) {
        setError(err.message);
      }
    }
    loadConversations();
  }, []);

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/chat/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: [] }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Unable to create chat: ${text}`);
      }
      const data = await res.json();
      router.push(`/c/${data.conversationId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Inbox</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleNewChat}>New Chat</button>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {conversations.map((c) => (
          <li key={c._id || c.id} style={{ marginTop: '10px' }}>
            <Link href={`/c/${c._id || c.id}`}>Conversation {c._id || c.id}</Link>
          </li>
        ))}
        {conversations.length === 0 && <li>No active conversations.</li>}
      </ul>
    </div>
  );
}
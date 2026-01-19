"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Report submission page
 *
 * Allows a participant to file a report against a conversation.  The user may
 * optionally provide a reason describing why they are reporting the chat.  On
 * successful submission the page displays a confirmation message and
 * redirects back to the inbox after a short delay.
 */
export default function ReportConversationPage() {
  const params = useParams();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setError(null);
    try {
      const res = await fetch('/api/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, reason }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      setStatus('Report submitted successfully');
      setTimeout(() => router.push('/'), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h1>Report Conversation</h1>
      {status && <p style={{ color: 'green' }}>{status}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="reason">Reason (optional)</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            style={{ width: '100%' }}
          />
        </div>
        <button type="submit">Submit Report</button>
      </form>
    </div>
  );
}
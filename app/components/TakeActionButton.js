"use client";
import { useEffect, useState } from 'react';

/*
 * TakeActionButton component.  For staff pages, this component
 * fetches the moderation actions available for a given target user
 * from the server and renders buttons accordingly.  Supported
 * actions include banning and unbanning a user.  Clicking a button
 * triggers a POST request to the appropriate admin API endpoint.  The
 * component accepts a `userId` prop identifying the user to act on.
 */

export default function TakeActionButton({ userId }) {
  const [actions, setActions] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchActions() {
      try {
        const res = await fetch(`/api/admin/user/actions?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        if (res.ok) {
          setActions(data);
        } else {
          throw new Error(data.error || 'Failed to fetch actions');
        }
      } catch (err) {
        setError(err.message);
      }
    }
    fetchActions();
  }, [userId]);

  async function perform(action) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/user/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      // Refresh actions
      setActions(null);
      const res2 = await fetch(`/api/admin/user/actions?userId=${encodeURIComponent(userId)}`);
      const data2 = await res2.json();
      setActions(res2.ok ? data2 : null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getCsrfToken() {
    const match = document.cookie.match(/fa\.csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
  if (!actions) return <p>Loading…</p>;
  return (
    <div>
      {actions.canBan && <button onClick={() => perform('ban')} disabled={loading}>Ban</button>}
      {actions.canUnban && <button onClick={() => perform('unban')} disabled={loading}>Unban</button>}
      {actions.canAppeal && <span>Appeal Available</span>}
    </div>
  );
}
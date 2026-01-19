"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/*
 * Discord OAuth callback handler.  This client component extracts the
 * `code` and `state` parameters from the URL and posts them to the
 * server to complete the OAuth exchange.  It displays a loading
 * indicator while the request is in flight and redirects to the
 * homepage on success.
 */

export default function DiscordCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    async function completeOAuth() {
      try {
        const res = await fetch('/api/auth/discord/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': getCsrfToken(),
          },
          body: JSON.stringify({ code, state }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'OAuth failed');
        router.replace('/');
      } catch (err) {
        setError(err.message);
      }
    }
    completeOAuth();
  }, [router]);
  function getCsrfToken() {
    const match = document.cookie.match(/fa\.csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }
  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem' }}>
      <h1>Completing sign in…</h1>
      {!error && <p>Please wait while we finish logging you in.</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
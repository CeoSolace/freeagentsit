"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/*
 * Login page component.  Users must sign up via Discord OAuth.  Once
 * they have an account they may optionally set a password to allow
 * logging in via email/password.  A minimal Google login link is
 * included only if Google OAuth is enabled on the server, which
 * clients can detect by attempting to fetch the OAuth URL.
 */

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/auth/password/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      // Redirect on success
      router.push('/');
    } catch (err) {
      setError(err.message);
    }
  };

  // CSRF token is stored in a cookie by the attachCsrfToken middleware.
  function getCsrfToken() {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(/fa\.csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem' }}>
      <h1>Sign in</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <p>
        <a href="/api/auth/discord/start" style={{ display: 'inline-block', padding: '0.5rem 1rem', backgroundColor: '#5865F2', color: '#fff', borderRadius: '4px', textDecoration: 'none' }}>Sign in with Discord</a>
      </p>
      <hr />
      <h2>Email Sign in</h2>
      <p>Already signed up? Enter your email and password.</p>
      <form onSubmit={handlePasswordLogin}>
        <div style={{ marginBottom: '0.5rem' }}>
          <label>Email<br />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <label>Password<br />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

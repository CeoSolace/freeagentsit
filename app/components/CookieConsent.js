"use client";
import { useEffect, useState } from 'react';

/*
 * CookieConsent component.  Shows a small banner asking the user to
 * acknowledge the use of cookies.  Once accepted, a cookie is set
 * and the banner is not shown again.  This component should be
 * included on all public pages.
 */

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const consent = document.cookie.match(/fa\.cookieConsent=([^;]+)/);
    if (!consent) {
      setVisible(true);
    }
  }, []);
  function accept() {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `fa.cookieConsent=1; expires=${expires.toUTCString()}; path=/`;
    setVisible(false);
  }
  if (!visible) return null;
  return (
    <div style={{ position: 'fixed', bottom: 0, width: '100%', background: '#222', color: '#fff', padding: '1rem', textAlign: 'center', zIndex: 1000 }}>
      <p style={{ margin: 0 }}>This site uses cookies to enhance your experience. By continuing to use the site, you consent to our use of cookies.</p>
      <button onClick={accept} style={{ marginTop: '0.5rem', padding: '0.3rem 1rem' }}>Got it</button>
    </div>
  );
}
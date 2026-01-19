"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/*
 * AdSlot component.  Determines whether to render an advertisement
 * based on the current path and the user's subscription tier.  A
 * request is made to `/api/me` with the current path so the server
 * can apply the advertising rules centrally.  When ads should be
 * shown, this component renders a placeholder area; otherwise it
 * returns null.  Replace the placeholder with your actual ad code.
 */

export default function AdSlot() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  useEffect(() => {
    async function fetchDecision() {
      try {
        const res = await fetch(`/api/me?path=${encodeURIComponent(pathname)}`);
        const data = await res.json();
        if (res.ok) {
          setShow(!!data.showAds);
        }
      } catch (_) {
        // In case of error assume we should show ads for anonymous users
        setShow(true);
      }
    }
    fetchDecision();
  }, [pathname]);
  if (!show) return null;
  return (
    <div style={{ margin: '1rem 0', padding: '1rem', border: '1px dashed #ccc', textAlign: 'center' }}>
      <p>Advertisement</p>
    </div>
  );
}
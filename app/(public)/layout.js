/*
 * Public layout.  Applies to pages that are publicly accessible and
 * thus may display advertisements.  Includes a CookieConsent
 * component to prompt users to accept cookies.  Ad slots can be
 * embedded in individual pages as needed using the AdSlot component.
 */

import CookieConsent from '../components/CookieConsent';

export default function PublicLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CookieConsent />
        {children}
      </body>
    </html>
  );
}
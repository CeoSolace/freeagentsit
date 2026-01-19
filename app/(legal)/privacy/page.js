/*
 * Privacy policy page.  This static page outlines how user data is
 * collected, processed and protected.  It does not contain any
 * interactive code.  Edit the content as needed to reflect your
 * organisation's policies.
 */

export const metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPolicyPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Privacy Policy</h1>
      <p>This is a placeholder privacy policy for FreeAgents.ltd. We are committed to protecting your data and privacy. No personal information is shared with third parties without your consent, except as required by law.</p>
      <p>We collect your email and OAuth identifiers solely for the purpose of authentication and providing our services. For more information, please contact us.</p>
    </div>
  );
}
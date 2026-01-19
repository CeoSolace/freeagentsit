/*
 * Terms of service page.  This static page defines the rules for
 * using the platform.  Replace the placeholder text with your own
 * legal terms.
 */

export const metadata = {
  title: 'Terms of Service',
};

export default function TermsPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Terms of Service</h1>
      <p>By using this service you agree to abide by all applicable laws and regulations. The following terms are provided as a placeholder and should be replaced with your actual contractual terms.</p>
      <p>Users must not engage in prohibited conduct including harassment, hate speech, scams, impersonation, spam, child exploitation, abuse of system or charge fraud. Violations may result in bans as described in our policy.</p>
    </div>
  );
}
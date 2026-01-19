// Success page shown after a successful checkout.

import { useSearchParams } from 'next/navigation';

export default function SuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Payment Successful</h1>
      {sessionId ? (
        <p>Your session ID is: {sessionId}</p>
      ) : (
        <p>Thank you for your purchase!</p>
      )}
    </div>
  );
}
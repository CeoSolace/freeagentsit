// Cancellation page shown when a checkout is aborted.

export default function CancelPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Payment Cancelled</h1>
      <p>Your payment was cancelled. You can try again at any time.</p>
    </div>
  );
}
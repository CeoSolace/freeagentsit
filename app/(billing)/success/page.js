"use client";

import { useSearchParams } from "next/navigation";

export default function SuccessClient() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Payment Successful</h1>
      {sessionId ? (
        <p>Your session ID is: {sessionId}</p>
      ) : (
        <p>Thank you for your purchase!</p>
      )}
      <p style={{ marginTop: "1rem" }}>
        <a href="/" style={{ textDecoration: "underline" }}>Go back home</a>
      </p>
    </div>
  );
}

"use client";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Application error</h1>
          <p style={{ marginTop: 8, color: "#666" }}>{error.message || "Unexpected application error."}</p>
          <button type="button" style={{ marginTop: 16 }} onClick={reset}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

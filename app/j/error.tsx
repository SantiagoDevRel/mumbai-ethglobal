"use client";
export default function JoinError({ reset }: { reset: () => void }) {
  return <main style={{ padding: 28 }}><h1>Let’s reconnect.</h1><p>Your connection was interrupted.</p><button onClick={reset}>Try again</button></main>;
}

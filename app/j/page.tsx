"use client";

// Phone page from the QR (`/j?s=<session>`). Placeholder: the app chat builds the form,
// "your entity" and resources states (WORKSHOP.md 4.2).

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-[var(--phone-bg)] p-6 text-[var(--phone-fg)]">
      <h1 className="text-2xl font-semibold">Join the map</h1>
      <p className="mt-6 text-sm text-[var(--phone-muted)]">Arkiv testnet · everything you write is public.</p>
    </main>
  );
}

'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error('Standings error:', error);
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">We couldn’t load standings.</h2>
      {error?.digest && <p className="text-sm opacity-70 mt-1">Digest: {error.digest}</p>}
      <button className="mt-4 px-3 py-1 rounded bg-white/10" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}

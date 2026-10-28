'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-red-400">CPP Fantasy Football</p>
          <h1 className="mt-4 text-3xl font-bold">The site hit an unexpected error.</h1>
          <p className="mt-3 text-gray-300">
            Refresh the page or try again. If this keeps happening, contact the commissioner.
          </p>
          {error.digest ? (
            <p className="mt-3 text-sm text-gray-500">Reference: {error.digest}</p>
          ) : null}
          <button
            className="mt-6 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
            onClick={() => reset()}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

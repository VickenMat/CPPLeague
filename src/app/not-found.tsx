import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center text-white">
      <p className="text-sm uppercase tracking-[0.3em] text-gray-400">404</p>
      <h1 className="mt-4 text-3xl font-bold">Page not found.</h1>
      <p className="mt-3 text-gray-300">
        The page may have moved or the link is invalid.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
      >
        Return home
      </Link>
    </main>
  );
}

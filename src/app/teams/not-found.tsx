import Link from 'next/link';

export default function TeamsNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white px-6 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-extrabold mb-2">Team page not found</h1>
        <p className="text-gray-400 mb-6">We couldn’t find that league/team. Pick a team from the list.</p>
        <Link href="/teams" className="text-indigo-400 hover:text-indigo-300">Back to Teams</Link>
      </div>
    </div>
  );
}

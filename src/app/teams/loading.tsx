export default function TeamsLoading() {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full bg-white/70 animate-pulse" />
        <div className="h-3 w-3 rounded-full bg-white/50 animate-pulse [animation-delay:150ms]" />
        <div className="h-3 w-3 rounded-full bg-white/30 animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { LEAGUE_SOUNDBITES } from "../../../lib/site-content";
export default function Soundbites() {
  const [start, setStart] = useState(0);
  if (!LEAGUE_SOUNDBITES.length)
    return (
      <p className="py-6 text-center text-gray-400">
        No CPP soundbites yet. Send in your best league line.
      </p>
    );
  const visible = Array.from(
    { length: Math.min(4, LEAGUE_SOUNDBITES.length) },
    (_, offset) =>
      LEAGUE_SOUNDBITES[(start + offset) % LEAGUE_SOUNDBITES.length],
  );
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map((quote, index) => (
          <figure
            key={`${start}-${index}`}
            className="flex min-h-32 flex-col justify-between rounded-xl border border-gray-800 bg-black/30 p-4 text-center"
          >
            <blockquote className="text-gray-100">“{quote.quote}”</blockquote>
            <figcaption className="mt-3 text-sm text-gray-400">
              — {quote.name}
            </figcaption>
          </figure>
        ))}
      </div>
      {LEAGUE_SOUNDBITES.length > 4 && (
        <div className="mt-4 flex justify-center gap-3">
          <button
            onClick={() =>
              setStart(
                (start + LEAGUE_SOUNDBITES.length - 1) %
                  LEAGUE_SOUNDBITES.length,
              )
            }
            aria-label="Previous soundbites"
            className="rounded-lg border border-gray-700 px-3 py-1"
          >
            ←
          </button>
          <button
            onClick={() => setStart((start + 1) % LEAGUE_SOUNDBITES.length)}
            aria-label="Next soundbites"
            className="rounded-lg border border-gray-700 px-3 py-1"
          >
            →
          </button>
        </div>
      )}
    </>
  );
}

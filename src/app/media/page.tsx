import Link from "next/link";
import { PageShell, CREAM_BUTTON } from "../components/LeagueUI";
import { MEDIA_HIGHLIGHTS, youtubeId } from "../../../lib/site-content";
import DiscussionBoard from "./DiscussionBoard";
import Soundbites from "./Soundbites";
const CARD = "rounded-2xl border border-gray-800 bg-black/20 p-5";
export default function MediaPage() {
  return (
    <PageShell
      title="Media"
      subtitle="Highlights, reactions, and CPP league nonsense."
    >
      <section className={CARD + " mb-8"}>
        <h2 className="mb-4 text-center text-2xl font-bold">
          League Soundbites 🎙️
        </h2>
        <Soundbites />
        <p className="mt-3 text-center text-xs text-gray-500">
          Got a better line?{" "}
          <Link href="/contact" className="text-blue-400 hover:text-blue-300">
            Submit your roast →
          </Link>
        </p>
      </section>
      <section className={CARD + " mb-10"}>
        <h2 className="mb-4 text-center text-2xl font-bold">
          Featured Highlights
        </h2>
        {!MEDIA_HIGHLIGHTS.length ? (
          <p className="py-8 text-center text-gray-400">
            CPP highlights will appear here once videos are added.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {MEDIA_HIGHLIGHTS.map((video) => {
              const id = youtubeId(video.youtubeUrl);
              return (
                <article
                  key={video.id}
                  className="rounded-2xl border border-red-500/40 bg-black/30 p-3"
                >
                  <div className="aspect-video overflow-hidden rounded-lg border border-gray-800 bg-black/40">
                    {id ? (
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
                        title={video.title}
                        className="h-full w-full"
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allow="encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <p className="p-4 text-center text-gray-400">
                        This video link could not be embedded.
                      </p>
                    )}
                  </div>
                  <h3 className="mt-3 text-center font-semibold">
                    {video.title}
                  </h3>
                  {video.date && (
                    <p className="mt-1 text-center text-xs text-gray-400">
                      {video.date}
                    </p>
                  )}
                  {video.credit && (
                    <p className="mt-1 text-center text-xs text-gray-400">
                      {video.credit}
                    </p>
                  )}
                  {id && (
                    <div className="mt-3 text-center">
                      <a
                        href={`https://www.youtube.com/watch?v=${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={CREAM_BUTTON}
                      >
                        Open on YouTube
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
      <DiscussionBoard />
      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <div className={CARD + " text-center"}>
          <h2 className="font-semibold">Submit Media</h2>
          <p className="mt-2 text-sm text-gray-300">
            Have a meme or highlight? Send it in.
          </p>
          <Link href="/contact" className={CREAM_BUTTON + " mt-3 text-sm"}>
            Contact the Commissioner
          </Link>
        </div>
        <div className={CARD + " text-center"}>
          <h2 className="font-semibold">Guidelines</h2>
          <p className="mt-2 text-sm text-gray-300">
            Keep it about the league. Bring the trash talk; leave private
            information out.
          </p>
        </div>
        <div className={CARD + " text-center"}>
          <h2 className="font-semibold">Attribution</h2>
          <p className="mt-2 text-sm text-gray-300">
            Include a creator credit with submissions. Let us know if you want
            your name shown.
          </p>
        </div>
      </section>
    </PageShell>
  );
}

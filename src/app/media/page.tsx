/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

/* --------------------------- Types & Mock Data --------------------------- */
type LeagueKey = 'A' | 'B' | 'C';
type MediaKind = 'image' | 'video';
type Category = 'Memes' | 'Highlights' | 'Reactions';

type MediaItem = {
  id: string;
  kind: MediaKind;
  league: LeagueKey;
  title: string;
  thumb: string;      // small/preview
  src: string;        // For videos: any YouTube URL (watch/shorts/youtu.be/embed) or plain ID
  category: Category;
  date?: string;      // optional display date
};

const MEDIA_ITEMS: MediaItem[] = [
  // Images (kept for future use)
  { id: 'm1', kind: 'image', league: 'A', title: 'Draft Night Chaos',
    thumb: '/media/a-draft-1.jpg', src: '/media/a-draft-1.jpg', category: 'Memes', date: '2025-08-17' },
  { id: 'm2', kind: 'image', league: 'B', title: 'Waiver Wire Wizard',
    thumb: '/media/b-meme-1.jpg', src: '/media/b-meme-1.jpg', category: 'Reactions', date: '2025-08-18' },
  { id: 'm3', kind: 'image', league: 'C', title: 'Promotion Dreams',
    thumb: '/media/c-meme-1.jpg', src: '/media/c-meme-1.jpg', category: 'Memes', date: '2025-08-18' },
  { id: 'm4', kind: 'image', league: 'A', title: 'Leroy’s “Safe” Start/Sit',
    thumb: '/media/a-meme-2.jpg', src: '/media/a-meme-2.jpg', category: 'Reactions', date: '2025-08-19' },

  // Videos (mix of embed & watch URLs — we'll normalize them below)
  { id: 'v1', kind: 'video', league: 'A', title: 'Only One - Tavon Austin Highlights',
    thumb: '/media/a-highlights-thumb.jpg', src: 'https://www.youtube.com/embed/T3_UNFZHSQU', category: 'Highlights', date: '2025-08-19' },
  { id: 'v2', kind: 'video', league: 'B', title: 'George Pickens Crashout Compilation',
    thumb: '/media/b-highlights-thumb.jpg', src: 'https://www.youtube.com/watch?v=M8fJ0YlY6kU', category: 'Highlights', date: '2025-08-19' },
  { id: 'v3', kind: 'video', league: 'C', title: 'The Odell and Norman Brawl Game',
    thumb: '/media/c-highlights-thumb.jpg', src: 'https://www.youtube.com/watch?v=M4blG97kG74', category: 'Highlights', date: '2025-08-19' },
];

/* ----------------------------- Quotes Data ------------------------------ */
type Quote = { name: string; quote: string };
const QUOTES: Quote[] = [
  { name: 'Armen S.', quote: "Even my kicker requested a trade" },
  { name: 'Garen S.', quote: "Garo's team is tutorial island for the rest of the league" },
  { name: 'Alexis C.', quote: 'ESPN projected Aren to finish 14th in a 12-team league 🪦' },
  { name: 'Shant A.', quote: "My team comes up limp when I need it most" },
  { name: 'Violette D.', quote: "I'm just here so I don't get fined" },
  { name: 'Vicken M.', quote: 'My team has been officially marked a war crime' },
  { name: 'Garo B.', quote: 'My team has more holes than a cheap condom' },
  { name: 'Aleena S.', quote: 'My WRs catch STDs more often than touchdowns' },
  { name: 'Aren D.', quote: 'Why bother with fantasy football when baseball exists?' },
  { name: 'Shant K.', quote: "My roster is basically hospice care with cleats" },
  { name: 'Karyl A.', quote: 'ESPN just labeled my team ‘Why bother?’ 😭' },
  { name: 'Hampton T.', quote: "I draft like I have CTE" },
  { name: 'Raphael Y.', quote: 'My players ghosted me harder than a Hinge date' },
  { name: 'Andy S.', quote: 'My WRs catch fewer balls than a swing party' },
  { name: 'Ara C.', quote: "I'm a brick" },
  { name: 'Vasken K.', quote: "Even the Browns laughed at my rebuild" },
  { name: 'Gregory C.', quote: "My draft strategy is as good as a monkey throwing darts" },
  { name: 'Njteh H.', quote: "COMMIES TO THE SUPERBOWL" },
  { name: 'Alex M.', quote: "I made 37 trades and still got 11th" },
  { name: 'Sevan S.', quote: "Drafted with my gut but I should've used my brain" },
  { name: 'Alec S.', quote: "I'm the free trial everyone absuses before cancelling" },
  { name: 'Alina D.', quote: "My lineup is basically organized crime against football" },
  { name: 'Shant P.', quote: "My team gets run through like cheap vodka at a frat party" },
  { name: 'Tadeh D.', quote: "My playoff hopes are on IR" },
  { name: 'Alec P.', quote: "I lead the league in bad beats" },
  { name: 'Shahe D.', quote: "Already looking forward to next year's draft" },
  { name: 'Vadik B.', quote: "ESPN said I had a 99% chance of playoffs - you won't guess what happened" },
  { name: 'Daron H.', quote: "My average fantasy score is closer to golf than basketball" },
  { name: 'Ardo N.', quote: "Fantasy football is just pain with stats" },
  { name: 'Aren B.', quote: "Drafted a dynasty team in redraft" },
  { name: 'Alina K.', quote: "I peaked in week 1" },
  { name: 'Vahey M.', quote: "Lost to second lowest scorer 3 weeks in a row" },
  { name: 'Nareg A.', quote: "My sleepers are still napping" },
  { name: 'Kevork D.', quote: "Team chemistry - toxic" },
  { name: 'Jacob N.', quote: "I've been rebuilding since week 2" },
];

/* ----------------------------- UI Utilities ----------------------------- */
function leagueAccent(league: LeagueKey) {
  return league === 'A'
    ? { ring: 'ring-red-500/40', bar: 'before:bg-red-500', text: 'text-red-400', dot: 'bg-red-500' }
    : league === 'B'
    ? { ring: 'ring-blue-500/40', bar: 'before:bg-blue-500', text: 'text-blue-400', dot: 'bg-blue-500' }
    : { ring: 'ring-orange-500/40', bar: 'before:bg-orange-500', text: 'text-orange-400', dot: 'bg-orange-500' };
}
function sectionShell(league: LeagueKey) {
  const a = leagueAccent(league);
  return [
    'relative rounded-2xl border border-gray-800 bg-black/30 ring-1',
    a.ring,
    'before:absolute before:left-4 before:right-4 before:top-0 before:h-1.5 before:rounded-full content-[""]',
    a.bar,
  ].join(' ');
}
const creamBtn =
  'px-3 py-1.5 rounded-lg font-semibold text-black bg-[#D9D7B6] hover:bg-[#cfcdb3] transition';

/* ---------------------- YouTube parsing & embed URLs --------------------- */
function parseYouTubeId(input: string): string | null {
  // Allow raw IDs
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  try {
    const u = new URL(input);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.slice(1);
      return id ? id.substring(0, 11) : null;
    }
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtube-nocookie.com')) {
      if (u.pathname.startsWith('/watch')) return u.searchParams.get('v');
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null;
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || null;
    }
    return null;
  } catch {
    return null;
  }
}
function toEmbedNoCookie(src: string): { embed: string | null; watch: string | null } {
  const id = parseYouTubeId(src);
  if (!id) return { embed: null, watch: null };
  return {
    embed: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`,
    watch: `https://www.youtube.com/watch?v=${id}`,
  };
}

/* ----------------------- 4‑Up Quotes Carousel ----------------------- */
function QuotesCarousel4up() {
  const [visible, setVisible] = useState(4); // xl:4, lg:3, md:2, sm:1
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setVisible(w >= 1280 ? 4 : w >= 1024 ? 3 : w >= 640 ? 2 : 1);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const base = QUOTES.length;
  const slides = useMemo(() => [...QUOTES, ...QUOTES, ...QUOTES], []);
  const [index, setIndex] = useState(base);
  const [transitioning, setTransitioning] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => i + 1), 3000);
    return () => clearInterval(id);
  }, [paused]);

  const handleTransitionEnd = () => {
    if (index >= base + base) {
      setTransitioning(false);
      setIndex(index - base);
    } else if (index < base) {
      setTransitioning(false);
      setIndex(index + base);
    } else {
      setTransitioning(true);
    }
  };

  const itemPct = 100 / visible;
  const translatePct = -(index * itemPct);

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex will-change-transform"
        style={{
          transform: `translateX(${translatePct}%)`,
          transition: transitioning ? 'transform 650ms cubic-bezier(.22,.61,.36,1)' : 'none',
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {slides.map((q, i) => (
          <figure
            key={`${i}-${q.name}`}
            className="shrink-0 px-3"
            style={{ width: `${itemPct}%` }}
          >
            <div className="h-full rounded-2xl border border-gray-800 bg-black/30 p-5 text-left">
              <span className="text-4xl leading-none text-white/70" aria-hidden>“</span>
              <blockquote className="mt-2 text-base text-white/90">{q.quote}</blockquote>
              <figcaption className="mt-3 text-xs text-gray-400">— {q.name}</figcaption>
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}

/* ----------------------- Discussion Board (persistent) ----------------------- */
type Post = { id: string; name: string; text: string; date: string };
const DISCUSSION_STORAGE_KEY = 'anff_media_discussion_v1';

function DiscussionBoard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');

  // Load once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DISCUSSION_STORAGE_KEY);
      if (saved) setPosts(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Save on change
  useEffect(() => {
    try {
      localStorage.setItem(DISCUSSION_STORAGE_KEY, JSON.stringify(posts));
    } catch { /* ignore */ }
  }, [posts]);

  const addPost = () => {
    if (!text.trim()) return;
    const newPost: Post = {
      id: `${Date.now()}`,
      name: name.trim() || 'Anonymous',
      text: text.trim(),
      date: new Date().toLocaleString(),
    };
    setPosts((prev) => [newPost, ...prev]);
    setText('');
  };

  const clearAll = () => {
    if (!confirm('Clear all discussion posts on this device?')) return;
    setPosts([]);
    localStorage.removeItem(DISCUSSION_STORAGE_KEY);
  };

  return (
    <section className="max-w-7xl mx-auto mt-10">
      <div className="rounded-2xl border border-gray-800 bg-black/20 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Discussion Board 💬</h2>
          <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-200 underline">
            Clear (this device)
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-black/40 text-white border border-gray-700"
          />
          <input
            type="text"
            placeholder="Say something…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-[2] px-3 py-2 rounded-lg bg-black/40 text-white border border-gray-700"
            onKeyDown={(e) => { if (e.key === 'Enter') addPost(); }}
          />
          <button onClick={addPost} className={creamBtn}>Post</button>
        </div>

        {posts.length === 0 ? (
          <p className="text-gray-400 text-center">No posts yet. Be the first!</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => (
              <li key={p.id} className="rounded-xl border border-gray-800 bg-black/30 p-3">
                <div className="text-sm text-gray-400">{p.date}</div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-white whitespace-pre-wrap break-words">{p.text}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* --------------------------------- Page --------------------------------- */
export default function MediaPage() {
  const featured = useMemo(
    () => MEDIA_ITEMS.filter((m) => m.kind === 'video').slice(0, 3),
    []
  );

  return (
    <div className="relative min-h-screen text-white px-6 py-10">
      {/* Background: faint logo + translucent gradient */}
      <div className="fixed inset-0 -z-10">
        <img
          src="/logo_transparent.png"
          alt="ANFF watermark"
          className="w-full h-full object-contain opacity-[0.25] pointer-events-none select-none"
          style={{ objectPosition: 'center' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 to-black/70" />
      </div>

      {/* Header */}
      <header className="max-w-7xl mx-auto text-center mb-8">
        <h1 className="text-4xl font-extrabold">Media</h1>
        <p className="text-gray-300 mt-2">Highlights, reactions, and league nonsense.</p>
      </header>

      {/* Quotes & Roasts */}
      <section className="max-w-7xl mx-auto mb-8">
        <div className="rounded-2xl border border-gray-800 bg-black/20 p-5">
          <h2 className="text-2xl font-bold mb-4 text-center">League Soundbites 🎙️</h2>
          <QuotesCarousel4up />
          <p className="text-xs text-gray-500 mt-3 text-center">
            Got a better line? <Link href="/contact" className="text-blue-400 hover:text-blue-300">Submit your roast →</Link>
          </p>
        </div>
      </section>

      {/* Featured Highlights */}
      <section className="max-w-7xl mx-auto mb-10">
        <div className="rounded-2xl border border-gray-800 bg-black/20 p-5">
          <h2 className="text-2xl font-bold mb-4 text-center">Featured Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featured.map((v) => {
              const yt = toEmbedNoCookie(v.src);
              return (
                <div key={v.id} className={sectionShell(v.league as LeagueKey)}>
                  <div className="p-3">
                    <div className="aspect-video rounded-lg overflow-hidden border border-gray-800 bg-black/40 grid place-items-center">
                      {yt.embed ? (
                        <iframe
                          src={yt.embed}
                          title={v.title}
                          className="w-full h-full"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          loading="lazy"
                        />
                      ) : (
                        <div className="p-4 text-center text-gray-300">
                          Unable to embed this video.
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-center">
                      {/* League label removed */}
                      <div className="font-medium">{v.title}</div>
                      <div className="text-gray-400 text-xs">{v.date || ''}</div>
                      {yt.watch && (
                        <div className="mt-2">
                          <a href={yt.watch} target="_blank" rel="noreferrer" className={creamBtn}>
                            Open on YouTube
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Discussion Board ABOVE the tiles */}
      <DiscussionBoard />

      {/* Submit Media / Guidelines / Attribution */}
      <section className="max-w-7xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-800 bg-black/20 p-5 text-center">
          <h3 className="font-semibold text-white">Submit Media</h3>
          <p className="text-gray-300 mt-1">Have a meme or highlight? Send it in.</p>
          <Link href="/contact" className={`${creamBtn} inline-block mt-3`}>Contact the Commissioner</Link>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-black/20 p-5 text-center">
          <h3 className="font-semibold text-white">Guidelines</h3>
          <ul className="text-sm text-gray-300 mt-2 space-y-1">
            <li>• Have at it</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-black/20 p-5 text-center">
          <h3 className="font-semibold text-white">Attribution</h3>
          <p className="text-gray-300 mt-1">
            Credit provided on request. By submitting, you grant ANFF permission to repost.
          </p>
        </div>
      </section>
    </div>
  );
}

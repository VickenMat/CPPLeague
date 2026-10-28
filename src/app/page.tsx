'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

/* Accent section helper (consistent red/blue/orange cards with colored ring + top bar) */
function accentWrap(color: 'red' | 'blue' | 'orange') {
  const ring =
    color === 'red'
      ? 'ring-red-600/70 before:bg-red-600'
      : color === 'blue'
      ? 'ring-blue-600/70 before:bg-blue-600'
      : 'ring-orange-500/70 before:bg-orange-500';

  return [
    'relative rounded-2xl bg-black/20 shadow-lg',
    'border border-gray-800/60 ring-1',
    'before:absolute before:left-0 before:top-0 before:h-1.5 before:w-full before:rounded-t-2xl before:content-[""]',
    ring,
  ].join(' ');
}

const DONATE_LINKS = [
  { title: 'Armenia Fund', href: 'https://www.armeniafund.org/' },
  { title: 'AYF (Armenian Youth Federation)', href: 'https://ayf.org/' },
  { title: 'ARS (Armenian Relief Society)', href: 'https://ars1910.org/' },
  { title: 'Hidden Road Initiative', href: 'https://www.hiddenroadinitiative.org/' },
  { title: 'Zinapah (Soldiers’ Insurance)', href: 'https://www.zinapah.am/en/' },
  { title: 'ANCA – Ways to Donate', href: 'https://anca.org/ways-to-donate/' },
];

export default function Home() {
  const [email, setEmail] = useState('');

  const LEAGUE_URLS = {
    A: process.env.NEXT_PUBLIC_LEAGUE_A_URL ?? '#',
    B: process.env.NEXT_PUBLIC_LEAGUE_B_URL ?? '#',
    C: process.env.NEXT_PUBLIC_LEAGUE_C_URL ?? '#',
  };

  return (
    <div className="relative min-h-screen text-white">
      {/* --- Static, dark background with logo --- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* base dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
        {/* vignette to darken edges */}
        <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_40%,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.85)_100%)]" />
        {/* centered logo, subtle & dark, fixed */}
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-contain bg-fixed opacity-8"
          style={{ backgroundImage: "url('/logo_transparent.png')" }}
        />
      </div>

      <main className="max-w-7xl mx-auto px-6 pt-8 pb-20 text-center">
        {/* HERO */}
        <h1 className="text-5xl font-extrabold tracking-tight">Welcome to ANFF 🏈</h1>
        <p className="text-lg text-gray-300 max-w-2xl mx-auto mt-2">
          The Armenian National Fantasy Football League — three leagues, one champion.
        </p>

        {/* Primary CTAs — cream buttons */}
        <div className="flex gap-3 flex-wrap justify-center mt-6">
          <Link
            href="/standings"
            className="px-6 py-3 rounded-xl font-semibold text-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 bg-[#D9D7B6] hover:bg-[#cfcdb3]"
          >
            View Standings
          </Link>
          <Link
            href="/teams"
            className="px-6 py-3 rounded-xl font-semibold text-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 bg-[#D9D7B6] hover:bg-[#cfcdb3]"
          >
            View Teams
          </Link>
          <Link
            href="/all-time"
            className="px-6 py-3 rounded-xl font-semibold text-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 bg-[#D9D7B6] hover:bg-[#cfcdb3]"
          >
            All-Time Leaders
          </Link>
        </div>

        {/* LEAGUE CARDS */}
        <section className="mt-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* A */}
            <div className={accentWrap('red')}>
              <div className="p-5">
                <h3 className="text-xl font-bold text-center">ANFF A League</h3>
                <p className="text-gray-400 text-center mb-4">Cream of the Crop</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Fact k="Teams" v="12" />
                  <Fact k="Playoff Seeds" v="1–7" />
                  <Fact k="Format" v="H2H 0.5 PPR" />
                  <Fact k="Relegation" v="10–12" />
                </div>
                <div className="mt-5 flex gap-2 justify-center">
                  <Link href="/standings?league=A" className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700">
                    Standings
                  </Link>
                  <Link href="/teams?league=A" className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700">
                    Teams
                  </Link>
                  <a
                    href={LEAGUE_URLS.A}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700"
                  >
                    League Site ↗
                  </a>
                </div>
              </div>
            </div>
            {/* B */}
            <div className={accentWrap('blue')}>
              <div className="p-5">
                <h3 className="text-xl font-bold text-center">ANFF B League</h3>
                <p className="text-gray-400 text-center mb-4">Grind it Out</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Fact k="Teams" v="12" />
                  <Fact k="Playoff Seeds" v="1–7" />
                  <Fact k="Format" v="H2H 0.5 PPR" />
                  <Fact k="Movement" v="Top and Bottom 3" />
                </div>
                <div className="mt-5 flex gap-2 justify-center">
                  <Link href="/standings?league=B" className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700">
                    Standings
                  </Link>
                  <Link href="/teams?league=B" className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700">
                    Teams
                  </Link>
                  <a
                    href={LEAGUE_URLS.B}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700"
                  >
                    League Site ↗
                  </a>
                </div>
              </div>
            </div>
            {/* C */}
            <div className={accentWrap('orange')}>
              <div className="p-5">
                <h3 className="text-xl font-bold text-center">ANFF C League</h3>
                <p className="text-gray-400 text-center mb-4">Develop and Advance</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Fact k="Teams" v="12" />
                  <Fact k="Playoff Seeds" v="1–7" />
                  <Fact k="Format" v="H2H 0.5 PPR" />
                  <Fact k="Promotion" v="Top 3" />
                </div>
                <div className="mt-5 flex gap-2 justify-center">
                  <Link href="/standings?league=C" className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600">
                    Standings
                  </Link>
                  <Link href="/teams?league=C" className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600">
                    Teams
                  </Link>
                  <a
                    href={LEAGUE_URLS.C}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600"
                  >
                    League Site ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">*Promotion &amp; relegation finalized after playoffs.</p>
        </section>

        {/* REVIEWS */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-4 text-center">League Soundbites 🎙️</h2>
          <TripleRotatingReviews />
        </section>

        {/* TOOLS */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 justify-items-center">
            <ToolCard title="Draft Center" desc="Top 300, draft grades, and the official order." href="/draft" />
            <ToolCard title="Trade Calculator" desc="Live rosters + ESPN projections with fairness score." href="/trade" />
            <ToolCard title="Waivers & Free Agents" desc="Available players, waiver status, and FantasyCalc values." href="/waivers" />
            <ToolCard title="Contact" desc="Questions or bugs? Contact the commish." href="/contact" />
            <ToolCard title="Rules" desc="Tiebreakers, waivers, playoffs, and the fine print." href="/rules" />
            <ToolCard title="Media" desc="Videos, graphics, game recaps, and memes." href="/media" />
          </div>
        </section>

        {/* COMMISSIONER’S CORNER */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-4 text-center">Commissioner’s Corner 🧠</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 justify-items-center">
            <div className="rounded-2xl border border-gray-800 bg-black/30 p-5 text-center w-full sm:w-[22rem]">
              <h3 className="font-semibold text-white">Weekly Note</h3>
              <p className="text-gray-300 mt-2">
                Welcome back! The season is live, waivers run Wednesday morning, and trades
                process after 24 hours. Pro tip: track PF/PA trends in your team page before
                making moves.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-black/30 p-5 text-center w-full sm:w-[22rem]">
              <h3 className="font-semibold text-white">Quick Links</h3>
              <ul className="mt-2 space-y-2 text-gray-300">
                <li><Link href="/all-time" className="hover:text-white">All-Time Leaders</Link></li>
                <li><Link href="/draft" className="hover:text-white">Draft Center</Link></li>
                <li><Link href="/trade" className="hover:text-white">Trade Calculator</Link></li>
                <li><Link href="/rules" className="hover:text-white">Rules</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact the Commissioner</Link></li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-black/30 p-5 text-center w-full sm:w-[22rem]">
              <h3 className="font-semibold text-white">News &amp; Notes</h3>
              <ul className="mt-2 space-y-2 text-sm text-gray-300">
                <li>• Waiver claims process Wed 8:00 AM local time.</li>
                <li>• Lineups lock at individual kickoff.</li>
                <li>• Trade deadline: Week 12 (Friday 5 PM PT).</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            <a
              href="https://www.fantasypros.com/nfl/adp/overall.php"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl border border-gray-800 bg-black/30 p-4 hover:bg-black/40 transition text-center"
            >
              <h3 className="font-semibold text-white mb-1">FantasyPros ADP</h3>
              <p className="text-sm text-gray-400">Consensus Average Draft Position</p>
            </a>
            <a
              href="https://www.reddit.com/r/fantasyfootball/"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl border border-gray-800 bg-black/30 p-4 hover:bg-black/40 transition text-center"
            >
              <h3 className="font-semibold text-white mb-1">r/fantasyfootball</h3>
              <p className="text-sm text-gray-400">News, start/sit, and memes</p>
            </a>
            <a
              href="https://www.espn.com/nfl/draft/rounds"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl border border-gray-800 bg-black/30 p-4 hover:bg-black/40 transition text-center"
            >
              <h3 className="font-semibold text-white mb-1">ESPN Draft Board</h3>
              <p className="text-sm text-gray-400">Round-by-round pick tracker</p>
            </a>
          </div>
        </section>

        {/* DONATIONS — added above newsletter */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-4 text-center">Support Armenia 🇦🇲</h2>
          <DonateGrid />
        </section>

        {/* NEWSLETTER */}
        <section className="mt-12 text-center w-full max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-2">📬 Stay Updated</h2>
          <p className="mb-4 text-gray-400">
            Sign up for league updates, memes, and trash talk delivered weekly.
          </p>
          <form
            action="https://buttondown.email/api/emails/embed-subscribe/anff"
            method="post"
            target="popupwindow"
            className="flex flex-col sm:flex-row justify-center gap-2"
          >
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="px-4 py-2 rounded-xl bg-gray-800 text-white border border-gray-700 focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="px-6 py-2 rounded-xl font-semibold text-black transition bg-[#D9D7B6] hover:bg-[#cfcdb3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            >
              Subscribe
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

/* ---------------- Small components ---------------- */

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-black/25 p-3 text-center">
      <div className="text-xs uppercase tracking-wide text-gray-400">{k}</div>
      <div className="text-base font-semibold mt-0.5">{v}</div>
    </div>
  );
}

function ToolCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-800 bg-black/25 hover:bg-black/30 transition p-5 w-full sm:w-[22rem] text-center"
    >
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-300 mt-1">{desc}</p>
      <div className="mt-3 text-blue-400 text-sm group-hover:text-blue-300">Open →</div>
    </Link>
  );
}

/* External donate grid */
function DonateGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 justify-items-center">
      {DONATE_LINKS.map((d) => (
        <a
          key={d.href}
          href={d.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full sm:w-[22rem] rounded-2xl border border-gray-800 bg-black/30 p-5 hover:bg-black/40 transition text-center"
        >
          <h3 className="font-semibold text-white">{d.title}</h3>
          <div className="mt-2 text-blue-400 text-sm">Donate ↗</div>
        </a>
      ))}
    </div>
  );
}

/* ---------------- 3-up Infinite Carousel (smooth) ---------------- */

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

function TripleRotatingReviews() {
  const [visible, setVisible] = useState(4); // show 4 on xl+
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      // xl and up: 4, lg: 3, sm/md: 2, xs: 1
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
    const id = setInterval(() => advance(1), 3000);
    return () => clearInterval(id);
  }, [paused]);

  const advance = (dir: number) => {
    setTransitioning(true);
    setIndex((i) => i + dir);
  };

  const handleTransitionEnd = () => {
    const i = index;
    if (i >= base + base) {
      setTransitioning(false);
      setIndex(i - base);
    } else if (i < base) {
      setTransitioning(false);
      setIndex(i + base);
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
              <span className="text-4xl leading-none text-white/80" aria-hidden>“</span>
              <blockquote className="mt-2 text-lg text-white/90">{q.quote}</blockquote>
              <figcaption className="mt-3 text-sm text-gray-400">— {q.name}</figcaption>
            </div>
          </figure>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          onClick={() => advance(-1)}
          className="px-3 py-1.5 rounded-lg border border-gray-800 bg-black/40 hover:bg-white/5 text-sm"
          aria-label="Previous"
        >
          ← Prev
        </button>

        <Dots
          total={base}
          index={((index - base) % base + base) % base}
          onDot={(i) => {
            const current = ((index - base) % base + base) % base;
            const diff = i - current;
            if (diff === 0) return;
            const step = diff > 0 ? 1 : -1;
            advance(step);
            if (Math.abs(diff) > 1) {
              setTimeout(function chain() {
                advance(step);
              }, 160);
            }
          }}
        />

        <button
          onClick={() => advance(1)}
          className="px-3 py-1.5 rounded-lg border border-gray-800 bg-black/40 hover:bg-white/5 text-sm"
          aria-label="Next"
        >
          Next →
        </button>
      </div>
    </div>
  );
}


function Dots({
  total,
  index,
  onDot,
}: {
  total: number;
  index: number;
  onDot: (i: number) => void;
}) {
  return (
    <div className="flex gap-2" role="tablist" aria-label="Review slides">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          role="tab"
          aria-selected={i === index}
          onClick={() => onDot(i)}
          className={[
            'h-1.5 rounded-full transition-all',
            i === index ? 'w-6 bg-white' : 'w-2.5 bg-gray-600 hover:bg-gray-400',
          ].join(' ')}
          aria-label={`Go to reviews set ${i + 1}`}
        />
      ))}
    </div>
  );
}

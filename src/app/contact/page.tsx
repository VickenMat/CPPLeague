/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';

type Status = 'idle' | 'sending' | 'success' | 'error';

const INPUT =
  'w-full px-4 py-2 rounded-xl bg-black/40 text-white border border-gray-800 outline-none focus:ring-2 focus:ring-purple-500';
const LABEL = 'block text-sm mb-1 text-gray-300';
const CARD = 'rounded-2xl border border-gray-800 bg-black/20 p-5';

// Cream button style (shared)
const BTN_CREAM_BASE =
  'rounded-xl font-semibold text-black bg-[#D9D7B6] hover:bg-[#cfcdb3] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ' +
  'disabled:opacity-8 disabled:cursor-not-allowed';

const DONATE_LINKS = [
  { title: 'Armenia Fund', href: 'https://www.armeniafund.org/' },
  { title: 'AYF (Armenian Youth Federation)', href: 'https://ayf.org/' },
  { title: 'ARS (Armenian Relief Society)', href: 'https://ars1910.org/' },
  { title: 'Hidden Road Initiative', href: 'https://www.hiddenroadinitiative.org/' },
  { title: 'Zinapah (Soldiers’ Insurance)', href: 'https://www.zinapah.am/en/' },
  { title: 'ANCA – Ways to Donate', href: 'https://anca.org/ways-to-donate/' },
];

export default function ContactPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    league: 'A',
    subject: '',
    topic: 'General',
    priority: 'Normal',
    message: '',
    company: '',
  });

  const remaining = useMemo(() => Math.max(0, 1000 - charCount), [charCount]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setStatus('sending');
      setErrMsg(null);

      if (formData.company) {
        setStatus('success');
        return;
      }

      try {
        const res = await fetch('https://formspree.io/f/xanbprky', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(e.currentTarget),
        });

        const json = await res.json().catch(() => ({} as any));
        if (res.ok && (json?.ok ?? true)) {
          setStatus('success');
          setFormData({
            name: '',
            email: '',
            league: 'A',
            subject: '',
            topic: 'General',
            priority: 'Normal',
            message: '',
            company: '',
          });
          setCharCount(0);
        } else {
          setStatus('error');
          setErrMsg(
            (json?.errors && Array.isArray(json.errors) && json.errors[0]?.message) ||
              json?.message ||
              'Something went wrong. Please try again.'
          );
        }
      } catch (err: any) {
        setStatus('error');
        setErrMsg(err?.message || 'Network error. Please try again.');
      }
    },
    [formData.company]
  );

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText('commissioner@anff.example');
      alert('Email copied to clipboard.');
    } catch {
      /* no-op */
    }
  }, []);

  return (
    <div className="min-h-screen relative text-white overflow-hidden">
      {/* Fixed, faint background logo at opacity 8 */}
      <img
        src="/logo_transparent.png"
        alt="ANFF watermark"
        className="fixed inset-0 w-full h-full object-contain opacity-8 pointer-events-none select-none"
        style={{ objectPosition: 'center' }}
      />

      {/* Page content */}
      <div className="relative max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold">Contact the ANFF</h1>
          <p className="text-gray-300 mt-2">Questions, bugs, or beef?</p>
        </header>

        {/* Top row: About + Quick info */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className={`md:col-span-2 ${CARD}`}>
            <h2 className="text-xl font-bold mb-2">About the ANFF</h2>
            <p className="text-gray-300">
              The Armenian National Fantasy Football League is a three-tier setup (A, B, C) with
              promotion, relegation, and weekly chaos. Built for competitiveness & fun
            </p>
            <p className="text-gray-400 mt-3">
              Commissioner: <span className="font-semibold">Vicken Matiossian</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Link href="/rules" className="text-blue-400 hover:text-blue-300">
                Rules
              </Link>
              <span className="text-gray-600">•</span>
              <Link href="/standings" className="text-blue-400 hover:text-blue-300">
                Standings
              </Link>
              <span className="text-gray-600">•</span>
              <Link href="/teams" className="text-blue-400 hover:text-blue-300">
                Teams
              </Link>
              <span className="text-gray-600">•</span>
            </div>
          </div>

          <div className={CARD}>
            <h3 className="text-lg font-semibold mb-2">Quick Info</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>⏱️ Response time: 5-10 minutes</li>
              <li>📅 Office hour: Mon–Fri 7 AM-11 PM EST</li>
              <li>
                📧 Email: <span className="font-mono">playanffleague@gmail.com</span>
              </li>
            </ul>
            <div className="mt-3 flex gap-2">
              <button onClick={copyEmail} className={`px-3 py-1.5 ${BTN_CREAM_BASE}`}>
                Copy email
              </button>
              <a href="mailto:commissioner@anff.example" className={`px-3 py-1.5 ${BTN_CREAM_BASE}`}>
                Open mail app
              </a>
            </div>
          </div>
        </section>

        {/* Contact form */}
        <section className={`${CARD} mb-10`}>
          <h2 className="text-2xl font-bold mb-6 text-center">Send a Message</h2>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* honeypot */}
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              value={formData.company}
              onChange={(e) => setFormData((d) => ({ ...d, company: e.target.value }))}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                  className={INPUT}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className={LABEL}>Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((d) => ({ ...d, email: e.target.value }))}
                  className={INPUT}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={LABEL}>League</label>
                <select
                  name="league"
                  value={formData.league}
                  onChange={(e) => setFormData((d) => ({ ...d, league: e.target.value }))}
                  className={INPUT}
                >
                  <option value="A">ANFF A</option>
                  <option value="B">ANFF B</option>
                  <option value="C">ANFF C</option>
                </select>
              </div>

              <div>
                <label className={LABEL}>Topic</label>
                <select
                  name="topic"
                  value={formData.topic}
                  onChange={(e) => setFormData((d) => ({ ...d, topic: e.target.value }))}
                  className={INPUT}
                >
                  <option>General</option>
                  <option>Rules</option>
                  <option>Website bug</option>
                  <option>Trade dispute</option>
                  <option>Media/Press</option>
                </select>
              </div>

              <div>
                <label className={LABEL}>Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData((d) => ({ ...d, priority: e.target.value }))}
                  className={INPUT}
                >
                  <option>Normal</option>
                  <option>Low</option>
                  <option>High</option>
                </select>
              </div>
            </div>

            <div>
              <label className={LABEL}>Subject</label>
              <input
                type="text"
                name="subject"
                required
                value={formData.subject}
                onChange={(e) => setFormData((d) => ({ ...d, subject: e.target.value }))}
                className={INPUT}
                placeholder="Quick summary…"
              />
            </div>

            <div>
              <label className={LABEL}>Message</label>
              <textarea
                name="message"
                required
                rows={6}
                maxLength={1000}
                value={formData.message}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((d) => ({ ...d, message: v }));
                  setCharCount(v.length);
                }}
                className={INPUT}
                placeholder="What's up?"
              />
              <div className="mt-1 text-xs text-gray-400 text-right">{remaining} characters left</div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-300">
              <input id="consent" type="checkbox" required className="h-4 w-4 rounded border-gray-700 bg-black/40" />
              <label htmlFor="consent">
                I consent to ANFF storing this message for league administration purposes.
              </label>
            </div>

            <button
              type="submit"
              className={`w-full px-6 py-3 ${BTN_CREAM_BASE}`}
              disabled={status === 'sending'}
            >
              {status === 'sending' ? 'Sending…' : 'Send Message'}
            </button>

            <div role="status" aria-live="polite" className="text-center">
              {status === 'success' && (
                <p className="text-green-400 font-semibold">✅ Your message has been sent!</p>
              )}
              {status === 'error' && (
                <p className="text-red-400 font-semibold">
                  ❌ {errMsg || 'Something went wrong. Try again.'}
                </p>
              )}
            </div>
          </form>
        </section>

        {/* FAQ / Help */}
        <section className={`mb-6 ${CARD}`}>
          <h3 className="text-xl font-bold mb-4 text-center">FAQ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Faq q="How fast do you reply?" a="Most messages are answered within 5-10 minutes during the season." />
            <Faq
              q="Where do I file a rules question?"
              a={
                <>
                  Use the Topic dropdown &ldquo;Rules&rdquo; here, or read the{' '}
                  <Link href="/rules" className="text-blue-400 hover:text-blue-300">
                    Rules page
                  </Link>
                  .
                </>
              }
            />
            <Faq q="Trade dispute?" a="Choose Topic → Trade dispute and add the full context (teams, players, week)." />
            <Faq
              q="Found a bug?"
              a={<>Select Topic → Website bug and include your browser + screenshots if possible.</>}
            />
          </div>
        </section>

        {/* Donations — directly below FAQ */}
        <section className={`mb-16 ${CARD}`}>
          <h3 className="text-xl font-bold mb-4 text-center">Support Armenia 🇦🇲</h3>
          <DonateGrid />
        </section>

        <p className="text-center text-xs text-gray-500">
          Powered by Formspree • This site does not store sensitive information in this form.
        </p>
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <details className="rounded-xl border border-gray-800 bg-black/20 p-4">
      <summary className="cursor-pointer select-none font-semibold">{q}</summary>
      <div className="text-gray-300 mt-2">{a}</div>
    </details>
  );
}

function DonateGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
      {DONATE_LINKS.map((d) => (
        <a
          key={d.href}
          href={d.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full sm:w-[22rem] rounded-2xl border border-gray-800 bg-black/30 p-4 hover:bg-black/40 transition text-center"
        >
          <h4 className="font-semibold text-white">{d.title}</h4>
          <div className="mt-2 text-blue-400 text-sm">Donate ↗</div>
        </a>
      ))}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

export default function FloatingDock({ visible }: { visible: boolean }) {
  const [show, setShow] = useState(visible);
  useEffect(() => setShow(visible), [visible]);

  const items = [
    { href: '/leagues', label: 'Leagues', emoji: '🏆' },
    { href: '/teams', label: 'Teams', emoji: '⚡' },
    { href: '/standings', label: 'Standings', emoji: '📊' },
    { href: '/draft', label: 'Draft', emoji: '📝' },
    { href: '/all-time', label: 'All-Time', emoji: '⏱️' },
    { href: '/rules', label: 'Rules', emoji: '📖' },
    { href: '/media', label: 'Media', emoji: '🎥' },
    { href: '/contact', label: 'Contact', emoji: '✉️' },
  ];

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 bottom-4 z-40 transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
      }`}
      aria-hidden={!show}
    >
      <nav className="rounded-2xl border border-gray-800/70 bg-black/60 backdrop-blur-xl px-2 py-2 shadow-2xl">
        <ul className="flex items-center gap-1">
          {items.map((it) => (
            <li key={it.href}>
              <a
                href={it.href}
                className="px-3 py-2 rounded-xl hover:bg-white/10 text-gray-200 text-sm flex items-center gap-1"
                aria-label={it.label}
              >
                <span>{it.emoji}</span>
                <span className="hidden sm:inline">{it.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import FloatingDock from './FloatingDock';

const links = [
  { href: '/leagues', label: 'Leagues' },
  { href: '/teams', label: 'Teams' },
  { href: '/standings', label: 'Standings' },
  { href: '/draft', label: 'Draft' },
  { href: '/all-time', label: 'All-Time' },
  { href: '/rules', label: 'Rules' },
  { href: '/media', label: 'Media' },
  { href: '/contact', label: 'Contact' },
];

// brand hover palette
const HOVER_COLORS = ['#ef4444', '#6086faff', '#fb923c']; // red-500, blue-400, orange-400

export default function Header() {
  const [pastHeader, setPastHeader] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHeader(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b border-gray-800/70 backdrop-blur supports-[backdrop-filter]:bg-black/35 transition-transform duration-300 ${
          pastHeader ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="max-w-7xl mx-auto h-16 px-4 flex items-center lg:justify-between justify-center">
          {/* Brand */}
          <Link href="/" className="font-extrabold text-2xl tracking-tight select-none">
            <span className="bg-gradient-to-r from-red-500 via-blue-500 to-orange-400 bg-clip-text text-transparent">
              ANFF
            </span>
          </Link>

          {/* NOTE: class 'site-nav' lets globals.css keep visited links gray */}
          <nav className="site-nav hidden lg:flex items-center gap-6 text-sm">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <FloatingDock visible={pastHeader} />
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [hoverColor, setHoverColor] = useState<string | null>(null);

  const pick = () => HOVER_COLORS[(Math.random() * HOVER_COLORS.length) | 0];

  return (
    <a
      href={href}
      onMouseEnter={() => setHoverColor(pick())}
      onMouseLeave={() => setHoverColor(null)}
      className={[
        'px-1 pb-1 transition-colors duration-150',
        'text-gray-200',                // base gray
        'border-b-2 border-transparent' // underline adopts hover color
      ].join(' ')}
      // inline style overrides any default/visited color
      style={hoverColor ? { color: hoverColor, borderColor: hoverColor } : undefined}
    >
      {children}
    </a>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const LINKS = [
  { href: '/leagues', label: 'Leagues' },
  { href: '/teams', label: 'Teams' },
  { href: '/standings', label: 'Standings' },
  { href: '/all-time', label: 'All-Time' },
  { href: '/draft', label: 'Draft' },
  { href: '/keeper', label: 'Keeper' },
  { href: '/trade', label: 'Trade' },
  { href: '/waivers', label: 'Waivers' },
  { href: '/rules', label: 'Rules' },
  { href: '/media', label: 'Media' },
  { href: '/contact', label: 'Contact' },
];

const BRAND_COLORS = ['#ef4444', '#60a5fa', '#fb923c']; // red-500, blue-400, orange-400
const TOP_THRESHOLD = 8;
const SCROLL_DELTA = 3;

export default function SiteHeader() {
  const pathname = usePathname();
  const [headerHidden, setHeaderHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastY = useRef(0);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      if (y <= TOP_THRESHOLD) setHeaderHidden(false);
      else if (dy > SCROLL_DELTA) setHeaderHidden(true);
      else if (dy < -SCROLL_DELTA) setHeaderHidden(false);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 bg-black/50 backdrop-blur-md border-b border-gray-800 shadow-md transition-transform duration-300 ${
          headerHidden ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="max-w-7xl mx-auto h-16 px-3 sm:px-4 flex items-center justify-between">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-800 bg-black/40 hover:bg-white/5 transition"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <span aria-hidden className="flex flex-col items-center justify-center gap-1.5">
              <span className="block w-6 h-0.5 bg-gray-200 rounded" />
              <span className="block w-6 h-0.5 bg-gray-200 rounded" />
              <span className="block w-6 h-0.5 bg-gray-200 rounded" />
            </span>
          </button>

          {/* Brand (logo) */}
          <Link
            href="/"
            aria-label="ANFF Home"
            className="mx-auto lg:mx-0 inline-flex items-center"
          >
            <Image
              src="/logo_transparent.png"
              alt="ANFF"
              width={120}
              height={36}
              priority
              className="h-9 w-auto"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-2 xl:gap-4 text-base font-semibold">
            {LINKS.map((l) => (
              <NavItem key={l.href} href={l.href} label={l.label} active={isActive(l.href)} />
            ))}
          </nav>

          {/* spacer for brand centering on mobile */}
          <div className="w-10 h-10 lg:hidden" />
        </div>
      </header>

      {/* MOBILE SHEET */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 transition-opacity ${mobileOpen ? 'opacity-100 bg-black/60' : 'opacity-0'}`}
        />
        <aside
          className={`absolute top-0 left-0 h-full w-72 max-w-[80vw] bg-gray-950/95 border-r border-gray-800 shadow-2xl transform transition-transform duration-300 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-16 px-4 flex items-center justify-between border-b border-gray-800">
            <Link
              href="/"
              aria-label="ANFF Home"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center"
            >
              <Image
                src="/logo_transparent.png"
                alt="ANFF"
                width={110}
                height={34}
                className="h-8 w-auto"
              />
            </Link>
            <button
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-800 bg-black/40 hover:bg-white/5 transition"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <span className="sr-only">Close</span>
              <span className="block w-4 h-0.5 bg-gray-300 rotate-45 translate-y-[1px]" />
              <span className="block w-4 h-0.5 bg-gray-300 -rotate-45 -translate-y-[1px]" />
            </button>
          </div>

          <nav className="px-3 py-3">
            <ul className="space-y-1">
              {LINKS.map((l) => (
                <li key={`mobile-${l.href}`}>
                  <MobileNavItem
                    href={l.href}
                    label={l.label}
                    active={isActive(l.href)}
                    onClick={() => setMobileOpen(false)}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </>
  );
}

/* ——— helpers ——— */
function pickBrandColor() {
  return BRAND_COLORS[(Math.random() * BRAND_COLORS.length) | 0];
}

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHoverColor(pickBrandColor())}
      onMouseLeave={() => setHoverColor(null)}
      className={['px-2 py-1 rounded-md transition-colors duration-150', active ? 'text-white' : 'text-gray-300'].join(' ')}
      style={hoverColor ? { color: hoverColor } : undefined}
    >
      {label}
    </Link>
  );
}

function MobileNavItem({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  return (
    <Link
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHoverColor(pickBrandColor())}
      onMouseLeave={() => setHoverColor(null)}
      className={[
        'block px-3 py-2 rounded-lg text-base font-medium transition-colors',
        active ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5',
      ].join(' ')}
      style={hoverColor ? { color: hoverColor } : undefined}
    >
      {label}
    </Link>
  );
}

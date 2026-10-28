import type { Metadata } from 'next';
import './globals.css';
import SiteHeader from './components/SiteHeader';
import { Analytics } from '@vercel/analytics/react';  // 👈 import here

export const metadata: Metadata = {
  title: { default: 'ANFF', template: '%s • ANFF' },
  description: 'Armenian National Fantasy Football League',
  openGraph: { siteName: 'ANFF', title: 'ANFF', description: 'Armenian National Fantasy Football League' },
  twitter: { card: 'summary_large_image', title: 'ANFF', description: 'Armenian National Fantasy Football League' },
  // No icons block needed because we're using file-based icons in /app
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="mask-icon" href="/mask-icon.svg" color="#ef4444" />
      </head>
      <body className="bg-black text-white min-h-screen">
        <SiteHeader />
        <main>{children}</main>
        <Analytics /> {/* 👈 Add Analytics here so it runs on every page */}
      </body>
    </html>
  );
}




// 'use client';

// import Link from 'next/link';
// import { usePathname } from 'next/navigation';
// import { useEffect, useRef, useState } from 'react';
// import './globals.css';

// const LINKS = [
//   { href: '/leagues', label: 'Leagues' },
//   { href: '/teams', label: 'Teams' },
//   { href: '/standings', label: 'Standings' },
//   { href: '/all-time', label: 'All-Time' },
//   { href: '/draft', label: 'Draft' },
//   { href: '/trade', label: 'Trade' },
//   { href: '/rules', label: 'Rules' },
//   { href: '/media', label: 'Media' },
//   { href: '/contact', label: 'Contact' },
// ];

// const BRAND_COLORS = ['#ef4444', '#60a5fa', '#fb923c']; // red-500, blue-400, orange-400
// const TOP_THRESHOLD = 8;
// const SCROLL_DELTA = 3;

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   const pathname = usePathname();
//   const [headerHidden, setHeaderHidden] = useState(false);
//   const [mobileOpen, setMobileOpen] = useState(false);
//   const lastY = useRef(0);

//   const isActive = (href: string) =>
//     href === '/' ? pathname === '/' : pathname.startsWith(href);

//   useEffect(() => {
//     lastY.current = window.scrollY;
//     const onScroll = () => {
//       const y = window.scrollY;
//       const dy = y - lastY.current;
//       if (y <= TOP_THRESHOLD) setHeaderHidden(false);
//       else if (dy > SCROLL_DELTA) setHeaderHidden(true);
//       else if (dy < -SCROLL_DELTA) setHeaderHidden(false);
//       lastY.current = y;
//     };
//     window.addEventListener('scroll', onScroll, { passive: true });
//     onScroll();
//     return () => window.removeEventListener('scroll', onScroll);
//   }, []);

//   useEffect(() => setMobileOpen(false), [pathname]);

//   return (
//     <html lang="en">
//       <body>
//         <div className="bg-black text-white min-h-screen transition-colors duration-300">
//           <header
//             className={`sticky top-0 z-50 bg-black/50 backdrop-blur-md border-b border-gray-800 shadow-md transition-transform duration-300 ${
//               headerHidden ? '-translate-y-full' : 'translate-y-0'
//             }`}
//           >
//             <div className="max-w-7xl mx-auto h-16 px-3 sm:px-4 flex items-center justify-between">
//               {/* Mobile hamburger */}
//               <button
//                 className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-800 bg-black/40 hover:bg-white/5 transition"
//                 aria-label="Open menu"
//                 onClick={() => setMobileOpen(true)}
//               >
//                 <span aria-hidden className="flex flex-col items-center justify-center gap-1.5">
//                   <span className="block w-6 h-0.5 bg-gray-200 rounded" />
//                   <span className="block w-6 h-0.5 bg-gray-200 rounded" />
//                   <span className="block w-6 h-0.5 bg-gray-200 rounded" />
//                 </span>
//               </button>

//               {/* Brand */}
//               <Link
//                 href="/"
//                 className="text-3xl font-extrabold tracking-wide select-none hover:opacity-90 transition mx-auto lg:mx-0"
//                 aria-label="ANFF Home"
//               >
//                 <span className="bg-gradient-to-r from-red-500 via-blue-500 to-orange-400 bg-clip-text text-transparent">
//                   ANFF
//                 </span>
//               </Link>

//               {/* Desktop nav (random hover color; NO underline) */}
//               <nav className="site-nav hidden lg:flex items-center gap-6 text-lg font-semibold">
//                 {LINKS.map((l) => (
//                   <NavItem key={l.href} href={l.href} label={l.label} active={isActive(l.href)} />
//                 ))}
//               </nav>

//               {/* spacer for brand centering on mobile */}
//               <div className="w-10 h-10 lg:hidden" />
//             </div>
//           </header>

//           {/* MOBILE SHEET */}
//           <div
//             className={`fixed inset-0 z-50 lg:hidden ${
//               mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'
//             }`}
//             aria-hidden={!mobileOpen}
//           >
//             <div
//               onClick={() => setMobileOpen(false)}
//               className={`absolute inset-0 transition-opacity ${
//                 mobileOpen ? 'opacity-100 bg-black/60' : 'opacity-0'
//               }`}
//             />
//             <aside
//               className={`absolute top-0 left-0 h-full w-72 max-w-[80vw] bg-gray-950/95 border-r border-gray-800 shadow-2xl transform transition-transform duration-300 ${
//                 mobileOpen ? 'translate-x-0' : '-translate-x-full'
//               }`}
//             >
//               <div className="h-16 px-4 flex items-center justify-between border-b border-gray-800">
//                 <Link
//                   href="/"
//                   aria-label="ANFF Home"
//                   onClick={() => setMobileOpen(false)}
//                   className="text-xl font-bold"
//                 >
//                   <span className="bg-gradient-to-r from-red-500 via-blue-500 to-orange-400 bg-clip-text text-transparent">
//                     ANFF
//                   </span>
//                 </Link>
//                 <button
//                   className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-800 bg-black/40 hover:bg-white/5 transition"
//                   aria-label="Close menu"
//                   onClick={() => setMobileOpen(false)}
//                 >
//                   <span className="sr-only">Close</span>
//                   <span className="block w-4 h-0.5 bg-gray-300 rotate-45 translate-y-[1px]" />
//                   <span className="block w-4 h-0.5 bg-gray-300 -rotate-45 -translate-y-[1px]" />
//                 </button>
//               </div>

//               {/* make visited gray + random hover color via inline styles */}
//               <nav className="mobile-nav px-3 py-3">
//                 <ul className="space-y-1">
//                   {LINKS.map((l) => (
//                     <li key={`mobile-${l.href}`}>
//                       <MobileNavItem
//                         href={l.href}
//                         label={l.label}
//                         active={isActive(l.href)}
//                         onClick={() => setMobileOpen(false)}
//                       />
//                     </li>
//                   ))}
//                 </ul>
//               </nav>
//             </aside>
//           </div>

//           <main className="p-6">{children}</main>
//         </div>
//       </body>
//     </html>
//   );
// }

// /* ===== Shared helpers ===== */
// function pickBrandColor() {
//   return BRAND_COLORS[(Math.random() * BRAND_COLORS.length) | 0];
// }

// /* Desktop item (no underline, random hover color) */
// function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
//   const [hoverColor, setHoverColor] = useState<string | null>(null);
//   return (
//     <Link
//       href={href}
//       onMouseEnter={() => setHoverColor(pickBrandColor())}
//       onMouseLeave={() => setHoverColor(null)}
//       className={[
//         'px-2 py-1 rounded-md transition-colors duration-150',
//         active ? 'text-white' : 'text-gray-300',
//       ].join(' ')}
//       style={hoverColor ? { color: hoverColor } : undefined}
//     >
//       {label}
//     </Link>
//   );
// }

// /* Mobile sheet item (same random color behavior) */
// function MobileNavItem({
//   href,
//   label,
//   active,
//   onClick,
// }: {
//   href: string;
//   label: string;
//   active: boolean;
//   onClick: () => void;
// }) {
//   const [hoverColor, setHoverColor] = useState<string | null>(null);
//   return (
//     <Link
//       href={href}
//       onClick={onClick}
//       onMouseEnter={() => setHoverColor(pickBrandColor())}
//       onMouseLeave={() => setHoverColor(null)}
//       className={[
//         'block px-3 py-2 rounded-lg text-base font-medium transition-colors',
//         active ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5',
//       ].join(' ')}
//       style={hoverColor ? { color: hoverColor } : undefined}
//     >
//       {label}
//     </Link>
//   );
// }

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "/leagues", label: "League" },
  { href: "/teams", label: "Teams" },
  { href: "/standings", label: "Standings" },
  { href: "/all-time", label: "All-Time" },
  { href: "/draft", label: "Draft" },
  { href: "/trade", label: "Trade" },
  { href: "/waivers", label: "Waivers" },
  { href: "/rules", label: "Rules" },
  { href: "/media", label: "Media" },
  { href: "/contact", label: "Contact" },
];

const HOVER_COLOR = "#A4D65E";
const TOP_THRESHOLD = 8;
const SCROLL_DELTA = 3;

export default function SiteHeader() {
  const pathname = usePathname();
  const [headerHidden, setHeaderHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastY = useRef(0);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

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
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const menu = menuRef.current;
    const menuButton = menuButtonRef.current;
    const focusable = () =>
      Array.from(
        menu?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        ) || [],
      );
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
      }
      if (event.key !== "Tab") return;
      const items = focusable(),
        first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      menuButton?.focus();
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 bg-black/50 backdrop-blur-md border-b border-gray-800 shadow-md transition-transform duration-300 ${
          headerHidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="max-w-7xl mx-auto h-16 px-3 sm:px-4 flex items-center justify-between">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-800 bg-black/40 hover:bg-white/5 transition"
            ref={menuButtonRef}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileOpen(true)}
          >
            <span
              aria-hidden
              className="flex flex-col items-center justify-center gap-1.5"
            >
              <span className="block w-6 h-0.5 bg-gray-200 rounded" />
              <span className="block w-6 h-0.5 bg-gray-200 rounded" />
              <span className="block w-6 h-0.5 bg-gray-200 rounded" />
            </span>
          </button>

          {/* Brand (logo) */}
          <Link
            href="/"
            aria-label="CPP Fantasy Football home"
            className="mx-auto lg:mx-0 inline-flex items-center"
          >
            <Image
              src="/cppleague_logo.png"
              alt="CPP League"
              width={84}
              height={56}
              priority
              className="h-14 w-auto object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-2 xl:gap-4 text-base font-semibold">
            {LINKS.map((l) => (
              <NavItem
                key={l.href}
                href={l.href}
                label={l.label}
                active={isActive(l.href)}
              />
            ))}
          </nav>

          {/* spacer for brand centering on mobile */}
          <div className="w-10 h-10 lg:hidden" />
        </div>
      </header>

      {/* MOBILE SHEET */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <div
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 transition-opacity ${mobileOpen ? "opacity-100 bg-black/60" : "opacity-0"}`}
        />
        <aside
          id="mobile-navigation"
          ref={menuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className={`absolute top-0 left-0 h-full w-72 max-w-[80vw] bg-gray-950/95 border-r border-gray-800 shadow-2xl transform transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-16 px-4 flex items-center justify-between border-b border-gray-800">
            <Link
              href="/"
              aria-label="CPP Fantasy Football home"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center"
            >
              <Image
                src="/cppleague_logo.png"
                alt="CPP League"
                width={72}
                height={48}
                className="h-12 w-auto object-contain"
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
function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onMouseEnter={() => setHoverColor(HOVER_COLOR)}
      onMouseLeave={() => setHoverColor(null)}
      className={[
        "px-2 py-1 rounded-md transition-colors duration-150",
        active ? "text-white" : "text-gray-300",
      ].join(" ")}
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
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      onMouseEnter={() => setHoverColor(HOVER_COLOR)}
      onMouseLeave={() => setHoverColor(null)}
      className={[
        "block px-3 py-2 rounded-lg text-base font-medium transition-colors",
        active ? "bg-white/10 text-white" : "text-gray-300 hover:bg-white/5",
      ].join(" ")}
      style={hoverColor ? { color: hoverColor } : undefined}
    >
      {label}
    </Link>
  );
}

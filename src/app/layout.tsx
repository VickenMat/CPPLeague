import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: {
    default: "CPP Fantasy Football",
    template: "%s • CPP Fantasy Football",
  },
  description: "Teams, standings, history, and tools for CPP Fantasy Football.",
  openGraph: {
    siteName: "CPP Fantasy Football",
    title: "CPP Fantasy Football",
    description: "Your league in one place.",
  },
  twitter: {
    card: "summary",
    title: "CPP Fantasy Football",
    description: "Your league in one place.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <div aria-hidden="true" className="site-background" />
        <SiteHeader />
        <main>{children}</main>
        <Analytics />
      </body>
    </html>
  );
}

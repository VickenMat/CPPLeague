import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    const development = process.env.NODE_ENV === "development";
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: https:",
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      `script-src 'self' 'unsafe-inline' ${development ? "'unsafe-eval' " : ""}https://va.vercel-scripts.com`,
      `connect-src 'self' ${development ? "ws: wss: " : ""}https://vitals.vercel-insights.com https://va.vercel-scripts.com`,
      "upgrade-insecure-requests",
    ].join("; ");
    const pdfCsp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "img-src 'self' data: https:",
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      `script-src 'self' 'unsafe-inline' ${development ? "'unsafe-eval' " : ""}https://va.vercel-scripts.com`,
      `connect-src 'self' ${development ? "ws: wss: " : ""}https://vitals.vercel-insights.com https://va.vercel-scripts.com`,
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/positional_top300_2026.pdf",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: pdfCsp },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

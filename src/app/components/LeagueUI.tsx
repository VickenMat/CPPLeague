import type { ReactNode } from "react";

export const CREAM_BUTTON =
  "inline-flex items-center justify-center rounded-xl border border-[#FFB81C] bg-[#FFB81C] px-5 py-2.5 font-semibold text-black transition hover:border-[#A4D65E] hover:bg-[#A4D65E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB81C] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950";
export type Accent = "red" | "blue" | "orange";
const ACCENTS: Record<Accent, string> = {
  red: "ring-[#005030]/70 before:bg-[#005030]",
  blue: "ring-[#A4D65E]/70 before:bg-[#A4D65E]",
  orange: "ring-[#FFB81C]/70 before:bg-[#FFB81C]",
};

export function PageShell({
  children,
  title,
  subtitle,
  width = "max-w-7xl",
}: {
  children: ReactNode;
  title: string;
  subtitle?: ReactNode;
  width?: string;
}) {
  return (
    <div className={`relative mx-auto ${width} px-4 py-10 sm:px-6`}>
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <div className="mx-auto mt-3 max-w-3xl text-gray-300">{subtitle}</div>
        )}
      </header>
      {children}
    </div>
  );
}

export function AccentPanel({
  children,
  tone = "red",
  className = "",
}: {
  children: ReactNode;
  tone?: Accent;
  className?: string;
}) {
  return (
    <section
      className={`relative rounded-2xl border border-[#005030] bg-black/30 p-5 shadow-lg ring-1 before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:rounded-t-2xl before:content-[''] sm:p-6 ${ACCENTS[tone]} ${className}`}
    >
      {children}
    </section>
  );
}

export function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800/60 bg-black/30 p-4 text-center">
      <div className="text-xs uppercase tracking-wide text-gray-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-gray-700 bg-black/20 px-5 py-8 text-center text-gray-400">
      {children}
    </p>
  );
}

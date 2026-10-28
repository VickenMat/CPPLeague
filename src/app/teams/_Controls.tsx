"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  initialQ: string;
  initialSort: "name" | "person" | "abbrev";
  showIds?: boolean;
};

export default function TeamsControls({
  initialQ,
  initialSort,
  showIds,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(initialQ ?? "");
  const [sort, setSort] = useState<"name" | "person" | "abbrev">(
    initialSort ?? "name",
  );

  // Helper to push updated querystring without scrolling to top
  const pushParams = (
    nextQ: string,
    nextSort: "name" | "person" | "abbrev",
  ) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (nextQ) params.set("q", nextQ);
    else params.delete("q");
    params.set("sort", nextSort);
    params.delete("leagueId");
    params.delete("league");
    params.delete("key");
    if (showIds) params.set("showIds", "1");
    else params.delete("showIds");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Debounce typing a bit so we don’t spam navigations
  useEffect(() => {
    if (q === initialQ && sort === initialSort) return;
    const t = setTimeout(() => pushParams(q, sort), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort]);

  return (
    <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search teams or people"
        maxLength={100}
        placeholder="Search teams or people…"
        className="w-full sm:w-[420px] rounded-xl bg-black/40 border border-gray-800 px-4 py-2
                   outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        aria-label="Sort teams"
        value={sort}
        onChange={(e) =>
          setSort(e.target.value as "name" | "person" | "abbrev")
        }
        className="w-full sm:w-56 rounded-xl bg-black/40 border border-gray-800 px-4 py-2
                   outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="name">Sort by Team</option>
        <option value="person">Sort by Person</option>
        <option value="abbrev">Sort by Abbrev</option>
      </select>
    </div>
  );
}

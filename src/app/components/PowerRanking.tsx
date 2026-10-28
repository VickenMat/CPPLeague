"use client";
import { useEffect, useState } from "react";
import { TIER_STYLES } from "../../../lib/tierStyles";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";

const TIERS = [
  "Unassigned",
  "Goat",
  "Valid",
  "Mid",
  "Washed",
  "Maybe Next Year",
] as const;
type Tier = (typeof TIERS)[number];
type Team = { id: string; name: string; leagueId: string; season: number };
type Assignments = Record<string, Tier>;

export default function PowerRanking() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<Assignments>({});
  const [storageKey, setStorageKey] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch("/api/teams", {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("Unable to load teams. Please reload to retry.");
        const list: Team[] = await response.json();
        const key = list.length
          ? `league-${list[0].leagueId}-${list[0].season}-rankings`
          : "";
        let saved: Assignments = {};
        try {
          saved = JSON.parse(localStorage.getItem(key) || "{}") || {};
        } catch {
          /* Start a fresh board if storage is unavailable. */
        }
        const next: Assignments = {};
        for (const team of list)
          next[team.id] = TIERS.includes(saved[team.id])
            ? saved[team.id]
            : "Unassigned";
        if (!controller.signal.aborted) {
          setTeams(list);
          setAssignments(next);
          setStorageKey(key);
          setLoaded(true);
        }
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Unable to load teams.",
          );
      }
    })();
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!storageKey || !loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(assignments));
    } catch {
      setError(
        "Browser storage is unavailable. Your board will not persist after closing this page.",
      );
    }
  }, [assignments, storageKey, loaded]);
  function move(id: string, tier: Tier) {
    setAssignments((previous) => ({ ...previous, [id]: tier }));
  }
  function drop(event: DragEndEvent) {
    const tier = String(event.over?.id) as Tier;
    if (TIERS.includes(tier)) move(String(event.active.id), tier);
  }
  return (
    <section className="mt-8">
      {error && (
        <p role="alert" className="mb-4 text-amber-300">
          {error}
        </p>
      )}
      {!loaded && !error && <p role="status">Loading teams…</p>}
      {loaded && (
        <>
          <p className="mb-4 text-center text-sm text-gray-400">
            Drag teams between tiers, or use each team’s dropdown.
          </p>
          <DndContext onDragEnd={drop}>
            <div className="grid gap-4 md:grid-cols-5">
              {TIERS.map((tier) => (
                <TierRow key={tier} tier={tier}>
                  {teams
                    .filter((team) => assignments[team.id] === tier)
                    .map((team) => (
                      <TeamCard
                        key={team.id}
                        team={team}
                        tier={tier}
                        move={move}
                      />
                    ))}
                </TierRow>
              ))}
            </div>
          </DndContext>
          <button
            onClick={() =>
              setAssignments(
                Object.fromEntries(
                  teams.map((team) => [team.id, "Unassigned"]),
                ),
              )
            }
            className="mt-5 rounded-lg border border-gray-700 px-4 py-2"
          >
            Reset board
          </button>
          <p className="mt-5 text-sm text-gray-400">
            Community voting will be available after a database is configured
            for this league.
          </p>
        </>
      )}
    </section>
  );
}
function TierRow({
  tier,
  children,
}: {
  tier: Tier;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: tier });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-24 rounded-xl border p-4 ${tier === "Unassigned" ? "md:col-span-5 border-red-500/50 bg-black/30" : `${TIER_STYLES[tier].border} ${TIER_STYLES[tier].soft}`} ${isOver ? "ring-2 ring-[#D9D7B6]" : ""}`}
    >
      <h2 className="mb-3 text-center font-bold">{tier}</h2>
      <div className="flex flex-wrap justify-center gap-3">{children}</div>
    </div>
  );
}
function TeamCard({
  team,
  tier,
  move,
}: {
  team: Team;
  tier: Tier;
  move: (id: string, tier: Tier) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: team.id,
  });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border border-gray-700 bg-gray-950 p-3 ${isDragging ? "opacity-40" : ""}`}
    >
      <button
        {...listeners}
        {...attributes}
        className="block cursor-grab text-left font-semibold"
        style={{ touchAction: "none" }}
      >
        {team.name}
      </button>
      <label className="mt-2 block text-sm">
        <span className="sr-only">Tier for {team.name}</span>
        <select
          value={tier}
          onChange={(event) => move(team.id, event.target.value as Tier)}
          className="rounded border border-gray-700 bg-gray-900 p-1"
        >
          {TIERS.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

const assert = require("node:assert/strict");
const { test, beforeEach, afterEach } = require("node:test");
const fs = require("node:fs");
const ts = require("typescript");

// Exercise the actual TypeScript modules with deterministic ESPN responses.
require.extensions[".ts"] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  module._compile(source, filename);
};
const { getLeagueSummary } = require("../lib/getLeagueSummary.ts");
const { fetchSeasonSchedule } = require("../lib/espnHistoric.ts");
const { getLeagueDraft } = require("../lib/league-draft.ts");
const { buildEspnUrl, espnHeadersForLeague } = require("../lib/espn.ts");
const { validateLeagueReference } = require("../lib/league.ts");
const originalFetch = global.fetch;
const calls = [];
let fixture;

beforeEach(() => {
  process.env.ESPN_LEAGUE_ID = "243916";
  process.env.ESPN_SEASON = "2026";
  process.env.ESPN_S2 = "test-cookie";
  process.env.ESPN_SWID = "test-owner";
  calls.length = 0;
  fixture = {
    settings: {
      name: "Test League",
      scheduleSettings: { playoffTeamCount: 4, matchupPeriodCount: 11 },
    },
    status: { previousSeasons: [2024, 2025] },
    members: [{ id: "manager-2", firstName: "New", lastName: "Manager" }],
    teams: [
      {
        id: 2,
        name: "New Franchise",
        owners: ["manager-2"],
        playoffSeed: 2,
        rankCalculatedFinal: 1,
        record: {
          overall: { wins: 8, losses: 3, pointsFor: 1000, pointsAgainst: 900 },
        },
      },
      {
        id: 23,
        name: "Other Franchise",
        owners: [],
        playoffSeed: 1,
        rankCalculatedFinal: 2,
        record: {
          overall: { wins: 9, losses: 2, pointsFor: 900, pointsAgainst: 800 },
        },
      },
    ],
  };
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), headers: options.headers });
    return Response.json(fixture);
  };
});
afterEach(() => {
  global.fetch = originalFetch;
});

test("summary uses ESPN managers, settings, and seeding for arbitrary team IDs", async () => {
  const summary = await getLeagueSummary();
  assert.equal(summary.teamCount, 2);
  assert.equal(summary.teams[0].displayOwner, "New Manager");
  assert.equal(summary.teams[0].finalRank, 1);
  assert.equal(summary.settings.playoffTeamCount, 4);
  assert.equal(summary.settings.regularSeasonMatchups, 11);
  assert.equal(summary.standings[0].teamId, 23);
  assert.deepEqual(summary.previousSeasons, [2024, 2025]);
  assert.ok(calls.every((call) => call.url.includes("/leagues/243916")));
});

test("old league IDs and B/C selectors cannot use the new league credentials", async () => {
  for (const key of ["B", "C"]) {
    assert.throws(() => validateLeagueReference(new URLSearchParams({ key })));
    assert.throws(() => espnHeadersForLeague({ key }));
  }
  assert.throws(() => buildEspnUrl(2026, "23105994", ["mTeam"]));
  await assert.rejects(getLeagueSummary({ leagueId: "23105994" }));
  assert.equal(validateLeagueReference(new URLSearchParams()), "243916");
  assert.equal(calls.length, 0);
});

test("historical names resolve from that season rather than current managers", async () => {
  fixture.members[0].firstName = "Previous";
  const summary = await getLeagueSummary({ season: 2025 });
  assert.equal(summary.teams[0].displayOwner, "Previous Manager");
  assert.ok(calls[0].url.includes("/seasons/2025/"));
});

test("ESPN playoff tiers separate actual playoffs, consolation, pending games, and byes", async () => {
  const game = {
    matchupPeriodId: 12,
    home: { teamId: 2, totalPoints: 100 },
    away: { teamId: 23, totalPoints: 90 },
    winner: "HOME",
  };
  fixture.schedule = [
    { ...game, matchupPeriodId: 11, playoffTierType: "NONE" },
    { ...game, playoffTierType: "WINNERS_BRACKET" },
    { ...game, playoffTierType: "LOSERS_CONSOLATION_LADDER" },
    { ...game, winner: "UNDECIDED", playoffTierType: "WINNERS_BRACKET" },
    { ...game, away: {}, playoffTierType: "WINNERS_BRACKET" },
  ];
  const { schedule } = await fetchSeasonSchedule("A", 2025);
  assert.equal(schedule.length, 4);
  assert.deepEqual(
    schedule.map((game) => game.phase),
    ["regular", "playoffs", "consolation", "playoffs"],
  );
  assert.equal(schedule[3].completed, false);
  assert.equal(schedule[1].homeName, "New Franchise");
});

test("draft order and picks use ESPN team IDs, actual order, and resolved player names", async () => {
  fixture.settings.draftSettings = { pickOrder: [23, 2] };
  fixture.teams[0].roster = {
    entries: [
      { playerPoolEntry: { player: { id: 101, fullName: "Drafted Player" } } },
    ],
  };
  fixture.draftDetail = {
    drafted: true,
    picks: [
      {
        roundId: 1,
        overallPickNumber: 1,
        teamId: 23,
        playerId: 101,
        keeper: true,
      },
    ],
  };
  const draft = await getLeagueDraft(2025);
  assert.deepEqual(
    draft.order.map((team) => team.id),
    [23, 2],
  );
  assert.equal(draft.picks[0].team, "Other Franchise");
  assert.equal(draft.picks[0].player, "Drafted Player");
  assert.equal(draft.picks[0].keeper, true);
});

test("ESPN host fallback succeeds without exposing cookies in errors", async () => {
  global.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes("lm-api-reads"))
      return new Response("Unavailable", { status: 503 });
    return Response.json(fixture);
  };
  const summary = await getLeagueSummary();
  assert.equal(summary.leagueName, "Test League");
  assert.equal(calls.length, 2);
});

// Emoji at the start or end used to produce lone UTF-16 surrogates and fail hydration.
test("team initials preserve emoji without corrupting server-rendered text", () => {
  const { teamInitials } = require("../lib/team-display.ts");
  assert.equal(teamInitials("Fright Club 🎃👻"), "F🎃");
  assert.equal(teamInitials("🏈 New Team"), "🏈T");
  assert.equal(teamInitials(""), "??");
});

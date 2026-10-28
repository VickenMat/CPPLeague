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

test("conflicting and repeated league selectors are rejected before ESPN access", () => {
  for (const query of [
    "key=A&league=B",
    "key=A&key=B",
    "leagueId=243916&leagueId=23105994",
    "leagueId=",
    "key=C&leagueId=243916",
  ]) {
    assert.throws(() => validateLeagueReference(new URLSearchParams(query)));
  }
  assert.equal(calls.length, 0);
});

test("malformed historical ranges fail before making upstream requests", async () => {
  const { getHistoryStatistics } = require("../lib/history-statistics.ts");
  const { getMatchupArchive } = require("../lib/matchup-archive.ts");
  for (const query of [
    "from=NaN",
    "from=2025.5",
    "from=2026&to=2025",
    "from=2020&from=2021",
    "to=9999",
  ]) {
    await assert.rejects(getHistoryStatistics(new URLSearchParams(query)));
    await assert.rejects(getMatchupArchive(new URLSearchParams(query)));
  }
  await assert.rejects(getMatchupArchive(new URLSearchParams("limit=100000")));
  assert.equal(calls.length, 0);
});

test("summary excludes unused upstream account and team metadata", async () => {
  fixture.members[0].email = "private@example.test";
  fixture.teams[0].unusedMetadata = { sensitive: true };
  const summary = await getLeagueSummary();
  const serialized = JSON.stringify(summary);
  assert.ok(!serialized.includes("private@example.test"));
  assert.ok(!serialized.includes("unusedMetadata"));
  assert.equal(summary.teams[0].displayOwner, "New Manager");
});

test("HTTP cancellation reaches the upstream request without waiting for its timeout", async () => {
  const { fetchJson } = require("../lib/http.ts");
  const controller = new AbortController();
  global.fetch = (_url, options) =>
    new Promise((_resolve, reject) => {
      assert.equal(options.redirect, "error");
      options.signal.addEventListener(
        "abort",
        () => reject(options.signal.reason),
        { once: true },
      );
    });
  const request = fetchJson("https://example.test", {
    signal: controller.signal,
    timeoutMs: 5000,
  });
  controller.abort();
  await assert.rejects(request, (error) => error.name === "AbortError");
});

test("HTTP timeout stops the upstream request and returns a controlled error", async () => {
  const { fetchJson } = require("../lib/http.ts");
  global.fetch = (_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener(
        "abort",
        () => reject(options.signal.reason),
        { once: true },
      );
    });
  await assert.rejects(
    fetchJson("https://example.test", { timeoutMs: 5 }),
    /Request timed out/,
  );
});

test("rate limiter bounds bucket memory and recovers after expiry", () => {
  const { createRateLimiter } = require("../lib/rate-limit.ts");
  let time = 1000;
  const check = createRateLimiter(2, () => time);
  const request = (ip) =>
    new Request("https://example.test", { headers: { "x-forwarded-for": ip } });
  assert.equal(check(request("127.0.0.1"), "test", 1, 1000), null);
  assert.equal(check(request("127.0.0.1"), "test", 1, 1000).status, 429);
  assert.equal(check(request("127.0.0.2"), "test", 1, 1000), null);
  const full = check(request("127.0.0.3"), "test", 1, 1000);
  assert.equal(full.status, 429);
  assert.equal(full.headers.get("Retry-After"), "1");
  time += 1001;
  assert.equal(check(request("127.0.0.3"), "test", 1, 1000), null);
});

test("draft results resolve the manager from the selected season's team", async () => {
  fixture.teams[1].owners = ["manager-2"];
  fixture.draftDetail = {
    picks: [{ roundId: 1, overallPickNumber: 1, teamId: 23, playerId: 101 }],
  };
  global.fetch = async (url, options) => {
    if (String(url).includes("kona_playercard")) {
      const filter = JSON.parse(options.headers["x-fantasy-filter"]);
      assert.ok(
        filter.players.sortPercOwned,
        "ESPN rejects limited player requests without a sort",
      );
      return Response.json({
        players: [
          { id: 101, player: { id: 101, fullName: "Resolved Player" } },
        ],
      });
    }
    return Response.json(fixture);
  };
  const draft = await getLeagueDraft(2025);
  assert.equal(draft.picks[0].manager, "New Manager");
  assert.equal(draft.picks[0].player, "Resolved Player");
});

test("rules exclude zero-value roster and scoring entries but retain D/ST overrides", () => {
  const { buildLeagueRules } = require("../lib/league-rules.ts");
  const data = {
    teams: [{ name: "Franchise", divisionId: 0 }],
    settings: {
      name: "Test",
      size: 10,
      rosterSettings: {
        lineupSlotCounts: { 0: 1, 1: 0, 19: 0, 20: 6, 21: 1 },
        positionLimits: { 1: 4 },
      },
      scoringSettings: {
        scoringType: "H2H_POINTS",
        scoringItems: [
          { statId: 53, points: 0.5 },
          { statId: 121, points: 0, pointsOverrides: { 16: 0 } },
          { statId: 89, points: 0, pointsOverrides: { 16: 4 } },
          { statId: 20, points: -2 },
        ],
      },
      acquisitionSettings: { minimumBid: 0, acquisitionBudget: 200 },
      draftSettings: { keeperCount: 0, keeperCountFuture: 0 },
      scheduleSettings: { divisions: [{ id: 0, name: "Billy Bronco" }] },
    },
  };
  const rules = buildLeagueRules(data, 2026);
  assert.ok(
    !rules.roster.some(
      (slot) =>
        slot.position.includes("Head Coach") ||
        slot.position.includes("Team Quarterback"),
    ),
  );
  assert.equal(rules.roster.find((slot) => slot.slot === 0).maximum, 4);
  assert.ok(
    rules.scoringGroups
      .find((group) => group.title === "Team Defense / Special Teams")
      .rows.some(
        (row) => row.label === "0 Points Allowed (PA0)" && row.value === 4,
      ),
  );
  assert.ok(
    rules.scoringGroups.every((group) =>
      group.rows.every((row) => row.value !== 0),
    ),
  );
  assert.ok(
    !rules.sections.some((section) => section.title === "Keeper Rules"),
  );
  assert.ok(
    !rules.sections
      .flatMap((section) => section.rows)
      .some((row) => row.label === "Minimum Offer"),
  );
});

test("transaction rows pair linked adds and cuts and compute signed net points", () => {
  const {
    groupTransactionRows,
    transactionInsight,
  } = require("../src/app/waivers/transaction-rows.ts");
  const base = {
    groupId: "event-1",
    teamId: 1,
    team: "Franchise",
    date: "2026-10-21T10:00:00Z",
    currentTeam: "Waivers",
  };
  const add = {
    ...base,
    id: "add",
    action: "Added",
    playerName: "Added Player",
    pointsSince: 12.5,
  };
  const cut = {
    ...base,
    id: "cut",
    action: "Dropped",
    playerName: "Cut Player",
    pointsSince: 5,
  };
  const paired = groupTransactionRows([add, cut]);
  assert.equal(paired.length, 1);
  assert.equal(transactionInsight(paired[0]).points, 7.5);
  assert.equal(transactionInsight(groupTransactionRows([cut])[0]).points, -5);
  assert.equal(
    transactionInsight(groupTransactionRows([{ ...add, pointsSince: null }])[0])
      .points,
    null,
  );
});

test("insights count actual weekly points after the move and exclude earlier kickoffs", () => {
  const { pointsSinceTransaction } = require("../lib/transaction-points.ts");
  const first = Date.parse("2026-10-18T17:00:00Z"),
    second = Date.parse("2026-10-25T17:00:00Z");
  const schedules = new Map([
    [
      12,
      {
        id: 12,
        proGamesByScoringPeriod: {
          6: [{ date: first }],
          7: [{ date: second }],
        },
      },
    ],
  ]);
  const player = {
    id: 1,
    proTeamId: 12,
    stats: [
      {
        seasonId: 2026,
        statSourceId: 0,
        statSplitTypeId: 0,
        scoringPeriodId: 0,
        appliedTotal: 30,
        stats: { 210: 2 },
      },
      {
        seasonId: 2026,
        statSourceId: 0,
        statSplitTypeId: 1,
        scoringPeriodId: 6,
        proTeamId: 12,
        appliedTotal: 10,
        stats: { 210: 1 },
      },
      {
        seasonId: 2026,
        statSourceId: 0,
        statSplitTypeId: 1,
        scoringPeriodId: 7,
        proTeamId: 12,
        appliedTotal: 20,
        stats: { 210: 1 },
      },
    ],
  };
  assert.deepEqual(
    pointsSinceTransaction(
      player,
      "2026-10-21T10:00:00Z",
      2026,
      schedules,
      Date.parse("2026-10-28T12:00:00Z"),
    ),
    { points: 20, games: 1 },
  );
  assert.deepEqual(
    pointsSinceTransaction(
      player,
      "2026-10-25T17:00:00Z",
      2026,
      schedules,
      Date.parse("2026-10-28T12:00:00Z"),
    ),
    { points: 0, games: 0 },
  );
  assert.deepEqual(
    pointsSinceTransaction(undefined, "2026-10-21T10:00:00Z", 2026, schedules),
    { points: null, games: null },
  );
});

test("YouTube embeds reject unrelated and deceptive hosts", () => {
  const { youtubeId } = require("../lib/site-content.ts");
  assert.equal(
    youtubeId("https://www.youtube.com/watch?v=T3_UNFZHSQU"),
    "T3_UNFZHSQU",
  );
  assert.equal(
    youtubeId("https://youtube.com.attacker.test/watch?v=T3_UNFZHSQU"),
    null,
  );
  assert.equal(youtubeId("javascript:alert(1)"), null);
});

test("contact validation requires consent and accepts only CPP form fields", () => {
  const { validateContactMessage } = require("../lib/contact-fields.ts");
  const valid = {
    name: "A Manager",
    email: "manager@example.test",
    subject: "Rules question",
    message: "Question about the league rules.",
    topic: "Rules",
    priority: "Normal",
    consent: true,
    league: "B",
  };
  assert.equal(validateContactMessage(valid).league, "CPP Fantasy Football");
  assert.throws(() => validateContactMessage({ ...valid, consent: false }));
  assert.throws(() =>
    validateContactMessage({ ...valid, email: "bad\nemail" }),
  );
  assert.throws(() =>
    validateContactMessage({ ...valid, message: "x".repeat(1001) }),
  );
});

test("insights fetch sorted player cards and return real points through the transaction pipeline", async () => {
  const { getTransactionInsights } = require("../lib/transaction-insights.ts");
  const now = Date.now;
  Date.now = () => Date.parse("2026-10-28T12:00:00Z");
  const ids = [9999997, 9999998];
  fixture.scoringPeriodId = 8;
  fixture.teams.forEach((team) => (team.roster = { entries: [] }));
  const stats = (points) => [
    {
      seasonId: 2026,
      statSourceId: 0,
      statSplitTypeId: 0,
      scoringPeriodId: 0,
      appliedTotal: points,
      stats: { 210: 1 },
    },
    {
      seasonId: 2026,
      statSourceId: 0,
      statSplitTypeId: 1,
      scoringPeriodId: 7,
      proTeamId: 12,
      appliedTotal: points,
      stats: { 210: 1 },
    },
  ];
  global.fetch = async (url, options) => {
    const text = String(url),
      filter = options.headers["x-fantasy-filter"]
        ? JSON.parse(options.headers["x-fantasy-filter"])
        : null;
    if (text.includes("proTeamSchedules_wl"))
      return Response.json({
        settings: {
          proTeams: [
            {
              id: 12,
              proGamesByScoringPeriod: {
                7: [{ date: Date.parse("2026-10-25T17:00:00Z") }],
              },
            },
          ],
        },
      });
    if (text.includes("communication"))
      return Response.json({
        topics: filter.topics.offset
          ? []
          : [
              {
                id: "event",
                date: Date.parse("2026-10-21T10:00:00Z"),
                messages: [
                  { id: "add", messageTypeId: 178, to: 2, targetId: ids[0] },
                  { id: "cut", messageTypeId: 179, to: 2, targetId: ids[1] },
                ],
              },
            ],
      });
    if (text.includes("kona_playercard")) {
      assert.ok(filter.players.sortPercOwned);
      return Response.json({
        players: ids.map((id, index) => ({
          id,
          player: {
            id,
            fullName: index ? "Cut Player" : "Added Player",
            proTeamId: 12,
            stats: filter.players.filterStatsForTopScoringPeriodIds
              ? stats(index ? 7.5 : 20)
              : [],
          },
        })),
      });
    }
    return Response.json(fixture);
  };
  try {
    const data = await getTransactionInsights("243916", "2026", 2);
    assert.equal(data.warning, undefined);
    assert.deepEqual(
      data.transactions.map((move) => move.pointsSince).sort((a, b) => a - b),
      [7.5, 20],
    );
  } finally {
    Date.now = now;
  }
});

test("contact delivery rejects foreign origins and sends only validated CPP fields to the configured endpoint", async () => {
  const { POST } = require("../src/app/api/contact/route.ts");
  const previous = process.env.CONTACT_FORM_ENDPOINT;
  process.env.CONTACT_FORM_ENDPOINT = "https://formspree.io/f/testdestination";
  let delivered = 0;
  global.fetch = async (url, options) => {
    delivered++;
    assert.equal(url, "https://formspree.io/f/testdestination");
    assert.equal(options.redirect, "error");
    assert.equal(JSON.parse(options.body).league, "CPP Fantasy Football");
    return Response.json({ ok: true });
  };
  const valid = {
    name: "Manager",
    email: "manager@example.test",
    subject: "Question",
    message: "A league question.",
    topic: "Rules",
    priority: "Normal",
    consent: true,
  };
  const request = (origin, body) =>
    new Request("https://example.test/api/contact", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    assert.equal(
      (await POST(request("https://attacker.test", valid))).status,
      403,
    );
    assert.equal(
      (
        await POST(
          request("https://example.test", { ...valid, consent: false }),
        )
      ).status,
      400,
    );
    assert.equal(delivered, 0);
    assert.equal(
      (await POST(request("https://example.test", valid))).status,
      200,
    );
    assert.equal(delivered, 1);
  } finally {
    if (previous === undefined) delete process.env.CONTACT_FORM_ENDPOINT;
    else process.env.CONTACT_FORM_ENDPOINT = previous;
  }
});

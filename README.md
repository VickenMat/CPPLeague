# CPP Fantasy Football

A single-league Next.js site connected to ESPN league **243916**. The default season is **2026**.

## Run locally

```sh
npm ci
cp .env.example .env.local
# Set the private ESPN cookies in .env.local if needed.
npm run dev
```

Do not replace an existing `.env.local` when setting up this copy. It already contains the local connection settings. Open http://localhost:3000.

## Environment

Only four values are required:

| Setting          | Purpose                                                 |
| ---------------- | ------------------------------------------------------- |
| `ESPN_LEAGUE_ID` | `243916`                                                |
| `ESPN_SEASON`    | `2026`                                                  |
| `ESPN_S2`        | Private `espn_s2` cookie, if the league requires access |
| `ESPN_SWID`      | Private `SWID` cookie, if the league requires access    |

The previous `_A`, `_B`, and `_C` settings are no longer used. `.env.local` is ignored by Git. Do not put credentials in public variables or commit them.

## Data and behavior

- League name, team directory, managers, standings, roster slots, and playoff team count come from ESPN.
- Team pages use `/teams/[teamId]`; missing or nonconsecutive ESPN IDs require no new files.
- Historical seasons are discovered from ESPN. Completed-season records are cached for five minutes. The all-time page uses final ESPN finishes, not regular-season leaders, to identify champions.
- Franchise history shows each season's manager because an ESPN team ID can change ownership.
- Matchup records use ESPN playoff bracket classifications and exclude pending games and byes. Consolation results remain separate from championship playoff records.
- Draft order and results come from ESPN, with a season selector. Unresolved player names show their ESPN IDs rather than invented names.
- Waiver availability, transactions, and insights use the configured league. General 2026 FantasyCalc values and Top 300 rankings remain static reference data and are not customized to this league's scoring.
- Personal power rankings are stored in the browser, scoped by league and season. Community voting returns 503 until a separate league database is implemented; the copied Supabase connection is no longer used.
- Old ANFF owner overrides, history files, draft lists, constitution, score overrides, forms, mailing-list destinations, branding, and fixed team routes have been removed.

## What still needs league-specific input

These do not block ESPN-backed pages:

- A custom logo and colors. The current football/CPP mark is a temporary vector placeholder.
- A separate rulebook or rules beyond ESPN's settings.
- Commissioner contact details and a new contact-form/newsletter destination, if desired. Contact currently links to ESPN.
- Photos and videos for the empty media page.
- A database and voting requirements if community power rankings should be restored.
- Corrections to ESPN history, manager names, or any records from before the seasons ESPN reports.

## Verification

```sh
npm test
npm run lint
npm run build
npm start
```

Tests cover league isolation, manager changes between seasons, arbitrary team IDs, ESPN playoff classifications, draft mapping, and host fallback. Live ESPN access depends on valid credentials and ESPN availability.

Deploy with the same four private environment settings in a separate hosting project. No deployment is performed by the local conversion.

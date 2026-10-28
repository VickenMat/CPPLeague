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
npm audit
npm start
```

Tests cover league isolation, manager changes between seasons, arbitrary team IDs, ESPN playoff classifications, draft mapping, and host fallback. Live ESPN access depends on valid credentials and ESPN availability.

Deploy with the same four private environment settings in a separate hosting project. No deployment is performed by the local conversion.

## Shared presentation and hardening

The layout follows the original ANFF design: a dark gradient and faint watermark, red/blue/orange card accents, cream buttons, centered titles, and standings PF highlights. CPP remains a single league throughout. Shared presentation components live in `src/app/components/LeagueUI.tsx`.

Server-rendered pages call the league data services directly. They do not construct internal fetch URLs from incoming Host headers. APIs validate conflicting/duplicate league references, season ranges, and bounded player-ID inputs. ESPN requests honor cancellation, have timeouts, and reject redirects; summary responses expose only the fields the UI uses. Historical matchup data is cached per season (one hour for past seasons, one minute for the current season).

The in-memory rate limiter caps its bucket count and returns `Retry-After` on 429 responses. It is a per-process safeguard, not a distributed quota: the hosting proxy must supply trusted client IP headers, and an edge-level limit is appropriate for multi-instance deployments.

Next.js and its lint configuration are aligned on the patched 15.5 line. The package override makes Next.js use this project's patched PostCSS 8 dependency. The unused Tailwind v3 plugin configuration has been removed; Tailwind v4 uses the existing PostCSS integration. Re-run the dependency audit when updating the lockfile.

## CPP page content and contact setup

- Draft order is centered without a card. Draft results show Team and Manager in separate columns and omit the Keeper column.
- The navigation omits Power Rankings. The personal board is still available from the home tools section.
- Waiver history and insights use Date, Add, Cut, and Transaction Team/Net Points columns. Insights use actual league-scored weekly ESPN totals after each move; missing game data remains explicitly unavailable. Limited ESPN player-card requests include a sort, as required by ESPN.
- Rules render the live league settings, roster limits, scoring, divisions, waivers, trades, and playoff configuration. Numeric zero-value rules and unused roster positions are omitted. D/ST position-specific scoring overrides are preserved.
- Media uses the ANFF section layout with CPP-only content. Add highlight links and soundbites in `lib/site-content.ts`. Discussion posts are device-local and capped at 100; they are not a shared league message board.
- Contact uses the ANFF About/Quick Info/form/FAQ layout with no league selector. Optional `COMMISSIONER_NAME` and `COMMISSIONER_EMAIL` configure the contact details. An email-only setup opens a mail-app draft for the user to review and send.
- Set `CONTACT_FORM_ENDPOINT` to a new CPP Formspree `https://formspree.io/f/...` endpoint to enable direct form delivery. Until an email or endpoint is supplied, the send button remains disabled and ESPN is offered as the contact route. No ANFF contact destination is used.

Contact submissions validate origin, consent, field lengths, topic/priority, and body size; they are rate limited and never follow outbound redirects. The optional delivery endpoint stays on the server.

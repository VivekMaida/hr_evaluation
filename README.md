# M3M Perform

Monthly performance logging, scorecards and annual reviews for M3M India.

Implemented from the Claude Design project **M3M Perform — UI design, round 1**,
against the foundations in that project's **M3M Brand Kit**.

`M3M Perform.dc.html` and `uploads/m3m-logo.png` are kept at the repo root so the
design document renders locally beside the implementation. The brand kit stays in
the design project; its values are transcribed into `app/globals.css`.

One caveat on the source: the design file is 256 KiB and the API that fetched it
caps there, so the copy in this repo is truncated part-way through Screen 08c's
last table. Screens 01–07 and 08a–08c came through complete. Screen 08's caption
mentions **two** empty states and **two** blocked ones; only three are present in
the truncated copy, so a fourth state may exist that has not been built.

## Running it

Requires Node.js 20 or newer. Verified on Node 24.19.0 / npm 11.17.0.

```bash
npm install
```

Copy the Neon and Auth.js variables into `.env.local`, then:

```bash
npm run db:deploy
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Then open http://localhost:3000. You'll land on `/login`.

`dev` runs Turbopack. Next.js compiles each route the first time you open it, so
every screen is slow once — around 1–3 seconds — and fast on every visit after.
That is dev-server behaviour, not the app: a warm page serves in under 200ms.
On this machine Defender's real-time scanning of `node_modules` is what makes the
first compile expensive; Turbopack cut the worst route from 9s to 1.3s. Drop the
`--turbopack` flag in `package.json` if you ever need to compare against webpack.

`npm run build && npm start` gives production speed.

## Data and accounts

Postgres on Neon, via Prisma. **Pinned to Prisma 6** deliberately: Prisma 7
removed `url`/`directUrl` from `schema.prisma` and requires a `prisma.config.ts`
plus a driver adapter. Upgrading means restructuring that, not bumping a version.

Both connection URLs are required — the pooled one for the app, the direct one
for migrations, which fail against the pooler:

```
m3m_internal_tools_DATABASE_URL           # pooled
m3m_internal_tools_DATABASE_URL_UNPOOLED  # direct, migrations only
AUTH_SECRET                               # Auth.js session signing
```

Prisma's CLI reads `.env`, not `.env.local`, so every `db:*` script goes through
`dotenv-cli`. Use those scripts rather than calling `prisma` directly.

| Script | Does |
| --- | --- |
| `npm run db:migrate` | New migration from schema changes (development) |
| `npm run db:deploy` | Apply existing migrations (deployment) |
| `npm run db:seed` | Idempotent — departments, employees, users, 12 cycles, KPI set |
| `npm run db:studio` | Browse the data |

**Accounts.** The seed gives every pilot user the same default password
(`m3m@12345`, in `lib/pilot-auth.ts`) and sets `mustSetPassword: true`.
Middleware redirects anyone with that flag to `/set-password` before they can
reach any other route — there is no way to use the app while still on the
default. Nobody self-registers — an email with no seeded account cannot get in.

HR can reset an account from `/admin/accounts`. A reset puts the password back
to the shared default and sets `mustSetPassword` again, so the person goes
through `/set-password` a second time; every reset is logged against the HR
person's name.

The trade-off: one password is shared across all nine pilot accounts, handed
out in person. Acceptable for a closed pilot with in-person credential
handoff; not acceptable for general rollout — v1 needs per-user temporary
passwords generated at account creation (see the note in `lib/pilot-auth.ts`).

Passwords are bcrypt-hashed at 12 rounds and never stored in plain text. Role
and `mustSetPassword` are re-read from the database on every Node-side session
refresh (not just trusted from the sign-in-time JWT), so an HR-side role
change or reset takes effect on the person's next page load rather than
requiring them to sign out and back in.

### Loading the real KPI master

`KPI_TEMPLATE` in `prisma/seed.ts` is still the prototype's five Sales KRAs
applied to everyone. Replace it — and the roster above it — with HR's actual
sheet. The seed asserts weights sum to 100 and will refuse to run otherwise.

## Deploying to Vercel

Set these in the Vercel project: both Neon URLs and `AUTH_SECRET`. Run
`npm run db:deploy` against the database once. `postinstall` runs
`prisma generate`, so the client is built during deployment.

Do **not** reintroduce SQLite or any local file for data — Vercel's filesystem
is ephemeral and resets on every deployment.

## What is here

| Route | Design | Notes |
| --- | --- | --- |
| `/login`, `/set-password` | — | Sign-in; forced first-login / post-reset password change. |
| `/` | Screen 01 / 05 | Home. Content branches on role — HR, Manager, or Employee (stub). |
| `/performance-log` | Screen 02 | Monthly entry. Live achievement, weighted score, context-note gate. Manager and HR only. |
| `/performance-log/upload` | Screen 07 | Spreadsheet route — download, check, confirm. Hidden from nav; see below. |
| `/performance-log/no-targets` | Screen 08a | Real: reached when no `Cycle` is `OPEN` for the fiscal year. |
| `/performance-log/locked` | Screen 08b | A closed month, read-only. Orphaned; see below. |
| `/performance-log/upload/failed` | Screen 08c | Every row rejected. Orphaned; see below. |
| `/scorecard` · `/scorecard/[id]` | Screen 03 | Full year, DB-backed. No id resolves to your own; record-level access via `canAccessEmployee()`. |
| `/reviews` · `/reviews/[id]` | Screen 04 | Annual rating, DB-backed. Same access rule as Scorecard. |
| `/reports` | Screen 06 | Consistency analysis and rating spread by lead. Fixture-backed, hidden from nav. |
| `/account` | — | Change your own password. |
| `/admin` | — | Half built: links to `/admin/accounts` (real); publishing KPIs and cycles is not. |
| `/admin/accounts` | — | HR-only. Reset a password, see who's still on the default. |
| `/my-team`, `/calibration`, `/activity` | — | Role-gated placeholders — in the IA, nothing drawn behind them. |

**`/performance-log/no-targets` is real, not a placeholder.** `/performance-log`
redirects there automatically whenever no cycle is marked `OPEN` for the fiscal
year — a genuine gap that opens up at cycle rollover, between the previous
cycle locking and HR opening the next one. It reads the real `Cycle` rows.

**`/performance-log/locked` and `/performance-log/upload/failed` are orphaned.**
Nothing in the app links or redirects to either — they're reachable only by
typing the URL. Locked-month correction ("Request a correction" on the locked
screen) has no route behind it yet either: `CorrectionRequest` exists in the
schema, but no page or action creates one — the button is decorative.

See "What's wired to the database" below for which screens are live and which
still render fixtures.

## What's wired to the database

**Live** — reads and writes through Prisma, no fixtures:

- `/` — HR sees real org completeness and pending exceptions (`lib/org.ts`); a
  Manager sees their real direct reports (`lib/team.ts`); Employee is a stub
  (see Unbuilt, below).
- `/performance-log` — the entry form (`/api/entries`), the team rail, and the
  12-month record card all read real `Kpi` / `MonthlyEntry` / `Submission` rows.
- `/performance-log/no-targets` — reads real `Cycle` rows (see above).
- `/scorecard`, `/scorecard/[id]`, `/reviews`, `/reviews/[id]` —
  `lib/scorecard.ts` / `lib/reviews.ts`, sharing `lib/employee-year.ts` for the
  twelve-month history.
- `/account`, `/admin/accounts`, `/set-password` — real `User` / `Employee` rows.
- Auth throughout — role and `mustSetPassword` are re-read from the database on
  the Node side, not just trusted from the sign-in-time JWT.
- Record-level access — `canAccessEmployee()` in `lib/access.ts` gates every
  read above: HR sees anyone, a Manager sees their own reports, everyone sees
  themselves.

**Still reads fixtures:**

- `/reports` — `lib/reports-data.ts`. Hidden from nav: it needs variance across
  several closed months to say anything, which this pilot doesn't have yet.
- `/performance-log/upload` and its steps — `lib/upload-data.ts`. Hidden from
  nav and its in-page links disabled: the flow parses no file and commits
  nothing real.
- `lib/data.ts` — down to two consumers: `prisma/seed.ts` (its actual job) and
  `/performance-log/upload`'s date labels.

**Unbuilt:**

- `/my-team`, `/calibration`, `/activity` — role-gated placeholders
  (`NotDrawnYet`), in the IA, nothing behind them.
- The Employee Home (`components/home/EmployeeHome.tsx`) — a stub; its content
  hasn't been specified yet.
- `/admin` beyond Accounts — publishing a KPI/KRA set, opening and locking
  cycles, and deciding exception requests all have database models (`Kpi`,
  `Cycle`, `ExceptionRequest`) but no screen.
- `/performance-log/locked` and `/performance-log/upload/failed` — orphaned;
  see above.

## Superseded: GitHub Pages

The app was briefly a static export deployed to GitHub Pages. That is gone: an
app that saves data needs a server, so `output: 'export'` and the Pages workflow
were both removed in favour of Vercel.

`lib/scorecard-data.ts` and its `LINKED_EMPLOYEE_IDS` are gone — `/scorecard/[id]`
and `/reviews/[id]` read the database now and no longer use
`generateStaticParams` at all, so there is nothing left to prerender.

One leftover still in the tree, harmless and useful if the app is ever hosted
under a subpath again: `asset()` in `lib/base-path.ts` prefixes `public/`
assets with `NEXT_PUBLIC_BASE_PATH`. Unset, it is a no-op.

## Layout

```
app/                 routes, one folder per screen
  api/entries/       the one API route — reads and writes MonthlyEntry/Submission
components/          shared UI; ui.tsx holds the brand-kit furniture
  YearStrip.tsx      the twelve-month component, all three sizes
  home/ log/ reviews/ scorecard/ reports/
lib/
  types.ts           domain types
  score.ts           the scoring rules — bands, achievement, coverage, trend
  constants.ts       TODAY_LABEL / FY_LABEL — the pilot's fixed "today", not employee data
  access.ts          canAccessEmployee() — the one record-level access check
  employee-year.ts   one employee's twelve Cycle/Submission rows, shared by several screens
  entries.ts         achievement/weighted-score maths shared by the entry form and API route
  team.ts            a Manager's real direct reports — Home's "My Team" and the entry rail
  org.ts             org-wide completeness and pending exceptions — HR's Home
  scorecard.ts       reviews.ts     DB-backed queries for those two screens
  data.ts            down to seed.ts and the upload page's date labels — see below
  reports-data.ts    upload-data.ts    the two fixture modules still in real use
public/m3m-logo.png  the mark, from the design project's uploads/
```

`lib/reports-data.ts` and `lib/upload-data.ts` are the only fixture modules a
screen still renders from directly; `lib/data.ts` is nearly retired. See
"What's wired to the database" above for the full breakdown.

## Rules worth not breaking

These come from the design document, not from taste:

- **The year strip is fixed at 0–130%** across every instance, so two strips are
  always comparable. Above 130 clips; the numeral still prints the true figure.
  Never re-order, never truncate to the months that have data, never animate.
- **The track is always drawn.** A missing month reads as a hole in the year,
  never as a zero and never as absent.
- **Navy is the middle band (70–89).** Most months are unremarkable and should
  not be coloured. Green (90+) and red (under 70) are earned.
- **Score is a weighted achievement percentage**, not a 1–5 rating. Ratings
  appear in Reviews and nowhere else.
- **Achievement is uncapped.** 130% shows as 130% and pulls the score up.
  (Open question — see below.)
- **Lower-is-better KRAs** (TAT, escalations) invert the maths: target ÷ actual.
- **A context note is required outside 70–120%** achievement, and blocks
  submission until written.
- **A rating two or more bands from the record** needs a written justification
  of at least 40 characters.
- **Coverage decides what the record can be used for**: 11–12 complete, 8–10
  partial, 7 or fewer insufficient — derived metrics suppressed, rating blocked.
- **Reports inform the calibration conversation.** They do not adjust anyone's
  score, rating or record, and no distribution is imposed.
- **Line-art only in empty states**, never behind data. The two blocked states
  (locked month, failed import) deliberately have none.

## Open questions carried over from the design

- Should achievement cap at 120%? It is uncapped today.
- The two pale tints marked *derived* in the brand kit (`--tint-amber`,
  `--tint-red`) are not official M3M values. Replace them if official ones exist.

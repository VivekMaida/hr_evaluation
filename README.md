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

**Accounts.** The seed creates users with **no password**. Each person sets their
own on first sign-in: type the password you want and the account is yours.
Nobody self-registers — an email with no seeded account cannot get in.

The trade-off: whoever signs in first claims an account. Acceptable for a closed
pilot on an invite-only list; not acceptable for general rollout. Replace with
SSO before widening beyond the pilot.

Passwords are bcrypt-hashed at 12 rounds and never stored in plain text.

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
| `/` | Screen 01 / 05 | Home. Lead or HR, switched from the sidebar. |
| `/performance-log` | Screen 02 | Monthly entry. Live achievement, weighted score, context-note gate. |
| `/performance-log/upload` | Screen 07 | Spreadsheet route — download, check, confirm. |
| `/performance-log/no-targets` | Screen 08a | KRA set not yet published. |
| `/performance-log/locked` | Screen 08b | A closed month, read-only. |
| `/performance-log/upload/failed` | Screen 08c | Every row rejected. |
| `/scorecard` · `/scorecard/[id]` | Screen 03 | Full year. `/scorecard/EMP-12207` is the thin-coverage variant. |
| `/reviews` | Screen 04 | Annual rating. Pick a band two or more from the record to see the justification state. |
| `/reports` | Screen 06 | Consistency analysis and rating spread by lead. |
| `/my-team`, `/calibration`, `/admin`, `/activity` | — | In the IA, not drawn in round 1. |

**Only `/performance-log` reads and writes the database.** Home, Scorecard,
Reviews and Reports still render the fixtures in `lib/*-data.ts`. They are
design-accurate but not yet live — porting them is the next piece of work.

The role switch at the foot of the sidebar is left over from the prototype and
now disagrees with the signed-in user. Remove it once the remaining screens read
from the session.

## Superseded: GitHub Pages

The app was briefly a static export deployed to GitHub Pages. That is gone: an
app that saves data needs a server, so `output: 'export'` and the Pages workflow
were both removed in favour of Vercel.

Two leftovers still in the tree, harmless and useful if the app is ever hosted
under a subpath again:

- `LINKED_EMPLOYEE_IDS` in `lib/scorecard-data.ts` still drives
  `generateStaticParams` for `/scorecard/[employeeId]` and
  `/reviews/[employeeId]`, so those pages prerender.
- `asset()` in `lib/base-path.ts` prefixes `public/` assets with
  `NEXT_PUBLIC_BASE_PATH`. Unset, it is a no-op.

## Layout

```
app/                 routes, one folder per screen
components/          shared UI; ui.tsx holds the brand-kit furniture
  YearStrip.tsx      the twelve-month component, all three sizes
  home/ log/ reviews/ scorecard/ reports/
lib/
  types.ts           domain types
  score.ts           the scoring rules — bands, achievement, coverage, trend
  data.ts            Sales team fixtures and the open cycle
  hr-data.ts         organisation-wide fixtures
  scorecard-data.ts  reviews-data.ts  reports-data.ts  upload-data.ts
public/m3m-logo.png  the mark, from the design project's uploads/
```

`lib/*-data.ts` is the only place fixtures live. Swap those modules for real
data access; nothing above them reaches into the shapes directly.

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

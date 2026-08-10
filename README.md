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

```bash
npm run dev
```

Then open http://localhost:3000.

`dev` runs Turbopack. Next.js compiles each route the first time you open it, so
every screen is slow once — around 1–3 seconds — and fast on every visit after.
That is dev-server behaviour, not the app: a warm page serves in under 200ms.
On this machine Defender's real-time scanning of `node_modules` is what makes the
first compile expensive; Turbopack cut the worst route from 9s to 1.3s. Drop the
`--turbopack` flag in `package.json` if you ever need to compare against webpack.

`npm run build && npm start` gives production speed — every route below except
`/reviews/[employeeId]` is prerendered as static HTML.

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

The role switch at the foot of the sidebar is a prototype affordance, not part
of the shipped IA — it stands in for authentication.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds and publishes on every push to `main`.
In the repo, set **Settings → Pages → Source** to **GitHub Actions** once; after
that it is automatic. The site lands at `https://<user>.github.io/<repo>/`.

> **Pages from a private repo requires GitHub Pro, Team or Enterprise.** On a
> free account the workflow runs but the site never becomes reachable. Either
> upgrade the plan or make the repo public — and read the note on contents in
> the section above before choosing public.

The app is a static export (`output: 'export'`), so there is no server at
runtime. Two consequences worth knowing:

- **Every linked employee id must be prebuilt.** `LINKED_EMPLOYEE_IDS` in
  `lib/scorecard-data.ts` feeds `generateStaticParams` for both
  `/scorecard/[employeeId]` and `/reviews/[employeeId]`. Add an employee to the
  fixtures without adding them there and their row will 404 on Pages while
  working fine under `npm run dev`.
- **Pages serves from a `/<repo>` subpath.** `next/link` picks that up from
  `basePath` automatically, but `next/image` with `unoptimized: true` does not —
  anything pointing at a file in `public/` must go through `asset()` in
  `lib/base-path.ts`. The workflow sets `NEXT_PUBLIC_BASE_PATH` from the repo
  name; locally it is empty, so `npm run dev` is unaffected.

To reproduce a Pages build locally:

```bash
NEXT_PUBLIC_BASE_PATH=/your-repo-name npm run build
```

That writes `out/`. Serving it from a directory of that name reproduces the
deployed URL structure exactly.

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

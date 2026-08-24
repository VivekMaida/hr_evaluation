import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { prisma } from '../lib/db';
import { buildRows, weightedScoreOf } from '../lib/entries';
import type { KpiRow } from '../lib/kpi';
import { describeDivergences, findDivergedSubmittedMonths } from '../lib/submission-audit';

/* ---------------------------------------------------------------------------
   The invariant from lib/submission-write.ts, as a test.

   A SUBMITTED month's stored weightedScore must always be the score of the
   entries it currently has. It stopped being true once — both writers only
   rescored a DRAFT, so a submitted month kept its old figure while its entries
   changed underneath, and the KRA matrix and the headline disagreed. This is
   the check that would have caught it.

   The first test is a pure one: it fixes the arithmetic the audit relies on, so
   a green run means something even when the database happens to hold no
   submitted months. The second reads the real record, read-only.

   Run with `npm test`.
   --------------------------------------------------------------------------- */

after(async () => {
  await prisma.$disconnect();
});

/** A KRA set of one, weighted 100, so the weighted score is the achievement. */
function soleKpi(target: number): KpiRow {
  return {
    id: 'kpi-1',
    lineageId: 'lin-1',
    name: 'Test KRA',
    basis: 'test',
    unit: '%',
    weight: 100,
    target,
    type: 'HIGHER_IS_BETTER',
    lowerIsBetter: false,
    sortOrder: 1,
    effectiveFrom: 1,
    effectiveTo: null,
  };
}

test('a month scores what its entries say, and changing an entry changes the score', () => {
  const kpis = [soleKpi(100)];

  const asSubmitted = weightedScoreOf(
    buildRows(kpis, [{ kpiId: 'kpi-1', actual: 80, contextNote: null }]),
  );
  assert.equal(asSubmitted, 80, 'a single 100-weighted KRA at 80% of target scores 80');

  // The shape of the bug: an entry moves, so the month's score moves with it.
  // Anything that stored the old figure against the new entries would be the
  // divergence findDivergedSubmittedMonths() looks for.
  const afterEdit = weightedScoreOf(
    buildRows(kpis, [{ kpiId: 'kpi-1', actual: 95, contextNote: null }]),
  );
  assert.equal(afterEdit, 95);
  assert.notEqual(asSubmitted, afterEdit, 'the score must not survive an edit to its entries');
});

test('no submitted month in the record disagrees with its own entries', async (t) => {
  // The name Prisma's datasource actually reads — see prisma/schema.prisma.
  // Vercel prefixes this project's Neon variables, so it is not DATABASE_URL,
  // and guarding on that name silently skipped this test into a green run.
  if (!process.env.m3m_internal_tools_DATABASE_URL) {
    t.skip('No database URL in the environment, so there is no record to audit');
    return;
  }

  const { checked, diverged } = await findDivergedSubmittedMonths();
  t.diagnostic(`audited ${checked} submitted month${checked === 1 ? '' : 's'}`);

  assert.deepEqual(
    diverged,
    [],
    `${diverged.length} submitted month(s) disagree with their entries:\n${describeDivergences(diverged)}`,
  );
});

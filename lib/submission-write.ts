import type { EntrySource, Prisma } from '@prisma/client';

/* ---------------------------------------------------------------------------
   The one place a Submission row is written.

   Both writers — the form's POST /api/entries and the spreadsheet upload —
   used to carry their own copy of this state machine, and they drifted: each
   one only rescored a DRAFT, so a *submitted* month whose entries had just
   changed kept its old weightedScore and stayed SUBMITTED. The record then
   said two different things about the same month — Deepak's KRA matrix showed
   the new figures while his headline and My Team read the superseded 85.7.

   The invariant this module exists to hold: **a SUBMITTED month's
   weightedScore is always the score of the entries it currently has.** Any
   write that changes the entries without confirming them ends with the month
   as a DRAFT, never as a submission asserting a number nobody stands behind.
   --------------------------------------------------------------------------- */

export type SubmissionWrite = {
  employeeId: string;
  cycleId: string;
  /** The score of the month as it stands after this write's entries. */
  score: number | null;
  /** True when the actor is confirming the month, not just saving it. */
  submit: boolean;
  source: EntrySource;
  actorId: string;
};

/**
 * What the write did, for the caller to report back to the manager.
 *
 * `unsubmitted` is the case that has to reach a screen: the month was
 * submitted, this write changed its entries without confirming them, and it
 * has been returned to a draft. A manager who is not told that has published
 * a figure and then silently unpublished it.
 */
export type SubmissionOutcome = {
  state: 'SUBMITTED' | 'DRAFT';
  weightedScore: number | null;
  unsubmitted: { previousScore: number | null; previouslySubmittedAt: Date | null } | null;
};

/**
 * Write the Submission row for one employee-month, inside the caller's
 * transaction.
 *
 * On `submit`, a month that was already submitted is superseded rather than
 * overwritten, so what was claimed when survives. Off `submit`, the month ends
 * as a DRAFT carrying the new score — including when it arrives here
 * SUBMITTED, which is the divergence this module was extracted to close.
 *
 * A month cannot hold a DRAFT and a SUBMITTED row at once: Submission is
 * unique on (employeeId, cycleId, state) and nothing creates a draft beside a
 * submission. If data ever did, the update below would hit that constraint and
 * roll the caller's transaction back — a refusal, not a corrupted month.
 */
export async function writeSubmission(
  tx: Prisma.TransactionClient,
  { employeeId, cycleId, score, submit, source, actorId }: SubmissionWrite,
): Promise<SubmissionOutcome> {
  const open = await tx.submission.findMany({
    where: { employeeId, cycleId, state: { in: ['DRAFT', 'SUBMITTED'] } },
  });
  // Deterministic when both somehow exist: the submission is the row that
  // makes a claim about the month, so it is the one that governs.
  const existing = open.find((s) => s.state === 'SUBMITTED') ?? open[0] ?? null;

  if (submit) {
    if (existing?.state === 'SUBMITTED') {
      await tx.submission.update({ where: { id: existing.id }, data: { state: 'SUPERSEDED' } });
      await tx.submission.create({
        data: {
          employeeId,
          cycleId,
          weightedScore: score,
          state: 'SUBMITTED',
          source,
          submittedAt: new Date(),
          submittedById: actorId,
          supersedesId: existing.id,
        },
      });
    } else if (existing) {
      await tx.submission.update({
        where: { id: existing.id },
        data: {
          weightedScore: score,
          state: 'SUBMITTED',
          source,
          submittedAt: new Date(),
          submittedById: actorId,
        },
      });
    } else {
      await tx.submission.create({
        data: {
          employeeId,
          cycleId,
          weightedScore: score,
          state: 'SUBMITTED',
          source,
          submittedAt: new Date(),
          submittedById: actorId,
        },
      });
    }
    return { state: 'SUBMITTED', weightedScore: score, unsubmitted: null };
  }

  if (!existing) {
    await tx.submission.create({
      data: { employeeId, cycleId, weightedScore: score, state: 'DRAFT', source },
    });
    return { state: 'DRAFT', weightedScore: score, unsubmitted: null };
  }

  if (existing.state === 'DRAFT') {
    await tx.submission.update({
      where: { id: existing.id },
      data: { weightedScore: score, source },
    });
    return { state: 'DRAFT', weightedScore: score, unsubmitted: null };
  }

  // The month was submitted and these entries have changed under it. Rescoring
  // it in place would publish a figure the actor never confirmed — and on the
  // upload path, one merged out of a file that had rows refused. Returning it
  // to a draft is the recoverable direction: one more click re-publishes it,
  // whereas a wrong rating that Reviews and Calibration have already read is
  // not something the manager can take back.
  const previousScore = existing.weightedScore === null ? null : Number(existing.weightedScore);
  await tx.submission.update({
    where: { id: existing.id },
    data: {
      state: 'DRAFT',
      weightedScore: score,
      source,
      submittedAt: null,
      submittedById: null,
    },
  });
  return {
    state: 'DRAFT',
    weightedScore: score,
    unsubmitted: { previousScore, previouslySubmittedAt: existing.submittedAt },
  };
}

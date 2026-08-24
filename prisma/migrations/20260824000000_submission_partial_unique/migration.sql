-- The month-level uniqueness rule on Submission, restated.
--
-- @@unique([employeeId, cycleId, state]) allowed one row per state per month,
-- which capped a month at a single SUPERSEDED row. Correcting a month a second
-- time therefore failed: superseding the current submission collided with the
-- row left behind by the first correction, and the write aborted with P2002
-- on (employeeId, cycleId, state) — reaching the manager as a bare HTTP 500
-- from POST /api/entries. Submit, correct, correct again is an ordinary thing
-- to do in a pilot month, so the third one has to work.
--
-- What the record needs is: at most one live claim on a month (one SUBMITTED)
-- and at most one working copy (one DRAFT), with the history behind them
-- unbounded. Two partial unique indexes say exactly that and leave the
-- superseded chain free to grow.
--
-- No data migration is required, and none is possible to need: the index being
-- dropped is strictly stronger than the two replacing it — it already held a
-- month to one row per state — so no existing row can violate them.

DROP INDEX "Submission_employeeId_cycleId_state_key";

-- One live submission per employee-month.
CREATE UNIQUE INDEX "Submission_one_submitted_per_month"
  ON "Submission" ("employeeId", "cycleId")
  WHERE "state" = 'SUBMITTED';

-- One working draft per employee-month.
CREATE UNIQUE INDEX "Submission_one_draft_per_month"
  ON "Submission" ("employeeId", "cycleId")
  WHERE "state" = 'DRAFT';

-- The dropped unique index was also the only index on this prefix, and every
-- read of a month's submission filters on exactly it — see writeSubmission()
-- in lib/submission-write.ts. Replace the lookup it was doing double duty for.
CREATE INDEX "Submission_employeeId_cycleId_idx" ON "Submission" ("employeeId", "cycleId");

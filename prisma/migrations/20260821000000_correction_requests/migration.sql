-- Rework CorrectionRequest from "one MonthlyEntry" to "one employee's month".
-- The table has never held a row (no code path ever created one), so the
-- dropped columns carry no data.

-- DropIndex
DROP INDEX IF EXISTS "CorrectionRequest_monthlyEntryId_idx";

-- AlterTable
ALTER TABLE "CorrectionRequest"
  DROP COLUMN "monthlyEntryId",
  DROP COLUMN "previousValue",
  DROP COLUMN "proposedValue",
  ADD COLUMN     "employeeId" TEXT NOT NULL,
  ADD COLUMN     "cycleId" TEXT NOT NULL,
  ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CorrectionRequest_employeeId_cycleId_idx" ON "CorrectionRequest"("employeeId", "cycleId");

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

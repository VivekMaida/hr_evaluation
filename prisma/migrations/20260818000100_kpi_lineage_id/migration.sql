-- AlterTable
ALTER TABLE "Kpi" ADD COLUMN     "lineageId" TEXT;

-- Backfill: every existing row is its own lineage's first version.
UPDATE "Kpi" SET "lineageId" = "id" WHERE "lineageId" IS NULL;

-- AlterTable
ALTER TABLE "Kpi" ALTER COLUMN "lineageId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Kpi_employeeId_fiscalYear_lineageId_idx" ON "Kpi"("employeeId", "fiscalYear", "lineageId");

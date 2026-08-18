-- AlterTable
ALTER TABLE "Kpi" ADD COLUMN     "effectiveFrom" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "effectiveTo" INTEGER;

-- DropIndex
DROP INDEX "Kpi_employeeId_fiscalYear_name_key";

-- CreateIndex
CREATE INDEX "Kpi_employeeId_fiscalYear_effectiveTo_idx" ON "Kpi"("employeeId", "fiscalYear", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "Kpi_employeeId_fiscalYear_name_effectiveFrom_key" ON "Kpi"("employeeId", "fiscalYear", "name", "effectiveFrom");

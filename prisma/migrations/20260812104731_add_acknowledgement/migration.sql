-- CreateTable
CREATE TABLE "Acknowledgement" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Acknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Acknowledgement_employeeId_idx" ON "Acknowledgement"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Acknowledgement_employeeId_cycleId_key" ON "Acknowledgement"("employeeId", "cycleId");

-- AddForeignKey
ALTER TABLE "Acknowledgement" ADD CONSTRAINT "Acknowledgement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acknowledgement" ADD CONSTRAINT "Acknowledgement_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

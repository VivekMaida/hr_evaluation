-- CreateEnum
CREATE TYPE "QueryState" AS ENUM ('OPEN', 'ANSWERED');

-- CreateTable
CREATE TABLE "MonthQuery" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "askedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" "QueryState" NOT NULL DEFAULT 'OPEN',
    "response" TEXT,
    "respondedById" TEXT,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "MonthQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthQuery_employeeId_idx" ON "MonthQuery"("employeeId");

-- CreateIndex
CREATE INDEX "MonthQuery_state_idx" ON "MonthQuery"("state");

-- AddForeignKey
ALTER TABLE "MonthQuery" ADD CONSTRAINT "MonthQuery_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthQuery" ADD CONSTRAINT "MonthQuery_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

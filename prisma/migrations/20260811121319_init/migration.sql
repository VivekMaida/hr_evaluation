-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'LEAD', 'HR');

-- CreateEnum
CREATE TYPE "CycleState" AS ENUM ('FUTURE', 'OPEN', 'LOCKED');

-- CreateEnum
CREATE TYPE "SubmissionState" AS ENUM ('DRAFT', 'SUBMITTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('FORM', 'UPLOAD');

-- CreateEnum
CREATE TYPE "ReviewState" AS ENUM ('NOT_STARTED', 'DRAFT', 'SUBMITTED', 'CALIBRATED');

-- CreateEnum
CREATE TYPE "RequestState" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('BACK_ENTRY', 'WEIGHT_CHANGE', 'TARGET_RESET', 'OTHER');

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "joinedOn" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "departmentId" TEXT NOT NULL,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'LEAD',
    "passwordHash" TEXT,
    "mustSetPassword" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "monthIndex" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "state" "CycleState" NOT NULL DEFAULT 'FUTURE',
    "opensOn" TIMESTAMP(3),
    "locksOn" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kpi" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "unit" TEXT,
    "weight" DECIMAL(5,2) NOT NULL,
    "target" DECIMAL(14,2) NOT NULL,
    "lowerIsBetter" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyEntry" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "actual" DECIMAL(14,2),
    "contextNote" TEXT,
    "achievement" DECIMAL(7,2),
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "weightedScore" DECIMAL(7,2),
    "state" "SubmissionState" NOT NULL DEFAULT 'DRAFT',
    "source" "EntrySource" NOT NULL DEFAULT 'FORM',
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnualReview" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "yearAverage" DECIMAL(7,2),
    "monthsLogged" INTEGER NOT NULL DEFAULT 0,
    "impliedBand" INTEGER,
    "chosenBand" INTEGER,
    "justification" TEXT,
    "reviewerComment" TEXT,
    "state" "ReviewState" NOT NULL DEFAULT 'NOT_STARTED',
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnualReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExceptionRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "ExceptionType" NOT NULL,
    "detail" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" "RequestState" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,

    CONSTRAINT "ExceptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionRequest" (
    "id" TEXT NOT NULL,
    "monthlyEntryId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "previousValue" DECIMAL(14,2),
    "proposedValue" DECIMAL(14,2),
    "raisedById" TEXT NOT NULL,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" "RequestState" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,

    CONSTRAINT "CorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadBatch" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowsTotal" INTEGER NOT NULL DEFAULT 0,
    "rowsCommitted" INTEGER NOT NULL DEFAULT 0,
    "rowsRejected" INTEGER NOT NULL DEFAULT 0,
    "rejections" JSONB,
    "committedAt" TIMESTAMP(3),

    CONSTRAINT "UploadBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "employeeId" TEXT,
    "cycleId" TEXT,
    "kind" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "meta" JSONB,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE INDEX "Employee_leadId_idx" ON "Employee"("leadId");

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "Cycle_state_idx" ON "Cycle"("state");

-- CreateIndex
CREATE UNIQUE INDEX "Cycle_fiscalYear_monthIndex_key" ON "Cycle"("fiscalYear", "monthIndex");

-- CreateIndex
CREATE INDEX "Kpi_employeeId_fiscalYear_idx" ON "Kpi"("employeeId", "fiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "Kpi_employeeId_fiscalYear_name_key" ON "Kpi"("employeeId", "fiscalYear", "name");

-- CreateIndex
CREATE INDEX "MonthlyEntry_employeeId_cycleId_idx" ON "MonthlyEntry"("employeeId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyEntry_kpiId_cycleId_key" ON "MonthlyEntry"("kpiId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_supersedesId_key" ON "Submission"("supersedesId");

-- CreateIndex
CREATE INDEX "Submission_cycleId_state_idx" ON "Submission"("cycleId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_employeeId_cycleId_state_key" ON "Submission"("employeeId", "cycleId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "AnnualReview_employeeId_fiscalYear_key" ON "AnnualReview"("employeeId", "fiscalYear");

-- CreateIndex
CREATE INDEX "ExceptionRequest_state_idx" ON "ExceptionRequest"("state");

-- CreateIndex
CREATE INDEX "CorrectionRequest_state_idx" ON "CorrectionRequest"("state");

-- CreateIndex
CREATE INDEX "CorrectionRequest_monthlyEntryId_idx" ON "CorrectionRequest"("monthlyEntryId");

-- CreateIndex
CREATE INDEX "UploadBatch_cycleId_idx" ON "UploadBatch"("cycleId");

-- CreateIndex
CREATE INDEX "ActivityLog_at_idx" ON "ActivityLog"("at");

-- CreateIndex
CREATE INDEX "ActivityLog_employeeId_idx" ON "ActivityLog"("employeeId");

-- CreateIndex
CREATE INDEX "ActivityLog_kind_idx" ON "ActivityLog"("kind");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyEntry" ADD CONSTRAINT "MonthlyEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyEntry" ADD CONSTRAINT "MonthlyEntry_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyEntry" ADD CONSTRAINT "MonthlyEntry_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnualReview" ADD CONSTRAINT "AnnualReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionRequest" ADD CONSTRAINT "ExceptionRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadBatch" ADD CONSTRAINT "UploadBatch_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

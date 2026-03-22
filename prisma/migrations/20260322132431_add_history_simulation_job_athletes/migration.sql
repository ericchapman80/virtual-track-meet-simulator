-- CreateTable
CREATE TABLE "HistorySimulationJobAthlete" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "requestedName" TEXT NOT NULL,
    "teamHint" TEXT,
    "status" TEXT NOT NULL,
    "resolvedName" TEXT,
    "athleteUrl" TEXT,
    "team" TEXT,
    "confidence" TEXT,
    "personalRecord" DOUBLE PRECISION,
    "previousSeasonAverage" DOUBLE PRECISION,
    "seasonAverage" DOUBLE PRECISION,
    "allTimeAverage" DOUBLE PRECISION,
    "seedPerformance" DOUBLE PRECISION,
    "seedBasis" TEXT,
    "stdDev" DOUBLE PRECISION,
    "notes" TEXT[],
    "reason" TEXT,
    "searchMatches" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistorySimulationJobAthlete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistorySimulationJobAthlete_jobId_sortOrder_idx" ON "HistorySimulationJobAthlete"("jobId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "HistorySimulationJobAthlete_jobId_sortOrder_key" ON "HistorySimulationJobAthlete"("jobId", "sortOrder");

-- AddForeignKey
ALTER TABLE "HistorySimulationJobAthlete" ADD CONSTRAINT "HistorySimulationJobAthlete_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "HistorySimulationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

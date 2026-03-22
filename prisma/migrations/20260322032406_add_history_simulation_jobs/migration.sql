-- CreateTable
CREATE TABLE "HistorySimulationJob" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progressMessage" TEXT,
    "progressCurrent" INTEGER,
    "progressTotal" INTEGER,
    "requestPayload" JSONB NOT NULL,
    "resultPayload" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "HistorySimulationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistorySimulationJob_status_createdAt_idx" ON "HistorySimulationJob"("status", "createdAt");

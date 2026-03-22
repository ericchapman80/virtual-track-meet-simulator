-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Athlete" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "graduationYr" INTEGER,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isTimed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Performance" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "mark" DOUBLE PRECISION NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "wind" DOUBLE PRECISION,
    "source" TEXT,
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "meetDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetEntry" (
    "id" TEXT NOT NULL,
    "meetId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "seedMark" DOUBLE PRECISION,
    "lane" INTEGER,

    CONSTRAINT "MeetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationRun" (
    "id" TEXT NOT NULL,
    "meetId" TEXT NOT NULL,
    "iterations" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "winProbability" DOUBLE PRECISION NOT NULL,
    "podiumProbability" DOUBLE PRECISION NOT NULL,
    "expectedPlace" DOUBLE PRECISION NOT NULL,
    "expectedMark" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SimulationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingsSnapshot" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "year" TEXT,
    "accuracy" TEXT,
    "grade" TEXT,
    "league" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalEvents" INTEGER NOT NULL,
    "trackedAthletes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingsEventGroup" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "eventUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "RankingsEventGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingsEntry" (
    "id" TEXT NOT NULL,
    "eventGroupId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "mark" TEXT NOT NULL,
    "wind" TEXT,
    "athlete" TEXT NOT NULL,
    "athleteUrl" TEXT,
    "team" TEXT,
    "teamUrl" TEXT,
    "grade" TEXT,
    "meet" TEXT,
    "meetUrl" TEXT,
    "place" TEXT,
    "date" TEXT,

    CONSTRAINT "RankingsEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Event_code_key" ON "Event"("code");

-- CreateIndex
CREATE INDEX "Performance_athleteId_eventId_idx" ON "Performance"("athleteId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetEntry_meetId_athleteId_eventId_key" ON "MeetEntry"("meetId", "athleteId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationResult_runId_athleteId_eventId_key" ON "SimulationResult"("runId", "athleteId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "RankingsSnapshot_sourceUrl_key" ON "RankingsSnapshot"("sourceUrl");

-- CreateIndex
CREATE INDEX "RankingsSnapshot_state_level_season_capturedAt_idx" ON "RankingsSnapshot"("state", "level", "season", "capturedAt");

-- CreateIndex
CREATE INDEX "RankingsEventGroup_snapshotId_sortOrder_idx" ON "RankingsEventGroup"("snapshotId", "sortOrder");

-- CreateIndex
CREATE INDEX "RankingsEntry_eventGroupId_rank_idx" ON "RankingsEntry"("eventGroupId", "rank");

-- CreateIndex
CREATE INDEX "RankingsEntry_athlete_idx" ON "RankingsEntry"("athlete");

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetEntry" ADD CONSTRAINT "MeetEntry_meetId_fkey" FOREIGN KEY ("meetId") REFERENCES "Meet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetEntry" ADD CONSTRAINT "MeetEntry_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetEntry" ADD CONSTRAINT "MeetEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_meetId_fkey" FOREIGN KEY ("meetId") REFERENCES "Meet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationResult" ADD CONSTRAINT "SimulationResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SimulationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationResult" ADD CONSTRAINT "SimulationResult_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationResult" ADD CONSTRAINT "SimulationResult_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingsEventGroup" ADD CONSTRAINT "RankingsEventGroup_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "RankingsSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingsEntry" ADD CONSTRAINT "RankingsEntry_eventGroupId_fkey" FOREIGN KEY ("eventGroupId") REFERENCES "RankingsEventGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

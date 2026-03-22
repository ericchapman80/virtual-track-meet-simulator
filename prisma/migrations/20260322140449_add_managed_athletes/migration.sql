-- CreateTable
CREATE TABLE "ManagedAthlete" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teamHint" TEXT,
    "state" TEXT,
    "milesplitAthleteUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedAthlete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagedAthlete_milesplitAthleteUrl_key" ON "ManagedAthlete"("milesplitAthleteUrl");

-- CreateIndex
CREATE INDEX "ManagedAthlete_name_idx" ON "ManagedAthlete"("name");

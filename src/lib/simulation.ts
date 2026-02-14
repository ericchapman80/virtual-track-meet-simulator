import { SimulationOutcome, SprintEntry } from "@/types/simulation";

type WorkingStat = {
  athleteName: string;
  teamName?: string;
  wins: number;
  podiums: number;
  placeSum: number;
  timeSum: number;
};

function randomNormal(mean: number, stdDev: number): number {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
}

function entryTime(entry: SprintEntry): number {
  if (typeof entry.actualTime === "number") {
    return entry.actualTime;
  }

  return Math.max(0.01, randomNormal(entry.seedTime, entry.stdDev ?? 0.15));
}

export function runSprintMonteCarlo(entries: SprintEntry[], iterations = 1000): SimulationOutcome[] {
  if (entries.length < 2) {
    throw new Error("At least two entries are required for simulation.");
  }

  const stats = new Map<string, WorkingStat>();
  entries.forEach((entry) => {
    stats.set(entry.athleteName, {
      athleteName: entry.athleteName,
      teamName: entry.teamName,
      wins: 0,
      podiums: 0,
      placeSum: 0,
      timeSum: 0
    });
  });

  for (let i = 0; i < iterations; i += 1) {
    const race = entries
      .map((entry) => ({
        athleteName: entry.athleteName,
        simulatedTime: entryTime(entry)
      }))
      .sort((a, b) => a.simulatedTime - b.simulatedTime);

    race.forEach((result, idx) => {
      const place = idx + 1;
      const athleteStats = stats.get(result.athleteName);
      if (!athleteStats) return;
      athleteStats.placeSum += place;
      athleteStats.timeSum += result.simulatedTime;
      if (place === 1) athleteStats.wins += 1;
      if (place <= 3) athleteStats.podiums += 1;
    });
  }

  return Array.from(stats.values())
    .map((stat) => ({
      athleteName: stat.athleteName,
      teamName: stat.teamName,
      winProbability: stat.wins / iterations,
      podiumProbability: stat.podiums / iterations,
      expectedPlace: stat.placeSum / iterations,
      averageTime: stat.timeSum / iterations
    }))
    .sort((a, b) => b.winProbability - a.winProbability);
}

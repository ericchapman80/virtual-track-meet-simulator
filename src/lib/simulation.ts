import { CompetitionEntry, CompetitionOutcome, SimulationOutcome, SprintEntry } from "@/types/simulation";

type WorkingStat = {
  athleteName: string;
  teamName?: string;
  wins: number;
  podiums: number;
  placeSum: number;
  performanceSum: number;
  placeCounts: number[];
  performances: number[];
};

function percentile(sortedValues: number[], fraction: number) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.max(0, Math.min(sortedValues.length - 1, Math.floor((sortedValues.length - 1) * fraction)));
  return sortedValues[index];
}

function mostLikelyPlace(placeCounts: number[]) {
  let bestPlace = 1;
  let bestCount = -1;

  placeCounts.forEach((count, index) => {
    if (count > bestCount) {
      bestCount = count;
      bestPlace = index + 1;
    }
  });

  return bestPlace;
}

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

function entryPerformance(entry: CompetitionEntry): number {
  if (typeof entry.actualPerformance === "number") {
    return entry.actualPerformance;
  }

  const value = randomNormal(entry.seedPerformance, entry.stdDev ?? 0.15);
  return entry.higherIsBetter ? Math.max(0, value) : Math.max(0.01, value);
}

export function runCompetitionMonteCarlo(entries: CompetitionEntry[], iterations = 1000): CompetitionOutcome[] {
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
      performanceSum: 0,
      placeCounts: Array.from({ length: entries.length }, () => 0),
      performances: [],
    });
  });

  for (let i = 0; i < iterations; i += 1) {
    const contest = entries
      .map((entry) => ({
        athleteName: entry.athleteName,
        performance: entryPerformance(entry),
        higherIsBetter: entry.higherIsBetter,
      }))
      .sort((a, b) => (a.higherIsBetter ? b.performance - a.performance : a.performance - b.performance));

    contest.forEach((result, idx) => {
      const place = idx + 1;
      const athleteStats = stats.get(result.athleteName);
      if (!athleteStats) return;
      athleteStats.placeSum += place;
      athleteStats.performanceSum += result.performance;
      athleteStats.placeCounts[place - 1] += 1;
      athleteStats.performances.push(result.performance);
      if (place === 1) athleteStats.wins += 1;
      if (place <= 3) athleteStats.podiums += 1;
    });
  }

  return Array.from(stats.values())
    .map((stat) => {
      const sortedPerformances = [...stat.performances].sort((a, b) => a - b);
      return {
        athleteName: stat.athleteName,
        teamName: stat.teamName,
        winProbability: stat.wins / iterations,
        podiumProbability: stat.podiums / iterations,
        expectedPlace: stat.placeSum / iterations,
        mostLikelyPlace: mostLikelyPlace(stat.placeCounts),
        averagePerformance: stat.performanceSum / iterations,
        performanceIntervalLow: percentile(sortedPerformances, 0.025),
        performanceIntervalHigh: percentile(sortedPerformances, 0.975),
      };
    })
    .sort((a, b) => b.winProbability - a.winProbability);
}

export function runSprintMonteCarlo(entries: SprintEntry[], iterations = 1000): SimulationOutcome[] {
  return runCompetitionMonteCarlo(
    entries.map((entry) => ({
      athleteName: entry.athleteName,
      teamName: entry.teamName,
      seedPerformance: entry.seedTime,
      stdDev: entry.stdDev,
      actualPerformance: typeof entry.actualTime === "number" ? entry.actualTime : undefined,
      higherIsBetter: false,
    })),
    iterations,
  ).map((result) => ({
    athleteName: result.athleteName,
    teamName: result.teamName,
    winProbability: result.winProbability,
    podiumProbability: result.podiumProbability,
    expectedPlace: result.expectedPlace,
    mostLikelyPlace: result.mostLikelyPlace,
    averageTime: result.averagePerformance,
    timeIntervalLow: result.performanceIntervalLow,
    timeIntervalHigh: result.performanceIntervalHigh,
  }));
}

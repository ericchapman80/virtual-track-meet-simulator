export type SprintEntry = {
  athleteName: string;
  teamName?: string;
  seedTime: number;
  stdDev?: number;
  actualTime?: number;
};

export type CompetitionEntry = {
  athleteName: string;
  teamName?: string;
  seedPerformance: number;
  stdDev?: number;
  actualPerformance?: number;
  higherIsBetter: boolean;
};

export type CompetitionOutcome = {
  athleteName: string;
  teamName?: string;
  winProbability: number;
  podiumProbability: number;
  expectedPlace: number;
  mostLikelyPlace: number;
  averagePerformance: number;
  performanceIntervalLow: number;
  performanceIntervalHigh: number;
};

export type SimulationOutcome = {
  athleteName: string;
  teamName?: string;
  winProbability: number;
  podiumProbability: number;
  expectedPlace: number;
  mostLikelyPlace: number;
  averageTime: number;
  timeIntervalLow: number;
  timeIntervalHigh: number;
};

export type SimulationRequest = {
  entries: SprintEntry[];
  iterations?: number;
};

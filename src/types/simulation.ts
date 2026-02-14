export type SprintEntry = {
  athleteName: string;
  teamName?: string;
  seedTime: number;
  stdDev?: number;
  actualTime?: number;
};

export type SimulationOutcome = {
  athleteName: string;
  teamName?: string;
  winProbability: number;
  podiumProbability: number;
  expectedPlace: number;
  averageTime: number;
};

export type SimulationRequest = {
  entries: SprintEntry[];
  iterations?: number;
};

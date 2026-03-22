import { beforeEach, describe, expect, it, vi } from "vitest";

const simulateMilesplitEventFromHistory = vi.fn();

vi.mock("@/lib/milesplit", () => ({
  simulateMilesplitEventFromHistory,
}));

describe("POST /api/simulate/event/from-history", () => {
  beforeEach(() => {
    simulateMilesplitEventFromHistory.mockReset();
  });

  it("returns seeded event simulation results", async () => {
    simulateMilesplitEventFromHistory.mockResolvedValue({
      event: "100m",
      searchState: "VA",
      season: "outdoor",
      eventType: "time",
      performanceUnit: "seconds",
      iterations: 5000,
      historyLimit: 5,
      canSimulate: true,
      warningMessage: null,
      generatedAt: "2026-03-21T23:10:00.000Z",
      participantsRequested: ["Riley Chapman", "Karter Chapman"],
      entrants: [
        {
          requestedName: "Riley Chapman",
          resolvedName: "Riley Chapman",
          athleteUrl: "https://va.milesplit.com/athletes/1-riley-chapman",
          team: "Example High School",
          personalRecord: 12.84,
          previousSeasonAverage: 12.91,
          seasonAverage: 12.91,
          allTimeAverage: 12.95,
          seedPerformance: 12.91,
          seedBasis: "previous season average",
          stdDev: 0.18,
          confidence: "exact",
          history: [
            {
              event: "100 Meter Dash",
              mark: "12.84",
              numericMark: 12.84,
              meet: "Invitational",
              date: "Mar 20, 2026",
              place: "2nd F",
              round: "Final",
              location: "Invitational",
              season: "outdoor",
            },
          ],
          allEventHistory: [
            {
              event: "100 Meter Dash",
              mark: "12.84",
              numericMark: 12.84,
              meet: "Invitational",
              date: "Mar 20, 2026",
              place: "2nd F",
              round: "Final",
              location: "Invitational",
              season: "outdoor",
            },
          ],
          notes: [],
        },
      ],
      skippedParticipants: [],
      results: [
        {
          athleteName: "Riley Chapman",
          teamName: "Example High School",
          winProbability: 0.62,
          podiumProbability: 0.95,
          expectedPlace: 1.48,
          averagePerformance: 12.93,
        },
      ],
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/simulate/event/from-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "100m",
          participantText: "Riley Chapman\nKarter Chapman",
          searchState: "VA",
          season: "outdoor",
          iterations: 5000,
          historyLimit: 5,
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.event).toBe("100m");
    expect(simulateMilesplitEventFromHistory).toHaveBeenCalledWith({
      event: "100m",
      participantText: "Riley Chapman\nKarter Chapman",
      searchState: "VA",
      season: "outdoor",
      iterations: 5000,
      historyLimit: 5,
    });
  });

  it("returns 400 when simulation fails", async () => {
    simulateMilesplitEventFromHistory.mockRejectedValue(new Error("unsupported event"));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/simulate/event/from-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "shot put", participantText: "A\nB" }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("unsupported event");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const getLatestRankingsWatch = vi.fn();

vi.mock("@/lib/rankings-store", () => ({
  getLatestRankingsWatch,
}));

describe("GET /api/milesplit/rankings/watch/latest", () => {
  beforeEach(() => {
    getLatestRankingsWatch.mockReset();
  });

  it("returns latest watch matches from stored snapshots", async () => {
    getLatestRankingsWatch.mockResolvedValue({
      snapshot: {
        id: "snap_1",
        label: "Riley HS Girls Outdoor",
        sourceUrl: "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026",
        state: "VA",
        level: "high-school-girls",
        season: "outdoor-track-and-field",
        year: "2026",
        accuracy: "all",
        grade: null,
        league: "3844",
        capturedAt: "2026-03-22T01:00:00.000Z",
        totalEvents: 13,
        trackedAthletes: ["Riley Chapman"],
      },
      athletes: [{ athlete: "Riley Chapman", matches: [] }],
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/milesplit/rankings/watch/latest?athletes=Riley%20Chapman&state=VA&level=high-school-girls&season=outdoor-track-and-field"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.snapshot.id).toBe("snap_1");
    expect(getLatestRankingsWatch).toHaveBeenCalledWith({
      athletes: ["Riley Chapman"],
      state: "VA",
      level: "high-school-girls",
      season: "outdoor-track-and-field",
    });
  });

  it("returns 400 without athletes", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/milesplit/rankings/watch/latest"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Provide at least one athlete");
  });
});

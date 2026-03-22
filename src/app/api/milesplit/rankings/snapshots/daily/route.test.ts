import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMilesplitRankingsTop10 = vi.fn();
const saveRankingsSnapshot = vi.fn();

vi.mock("@/lib/milesplit", () => ({
  fetchMilesplitRankingsTop10,
}));

vi.mock("@/lib/rankings-store", () => ({
  saveRankingsSnapshot,
}));

describe("POST /api/milesplit/rankings/snapshots/daily", () => {
  beforeEach(() => {
    fetchMilesplitRankingsTop10.mockReset();
    saveRankingsSnapshot.mockReset();
  });

  it("processes multiple daily jobs", async () => {
    fetchMilesplitRankingsTop10.mockResolvedValue({
      sourceUrl: "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026",
      exportedAt: "2026-03-22T01:00:00.000Z",
      totalEvents: 3,
      trackedAthletes: [],
      eventGroups: [],
      athleteSummaries: [],
    });
    saveRankingsSnapshot
      .mockResolvedValueOnce({
        id: "snap_1",
        label: "Riley",
        sourceUrl: "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026",
        capturedAt: new Date("2026-03-22T01:00:00.000Z"),
        totalEvents: 3,
      })
      .mockResolvedValueOnce({
        id: "snap_2",
        label: "Karter",
        sourceUrl: "https://va.milesplit.com/rankings/leaders/middle-school-boys/outdoor-track-and-field?year=2026",
        capturedAt: new Date("2026-03-22T01:05:00.000Z"),
        totalEvents: 3,
      });

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/milesplit/rankings/snapshots/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobs: [
          {
            label: "Riley",
            queryUrl: "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026",
            limit: 10,
            eventLimit: 3,
          },
          {
            label: "Karter",
            queryUrl: "https://va.milesplit.com/rankings/leaders/middle-school-boys/outdoor-track-and-field?year=2026",
            limit: 10,
            eventLimit: 3,
          },
        ],
      }),
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.jobsProcessed).toBe(2);
    expect(fetchMilesplitRankingsTop10).toHaveBeenCalledTimes(2);
  });
});

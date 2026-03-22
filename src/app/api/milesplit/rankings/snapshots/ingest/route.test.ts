import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMilesplitRankingsTop10 = vi.fn();
const saveRankingsSnapshot = vi.fn();

vi.mock("@/lib/milesplit", () => ({
  fetchMilesplitRankingsTop10,
}));

vi.mock("@/lib/rankings-store", () => ({
  saveRankingsSnapshot,
}));

describe("POST /api/milesplit/rankings/snapshots/ingest", () => {
  beforeEach(() => {
    fetchMilesplitRankingsTop10.mockReset();
    saveRankingsSnapshot.mockReset();
  });

  it("scrapes and stores a snapshot", async () => {
    fetchMilesplitRankingsTop10.mockResolvedValue({
      sourceUrl: "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026",
      exportedAt: "2026-03-22T01:00:00.000Z",
      totalEvents: 3,
      trackedAthletes: ["Riley Chapman"],
      eventGroups: [],
      athleteSummaries: [],
    });
    saveRankingsSnapshot.mockResolvedValue({
      id: "snap_1",
      sourceUrl: "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026",
      label: "Riley HS Girls Outdoor",
      capturedAt: new Date("2026-03-22T01:00:00.000Z"),
      totalEvents: 3,
      trackedAthletes: ["Riley Chapman"],
    });

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/milesplit/rankings/snapshots/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queryUrl: "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026",
        trackedAthletes: ["Riley Chapman"],
        limit: 10,
        eventLimit: 3,
        label: "Riley HS Girls Outdoor",
      }),
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.snapshotId).toBe("snap_1");
    expect(fetchMilesplitRankingsTop10).toHaveBeenCalled();
    expect(saveRankingsSnapshot).toHaveBeenCalled();
  });

  it("returns 400 when ingestion fails", async () => {
    fetchMilesplitRankingsTop10.mockRejectedValue(new Error("no query"));

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/milesplit/rankings/snapshots/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("no query");
  });
});

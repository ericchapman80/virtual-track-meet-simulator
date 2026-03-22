import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMilesplitRankingsTop10 = vi.fn();

vi.mock("@/lib/milesplit", () => ({
  fetchMilesplitRankingsTop10,
}));

describe("POST /api/milesplit/rankings/top10", () => {
  beforeEach(() => {
    fetchMilesplitRankingsTop10.mockReset();
  });

  it("returns top 10 event rankings JSON", async () => {
    fetchMilesplitRankingsTop10.mockResolvedValue({
      sourceUrl:
        "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=3844",
      exportedAt: "2026-03-21T22:59:05.012Z",
      totalEvents: 2,
      trackedAthletes: ["Riley Chapman"],
      eventGroups: [
        {
          section: "Track",
          event: "100m",
          eventUrl:
            "https://va.milesplit.com/rankings/events/high-school-girls/outdoor-track-and-field/100m",
          rows: [
            {
              rank: 1,
              event: "100m",
              eventUrl:
                "https://va.milesplit.com/rankings/events/high-school-girls/outdoor-track-and-field/100m",
              mark: "12.37",
              wind: "",
              athlete: "Kaelen Tucker",
              athleteUrl: "",
              team: "Brookville High School",
              teamUrl: "",
              grade: "2026",
              meet: "Campbell County Invitational",
              meetUrl: "",
              place: "1st F",
              date: "Mar 18, 2026",
            },
          ],
        },
      ],
      athleteSummaries: [{ athlete: "Riley Chapman", matches: [] }],
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/milesplit/rankings/top10", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryUrl:
            "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=3844",
          trackedAthletes: ["Riley Chapman"],
          limit: 10,
          eventLimit: 3,
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalEvents).toBe(2);
    expect(fetchMilesplitRankingsTop10).toHaveBeenCalledWith({
      queryUrl:
        "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=3844",
      trackedAthletes: ["Riley Chapman"],
      limit: 10,
      eventLimit: 3,
    });
  });

  it("returns 400 when scraper fails", async () => {
    fetchMilesplitRankingsTop10.mockRejectedValue(new Error("bad request"));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/milesplit/rankings/top10", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("bad request");
  });
});

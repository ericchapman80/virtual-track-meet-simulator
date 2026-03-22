import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMilesplitRankings = vi.fn();

vi.mock("@/lib/milesplit", () => ({
  DEFAULT_VIRGINIA_RANKINGS_QUERY: {
    state: "VA",
    level: "high-school-girls",
    season: "outdoor-track-and-field",
    year: "2026",
    accuracy: "all",
    league: "3844",
  },
  fetchMilesplitRankings,
}));

describe("GET /api/milesplit/rankings/va", () => {
  beforeEach(() => {
    fetchMilesplitRankings.mockReset();
  });

  it("returns rankings JSON", async () => {
    fetchMilesplitRankings.mockResolvedValue({
      url: "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=3844",
      title: "Virginia High School Girls Rankings | Outdoor Track And Field 2026 Leaders",
      exportedAt: "2026-03-21T22:59:05.012Z",
      totalRows: 1,
      filters: {
        state: "VA",
        level: "high-school-girls",
        season: "outdoor-track-and-field",
        year: "2026",
        accuracy: "all",
        league: "3844",
      },
      sections: [
        {
          section: "Track",
          rows: [
            {
              section: "Track",
              event: "100m",
              eventUrl: "https://va.milesplit.com/rankings/events/high-school-girls/outdoor-track-and-field/100m",
              mark: "12.37",
              wind: "",
              athlete: "Kaelen Tucker",
              athleteUrl: "https://va.milesplit.com/athletes/12591041-kaelen-tucker",
              team: "Brookville High School",
              teamUrl: "https://va.milesplit.com/teams/242-brookville-high-school",
              grade: "2026",
              meet: "Campbell County Invitational",
              meetUrl: "https://va.milesplit.com/meets/727577",
              place: "1st F",
              date: "Mar 18, 2026",
            },
          ],
        },
      ],
    });

    const { GET } = await import("./route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalRows).toBe(1);
    expect(data.sections[0].rows[0].event).toBe("100m");
    expect(fetchMilesplitRankings).toHaveBeenCalled();
  });

  it("returns 500 when scraper fails", async () => {
    fetchMilesplitRankings.mockRejectedValue(new Error("auth failed"));

    const { GET } = await import("./route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("auth failed");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMilesplitRankings = vi.fn();

vi.mock("@/lib/milesplit", () => ({
  fetchMilesplitRankings,
}));

describe("GET /api/milesplit/rankings", () => {
  beforeEach(() => {
    fetchMilesplitRankings.mockReset();
  });

  it("returns rankings JSON for query params", async () => {
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
          rows: [],
        },
      ],
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        "http://localhost/api/milesplit/rankings?state=VA&level=high-school-girls&season=outdoor-track-and-field&year=2026&accuracy=all&league=3844",
      ),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMilesplitRankings).toHaveBeenCalledWith({
      state: "VA",
      level: "high-school-girls",
      season: "outdoor-track-and-field",
      year: "2026",
      accuracy: "all",
      grade: undefined,
      league: "3844",
    });
    expect(data.filters.state).toBe("VA");
  });

  it("normalizes friendly query params", async () => {
    fetchMilesplitRankings.mockResolvedValue({
      url: "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=3844",
      title: "Virginia High School Girls Rankings | Outdoor Track And Field 2026 Leaders",
      exportedAt: "2026-03-21T22:59:05.012Z",
      totalRows: 0,
      filters: {
        state: "VA",
        level: "high-school-girls",
        season: "outdoor-track-and-field",
        year: "2026",
        accuracy: "all",
        grade: "",
        league: "3844",
      },
      sections: [],
    });

    const { GET } = await import("./route");
    await GET(
      new Request(
        "http://localhost/api/milesplit/rankings?state=Virginia&level=hs-girls&season=outdoor&year=2026&accuracy=ALL&grade=all&league=VHSL%20Class%203",
      ),
    );

    expect(fetchMilesplitRankings).toHaveBeenCalledWith({
      state: "VA",
      level: "high-school-girls",
      season: "outdoor-track-and-field",
      year: "2026",
      accuracy: "all",
      grade: "",
      league: "3844",
    });
  });

  it("returns 400 when required query params are missing", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/milesplit/rankings?state=VA"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required query param");
  });
});

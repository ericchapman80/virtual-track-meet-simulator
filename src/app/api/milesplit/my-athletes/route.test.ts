import { beforeEach, describe, expect, it, vi } from "vitest";

const listManagedAthletes = vi.fn();
const createManagedAthlete = vi.fn();

vi.mock("@/lib/managed-athletes", () => ({
  listManagedAthletes,
  createManagedAthlete,
}));

describe("GET /api/milesplit/my-athletes", () => {
  beforeEach(() => {
    listManagedAthletes.mockReset();
    createManagedAthlete.mockReset();
  });

  it("returns managed athletes", async () => {
    listManagedAthletes.mockResolvedValue([
      {
        id: "ath_1",
        name: "Riley Chapman",
        teamHint: "Abingdon",
        state: "VA",
        milesplitAthleteUrl: "https://va.milesplit.com/athletes/123-riley-chapman",
        createdAt: "2026-03-22T00:00:00.000Z",
        updatedAt: "2026-03-22T00:00:00.000Z",
      },
    ]);

    const { GET } = await import("./route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.athletes).toHaveLength(1);
  });

  it("creates a managed athlete", async () => {
    createManagedAthlete.mockResolvedValue({
      id: "ath_1",
      name: "Riley Chapman",
      teamHint: "Abingdon",
      state: "VA",
      milesplitAthleteUrl: "https://va.milesplit.com/athletes/123-riley-chapman",
      createdAt: "2026-03-22T00:00:00.000Z",
      updatedAt: "2026-03-22T00:00:00.000Z",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/milesplit/my-athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Riley Chapman",
          teamHint: "Abingdon",
          state: "VA",
          milesplitAthleteUrl: "https://va.milesplit.com/athletes/123-riley-chapman",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(createManagedAthlete).toHaveBeenCalledWith({
      name: "Riley Chapman",
      teamHint: "Abingdon",
      state: "VA",
      milesplitAthleteUrl: "https://va.milesplit.com/athletes/123-riley-chapman",
    });
    expect(data.id).toBe("ath_1");
  });
});

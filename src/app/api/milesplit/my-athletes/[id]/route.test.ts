import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteManagedAthlete = vi.fn();

vi.mock("@/lib/managed-athletes", () => ({
  deleteManagedAthlete,
}));

describe("DELETE /api/milesplit/my-athletes/[id]", () => {
  beforeEach(() => {
    deleteManagedAthlete.mockReset();
  });

  it("deletes a managed athlete", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost/api/milesplit/my-athletes/ath_1"), {
      params: Promise.resolve({ id: "ath_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(deleteManagedAthlete).toHaveBeenCalledWith("ath_1");
    expect(data.ok).toBe(true);
  });
});

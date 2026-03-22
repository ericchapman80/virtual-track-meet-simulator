import { beforeEach, describe, expect, it, vi } from "vitest";

const simulateHistoryJob = vi.fn();

vi.mock("@/lib/history-sim-jobs", () => ({
  simulateHistoryJob,
}));

describe("POST /api/simulate/event/from-history/jobs/[jobId]/simulate", () => {
  beforeEach(() => {
    simulateHistoryJob.mockReset();
  });

  it("runs simulation from resolved athletes", async () => {
    simulateHistoryJob.mockResolvedValue({
      id: "job_1",
      status: "completed",
      progressMessage: "Simulation complete",
      progressCurrent: 5,
      progressTotal: 5,
      requestPayload: { event: "Shot Put" },
      resultPayload: { canSimulate: true, results: [] },
      errorMessage: null,
      createdAt: "2026-03-22T00:00:00.000Z",
      updatedAt: "2026-03-22T00:01:00.000Z",
      completedAt: "2026-03-22T00:01:00.000Z",
      athletes: [],
    });

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/simulate/event/from-history/jobs/job_1/simulate", {
      method: "POST",
    }), {
      params: Promise.resolve({ jobId: "job_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("completed");
    expect(simulateHistoryJob).toHaveBeenCalledWith("job_1");
  });
});

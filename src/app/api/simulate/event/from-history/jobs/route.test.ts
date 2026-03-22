import { beforeEach, describe, expect, it, vi } from "vitest";

const createHistorySimulationJob = vi.fn();
const runHistoryResolutionJobInBackground = vi.fn();

vi.mock("@/lib/history-sim-jobs", () => ({
  createHistorySimulationJob,
  runHistoryResolutionJobInBackground,
}));

describe("POST /api/simulate/event/from-history/jobs", () => {
  beforeEach(() => {
    createHistorySimulationJob.mockReset();
    runHistoryResolutionJobInBackground.mockReset();
  });

  it("queues a background job", async () => {
    createHistorySimulationJob.mockResolvedValue({
      id: "job_1",
      status: "queued",
      progressMessage: "Queued",
      progressCurrent: null,
      progressTotal: null,
      requestPayload: { event: "Shot Put" },
      resultPayload: null,
      errorMessage: null,
      createdAt: "2026-03-22T02:00:00.000Z",
      updatedAt: "2026-03-22T02:00:00.000Z",
      completedAt: null,
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/simulate/event/from-history/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "Shot Put", participantText: "A\nB" }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data.id).toBe("job_1");
    expect(runHistoryResolutionJobInBackground).toHaveBeenCalledWith("job_1", {
      event: "Shot Put",
      participantText: "A\nB",
    });
  });
});

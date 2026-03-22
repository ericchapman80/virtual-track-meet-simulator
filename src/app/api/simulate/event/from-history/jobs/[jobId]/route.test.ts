import { beforeEach, describe, expect, it, vi } from "vitest";

const getHistorySimulationJob = vi.fn();
const rerunHistoryResolutionJob = vi.fn();

vi.mock("@/lib/history-sim-jobs", () => ({
  getHistorySimulationJob,
  rerunHistoryResolutionJob,
}));

describe("GET /api/simulate/event/from-history/jobs/[jobId]", () => {
  beforeEach(() => {
    getHistorySimulationJob.mockReset();
    rerunHistoryResolutionJob.mockReset();
  });

  it("returns job status", async () => {
    getHistorySimulationJob.mockResolvedValue({
      id: "job_1",
      status: "running",
      progressMessage: "Resolving athlete 4 of 15: Riley Chapman",
      progressCurrent: 4,
      progressTotal: 15,
      requestPayload: { event: "Shot Put" },
      resultPayload: null,
      errorMessage: null,
      createdAt: "2026-03-22T02:00:00.000Z",
      updatedAt: "2026-03-22T02:01:00.000Z",
      completedAt: null,
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/simulate/event/from-history/jobs/job_1"), {
      params: Promise.resolve({ jobId: "job_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("running");
    expect(data.progressCurrent).toBe(4);
  });

  it("returns 404 when the job is missing", async () => {
    getHistorySimulationJob.mockResolvedValue(null);

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/simulate/event/from-history/jobs/job_missing"), {
      params: Promise.resolve({ jobId: "job_missing" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("not found");
  });

  it("re-runs the job in place with manual matches", async () => {
    rerunHistoryResolutionJob.mockResolvedValue({
      id: "job_1",
      status: "resolving",
      progressMessage: "Re-running resolution with selected athlete override",
      progressCurrent: 0,
      progressTotal: 12,
      requestPayload: { event: "Shot Put" },
      resultPayload: null,
      errorMessage: null,
      createdAt: "2026-03-22T02:00:00.000Z",
      updatedAt: "2026-03-22T02:02:00.000Z",
      completedAt: null,
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/simulate/event/from-history/jobs/job_1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualMatches: [
            {
              requestedName: "Riley Chapman",
              teamHint: "Abingdon",
              athleteUrl: "https://va.milesplit.com/athletes/123-riley-chapman",
            },
          ],
        }),
      }),
      {
        params: Promise.resolve({ jobId: "job_1" }),
      },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(rerunHistoryResolutionJob).toHaveBeenCalledWith("job_1", {
      manualMatches: [
        {
          requestedName: "Riley Chapman",
          teamHint: "Abingdon",
          athleteUrl: "https://va.milesplit.com/athletes/123-riley-chapman",
        },
      ],
    });
    expect(data.status).toBe("resolving");
  });
});

import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/simulate", () => {
  it("returns simulation results for valid payload", async () => {
    const req = new Request("http://localhost/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        iterations: 100,
        entries: [
          { athleteName: "A", seedTime: 10.8 },
          { athleteName: "B", seedTime: 11.0 }
        ]
      })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.iterations).toBe(100);
    expect(data.results).toHaveLength(2);
  });

  it("returns 400 for invalid payload", async () => {
    const req = new Request("http://localhost/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: [{ athleteName: "Only", seedTime: 11.0 }] })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("At least two entries");
  });
});

import { describe, expect, it, vi } from "vitest";
import { runSprintMonteCarlo } from "@/lib/simulation";

describe("runSprintMonteCarlo", () => {
  it("throws when fewer than two entries are provided", () => {
    expect(() =>
      runSprintMonteCarlo([{ athleteName: "Only One", seedTime: 11.2 }], 100)
    ).toThrow("At least two entries are required for simulation.");
  });

  it("locks results for athletes with actualTime", () => {
    const results = runSprintMonteCarlo(
      [
        { athleteName: "A", seedTime: 10.9, actualTime: 10.5 },
        { athleteName: "B", seedTime: 10.7, actualTime: 10.7 },
        { athleteName: "C", seedTime: 10.8, actualTime: 10.9 }
      ],
      300
    );

    expect(results[0].athleteName).toBe("A");
    expect(results[0].winProbability).toBe(1);
    expect(results[0].averageTime).toBe(10.5);
  });

  it("uses random sampling when actualTime is not present", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const results = runSprintMonteCarlo(
      [
        { athleteName: "A", seedTime: 11, stdDev: 0.15 },
        { athleteName: "B", seedTime: 11.2, stdDev: 0.15 }
      ],
      10
    );

    expect(results).toHaveLength(2);
    expect(results[0].athleteName).toBe("A");
    randomSpy.mockRestore();
  });
});

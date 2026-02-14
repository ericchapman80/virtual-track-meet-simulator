"use client";

import { FormEvent, useState } from "react";
import { SimulationOutcome, SprintEntry } from "@/types/simulation";

const defaultEntries: SprintEntry[] = [
  { athleteName: "Athlete A", teamName: "Team Red", seedTime: 10.89, stdDev: 0.12 },
  { athleteName: "Athlete B", teamName: "Team Blue", seedTime: 10.95, stdDev: 0.15 },
  { athleteName: "Athlete C", teamName: "Team Green", seedTime: 11.02, stdDev: 0.1 },
  { athleteName: "Athlete D", teamName: "Team Gold", seedTime: 11.1, stdDev: 0.16 }
];

const liveMeetExample: SprintEntry[] = [
  { athleteName: "Athlete A", teamName: "Team Red", seedTime: 10.89, stdDev: 0.12, actualTime: 10.84 },
  { athleteName: "Athlete B", teamName: "Team Blue", seedTime: 10.95, stdDev: 0.15 },
  { athleteName: "Athlete C", teamName: "Team Green", seedTime: 11.02, stdDev: 0.1 },
  { athleteName: "Athlete D", teamName: "Team Gold", seedTime: 11.1, stdDev: 0.16 }
];

export default function Home() {
  const [iterations, setIterations] = useState(1000);
  const [entriesJson, setEntriesJson] = useState(JSON.stringify(defaultEntries, null, 2));
  const [results, setResults] = useState<SimulationOutcome[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      const entries = JSON.parse(entriesJson) as SprintEntry[];
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, iterations })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to run simulation");
      }

      setResults(data.results as SimulationOutcome[]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Invalid request");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-bold">Virtual Track Meet Simulator</h1>
      <p className="text-slate-700">
        Use this in two modes: pre-meet planning (seedTime/stdDev only) and live meet projection (add
        <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">actualTime</code>
        for completed athletes as results come in).
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEntriesJson(JSON.stringify(defaultEntries, null, 2))}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          Load planning example
        </button>
        <button
          type="button"
          onClick={() => setEntriesJson(JSON.stringify(liveMeetExample, null, 2))}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          Load live meet example
        </button>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border bg-white p-4 shadow-sm">
        <label className="grid gap-1">
          <span className="font-medium">Iterations</span>
          <input
            type="number"
            min={100}
            step={100}
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="grid gap-1">
          <span className="font-medium">Entries JSON</span>
          <textarea
            value={entriesJson}
            onChange={(e) => setEntriesJson(e.target.value)}
            rows={16}
            className="rounded border px-3 py-2 font-mono text-sm"
          />
        </label>

        <button type="submit" className="w-fit rounded bg-slate-900 px-4 py-2 font-medium text-white">
          Run simulation
        </button>
      </form>

      {error ? <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{error}</p> : null}

      {results.length > 0 ? (
        <section className="overflow-x-auto rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xl font-semibold">Results</h2>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2">Athlete</th>
                <th className="py-2">Team</th>
                <th className="py-2">Win %</th>
                <th className="py-2">Podium %</th>
                <th className="py-2">Expected Place</th>
                <th className="py-2">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.athleteName} className="border-b last:border-0">
                  <td className="py-2">{row.athleteName}</td>
                  <td className="py-2">{row.teamName ?? "-"}</td>
                  <td className="py-2">{(row.winProbability * 100).toFixed(1)}%</td>
                  <td className="py-2">{(row.podiumProbability * 100).toFixed(1)}%</td>
                  <td className="py-2">{row.expectedPlace.toFixed(2)}</td>
                  <td className="py-2">{row.averageTime.toFixed(3)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </main>
  );
}

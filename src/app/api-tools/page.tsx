"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

const defaultPath =
  "/api/milesplit/rankings/top10";

const defaultBody = JSON.stringify(
  {
    queryUrl:
      "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=3844",
    trackedAthletes: ["Riley Chapman", "Karter Chapman"],
    limit: 10,
    eventLimit: 3,
  },
  null,
  2,
);

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsvValue(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsvFromResponse(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  if ("sections" in data && Array.isArray((data as { sections?: unknown[] }).sections)) {
    const sections = (data as { sections: Array<{ section?: string; rows?: unknown[] }> }).sections;
    const header = [
      "section",
      "event",
      "mark",
      "wind",
      "athlete",
      "team",
      "grade",
      "meet",
      "date",
      "place",
      "eventUrl",
      "athleteUrl",
      "teamUrl",
      "meetUrl",
    ];
    const rows = sections.flatMap((section) =>
      (section.rows ?? []).map((row) => {
        const item = row as Record<string, unknown>;
        return [
          section.section ?? item.section ?? "",
          item.event ?? "",
          item.mark ?? "",
          item.wind ?? "",
          item.athlete ?? "",
          item.team ?? "",
          item.grade ?? "",
          item.meet ?? "",
          item.date ?? "",
          item.place ?? "",
          item.eventUrl ?? "",
          item.athleteUrl ?? "",
          item.teamUrl ?? "",
          item.meetUrl ?? "",
        ];
      }),
    );

    return [header, ...rows].map((row) => row.map((value) => toCsvValue(value as string | number)).join(",")).join("\n");
  }

  if ("eventGroups" in data && Array.isArray((data as { eventGroups?: unknown[] }).eventGroups)) {
    const eventGroups = (data as { eventGroups: Array<{ section?: string; event?: string; rows?: unknown[] }> }).eventGroups;
    const header = [
      "section",
      "event",
      "rank",
      "mark",
      "wind",
      "athlete",
      "team",
      "grade",
      "meet",
      "date",
      "place",
      "eventUrl",
      "athleteUrl",
      "teamUrl",
      "meetUrl",
    ];
    const rows = eventGroups.flatMap((group) =>
      (group.rows ?? []).map((row) => {
        const item = row as Record<string, unknown>;
        return [
          group.section ?? "",
          group.event ?? item.event ?? "",
          item.rank ?? "",
          item.mark ?? "",
          item.wind ?? "",
          item.athlete ?? "",
          item.team ?? "",
          item.grade ?? "",
          item.meet ?? "",
          item.date ?? "",
          item.place ?? "",
          item.eventUrl ?? "",
          item.athleteUrl ?? "",
          item.teamUrl ?? "",
          item.meetUrl ?? "",
        ];
      }),
    );

    return [header, ...rows].map((row) => row.map((value) => toCsvValue(value as string | number)).join(",")).join("\n");
  }

  return null;
}

export default function ApiToolsPage() {
  const [path, setPath] = useState(defaultPath);
  const [method, setMethod] = useState("POST");
  const [body, setBody] = useState(defaultBody);
  const [status, setStatus] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responseData, setResponseData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const responseRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (loading || status === null) {
      return;
    }

    responseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading, status]);

  const runRequest = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);
    setResponseText("");
    setResponseData(null);

    try {
      const response = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: method === "GET" || !body ? undefined : body,
      });

      const text = await response.text();
      setStatus(response.status);
      try {
        const parsed = JSON.parse(text);
        setResponseData(parsed);
        setResponseText(JSON.stringify(parsed, null, 2));
      } catch {
        setResponseText(text);
      }
    } catch (error) {
      setStatus(0);
      setResponseText(error instanceof Error ? error.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadJson = () => {
    if (!responseText) {
      return;
    }

    downloadFile("api-response.json", responseText, "application/json");
  };

  const downloadCsv = () => {
    const csv = buildCsvFromResponse(responseData);
    if (!csv) {
      return;
    }

    downloadFile("api-response.csv", csv, "text/csv;charset=utf-8");
  };

  const csvAvailable = Boolean(buildCsvFromResponse(responseData));
  const responseSummary =
    responseData && typeof responseData === "object"
      ? "eventGroups" in responseData && Array.isArray((responseData as { eventGroups?: unknown[] }).eventGroups)
        ? `${(responseData as { eventGroups: unknown[] }).eventGroups.length} event groups returned`
        : "sections" in responseData && Array.isArray((responseData as { sections?: unknown[] }).sections)
          ? `${(responseData as { sections: unknown[] }).sections.length} sections returned`
          : "results" in responseData && Array.isArray((responseData as { results?: unknown[] }).results)
            ? `${(responseData as { results: unknown[] }).results.length} simulation results returned`
            : null
      : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <header className="grid gap-2">
        <h1 className="text-3xl font-bold">API Tools</h1>
        <p className="text-slate-700">
          Browser-based endpoint tester for local development. Use relative paths like
          <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">/api/milesplit/rankings</code>.
        </p>
        <p className="text-sm text-slate-600">
          The leaders endpoint returns the single page leader for each event. Use
          <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">/api/milesplit/rankings/top10</code>
          when you want the full top-10 event tables.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPath(defaultPath)}
          title="Load a sample top-10 rankings POST request so you can test the scraper quickly from the browser."
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          Load rankings top 10 example
        </button>
        <button
          type="button"
          onClick={() => {
            setMethod("POST");
            setPath("/api/milesplit/rankings/top10");
            setBody(defaultBody);
          }}
          title="Load the same top-10 tracker request with tracked athletes prefilled. Expected output is eventGroups plus athleteSummaries."
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          Load rankings tracker example
        </button>
        <button
          type="button"
          onClick={() => {
            setMethod("POST");
            setPath("/api/milesplit/rankings/snapshots/daily");
            setBody(
              JSON.stringify(
                {
                  jobs: [
                    {
                      label: "Riley HS Girls Outdoor State",
                      queryUrl:
                        "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=3844",
                      trackedAthletes: ["Riley Chapman"],
                      limit: 10,
                      eventLimit: 3,
                    },
                    {
                      label: "Riley HS Girls Outdoor Region",
                      queryUrl:
                        "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=6461",
                      trackedAthletes: ["Riley Chapman"],
                      limit: 10,
                      eventLimit: 3,
                    },
                    {
                      label: "Riley HS Girls Indoor Region",
                      queryUrl:
                        "https://va.milesplit.com/rankings/leaders/high-school-girls/indoor-track-and-field?year=2026&league=6461",
                      trackedAthletes: ["Riley Chapman"],
                      limit: 10,
                      eventLimit: 3,
                    },
                    {
                      label: "Karter MS Boys Outdoor State",
                      queryUrl:
                        "https://va.milesplit.com/rankings/leaders/middle-school-boys/outdoor-track-and-field?year=2026&accuracy=fat&league=3844",
                      trackedAthletes: ["Karter Chapman"],
                      limit: 10,
                      eventLimit: 3,
                    },
                    {
                      label: "Karter MS Boys Outdoor Region",
                      queryUrl:
                        "https://va.milesplit.com/rankings/leaders/middle-school-boys/outdoor-track-and-field?year=2026&accuracy=fat&league=6461",
                      trackedAthletes: ["Karter Chapman"],
                      limit: 10,
                      eventLimit: 3,
                    },
                  ],
                },
                null,
                2,
              ),
            );
          }}
          title="Load a database-backed daily ingestion payload. Expected output is one stored snapshot record per job."
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          Load daily ingest example
        </button>
        <button
          type="button"
          onClick={() => {
            setMethod("GET");
            setPath("/api/milesplit/rankings/watch/latest?athletes=Riley%20Chapman,Karter%20Chapman&state=VA&level=high-school-girls&season=outdoor-track-and-field");
            setBody("");
          }}
          title="Load a query for the latest stored rankings snapshot and athlete matches. Use after ingestion to verify stored watch results."
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          Load latest watch example
        </button>
        <button
          type="button"
          onClick={() => {
            setMethod("GET");
            setPath("/api/milesplit/rankings?state=Virginia&level=hs-girls&season=outdoor&year=2026&accuracy=all&league=VHSL Class 3");
            setBody("");
          }}
          title="Load the leaders endpoint example. This returns the leaders page rows only, not expanded top-10 event tables."
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          Load leaders example
        </button>
        <button
          type="button"
          onClick={() => setPath("/api/health")}
          title="Load the health-check endpoint. Expected output is a simple service status payload."
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          Load health example
        </button>
        <button
          type="button"
          onClick={() => {
            setMethod("POST");
            setPath("/api/simulate");
            setBody(
              JSON.stringify(
                {
                  iterations: 100,
                  entries: [
                    { athleteName: "A", seedTime: 10.8 },
                    { athleteName: "B", seedTime: 11.0 },
                  ],
                },
                null,
                2,
              ),
            );
          }}
          title="Load a direct Monte Carlo simulation example using manual seed entries instead of MileSplit history."
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          Load simulate example
        </button>
        <button
          type="button"
          onClick={() => {
            setMethod("POST");
            setPath("/api/simulate/event/from-history");
            setBody(
              JSON.stringify(
                    {
                      event: "Shot Put",
                      searchState: "VA",
                      season: "outdoor",
                      iterations: 5000,
                      historyLimit: 5,
                      seedStrategy: "previous-season",
                      participantText:
                        "Abby Leonhard | Mount Gilead\nSarah Antrom | Forest TC\nBrianna Miller | MD Jaguars\nKensington Jones | SWVA TC\nJihan Lewis | Clover Hill TC\nCadyn Castel | Freedom TC\nKaylee Mcconic | Texas Pressure T&F\nHeaven Mitchell | Unattached\nAlonna Frederick | Charles B. Aycock\nLauren Curry | Unattached\nMallory Kauffman | Unattached\nSofia Whitaker | Wolverine TC\nAleigha Sullivan | Unattached\nAdair Para | Unattached\nRiley Chapman | Abingdon",
                    },
                null,
                2,
              ),
            );
          }}
          title="Load a direct history-simulation request. Expected output is resolved athletes, PR and average inputs, and simulation results."
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          Load history simulate example
        </button>
        <button
          type="button"
          onClick={() => {
            setMethod("POST");
            setPath("/api/simulate/event/from-history/jobs");
            setBody(
              JSON.stringify(
                    {
                      event: "Shot Put",
                      searchState: "VA",
                      season: "outdoor",
                      iterations: 5000,
                      historyLimit: 5,
                      seedStrategy: "previous-season",
                      participantText:
                        "Riley Chapman | Abingdon\nAbby Leonhard | Mount Gilead\nSarah Antrom | Forest TC\nBrianna Miller | MD Jaguars\nKensington Jones | SWVA TC",
                    },
                null,
                2,
              ),
            );
          }}
          title="Load the background job start request for history simulation. Expected output is a queued job id that you can poll."
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          Load history job example
        </button>
        <button
          type="button"
          onClick={() => {
            setMethod("GET");
            setPath("/api/simulate/event/from-history/jobs/replace-with-job-id");
            setBody("");
          }}
          title="Load the history-job status endpoint template. Replace the placeholder id with a real job id to poll progress and final results."
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          Load history job status example
        </button>
      </div>

      <form onSubmit={runRequest} className="grid gap-4 rounded-lg border bg-white p-4 shadow-sm">
        <label className="grid gap-1">
          <span className="font-medium">Path</span>
          <input
            type="text"
            value={path}
            onChange={(event) => setPath(event.target.value)}
            title="Relative local endpoint path to call, including query string for GET requests."
            className="rounded border px-3 py-2 font-mono text-sm"
          />
        </label>

        <label className="grid gap-1">
          <span className="font-medium">Method</span>
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            title="HTTP method for the request. Use GET for read endpoints and POST when sending a JSON body."
            className="w-fit rounded border px-3 py-2"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="font-medium">JSON Body</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={10}
            title="JSON request body for POST calls. Expected output depends on the endpoint, for example stored snapshots, simulation jobs, or rankings tables."
            className="rounded border px-3 py-2 font-mono text-sm"
            placeholder='{"example":true}'
          />
        </label>

        <button
          type="submit"
          title="Send the current request and render the formatted JSON response below."
          className="w-fit rounded bg-slate-900 px-4 py-2 font-medium text-white"
        >
          {loading ? "Running..." : "Send request"}
        </button>

        {status !== null ? (
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p>
              Status: <span className="font-semibold">{status}</span>
            </p>
            {responseSummary ? <p>{responseSummary}</p> : null}
          </div>
        ) : null}
      </form>

      <section ref={responseRef} className="grid gap-3 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Response</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadJson}
              disabled={!responseText}
              title="Download the current response panel as a JSON file."
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download JSON
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!csvAvailable}
              title="Download the current response as CSV when the payload contains rankings sections or event groups."
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download CSV
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-600">Status: {status === null ? "Not run yet" : status}</p>
        <pre className="overflow-x-auto rounded bg-slate-950 p-4 text-sm text-slate-100">
          {responseText || "No response yet"}
        </pre>
      </section>
    </main>
  );
}

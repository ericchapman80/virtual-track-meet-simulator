"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CompetitionOutcome, SimulationOutcome, SprintEntry } from "@/types/simulation";

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

const historyTestField = `Riley Chapman | Abingdon
Abby Leonhard | Mount Gilead
Sarah Antrom | Forest TC
Brianna Miller | MD Jaguars
Kensington Jones | SWVA TC`;

type HistorySimulationResults = {
  event: string;
  searchState: string;
  season: string;
  eventType: "time" | "field";
  performanceUnit: "seconds" | "inches";
  iterations: number;
  historyLimit: number;
  canSimulate: boolean;
  warningMessage: string | null;
  generatedAt: string;
    entrants: Array<{
      requestedName: string;
      resolvedName: string;
      athleteUrl: string;
      team: string;
      personalRecord: number;
      previousSeasonAverage: number | null;
      seasonAverage: number;
      allTimeAverage: number;
      seedPerformance: number;
      seedBasis: string;
      stdDev: number;
      confidence: "url" | "exact" | "team-hint" | "first-result";
    history: Array<{
      event: string;
      mark: string;
      numericMark: number | null;
      meet: string;
      date: string;
      place: string;
      round: string;
      location: string;
        season: string;
      }>;
      allEventHistory: Array<{
        event: string;
        mark: string;
        numericMark: number | null;
        meet: string;
        date: string;
        place: string;
        round: string;
        location: string;
        season: string;
      }>;
      notes: string[];
    }>;
  skippedParticipants: Array<{
    requestedName: string;
    reason: string;
    searchMatches?: Array<{
      athlete: string;
      athleteUrl: string;
      team: string;
      previewMark: string;
      classOf?: number | null;
    }>;
  }>;
  results: Array<CompetitionOutcome>;
};

type HistorySimulationJob = {
  id: string;
  status: string;
  progressMessage: string | null;
  progressCurrent: number | null;
  progressTotal: number | null;
  athletes: Array<{
    id: string;
    sortOrder: number;
    requestedName: string;
    teamHint: string | null;
    status: string;
    resolvedName: string | null;
    athleteUrl: string | null;
    team: string | null;
    confidence: string | null;
    personalRecord: number | null;
    previousSeasonAverage: number | null;
    seasonAverage: number | null;
    allTimeAverage: number | null;
    seedPerformance: number | null;
    seedBasis: string | null;
    stdDev: number | null;
    notes: string[];
    reason: string | null;
    searchMatches: unknown;
  }>;
  resultPayload: HistorySimulationResults | null;
  errorMessage: string | null;
};

type ManagedAthlete = {
  id: string;
  name: string;
  teamHint: string | null;
  state: string | null;
  milesplitAthleteUrl: string;
  createdAt: string;
  updatedAt: string;
};

type ManualHistoryMatch = {
  requestedName: string;
  teamHint?: string;
  athleteUrl: string;
};

const defaultDailyJobs = JSON.stringify(
  {
    jobs: [
      {
        label: "Riley HS Girls Outdoor State",
        queryUrl:
          "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=3844",
        trackedAthletes: ["Riley Chapman"],
        limit: 10,
      },
      {
        label: "Riley HS Girls Outdoor Region",
        queryUrl:
          "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=6461",
        trackedAthletes: ["Riley Chapman"],
        limit: 10,
      },
      {
        label: "Riley HS Girls Indoor Region",
        queryUrl:
          "https://va.milesplit.com/rankings/leaders/high-school-girls/indoor-track-and-field?year=2026&league=6461",
        trackedAthletes: ["Riley Chapman"],
        limit: 10,
      },
      {
        label: "Karter MS Boys Outdoor State",
        queryUrl:
          "https://va.milesplit.com/rankings/leaders/middle-school-boys/outdoor-track-and-field?year=2026&accuracy=fat&league=3844",
        trackedAthletes: ["Karter Chapman"],
        limit: 10,
      },
      {
        label: "Karter MS Boys Outdoor Region",
        queryUrl:
          "https://va.milesplit.com/rankings/leaders/middle-school-boys/outdoor-track-and-field?year=2026&accuracy=fat&league=6461",
        trackedAthletes: ["Karter Chapman"],
        limit: 10,
      },
    ],
  },
  null,
  2,
);

type WorkspaceMode = "simulator" | "rankings" | "athletes";

export default function WorkspacePage({ mode }: { mode: WorkspaceMode }) {
  const [themeMode, setThemeMode] = useState<"system" | "light" | "dark">("system");
  const [iterations, setIterations] = useState(1000);
  const [entriesJson, setEntriesJson] = useState(JSON.stringify(defaultEntries, null, 2));
  const [results, setResults] = useState<SimulationOutcome[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rankingsQueryUrl, setRankingsQueryUrl] = useState(
    "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=3844"
  );
  const [trackedAthletes, setTrackedAthletes] = useState("Riley Chapman\nKarter Chapman");
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [rankingsError, setRankingsError] = useState<string | null>(null);
  const [historyEvent, setHistoryEvent] = useState("Shot Put");
  const [historySearchState, setHistorySearchState] = useState("");
  const [historySeason, setHistorySeason] = useState("outdoor");
  const [historyIterations, setHistoryIterations] = useState(5000);
  const [historyLimit, setHistoryLimit] = useState(5);
  const [historySeedStrategy, setHistorySeedStrategy] = useState<"previous-season" | "current-season" | "all-time">("previous-season");
  const [historyParticipants, setHistoryParticipants] = useState(`Abby Leonhard | Mount Gilead
Sarah Antrom | Forest TC
Brianna Miller | MD Jaguars
Kensington Jones | SWVA TC
Jihan Lewis | Clover Hill TC
Cadyn Castel | Freedom TC
Kaylee Mcconic | Texas Pressure T&F
Heaven Mitchell | Unattached
Alonna Frederick | Charles B. Aycock
Lauren Curry | Unattached
Mallory Kauffman | Unattached
Sofia Whitaker | Wolverine TC
Aleigha Sullivan | Unattached
Adair Para | Unattached
Riley Chapman | Abingdon`);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyResults, setHistoryResults] = useState<HistorySimulationResults | null>(null);
  const [historyJob, setHistoryJob] = useState<HistorySimulationJob | null>(null);
  const [historyJobId, setHistoryJobId] = useState<string | null>(null);
  const [historyProgressMessage, setHistoryProgressMessage] = useState<string | null>(null);
  const [historyProgressCurrent, setHistoryProgressCurrent] = useState<number | null>(null);
  const [historyProgressTotal, setHistoryProgressTotal] = useState<number | null>(null);

  const formatAveragePerformance = (value: number, unit: "seconds" | "inches") => {
    if (unit === "seconds") {
      return `${value.toFixed(3)}s`;
    }

    const feet = Math.floor(value / 12);
    const inches = value - feet * 12;
    return `${feet}-${inches.toFixed(2)}`;
  };
  const formatPerformanceInterval = (low: number, high: number, unit: "seconds" | "inches") =>
    `${formatAveragePerformance(low, unit)} to ${formatAveragePerformance(high, unit)}`;
  const [rankingsResults, setRankingsResults] = useState<{
    sourceUrl: string;
    exportedAt: string;
    totalEvents: number;
    trackedAthletes: string[];
    eventGroups: Array<{
      section: string;
      event: string;
      eventUrl: string;
      rows: Array<{
        rank: number;
        event: string;
        eventUrl: string;
        mark: string;
        wind: string;
        athlete: string;
        athleteUrl: string;
        team: string;
        teamUrl: string;
        grade: string;
        meet: string;
        meetUrl: string;
        place: string;
        date: string;
      }>;
    }>;
    athleteSummaries: Array<{
      athlete: string;
      matches: Array<{
        rank: number;
        event: string;
        mark: string;
        team: string;
        grade: string;
        meet: string;
        date: string;
        place: string;
      }>;
    }>;
  } | null>(null);
  const [snapshotJobsJson, setSnapshotJobsJson] = useState(defaultDailyJobs);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [snapshotResults, setSnapshotResults] = useState<{
    ranAt: string;
    jobsProcessed: number;
    results: Array<{
      snapshotId: string;
      label: string | null;
      sourceUrl: string;
      capturedAt: string;
      totalEvents: number;
    }>;
  } | null>(null);
  const [watchAthletes, setWatchAthletes] = useState("Riley Chapman\nKarter Chapman");
  const [watchState, setWatchState] = useState("VA");
  const [watchLevel, setWatchLevel] = useState("high-school-girls");
  const [watchSeason, setWatchSeason] = useState("outdoor-track-and-field");
  const [watchLoading, setWatchLoading] = useState(false);
  const [watchError, setWatchError] = useState<string | null>(null);
  const [managedAthletes, setManagedAthletes] = useState<ManagedAthlete[]>([]);
  const [managedAthletesLoading, setManagedAthletesLoading] = useState(false);
  const [managedAthletesError, setManagedAthletesError] = useState<string | null>(null);
  const [managedAthleteName, setManagedAthleteName] = useState("");
  const [managedAthleteTeamHint, setManagedAthleteTeamHint] = useState("");
  const [managedAthleteState, setManagedAthleteState] = useState("VA");
  const [managedAthleteUrl, setManagedAthleteUrl] = useState("");
  const [candidateSelections, setCandidateSelections] = useState<Record<string, string>>({});
  const [candidateReviewMessage, setCandidateReviewMessage] = useState<string | null>(null);
  const [historyManualMatches, setHistoryManualMatches] = useState<ManualHistoryMatch[]>([]);
  const [watchResults, setWatchResults] = useState<{
    snapshot: {
      id: string;
      label: string | null;
      sourceUrl: string;
      state: string;
      level: string;
      season: string;
      year: string | null;
      accuracy: string | null;
      grade: string | null;
      league: string | null;
      capturedAt: string;
      totalEvents: number;
      trackedAthletes: string[];
    } | null;
    athletes: Array<{
      athlete: string;
      matches: Array<{
        section: string;
        event: string;
        rank: number;
        mark: string;
        team: string | null;
        grade: string | null;
        meet: string | null;
        date: string | null;
        eventUrl: string;
        athleteUrl: string | null;
      }>;
    }>;
  } | null>(null);

  const candidateReviewAthletes =
    historyJob?.athletes.filter(
      (athlete) =>
        athlete.status === "skipped" &&
        typeof athlete.reason === "string" &&
        (athlete.reason.includes("Multiple exact-name candidates") ||
          athlete.reason.includes("No confident MileSplit athlete match found")) &&
        Array.isArray(athlete.searchMatches) &&
        athlete.searchMatches.length > 0,
    ) ?? [];

  const queueHistoryResolution = async (manualMatchesOverride?: ManualHistoryMatch[]) => {
    const response = await fetch("/api/simulate/event/from-history/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: historyEvent,
        searchState: historySearchState,
        season: historySeason,
        iterations: historyIterations,
        historyLimit: historyLimit,
        seedStrategy: historySeedStrategy,
        participantText: historyParticipants,
        manualMatches: manualMatchesOverride ?? historyManualMatches,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to simulate from MileSplit history");
    }

    setHistoryJobId(data.id);
    setHistoryJob(data);
    setHistoryProgressMessage(data.progressMessage ?? "Queued");
  };

  const loadManagedAthletes = async () => {
    setManagedAthletesLoading(true);
    setManagedAthletesError(null);

    try {
      const response = await fetch("/api/milesplit/my-athletes");
      const data = (await response.json()) as { athletes?: ManagedAthlete[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load My Athletes");
      }
      setManagedAthletes(data.athletes ?? []);
    } catch (submitError) {
      setManagedAthletesError(submitError instanceof Error ? submitError.message : "Failed to load My Athletes");
    } finally {
      setManagedAthletesLoading(false);
    }
  };

  useEffect(() => {
    void loadManagedAthletes();
  }, []);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("vtms-theme");
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
      setThemeMode(storedTheme);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolved = themeMode === "system" ? (media.matches ? "dark" : "light") : themeMode;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };

    applyTheme();
    window.localStorage.setItem("vtms-theme", themeMode);
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [themeMode]);

  useEffect(() => {
    if (!historyJobId || !historyLoading) {
      return;
    }

    const pollJob = async () => {
      const response = await fetch(`/api/simulate/event/from-history/jobs/${historyJobId}`);
      const data = (await response.json()) as HistorySimulationJob | { error?: string };

      if (!response.ok) {
        setHistoryError(
          "error" in data && typeof data.error === "string"
            ? data.error
            : `Failed to load history simulation progress (${response.status})`
        );
        setHistoryLoading(false);
        return;
      }

      const job = data as HistorySimulationJob;
      setHistoryJob(job);
      setHistoryProgressMessage(job.progressMessage);
      setHistoryProgressCurrent(job.progressCurrent);
      setHistoryProgressTotal(job.progressTotal);

      if ((job.status === "resolved" || job.status === "completed") && job.resultPayload) {
        setHistoryResults(job.resultPayload);
        setHistoryLoading(false);
      } else if (job.status === "failed") {
        setHistoryError(job.errorMessage ?? "History simulation failed");
        setHistoryLoading(false);
      }
    };

    void pollJob();
    const intervalId = window.setInterval(() => {
      void pollJob();
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [historyJobId, historyLoading]);

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

  const onRankingsSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setRankingsError(null);
    setRankingsLoading(true);

    try {
      const athleteList = trackedAthletes
        .split("\n")
        .map((name) => name.trim())
        .filter(Boolean);

      const response = await fetch("/api/milesplit/rankings/top10", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryUrl: rankingsQueryUrl,
          trackedAthletes: athleteList,
          limit: 10
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to fetch rankings");
      }

      setRankingsResults(data);
    } catch (submitError) {
      setRankingsError(submitError instanceof Error ? submitError.message : "Invalid rankings request");
    } finally {
      setRankingsLoading(false);
    }
  };

  const onHistorySimSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setHistoryError(null);
    setHistoryLoading(true);
    setHistoryResults(null);
    setHistoryJob(null);
    setHistoryProgressMessage("Queueing simulation");
    setHistoryProgressCurrent(null);
    setHistoryProgressTotal(null);

    try {
      await queueHistoryResolution();
    } catch (submitError) {
      setHistoryError(submitError instanceof Error ? submitError.message : "Invalid history simulation request");
      setHistoryLoading(false);
    }
  };

  const onHistoryRunSimulation = async () => {
    if (!historyJobId) {
      return;
    }

    setHistoryError(null);
    setHistoryLoading(true);
    setHistoryProgressMessage("Running simulation from resolved seeds");

    try {
      const response = await fetch(`/api/simulate/event/from-history/jobs/${historyJobId}/simulate`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to run simulation from resolved athletes");
      }

      setHistoryJob(data);
      if (data.resultPayload) {
        setHistoryResults(data.resultPayload);
      }
      setHistoryLoading(false);
    } catch (submitError) {
      setHistoryError(submitError instanceof Error ? submitError.message : "Failed to run simulation");
      setHistoryLoading(false);
    }
  };

  const onManagedAthleteSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setManagedAthletesError(null);
    setManagedAthletesLoading(true);

    try {
      const response = await fetch("/api/milesplit/my-athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: managedAthleteName,
          teamHint: managedAthleteTeamHint,
          state: managedAthleteState,
          milesplitAthleteUrl: managedAthleteUrl,
        }),
      });
      const data = (await response.json()) as ManagedAthlete | { error?: string };
      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Failed to save athlete");
      }

      setManagedAthleteName("");
      setManagedAthleteTeamHint("");
      setManagedAthleteState("VA");
      setManagedAthleteUrl("");
      await loadManagedAthletes();
    } catch (submitError) {
      setManagedAthletesError(submitError instanceof Error ? submitError.message : "Failed to save athlete");
      setManagedAthletesLoading(false);
    }
  };

  const onManagedAthleteDelete = async (id: string) => {
    setManagedAthletesError(null);
    setManagedAthletesLoading(true);

    try {
      const response = await fetch(`/api/milesplit/my-athletes/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete athlete");
      }

      await loadManagedAthletes();
    } catch (submitError) {
      setManagedAthletesError(submitError instanceof Error ? submitError.message : "Failed to delete athlete");
      setManagedAthletesLoading(false);
    }
  };

  const selectedCandidateEntries = candidateReviewAthletes
    .map((athlete) => ({
      athlete,
      selectedUrl: candidateSelections[athlete.id],
    }))
    .filter((entry): entry is { athlete: HistorySimulationJob["athletes"][number]; selectedUrl: string } => Boolean(entry.selectedUrl));

  const rerunResolution = async (message: string, manualMatchesOverride?: ManualHistoryMatch[]) => {
    setHistoryError(null);
    setHistoryLoading(true);
    setHistoryProgressMessage(message);
    setHistoryProgressCurrent(null);
    setHistoryProgressTotal(null);

    if (historyJobId) {
      const response = await fetch(`/api/simulate/event/from-history/jobs/${historyJobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualMatches: manualMatchesOverride ?? historyManualMatches,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to re-run history simulation job");
      }
      setHistoryJob(data);
      setHistoryProgressMessage(data.progressMessage ?? message);
      return;
    }

    await queueHistoryResolution(manualMatchesOverride);
  };

  const onUseSelectedForThisRun = async () => {
    if (selectedCandidateEntries.length === 0) {
      setCandidateReviewMessage("Select at least one athlete candidate first.");
      return;
    }

    setCandidateReviewMessage(null);
    const nextManualMatches = [...historyManualMatches];
    for (const entry of selectedCandidateEntries) {
      const keyName = entry.athlete.requestedName;
      const keyTeam = entry.athlete.teamHint ?? "";
      const existingIndex = nextManualMatches.findIndex(
        (item) => item.requestedName === keyName && (item.teamHint ?? "") === keyTeam,
      );
      const manualMatch = {
        requestedName: keyName,
        teamHint: entry.athlete.teamHint ?? undefined,
        athleteUrl: entry.selectedUrl,
      };
      if (existingIndex >= 0) {
        nextManualMatches[existingIndex] = manualMatch;
      } else {
        nextManualMatches.push(manualMatch);
      }
    }
    setHistoryManualMatches(nextManualMatches);

    try {
      await rerunResolution("Re-running resolution with temporary athlete selections", nextManualMatches);
      setCandidateSelections({});
      setCandidateReviewMessage("Applied selected candidates for this run and re-ran resolution.");
    } catch (submitError) {
      setCandidateReviewMessage(
        submitError instanceof Error ? submitError.message : "Failed to apply selected athlete profiles",
      );
      setHistoryLoading(false);
    }
  };

  const onSaveSelectedToMyAthletes = async () => {
    if (selectedCandidateEntries.length === 0) {
      setCandidateReviewMessage("Select at least one athlete candidate first.");
      return;
    }

    setCandidateReviewMessage(null);
    setManagedAthletesLoading(true);

    try {
      for (const entry of selectedCandidateEntries) {
        await fetch("/api/milesplit/my-athletes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: entry.athlete.requestedName,
            teamHint: entry.athlete.teamHint ?? "",
            state: historySearchState || undefined,
            milesplitAthleteUrl: entry.selectedUrl,
          }),
        }).then(async (response) => {
          const data = (await response.json()) as { error?: string };
          if (!response.ok) {
            throw new Error(data.error ?? `Failed to save ${entry.athlete.requestedName}`);
          }
        });
      }

      await loadManagedAthletes();
      setCandidateSelections({});
      const nextManualMatches = [...historyManualMatches];
      for (const entry of selectedCandidateEntries) {
        const keyName = entry.athlete.requestedName;
        const keyTeam = entry.athlete.teamHint ?? "";
        const existingIndex = nextManualMatches.findIndex(
          (item) => item.requestedName === keyName && (item.teamHint ?? "") === keyTeam,
        );
        const manualMatch = {
          requestedName: keyName,
          teamHint: entry.athlete.teamHint ?? undefined,
          athleteUrl: entry.selectedUrl,
        };
        if (existingIndex >= 0) {
          nextManualMatches[existingIndex] = manualMatch;
        } else {
          nextManualMatches.push(manualMatch);
        }
      }
      setHistoryManualMatches(nextManualMatches);
      await rerunResolution("Re-running resolution with saved athlete selections", nextManualMatches);
      setCandidateReviewMessage("Saved selected athlete profiles to My Athletes and re-ran resolution.");
    } catch (submitError) {
      setCandidateReviewMessage(
        submitError instanceof Error ? submitError.message : "Failed to save selected athlete profiles",
      );
      setManagedAthletesLoading(false);
    }
  };

  const onSnapshotIngestSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSnapshotError(null);
    setSnapshotLoading(true);

    try {
      const payload = JSON.parse(snapshotJobsJson);
      const response = await fetch("/api/milesplit/rankings/snapshots/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to ingest rankings snapshots");
      }

      setSnapshotResults(data);
    } catch (submitError) {
      setSnapshotError(submitError instanceof Error ? submitError.message : "Invalid snapshot job request");
    } finally {
      setSnapshotLoading(false);
    }
  };

  const onLoadWatchSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setWatchError(null);
    setWatchLoading(true);

    try {
      const athletes = watchAthletes
        .split("\n")
        .map((athlete) => athlete.trim())
        .filter(Boolean)
        .join(",");

      const params = new URLSearchParams({
        athletes,
        state: watchState,
        level: watchLevel,
        season: watchSeason,
      });

      const response = await fetch(`/api/milesplit/rankings/watch/latest?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load latest stored watch");
      }

      setWatchResults(data);
    } catch (submitError) {
      setWatchError(submitError instanceof Error ? submitError.message : "Invalid watch request");
    } finally {
      setWatchLoading(false);
    }
  };

  const showSimulator = mode === "simulator";
  const showRankings = mode === "rankings";
  const showAthletes = mode === "athletes";

  return (
    <main className="app-shell flex flex-col gap-6">
      <header className="panel sticky top-3 z-30 overflow-hidden p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              <span>Monte Carlo Meet Lab</span>
              <span className="rounded-full px-2 py-1" style={{ border: "1px solid var(--border)" }}>
                Responsive rankings + simulation workspace
              </span>
            </div>
            <div className="grid gap-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                Virtual Track Meet Simulator
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted sm:text-base">
                Plan meets, monitor rankings, and seed events from MileSplit history in one mobile-ready
                workspace. The simulator supports pre-meet planning and live meet updates.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:justify-items-end">
            <div className="flex flex-wrap gap-2">
              {showSimulator ? (
                <details className="panel-strong px-3 py-2 text-sm">
                  <summary className="cursor-pointer list-none font-medium">Quick Load</summary>
                  <div className="mt-3 grid min-w-56 gap-2">
                    <button
                      type="button"
                      onClick={() => setEntriesJson(JSON.stringify(defaultEntries, null, 2))}
                      className="button-secondary text-left text-sm"
                    >
                      Planning example
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntriesJson(JSON.stringify(liveMeetExample, null, 2))}
                      className="button-secondary text-left text-sm"
                    >
                      Live meet example
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryParticipants(historyTestField)}
                      className="button-secondary text-left text-sm"
                    >
                      History sim test field
                    </button>
                  </div>
                </details>
              ) : null}

              <details className="panel-strong px-3 py-2 text-sm">
                <summary className="cursor-pointer list-none font-medium">Navigate</summary>
                <div className="mt-3 grid min-w-56 gap-2">
                  <Link href="/" className="button-secondary text-left text-sm">
                    Dashboard
                  </Link>
                  <Link href="/simulator" className="button-secondary text-left text-sm">
                    Simulator
                  </Link>
                  <Link href="/rankings" className="button-secondary text-left text-sm">
                    Rankings
                  </Link>
                  <Link href="/athletes" className="button-secondary text-left text-sm">
                    My Athletes
                  </Link>
                  <Link href="/api-tools" className="button-secondary text-left text-sm">
                    API tools
                  </Link>
                </div>
              </details>

              <label className="panel-strong flex items-center gap-2 px-3 py-2 text-sm">
                <span className="font-medium">Theme</span>
                <select
                  value={themeMode}
                  onChange={(event) => setThemeMode(event.target.value as "system" | "light" | "dark")}
                  className="bg-transparent"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
            </div>

            <div className="hidden flex-wrap gap-2 lg:flex">
              <Link href="/" className="button-secondary text-sm">Dashboard</Link>
              <Link href="/simulator" className={`button-secondary text-sm ${showSimulator ? "font-semibold" : ""}`}>Simulator</Link>
              <Link href="/rankings" className={`button-secondary text-sm ${showRankings ? "font-semibold" : ""}`}>Rankings</Link>
              <Link href="/athletes" className={`button-secondary text-sm ${showAthletes ? "font-semibold" : ""}`}>My Athletes</Link>
              <Link href="/api-tools" className="button-secondary text-sm">API Tools</Link>
            </div>

            <label className="panel-strong flex items-center gap-3 px-3 py-2 text-sm lg:hidden">
              <span className="font-medium">Go to</span>
              <select
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) {
                    window.location.href = event.target.value;
                  }
                  event.currentTarget.value = "";
                }}
                className="min-w-40 bg-transparent"
              >
                <option value="" disabled>
                  Select page
                </option>
                <option value="/">Dashboard</option>
                <option value="/simulator">Simulator</option>
                <option value="/rankings">Rankings</option>
                <option value="/athletes">My Athletes</option>
                <option value="/api-tools">API tools</option>
              </select>
            </label>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {showSimulator ? (
          <>
            <div className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Meet Planning</p>
              <p className="mt-2 text-sm text-muted">Run pre-meet seed simulations or update live projections as marks come in.</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">History Seeding</p>
              <p className="mt-2 text-sm text-muted">Resolve athletes, inspect PR and average inputs, then simulate with review-first controls.</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Result Confidence</p>
              <p className="mt-2 text-sm text-muted">Compare expected place, most likely place, and 95% performance intervals side by side.</p>
            </div>
          </>
        ) : null}
        {showRankings ? (
          <>
            <div className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Rankings Tracker</p>
              <p className="mt-2 text-sm text-muted">Pull top-10 event lists from MileSplit leader pages and highlight tracked athletes.</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Stored Watch</p>
              <p className="mt-2 text-sm text-muted">Persist ranking snapshots and compare Riley and Karter against the latest stored state.</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Snapshot Jobs</p>
              <p className="mt-2 text-sm text-muted">Batch daily ingestion jobs so the live scraper is not your only source of truth.</p>
            </div>
          </>
        ) : null}
        {showAthletes ? (
          <>
            <div className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">My Athletes</p>
              <p className="mt-2 text-sm text-muted">Save exact MileSplit profile URLs for Riley, Karter, and any recurring team athletes.</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Duplicate Control</p>
              <p className="mt-2 text-sm text-muted">Use these saved identities to avoid ambiguous national-search matches in future simulations.</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Reusable Directory</p>
              <p className="mt-2 text-sm text-muted">The athlete directory is shared across simulation and ranking workflows.</p>
            </div>
          </>
        ) : null}
      </section>

      {showSimulator ? (
      <form id="simulator" onSubmit={onSubmit} className="panel grid gap-4 p-4 sm:p-6">
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
      ) : null}

      {showSimulator && error ? <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{error}</p> : null}

      {showSimulator && results.length > 0 ? (
        <section className="panel overflow-x-auto p-4 sm:p-6">
          <h2 className="mb-3 text-xl font-semibold">Results</h2>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2">Athlete</th>
                <th className="py-2">Team</th>
                <th className="py-2">Win %</th>
                <th className="py-2">Podium %</th>
                <th className="py-2">Expected Place</th>
                <th className="py-2">Most Likely Place</th>
                <th className="py-2">Avg Time</th>
                <th className="py-2">95% Interval</th>
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
                  <td className="py-2">{row.mostLikelyPlace}</td>
                  <td className="py-2">{row.averageTime.toFixed(3)}s</td>
                  <td className="py-2">
                    {row.timeIntervalLow.toFixed(3)}s to {row.timeIntervalHigh.toFixed(3)}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {showRankings ? (
      <section id="rankings-tracker" className="panel grid gap-4 p-4 sm:p-6">
        <div className="grid gap-1">
          <h2 className="text-2xl font-semibold">Rankings Tracker</h2>
          <p className="text-slate-700">
            Point this at a MileSplit leaders query, then pull the top 10 for every event page and
            highlight tracked athletes. This is the piece to watch Riley and Karter against division,
            region, or state-level filters.
          </p>
        </div>

        <form onSubmit={onRankingsSubmit} className="grid gap-4">
          <label className="grid gap-1">
            <span className="font-medium">MileSplit leaders query URL</span>
            <input
              type="text"
              value={rankingsQueryUrl}
              onChange={(e) => setRankingsQueryUrl(e.target.value)}
              className="rounded border px-3 py-2 font-mono text-sm"
            />
          </label>

          <label className="grid gap-1">
            <span className="font-medium">Tracked athletes</span>
            <textarea
              value={trackedAthletes}
              onChange={(e) => setTrackedAthletes(e.target.value)}
              rows={4}
              className="rounded border px-3 py-2 font-mono text-sm"
            />
          </label>

          <button
            type="submit"
            className="w-fit rounded bg-slate-900 px-4 py-2 font-medium text-white"
          >
            {rankingsLoading ? "Loading rankings..." : "Fetch top 10 by event"}
          </button>
        </form>

        {rankingsError ? (
          <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{rankingsError}</p>
        ) : null}

        {rankingsResults ? (
          <div className="grid gap-6">
            <section className="grid gap-2 rounded border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xl font-semibold">Tracker summary</h3>
              <p className="text-sm text-slate-700">Source: {rankingsResults.sourceUrl}</p>
              <p className="text-sm text-slate-700">Events scanned: {rankingsResults.totalEvents}</p>
              <p className="text-sm text-slate-700">Exported at: {rankingsResults.exportedAt}</p>
            </section>

            <section className="grid gap-3">
              <h3 className="text-xl font-semibold">Tracked athlete matches</h3>
              {rankingsResults.athleteSummaries.map((summary) => (
                <div key={summary.athlete} className="rounded border border-slate-200 p-4">
                  <h4 className="font-semibold">{summary.athlete}</h4>
                  {summary.matches.length > 0 ? (
                    <ul className="mt-2 grid gap-2 text-sm">
                      {summary.matches.map((match) => (
                        <li key={`${summary.athlete}-${match.event}-${match.rank}`} className="rounded bg-slate-50 p-2">
                          #{match.rank} in {match.event}: {match.mark} for {match.team} at {match.meet} on {match.date} ({match.place})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">No top-10 matches in this query yet.</p>
                  )}
                </div>
              ))}
            </section>

            <section className="grid gap-4">
              <h3 className="text-xl font-semibold">Event top 10 tables</h3>
              {rankingsResults.eventGroups.map((group) => (
                <div key={`${group.section}-${group.event}`} className="overflow-x-auto rounded border border-slate-200 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm uppercase tracking-wide text-slate-500">{group.section}</p>
                      <h4 className="text-lg font-semibold">{group.event}</h4>
                    </div>
                    <a href={group.eventUrl} className="text-sm text-blue-700 underline">
                      Open event page
                    </a>
                  </div>
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2">Rank</th>
                        <th className="py-2">Mark</th>
                        <th className="py-2">Athlete</th>
                        <th className="py-2">Team</th>
                        <th className="py-2">Grade</th>
                        <th className="py-2">Meet</th>
                        <th className="py-2">Date</th>
                        <th className="py-2">Place</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => {
                        const tracked = rankingsResults.trackedAthletes.some(
                          (athlete) => athlete.trim().toLowerCase() === row.athlete.trim().toLowerCase()
                        );

                        return (
                          <tr
                            key={`${group.event}-${row.rank}-${row.athlete}-${row.meet}`}
                            className={`border-b last:border-0 ${tracked ? "bg-amber-50" : ""}`}
                          >
                            <td className="py-2">{row.rank}</td>
                            <td className="py-2">{row.mark}</td>
                            <td className="py-2">{row.athlete || "-"}</td>
                            <td className="py-2">{row.team || "-"}</td>
                            <td className="py-2">{row.grade || "-"}</td>
                            <td className="py-2">{row.meet || "-"}</td>
                            <td className="py-2">{row.date || "-"}</td>
                            <td className="py-2">{row.place || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </section>
          </div>
        ) : null}
      </section>
      ) : null}

      {showAthletes ? (
      <section id="my-athletes" className="panel grid gap-4 p-4 sm:p-6">
        <div className="grid gap-1">
          <h2 className="text-2xl font-semibold">My Athletes</h2>
          <p className="text-slate-700">
            Store exact MileSplit athlete profile links for your team members here. The history simulator
            checks this table first before doing a live MileSplit search, which makes Riley/Karter and
            other duplicate-name cases much more reliable.
          </p>
        </div>

        <form onSubmit={onManagedAthleteSubmit} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1">
              <span className="font-medium">Athlete name</span>
              <input
                type="text"
                value={managedAthleteName}
                onChange={(e) => setManagedAthleteName(e.target.value)}
                className="rounded border px-3 py-2"
                placeholder="Riley Chapman"
                title="Exact athlete name used in meet entries or pasted participant lists."
              />
            </label>

            <label className="grid gap-1">
              <span className="font-medium">Team or club</span>
              <input
                type="text"
                value={managedAthleteTeamHint}
                onChange={(e) => setManagedAthleteTeamHint(e.target.value)}
                className="rounded border px-3 py-2"
                placeholder="Abingdon"
                title="Optional team or club hint used to disambiguate duplicate names inside your directory."
              />
            </label>

            <label className="grid gap-1">
              <span className="font-medium">State</span>
              <input
                type="text"
                value={managedAthleteState}
                onChange={(e) => setManagedAthleteState(e.target.value.toUpperCase())}
                maxLength={2}
                className="rounded border px-3 py-2"
                placeholder="VA"
                title="Optional two-letter home state to help you remember which athlete profile is the right one."
              />
            </label>

            <label className="grid gap-1 md:col-span-2 xl:col-span-1">
              <span className="font-medium">MileSplit athlete URL</span>
              <input
                type="url"
                value={managedAthleteUrl}
                onChange={(e) => setManagedAthleteUrl(e.target.value)}
                className="rounded border px-3 py-2 font-mono text-sm"
                placeholder="https://va.milesplit.com/athletes/..."
                title="Exact MileSplit athlete profile URL. This is what the resolver uses before any live search."
              />
            </label>
          </div>

          <button
            type="submit"
            className="w-fit rounded bg-slate-900 px-4 py-2 font-medium text-white"
            title="Save this athlete to the local directory so future history simulations can resolve them deterministically."
          >
            {managedAthletesLoading ? "Saving..." : "Save to My Athletes"}
          </button>
        </form>

        {managedAthletesError ? (
          <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{managedAthletesError}</p>
        ) : null}

        <section className="overflow-x-auto rounded border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xl font-semibold">Saved athlete directory</h3>
            <button
              type="button"
              onClick={() => void loadManagedAthletes()}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
              title="Refresh the saved directory from the database."
            >
              {managedAthletesLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {managedAthletes.length === 0 ? (
            <p className="text-sm text-slate-600">No athletes saved yet.</p>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Name</th>
                  <th className="py-2">Team</th>
                  <th className="py-2">State</th>
                  <th className="py-2">Profile</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {managedAthletes.map((athlete) => (
                  <tr key={athlete.id} className="border-b last:border-0">
                    <td className="py-2">{athlete.name}</td>
                    <td className="py-2">{athlete.teamHint ?? "-"}</td>
                    <td className="py-2">{athlete.state ?? "-"}</td>
                    <td className="py-2">
                      <a href={athlete.milesplitAthleteUrl} className="text-blue-700 underline">
                        Open profile
                      </a>
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => void onManagedAthleteDelete(athlete.id)}
                        className="rounded border border-slate-300 bg-white px-3 py-1 text-sm"
                        title="Remove this athlete from the local directory."
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </section>
      ) : null}

      {showSimulator ? (
      <section id="history-sim" className="panel grid gap-4 p-4 sm:p-6">
        <div className="grid gap-1">
          <h2 className="text-2xl font-semibold">Event Simulator From MileSplit History</h2>
          <p className="text-slate-700">
            Paste athletes line by line, resolve their MileSplit profiles, pull recent event history,
            derive seeds, then feed those seeds into the Monte Carlo simulator.
          </p>
          <p className="text-sm text-slate-600">
            Line format: athlete name, or
            <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">Athlete Name | Team Hint</code>.
            Supports common time and field events including Shot Put.
          </p>
          <p className="text-sm text-slate-600">
            Current seed rule: use the athlete&apos;s PR and selected-event average together, with more
            weight on PR for upside and average for stability.
          </p>
          <p className="text-sm text-slate-600">
            You can also paste meet-sheet text blocks with lane or position rows followed by team lines.
          </p>
          <p className="text-sm text-slate-600">
            Leave state blank for nationwide athlete search. History depth is the number of most recent
            same-event results used in the average component of the seed.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setHistoryParticipants(historyTestField)}
            title="Load a smaller 5-athlete sample so you can verify nationwide search, athlete resolution, seed inputs, and simulation output quickly."
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
          >
            Load smaller test field
          </button>
          <button
            type="button"
            onClick={() => setHistoryParticipants(`Abby Leonhard | Mount Gilead
Sarah Antrom | Forest TC
Brianna Miller | MD Jaguars
Kensington Jones | SWVA TC
Jihan Lewis | Clover Hill TC
Cadyn Castel | Freedom TC
Kaylee Mcconic | Texas Pressure T&F
Heaven Mitchell | Unattached
Alonna Frederick | Charles B. Aycock
Lauren Curry | Unattached
Mallory Kauffman | Unattached
Sofia Whitaker | Wolverine TC
Aleigha Sullivan | Unattached
Adair Para | Unattached
Riley Chapman | Abingdon`)}
            title="Load the larger meet field to test the full workflow: athlete lookup, PR and average calculation, and final simulation results."
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
          >
            Load full field
          </button>
        </div>

        <form onSubmit={onHistorySimSubmit} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="grid gap-1">
              <span className="font-medium">Event</span>
              <input
                type="text"
                value={historyEvent}
                onChange={(e) => setHistoryEvent(e.target.value)}
                title="Enter the event name exactly as you want to simulate it, for example Shot Put, 100m, or 300m. The app uses this to find matching results on each athlete profile."
                className="rounded border px-3 py-2"
              />
            </label>

            <label className="grid gap-1">
              <span className="font-medium">State</span>
              <input
                type="text"
                value={historySearchState}
                onChange={(e) => setHistorySearchState(e.target.value)}
                placeholder="Blank = nationwide"
                title="Optional. Leave blank to search all MileSplit states nationwide. Fill in VA or another state only if you want to narrow athlete matching."
                className="rounded border px-3 py-2"
              />
            </label>

            <label className="grid gap-1">
              <span className="font-medium">Season</span>
              <select
                value={historySeason}
                onChange={(e) => setHistorySeason(e.target.value)}
                title="Choose which season context to prefer when finding event results. This affects which results are considered current season or previous season for seeding."
                className="rounded border px-3 py-2"
              >
                <option value="outdoor">Outdoor</option>
                <option value="indoor">Indoor</option>
                <option value="xc">XC</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="font-medium">Iterations</span>
              <input
                type="number"
                min={100}
                step={100}
                value={historyIterations}
                onChange={(e) => setHistoryIterations(Number(e.target.value))}
                title="How many Monte Carlo simulations to run. Higher numbers are more stable but slower. Expected output includes win %, podium %, expected place, and average simulated mark or time."
                className="rounded border px-3 py-2"
              />
            </label>

            <label className="grid gap-1">
              <span className="font-medium">History depth</span>
              <input
                type="number"
                min={2}
                max={10}
                value={historyLimit}
                onChange={(e) => setHistoryLimit(Number(e.target.value))}
                title="How many of the athlete's most recent same-event results are used in the average component of the seed. Lower values react more to recent form; higher values smooth the average."
                className="rounded border px-3 py-2"
              />
            </label>

            <label className="grid gap-1">
              <span className="font-medium">Seed method</span>
              <select
                value={historySeedStrategy}
                onChange={(e) =>
                  setHistorySeedStrategy(e.target.value as "previous-season" | "current-season" | "all-time")
                }
                title="Choose which average to blend with the athlete's PR when creating the simulation seed: previous season, current season, or all-time."
                className="rounded border px-3 py-2"
              >
                <option value="previous-season">PR + previous season avg</option>
                <option value="current-season">PR + current season avg</option>
                <option value="all-time">PR + all-time avg</option>
              </select>
            </label>
          </div>

          <label className="grid gap-1">
            <span className="font-medium">Participants</span>
            <textarea
              value={historyParticipants}
              onChange={(e) => setHistoryParticipants(e.target.value)}
              rows={6}
              title="Paste athlete names and teams or clubs. Supported formats: 'Athlete | Team Hint' or meet-sheet blocks with numbered athlete lines followed by team lines. Expected output is a resolved athlete list with profile links, PR, averages, and simulation results."
              className="rounded border px-3 py-2 font-mono text-sm"
            />
          </label>

          <button
            type="submit"
            title="Start a background job that resolves athletes, pulls MileSplit event history, and builds a seed worksheet you can review before simulation."
            className="w-fit rounded bg-slate-900 px-4 py-2 font-medium text-white"
          >
            {historyLoading ? "Resolving athletes..." : "Resolve athletes and build worksheet"}
          </button>
        </form>

        {historyError ? (
          <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{historyError}</p>
        ) : null}

        {historyLoading ? (
          <section className="grid gap-2 rounded border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-xl font-semibold">Resolution progress</h3>
            <p className="text-sm text-blue-900">{historyProgressMessage ?? "Working..."}</p>
            {historyProgressCurrent !== null && historyProgressTotal !== null ? (
              <p className="text-sm text-blue-900">
                {historyProgressCurrent} of {historyProgressTotal}
              </p>
            ) : null}
            {historyJobId ? (
              <p className="text-xs text-blue-800">Job id: {historyJobId}</p>
            ) : null}
          </section>
        ) : null}

        {historyJob && historyJob.athletes.length > 0 ? (
          <section className="overflow-x-auto rounded border border-slate-200 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold">Per-athlete progress</h3>
              {historyJob.status === "resolved" && historyResults?.canSimulate ? (
                <button
                  type="button"
                  onClick={onHistoryRunSimulation}
                  title="Run Monte Carlo using the resolved athlete worksheet and derived seeds."
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Run simulation from worksheet
                </button>
              ) : null}
            </div>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Requested</th>
                  <th className="py-2">Team Hint</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Resolved</th>
                  <th className="py-2">Team</th>
                  <th className="py-2">PR</th>
                  <th className="py-2">Seed</th>
                  <th className="py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {historyJob.athletes.map((athlete) => (
                  <tr key={athlete.id} className="border-b last:border-0">
                    <td className="py-2">{athlete.requestedName}</td>
                    <td className="py-2">{athlete.teamHint ?? "-"}</td>
                    <td className="py-2">{athlete.status}</td>
                    <td className="py-2">
                      {athlete.athleteUrl ? (
                        <a href={athlete.athleteUrl} className="text-blue-700 underline">
                          {athlete.resolvedName ?? "-"}
                        </a>
                      ) : (
                        athlete.resolvedName ?? "-"
                      )}
                    </td>
                    <td className="py-2">{athlete.team ?? "-"}</td>
                    <td className="py-2">
                      {typeof athlete.personalRecord === "number" && historyResults
                        ? formatAveragePerformance(athlete.personalRecord, historyResults.performanceUnit)
                        : "-"}
                    </td>
                    <td className="py-2">
                      {typeof athlete.seedPerformance === "number" && historyResults
                        ? formatAveragePerformance(athlete.seedPerformance, historyResults.performanceUnit)
                        : "-"}
                    </td>
                    <td className="py-2">{athlete.reason ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {candidateReviewAthletes.length > 0 ? (
          <section className="grid gap-3 rounded border border-amber-200 bg-amber-50 p-4">
            <div className="grid gap-1">
              <h3 className="text-xl font-semibold">Candidate review</h3>
              <p className="text-sm text-slate-700">
                These athletes were not auto-resolved because MileSplit returned multiple plausible same-name
                candidates or no confident match could be selected.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-700">
                Choose the correct athlete profile, then either use it for this run only or save it to{" "}
                <span className="font-medium">My Athletes</span>.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void onUseSelectedForThisRun()}
                  className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium"
                  title="Apply the selected athlete profiles to this simulation only, then re-run resolution without saving them permanently."
                >
                  Use For This Run
                </button>
                <button
                  type="button"
                  onClick={() => void onSaveSelectedToMyAthletes()}
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                  title="Save the selected candidate profiles to My Athletes so future simulations resolve them directly."
                >
                  Save To My Athletes
                </button>
              </div>
            </div>
            {candidateReviewMessage ? (
              <p className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">{candidateReviewMessage}</p>
            ) : null}
            <div className="overflow-x-auto rounded bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4">Select</th>
                    <th className="py-2 pr-4">Requested</th>
                    <th className="py-2 pr-4">Team Hint</th>
                    <th className="py-2 pr-4">Reason</th>
                    <th className="py-2 pr-4">Candidate</th>
                    <th className="py-2 pr-4">Candidate Team</th>
                    <th className="py-2 pr-4">Class Of</th>
                    <th className="py-2 pr-4">Preview</th>
                    <th className="py-2">Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {candidateReviewAthletes
                    .flatMap((athlete) =>
                      (athlete.searchMatches as Array<{ athlete?: string; athleteUrl?: string; team?: string; previewMark?: string; classOf?: number | null }>).map(
                        (match, index) => (
                          <tr key={`${athlete.id}-${match.athleteUrl ?? index}`} className="border-b last:border-0">
                            <td className="py-2 pr-4 align-top">
                              <input
                                type="checkbox"
                                checked={candidateSelections[athlete.id] === (match.athleteUrl ?? "")}
                                onChange={(event) => {
                                  setCandidateReviewMessage(null);
                                  setCandidateSelections((current) => {
                                    const next = { ...current };
                                    if (!match.athleteUrl) {
                                      return next;
                                    }
                                    if (event.target.checked) {
                                      next[athlete.id] = match.athleteUrl;
                                    } else {
                                      delete next[athlete.id];
                                    }
                                    return next;
                                  });
                                }}
                              />
                            </td>
                            <td className="py-2 pr-4 align-top">{athlete.requestedName}</td>
                            <td className="py-2 pr-4 align-top">{athlete.teamHint ?? "-"}</td>
                            <td className="py-2 pr-4 align-top">{athlete.reason ?? "Manual review required"}</td>
                            <td className="py-2 pr-4 align-top">{match.athlete ?? "Unknown athlete"}</td>
                            <td className="py-2 pr-4 align-top">{match.team ?? "-"}</td>
                            <td className="py-2 pr-4 align-top">{match.classOf ?? "-"}</td>
                            <td className="py-2 pr-4 align-top">{match.previewMark || "-"}</td>
                            <td className="py-2 align-top">
                              {match.athleteUrl ? (
                                <a
                                  href={match.athleteUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-700 underline"
                                >
                                  Open athlete page
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ),
                      ),
                    )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {historyResults ? (
          <div className="grid gap-6">
            <section className="grid gap-2 rounded border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xl font-semibold">Worksheet summary</h3>
              <p className="text-sm text-slate-700">
                {historyResults.event} | {historyResults.searchState} | {historyResults.season} |{" "}
                {historyResults.iterations.toLocaleString()} iterations
              </p>
              <p className="text-sm text-slate-700">
                {historyResults.entrants.length} seeded athletes, {historyResults.skippedParticipants.length} skipped
              </p>
              <p className="text-sm text-slate-700">Generated at: {historyResults.generatedAt}</p>
            </section>

            {historyResults.warningMessage ? (
              <section className="rounded border border-amber-200 bg-amber-50 p-4 text-amber-900">
                {historyResults.warningMessage}
              </section>
            ) : null}

            {historyJob?.status === "completed" && historyResults.canSimulate ? (
              <section className="overflow-x-auto rounded border border-slate-200 p-4">
                <h3 className="mb-3 text-xl font-semibold">Projected results</h3>
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2">Athlete</th>
                      <th className="py-2">Team</th>
                      <th className="py-2">PR</th>
                      <th className="py-2">Win %</th>
                      <th className="py-2">Podium %</th>
                      <th className="py-2">Expected Place</th>
                      <th className="py-2">Most Likely Place</th>
                      <th className="py-2">
                        {historyResults.performanceUnit === "seconds" ? "Avg Time" : "Avg Mark"}
                      </th>
                      <th className="py-2">95% Interval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyResults.results.map((row) => {
                      const entrant = historyResults.entrants.find((candidate) => candidate.resolvedName === row.athleteName);

                      return (
                        <tr key={row.athleteName} className="border-b last:border-0">
                          <td className="py-2">{row.athleteName}</td>
                          <td className="py-2">{row.teamName ?? "-"}</td>
                          <td className="py-2">
                            {entrant
                              ? formatAveragePerformance(entrant.personalRecord, historyResults.performanceUnit)
                              : "-"}
                          </td>
                          <td className="py-2">{(row.winProbability * 100).toFixed(1)}%</td>
                          <td className="py-2">{(row.podiumProbability * 100).toFixed(1)}%</td>
                          <td className="py-2">{row.expectedPlace.toFixed(2)}</td>
                          <td className="py-2">{row.mostLikelyPlace}</td>
                          <td className="py-2">
                            {formatAveragePerformance(row.averagePerformance, historyResults.performanceUnit)}
                          </td>
                          <td className="py-2">
                            {formatPerformanceInterval(
                              row.performanceIntervalLow,
                              row.performanceIntervalHigh,
                              historyResults.performanceUnit,
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ) : null}

            <section className="grid gap-3">
              <h3 className="text-xl font-semibold">Resolved athletes and seed inputs</h3>
              {historyResults.entrants.map((entrant) => (
                <div key={`${entrant.requestedName}-${entrant.athleteUrl}`} className="rounded border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-semibold">
                        {entrant.requestedName} {"->"} {entrant.resolvedName}
                      </h4>
                      <p className="text-sm text-slate-600">
                        {entrant.team || "Unknown team"} | match {entrant.confidence}
                      </p>
                    </div>
                    <a href={entrant.athleteUrl} className="text-sm text-blue-700 underline">
                      Open athlete page
                    </a>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm md:grid-cols-4">
                    <div className="rounded bg-slate-50 p-3">
                      <p
                        className="text-slate-500"
                        title="Personal record for the selected event across all matched MileSplit history. For timed events this is the fastest mark; for field events it is the best mark."
                      >
                        PR
                      </p>
                      <p className="font-semibold">
                        {formatAveragePerformance(entrant.personalRecord, historyResults.performanceUnit)}
                      </p>
                    </div>
                    <div className="rounded bg-slate-50 p-3">
                      <p
                        className="text-slate-500"
                        title="Average used from the history bucket selected by the seed method. This is the stability component blended with PR to create the simulation seed."
                      >
                        Selected Average
                      </p>
                      <p className="font-semibold">
                        {formatAveragePerformance(entrant.seasonAverage, historyResults.performanceUnit)}
                      </p>
                    </div>
                    <div className="rounded bg-slate-50 p-3">
                      <p
                        className="text-slate-500"
                        title="Average from the previous same-season year when enough results exist. This is shown so you can compare current form to prior-season form."
                      >
                        Previous Season Average
                      </p>
                      <p className="font-semibold">
                        {entrant.previousSeasonAverage === null
                          ? "-"
                          : formatAveragePerformance(entrant.previousSeasonAverage, historyResults.performanceUnit)}
                      </p>
                    </div>
                    <div className="rounded bg-slate-50 p-3">
                      <p
                        className="text-slate-500"
                        title="Average across all matched event history on the athlete profile, capped by the selected history depth."
                      >
                        All-Time Average
                      </p>
                      <p className="font-semibold">
                        {formatAveragePerformance(entrant.allTimeAverage, historyResults.performanceUnit)}
                      </p>
                    </div>
                    <div className="rounded bg-slate-50 p-3">
                      <p
                        className="text-slate-500"
                        title="The derived mark or time actually fed into the Monte Carlo simulation. It blends PR with the selected average to balance upside and stability."
                      >
                        Simulation Seed
                      </p>
                      <p className="font-semibold">
                        {formatAveragePerformance(entrant.seedPerformance, historyResults.performanceUnit)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{entrant.seedBasis}</p>
                    </div>
                  </div>

                  {entrant.notes.length > 0 ? (
                    <ul className="mt-3 grid gap-2 text-sm text-amber-800">
                      {entrant.notes.map((note) => (
                        <li key={note} className="rounded bg-amber-50 p-2">
                          {note}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2">Season</th>
                          <th className="py-2">Mark</th>
                          <th className="py-2">Meet</th>
                          <th className="py-2">Date</th>
                          <th className="py-2">Place</th>
                          <th className="py-2">Round</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entrant.history.map((entry, index) => (
                          <tr key={`${entrant.resolvedName}-${entry.date}-${index}`} className="border-b last:border-0">
                            <td className="py-2">{entry.season || "-"}</td>
                            <td className="py-2">
                              {entry.mark}
                              {typeof entry.numericMark === "number" ? (
                                <span className="ml-2 text-slate-500">
                                  ({formatAveragePerformance(entry.numericMark, historyResults.performanceUnit)})
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2">{entry.meet || entry.location || "-"}</td>
                            <td className="py-2">{entry.date || "-"}</td>
                            <td className="py-2">{entry.place || "-"}</td>
                            <td className="py-2">{entry.round || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </section>

            {historyResults.skippedParticipants.length > 0 ? (
              <section className="grid gap-3">
                <h3 className="text-xl font-semibold">Skipped participants</h3>
                {historyResults.skippedParticipants.map((participant) => (
                  <div key={participant.requestedName} className="rounded border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold">{participant.requestedName}</p>
                    <p className="text-sm text-amber-900">{participant.reason}</p>
                    {participant.searchMatches && participant.searchMatches.length > 0 ? (
                      <ul className="mt-2 grid gap-2 text-sm">
                        {participant.searchMatches.slice(0, 3).map((match) => (
                          <li key={match.athleteUrl} className="rounded bg-white p-2">
                            {match.athlete} | {match.team || "Unknown team"} | {match.previewMark || "No preview"}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </section>
            ) : null}
          </div>
        ) : null}
      </section>
      ) : null}

      {showRankings ? (
      <section id="stored-watch" className="panel grid gap-4 p-4 sm:p-6">
        <div className="grid gap-1">
          <h2 className="text-2xl font-semibold">Stored Rankings Watch</h2>
          <p className="text-slate-700">
            Ingest full outdoor top-10 rankings snapshots into the database, then read Riley and Karter
            from the latest stored snapshot without scraping live pages again.
          </p>
        </div>

        <form onSubmit={onSnapshotIngestSubmit} className="grid gap-4">
          <label className="grid gap-1">
            <span className="font-medium">Daily ingestion jobs JSON</span>
            <textarea
              value={snapshotJobsJson}
              onChange={(e) => setSnapshotJobsJson(e.target.value)}
              rows={16}
              title="Paste one or more snapshot jobs. Each job should include a label, MileSplit leaders query URL, tracked athletes, and top-N limit. Expected output is stored rankings snapshots in the database."
              className="rounded border px-3 py-2 font-mono text-sm"
            />
          </label>

          <button
            type="submit"
            title="Run one or more rankings-ingestion jobs. The app scrapes each leaders query, expands event pages, stores the top results in the database, and returns snapshot ids."
            className="w-fit rounded bg-slate-900 px-4 py-2 font-medium text-white"
          >
            {snapshotLoading ? "Ingesting snapshots..." : "Run snapshot ingestion"}
          </button>
        </form>

        {snapshotError ? (
          <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{snapshotError}</p>
        ) : null}

        {snapshotResults ? (
          <section className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-xl font-semibold">Latest ingestion run</h3>
            <p className="text-sm text-slate-700">
              {snapshotResults.jobsProcessed} jobs processed at {snapshotResults.ranAt}
            </p>
            <ul className="grid gap-2 text-sm">
              {snapshotResults.results.map((result) => (
                <li key={result.snapshotId} className="rounded bg-white p-3">
                  <span className="font-semibold">{result.label ?? "Snapshot"}</span>
                  {" | "}events: {result.totalEvents}
                  {" | "}captured: {result.capturedAt}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <form onSubmit={onLoadWatchSubmit} className="grid gap-4 rounded border border-slate-200 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1">
              <span className="font-medium">State</span>
              <input
                type="text"
                value={watchState}
                onChange={(e) => setWatchState(e.target.value)}
                title="Stored-snapshot filter. Only the latest snapshot matching this state, level, and season will be searched for athlete matches."
                className="rounded border px-3 py-2"
              />
            </label>

            <label className="grid gap-1">
              <span className="font-medium">Level</span>
              <input
                type="text"
                value={watchLevel}
                onChange={(e) => setWatchLevel(e.target.value)}
                title="Stored-snapshot filter for the division level, for example high-school-girls or middle-school-boys."
                className="rounded border px-3 py-2"
              />
            </label>

            <label className="grid gap-1">
              <span className="font-medium">Season</span>
              <input
                type="text"
                value={watchSeason}
                onChange={(e) => setWatchSeason(e.target.value)}
                title="Stored-snapshot filter for the season path, for example outdoor-track-and-field or indoor-track-and-field."
                className="rounded border px-3 py-2"
              />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="font-medium">Watched athletes</span>
            <textarea
              value={watchAthletes}
              onChange={(e) => setWatchAthletes(e.target.value)}
              rows={4}
              title="One athlete per line. The latest stored snapshot for the chosen filters will be searched for exact athlete-name matches in the stored top-10 event rows."
              className="rounded border px-3 py-2 font-mono text-sm"
            />
          </label>

          <button
            type="submit"
            title="Load the latest stored snapshot matching the selected filters and return any event matches for the watched athletes."
            className="w-fit rounded bg-slate-900 px-4 py-2 font-medium text-white"
          >
            {watchLoading ? "Loading stored watch..." : "Load latest stored watch"}
          </button>
        </form>

        {watchError ? (
          <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{watchError}</p>
        ) : null}

        {watchResults ? (
          <div className="grid gap-4">
            <section className="grid gap-2 rounded border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xl font-semibold">Stored snapshot</h3>
              {watchResults.snapshot ? (
                <>
                  <p className="text-sm text-slate-700">
                    {watchResults.snapshot.label ?? "Snapshot"} | {watchResults.snapshot.state} |{" "}
                    {watchResults.snapshot.level} | {watchResults.snapshot.season}
                  </p>
                  <p className="text-sm text-slate-700">
                    Captured: {watchResults.snapshot.capturedAt} | Events: {watchResults.snapshot.totalEvents}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-700">No stored snapshot found for the selected filters yet.</p>
              )}
            </section>

            <section className="grid gap-3">
              <h3 className="text-xl font-semibold">Athlete matches from stored rankings</h3>
              {watchResults.athletes.map((athlete) => (
                <div key={athlete.athlete} className="rounded border border-slate-200 p-4">
                  <h4 className="font-semibold">{athlete.athlete}</h4>
                  {athlete.matches.length > 0 ? (
                    <ul className="mt-2 grid gap-2 text-sm">
                      {athlete.matches.map((match) => (
                        <li key={`${athlete.athlete}-${match.event}-${match.rank}`} className="rounded bg-slate-50 p-2">
                          {match.section} | #{match.rank} in {match.event} with {match.mark}
                          {match.team ? ` for ${match.team}` : ""} {match.date ? `on ${match.date}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">No stored top-10 matches in this snapshot.</p>
                  )}
                </div>
              ))}
            </section>
          </div>
        ) : null}
      </section>
      ) : null}
    </main>
  );
}

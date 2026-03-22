import Link from "next/link";

const pages = [
  {
    href: "/simulator",
    eyebrow: "Simulation",
    title: "Meet and Event Simulator",
    description:
      "Run Monte Carlo planning scenarios, seed events from MileSplit history, and review projected places with confidence intervals.",
  },
  {
    href: "/rankings",
    eyebrow: "Rankings",
    title: "Rankings Tracker and Stored Watch",
    description:
      "Pull top-10 event lists, ingest ranking snapshots, and compare Riley or Karter against the latest stored view.",
  },
  {
    href: "/athletes",
    eyebrow: "Directory",
    title: "My Athletes",
    description:
      "Store exact MileSplit athlete profile URLs for your team so duplicate names resolve cleanly across future runs.",
  },
  {
    href: "/api-tools",
    eyebrow: "Testing",
    title: "API Tools",
    description:
      "Inspect endpoints, send requests, and export responses as JSON or CSV from the built-in request console.",
  },
];

export default function HomePage() {
  return (
    <main className="app-shell flex flex-col gap-6">
      <header className="panel p-6 sm:p-8">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="grid gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Virtual Track Meet Simulator</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              Choose a focused workspace.
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted sm:text-base">
              The app is split into dedicated pages now so simulation, rankings, and athlete identity
              management each have room to breathe on desktop and mobile.
            </p>
          </div>
          <div className="panel-strong grid gap-3 p-4 sm:p-5">
            <p className="text-sm font-semibold">Recommended flow</p>
            <ol className="grid gap-2 text-sm text-muted">
              <li>1. Save Riley, Karter, and repeat athletes in My Athletes.</li>
              <li>2. Run history-based event simulations in Simulator.</li>
              <li>3. Track ranking movement and stored snapshots in Rankings.</li>
            </ol>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {pages.map((page) => (
          <Link key={page.href} href={page.href} className="panel group p-5 transition hover:-translate-y-0.5">
            <div className="grid gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">{page.eyebrow}</p>
              <div className="grid gap-2">
                <h2 className="text-2xl font-semibold">{page.title}</h2>
                <p className="text-sm leading-6 text-muted">{page.description}</p>
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--primary)" }}>
                Open workspace
              </span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}

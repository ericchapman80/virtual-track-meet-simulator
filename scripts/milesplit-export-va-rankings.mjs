import { writeFile } from "node:fs/promises";
import {
  dismissConsent,
  ensureAuthenticated,
  launchMilesplitBrowser,
  newMilesplitContext,
  OUTPUT_DIR,
  saveStorageState,
} from "./lib/milesplit.mjs";

const headed = process.argv.includes("--headed");
const useSystemBrowser = process.argv.includes("--use-system-browser");
const rankingsUrl =
  "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=3844";
const jsonPath = `${OUTPUT_DIR}/va-rankings-hs-girls-outdoor-2026-vhsl-class-3.json`;
const markdownPath = `${OUTPUT_DIR}/va-rankings-hs-girls-outdoor-2026-vhsl-class-3.md`;

function buildMarkdown(data) {
  const lines = [
    "# Virginia HS Girls Outdoor 2026 Rankings",
    "",
    `Source: ${data.url}`,
    `Title: ${data.title}`,
    `Exported At: ${data.exportedAt}`,
    `Total Rows: ${data.totalRows}`,
    "",
  ];

  for (const section of data.sections) {
    lines.push(`## ${section.section}`);
    lines.push("");
    lines.push("| Event | Mark | Athlete | Team | Grade | Meet | Date | Place |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");

    for (const row of section.rows) {
      lines.push(
        `| ${row.event} | ${row.mark} | ${row.athlete} | ${row.team} | ${row.grade} | ${row.meet} | ${row.date} | ${row.place} |`,
      );
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const { browser } = await launchMilesplitBrowser({ headed, useSystemBrowser });
  const { context, page } = await newMilesplitContext(browser);

  const session = await ensureAuthenticated(page, { headed, useSystemBrowser });
  console.log("\n=== Session ===");
  console.log(JSON.stringify(session, null, 2));

  await page.goto(rankingsUrl, { waitUntil: "domcontentloaded" });
  await dismissConsent(page);
  await page.waitForLoadState("networkidle").catch(() => undefined);

  const exportData = await page.evaluate(() => {
    const clean = (value) => (value ?? "").replace(/\s+/g, " ").trim();
    const rows = Array.from(document.querySelectorAll("#rankingsTable tbody tr"));
    const sections = [];
    let currentSection = "Uncategorized";
    let currentRows = [];

    const flush = () => {
      if (currentRows.length > 0) {
        sections.push({
          section: currentSection,
          rows: currentRows,
        });
        currentRows = [];
      }
    };

    for (const row of rows) {
      if (row.classList.contains("thead")) {
        flush();
        currentSection = clean(row.querySelector("th.event")?.textContent) || "Uncategorized";
        continue;
      }

      const eventLink = row.querySelector("td.event a");
      const markCell = row.querySelector("td.time");
      const athleteLink = row.querySelector("td.name .athlete a");
      const teamLink = row.querySelector("td.name .team a");
      const meetLink = row.querySelector("td.meet .meet a");
      const placeNode = row.querySelector("td.meet .meet em");
      const dateNode = row.querySelector("td.meet .date time");
      const windNode = row.querySelector("td.time .wind");

      currentRows.push({
        section: currentSection,
        event: clean(eventLink?.textContent),
        eventUrl: eventLink?.href || "",
        mark: clean(markCell?.childNodes?.[0]?.textContent || markCell?.textContent),
        wind: clean(windNode?.textContent),
        athlete: clean(athleteLink?.textContent),
        athleteUrl: athleteLink?.href || "",
        team: clean(teamLink?.textContent),
        teamUrl: teamLink?.href || "",
        grade: clean(row.querySelector("td.year")?.textContent),
        meet: clean(meetLink?.textContent),
        meetUrl: meetLink?.href || "",
        place: clean(placeNode?.textContent),
        date: clean(dateNode?.textContent),
      });
    }

    flush();

    return {
      url: window.location.href,
      title: document.title,
      exportedAt: new Date().toISOString(),
      totalRows: sections.reduce((sum, section) => sum + section.rows.length, 0),
      sections,
    };
  });

  await writeFile(jsonPath, JSON.stringify(exportData, null, 2), "utf8");
  await writeFile(markdownPath, buildMarkdown(exportData), "utf8");

  console.log("\n=== Export Files ===");
  console.log(
    JSON.stringify(
      {
        jsonPath,
        markdownPath,
        totalRows: exportData.totalRows,
        sections: exportData.sections.map((section) => ({
          section: section.section,
          rows: section.rows.length,
        })),
      },
      null,
      2,
    ),
  );

  await saveStorageState(context);
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

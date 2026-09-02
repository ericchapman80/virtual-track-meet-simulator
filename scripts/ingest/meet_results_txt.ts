import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

type ParsedRow = {
  place: number;
  firstName: string;
  lastName: string;
  grade?: number;
  school: string;
  finals: string;
  heat?: number;
  finalsAlt?: string;
};

type Args = {
  file: string;
  eventCode: string;
  eventName: string;
  isTimed: boolean;
  occurredAt: Date;
  source?: string;
  dryRun: boolean;
};

function die(msg: string): never {
  // eslint-disable-next-line no-console
  console.error(msg);
  process.exit(1);
}

function parseDateIso(s: string): Date {
  // Accept YYYY-MM-DD or full ISO.
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) die(`Invalid --date: ${s}`);
  return d;
}

function isMarkToken(tok: string): boolean {
  // Examples: 39.21 or 1:52.33
  return /^\d+\.\d+$/.test(tok) || /^\d+:\d+\.\d+$/.test(tok);
}

function markToSeconds(mark: string): number {
  // Normalize to seconds as a float.
  if (/^\d+\.\d+$/.test(mark)) return Number(mark);
  const m = mark.match(/^(\d+):(\d+\.\d+)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  die(`Unsupported mark format: ${mark}`);
}

function parseHytekLines(input: string): ParsedRow[] {
  const out: ParsedRow[] = [];
  const lines = input.split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) continue;
    if (!/^\s*\d+\s+/.test(line)) continue; // only result rows

    const tokens = line.trim().split(/\s+/);
    const place = Number(tokens[0]);
    if (!Number.isFinite(place)) continue;

    // Expect last name token ends with comma (e.g., "Paku,")
    const commaIdx = tokens.findIndex((t) => t.endsWith(","));
    if (commaIdx < 0 || commaIdx === tokens.length - 1) continue;

    const lastName = tokens[commaIdx].slice(0, -1);

    // Find grade token after name tokens.
    let gradeIdx = -1;
    for (let i = commaIdx + 1; i < tokens.length; i++) {
      if (/^\d{1,2}$/.test(tokens[i])) {
        gradeIdx = i;
        break;
      }
    }
    if (gradeIdx < 0) continue;

    const firstName = tokens.slice(commaIdx + 1, gradeIdx).join(" ");
    const grade = Number(tokens[gradeIdx]);

    // Find finals time token after grade.
    let finalsIdx = -1;
    for (let i = tokens.length - 1; i > gradeIdx; i--) {
      if (isMarkToken(tokens[i])) {
        finalsIdx = i;
        break;
      }
    }
    if (finalsIdx < 0) continue;

    // Heat is typically the token immediately after finals, but there may be an alt finals at end.
    // Example: "40.27 16 40.263" => finalsAlt at end.
    let finals = tokens[finalsIdx];
    let finalsAlt: string | undefined;
    let heat: number | undefined;

    // If there is a second mark token after finals, treat the last mark as finalsAlt.
    // In that case finalsIdx points to the last one, so re-evaluate.
    const markTokensAfterGrade = tokens.slice(gradeIdx + 1).filter(isMarkToken);
    if (markTokensAfterGrade.length >= 2) {
      finalsAlt = markTokensAfterGrade[markTokensAfterGrade.length - 1];
      finals = markTokensAfterGrade[0];

      // Heat is the integer token immediately after finals.
      const idx = tokens.findIndex((t, i) => i > gradeIdx && t === finals);
      if (idx >= 0 && idx + 1 < tokens.length && /^\d+$/.test(tokens[idx + 1])) {
        heat = Number(tokens[idx + 1]);
      }

      // School is between grade and finals.
      const schoolTokens = tokens.slice(gradeIdx + 1, idx);
      const school = schoolTokens.join(" ");

      out.push({ place, firstName, lastName, grade, school, finals, heat, finalsAlt });
      continue;
    }

    // No alt finals.
    // Heat is token right after finals if present.
    if (finalsIdx + 1 < tokens.length && /^\d+$/.test(tokens[finalsIdx + 1])) {
      heat = Number(tokens[finalsIdx + 1]);
    }

    const schoolTokens = tokens.slice(gradeIdx + 1, finalsIdx);
    const school = schoolTokens.join(" ");

    out.push({ place, firstName, lastName, grade, school, finals, heat });
  }

  return out;
}

function parseArgs(argv: string[]): Args {
  const a: Partial<Args> = { dryRun: false };

  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    if (idx === -1) return undefined;
    return argv[idx + 1];
  };

  const file = get("--file") ?? argv[2];
  if (!file) {
    die(
      [
        "Usage:",
        "  tsx scripts/ingest/meet_results_txt.ts --file <path> --date <YYYY-MM-DD> --event-code <300M> --event-name <'Girls 300 Meter Dash'> [--source <string>] [--dry-run]",
      ].join("\n")
    );
  }

  const dateStr = get("--date");
  if (!dateStr) die("Missing --date (YYYY-MM-DD)");

  const eventCode = get("--event-code");
  const eventName = get("--event-name");
  if (!eventCode || !eventName) die("Missing --event-code and/or --event-name");

  const isTimed = (get("--is-timed") ?? "true") !== "false";
  const source = get("--source");
  const dryRun = argv.includes("--dry-run");

  return {
    file,
    eventCode,
    eventName,
    isTimed,
    occurredAt: parseDateIso(dateStr),
    source,
    dryRun,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const filePath = path.resolve(process.cwd(), args.file);
  const input = fs.readFileSync(filePath, "utf8");
  const rows = parseHytekLines(input);

  if (!rows.length) die("No result rows parsed. Check the input format.");

  if (args.dryRun) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ parsed: rows.length, sample: rows.slice(0, 5) }, null, 2));
    return;
  }

  const prisma = new PrismaClient();
  try {
    const event = await prisma.event.upsert({
      where: { code: args.eventCode },
      update: { name: args.eventName, isTimed: args.isTimed },
      create: { code: args.eventCode, name: args.eventName, isTimed: args.isTimed },
    });

    for (const r of rows) {
      const team = await prisma.team.upsert({
        where: { name: r.school },
        update: {},
        create: { name: r.school },
      });

      // Find-or-create athlete. If you later add a stable external ID, we can make this deterministic.
      let athlete = await prisma.athlete.findFirst({
        where: { firstName: r.firstName, lastName: r.lastName, teamId: team.id },
      });
      if (!athlete) {
        athlete = await prisma.athlete.create({
          data: { firstName: r.firstName, lastName: r.lastName, teamId: team.id },
        });
      }

      const mark = markToSeconds(r.finalsAlt ?? r.finals);
      const externalRef = `hytek:${args.eventCode}:${args.occurredAt.toISOString().slice(0, 10)}:${r.place}:${athlete.id}`;

      const existingPerf = await prisma.performance.findFirst({ where: { externalRef } });
      if (!existingPerf) {
        await prisma.performance.create({
          data: {
            athleteId: athlete.id,
            eventId: event.id,
            mark,
            occurredAt: args.occurredAt,
            source: args.source,
            externalRef,
          },
        });
      }
    }

    // eslint-disable-next-line no-console
    console.log(`Imported ${rows.length} performances for ${args.eventCode} on ${args.occurredAt.toISOString().slice(0, 10)}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

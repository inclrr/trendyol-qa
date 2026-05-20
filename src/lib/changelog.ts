// Vite raw text import — uygulamayla birlikte paketlenir, offline okunur
import changelogRaw from "../../CHANGELOG.md?raw";

export const CHANGELOG_TEXT: string = changelogRaw;

export interface ChangelogEntry {
  version: string;
  date: string;
  body: string;
}

/**
 * CHANGELOG.md'yi parse edip sürüm başına bölümler döndürür.
 * Format: "## [X.Y.Z] - YYYY-MM-DD\n\n<body>"
 */
export function parseChangelog(): ChangelogEntry[] {
  const text = CHANGELOG_TEXT;
  const re = /^##\s*\[([^\]]+)\]\s*(?:-\s*(\d{4}-\d{2}-\d{2}))?\s*$/gm;
  const matches: { idx: number; version: string; date: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({ idx: m.index + m[0].length, version: m[1], date: m[2] ?? "" });
  }
  const entries: ChangelogEntry[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].idx;
    const end = i + 1 < matches.length
      ? text.lastIndexOf("\n", matches[i + 1].idx - matches[i + 1].version.length - 5)
      : text.length;
    const body = text.slice(start, end).trim();
    if (matches[i].version.toLowerCase() !== "unreleased" || body.length > 0) {
      entries.push({
        version: matches[i].version,
        date: matches[i].date,
        body,
      });
    }
  }
  return entries.filter((e) => e.version.toLowerCase() !== "unreleased");
}

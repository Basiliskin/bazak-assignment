const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now" / "5m ago" / "3h ago" / "yesterday" / "4d ago" / "Oct 1" (pure; `now` passed in). */
export function relativeTime(iso: string, now: Date): string {
  const then = new Date(iso);
  const ago = now.getTime() - then.getTime();
  if (ago < MINUTE) return 'just now';
  if (ago < HOUR) return `${Math.floor(ago / MINUTE)}m ago`;
  if (ago < DAY) return `${Math.floor(ago / HOUR)}h ago`;
  if (ago < 2 * DAY) return 'yesterday';
  if (ago < 7 * DAY) return `${Math.floor(ago / DAY)}d ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export interface InlineSegment {
  text: string;
  bold: boolean;
}

/** Minimal inline markdown — only **bold**, which the Assistant uses for Product names (pure). */
export function toInlineSegments(text: string): InlineSegment[] {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) => ({ text: part, bold: i % 2 === 1 }))
    .filter((s) => s.text !== '');
}

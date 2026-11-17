import { relativeTime, toInlineSegments } from './format';

describe('relativeTime', () => {
  const now = new Date('2026-11-17T12:00:00.000Z');
  const at = (msAgo: number) => new Date(now.getTime() - msAgo).toISOString();

  it.each([
    [10_000, 'just now'],
    [5 * 60_000, '5m ago'],
    [3 * 3_600_000, '3h ago'],
    [24 * 3_600_000, 'yesterday'],
    [4 * 24 * 3_600_000, '4d ago'],
  ])('%i ms ago → %s', (ms, expected) => {
    expect(relativeTime(at(ms), now)).toBe(expected);
  });

  it('falls back to a date after a week', () => {
    expect(relativeTime('2026-10-01T12:00:00.000Z', now)).toBe('Oct 1');
  });

  it('treats a future timestamp (clock skew) as just now', () => {
    expect(relativeTime(at(-60_000), now)).toBe('just now');
  });
});

describe('toInlineSegments', () => {
  it('splits **bold** runs from plain text', () => {
    expect(toInlineSegments('Try **iPhone 9** or **Oppo**.')).toEqual([
      { text: 'Try ', bold: false },
      { text: 'iPhone 9', bold: true },
      { text: ' or ', bold: false },
      { text: 'Oppo', bold: true },
      { text: '.', bold: false },
    ]);
  });

  it('leaves an unclosed ** as plain text (mid-stream)', () => {
    expect(toInlineSegments('Try **iPh')).toEqual([{ text: 'Try **iPh', bold: false }]);
  });
});

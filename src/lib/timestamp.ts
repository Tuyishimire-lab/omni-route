/**
 * OmniRoute Timestamp & Date Formatting Utility
 * Provides human-readable dates, times, days of week, and relative offsets.
 */

export interface FormattedTimestamp {
  time: string;       // e.g. "9:28:34 PM"
  date: string;       // e.g. "Today · Sun, Sep 6" or "Yesterday · Sat, Sep 5" or "Sep 3, 2026"
  relative: string;   // e.g. "just now", "2m ago", "3h ago", "2d ago"
  full: string;       // e.g. "Sunday, September 6, 2026 at 9:28:34 PM"
}

export function formatTelemetryTimestamp(
  raw: string | Date | number | null | undefined
): FormattedTimestamp {
  if (!raw) {
    return { time: '--:--', date: 'Unknown', relative: '--', full: 'Unknown timestamp' };
  }

  // Handle case where raw is already a legacy time string like "9:28:34 PM"
  if (typeof raw === 'string' && /^\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?$/i.test(raw.trim())) {
    return {
      time: raw.trim(),
      date: 'Today',
      relative: 'Recent',
      full: `Today at ${raw.trim()}`,
    };
  }

  const date = raw instanceof Date ? raw : new Date(raw);

  // If invalid date fallback
  if (isNaN(date.getTime())) {
    const fallbackStr = String(raw);
    return {
      time: fallbackStr,
      date: 'Recorded',
      relative: 'Event',
      full: fallbackStr,
    };
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Relative string
  let relative = 'just now';
  if (diffSecs < 45) {
    relative = 'just now';
  } else if (diffMins < 60) {
    relative = `${diffMins}m ago`;
  } else if (diffHours < 24) {
    relative = `${diffHours}h ago`;
  } else if (diffDays < 30) {
    relative = `${diffDays}d ago`;
  } else {
    const diffMonths = Math.floor(diffDays / 30);
    relative = `${diffMonths}mo ago`;
  }

  // Time string (e.g. "9:28:34 PM")
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Check if same calendar day, yesterday, or other
  const isToday =
    now.getDate() === date.getDate() &&
    now.getMonth() === date.getMonth() &&
    now.getFullYear() === date.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getDate() === date.getDate() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getFullYear() === date.getFullYear();

  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const year = date.getFullYear();
  const isCurrentYear = year === now.getFullYear();

  let dateLabel = '';
  if (isToday) {
    dateLabel = `Today · ${dayOfWeek}, ${monthDay}`;
  } else if (isYesterday) {
    dateLabel = `Yesterday · ${dayOfWeek}, ${monthDay}`;
  } else if (isCurrentYear) {
    dateLabel = `${dayOfWeek}, ${monthDay}`;
  } else {
    dateLabel = `${monthDay}, ${year}`;
  }

  const full = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return { time, date: dateLabel, relative, full };
}

/** Format a date into a clean "Sep 6, 2026 · 9:28 PM" or "Sep 6, 2026" */
export function formatFullDateTime(raw: string | Date | null | undefined): string {
  if (!raw) return '-';
  const d = raw instanceof Date ? raw : new Date(raw);
  if (isNaN(d.getTime())) return String(raw);

  const formatted = formatTelemetryTimestamp(d);
  return `${formatted.date} at ${formatted.time} (${formatted.relative})`;
}

import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export interface DisplayPreferences {
  timezone?: string | null;
  timeFormat?: 'H12' | 'H24' | null;
}

export const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const resolveTimezone = (preferences?: DisplayPreferences) =>
  preferences?.timezone || browserTimezone();

const timePattern = (preferences?: DisplayPreferences) =>
  preferences?.timeFormat === 'H12' ? 'h:mm a' : 'HH:mm';

const safeDate = (value: string | Date) => (value instanceof Date ? value : parseISO(value));

export function formatDate(value: string | Date, preferences?: DisplayPreferences) {
  try {
    return formatInTimeZone(safeDate(value), resolveTimezone(preferences), 'd MMM yyyy');
  } catch {
    return '—';
  }
}

export function formatTime(value: string | Date, preferences?: DisplayPreferences) {
  try {
    return formatInTimeZone(
      safeDate(value),
      resolveTimezone(preferences),
      timePattern(preferences),
    );
  } catch {
    return '—';
  }
}

export function formatDateTime(value: string | Date, preferences?: DisplayPreferences) {
  try {
    return formatInTimeZone(
      safeDate(value),
      resolveTimezone(preferences),
      `d MMM yyyy, ${timePattern(preferences)}`,
    );
  } catch {
    return '—';
  }
}

export function formatZoneLabel(preferences?: DisplayPreferences) {
  const zone = resolveTimezone(preferences);
  try {
    return `${zone} (${formatInTimeZone(new Date(), zone, 'zzz')})`;
  } catch {
    return zone;
  }
}

export function formatRelative(value: string | Date) {
  try {
    return `${formatDistanceToNowStrict(safeDate(value))} ago`;
  } catch {
    return '';
  }
}

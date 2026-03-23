const LA_PAZ_TIME_ZONE = 'America/La_Paz';
const UI_LOCALE = 'en-US';

type DateInput = string | number | Date;

function toDate(value: DateInput): Date {
  // Treat null/undefined/empty as "now" to avoid Invalid Date errors
  if (value === undefined || value === null || value === '') {
    return new Date();
  }

  const date = value instanceof Date ? value : new Date(value);
  // If parsing failed, fallback to current date instead of throwing
  if (isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

function formatWithParts(
  value: DateInput,
  options: Intl.DateTimeFormatOptions
): string {
  const date = toDate(value);
  try {
    return new Intl.DateTimeFormat(UI_LOCALE, {
      timeZone: LA_PAZ_TIME_ZONE,
      ...options,
    }).format(date);
  } catch (err) {
    // Fallback: return ISO string (safe) to avoid crashing the app
    // Intl may throw if the environment lacks the timezone or date is invalid
    // Log a warning for debugging
    // eslint-disable-next-line no-console
    console.warn('Date formatting failed, falling back to ISO string', { value, error: err });
    return toISOStringSafe(date);
  }
}

// Return an ISO string safely, falling back to now if invalid
export function toISOStringSafe(value: DateInput): string {
  const d = toDate(value);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function formatLaPazTime(value: DateInput, includeSeconds = false): string {
  return formatWithParts(value, {
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: false,
  });
}

export function formatLaPazMonthDayTime(value: DateInput, includeSeconds = false): string {
  return formatWithParts(value, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: false,
  });
}

export function formatLaPazShortDate(value: DateInput): string {
  return formatWithParts(value, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function formatLaPazShortDateTime(value: DateInput): string {
  return formatWithParts(value, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function getLaPazDateInputValue(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LA_PAZ_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Failed to format La Paz date input value');
  }

  return `${year}-${month}-${day}`;
}

export { LA_PAZ_TIME_ZONE };

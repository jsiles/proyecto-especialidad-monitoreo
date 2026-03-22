const LA_PAZ_TIME_ZONE = 'America/La_Paz';
const UI_LOCALE = 'en-US';

type DateInput = string | number | Date;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatWithParts(
  value: DateInput,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(UI_LOCALE, {
    timeZone: LA_PAZ_TIME_ZONE,
    ...options,
  }).format(toDate(value));
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

const LA_PAZ_TIME_ZONE = 'America/La_Paz';

type DateInput = string | number | Date;

function toDate(value: DateInput): Date {
  // If no value provided, use current time
  if (value === undefined || value === null || value === '') {
    return new Date();
  }

  const date = value instanceof Date ? value : new Date(value);

  // If parsing failed, fallback to current time instead of letting Intl throw
  if (isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

export function formatLaPazSqlTimestamp(value: DateInput): string {
  const date = toDate(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LA_PAZ_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((item) => item.type === type)?.value;
    if (!part) {
      throw new Error(`Missing date part: ${type}`);
    }

    return part;
  };

  return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
}

export { LA_PAZ_TIME_ZONE };

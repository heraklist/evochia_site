export interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

export function calendarDateParts(date: Date, timeZone: string): CalendarDateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get('year');
  const month = values.get('month');
  const day = values.get('day');

  if (!year || !month || !day) {
    throw new Error(`Unable to format date key in timezone: ${timeZone}`);
  }

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
}

export function formatCalendarDate(date: Date, timeZone: string): string {
  const { year, month, day } = calendarDateParts(date, timeZone);
  return [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
}

export function isValidIanaTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function isValidHostname(value: string): boolean {
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/.test(value);
}

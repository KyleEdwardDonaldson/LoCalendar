import Holidays from 'date-holidays';

export interface HolidayEvent {
  name: string;
  date: Date;
  type: string;
}

// Common country codes
export const SUPPORTED_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'CH', name: 'Switzerland' },
];

/**
 * Get holidays for a specific country and year
 */
export function getHolidays(countryCode: string, year: number): HolidayEvent[] {
  try {
    const hd = new Holidays(countryCode);
    const holidays = hd.getHolidays(year);
    
    return holidays.map((holiday) => ({
      name: holiday.name,
      date: new Date(holiday.date),
      type: holiday.type || 'public',
    }));
  } catch (error) {
    console.error(`Failed to get holidays for ${countryCode}:`, error);
    return [];
  }
}

/**
 * Get holidays for a specific month
 */
export function getHolidaysForMonth(
  countryCode: string,
  year: number,
  month: number // 0-indexed
): Map<number, HolidayEvent[]> {
  const yearHolidays = getHolidays(countryCode, year);
  const monthHolidays = new Map<number, HolidayEvent[]>();
  
  yearHolidays.forEach((holiday) => {
    const holidayDate = new Date(holiday.date);
    if (holidayDate.getFullYear() === year && holidayDate.getMonth() === month) {
      const day = holidayDate.getDate();
      if (!monthHolidays.has(day)) {
        monthHolidays.set(day, []);
      }
      monthHolidays.get(day)!.push(holiday);
    }
  });
  
  return monthHolidays;
}

/**
 * Check if a specific date is a holiday
 */
export function isHoliday(countryCode: string, date: Date): boolean {
  const holidays = getHolidays(countryCode, date.getFullYear());
  
  return holidays.some((holiday) => {
    const holidayDate = new Date(holiday.date);
    return (
      holidayDate.getFullYear() === date.getFullYear() &&
      holidayDate.getMonth() === date.getMonth() &&
      holidayDate.getDate() === date.getDate()
    );
  });
}

/**
 * Get holiday name for a specific date
 */
export function getHolidayName(countryCode: string, date: Date): string | null {
  const holidays = getHolidays(countryCode, date.getFullYear());
  
  const holiday = holidays.find((h) => {
    const holidayDate = new Date(h.date);
    return (
      holidayDate.getFullYear() === date.getFullYear() &&
      holidayDate.getMonth() === date.getMonth() &&
      holidayDate.getDate() === date.getDate()
    );
  });
  
  return holiday ? holiday.name : null;
}

/**
 * Get all supported countries
 */
export function getSupportedCountries(): { code: string; name: string }[] {
  return SUPPORTED_COUNTRIES;
}

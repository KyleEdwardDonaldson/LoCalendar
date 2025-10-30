import { RRule, RRuleSet, rrulestr } from 'rrule';
import { EventItem } from './models';

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurrenceOptions {
  frequency: RecurrenceFrequency;
  interval?: number;
  count?: number; // Number of occurrences
  until?: Date; // End date
  byweekday?: number[]; // 0 = Monday, 6 = Sunday (RRule format)
  bymonthday?: number; // Day of month (1-31)
}

/**
 * Create an RRULE string from recurrence options
 */
export function createRRule(startDate: Date, options: RecurrenceOptions): string {
  const ruleOptions: Partial<RRule['options']> = {
    freq: RRule[options.frequency],
    dtstart: startDate,
    interval: options.interval || 1,
  };

  if (options.count) {
    ruleOptions.count = options.count;
  } else if (options.until) {
    ruleOptions.until = options.until;
  }

  if (options.byweekday && options.byweekday.length > 0) {
    ruleOptions.byweekday = options.byweekday;
  }

  if (options.bymonthday) {
    ruleOptions.bymonthday = options.bymonthday;
  }

  const rule = new RRule(ruleOptions);
  return rule.toString();
}

/**
 * Parse an RRULE string to get occurrences
 */
export function getOccurrences(
  rruleString: string,
  after?: Date,
  before?: Date
): Date[] {
  try {
    const rule = rrulestr(rruleString);
    
    if (after && before) {
      return rule.between(after, before, true);
    } else if (before) {
      return rule.all((date) => date <= before);
    } else if (after) {
      // Get next 365 occurrences after the date
      const afterTime = after.getTime();
      return rule.all((date, i) => {
        return i < 365 && date.getTime() >= afterTime;
      });
    }
    
    // Default: get next 100 occurrences
    return rule.all((_, i) => i < 100);
  } catch (error) {
    console.error('Failed to parse RRULE:', error);
    return [];
  }
}

/**
 * Check if an event occurs on a specific date
 */
export function occursOnDate(event: EventItem, targetDate: Date): boolean {
  const eventDate = new Date(event.date);
  
  // Normalize dates to compare only year/month/day
  const normalizeDate = (d: Date) => {
    const normalized = new Date(d);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };
  
  const normalizedTarget = normalizeDate(targetDate);
  const normalizedEvent = normalizeDate(eventDate);
  
  // Check if it's the base occurrence
  if (normalizedTarget.getTime() === normalizedEvent.getTime()) {
    return true;
  }
  
  // Check if it's a recurring event
  if (event.rrule) {
    try {
      const rule = rrulestr(event.rrule, { dtstart: eventDate });
      
      // Check if any occurrence matches the target date
      const dayStart = new Date(normalizedTarget);
      const dayEnd = new Date(normalizedTarget);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      const occurrences = rule.between(dayStart, dayEnd, true);
      return occurrences.length > 0;
    } catch (error) {
      console.error('Failed to check occurrence:', error);
      return false;
    }
  }
  
  return false;
}

/**
 * Get all events for a specific month, including recurring events
 */
export function getEventsForMonth(
  events: EventItem[],
  year: number,
  month: number // 0-indexed
): Map<number, EventItem[]> {
  const eventsByDay = new Map<number, EventItem[]>();
  
  // Get first and last day of the month
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const daysInMonth = monthEnd.getDate();
  
  // Check each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    
    events.forEach((event) => {
      if (occursOnDate(event, currentDate)) {
        if (!eventsByDay.has(day)) {
          eventsByDay.set(day, []);
        }
        eventsByDay.get(day)!.push(event);
      }
    });
  }
  
  return eventsByDay;
}

/**
 * Create a simple human-readable description of an RRULE
 */
export function describeRRule(rruleString: string): string {
  try {
    const rule = rrulestr(rruleString);
    return rule.toText();
  } catch (error) {
    return 'Invalid recurrence rule';
  }
}

/**
 * Common recurrence presets
 */
export const RECURRENCE_PRESETS = {
  daily: (startDate: Date, count?: number): string => {
    return createRRule(startDate, {
      frequency: 'DAILY',
      interval: 1,
      count,
    });
  },
  
  weekly: (startDate: Date, count?: number): string => {
    return createRRule(startDate, {
      frequency: 'WEEKLY',
      interval: 1,
      count,
    });
  },
  
  biweekly: (startDate: Date, count?: number): string => {
    return createRRule(startDate, {
      frequency: 'WEEKLY',
      interval: 2,
      count,
    });
  },
  
  monthly: (startDate: Date, count?: number): string => {
    return createRRule(startDate, {
      frequency: 'MONTHLY',
      interval: 1,
      bymonthday: startDate.getDate(),
      count,
    });
  },
  
  yearly: (startDate: Date, count?: number): string => {
    return createRRule(startDate, {
      frequency: 'YEARLY',
      interval: 1,
      count,
    });
  },
  
  weekdays: (startDate: Date, count?: number): string => {
    return createRRule(startDate, {
      frequency: 'WEEKLY',
      interval: 1,
      byweekday: [0, 1, 2, 3, 4], // Monday to Friday (RRule format)
      count,
    });
  },
};

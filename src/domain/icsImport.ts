import ICAL from 'ical.js';
import { EventItem } from './models';

export interface ParsedICSEvent {
  id: string;
  summary: string;
  description?: string;
  start: Date;
  end?: Date;
  location?: string;
  rrule?: string;
  organizer?: string;
  attendees?: string[];
  isAllDay: boolean;
  categories?: string[];
}

/**
 * Parse an ICS file content and extract events
 */
export function parseICSFile(icsContent: string): ParsedICSEvent[] {
  try {
    const jcalData = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    return vevents.map((vevent) => {
      const event = new ICAL.Event(vevent);
      
      // Extract RRULE if present
      let rruleString: string | undefined = undefined;
      const rruleProp = vevent.getFirstProperty('rrule');
      if (rruleProp) {
        try {
          rruleString = rruleProp.toICALString().replace('RRULE:', '');
        } catch (e) {
          console.warn('Failed to parse RRULE:', e);
        }
      }

      // Get organizer
      const organizerProp = vevent.getFirstProperty('organizer');
      const organizer = organizerProp 
        ? organizerProp.getFirstValue().toString().replace('mailto:', '')
        : undefined;

      // Get attendees
      const attendeeProps = vevent.getAllProperties('attendee');
      const attendees = attendeeProps.map((prop) => 
        prop.getFirstValue().toString().replace('mailto:', '')
      );

      // Get categories
      const categoriesProp = vevent.getFirstProperty('categories');
      const categories = categoriesProp 
        ? categoriesProp.getFirstValue().toString().split(',')
        : undefined;

      // Check if all-day event
      const dtstart = vevent.getFirstProperty('dtstart');
      const isAllDay = dtstart?.type === 'date';

      return {
        id: event.uid || crypto.randomUUID(),
        summary: event.summary || 'Untitled Event',
        description: event.description,
        start: event.startDate.toJSDate(),
        end: event.endDate?.toJSDate(),
        location: event.location,
        rrule: rruleString,
        organizer,
        attendees: attendees.length > 0 ? attendees : undefined,
        isAllDay,
        categories,
      };
    });
  } catch (error) {
    console.error('Failed to parse ICS file:', error);
    throw new Error('Invalid ICS file format');
  }
}

/**
 * Convert a parsed ICS event to our EventItem format
 */
export function convertToEventItem(icsEvent: ParsedICSEvent): EventItem {
  return {
    id: crypto.randomUUID(), // Generate new ID to avoid conflicts
    title: icsEvent.summary,
    date: icsEvent.start.toISOString().split('T')[0],
    rrule: icsEvent.rrule,
  };
}

/**
 * Group events by date for easier preview
 */
export function groupEventsByDate(events: ParsedICSEvent[]): Map<string, ParsedICSEvent[]> {
  const grouped = new Map<string, ParsedICSEvent[]>();
  
  events.forEach((event) => {
    const dateKey = event.start.toISOString().split('T')[0];
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(event);
  });
  
  return grouped;
}

/**
 * Get event statistics for preview
 */
export function getEventStats(events: ParsedICSEvent[]): {
  total: number;
  recurring: number;
  oneTime: number;
  allDay: number;
  withLocation: number;
  dateRange: { start: Date; end: Date } | null;
} {
  if (events.length === 0) {
    return {
      total: 0,
      recurring: 0,
      oneTime: 0,
      allDay: 0,
      withLocation: 0,
      dateRange: null,
    };
  }

  const recurring = events.filter((e) => e.rrule).length;
  const allDay = events.filter((e) => e.isAllDay).length;
  const withLocation = events.filter((e) => e.location).length;

  const dates = events.map((e) => e.start.getTime()).sort((a, b) => a - b);
  const start = new Date(dates[0]);
  const end = new Date(dates[dates.length - 1]);

  return {
    total: events.length,
    recurring,
    oneTime: events.length - recurring,
    allDay,
    withLocation,
    dateRange: { start, end },
  };
}

/**
 * Filter events by date range
 */
export function filterEventsByDateRange(
  events: ParsedICSEvent[],
  startDate?: Date,
  endDate?: Date
): ParsedICSEvent[] {
  return events.filter((event) => {
    const eventDate = event.start;
    if (startDate && eventDate < startDate) return false;
    if (endDate && eventDate > endDate) return false;
    return true;
  });
}

/**
 * Search events by text
 */
export function searchEvents(events: ParsedICSEvent[], query: string): ParsedICSEvent[] {
  const lowerQuery = query.toLowerCase();
  return events.filter((event) =>
    event.summary.toLowerCase().includes(lowerQuery) ||
    event.description?.toLowerCase().includes(lowerQuery) ||
    event.location?.toLowerCase().includes(lowerQuery)
  );
}

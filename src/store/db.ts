import Dexie, { Table } from 'dexie';
import { CalendarPrefs, EventItem } from '../domain/models';

export class LoCalendarDB extends Dexie {
  prefs!: Table<CalendarPrefs, string>;
  events!: Table<EventItem, string>;

  constructor() {
    super('LoCalendarDB');
    
    this.version(1).stores({
      prefs: 'id, name',
      events: 'id, date, title',
    });
  }
}

export const db = new LoCalendarDB();

// Database operations
export const dbOperations = {
  // Preferences
  async savePrefs(prefs: CalendarPrefs): Promise<void> {
    await db.prefs.put(prefs);
  },

  async getPrefs(id: string): Promise<CalendarPrefs | undefined> {
    return await db.prefs.get(id);
  },

  async getAllPrefs(): Promise<CalendarPrefs[]> {
    return await db.prefs.toArray();
  },

  async deletePrefs(id: string): Promise<void> {
    await db.prefs.delete(id);
  },

  // Events
  async saveEvent(event: EventItem): Promise<void> {
    await db.events.put(event);
  },

  async getEvent(id: string): Promise<EventItem | undefined> {
    return await db.events.get(id);
  },

  async getAllEvents(): Promise<EventItem[]> {
    return await db.events.toArray();
  },

  async getEventsByDateRange(startDate: string, endDate: string): Promise<EventItem[]> {
    return await db.events
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  },

  async deleteEvent(id: string): Promise<void> {
    await db.events.delete(id);
  },

  async updateEvent(id: string, updates: Partial<EventItem>): Promise<void> {
    await db.events.update(id, updates);
  },

  // Bulk operations
  async saveEvents(events: EventItem[]): Promise<void> {
    await db.events.bulkPut(events);
  },

  async clearAllEvents(): Promise<void> {
    await db.events.clear();
  },

  // Export/Import
  async exportData(): Promise<{ prefs: CalendarPrefs[]; events: EventItem[] }> {
    const [prefs, events] = await Promise.all([
      db.prefs.toArray(),
      db.events.toArray(),
    ]);
    return { prefs, events };
  },

  async importData(data: { prefs: CalendarPrefs[]; events: EventItem[] }): Promise<void> {
    await db.transaction('rw', db.prefs, db.events, async () => {
      if (data.prefs.length > 0) {
        await db.prefs.bulkPut(data.prefs);
      }
      if (data.events.length > 0) {
        await db.events.bulkPut(data.events);
      }
    });
  },
};

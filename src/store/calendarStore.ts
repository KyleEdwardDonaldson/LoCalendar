import { create } from 'zustand';
import { CalendarPrefs, EventItem, createDefaultPrefs } from '../domain/models';
import { dbOperations } from './db';

interface CalendarState {
  // Current view
  currentYear: number;
  currentMonth: number;
  
  // Calendar preferences
  prefs: CalendarPrefs;
  
  // Events
  events: EventItem[];
  
  // UI state
  selectedDate: Date | null;
  isAddingEvent: boolean;
  
  // Actions
  setCurrentMonth: (year: number, month: number) => void;
  setPrefs: (prefs: CalendarPrefs | ((prev: CalendarPrefs) => CalendarPrefs)) => void;
  addEvent: (event: EventItem) => void;
  updateEvent: (id: string, updates: Partial<EventItem>) => void;
  deleteEvent: (id: string) => void;
  setSelectedDate: (date: Date | null) => void;
  setIsAddingEvent: (isAdding: boolean) => void;
  nextMonth: () => void;
  previousMonth: () => void;
}

export const useCalendarStore = create<CalendarState>((set) => {
  const now = new Date();
  
  return {
    // Initialize with current month
    currentYear: now.getFullYear(),
    currentMonth: now.getMonth(),
    
    // Default preferences
    prefs: createDefaultPrefs(),
    
    // Empty events list
    events: [],
    
    // UI state
    selectedDate: null,
    isAddingEvent: false,
    
    // Actions
    setCurrentMonth: (year, month) => set({ currentYear: year, currentMonth: month }),
    
    setPrefs: (prefsOrUpdater) => set((state) => {
      const newPrefs = typeof prefsOrUpdater === 'function' 
        ? prefsOrUpdater(state.prefs)
        : prefsOrUpdater;
      dbOperations.savePrefs(newPrefs).catch(console.error);
      return { prefs: newPrefs };
    }),
    
    addEvent: (event) => set((state) => {
      dbOperations.saveEvent(event).catch(console.error);
      return { events: [...state.events, event] };
    }),
    
    updateEvent: (id, updates) => set((state) => {
      dbOperations.updateEvent(id, updates).catch(console.error);
      return {
        events: state.events.map((event) =>
          event.id === id ? { ...event, ...updates } : event
        ),
      };
    }),
    
    deleteEvent: (id) => set((state) => {
      dbOperations.deleteEvent(id).catch(console.error);
      return { events: state.events.filter((event) => event.id !== id) };
    }),
    
    setSelectedDate: (date) => set({ selectedDate: date }),
    
    setIsAddingEvent: (isAdding) => set({ isAddingEvent: isAdding }),
    
    nextMonth: () => set((state) => {
      const newMonth = state.currentMonth + 1;
      if (newMonth > 11) {
        return { currentYear: state.currentYear + 1, currentMonth: 0 };
      }
      return { currentMonth: newMonth };
    }),
    
    previousMonth: () => set((state) => {
      const newMonth = state.currentMonth - 1;
      if (newMonth < 0) {
        return { currentYear: state.currentYear - 1, currentMonth: 11 };
      }
      return { currentMonth: newMonth };
    }),
  };
});

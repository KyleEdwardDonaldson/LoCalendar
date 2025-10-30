import { useEffect, useState } from 'react';
import { useCalendarStore } from './calendarStore';
import { dbOperations } from './db';
import { useLicenseStore } from './licenseStore';

export function useInitializeStore() {
  const [isLoading, setIsLoading] = useState(true);
  const { setPrefs, events } = useCalendarStore();
  const { loadSavedLicense } = useLicenseStore();

  useEffect(() => {
    async function loadData() {
      try {
        // Load preferences
        const allPrefs = await dbOperations.getAllPrefs();
        if (allPrefs.length > 0) {
          // Use the first prefs found (in a full app, allow user to select)
          setPrefs(allPrefs[0]);
        } else {
          // Save default prefs to DB
          const defaultPrefs = useCalendarStore.getState().prefs;
          await dbOperations.savePrefs(defaultPrefs);
        }

        // Load events
        const allEvents = await dbOperations.getAllEvents();
        
        // Update store with loaded events
        useCalendarStore.setState({ events: allEvents });
        
        // Load saved license
        loadSavedLicense();
        
      } catch (error) {
        console.error('Failed to load data from database:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [setPrefs]);

  return { isLoading };
}

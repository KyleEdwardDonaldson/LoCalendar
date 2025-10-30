import React, { useState } from 'react';
import { useCalendarStore } from './store/calendarStore';
import { CalendarPage } from './render/CalendarPage';
import { EventItem } from './domain/models';
import { useInitializeStore } from './store/useInitializeStore';
import { RECURRENCE_PRESETS, describeRRule } from './domain/recurrence';
import { getSupportedCountries } from './domain/holidays';
import { ICSImportModal } from './components/ICSImportModal';
import { parseICSFile, ParsedICSEvent, convertToEventItem } from './domain/icsImport';
import { LicensePrompt } from './components/LicensePrompt';
import { useLicenseStore } from './store/licenseStore';

function App() {
  const { isLoading } = useInitializeStore();
  const { license, setShowLicensePrompt } = useLicenseStore();
  
  const {
    currentYear,
    currentMonth,
    prefs,
    events,
    nextMonth,
    previousMonth,
    addEvent,
    setSelectedDate,
    selectedDate,
    setPrefs,
  } = useCalendarStore();

  const [newEventTitle, setNewEventTitle] = useState('');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<string>('none');
  const [showSettings, setShowSettings] = useState(false);
  const [importingEvents, setImportingEvents] = useState<ParsedICSEvent[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleAddEvent = () => {
    if (!newEventTitle.trim() || !selectedDate) return;

    let rrule: string | undefined = undefined;
    
    // Create RRULE if recurring
    if (isRecurring && recurrenceType !== 'none') {
      switch (recurrenceType) {
        case 'daily':
          rrule = RECURRENCE_PRESETS.daily(selectedDate);
          break;
        case 'weekly':
          rrule = RECURRENCE_PRESETS.weekly(selectedDate);
          break;
        case 'monthly':
          rrule = RECURRENCE_PRESETS.monthly(selectedDate);
          break;
        case 'yearly':
          rrule = RECURRENCE_PRESETS.yearly(selectedDate);
          break;
        case 'weekdays':
          rrule = RECURRENCE_PRESETS.weekdays(selectedDate);
          break;
      }
    }

    const event: EventItem = {
      id: crypto.randomUUID(),
      title: newEventTitle,
      date: selectedDate.toISOString().split('T')[0],
      rrule,
    };

    addEvent(event);
    setNewEventTitle('');
    setShowAddEvent(false);
    setSelectedDate(null);
    setIsRecurring(false);
    setRecurrenceType('none');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text();
      const parsedEvents = parseICSFile(text);
      setImportingEvents(parsedEvents);
    } catch (error) {
      alert('Failed to parse ICS file. Please make sure it\'s a valid calendar file.');
      console.error(error);
    }
  };

  const handleImportEvents = (selectedEvents: ParsedICSEvent[]) => {
    const eventItems = selectedEvents.map(convertToEventItem);
    eventItems.forEach((event) => addEvent(event));
    setImportingEvents(null);
    alert(`Successfully imported ${eventItems.length} events!`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const icsFile = files.find(
      (file) => file.name.endsWith('.ics') || file.type === 'text/calendar'
    );

    if (icsFile) {
      await handleFileUpload(icsFile);
    } else {
      alert('Please drop a valid .ics calendar file');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold">Loading LoCalendar...</div>
          <div className="text-gray-500 mt-2">Initializing database</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-20 border-4 border-dashed border-blue-500 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg p-8 shadow-xl">
            <div className="text-3xl mb-2">📥</div>
            <div className="text-xl font-bold">Drop ICS file to import</div>
            <div className="text-gray-600 mt-2">Google Calendar exports supported</div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importingEvents && (
        <ICSImportModal
          events={importingEvents}
          onImport={handleImportEvents}
          onCancel={() => setImportingEvents(null)}
        />
      )}

      {/* License Prompt */}
      <LicensePrompt />
      {/* Control Bar */}
      <div className="no-print bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={previousMonth}
              className="btn btn-sm btn-outline"
            >
              ← Previous
            </button>
            <h2 className="text-xl font-semibold">
              {new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </h2>
            <button
              onClick={nextMonth}
              className="btn btn-sm btn-outline"
            >
              Next →
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="btn btn-sm btn-secondary cursor-pointer">
              📥 Import ICS
              <input
                type="file"
                accept=".ics,text/calendar"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn btn-sm btn-ghost"
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => setShowAddEvent(!showAddEvent)}
              className="btn btn-sm btn-primary"
            >
              + Add Event
            </button>
            <button
              onClick={handlePrint}
              className="btn btn-sm btn-accent"
            >
              🖨️ Print
            </button>
            {license?.valid ? (
              <div className="badge badge-success badge-sm">
                ✓ Licensed
              </div>
            ) : (
              <button
                onClick={() => setShowLicensePrompt(true)}
                className="btn btn-sm btn-outline"
              >
                🔑 Activate
              </button>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="max-w-7xl mx-auto mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Calendar Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Show Holidays
                </label>
                <select
                  value={prefs.holidaysCountry || ''}
                  onChange={(e) => {
                    setPrefs((prev) => ({
                      ...prev,
                      holidaysCountry: e.target.value || undefined,
                    }));
                  }}
                  className="select select-bordered w-full max-w-xs"
                >
                  <option value="">None</option>
                  {getSupportedCountries().map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="btn btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Add Event Form */}
        {showAddEvent && (
          <div className="max-w-7xl mx-auto mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Add New Event</h3>
            <div className="flex gap-2">
              <input
                type="date"
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="input input-bordered"
              />
              <input
                type="text"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="Event title..."
                className="input input-bordered flex-1"
              />
              
              {/* Recurrence Options */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="checkbox checkbox-sm"
                  />
                  <span className="text-sm">Recurring</span>
                </label>
                {isRecurring && (
                  <select
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value)}
                    className="select select-sm select-bordered"
                  >
                    <option value="none">Select...</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="weekdays">Weekdays</option>
                  </select>
                )}
              </div>
              
              <button
                onClick={handleAddEvent}
                className="btn btn-primary"
                disabled={!newEventTitle.trim() || !selectedDate || (isRecurring && recurrenceType === 'none')}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddEvent(false);
                  setNewEventTitle('');
                  setSelectedDate(null);
                  setIsRecurring(false);
                  setRecurrenceType('none');
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Display */}
      <div className="calendar-page max-w-7xl mx-auto p-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <CalendarPage
            year={currentYear}
            month={currentMonth}
            prefs={prefs}
            events={events}
          />
        </div>
      </div>

      {/* Events List */}
      <div className="no-print max-w-7xl mx-auto p-8">
        <h3 className="text-lg font-semibold mb-4">
          Events ({events.length})
        </h3>
        <div className="space-y-2">
          {events
            .filter((event) => {
              const eventDate = new Date(event.date);
              return (
                eventDate.getFullYear() === currentYear &&
                eventDate.getMonth() === currentMonth
              );
            })
            .map((event) => (
              <div
                key={event.id}
                className="p-3 bg-white rounded border border-gray-200"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(event.date).toLocaleDateString()}
                      {event.rrule && (
                        <span className="ml-2 text-xs text-blue-600">
                          🔁 {describeRRule(event.rrule)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          {events.filter(
            (event) =>
              new Date(event.date).getFullYear() === currentYear &&
              new Date(event.date).getMonth() === currentMonth
          ).length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No events this month. Add one to get started!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

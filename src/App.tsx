import { useState } from 'react';
import { useCalendarStore } from './store/calendarStore';
import { CalendarPage } from './render/CalendarPage';
import { EventItem } from './domain/models';

function App() {
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
  } = useCalendarStore();

  const [newEventTitle, setNewEventTitle] = useState('');
  const [showAddEvent, setShowAddEvent] = useState(false);

  const handleAddEvent = () => {
    if (!newEventTitle.trim() || !selectedDate) return;

    const event: EventItem = {
      id: crypto.randomUUID(),
      title: newEventTitle,
      date: selectedDate.toISOString().split('T')[0],
    };

    addEvent(event);
    setNewEventTitle('');
    setShowAddEvent(false);
    setSelectedDate(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
          </div>
        </div>

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
              <button
                onClick={handleAddEvent}
                className="btn btn-primary"
                disabled={!newEventTitle.trim() || !selectedDate}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddEvent(false);
                  setNewEventTitle('');
                  setSelectedDate(null);
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

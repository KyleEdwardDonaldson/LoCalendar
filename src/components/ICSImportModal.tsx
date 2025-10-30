import React, { useState, useMemo } from 'react';
import {
  ParsedICSEvent,
  getEventStats,
  searchEvents,
  filterEventsByDateRange,
  convertToEventItem,
} from '../domain/icsImport';
import { describeRRule } from '../domain/recurrence';

interface ICSImportModalProps {
  events: ParsedICSEvent[];
  onImport: (selectedEvents: ParsedICSEvent[]) => void;
  onCancel: () => void;
}

export const ICSImportModal: React.FC<ICSImportModalProps> = ({
  events,
  onImport,
  onCancel,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(events.map((e) => e.id))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'future' | 'past'>('all');
  const [showRecurringOnly, setShowRecurringOnly] = useState(false);

  const stats = useMemo(() => getEventStats(events), [events]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Search filter
    if (searchQuery) {
      filtered = searchEvents(filtered, searchQuery);
    }

    // Date filter
    const now = new Date();
    if (dateFilter === 'future') {
      filtered = filterEventsByDateRange(filtered, now);
    } else if (dateFilter === 'past') {
      filtered = filterEventsByDateRange(filtered, undefined, now);
    }

    // Recurring filter
    if (showRecurringOnly) {
      filtered = filtered.filter((e) => e.rrule);
    }

    return filtered;
  }, [events, searchQuery, dateFilter, showRecurringOnly]);

  // Sort by date
  const sortedEvents = useMemo(
    () => [...filteredEvents].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [filteredEvents]
  );

  const toggleEvent = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredEvents.map((e) => e.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleImport = () => {
    const selectedEvents = events.filter((e) => selectedIds.has(e.id));
    onImport(selectedEvents);
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold mb-2">Import Google Calendar</h2>
          <p className="text-gray-600">
            Review and select events to import into your calendar
          </p>
        </div>

        {/* Stats */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.recurring}</div>
              <div className="text-sm text-gray-600">Recurring</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.oneTime}</div>
              <div className="text-sm text-gray-600">One-time</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.allDay}</div>
              <div className="text-sm text-gray-600">All-day</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-teal-600">{stats.withLocation}</div>
              <div className="text-sm text-gray-600">With Location</div>
            </div>
          </div>
          {stats.dateRange && (
            <div className="mt-3 text-center text-sm text-gray-600">
              Date Range: {stats.dateRange.start.toLocaleDateString()} -{' '}
              {stats.dateRange.end.toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="p-4 bg-white border-b border-gray-200 space-y-3">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-sm input-bordered flex-1 min-w-[200px]"
            />

            {/* Date filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="select select-sm select-bordered"
            >
              <option value="all">All dates</option>
              <option value="future">Future only</option>
              <option value="past">Past only</option>
            </select>

            {/* Recurring filter */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showRecurringOnly}
                onChange={(e) => setShowRecurringOnly(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">Recurring only</span>
            </label>
          </div>

          {/* Bulk actions */}
          <div className="flex gap-2">
            <button onClick={selectAll} className="btn btn-sm btn-outline">
              Select All ({filteredEvents.length})
            </button>
            <button onClick={deselectAll} className="btn btn-sm btn-outline">
              Deselect All
            </button>
          </div>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-4">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No events match your filters
            </div>
          ) : (
            <div className="space-y-2">
              {sortedEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedIds.has(event.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleEvent(event.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(event.id)}
                      onChange={() => toggleEvent(event.id)}
                      className="checkbox checkbox-sm mt-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">
                          {event.summary}
                        </h3>
                        {event.rrule && (
                          <span className="badge badge-sm badge-primary">
                            🔁 Recurring
                          </span>
                        )}
                        {event.isAllDay && (
                          <span className="badge badge-sm badge-secondary">
                            All-day
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          📅 {event.start.toLocaleDateString()} at{' '}
                          {event.start.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>

                        {event.rrule && (
                          <div className="text-blue-600">
                            🔁 {describeRRule(event.rrule)}
                          </div>
                        )}

                        {event.location && (
                          <div className="truncate">📍 {event.location}</div>
                        )}

                        {event.description && (
                          <div className="text-gray-500 truncate">
                            {event.description}
                          </div>
                        )}

                        {event.organizer && (
                          <div className="text-xs text-gray-400">
                            Organizer: {event.organizer}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedCount} of {events.length} events selected
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="btn btn-outline">
              Cancel
            </button>
            <button
              onClick={handleImport}
              className="btn btn-primary"
              disabled={selectedCount === 0}
            >
              Import {selectedCount > 0 ? `(${selectedCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

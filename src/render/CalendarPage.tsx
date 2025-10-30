import React from 'react';
import { CalendarPrefs, EventItem } from '../domain/models';
import { computeGrid, formatMonth, getPageDims, getWeekdayNames, getInnerBox } from '../domain/layout';

interface CalendarPageProps {
  year: number;
  month: number; // 0-indexed
  prefs: CalendarPrefs;
  events: EventItem[];
  locale?: string;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  year,
  month,
  prefs,
  events,
  locale = 'en-US',
}) => {
  const pageDims = getPageDims(prefs.paper);
  const inner = getInnerBox(pageDims, prefs.paper.marginMm);
  const grid = computeGrid(year, month, prefs);
  const weekdays = getWeekdayNames(locale);
  const monthTitle = formatMonth(month, year, locale);
  
  // Filter events for this month
  const monthEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate.getFullYear() === year && eventDate.getMonth() === month;
  });
  
  // Group events by day
  const eventsByDay = new Map<number, EventItem[]>();
  monthEvents.forEach((event) => {
    const day = new Date(event.date).getDate();
    if (!eventsByDay.has(day)) {
      eventsByDay.set(day, []);
    }
    eventsByDay.get(day)!.push(event);
  });
  
  return (
    <svg
      width={`${pageDims.w}mm`}
      height={`${pageDims.h}mm`}
      viewBox={`0 0 ${pageDims.w} ${pageDims.h}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        backgroundColor: prefs.theme.palette.background || '#ffffff',
        fontFamily: prefs.theme.fontFamily,
      }}
    >
      {/* Month Title */}
      <text
        x={inner.cx}
        y={inner.y + 10}
        textAnchor="middle"
        fontSize={`${prefs.elements.monthTitle.fontSizePt}pt`}
        fontWeight={prefs.elements.monthTitle.weight}
        fill={prefs.elements.monthTitle.color}
      >
        {monthTitle}
      </text>
      
      {/* Weekday Headers */}
      {weekdays.map((day, idx) => {
        const cellW = (inner.w - prefs.grid.gutterMm * 6) / 7;
        const x = inner.x + idx * (cellW + prefs.grid.gutterMm) + cellW / 2;
        const y = inner.y + 20 + prefs.grid.headerHeightMm;
        
        return (
          <text
            key={`weekday-${idx}`}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize={`${prefs.elements.weekdayHeader.fontSizePt}pt`}
            fontWeight={prefs.elements.weekdayHeader.weight}
            fill={prefs.elements.weekdayHeader.color}
          >
            {day}
          </text>
        );
      })}
      
      {/* Calendar Grid */}
      {grid.cells.map((cell) => {
        const cellEvents = eventsByDay.get(cell.day) || [];
        
        return (
          <g key={cell.key}>
            {/* Cell border */}
            <rect
              x={cell.x}
              y={cell.y}
              width={cell.w}
              height={cell.h}
              fill={prefs.theme.palette.background || '#ffffff'}
              stroke={prefs.theme.palette.secondary || '#dddddd'}
              strokeWidth="0.5"
            />
            
            {/* Day number */}
            <text
              x={cell.x + prefs.elements.dayNumber.offsetMm.x}
              y={cell.y + prefs.elements.dayNumber.offsetMm.y + prefs.elements.dayNumber.fontSizePt * 0.35}
              fontSize={`${prefs.elements.dayNumber.fontSizePt}pt`}
              fontWeight={prefs.elements.dayNumber.weight}
              fill={prefs.elements.dayNumber.color}
              textAnchor={prefs.elements.dayNumber.align}
            >
              {cell.day}
            </text>
            
            {/* Events (simple markers) */}
            {cellEvents.slice(0, 3).map((event, idx) => (
              <text
                key={`event-${event.id}`}
                x={cell.x + 2}
                y={cell.y + 10 + (idx + 1) * 4}
                fontSize="7pt"
                fill={prefs.theme.palette.accent || '#0066cc'}
                style={{ fontSize: '7pt' }}
              >
                • {event.title.slice(0, 15)}{event.title.length > 15 ? '...' : ''}
              </text>
            ))}
            {cellEvents.length > 3 && (
              <text
                x={cell.x + 2}
                y={cell.y + 10 + 4 * 4}
                fontSize="7pt"
                fill={prefs.theme.palette.secondary || '#666666'}
              >
                +{cellEvents.length - 3} more
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

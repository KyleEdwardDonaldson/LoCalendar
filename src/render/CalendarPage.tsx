import React from 'react';
import { CalendarPrefs, EventItem } from '../domain/models';
import { computeGrid, formatMonth, getPageDims, getWeekdayNames, getInnerBox } from '../domain/layout';
import { getEventsForMonth } from '../domain/recurrence';
import { getHolidaysForMonth } from '../domain/holidays';

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
  
  // Get events for this month, including recurring events
  const eventsByDay = getEventsForMonth(events, year, month);
  
  // Get holidays if country is set
  const holidaysByDay = prefs.holidaysCountry 
    ? getHolidaysForMonth(prefs.holidaysCountry, year, month)
    : new Map();
  
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
        const cellHolidays = holidaysByDay.get(cell.day) || [];
        
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
            
            {/* Holidays */}
            {cellHolidays.map((holiday, idx) => (
              <text
                key={`holiday-${idx}`}
                x={cell.x + 2}
                y={cell.y + 6 + idx * 3.5}
                fontSize="6pt"
                fill="#dc2626"
                fontWeight="600"
              >
                🎉 {holiday.name.slice(0, 12)}{holiday.name.length > 12 ? '...' : ''}
              </text>
            ))}
            
            {/* Events (simple markers) */}
            {cellEvents.slice(0, 3).map((event, idx) => (
              <text
                key={`event-${event.id}`}
                x={cell.x + 2}
                y={cell.y + 10 + (cellHolidays.length * 3.5) + (idx + 1) * 4}
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
                y={cell.y + 10 + (cellHolidays.length * 3.5) + 4 * 4}
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

import { CalendarPrefs, PAPER_DIMENSIONS, Orientation } from './models';

export interface PageDimensions {
  w: number;
  h: number;
}

export interface CellLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  day: number;
  key: string;
}

export interface GridLayout {
  cells: CellLayout[];
  innerBox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

/**
 * Get page dimensions in mm based on paper config
 */
export function getPageDims(paper: CalendarPrefs['paper']): PageDimensions {
  const base = PAPER_DIMENSIONS[paper.size];
  
  // Swap dimensions if landscape
  if (paper.orientation === 'landscape') {
    return { w: base.h, h: base.w };
  }
  
  return base;
}

/**
 * Compute inner box after applying margins
 */
export function getInnerBox(
  pageDims: PageDimensions,
  marginMm: number
): { x: number; y: number; w: number; h: number; cx: number; cy: number } {
  return {
    x: marginMm,
    y: marginMm,
    w: pageDims.w - 2 * marginMm,
    h: pageDims.h - 2 * marginMm,
    cx: pageDims.w / 2,
    cy: pageDims.h / 2,
  };
}

/**
 * Compute month grid layout (7 columns × 6 rows)
 * Returns cell positions and dimensions
 */
export function computeGrid(
  year: number,
  month: number, // 0-indexed (0 = January)
  prefs: CalendarPrefs
): GridLayout {
  const pageDims = getPageDims(prefs.paper);
  const inner = getInnerBox(pageDims, prefs.paper.marginMm);
  
  // Reserve space for header (month title + weekday names)
  const headerHeight = prefs.grid.headerHeightMm + 10; // Extra for month title
  const gridStartY = inner.y + headerHeight;
  const availableHeight = inner.h - headerHeight;
  
  const gutterMm = prefs.grid.gutterMm;
  const cols = 7; // Days of week
  const rows = 6; // Max weeks in a month
  
  // Calculate cell dimensions
  const totalGutterWidth = gutterMm * (cols - 1);
  const totalGutterHeight = gutterMm * (rows - 1);
  
  const cellW = (inner.w - totalGutterWidth) / cols;
  const cellH = (availableHeight - totalGutterHeight) / rows;
  
  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Build cell layout
  const cells: CellLayout[] = [];
  let dayNum = 1;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellIndex = row * cols + col;
      
      // Skip cells before the first day of the month
      if (cellIndex < firstDay || dayNum > daysInMonth) {
        continue;
      }
      
      const x = inner.x + col * (cellW + gutterMm);
      const y = gridStartY + row * (cellH + gutterMm);
      
      cells.push({
        x,
        y,
        w: cellW,
        h: cellH,
        day: dayNum,
        key: `${year}-${month + 1}-${dayNum}`,
      });
      
      dayNum++;
    }
  }
  
  return {
    cells,
    innerBox: {
      x: inner.x,
      y: gridStartY,
      w: inner.w,
      h: availableHeight,
    },
  };
}

/**
 * Get weekday names (short form)
 */
export function getWeekdayNames(locale: string = 'en-US'): string[] {
  const baseDate = new Date(2025, 0, 5); // A Sunday
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + i);
    return formatter.format(date);
  });
}

/**
 * Format month name
 */
export function formatMonth(month: number, year: number, locale: string = 'en-US'): string {
  const date = new Date(year, month, 1);
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

/**
 * Get date for a specific day in the month
 */
export function getDateForDay(year: number, month: number, day: number): Date {
  return new Date(year, month, day);
}

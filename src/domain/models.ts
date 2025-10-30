import { z } from 'zod';

export type UUID = string;

// Paper configuration
export const PaperSizeSchema = z.enum(['A5', 'A4', 'A3']);
export type PaperSize = z.infer<typeof PaperSizeSchema>;

export const OrientationSchema = z.enum(['portrait', 'landscape']);
export type Orientation = z.infer<typeof OrientationSchema>;

export const PaperConfigSchema = z.object({
  size: PaperSizeSchema,
  orientation: OrientationSchema,
  marginMm: z.number().min(0).max(50),
});
export type PaperConfig = z.infer<typeof PaperConfigSchema>;

// Typography and positioning
export const PositionSchema = z.enum([
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center',
]);
export type Position = z.infer<typeof PositionSchema>;

export const TextAlignSchema = z.enum(['start', 'center', 'end']);
export type TextAlign = z.infer<typeof TextAlignSchema>;

export const PositionedTextStyleSchema = z.object({
  position: PositionSchema,
  offsetMm: z.object({
    x: z.number(),
    y: z.number(),
  }),
  fontSizePt: z.number().min(6).max(72),
  weight: z.number().min(100).max(900),
  color: z.string(),
  align: TextAlignSchema,
});
export type PositionedTextStyle = z.infer<typeof PositionedTextStyleSchema>;

// Theme
export const ThemeSchema = z.object({
  fontFamily: z.string(),
  palette: z.record(z.string()),
});
export type Theme = z.infer<typeof ThemeSchema>;

// Grid configuration
export const GridConfigSchema = z.object({
  gutterMm: z.number().min(0).max(10),
  headerHeightMm: z.number().min(0).max(50),
});
export type GridConfig = z.infer<typeof GridConfigSchema>;

// Calendar preferences
export const CalendarPrefsSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  paper: PaperConfigSchema,
  theme: ThemeSchema,
  holidaysCountry: z.string().length(2).optional(), // ISO-3166-1 alpha-2
  showWeekNumbers: z.boolean().optional(),
  grid: GridConfigSchema,
  elements: z.object({
    monthTitle: PositionedTextStyleSchema,
    weekdayHeader: PositionedTextStyleSchema,
    dayNumber: PositionedTextStyleSchema,
  }),
});
export type CalendarPrefs = z.infer<typeof CalendarPrefsSchema>;

// Event item
export const EventItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  date: z.string(), // ISO date for base occurrence
  rrule: z.string().optional(), // RFC5545 string if recurring
  tz: z.string().optional(), // Olson timezone
});
export type EventItem = z.infer<typeof EventItemSchema>;

// App state dump for export/import
export const AppStateDumpSchema = z.object({
  prefs: z.array(CalendarPrefsSchema),
  events: z.array(EventItemSchema),
  createdAt: z.string(),
});
export type AppStateDump = z.infer<typeof AppStateDumpSchema>;

// Paper dimensions in mm
export const PAPER_DIMENSIONS: Record<PaperSize, { w: number; h: number }> = {
  A5: { w: 148, h: 210 },
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
};

// Default calendar preferences
export const createDefaultPrefs = (): CalendarPrefs => ({
  id: crypto.randomUUID(),
  name: 'My Calendar',
  paper: {
    size: 'A4',
    orientation: 'portrait',
    marginMm: 10,
  },
  theme: {
    fontFamily: 'system-ui, sans-serif',
    palette: {
      primary: '#000000',
      secondary: '#666666',
      accent: '#0066cc',
      background: '#ffffff',
    },
  },
  showWeekNumbers: false,
  grid: {
    gutterMm: 2,
    headerHeightMm: 8,
  },
  elements: {
    monthTitle: {
      position: 'top-left',
      offsetMm: { x: 0, y: 0 },
      fontSizePt: 24,
      weight: 700,
      color: '#000000',
      align: 'start',
    },
    weekdayHeader: {
      position: 'top-left',
      offsetMm: { x: 0, y: 0 },
      fontSizePt: 10,
      weight: 600,
      color: '#666666',
      align: 'center',
    },
    dayNumber: {
      position: 'top-left',
      offsetMm: { x: 2, y: 2 },
      fontSizePt: 12,
      weight: 400,
      color: '#000000',
      align: 'start',
    },
  },
});

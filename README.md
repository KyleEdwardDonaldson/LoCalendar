# LoCalendar

A customizable, printable calendar application built with Tauri 2.x + React. Offline-first design with license-gated distribution for desktop (Windows/macOS/Linux), web (PWA), and mobile platforms.

**Target Launch:** November 15, 2025

## Features

- ✅ **SVG-based rendering** with resolution-independent print output
- ✅ **Multiple paper sizes** (A5, A4, A3) with portrait/landscape support
- ✅ **Event management** with one-time and recurring events (via RFC5545 RRULE)
- ✅ **Print CSS** for perfect browser-based printing
- 🚧 **Holiday overlays** with country-specific calendars
- 🚧 **ICS import** for Google Calendar integration
- 🚧 **Offline licensing** with Ed25519 signed tokens
- 🚧 **Theme customization** with draggable elements

## Tech Stack

- **Frontend:** React 19 + TypeScript
- **Styling:** TailwindCSS + FlyonUI components
- **Desktop:** Tauri 2.x
- **State:** Zustand
- **Validation:** Zod schemas
- **Calendar Logic:** rrule for recurrence
- **Print:** SVG rendering sized in millimeters for crisp output

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Rust 1.70+ (for Tauri)
- Windows: Install WebView2 (usually pre-installed)

### Development

```bash
# Install dependencies
npm install

# Run web development server
npm run dev

# Run Tauri development (desktop app)
npm run tauri dev
```

Visit http://localhost:1420/ to see the app.

### Building

```bash
# Build web version
npm run build

# Build desktop app
npm run tauri build
```

## Project Structure

```
src/
├── domain/        # Core business logic
│   ├── models.ts     # TypeScript types with Zod schemas
│   └── layout.ts     # Calendar grid computation
├── render/        # SVG rendering
│   └── CalendarPage.tsx  # Main calendar renderer
├── store/         # Zustand state management
│   └── calendarStore.ts  # Calendar state
└── styles/        # CSS including print styles
    └── index.css     # Tailwind + print CSS
```

## Current Status

### ✅ Completed (MVP Phase 1)
- [x] Project scaffolding with Tauri + React
- [x] TailwindCSS + FlyonUI setup
- [x] Domain models with Zod validation
- [x] Calendar layout engine (SVG, sized in mm)
- [x] Event store with Zustand
- [x] Basic UI with month navigation
- [x] Add/view events
- [x] Print styles (@media print, @page)

### 🚧 In Progress
- [ ] Data persistence (SQLite/IndexedDB)
- [ ] Recurrence support (RRULE editor)
- [ ] Holiday overlay (date-holidays integration)
- [ ] ICS import (drag & drop)
- [ ] Licensing system (Ed25519 verification)

## Usage

### Adding Events

1. Click "+ Add Event" in the top bar
2. Select a date
3. Enter event title
4. Click "Add"

### Printing

1. Click the "🖨️ Print" button
2. Your browser's print dialog will open
3. Select paper size (A4/A5/A3)
4. Print or save as PDF

The calendar will automatically format for the selected paper size using CSS `@page` rules.

## Architecture Highlights

### SVG Rendering
Calendar pages are rendered as SVG with dimensions in millimeters for print accuracy.

### Layout Engine
The calendar grid auto-fits to selected paper size with 7 columns × 6 rows.

### State Management
Zustand provides clean, lightweight state management.

### Type Safety
Zod schemas ensure data integrity with runtime validation.

## License

Proprietary - License-gated distribution planned via Gumroad/itch.io

---

**Status:** MVP in active development 🚀

# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

LoCalendar is a customizable, printable calendar application built with Tauri 2.x + React. The goal is to ship an offline-first calendar app with license-gated distribution for desktop (Windows/macOS/Linux), web (PWA), and mobile (Android/iOS).

**Target launch:** November 15, 2025

## Tech Stack

- **Frontend:** React + TailwindCSS + FlyonUI components
- **Desktop/Mobile:** Tauri 2.x (with mobile path as alpha)
- **Web:** PWA with service worker for offline support
- **Data persistence:** 
  - Desktop: SQLite via `@tauri-apps/plugin-sql`
  - Web/PWA: IndexedDB via Dexie
- **Print/PDF:** Browser print with print CSS (`@media print`, `@page`), vector SVG rendering for crisp output
- **Licensing:** Offline-friendly Ed25519 signed tokens + optional online verification (Gumroad/itch)
- **Recurrence:** RFC5545 with `rrule` library; ICS import via `ical.js`
- **Holidays:** `date-holidays` dataset with dynamic updates

## Common Commands

```bash
# Initial setup
pnpm create tauri-app
pnpm install

# Development
pnpm tauri dev              # Run Tauri dev server
pnpm dev                    # Run web-only dev server

# Building
pnpm tauri build            # Build desktop app (Win/macOS/Linux)
pnpm build                  # Build web/PWA

# Testing
pnpm test                   # Run test suite
pnpm typecheck              # TypeScript type checking
pnpm lint                   # Lint check

# Package-specific builds
pnpm tauri build --target x86_64-pc-windows-msvc    # Windows MSIX/NSIS
pnpm tauri build --target x86_64-apple-darwin       # macOS .app/.dmg
pnpm tauri build --target x86_64-unknown-linux-gnu  # Linux AppImage/deb
```

## Architecture

### Layer Structure

The app follows a layered architecture:

1. **UI Layer** (`src/app/`, `src/components/`)
   - React components using TailwindCSS + FlyonUI
   - Calendar editor with draggable/alignable elements
   - Sidebar navigation and theme controls

2. **Domain Layer** (`src/domain/`)
   - Calendar engine: date math, recurrence logic, layout sizing
   - Core models (TypeScript types with Zod validation)
   - Business logic for event management

3. **Render Layer** (`src/render/`)
   - SVG-based calendar page renderer (vector for print DPI)
   - PDF export utilities
   - Layout primitives sized in millimeters

4. **Persistence Layer** (`src/store/`)
   - Zustand or Redux Toolkit for UI state
   - Repository pattern for data access
   - SQLite/IndexedDB abstraction

5. **Platform Layer** (`tauri/src/`)
   - Rust commands for filesystem, license verification
   - Optional PDF export (phase 2)
   - Native capabilities via Tauri plugins

### Rendering Strategy

Calendar pages are represented as **vector layout primitives** (SVG):
- SVG viewBox in millimeters for resolution-independent print
- UI editors manipulate a schema → renderer produces SVG for screen + print
- For PDF export: embed SVG into PDF using `react-pdf` or Rust `printpdf`

### Data Model

Key types (defined in `src/domain/models.ts`):

```typescript
CalendarPrefs {
  paper: { size: 'A5'|'A4'|'A3', orientation, marginMm }
  theme: { fontFamily, palette }
  holidaysCountry?: string  // ISO-3166-1 alpha-2
  grid: { gutterMm, headerHeightMm }
  elements: { monthTitle, weekdayHeader, dayNumber }  // PositionedTextStyle
}

EventItem {
  id, title, date
  rrule?: string  // RFC5545 string if recurring
  tz?: string     // Olson timezone
}

AppStateDump {
  prefs: CalendarPrefs[]
  events: EventItem[]
  createdAt: string
}
```

### Auto-fit Layout Logic

- Input: page size in mm, margins in mm
- Compute inner box = page − margins
- Month grid: 7 columns × 6 rows with configurable gutters
- Day cell size calculated to fill available space
- SVG viewBox ensures print fidelity

## Licensing Implementation

**Token format:** `base64(json){ userEmail, productId, plan, issuedAt, expiresAt } + ed25519_signature`

**Verification flow:**
1. User pastes license → verify online via Gumroad when available
2. Offline: verify signature + expiry using shipped public key
3. Cache status with grace period (7 days)
4. Gate printing/export behind valid license

**Tauri command:** `verify_license(token: String) -> Result<LicenseStatus, String>`

## Print & Export

### Print CSS
- Use `@page { size: A5/A4/A3; margin: Xmm }` for precise page sizing
- Calendar canvas rendered as SVG sized in mm
- Browser print keeps vectors sharp at print DPI

### PDF Export
- Phase 1 (web): `react-pdf` export of vector calendar
- Phase 2 (desktop): Optional Rust `printpdf` for perfect fidelity

## Import/Export Features

- **Import:** ICS files via drag & drop (Google Calendar, etc.)
  - Parse with `ical.js`
  - Map VEVENT → EventItem (summary → title, RRULE → string)
  - OAuth live sync is optional for later phases

- **Export:** 
  - JSON (full app data backup)
  - PNG/PDF (print-ready calendar pages)

## Development Milestones

1. **Skeleton:** Sidebar, month view, add one-time event
2. **Styles & drag:** Typography controls, draggable positions with snapping
3. **Recurrence:** RRULE editor with simple presets, generation logic
4. **Holidays:** Country dropdown overlay using `date-holidays`
5. **Print/PDF:** `window.print()` with @page sizing, PNG export
6. **Licensing:** Prompt + validation, gate print/export
7. **Import:** ICS drag & drop integration

## Security & Privacy

- All data stored locally by default (no cloud sync in MVP)
- License verification only calls vendor endpoint
- No event data leaves device
- Offline-first architecture ensures functionality without network

## Packaging Targets

- **Windows:** MSIX/NSIS installer + portable .exe
- **macOS:** .app + .dmg (ad-hoc signed initially)
- **Linux:** AppImage + .deb
- **Web/PWA:** Static dist/ with service worker
- **Mobile:** Tauri 2 Android APK/AAB and iOS IPA (alpha/read-only)

## Project Structure

```
loCalendar/
├─ src/
│  ├─ app/          # Routes, providers
│  ├─ components/   # FlyonUI wrappers, calendar editor
│  ├─ domain/       # models.ts, recurrence.ts, layout.ts
│  ├─ render/       # svg-page.tsx, pdf-export.ts
│  ├─ store/        # Zustand slices
│  ├─ utils/        # Date helpers, i18n
│  └─ styles/       # tailwind.css, print.css
├─ tauri/
│  ├─ src/
│  │  ├─ main.rs        # Tauri commands
│  │  └─ licensing.rs   # License verification
│  └─ tauri.conf.json
├─ packages/
│  └─ shared/       # Schemas, tokens
├─ public/          # PWA assets, icons
└─ scripts/         # Release, signing
```

## Code Standards

- Use **TypeScript** with strict mode
- Validate data models with **Zod schemas**
- Keep rendering logic resolution-independent (SVG in mm)
- Follow repository pattern for data access
- Separate platform-specific code in Tauri commands
- All dates handled with timezone awareness (default to user TZ)
- RRULE strings stored verbatim for RFC5545 compliance

## Dependencies

Key packages to be installed:

```bash
# Core
pnpm add react react-dom zustand zod clsx rrule dexie

# Tauri
pnpm add @tauri-apps/api @tauri-apps/plugin-sql @tauri-apps/plugin-fs

# UI
pnpm add -D tailwindcss postcss autoprefixer flyonui

# Calendar features
pnpm add ical.js date-holidays @react-pdf/renderer
```

## Risk & Scope Guardrails

- **Mobile:** Treat as tech preview; prioritize web/PWA for mobile users if unstable
- **PDF fidelity:** Rely on browser print in MVP; defer Rust-PDF to phase 2
- **OAuth Google Calendar:** Start with ICS import; add OAuth in later iteration
- **Store distribution:** Direct downloads + Gumroad/itch first; app stores post-MVP due to review lead times

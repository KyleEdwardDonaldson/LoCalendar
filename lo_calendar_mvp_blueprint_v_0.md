# LoCalendar — MVP Blueprint (v0.1)

**Goal:** Ship by **Nov 15, 2025** a customizable, printable calendar app with offline-first UX, license-gated distribution, and broad packaging: desktop (Win/macOS/Linux), web (offline-capable), and a path for mobile (Android/iOS).

---

## 1) Stack & Distribution Strategy

**Frontend:** React + TailwindCSS + FlyonUI components.

**Host shell:** Tauri 2.x (desktop + mobile path). Web build as PWA for "offline site" distribution.

**Data:** SQLite via `@tauri-apps/plugin-sql` on desktop; IndexedDB via Dexie for web/PWA. Simple JSON export/import for portability.

**Print/PDF:** Primary: browser print with robust print CSS (`@media print`, `@page size A5/A4/A3`). Secondary: export vector PDF via `react-pdf` (WebView) or Rust `printpdf` (desktop-only) as a phase-2 enhancement.

**Licensing:** Offline-friendly signed license token (Ed25519) + optional online verification with Gumroad/itch/etc. Grace period cache.

**Holidays:** Ship with `date-holidays` dataset subset + dynamic updates when online.

**Recurrence:** RFC5545 with `rrule` for generation; ICS import via `ical.js`.

**Packaging matrix**
- **Windows**: Tauri MSIX/NSIS installer + portable .exe.
- **macOS**: `.app` + `.dmg` (ad-hoc signed for direct downloads; later: notarization for App Store).
- **Linux**: `.AppImage` + `.deb`.
- **Web/PWA**: static `dist/` with service worker (offline use + “Install app”).
- **Mobile path**: Tauri 2 mobile targets (Android APK/AAB, iOS IPA) — treat as alpha; keep scope to read-only features until stabilized.

**Stores** (post-MVP): Windows Store, Mac App Store, Play Store, App Store. For Nov-15, prioritize **direct downloads + Gumroad/itch** + your own site; stores require review lead-time and code-signing.

---

## 2) Core UX & MVP Scope

### Canvas-driven calendar layouts
- Month grid auto-fits to selected paper size: **A5 (pocket, half A4)**, **A4**, **A3**.
- Automatic margins & bleed-safe area; user-adjustable gutters.
- Elements (month title, weekday headers, day-number in cell) are **draggable/alignable**; style controls (font, weight, size, color, alignment).
- Per-theme palettes + custom colors. Font picker (bundled open fonts; user can add local fonts on desktop).

### Events
- Click a day to add title-only event.
- Recurring events (daily/weekly/monthly/yearly + interval; end never/on date/after N). Events persist across years.
- Holiday overlays by selected country (toggleable).

### Navigation
- Sidebar (desktop) / slide-out drawer (mobile): month picker, year switcher, size selector, theme, holidays country.

### Import/Export
- **Import:** Google Calendar via ICS file (drag & drop) in MVP; OAuth live sync optional later.
- **Export:** JSON (app data backup), PNG/PDF (print/export page).

### Licensing (MVP)
- On first run, prompt for license key; verify online when possible (Gumroad verify API). If offline: verify signed token w/ embedded expiry + issuer signature.
- Store activation locally; allow “view-only” without license (optional), but **print/export requires license** (switchable rule).

---

## 3) Architecture

**App layers**
- UI (React + Tailwind + FlyonUI)
- Domain (calendar engine: date math, recurrence, layout sizing)
- Persistence (SQLite/IndexedDB; repository pattern)
- Platform (Tauri commands: filesystem, license verify, PDF export [phase 2])

**Rendering strategy**
- Represent a calendar page as **vector layout primitives** (SVG) so output is crisp at print DPI.
- UI editors manipulate a schema → renderer produces SVG for screen + print. For PDF, embed SVG into PDF (react-pdf’s `<Svg>` or Rust generator).

**State**
- Zustand or Redux Toolkit for UI state.
- Domain models typed with Zod schemas for validation.

---

## 4) Data Model (TypeScript)

```ts
// src/domain/models.ts
export type UUID = string;

export type PaperSize = 'A5' | 'A4' | 'A3';
export type Orientation = 'portrait' | 'landscape';

export interface CalendarPrefs {
  id: UUID;
  name: string;
  paper: { size: PaperSize; orientation: Orientation; marginMm: number };
  theme: { fontFamily: string; palette: Record<string, string> };
  holidaysCountry?: string; // ISO-3166-1 alpha-2
  showWeekNumbers?: boolean;
  grid: { gutterMm: number; headerHeightMm: number };
  elements: {
    monthTitle: PositionedTextStyle;
    weekdayHeader: PositionedTextStyle;
    dayNumber: PositionedTextStyle;
  };
}

export interface PositionedTextStyle {
  position: 'top-left'|'top-right'|'bottom-left'|'bottom-right'|'center';
  offsetMm: { x: number; y: number };
  fontSizePt: number;
  weight: number;
  color: string;
  align: 'start'|'center'|'end';
}

export interface EventItem {
  id: UUID;
  title: string;
  date: string; // ISO date for base occurrence
  rrule?: string; // RFC5545 string if recurring
  tz?: string; // Olson
}

export interface AppStateDump {
  prefs: CalendarPrefs[];
  events: EventItem[];
  createdAt: string;
}
```

---

## 5) Recurrence & ICS

- Use **`rrule`** for generating occurrences, store `RRULE:` strings in `EventItem.rrule`.
- ICS import (MVP): parse `.ics` via **`ical.js`**, map VEVENT to `EventItem` (summary → title; RRULE → string). Ignore descriptions/attendees for MVP.
- Time zones: default to user TZ; keep recurrence calculations in UTC with zone-aware presentation.

---

## 6) Holidays

- Bundle a trimmed subset for target countries (MX, UK, US, CA, EU majors) using **`date-holidays`**. Allow dynamic country selection. Overlay as read-only events.

---

## 7) Printing & PDF

### Print CSS
- Implement `@media print` + `@page { size: A5/A4/A3; margin: Xmm }`.
- Render the calendar canvas to **SVG** sized in **mm** to match page size. Browser print keeps vectors sharp.

### PDF (phase 1 or 2)
- **Web/PWA:** `react-pdf` export of the calendar page (vector where possible) to save as file.
- **Desktop (Rust):** optional `printpdf` pipeline that draws the same layout primitives directly into a PDF for perfect fidelity.

---

## 8) Licensing

**Token format**: `base64(json){ userEmail, productId, plan, issuedAt, expiresAt } + ed25519_signature`.

**Flow**
1) User pastes license → Verify online (Gumroad Verify) when available; if valid, also verify **offline signature** (public key shipped). Cache status.
2) Offline: verify signature + expiry; allow grace window (e.g., 7 days) if last online check is stale.
3) Gate printing/export and “save high‑res PDF” behind valid license.

**Vendors**: Gumroad primary. Itch + own site can still issue same signed tokens server-side.

---

## 9) Project Structure

```
loCalendar/
├─ src/
│  ├─ app/ (routes, providers)
│  ├─ components/ (FlyonUI wrappers, calendar editor)
│  ├─ domain/ (models.ts, recurrence.ts, layout.ts)
│  ├─ render/ (svg-page.tsx, pdf-export.ts)
│  ├─ store/ (zustand slices)
│  ├─ utils/ (date, i18n)
│  └─ styles/ (tailwind.css, print.css)
├─ tauri/
│  ├─ src/
│  │  ├─ main.rs (commands: fs, license_verify, pdf_export[opt])
│  │  └─ licensing.rs
│  └─ tauri.conf.json
├─ packages/
│  └─ shared/ (schemas, tokens)
├─ public/ (PWA assets, icons)
├─ scripts/ (release, signing)
└─ README.md
```

---

## 10) Key Commands & Setup

```bash
# Scaffold
pnpm create tauri-app
# or: cargo create-tauri-app

# Install UI deps
pnpm add react react-dom zustand zod clsx rrule dexie
pnpm add -D tailwindcss postcss autoprefixer flyonui @types/node
npx tailwindcss init -p

# Tauri plugins
pnpm add @tauri-apps/api @tauri-apps/plugin-sql @tauri-apps/plugin-fs

# ICS + PDF (optional)
pnpm add ical.js @react-pdf/renderer
```

**Tailwind & FlyonUI**: integrate FlyonUI plugin in `tailwind.config.cjs`; include its scripts per docs.

---

## 11) Layout & Auto-Fit Logic (sketch)

- Input: page size in **mm**, margins in **mm**.
- Compute inner box = page − margins.
- Month grid: 7 columns × 6 rows; gutter from prefs.
- Day cell size = floor(innerWidth − 6*gutter)/7 by floor(innerHeight − 5*gutter)/6.
- Title/header occupy fixed mm heights; remainder to grid.
- Use **SVG viewBox in mm** to get resolution-independent print.

---

## 12) Minimal UI Milestones

1) **Skeleton**: sidebar, month view, add one-time event.
2) **Styles & drag**: typography controls, drag positions with snapping.
3) **Recurrence**: RRULE editor (simple presets), generation.
4) **Holidays**: country dropdown overlay.
5) **Print/PDF**: `window.print()` with perfect @page sizing; PNG export of SVG.
6) **Licensing**: prompt + validation, gate print/export.
7) **Import**: ICS drag & drop.

---

## 13) Security & Privacy

- All data local by default. No cloud sync in MVP.
- License check only calls vendor endpoint; no event data leaves device.

---

## 14) Timeline to **Nov 15** (aggressive)

**Oct 29–Nov 1 (4 days):**
- Project scaffold, Tailwind/FlyonUI, Tauri plugin wiring.
- Calendar engine: date grid + SVG render sized by A5/A4/A3.

**Nov 2–4 (3 days):**
- Event store (SQLite/IndexedDB) + one-time events.
- Print styles `@page` + `window.print()` delivering true A5/A4/A3.

**Nov 5–7 (3 days):**
- Recurrence with rrule; basic RRULE editor.
- Drag/position + typography controls; theme presets.

**Nov 8–9 (2 days):**
- Holidays overlay (date-holidays) with country selector (MX/UK/US first).
- PNG export from SVG.

**Nov 10–11 (2 days):**
- Licensing (Gumroad verify + offline signature). Gate print/export.
- ICS import (ical.js) for Google Calendar.

**Nov 12–13 (2 days):**
- Packaging for Win/macOS/Linux; web/PWA build; Gumroad/itch listings.

**Nov 14:** QA smoke tests + landing page; release candidates.

**Nov 15:** Launch (direct downloads + Gumroad + your site). Iterate weekly afterward.

---

## 15) Store Readiness (post-MVP)

- Code signing: Windows (EV cert optional), macOS (Developer ID + notarization).
- App Store/Play: set up native project wrappers via Tauri 2 mobile; relax features (no raw file access) as needed.

---

## 16) Risk & Scope Guardrails

- **Mobile**: keep as tech preview only if unstable; publish web/PWA for phones as stopgap.
- **PDF fidelity**: rely on browser print in MVP; defer Rust-PDF.
- **OAuth Google Calendar**: start with ICS import. Add OAuth later.

---

## 17) Next Actions (today)

- Initialize repo & scaffold.
- Implement SVG month grid sized in mm with print CSS.
- Wire SQLite/IndexedDB + add one-time events.
- Draft license token format + verification command in Rust.
- Prepare Gumroad listing + product id for verification endpoint.

---

## 18) Sample Snippets

**SVG Renderer (excerpt)**
```tsx
// src/render/svg-page.tsx
export function CalendarPage({ year, month, prefs, events }: Props) {
  const { sizeMm, marginMm } = getPageDims(prefs.paper);
  const inner = inset(sizeMm, marginMm);
  const grid = computeGrid(inner, prefs.grid.gutterMm);
  return (
    <svg width={`${sizeMm.w}mm`} height={`${sizeMm.h}mm`} viewBox={`0 0 ${sizeMm.w} ${sizeMm.h}`}>
      {/* Title */}
      <text x={inner.cx} y={marginMm + 12} textAnchor="middle" fontSize={prefs.elements.monthTitle.fontSizePt}>
        {formatMonth(month)} {year}
      </text>
      {/* Grid cells */}
      {grid.cells.map(c => (
        <g key={c.key}>
          <rect x={c.x} y={c.y} width={c.w} height={c.h} fill="white" stroke="#ddd" />
          <text x={c.x + 2} y={c.y + 5} fontSize={prefs.elements.dayNumber.fontSizePt}>{c.day}</text>
          {/* map events for this day */}
        </g>
      ))}
    </svg>
  );
}
```

**Tauri license verify command (sketch)**
```rust
#[tauri::command]
pub async fn verify_license(token: String) -> Result<LicenseStatus, String> {
    // 1) try Gumroad verify endpoint (if online)
    // 2) always validate our Ed25519 signature offline
    // 3) return status with expires_at & grace flags
    Ok(LicenseStatus { valid: true, expires_at: None, grace: false })
}
```

---

*End of v0.1 blueprint.*


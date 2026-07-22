# AGENTS.md — SMK Muhammadiyah 3 Purbalingga Attendance System

## Tech Stack
- **Next.js 16** (App Router) — `next@16.2.9`
- **React 19** — `react@19.2.4`
- **Tailwind CSS 4** + **shadcn/ui** — `tailwindcss@4`, `@tailwindcss/postcss@4`
- **Supabase** (PostgreSQL + Auth) — `@supabase/supabase-js@2.108.2`, `@supabase/ssr@0.12.0`
- **Sonner** (toasts) — `sonner@2.0.7`
- **SheetJS/xlsx** (Excel import/export) — `xlsx@0.18.5`
- **Leaflet + React-Leaflet** (maps/geofencing) — `leaflet@1.9.4`, `react-leaflet@5.0.0`
- **date-fns** — `date-fns@4.4.0`
- **Python 3.12** — `C:\Users\USER\AppData\Local\Programs\Python\Python312\python.exe`

## Dev Commands
```bash
# From project root: C:\Users\USER\Documents\fayyad\Website Presensi Siswa\presensi-siswa
npm run dev          # Dev server (Next.js 16 uses --webpack flag)
npx tsc --noEmit     # TypeScript check
npm run lint         # ESLint (next/core-web-vitals + next/typescript)
npm run build        # Production build
npm start            # Start production server
ngrok http 3000      # Mobile testing (separate terminal)
```

## Project Structure
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Server auth check → AuthProvider
│   │   ├── admin/              # Admin: students, teachers, classes, settings, presensi-guru, presensi-siswa
│   │   ├── guru/               # Guru: presensi, rekap, profil, kelar
│   │   ├── siswa/              # Siswa: presensi, profil
│   │   └── dashboard/          # Landing dashboard
│   ├── api/admin/              # Server routes: create-user, update-password, delete-user, sync-holidays, holidays, import-users
│   ├── login/page.tsx          # Login page
│   ├── globals.css             # Claymorphism theme + toast styles
│   └── layout.tsx              # Root layout, fonts, Toaster
├── components/
│   ├── ui/                     # shadcn/ui components (button, card, dialog, etc.)
│   ├── Navbar.tsx              # Top nav (desktop)
│   ├── BottomNav.tsx           # Bottom nav (mobile)
│   ├── BottomNavWrapper.tsx    # Wrapper with role-based logic
│   └── Footer.tsx
├── contexts/AuthContext.tsx    # AuthProvider: user, session, isWaliKelas, role
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client (cookies)
│   │   └── middleware.ts       # Auth middleware (deprecated but works)
│   ├── helpers.ts              # Date utils, school-day calcs (isSchoolDay, countSchoolDays, etc.)
│   ├── holidays.ts             # Holiday sync (Tallyfy API) & fetch
│   ├── geofencing.ts           # GPS distance check (Haversine)
│   └── device.ts               # Device fingerprinting
├── types/database.ts           # Supabase generated types
└── middleware.ts               # Auth redirect middleware (deprecated in Next 16 but works)
```

## Design System — Claymorphism
- **Fonts**: Baloo 2 (headings, `--font-heading`), Comic Neue (body, `--font-body`)
- **Colors**: 
  - Primary `#4F46E5` (indigo)
  - Accent/CTA `#F97316` (orange)
  - Success `#22C55E` (green)
  - Destructive `#EF4444` (red)
  - Warning `#F59E0B` (amber)
  - Info `#3B82F6` (blue)
- **Background**: `linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #EEF2FF 100%)`
- **Radius**: `--radius: 0.75rem` (12px base; cards 20px, buttons 14px)
- **Shadows**: Double-layer soft shadows (`--shadow-clay`, `--shadow-clay-lg`, `--shadow-clay-xl`)
- **CSS Classes**: `.clay-card`, `.clay-button`, `.clay-button-accent`, `.clay-input`, `.clay-badge`, `.bottom-nav`
- **Toasts**: Sonner, `position="top-center"`, `richColors`, claymorphism styling in `globals.css` (no close button, accent bar, progress bar, 8s undo timer)

## UI Language
**All user-facing text MUST be in Bahasa Indonesia.** No English in UI labels, buttons, toasts, or messages.

## Auth & Roles
- **Roles**: `admin`, `guru`, `siswa`
- **Flow**: `(dashboard)/layout.tsx` (server) → fetches session + `is_wali_kelas` → passes to `AuthProvider` → children use `useAuth()`
- **Guru non-wali**: Sees only Beranda, Profil, Kelar (NO Presensi, NO Rekap)
- **Guru wali**: Full nav (Beranda, Presensi, Rekap, Profil, Kelar)
- **Supabase Auth**: Email/password, server-side session via `@supabase/ssr`
- **Service Role Key**: In `.env.local` as `SUPABASE_SERVICE_ROLE_KEY` — used in `/api/admin/*` to bypass RLS

## GPS / Geofencing Policy
- **GPS BLOCKS attendance submission** for both guru and siswa
- If GPS unavailable/disabled: submit buttons disabled + warning banner shown
- Geofence check in `src/lib/geofencing.ts` (Haversine formula, school coordinates in DB/settings)

## Holidays System
- **Source**: Tallyfy free API `https://tallyfy.com/national-holidays/api/ID/{year}.json`
- **Sync**: `POST /api/admin/sync-holidays` (server, service role key)
- **Table**: `holidays` (id, date UNIQUE, name, source, created_at)
- **Helpers** (`src/lib/helpers.ts`): `isWeekend`, `isHoliday`, `isSchoolDay`, `countSchoolDays`, `getPrevSchoolDays`
- **School week**: Mon–Fri (5 days)

## Attendance Statuses
`hadir` | `terlambat` | `sakit` | `izin` | `alpa` | `pulang`

## Import / Export
- **Import passwords**: 
  - Siswa = NIS (padded to 6 digits)
  - Guru = `Guru` + 3-digit number (e.g., `Guru001`)
- **Export**: Excel via SheetJS (`xlsx`) — no passwords in export (hashed in Supabase Auth)
- **Rekap**: Accessed via buttons on Data Siswa / Data Guru pages (NOT in navbar)

## Supabase Notes
- **Project**: `hnbyyplmkpwlefpilbtu` (Singapore)
- **RLS**: Enabled; admin API routes use service role key to bypass
- **Query pattern**: Prefer `.maybeSingle()` over `.limit(1).single()` to avoid PostgREST 406
- **Types**: `src/types/database.ts` (generated via Supabase CLI)

## Key Files
| File | Purpose |
|------|---------|
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `next.config.ts` | `allowedDevOrigins: ["*.ngrok-free.app"]` |
| `src/app/globals.css` | Claymorphism theme, toast styles, fonts |
| `src/app/layout.tsx` | Root layout, fonts, `<Toaster>` |
| `src/app/(dashboard)/layout.tsx` | Server auth guard, `isWaliKelas` fetch, `AuthProvider` |
| `src/contexts/AuthContext.tsx` | Client auth context + `useAuth()` hook |
| `src/lib/supabase/server.ts` | Server Supabase client (cookies) |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/holidays.ts` | Holiday sync/fetch logic |
| `src/lib/helpers.ts` | Date formatting, school-day math |
| `src/lib/geofencing.ts` | GPS distance validation |
| `src/components/BottomNavWrapper.tsx` | Role-based bottom nav logic |

## Known Warnings (Safe to Ignore)
- `⚠ The "middleware" file convention is deprecated` — Next.js 16 deprecation; middleware still works
- `bis_skin_checked="1"` hydration errors — Bitdefender browser extension artifact
- Font preload warnings — harmless
- PostCSS/Tailwind v4 migration warnings — expected

## Development Notes
- **Next.js 16** uses `--webpack` in `dev` script (see `package.json`)
- **Turbopack** enabled by default in dev; build uses webpack
- **TypeScript**: Strict mode enabled (`tsconfig.json`)
- **ESLint**: Extends `next/core-web-vitals` + `next/typescript`
- **No test suite configured** — add Vitest/Jest if needed
- **Python**: Used for scripts (e.g., Supabase migrations, data scripts) — path in `CLAUDE.md`
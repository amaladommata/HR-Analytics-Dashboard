# HR Leadership Dashboard

A React/TypeScript dashboard replacing the team's Looker HR reporting, built per
`docs/BUILD_SPEC.md`. Reads four exported CSVs (Headcount, Exits-YTD, Notice
Period, Global Exits) and computes point-in-time headcount and attrition
against a **filtered** denominator — the core bug this rebuild fixes.

## Stack

Vite + React + TypeScript, Tailwind CSS, Recharts, PapaParse.

## Running locally

```bash
npm install
npm run dev      # dev server
npm run build    # typecheck + production build
npm run preview  # serve the production build
```

## Data refresh

There are two data sources, and the app prefers the live one automatically:

1. **Live Google Sheets** (`api/sheets-data.ts`) — if configured, the dashboard
   reads straight from Google Sheets on load and every 60s after, so an edit
   to the sheet shows up in the dashboard without any redeploy. See "Live data
   from Google Sheets" below to set it up.
2. **Bundled CSV snapshot** (`src/data/*.csv`) — used automatically whenever
   the live endpoint isn't configured or isn't reachable (e.g. running
   `npm run dev` locally without `vercel dev`). To refresh this snapshot,
   re-export the four tabs with the same headers, replace the CSVs, and
   rebuild.

A badge in the top-right of the header shows which source is currently live
("Live from Sheets" vs "Bundled snapshot").

- `headcount_clean.csv` / Headcount tab — one row per employee (Active + Inactive), current snapshot.
- `exits_ytd_clean.csv` / Exits YTD tab — one row per exit, current FY only; richest reason/category detail.
- `notice_period_clean.csv` / Notice Period tab — one row per employee currently serving notice.
- `global_exits_clean.csv` / Global Exits tab — one row per exit, all-time; the source of truth for exit dates (`Confirmed LWD`).

Join key across all four: `MMID` (`Mediamint id` in Headcount). Column headers
must match exactly what `src/lib/loadData.ts` expects — if HR renames a
column in the sheet, update the corresponding `r['Column Name']` lookup there.

### Live data from Google Sheets

The dashboard reads Sheets through a small serverless function
(`api/sheets-data.ts`) using a Google Cloud **service account**, so the
sheets stay private — never published to the web — and access is controlled
the same way as the dashboard itself (invite-only).

1. **Create a service account** (one-time, ~5 min):
   - Go to [console.cloud.google.com](https://console.cloud.google.com/), create or pick a project.
   - Enable the **Google Sheets API** (APIs & Services → Library → search "Google Sheets API" → Enable).
   - APIs & Services → Credentials → Create Credentials → Service Account. Give it any name (e.g. `hr-dashboard-reader`).
   - Open the new service account → Keys → Add Key → Create new key → JSON. This downloads a `.json` file — keep it private, it's a credential.
2. **Share each of the 4 sheets** with the service account's email (looks like
   `hr-dashboard-reader@your-project.iam.gserviceaccount.com`, found in the
   JSON file as `client_email`) — Viewer access is enough.
3. **Set environment variables** in Vercel (Project → Settings → Environment Variables) — see `.env.example` for the exact names:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — the `client_email` from the JSON.
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — the `private_key` from the JSON, pasted as-is (Vercel handles the embedded `\n`s).
   - `SHEET_HEADCOUNT`, `SHEET_EXITS_YTD`, `SHEET_NOTICE_PERIOD`, `SHEET_GLOBAL_EXITS` — each as `<spreadsheetId>#<tabName>`. The spreadsheet ID is the long id in the sheet's URL: `docs.google.com/spreadsheets/d/<spreadsheetId>/edit`. All four can point at tabs in the same spreadsheet or four different spreadsheets.
4. Redeploy (or just wait for the next deploy) — the header badge will flip to "Live from Sheets" once it's working. If it stays on "Bundled snapshot", check the Vercel function logs for `api/sheets-data` for the error message.

## Calculation engine

`src/lib/calc.ts` implements the pure functions every tile/table/chart calls,
per `docs/BUILD_SPEC.md`:

- `isActiveAsOf(employee, date)` — active/inactive strictly as of a date, derived
  from a resolved exit date (Global Exits `Confirmed LWD` → `LWD`, falling back
  to Exits-YTD `LWD`), never from today's live `Status` field.
- `headcount(employees, date, filters)`
- `avgHeadcount(employees, periodStart, periodEnd, filters)` — `(HC at start + HC at end) / 2`
- `attritionPct(employees, periodStart, periodEnd, filters)` — exits in period ÷ avg headcount, **recomputed per filter combination**
- `topReasons`, `topClientAttrition`

## Known data gaps (see `docs/BUILD_SPEC.md` section 7)

- Client is reconstructed via a Team-name → Client lookup built from
  Exits-YTD/Notice Period; it only covers a minority of active employees'
  teams. Billing Type and PG Rating have no source in this export and are not
  available as filters.
- Employees with `Status = InActive` and no matching record in Global Exits or
  Exits-YTD have an unresolved exit date; they're excluded from historical
  as-of-date headcount and flagged in the in-app data-quality banner.

## Pages

Summary, Headcount, Attrition, Notice Period — each with Monthly/QTD/FYTD
toggles, a 13-month rolling trend, and dimension breakdowns. All filters
(Client, Country, Grade, Service Area, Gender, Employee Type) combine with AND
logic and every percentage recomputes against its own filtered denominator.

OT Encashments from the original scope is not included — no source data for
it was provided in this export.

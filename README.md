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

Source data lives in `src/data/*.csv` (bundled into the app at build time —
there is no backend). To refresh, re-export the four tabs from the source
workbook with the same headers and replace the CSVs, then rebuild.

- `headcount_clean.csv` — one row per employee (Active + Inactive), current snapshot.
- `exits_ytd_clean.csv` — one row per exit, current FY only; richest reason/category detail.
- `notice_period_clean.csv` — one row per employee currently serving notice.
- `global_exits_clean.csv` — one row per exit, all-time; the source of truth for exit dates (`Confirmed LWD`).

Join key across all four: `MMID` (`Mediamint id` in Headcount).

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

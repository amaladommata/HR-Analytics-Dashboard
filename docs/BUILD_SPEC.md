# HR Leadership Dashboard — Build Spec for Claude Code

Source system: exported from "Employee Tracking & Monitoring" workbook (4 tabs).
Target: a live-in-Claude dashboard (React/Artifact or Claude Code app), replacing Looker.
No MM Portal integration in this phase — data is refreshed via re-uploaded/re-exported CSVs.

## 1. Input files (attached alongside this spec)
- `headcount_clean.csv` — one row per employee, Active + Inactive, current snapshot.
- `exits_ytd_clean.csv` — one row per exit, FY26-27 (Apr 2026 → date), richest reason/category data.
- `notice_period_clean.csv` — one row per employee currently serving notice (resigned, LWD in future).
- `global_exits_clean.csv` — one row per exit, ALL-TIME (2018 → date). This is the master exit ledger and the only reliable source of `Confirmed LWD`.

Join key across all four files: `MMID` (Headcount calls it `Mediamint id`). MMID formats vary (`MM####`, `MI####`, `MMP##`) but are consistent per employee across files.

## 2. Core derived table: `employee_status_by_date`

For ANY as-of-date `D` the dashboard needs an active/inactive flag per employee. Build this once per data refresh, not per filter click.

```
for each employee E in headcount_clean:
    doj = E["Date Of Joining/Permanent"]
    if E.Status == "Active":
        exit_date = null          # currently active in source, no known exit
    else:  # Status == "InActive"
        # look up exit_date, preferring the master ledger
        ge_match = global_exits_clean.filter(MMID == E.MMID)
        exytd_match = exits_ytd_clean.filter(MMID == E.MMID)

        if ge_match exists:
            exit_date = ge_match["Confirmed LWD"] or ge_match["LWD"]   # Confirmed LWD wins; fall back to LWD if blank
        elif exytd_match exists:
            exit_date = exytd_match["LWD"]
        else:
            exit_date = null      # UNRESOLVED — see Section 5, Known Gaps

    E.exit_date_resolved = exit_date

def is_active_as_of(E, D):
    if E.doj > D:
        return False                       # not yet joined as of D
    if E.exit_date_resolved is null:
        return True if E.Status == Active else UNKNOWN   # see gap handling below
    return D < E.exit_date_resolved         # still counted active through their LWD; inactive strictly after LWD
```

Rule confirmed with stakeholder: an employee who was active in June and exited in August must still show as **active** when the dashboard is filtered to June — i.e. status is evaluated strictly as of the selected date using `exit_date_resolved`, never using today's live `Status` field alone. This is why `exit_date_resolved` (not the raw `Status` column) is the field every headcount query filters on.

**Unresolved records** (Status = InActive, no match in Global Exits or Exits-YTD — see Section 5): treat as active only up to `doj` with no known end date is unsafe. Recommended interim rule: exclude these ~729 employees from any as-of-date historical headcount calculation and flag them in a data-quality tile ("X employees have no exit record — headcount figures for dates before today may be understated"). Do not silently count them as active forever, and do not silently drop them from today's inactive count.

## 3. Point-in-time headcount

```
headcount(D, filters) = count of employees E where is_active_as_of(E, D) == True
                         AND E matches filters (Client, Country, Grade, Service Area, ...)
```

## 4. Average headcount (attrition denominator)

```
avg_headcount(period, filters) = ( headcount(period_start, filters) + headcount(period_end, filters) ) / 2
```
This matches the stakeholder's example: June attrition % = June exits / ((HC as on June 1 + HC as on June 30) / 2).
For quarters/FYTD, extend the same pattern: (HC at period start + HC at period end) / 2. Do not average daily snapshots unless daily history is later available — opening+closing/2 is the agreed method.

## 5. Attrition %

```
exits(period, filters) = count of employees whose exit_date_resolved falls inside [period_start, period_end] AND match filters
attrition_pct(period, filters) = exits(period, filters) / avg_headcount(period, filters) * 100
```
Use `global_exits_clean` (all-time, Confirmed LWD) as the source of exit events — it is more complete and has a validated LWD field. `exits_ytd_clean` is used for reason/category detail because it carries richer fields (Reasons Category, Voluntary/Involuntary) that Global Exits lacks in this export; join the two on MMID to attach reason detail to a Global-Exits-confirmed exit event where possible.

## 6. Top reasons / top client attrition
```
top_reasons(period, filters) = group exits by "Reasons Category" (from exits_ytd_clean, joined on MMID), count desc, top 3
top_client_attrition(period) = group by Client (via Team→Client mapping, see gap below), compute attrition_pct per client, 
                                 EXCLUDE clients with avg_headcount < 15 (small-base noise), sort desc, top 3
```

## 7. Known data gaps to resolve before building (see BRD Section 4 for detail)
1. `headcount_clean.csv` has NO `Client`, `Delivery Head`, `Billing Type`, or `PG Rating` columns. Client/Delivery Head can be partially reconstructed via a `Team name → Client` lookup built from `exits_ytd_clean`/`notice_period_clean`, but that lookup only covers ~16% of active employees' teams (120 of 742 distinct teams). Billing Type and PG Rating have no source at all in these four tabs.
   → **Action needed before Client/Billing Type/PG Rating filters can work on the Headcount or Summary pages**: HR to supply (a) a master Team→Client mapping table, and (b) a Billing Type and PG Rating field per employee (likely already tracked somewhere in MM Portal/finance systems even if not in this export).
2. 729 of 3,662 inactive employees (~20%) have no matching record in Global Exits or Exits-YTD, so their exit date is unknown. As-of-date headcount for past periods will be slightly overstated for older dates until this is cleaned up.
3. `Confirmed LWD` is blank for ~8% of Global Exits rows (253 of 3,192) — code falls back to `LWD`, but both are blank for 2 records.

## 8. Suggested build approach in Claude
- Build as a Claude Artifact (React) reading the 4 CSVs (or a single pre-joined `employee_master.json`) via `window.storage` for persistence between sessions, OR as a Claude Code project with the CSVs as local data files, re-run/re-uploaded each refresh cycle.
- Precompute `employee_status_by_date` and a monthly grain table (`month_end_snapshot`: one row per employee per month-end, active flag) once at load, not on every filter change — this is what makes filters feel instant and keeps percentage math correct per Section 5.4 of the BRD.
- Keep calculation functions (`headcount()`, `avg_headcount()`, `attrition_pct()`) as pure functions taking `(period, filters)` so every tile/table/chart calls the same logic — this directly fixes the Looker bug where percentage tiles didn't recompute against the filtered denominator.

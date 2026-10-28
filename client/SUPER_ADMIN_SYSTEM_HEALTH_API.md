# System Health integration and backend blockers

Latest backend main verified with git ls-remote on 2026-10-28:
`ab3eba17e65219680722d3eca71d1bfa77b1a0e3`.
Latest integrations-health.service.ts and super-admin.controller.ts were read at
that commit. The recursive backend tree, app controller and admin controller were
also checked for an independent monitoring/incident read. main.ts at the same
commit registers the `api` global prefix. No endpoint names were inferred.

This is a safe partial integration: production connects current API liveness only.
Full service monitoring and incident requests are deliberately withheld because
the registered read paths can insert seed incidents. They must not be enabled
until the backend provides a genuinely read-only operation. A combined-response
adapter is implemented/tested for that later contract, but it is not fetched by
the protected page. No environment flag or user control bypasses this restriction.

## Actual registered routes, methods and structures

| Route | Response / behavior | Connection policy |
| --- | --- | --- |
| GET /api/super-admin/health-check | `{status:'UP',uptime:floor(process.uptime()),timestamp:ISO}`. SkipThrottle; no method-level JWT/Roles decorators. Handler returns values only, without DB access, cache writes or provider calls. | Connected with the existing Super Admin Bearer/session convention, inside the existing verified session boundary. Observes API handler liveness only. |
| GET /api/super-admin/system-health | JWT/Roles for Super Admin/Admin. Optional filter=all/operational/degraded/down. Unwrapped `{title,subtitle,checkedEveryMinute,lastChecked,alert,summary,platform,incidents}`. Before reading, calls seedInitialIncidentsIfEmpty(), which can insert three design incidents. Also executes SELECT 1 and an artificial local auth benchmark. | Not requested by production or live tests. There is no readOnly/dryRun parameter. |
| GET /api/super-admin/integrations | Same guards. No query parameters. Array of `{id,name,category,uptimePercent,latencyMs,status,statusLabel,lastChecked,description}`. Calls getSystemHealthOverview() internally and therefore the same incident seeding. Despite the four-service comment, it returns the six platform entries. | Not requested; cannot be used as a safe fallback. |
| GET and POST /api/super-admin/system-health/run-checks | Same guards. No DTO/query controls. Both invoke runChecksNow(), call the seed-capable overview, and insert a PlatformActivity audit row. Return `{success,message,executionTimeMs,health}`; GET is 200 and POST has Nest's default POST status. | No callable client or handler added. Run checks now remains disabled. |
| GET /api/super-admin/server-strength | Same guards; returns `{timestamp,serverStrengthScore,status,statusColor,summary,metrics,recommendations}`. Metrics include CPU/memory/database/cache/event-loop/process. It pings Redis or writes/reads/deletes a cache test key, and queries the DB. | Not requested: triggers diagnostics/cache writes and is not a passive monitoring snapshot. |

No independent incident-list endpoint or read-only service-monitoring endpoint is
registered in the inspected controllers/tree. SystemIncident records are exposed
only inside the seed-capable combined response. No invented /incidents route or
monitoring query flag was added.

## Safe live page behavior

systemHealthApi.js reuses getSuperAdminAccessToken/setSuperAdminAccessToken, the
configured VITE_API_BASE_URL origin, Bearer/no-store GET pattern, abort/current-token
guards and 401/403 invalidation. Previous API helpers have no generic exported
request primitive; their code and auth/routing are unchanged. The existing boundary
still verifies sessions and checks expiry. A successful public liveness response
is not used as proof of Super Admin authorization.

Only health-check is requested, initially and every minute. The configured
Medtrail API presentation identity/reference is associated with that known API
handler; it is not presented as an id/name field returned by the ping. The raw UP
observation appears as an Up badge using the existing green palette. It does not
become Operational dependency status, a 30-day uptime percentage, client-measured
response time or a zero incident count. Existing Operational/Degraded filters do
not misclassify Up as full operational coverage.

The live subtitle and Platform period describe current API liveness instead of
claiming historical/dependency coverage. Other metrics remain unknown. The
unavailable alert uses a neutral existing palette and the same geometry; preview
warning styling is unchanged. Original service/incident badges, table layout,
font sizes, spacing, responsiveness and desktop footprint are preserved. A real
Down database status is supported by the prepared adapter without inventing a
response-time measurement for a failure sentinel.

Loading, no-content (204), network/server/schema errors and retry use the existing
containers. Unknown incident collections never become 'No open incidents' or zero.
Retry repeats only the safe GET. Refresh hides the previous observation while the
new request is unresolved. Polling cancels any previous read, and stops on unmount,
navigation, retry-cycle replacement or session rejection. Stale responses cannot
publish data or clear a newer session. Preview and supplied-state harnesses remain
request-free and do not poll. Arbitrary backend messages are never shown.

## Combined-response adapter and unavailable fields

mapSystemHealthOverview() prepares the actual response structure without enabling
the unsafe request. It is tested against isolated fixtures only.

| Field | Policy |
| --- | --- |
| summary.apiUptime30Days | Unavailable: 99.98%, target, period and related strings are fixed. No observed 30-day duration/sample window. |
| summary.apiResponseTime | Unavailable: fixed 182 ms and fixed percentile claims. No request samples or measured API latency. |
| summary.paymentWebhooks | Unavailable: fixed 99.8%, no real delivery/first-attempt counters. |
| summary.openIncidents / incidents.openCount | Ignore count || 1 fallbacks. In a future safe snapshot, derive the count only from the explicit open repository items array, including genuine empty zero. Current production does not retrieve that array. |
| resolvedThisMonth | Unavailable: query counts all resolved incidents, not a calendar month, then substitutes 2 for zero. |
| platform name/reference/description | Preserve returned reference and full names as service catalog configuration, not proof that a probe was performed. Normalize medtrail-api/auth-sessions to existing presentation IDs. |
| platform uptimePercent | Unavailable for all six rows: every uptime percentage is fixed, including Database. |
| Database latency/status | Only DB SELECT 1 result is genuinely observed. Success latency is backend-reported rounded/floored at 8 ms, not exact timing. The adapter can retain that bounded DB sample and observed operational/degraded status. Down is observed on query failure, but 9999 is a sentinel and is never displayed as latency. These fields are not retrieved in production while the endpoint can seed. |
| Auth latency/status | Unavailable: timing Buffer/base64 work with a multiplier, additive constant, floor and fallback is not sign-in/session/OTP service monitoring. Operational status is fixed. |
| API/Paystack/Termii statuses and latency | Unavailable: hardcoded values, including the Termii SMS degradation. No external checks establish those statuses. No fallback equality/name heuristics are applied. |
| alert / all six services verified | Ignore backend assertions, which combine demonstration statuses or overstate checks. Never claim all dependencies operational from the API ping. |
| incidents.items | ID/title/serviceName/rawTime are repository-backed fields. The formatter rewrites every open status to Investigating, so the adapter marks the guaranteed open membership internally but shows phase Unavailable. It does not assert an actual Investigating/Identified/Monitoring phase. |
| Incident time/reporting month | Format raw timezone-qualified timestamps as UTC. Ignore relative formatted text and the fixed October 2026 month. An internal presentation marker prevents inventing a reporting month from the newest incident timestamp. |
| Incident descriptions/impact | Not needed for the approved list; discarded rather than leaking arbitrary private response fields. |

Backend startup and the combined GET both seed design incidents. Returned rows do
not identify seed provenance. Even after removing GET-time seeding, validate a
known isolated dataset before describing repository incidents as operational
records. No frontend seed-name blacklist or fabricated incident rows were added.

## Required backend changes and live verification

Provide a side-effect-free monitoring/incident read, with no seeding and no audit
writes. Supply real uptime observations/window, request/percentile measurements,
webhook counters, source-tagged service observations/timestamps and nullable values
for unmeasured services. Preserve raw incident phase, a real reporting period and
month-scoped resolution counts with correct zero semantics. Keep seeding separate
from reads. A read-only snapshot must not claim a diagnostic ran when it did not.

Only after that contract is verified should the production client switch from
liveness-only to the prepared combined adapter. No unsafe opt-in was added.
Manual checks require a separately authorized safe operation; neither current
run-checks method satisfies the no-mutation restriction. Live credentials/profile,
CORS/configured origin, deployed response parity, real expiry/logout and role
rejection remain unverified. Full monitoring/incident live testing additionally
requires the backend fixes above; do not test the current seed-capable routes on
a real database for this task.

## Validation and changed files

All 164 Super Admin unit tests passed, including 24 focused System Health tests.
All 38 System Health API/summary/platform/incident browser cases passed. Coverage
includes absence of forbidden endpoint calls, raw ping semantics, unknown summary
fields, prepared DB/incident mapping, rewritten incident phase suppression, empty
versus unavailable, loading/network/schema/server/retry, 401/403 preserving Admin
sessions, polling/cancellation/stale refresh, preview isolation, existing badges,
filters, responsive geometry and desktop/short-screen fit. Browser API traffic was
intercepted; no deployed monitoring endpoint or external provider was triggered.
Changed-file ESLint, production build and git diff --check passed. Build retains
the existing >500 kB chunk warning.

Files changed for this task:
- src/super-admin/SuperAdminSystemHealth.jsx
- src/super-admin/SystemHealthAlert.jsx
- src/super-admin/SystemHealthPlatform.jsx
- src/super-admin/SystemHealthIncidents.jsx
- src/super-admin/systemHealthApi.js
- src/super-admin/systemHealthResponse.js
- tests/super-admin-system-health-api.test.mjs
- tests/e2e/super-admin-system-health-api.spec.mjs
- SUPER_ADMIN_SYSTEM_HEALTH_API.md

Other six Super Admin pages, authentication, routing, backend, CSS and dependencies
were not changed. Existing uncommitted work was retained. No monitoring mutation,
external check, database seed/migration, commit, push, merge or deployment occurred.

# Audit Log API integration

Latest backend main verified on 2026-10-28 with git ls-remote:
`764c1b9fd623784574e94cc49cc476989917e374`.
The main branch advanced since System Health. Latest main.ts,
super-admin/super-admin.controller.ts, super-admin/super-admin.service.ts and the
changed admin/admin.controller.ts were read at this commit. The complete backend
tree was inspected for audit/export route sources. No backend code was changed.

## Suitable read-only endpoint exists

GET /api/super-admin/activities is explicitly documented in the Super Admin
controller under "Recent Platform Activities / Audit Log". main.ts sets the `api`
prefix and the controller registers `super-admin`. JwtAuthGuard and RolesGuard
require a valid JWT and permit UserRole.SUPER_ADMIN or UserRole.ADMIN. The frontend
uses only the existing verified Super Admin session and never reuses an Admin token.

The controller delegates to getPlatformActivities(). That method queries the
PlatformActivity repository with getManyAndCount and returns records only; it does
not call a seed routine, write activities, run monitoring or trigger providers.
It is suitable for the platform events described by the existing Audit Log page.
The separate hospital-scoped GET /api/admin/audit-log and its activities alias are
not used, even though the latest Admin controller also permits the Super Admin role.

Unwrapped response:

    {
      activities: [{
        id, when, rawDate,
        who: { name, role },
        action, facility, facilityId, status, metadata
      }],
      total, page, limit, totalPages
    }

Registered parameters:
- page/limit: page >= 1; limit is clamped to 1..100 (backend default 20).
- facility: case-insensitive substring match against facilityName.
- role: case-insensitive substring match against actorRole.

No general search, action/date filters, sort column or sort direction parameter is
registered. Server ordering is always createdAt DESC, with no secondary tie-breaker
or snapshot/cursor. Empty results return total=0 and totalPages=0.

## Connected UI and field mapping

The protected Audit Log page requests seven server records in the default newest
first mode. When/Who/Action/Facility headings and their existing direction-toggle
behavior are retained. To sort oldest-first or by any text column correctly, the
helper gathers the complete matching dataset in batches of 100, then applies the
existing stable local sort before seven-record pagination. Switching local columns,
directions or pages reuses that complete collection; returning to newest-first
uses fresh seven-row server paging. Sorting never silently applies to one fetched
page, and unsupported sorting query parameters are never sent.

Collection checks total consistency, duplicate IDs and complete row count across
all pages. Changes or partial snapshots produce a retryable error without displaying
partial results. Cancellation stops abandoned page/sort loads and late results
cannot overwrite a newer choice or clear a newer session. Equal-key rows retain
source order under the existing sort model. The backend's lack of secondary order
and atomic snapshots remains a limitation for concurrent or tied records.

| Backend field | Table/policy |
| --- | --- |
| id | Required unique record key. Malformed/duplicate identities fail explicitly. |
| rawDate | Validate calendar and explicit timezone, then display with the existing UTC formatter. Ignore the server's preformatted when value. Invalid/missing timestamp shows Unavailable, not a guessed date. |
| who.name | Actor name. Missing/blank values show Unavailable; System is never inferred from an action. |
| who.role | Preserved verbatim beneath the name with existing typography. No invented user-role mapping; missing role shows Unavailable. This is the persisted actor-role label, not proof of the actor's current authorization. |
| action | Literal backend display text. No enum translation, guessed action or canned fallback event is generated. Missing text shows Unavailable. |
| facility | Full facility name in the existing Facility column. Missing value retains the approved em dash. |
| facilityId/status/metadata and other fields | Not copied into display state; no contact data, arbitrary metadata or severity is exposed in this table. |

The API helper follows the existing configured-origin, Bearer-only/no-store GET,
getSuperAdminAccessToken/setSuperAdminAccessToken, abort/current-token guard and
401/403 invalidation convention. The existing auth boundary still performs profile
verification, expiry and redirection. Prior page helpers expose no generic request
primitive and are unchanged. No auth/login/routing code was modified.

Loading, empty, network/server/schema errors, Try again and expired sessions are
handled. Retry repeats only a GET. The exact empty copy is:
"No audit log records available yet."
Unknown/error states never retain stale records or invent identities/events.
The existing pagination remains at the bottom of the same table container, including
when empty. CSS, colors, spacing, typography, table columns, responsiveness and
desktop screen fit are preserved. Preview and supplied-data test hosts remain
request-free. The current approved page has no search/filter UI, so none was added;
the two supported facility/role parameters are available in the helper only.

## Export and write endpoints

There is no suitable audit-log export endpoint. Export data remains visible and
disabled. No download, unrelated export or POST method was wired.

GET /api/super-admin/export/excel is Super Admin guarded and its controller comment
mentions "Overview & Audit", but the implementation exports About, Summary,
Facilities, Revenue, Payments and Messaging sheets, not the audit record collection.
It also inserts a PlatformActivity audit event on export. It cannot be used as an
Audit Log export under the no-audit-mutation restriction. The Payments CSV route
is unrelated and is not used either.

POST /api/super-admin/activities creates platform audit events and is Super Admin
only. It was inspected as a separate write path but never called or exposed by the
client. No audit records were created, deleted or modified by this task.

## Backend support and live verification still needed

All four requested table fields, including actor role, are available in the GET
contract. Optional malformed/missing values are rendered as unavailable. Backend
support still needed:
- A genuinely read-only export for this same audit collection, with raw timestamps,
  actor name/role, action and facility; no export-side audit writes under this task.
- Server sorting with stable tie-breaking and a snapshot/cursor for scalable,
  consistent ordering across large/concurrently changing histories. Until then,
  local non-default sorting must read the full result set.
- A separately agreed search/filter contract and approved controls if broader
  searching/filtering is wanted; the existing page has none.

The backend startup routine seeds design activities when its repository is empty.
The GET itself does not seed, and no backend was started for this work. Returned
rows have no provenance flag. Verify a known isolated real dataset before calling
them genuine operational events; no frontend seed-name blacklist or action-name
heuristic was introduced. No sample records are imported by the protected page.

Live Super Admin credentials, profile/role authorization, CORS/configured origin,
deployed response parity, dataset provenance, raw UTC timestamps, optional actor
roles, page boundaries, concurrent records and expiry/logout/permission errors
remain unverified until authenticated live testing is available. No migrations,
seeding or real audit/export requests were used during implementation.

## Validation and changed files

All 176 Super Admin unit tests passed, including 19 focused Audit Log tests.
All 27 Audit Log browser tests passed. Coverage includes API field projection,
role beneath name, raw UTC date, missing optional fields, private metadata exclusion,
all sort directions across 105 records/two server batches, seven-record default and
local paging, snapshot changes, stale reads, loading/network/schema/server/retry,
exact empty copy, bottom pagination, 401/403 preserving unrelated Admin sessions,
export disabled/no downloads, preview isolation, mobile scrolling and desktop/
short-screen fit. API traffic was intercepted in browser tests; no live backend was
contacted. Changed-file ESLint, production build and git diff --check passed. Build
retains the existing >500 kB chunk warning.

Files changed for this task:
- src/super-admin/SuperAdminAuditLog.jsx
- src/super-admin/AuditLogTable.jsx
- src/super-admin/auditLogApi.js
- src/super-admin/auditLogResponse.js
- tests/super-admin-audit-log-api.test.mjs
- tests/e2e/super-admin-audit-log-api.spec.mjs
- SUPER_ADMIN_AUDIT_LOG_API.md

Other six Super Admin pages, login/authentication, routing, backend, shared models,
CSS and dependencies were unchanged. Existing uncommitted work was retained.
No records, migrations, seeds, commits, pushes, merges or deployments were made.

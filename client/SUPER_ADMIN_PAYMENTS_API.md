# Payments API integration

Latest backend main verified on 2026-10-28 with git ls-remote:
`ab3eba17e65219680722d3eca71d1bfa77b1a0e3`.
Source inspected at that commit: MedTrail-Api/src/main.ts,
src/super-admin/super-admin.controller.ts, and super-admin.service.ts
(getPaymentsOverview, exportPaymentsCsv, getPaymentById, retryPayment and payment
seeding). The same source commit already read during Subscriptions was reused
after confirming main had not advanced. No backend checkout/code was changed.

## Registered routes and response contracts

main.ts sets global prefix `api`; controller prefix is `super-admin`.

| Route | Contract |
| --- | --- |
| GET /api/super-admin/payments | Unwrapped `{summary, gateway, counts, transactions, pagination}`. Supports search, status, channel, gateway, sortBy, sortOrder, page, limit (maximum 100). |
| GET /api/super-admin/payments/export | Registered before :id. Supports search/status/channel/gateway only. Returns text/csv, Content-Disposition attachment with a dated .csv filename, no-store headers. Service asks for limit=1000 but list clamps it to 100. Sorting/pagination are not export parameters. |
| GET /api/super-admin/payments/:id | Repository lookup by id or reference. Returns the transaction entity spread plus formattedAmount, formattedDate and formattedNextRetryDate; 404 for absent records. Not invoked: existing UI has no details control. |
| POST /api/super-admin/payments/:id/retry | Super Admin only, no DTO/body. Successful transactions are rejected; otherwise increments retriesCount, sets nextRetryDate after 2/5 days and overwrites statusReason, then saves. Returns `{message,retriesCount,nextRetryDate,transaction}` (Nest default POST status). Inspected only: no client or retry control was added, and no request was executed. |

GET routes allow Super Admin/Admin under JWT/Roles guards; frontend uses only the
existing Super Admin session. No generic request function is exported by the
previous page API helpers. paymentsApi.js follows their configured origin,
Bearer-only GET, no-store, abort/stale-token checks and current-session-only
401/403 invalidation. Existing boundary handles verification, expiry and redirect.
Previous integration/auth/routing files are unchanged.

## UI connection and design scope

The existing Payments table has pagination and a disabled Export list button.
It has no search field, payment-method/status filters, sorting controls, row detail
interaction or retry control. Preserve-design behavior therefore retains that
layout. The helper connects all registered search/status/channel/gateway/sort
parameters and tests their serialization; these parameters have no visible
controls in the current approved UI. Adding such controls needs a design decision.
Nothing was added to another page or shared popover/pagination component.

The live page requests seven transactions per page (createdAt descending). Server
pagination drives the existing footer, which remains the last child of the table
card in loading, empty, error and success states. Out-of-range pages re-request the
last valid page. Table-read errors have a Try again button; this repeats a GET and
is unrelated to financial retry. Pending Settlement wording is used on the live
page as requested; the existing preview's Upcoming payments presentation remains
unchanged. Styling, CSS, spacing, typography, horizontal scrolling, responsive
height distribution and pagination placement are retained. The static Paystack
design badge is retained without asserting gateway availability.

## Mapped fields and reliability

| Backend field | Presentation/policy |
| --- | --- |
| transactions[].id/fullReference | Stable identity and full stored reference. Ignore backend reference, which removes numeric suffixes and rewrites historical references. Reject duplicate IDs/references. |
| facility | Full stored facility name; never use truncated facilityShort. Missing optional fields show Not available. |
| amount | Finite nonnegative number in the endpoint's NGN contract. Preserve kobo up to two decimal places; whole-naira formatting remains unchanged. List response omits per-record currency, so multi-currency records cannot be verified. |
| channel/gateway | Direct stored values; no live gateway health inference. |
| rawDate | Valid calendar/timezone-qualified timestamp or ISO date, displayed as a UTC date. Ignore backend formatted date. Transaction date is createdAt, not paidAt, in this endpoint. |
| rawStatus | successful/pending/failed map to existing status badges; unknown statuses show Unavailable. Ignore formatted status defaults. |
| summary.collectedLast90Days.amount | Unavailable: nonpositive/null sum becomes fabricated 1500000. Also aggregates createdAt, not paidAt, without excluding future timestamps. No thresholds/equality heuristics or filtered-page sum used. |
| summary.pendingSettlement.amount | Unavailable: nonpositive/null total becomes fabricated 70000; total sums monthlyFee for overdue/failed/pending facilities, not unsettled transaction amounts. Cannot label it true Pending Settlement or upcoming-next-30-days value. |
| counts.failed | Direct repository count used for Failed Charges, preserving zero. summary.failedCharges.count uses `count || 2` and is ignored. |
| summary changes/retry schedule and gateway status/isLive | Hardcoded backend claims; never displayed as observed operational data. |
| customer data, reasons, inferred plan/cycle | Not retained in live presentation; no patient/customer contact details are needed for the existing table. |

Reliable collected totals with explicit zero semantics, actual unsettled-payment
aggregates, and currency/payment timestamps are needed to complete missing summary
information. The backend inserts design payment records on startup. No record
provenance is exposed; returned database rows must be checked against a known
real dataset before claiming operational accuracy. No frontend name blacklist or
seed-record heuristic was introduced. No backend was started or database accessed.

## CSV export behavior and limits

The existing Export list button performs authenticated reads only. Before export,
the helper requests the matching list at limit=100, independently of current page.
It refuses datasets over 100 rows rather than download a silently truncated file.
It then requests /payments/export with the same supported filters.

The CSV must have the audited header/schema and the complete expected row count.
Every row's first seven fields must match the fresh list snapshot using the full
stored reference, facility, amount, method, gateway, date and raw-status label.
Altered references (including backend design-reference rewriting), missing fields,
changed records, duplicate rows, wrong content type and incomplete files cause a
visible error and no download. Reference formats are never guessed or reversed.
UTC/date disagreements are rejected rather than silently accepted.

The download contains the seven verified table columns only. Backend CSV's reason,
plan and billing-cycle defaults are omitted. Spreadsheet formula prefixes are
neutralized and cells correctly escaped. A fixed safe download filename is used;
Content-Disposition header exposure is not required. Missing fields are not filled
with invented values. The existing button allows retry after an export-read error;
no payment retry is enabled. In-flight exports are cancelled on page/retry changes,
navigation, unmount or rejected/stale sessions. Blob URLs are revoked after use.

These separate GETs are not an atomic database snapshot. The backend must provide
a correct full-reference, complete, snapshot-consistent export to remove these
limits. Exports use endpoint default date-descending order; the route does not
accept table sort parameters. No backend financial writes are performed.

## Verification and remaining live checks

All 136 Super Admin unit tests passed, including 21 focused Payments/transaction
tests. All 32 Payments API/summary/table browser tests passed across existing
responsive sizes and live-adapter 375/1440px cases. Checks include full references,
kobo amounts, raw dates/statuses, unavailable monetary totals, real zero failure
counts, seven-row pagination, loading/empty/network/server/schema/retry states,
CSV full-set download, export busy/error/cap/altered-reference behavior, 401/403
redirect and unrelated Admin-session preservation, cancellation on navigation,
preview isolation and bottom pagination. Changed-file ESLint, production build
and git diff --check passed. Build retains the existing >500 kB chunk warning.
All browser API traffic was intercepted; no live payment reads/retries were used.

When Super Admin authentication is available, verify real credentials/profile,
configured origin/CORS, deployed contract parity, dataset provenance and currency,
actual references/amounts/statuses/dates, pagination boundaries, reliable zero
counts, expiry/logout/permission errors and real CSV content/completeness. Backend
owners must correct summary semantics and export reference/cap/default issues.
Details and financial retries remain outside the current approved UI and must not
be enabled without explicit approval.

Files changed:
- src/super-admin/SuperAdminPayments.jsx
- src/super-admin/PaymentSummaryCards.jsx
- src/super-admin/TransactionsTable.jsx
- src/super-admin/paymentsApi.js
- src/super-admin/paymentsResponse.js
- tests/super-admin-payments-api.test.mjs
- tests/e2e/super-admin-payments-api.spec.mjs
- SUPER_ADMIN_PAYMENTS_API.md

Overview, Facilities, Subscriptions, other pages, auth, routing, backend, dependency
and CSS files were not changed for this task. No migrations, seeding, real payment
retries, other financial mutations, commits, pushes, merges or deployments occurred.
Existing uncommitted work was retained.

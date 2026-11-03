# Messaging API integration

Latest backend main verified with git ls-remote on 2026-10-28:
`ab3eba17e65219680722d3eca71d1bfa77b1a0e3`.
The inspected main.ts, super-admin.controller.ts and super-admin.service.ts at that
commit were already available from the preceding contract audit; main was verified
unchanged before reusing them. No backend checkout, code, startup or DB work was done.

## Registered routes and response structures

main.ts sets global prefix `api`; controller prefix is `super-admin`.

| Route | Contract |
| --- | --- |
| GET /api/super-admin/messaging | JWT/Roles guarded for Super Admin/Admin. Unwrapped `{summary,provider,messages,usage,counts,logs,pagination}`. |
| GET /api/super-admin/messaging/usage | Same GET authorization. Unwrapped `{title,quotaPerFacility,facilities}`. Currently returns only a static array, not measured facility usage. No query parameters registered. |
| POST /api/super-admin/messaging/log | Super Admin only; accepts an untyped body and calls logMessageEvent. It inserts a log row, substituting defaults for name/type/channel/status/provider and masking the recipient. Service catches insertion errors and returns no explicit payload (Nest POST default response). Inspected only: no POST function, button or request was introduced. It was never executed. |

Main GET parameters: search, tab (all/failed/queued/delivered), channel
(all/Email/SMS/WhatsApp), facility, messageType, sortBy
(time/facility/to/message/channel/status), sortOrder (ASC/DESC), page, limit
(maximum 100). Search implementation covers facility, raw/masked recipient,
message type and channel; despite comments, it does not search message content.
Facility/messageType filters use case-insensitive substring matching.
Pagination uses server total/page/limit/totalPages; seven records are requested.
Default sort is createdAt descending. No sending endpoints are involved.

## Connected behavior

The protected page uses the existing Super Admin session helpers, configured API
origin, Bearer-only/no-store GET convention, abort guards and current-token-only
401/403 invalidation. Existing verification/expiry boundary and routing are
unchanged. Previous page API modules expose no generic request export; the new
Messaging helper follows their convention without changing those integrations.

All/Failed/Queued tabs send the server tab parameter and reset to page one. Server
pagination drives the existing footer; an out-of-range page re-requests the last
valid page. Loading/error/retry/empty states retain the same table container and
bottom pagination. Rapid changes cancel/discard stale reads. Preview and supplied
state harnesses make no requests. The existing month-label behavior now updates
at minute intervals so an open page handles month/year rollover; supplied test
reference dates remain deterministic.

The current page has status tabs, but no channel-filter control. To preserve the
approved layout, none was invented. Email/SMS/WhatsApp channel filtering and all
other supported search/filter/sort parameters are connected in the API helper and
tested; there is no visible channel selector in this design.

The existing View all button is enabled on the protected page and requests usage
on demand. Loading, schema/network error and retry appear inside the same Usage
card. Successful static data results in an explicit unavailable message, without
rendering demo facilities/percentages or introducing a new modal/route. Usage is
independent of the log request and is cancelled on unmount; it can expire the
current session just like a log read.

## Data policy and missing backend fields

| Section/field | Policy |
| --- | --- |
| Sent messages | Unavailable. totalSent=3366, totalDelivered=3285, totalFailed=81 and deliveryRate=97.6 are service constants, including an October-only summary and fixed comparison. No usable current/previous calendar-month SMS/WhatsApp aggregates exist. |
| Delivery rate | Unavailable. Overall/channel rates and comparison strings are hardcoded; no measured completed-attempt denominators or month/channel totals are provided. |
| Failed messages | Unavailable. Summary is fixed at 81; counts.failed uses count || 1, includes all times/channels (including email), and cannot substitute for the existing monthly SMS/WhatsApp card. |
| Termii credit | Unavailable. getTermiiBalance may return a real balance, but failures/missing config return 48000 without a source/fallback flag or observedAt. A valid currency or different number cannot establish trustworthy provenance. Estimated weeks are fixed as well. No value-based guessing is applied. |
| Messages breakdown | All three approved rows/tracks are retained, values unknown and fills absent. Staff invites/verification/prescription counts and percentages are hardcoded at 1120/640/520. The endpoint supplies no measured category totals for the card's period/channels. |
| Main Usage card | usage.items/defaultQuota are static demo facilities and a fixed 1000 allocation. The actual facility query is unused. No real billing month, facility ID, allocation source or SMS-specific measured usage is supplied. |
| View all usage | Entire response array and quotaPerFacility are hardcoded. All rows/remaining counts/percentages/warnings are withheld, even when response values differ; missing/malformed top-level facilities produces a retryable error. |
| counts | All tab counts have nonzero fallback substitutions; not displayed or used to derive summary statistics. |
| provider.status/isLive | Fixed backend claims; ignored. Existing Termii brand label does not claim an operational connection. |

No summary metrics are derived from a filtered/paginated log. Empty logs do not
prove a zero monthly summary, zero credit, zero usage or unlimited allowances.
After backend fixes, the explicit adapter policy needs a fresh contract audit;
adding arbitrary fields to the JSON does not silently enable unverified metrics.

## Message log mapping and privacy

| Source | Presentation |
| --- | --- |
| id | Required unique record identity. Invalid/duplicate IDs fail explicitly. |
| rawTime | Valid calendar/timezone-qualified timestamp, shown as UTC date/time. Never use formatted relative time fallback. |
| facility | Full stored name, never truncated facilityShort; absent optional fields remain unavailable. |
| to | Only validated masked Nigerian phone or masked email forms are retained. rawTo is discarded; unmasked/malformed to never falls back to raw recipients. |
| message | Only approved category strings (Staff invite, Verification code, Prescription details, General notification) become labels. Arbitrary message text/content is not rendered. In particular, a queued prescription is not labeled as already sent. |
| channel | SMS/WhatsApp/Email are displayed accurately; unknown channels stay unavailable. |
| rawStatus | delivered/failed/queued/sent are preserved. Backend formatted status otherwise defaults sent to Delivered, so it is ignored. Sent reuses an existing neutral-blue badge style. |
| Other fields | Raw recipients, content, metadata, private failure reasons and arbitrary backend error text are not retained/displayed. |

Backend startup seeds design logs when the table is empty. Endpoint rows have no
provenance flag, so a known isolated dataset must be verified before describing
returned rows as genuine operational messages. No frontend seed-name blacklist
or record-provenance heuristic was introduced. No database/backend was started,
migrations or seeds run, messages sent or logging POST requests made.

## Validation and remaining live work

All 151 Super Admin unit tests passed, including 27 focused Messaging/log tests.
All 34 Messaging API/responsive browser cases passed. Coverage includes existing
layout/typography/colors, unknown summary/category/usage figures, full log records,
Email/SMS/WhatsApp display, recipient privacy, raw sent status, seven-row server
pagination, All/Failed/Queued transitions, loading/empty/network/server/schema
failure/retry, on-demand usage, 401/403 redirects preserving Admin sessions,
stale responses, preview isolation, UTC month/year rollover, short-screen natural
scrolling and footer placement. Changed-file ESLint, production build and git diff
--check passed; build retains the existing >500 kB chunk warning. Browser API calls
were intercepted; no deployed backend/Termii requests were made by the tests.

Once authentication is available, verify real credentials/profile/CORS/configured
origin, deployed response parity, recipient masking and status/channel meanings,
record provenance/timestamps, pagination/filter boundaries, real expiry/logout and
permission handling. Backend must supply source-tagged live credit and measured
period/channel/category/facility aggregates with real monthly allocations before
those sections can display live figures. Channel-selector design remains absent.

Files changed:
- src/super-admin/SuperAdminMessaging.jsx
- src/super-admin/MessagingPanels.jsx
- src/super-admin/MessageLogTable.jsx
- src/super-admin/messagingApi.js
- src/super-admin/messagingResponse.js
- tests/super-admin-messaging-api.test.mjs
- tests/e2e/super-admin-messaging-api.spec.mjs
- SUPER_ADMIN_MESSAGING_API.md

Overview, Facilities, Subscriptions, Payments, other pages, auth, routing, backend,
CSS and dependency files were untouched. Existing uncommitted work was retained.
Nothing was committed, pushed, merged or deployed.

# Subscriptions API integration

Backend contract verified against latest GitHub main on 2026-10-28:
`ab3eba17e65219680722d3eca71d1bfa77b1a0e3` (checked with git ls-remote).
The older backend working tree was not changed or started. Source files were read
from that commit: MedTrail-Api/src/main.ts, src/super-admin/super-admin.controller.ts,
and src/super-admin/super-admin.service.ts, getSubscriptionsOverview().

`main.ts` sets the global `api` prefix; the controller registers
`@Controller('super-admin')` / `@Get('subscriptions')`. The actual route is
GET /api/super-admin/subscriptions. JwtAuthGuard/RolesGuard allow super_admin/admin.
The response is unwrapped: `{plans, subscribers, pagination, summary}`.

Supported parameters: cycle, search, plan, status, cycleFilter, sortBy, sortOrder,
page and limit (maximum 100). The frontend sends seven rows per page. Card cycle
is Monthly/Annually; it does not send cycleFilter or rewrite subscriber cycles.
Search is the backend search across facility name, plan, payment method and admin
name. The UI's existing Starter/Growth and Paid/Past due/In trial filters send the
backend plan/status parameters. All six sort choices map to registered columns:
nextCharge, amount, facility, with ASC/DESC. Changes to table search/filter/sort
reset pagination. Card-cycle changes preserve the current table page and filters.
An out-of-range page is re-requested at the last valid page.

There is no generic authenticated Super Admin request export in the existing
Overview/Facilities helpers. The new subscriptionsApi uses the same origin,
Bearer header, no-store GET, getSuperAdminAccessToken/setSuperAdminAccessToken,
401/403 invalidation and stale-token/abort guards without changing either helper.
The existing session boundary handles verification, JWT expiry and redirection.
No auth or routing code was changed. Preview and supplied-data harnesses remain
request-free; sample subscriber fixtures are never imported into the live adapter.

## Mapping and data gaps

| Field | Connected behavior |
| --- | --- |
| plans.*.price | Valid finite nonnegative values are used for the selected Monthly/Annually card cycle when plan identity and returned cycle match. Missing/invalid fields show an em dash without hiding a valid table. |
| Plan features | Existing approved product configuration is retained. Current backend features match it exactly. Arbitrary new response features never replace that configuration. |
| Crossed-out annual reference price | Existing approved configuration: Starter 360000, Growth 840000. This reference is not a subscriber statistic or a fabricated live value. It is displayed only with a known annual price no higher than the reference. The backend does not supply original annual prices. |
| plans.*.subscribers / summary.*Subscribers | Unavailable for both plans: backend substitutes 1/5 for zero counts via `count || 1/5`, so returned counts have no reliable zero/provenance semantics. The adapter uses no thresholds or equality heuristics and does not derive global plan counts from a filtered page. |
| subscribers[].id/facility/plan/cycle/status | Mapped to existing table fields; absent/unknown optional fields show Not available. Malformed identities and duplicate IDs fail explicitly. Each row retains its own Monthly/Annual cycle. |
| subscribers[].amount | Backend returns monthlyFee for every row, including annual and trial subscriptions. Monthly paid/past-due fees are displayed. Full-cycle annual amounts and trial payable amounts remain unavailable, rather than multiplying fees or inventing a zero charge. |
| rawNextChargeDate | Valid raw YYYY-MM-DD dates only. Missing/invalid dates show Not available. The fabricated `nextCharge: '02 Nov 2026'` fallback is never used. |
| method | Backend synthesizes Bank transfer and --, so these stay unavailable. Other nonempty strings (e.g. Card/Direct debit) come from the persisted method and are displayed. A raw nullable paymentMethod field is needed to display actual Bank transfer payments reliably. |
| pagination | Validated server total/page/limit/totalPages, including empty totalPages=0 normalized to one display page. Pagination remains the last child of the existing table card in all states. |
| summary.totalMRR | Not used: it aggregates only the current page and is not a global total. No new summary UI was added. |

Backend limitations affecting controls: amount sorting orders persisted monthlyFee,
not a full annual subscription charge. Paid/trial/past-due filter predicates differ
from the derived status-label logic: e.g. an active/paid facility with an expired
renewal can match Paid while its returned label is Past due. The frontend uses the
registered server filters and does not silently post-filter individual pages,
which would break totals/pagination. Backend needs consistent status predicates,
a full-cycle amount and deterministic tie-breaking/null placement for stronger
sorting guarantees. Missing plan/billing-cycle data also defaults to Starter/Monthly
in the service; the response does not expose those raw nullable fields.

Reliable global counts (including zero), nullable raw payment methods, real annual
and trial payable amounts are needed to complete the unavailable fields. No name
blacklists or guessed record provenance are applied. Backend startup currently
seeds design facilities; confirm the database dataset before calling returned
records real operational subscribers. No backend was started, migrations run,
seed/sample records inserted, or live data-modifying requests sent for this task.

## States and remaining live verification

The existing plan panel, card typography/features, table controls, spacing, colors,
CSS and responsive pagination placement are preserved. Loading, empty, network,
HTTP/schema error and retry states use the existing table container. Missing plan
prices/counts stay unknown; no stale table appears while controls are loading.
Aborted/stale requests cannot publish a response or clear a newer session. Backend
error text and arbitrary private response fields are not surfaced.

Once super_admin authentication is deployed, verify login/profile verification,
configured origin/CORS, real dataset identity, server search/filter/sort/page
boundaries, raw dates and billing values, token expiry/logout, permission errors,
and zero counts after backend fixes. Intercepted fixtures verify client behavior
without proving live authentication, database provenance or deployed response parity.

Files changed for this task:
- src/super-admin/SuperAdminSubscriptions.jsx
- src/super-admin/SubscribersTable.jsx
- src/super-admin/SubscriptionPlanCard.jsx
- src/super-admin/subscriptionsApi.js
- src/super-admin/subscriptionsResponse.js
- tests/super-admin-subscriptions-api.test.mjs
- tests/e2e/super-admin-subscriptions-api.spec.mjs
- SUPER_ADMIN_SUBSCRIPTIONS_API.md

Overview, Facilities, other pages, authentication, routing, backend, CSS and approved
subscriptionPlans.js configuration were not changed. Existing uncommitted work was
retained; nothing was committed, pushed, merged or deployed.

Validation completed: all 118 Super Admin unit tests passed (27 focused
Subscriptions/subscriber tests), all 29 Subscriptions API/responsive browser tests
passed, changed-file ESLint passed, production build passed, git diff --check
passed. The production build retains the existing >500 kB bundle warning. Browser
requests were intercepted; no deployed backend/database was contacted by the tests.

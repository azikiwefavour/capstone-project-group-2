# Facilities integration

Backend audited: latest GitHub main, verified with `git ls-remote` on 2026-10-27:
081737228422d5ad00ca655912b47828952ff545. The working-tree backend is older;
source was read from that commit without checking it out or changing backend files.
Sources: MedTrail-Api/src/main.ts, src/super-admin/super-admin.controller.ts,
super-admin.service.ts (getAllFacilities, getFacilityById, formatFacilityStatus,
reviewFacility), entities/facility.entity.ts, dto/review-facility.dto.ts.

`main.ts` registers the global `api` prefix. Requests are:

- GET /api/super-admin/facilities
- GET /api/super-admin/facilities/:id
- POST /api/super-admin/facilities/:id/review (inspected only; not implemented/called)

The list controller supports status, plan, search, page and limit (maximum 100).
It returns {counts:{all,active,trial,past_due},facilities,total,page,limit,totalPages}.
The details controller returns an unwrapped facility object. The review DTO requires
action (approve/reject), with optional notes, trialDays (integer >= 1), and plan
(Starter Plan/Growth Plan). Review returns {success,message,facility}; approval
starts a trial and rejection updates facility status, with audit writes in both cases.
There are no review controls in the existing Facilities design. None were added,
and no mutation client or development approval/rejection requests were introduced.

The existing Super Admin session helpers, origin configuration, Bearer-header
request convention, cancellation, and 401/403 invalidation are reused. There is
no generic Super Admin request export in the existing Overview helper; the new
Facilities helper follows its convention without modifying Overview/authentication.
The existing boundary verifies the profile, redirects on rejection, and checks JWT
expiry. Preview and supplied-data test harnesses remain request-free.

The existing four tabs use the server's global counts, independent of search.
Search (250ms debounce) uses the server's name/state/adminName search; status
filtering sends active/trial/past_due. No new plan control was added, although the
API helper supports the registered plan parameter. Default pagination requests
seven rows from the server. Out-of-range pages re-request the last valid page.
The backend has no sorting parameters. Selecting a column collects all matching
pages (100 records/request), then uses the existing stable local sort and seven-row
pagination. No partial-page sort or unsupported sort parameter is sent. Counts
changing during collection or duplicate IDs produce a retryable error; concurrent
updates that preserve totals cannot be made snapshot-consistent by this API.
Large result sets will need backend sorting for efficient operation.

## Data integrity and backend limitations

No frontend facility samples or statistics are introduced in production.

| Data | Policy |
| --- | --- |
| Facility ID/name/plan/billing cycle/status | Selected from endpoint response. Existing badge colors retained. Pending/suspended/rejected labels use the existing neutral badge. |
| Tab counts and pagination | Real repository counts from getAllFacilities, including zero. Missing tab counts remain unknown. |
| Clinicians and patients | Unavailable: service mixes real user counts with baselineFacilityData, fabricated 8/50 defaults and persisted fallback counts, without provenance. Values cannot safely be classified using thresholds. |
| SMS/messages | Unavailable: service estimates messages from prescription count * 2 plus offline patients * 4, then falls back to stored/baseline values. It is not measured SMS or sent-message usage. |
| Three modal statistic cards and progress tracks | Preserved. Unknown totals display em dashes; unknown progress has no filled segment. API percentages depend on the substituted counts and fixed capacities (which also conflict with subscription plan features). No 50% placeholder is used for connected data. |
| Admin and payment method | Unavailable: list and detail substitute baseline names/emails/methods without provenance. |
| Renewal/trial-end/expiry date | Use raw list renewalDate. Details renewal.date substitutes 2026-11-02 when absent, so it is ignored even when opening details. Dates are a list snapshot; a future raw field on details is needed for fresh trustworthy renewal information. |
| Subscription date | Unavailable: neither endpoint provides it. createdAt is facility registration, not subscription start. |
| Subscription value | Monthly only: raw monthlyFee (list)/monthlyValue (details). Yearly full-cycle charge is absent and is not inferred from monthly price. Existing free-trial presentation remains. |

The backend also seeds design facilities on startup; endpoint records do not
identify their provenance. No backend was started, migration/seed run, database
accessed or live approval/rejection executed. Validate displayed facilities against
a known isolated dataset before claiming they are real operational records.
The backend's status formatter defaults unrecognized statuses (including rejected)
to active; frontend cannot recover the original status. Backend owners must expose
raw status, raw nullable renewal/admin/payment fields, true user/patient/message
aggregates with zero semantics, actual capacities, and subscription start/full-cycle
amounts to complete the unavailable portions. These are documented gaps, not
heuristics that attempt to guess which response values are real.

Loading, empty, network/server/schema errors and retries use the existing table
and modal containers. Details errors (including 404) retain the closable modal.
Stale/cancelled requests cannot publish data or clear a newer session. Arbitrary
backend errors/private fields are not displayed. Existing CSS, pagination placement,
row layout and modal focus/scroll restoration remain intact.

## Verification and remaining live checks

Focused unit/browser coverage uses intercepted API fixtures only, including
server filters/pages/global counts, complete-set local sorting, details read,
three preserved statistics tracks, loading/retry/empty/schema/network errors,
401/403 session rejection, stale responses and existing responsive layouts.

When super_admin login is deployed, verify real credentials, profile verification,
CORS and configured origin, server searches/filters/counts/page boundaries, facility
identity and raw renewal dates, detail errors, logout/expiry, and permission errors.
Resolve the data-contract gaps above before enabling unavailable statistics and
billing/admin fields. There is no approval/rejection flow to test in this design.

Validation: 104 Super Admin unit tests passed, including 22 Facilities tests.
Changed-file ESLint, production build and git diff --check passed. The build keeps
the existing bundle-size warning. Running the full frontend unit suite also found
four failures in untouched tests/create-prescription.test.mjs and
tests/pharmacist-prescriptions.test.mjs (patient membership requests and active
medication/clarification status expectations). They were left outside this task.

Files added/changed for this integration:
- src/super-admin/SuperAdminFacilities.jsx
- src/super-admin/FacilityDetailsModal.jsx
- src/super-admin/facilitiesApi.js
- src/super-admin/facilitiesResponse.js
- tests/super-admin-facilities-api.test.mjs
- tests/e2e/super-admin-facilities-api.spec.mjs
- SUPER_ADMIN_FACILITIES_API.md

No login/authentication, Overview, other page, backend, CSS, dependency or routing
files were changed for this task. Existing uncommitted work was retained.

Final browser run: all 27 Facilities API/layout/modal cases passed. An earlier
390px preview-modal close timeout passed three isolated reruns and the final full
run; the final run was performed without concurrent build activity.

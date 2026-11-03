# Overview API integration

The protected Overview requests GET /api/super-admin/dashboard using the existing
Super Admin session, Bearer-header pattern, VITE_API_BASE_URL configuration, request
cancellation, and session invalidation helpers. Default origin: http://localhost:3000.
The pure dashboard/preview components make no requests. Login, authentication
implementation, routes, CSS, and the other six pages are unchanged.

## Audited backend contract

Source: origin/main 081737228422d5ad00ca655912b47828952ff545,
MedTrail-Api/src/super-admin/super-admin.controller.ts and getDashboardOverview()
in super-admin.service.ts, plus integrations-health.service.ts.
The controller returns the service object directly, without a data wrapper.

| Backend field | Presentation and policy |
| --- | --- |
| stats.registeredFacilities.awaitingReview | Pending-applications secondary count; zero is valid. |
| facilityReviewAlert | Select pendingCount/facilityName only; null means none pending. Review stays disabled; no review action/navigation added. |
| upcomingRenewals | id/facilityName/plan/amount/rawRenewalDate become renewal records. Use raw ISO dates only, never the formatted fallback. Existing future-date filtering and four-row limit remain. |
| recentPlatformActivities | rawDate/who.name/action/facility become safe display rows, sorted newest first and limited to five. API action text is displayed literally, never guessed into an internal enum. Metadata and private alert fields are discarded. |
| revenue | Unavailable: MRR, growth and all chart bars are hardcoded in this backend. |
| stats totals | Unavailable: facility/subscriber/trial/overdue counts use ambiguous nonzero fallbacks; message totals/rate are fixed; patient count has an artificial minimum; live facilities is fixed. No threshold/equality heuristic is used to guess real values. |
| planMix | Unavailable: counts include inactive facilities, conflicting with the unchanged active-subscription labels. The denominator also uses a fallback. |
| integrations | Unavailable: the four displayed services have fixed uptime, response time and status. Measured database latency belongs to a different service and cannot substitute for MedTrail API health. |

Unavailable metrics remain unknown, not zero. Empty collections from a successful
response receive empty states; missing sections remain unavailable and malformed
collections receive errors. Invalid records are not replaced with fabricated ones.
Network/server/schema failures show the existing section error/retry views without
retaining stale results. 401/403 clear only the current Super Admin session; the
existing boundary handles redirection. Abort/session guards discard late responses.
No backend messages, tokens, or arbitrary response fields appear in error text.

## Remaining live verification

No backend was started or database accessed. Verify the response shape, CORS,
real credentials/session expiry, date/timezone behavior, and counts against an
isolated backend when available. Backend startup seeds design records and the
response does not identify their provenance; database-returned renewals, alerts,
activities and pending counts may therefore still include seeded samples. They
must be validated against an isolated known dataset before describing them as
real operational records. No frontend seed-name blacklist or provenance claim
has been invented. Backend owners must supply real aggregate/health sources,
active-only Plan Mix, and reliable empty/null values before those metrics can be
enabled. Source changes require revisiting the explicit adapter policy.

Validation: 24 focused Overview unit tests and 41 browser cases passed. Browser
API fixtures are test-only and all requests are intercepted; no database or live
backend is used. Checks cover mapped records at 375/1440px, withheld demo values,
loading/network/retry/empty/401/403, preview isolation, existing Overview states,
and preview rendering/navigation for all seven pages. Changed-file ESLint,
production build, and git diff --check passed. Build retains its bundle-size warning.

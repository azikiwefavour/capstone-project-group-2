# Super Admin authentication frontend

Branch: feature/super-admin-frontend, based on main 3b956d4.
Persistent worktree: /Users/favour/medtrail-super-admin-frontend.

## Routes and design

/super-admin/login reuses pages/Login.jsx directly. Optional heading/accountNotice props render the requested Admin Login title with
no role-specific text, signup link or footer message. The separate
authenticationUnavailable flag blocks sign-in without displaying a pending notice.
Existing props/defaults, layout classes, colors, typography, inputs, responsive
behavior and password-eye control remain unchanged for Admin and other roles.

/super-admin and /super-admin/* are behind a deliberately closed boundary. They
redirect to /super-admin/login, including dashboard and unsupported recovery/signup
paths. The overview layout is connected behind this closed boundary. No public signup or role-selection option is created.
No local role claim, ordinary Admin session, dev token or hardcoded credential can
authorize this boundary. The frontend neither assigns nor guesses a backend role.

## Backend integration pending

The inspected backend UserRole enum only includes doctor, pharmacist, patient and
admin. LoginDto validates against that enum. No Super Admin role, provisioning,
login/profile eligibility contract or protected Super Admin API is defined.
Consequently Continue and Forgot password remain disabled internally. The Continue
button retains the original blue appearance. No pending message is displayed;
forced form submission and the pending authentication adapter still fail closed.
No authentication request, token storage or fallback to Admin is performed.

Before enabling sign-in, confirm the exact backend-issued role claim, supported
login endpoint/DTO and response shape, server-verified identity/profile/eligibility
rules, provisioning process and expiry/logout behavior. Then implement a separate
verified session without altering other role sessions. Do not use the public
registration flow or dev-admin-token endpoint to provision or authorize Super Admin.

## Recovery review

ForgotPassword.jsx, VerifyResetCode.jsx and NewPassword.jsx share recoveryBasePath
and call /api/auth/forgot-password, /api/auth/verify-reset-code and
/api/auth/reset-password. Their
presentation can be reused after the backend confirms these flows support Super
Admin accounts and return to Super Admin login. They currently have no Super Admin
contract, so no recovery routes or requests are connected and no false success is
shown. Ordinary Admin recovery remains unchanged.

## Validation

Unit tests prove pending authentication cannot send credentials, infer roles or
create session state. Browser tests compare Super Admin/Admin styling at seven
mobile/desktop widths, verify eye controls, block forced submissions, preserve
existing sessions, deny protected URLs and retain normal other-role requests and
navigation. All credentials/session values are isolated fixtures; no live accounts
or production records are accessed.

## Results

65 focused authentication unit tests passed (including both new Super Admin tests).
51 browser tests passed, covering Super Admin and shared invitation/logout/settings
regressions. Responsive checks cover 375, 390, 414, 430, 1024, 1280 and 1440px, plus
a 390x320 short viewport. Production build passed with the existing bundle warning.
Changed-file ESLint passed.

The full unit suite has 181 passed / 4 failed. Failures are in unchanged main
Doctor patient-membership expectations and Pharmacist medication-status expectations.
Full ESLint has two existing main errors: unused getDoctorPatients in
doctor/prescriptions.js and synchronous state updates in PatientDashboard.jsx.
Those files remain byte-for-byte identical to main; no other-role fixes were made.

The earlier Patient API temporary checkout is incomplete and Git marks its metadata
prunable. Its branch/reference was not changed. Twenty surviving frontend files
were preserved in an archive under the original worktree's ignored dependency cache:
/Users/favour/medtrail-patient-frontend/client/node_modules/.cache/patient-api-recovery/.
This is a preservation copy, not confirmation that the complete former checkout
was recovered. The original temporary files and worktree records remain untouched.

## Login presentation correction

The private login route displays Admin Login, as requested, and contains no visible
Super Admin text. The previous sign-in-unavailable paragraph and managed-account
footer are removed. No public signup link replaces them. The existing /login page
keeps its original Welcome back heading, signup/recovery controls and behavior.
Internal role separation and the deny-all pending boundary remain unchanged.

## Dashboard layout — first stage

`/super-admin/overview` is wired behind the unchanged deny-all authentication
boundary. The alias `/super-admin/dashboard` also stays protected. Authentication
must be implemented against a confirmed backend Super Admin contract before any
real account can reach the overview. The page accepts only a future verified
profile and logout callback from that boundary; it never reads Admin sessions.

`/super-admin/preview/overview` is a separate development-only, localhost-only
presentation preview. The preview module and route are excluded from production.
It displays an explicit preview notice, no fabricated account name or application
counts, and makes no API calls. Preview logout opens the shared confirmation modal;
confirming only closes it and never changes any real session.

The scoped sidebar follows the Admin responsive structure and uses #475AA2.
MedTrailLogo, AdminHeader and LogoutConfirmationModal are reused without edits.
Unimplemented navigation and facility Review are disabled and titled coming soon.
Profile settings remain disabled without a verified account. Only the welcome,
heading/subtitle and facility notification presentation are implemented. No
statistics, charts or other dashboard sections are included. Facility application
API fields and review workflows are pending; the banner does not imply live data.

No Figma frame was supplied in this stage; the existing Admin structure is the
available visual reference.

### First-stage verification

65 focused authentication unit tests and 59 browser tests passed. Browser checks
cover the overview at 375, 390, 414, 430, 1024, 1280 and 1440px, protected-route
denial, disabled destinations, preview session isolation and modal Cancel/X/Escape/
Confirm behavior, plus existing other-role invitation/login/logout/settings cases.
All account/session values in these tests are isolated fixtures; no live API or
accounts were used. Desktop and mobile screenshots were inspected.

Changed-file ESLint and production build passed. Full-project ESLint still reports
the same two errors in unchanged Doctor prescriptions and PatientDashboard files.
The production build retains the existing bundle-size warning. The local preview
server runs at http://127.0.0.1:5176/super-admin/preview/overview.

## Stage 2: Revenue and Plan Mix

The same overview now includes one card with keyboard-accessible Revenue and Plan
Mix tabs. Revenue uses NGN currency, previous-month comparison when the baseline
is known and nonzero, and a responsive monthly bar chart with #475AA2 highlighting.
Plan Mix shows Starter/Growth shares and subscriber counts. Its internal preview
model counts unique active hospital subscriptions only, with every active hospital
in the denominator (including any other plans). This model is not an API contract.

No revenue/subscription/statistics endpoint or service exists in the inspected
backend source or frontend API modules. No endpoints are invented or called. The
protected overview therefore defaults to an explicit unavailable state. Loading,
error with optional retry callback, confirmed-empty and ready presentation states
are supported for a future confirmed adapter; no live loading/retry requests are
connected yet. Super Admin authentication remains closed.

Sample revenue and subscriptions live exclusively in SuperAdminDashboardPreview.jsx,
which is development/localhost-only and excluded from production. Both the page
and card label these as sample data. The production overview has no fixture fallback.
An API adapter will need an approved monthly recurring revenue definition (including
billing period, currency and annual-plan handling), monthly history and comparison
period, active subscription eligibility, hospital identity and canonical plan IDs.

The referenced Figma screenshots were not available in this worktree/conversation.
Plan colors use the existing MedTrail lavender palette provisionally; exact Figma
color/spacing matching requires the supplied frame. No other sections were built.

### Stage 2 verification

67 focused unit tests passed, including revenue comparison edge cases and active
hospital plan shares. All 29 distinct Super Admin browser cases passed across the
authentication and dashboard suites (20 authentication and 9 dashboard cases).
Dashboard coverage includes both tabs at seven widths, keyboard navigation, bar
colors, plan proportions, no horizontal page overflow, no API calls, session-safe
logout and isolated loading/error/retry/empty/unavailable presentation. Desktop
and mobile screenshots of Revenue and Plan Mix were inspected.

Scoped ESLint, diff whitespace checks and production build passed. Production
assets exclude the preview route and fixture module. Full ESLint still reports
only the unchanged Doctor unused import and Patient state-in-effect errors noted
above; the existing bundle-size warning remains. No live statistics were tested
because no supported endpoint/authentication contract exists in this checkout.

## Stage 3: Platform statistics and overview layout

Revenue/Plan Mix now occupies the left side of a two-column overview section at
1280px and wider. Four statistics cards occupy the right side in a 2x2 grid.
Tablet/mobile stack these sections; statistics stay in two columns from 360px
and use a single column below that width. Chart height, gaps and labels are
compact enough for the narrower card. No other dashboard sections were added.

PlatformStatistics.jsx supports unavailable, loading, error with an optional retry
callback, confirmed-empty and ready states. Unknown counts show a dash instead
of claiming zero. Optional secondary counts and delivery rates appear only when
provided and valid. The real protected overview defaults to unavailable. No API
requests, guessed endpoint, other-role token or mock fallback are connected.

No platform-wide statistics endpoints exist in the inspected frontend API services.
Sample aggregate values live only in the localhost/development preview module.
statisticsMetrics.js implements a documented internal preview model: registered
hospitals include any previously subscribed hospital, including expired ones;
active subscribers include only explicit active status, excluding expired, trial,
overdue, pending and cancelled statuses. Hospital IDs are deduplicated. Trial and
overdue are shown separately. Messages combine SMS and WhatsApp, and delivery
percentage is unavailable without a valid delivered count and nonzero sent total.
Patients on Record is an aggregate count, with no patient records or identifiers.
No production API schema or trial/overdue billing rules are assumed by this model.

Before live integration, confirm authorized Super Admin aggregate endpoints,
response fields, historical subscription eligibility, trial/overdue definitions,
delivery accounting/time period, patient record totals and the definition of a
live contributing facility. Sample active totals match the Plan Mix fixtures.
Figma screenshots remain unavailable; layout uses the established MedTrail styles.

### Stage 3 verification

70 focused unit tests and 61 browser tests passed, covering all seven responsive
widths, 2x2 card placement, desktop left/right composition, compact chart/tabs,
counts, preview labels, loading/error/retry/empty/unknown versus zero states,
authentication isolation and existing shared invitation/logout/settings behavior.
1440px desktop and 375px mobile screenshots were visually reviewed. Scoped ESLint,
whitespace checks and production build passed. Full ESLint retains only the same
two unchanged Doctor/Patient errors documented above; the existing bundle warning
remains. No live API statistics were tested.

## Port 5176 blank-preview investigation

The long-running Vite server retained a stale resolution of the extensionless
PlatformStatistics import to the old platformStatistics.js helper on macOS's
case-insensitive filesystem. Browser and Vite terminal both reported that
PlatformStatistics.js had no default export. The helper had already been renamed
to statisticsMetrics.js, but the preview server was still serving the old helper
module and importing it as the component. Fresh test servers did not reproduce
this stale module graph, which explains the earlier passing browser tests.

SuperAdminDashboard.jsx now explicitly imports PlatformStatistics.jsx. The port
5176 development server was restarted without changing dependencies, browser
storage, environment configuration or the dashboard design. Browser checks now
also assert no page errors or console errors for each responsive overview test.

The actual http://127.0.0.1:5176/super-admin/preview/overview was opened in Chromium
at 1440x929 and 375x667: sidebar, welcome, Revenue/Plan Mix and all four cards render;
both tabs and page reloads work without runtime/console errors or API requests.
The server now serves the .jsx import correctly and its fresh terminal has no
errors. 70 focused unit tests, 30 Super Admin browser tests, scoped ESLint, diff
checks and production build passed. Full ESLint retains the two unchanged
Doctor/Patient errors already documented. Production still excludes the preview
route/module. Authentication and other-role dashboards remain unchanged.

## Stage 4: Upcoming renewals and integrations

A second responsive row now sits below Revenue/Plan Mix and platform statistics.
UpcomingRenewals.jsx is on the left and Integrations.jsx on the right at 1280px
and wider; the sections stack below that breakpoint. Existing Stage 1–3 layout,
styles, tabs and role boundaries are unchanged. No Recent Platform Activities
section is included. View all and View details are disabled with coming-soon titles
and accessible text; no unimplemented routes are invented.

No supported subscription renewal or integration-health endpoint exists in the
inspected frontend services/backend controllers. The backend root greeting is not
a health, uptime or dependency-status contract and is not used as one. No new API
request is issued. Both real sections default to unavailable. The shared
OverviewSectionState.jsx supports loading, error with optional retry callback,
confirmed-empty and unavailable states. Malformed ready list data is an error.

overviewData.js defines an internal presentation model pending an approved API
adapter. futureRenewals returns every valid strictly future renewal, ordered by
time, without mutating or truncating the input. Only the overview slices four
entries. Invalid calendar dates, past dates and the current instant are excluded.
Date-only values are interpreted at UTC midnight and dates display in UTC; confirm
the backend billing timezone/date-only semantics before connecting real data. A
React clock refreshes every minute and on focus so the list ages appropriately.
Missing amounts remain unavailable, and known amounts use Nigerian naira.

Integrations always names MedTrail API, Paystack, Termii SMS and Termii WhatsApp.
Only explicit operational/degraded/down statuses receive status badges; unknown or
missing health data is Unavailable regardless of uptime/latency. Uptime and response
time are displayed only when finite and in range. There are no inferred operational
states or fabricated zero-latency values. The internal service IDs and field names
are presentation fixtures, not assertions about a backend API.

All example hospitals, renewal amounts/dates and service metrics remain exclusively
in the localhost/development preview module, with separate visible sample labels.
The preview includes six future and one past renewal, allowing nearest-four
behavior to be checked. Production excludes this module/route and its fixtures.
No real subscription, payment or service health data was requested.

Before integration, confirm the authorized renewal and health endpoints, pagination
for all future renewals, canonical plan fields, amounts/currency, billing timezone,
health status enum, uptime measurement window and response-time definitions. Exact
Figma comparison still requires the referenced screenshots; this stage uses the
established MedTrail palette, icons and card patterns.

### Stage 4 verification

74 focused unit tests and 62 browser tests passed. Coverage includes all-future
renewal retention, nearest-date ordering, four visible entries, past/invalid-date
exclusion, currency, explicit/unknown health, missing metrics, disabled navigation,
loading/error/retry/empty/malformed/unavailable states and seven viewport widths.
Existing Super Admin authentication and shared other-role invitation, settings and
logout checks passed. Scoped ESLint, whitespace checks and production build passed.
Full-project lint retains only the same two unchanged Doctor/Patient errors; the
existing bundle-size warning remains. The actual port 5176 preview was tested in
Chromium at 1440x929 and 375x667, including both tabs, all Stage 1–4 sections and
no runtime/console errors or horizontal page overflow. Screenshots were reviewed.

## Stage 5: Recent platform activities

RecentPlatformActivities.jsx adds the bottom overview section with When, Who,
Action and Facility columns. The internal helper orders events newest first; the
overview displays five while preserving the full list. Times display explicitly
in UTC pending a confirmed platform timezone. View all is disabled and labeled
coming soon because no Super Admin Audit Log page exists. The compact table uses
existing MedTrail colors/dividers and has a keyboard-focusable horizontal scroll
container on mobile, without horizontal page overflow. Hidden captions/labels
are contained in the overview scroll region to avoid outer-page blank space.

The inspected backend provides GET /api/admin/audit-log and GET /api/admin/activities
(alias), guarded for ordinary Admin accounts and scoped by the Admin's hospital.
Its response includes createdAt, actorName, description, patient/targetPatientName,
actionType and hospitalName. These clinical/hospital feeds are not authorized
platform-wide Super Admin APIs and are deliberately not called or reused.

No supported platform activity endpoint exists in this checkout. Production
defaults to unavailable, with loading, retryable error, confirmed-empty and ready
presentation states supported for a future adapter. Malformed/unsupported rows
produce an error, never a false confirmed-empty table or clinical description.
Only eight explicitly approved platform actions map to fixed labels. The helper
selects only safe display fields; it never copies patient fields, emails or
arbitrary descriptions. System requires an explicit automated actor; unknown
actors stay Unavailable. Dates require a real calendar date and explicit timezone.

Eight out-of-order sample events are stored only in the localhost/development
preview module, labeled as non-real events. The module/route and sample actor
values are excluded from production. The production component fabricates neither
event timestamps nor actors. No live records or API requests were used.

Backend integration requires an authorized Super Admin platform feed with a
confirmed response schema, canonical action enums, stable event IDs, ISO event
timestamps/timezone, explicit automated/user actor identity and safe display
names, facility identity/name, newest-first ordering/limits and future Audit Log
pagination. The backend must return only approved platform events and sanitized
fields without clinical or patient details. Super Admin authentication remains
pending its exact backend role and server-verified eligibility contract.

### Stage 5 verification

78 focused unit tests and all 63 browser regression cases passed. Following the
accessibility containment adjustment, all 12 dashboard browser cases passed again,
including seven viewport sizes, five-row ordering, disabled View all, mobile table
scrolling, no outer desktop scroll, data states, no clinical-text rendering and
existing session isolation. Scoped lint, diff checks and final production build
passed. Full-project lint retains the same two unchanged Doctor/Patient errors;
the existing bundle-size warning remains.

The actual port 5176 preview was checked at 1440x929 and 375x667 in Chromium:
Stages 1–5, tabs, reload, safe five-row table and horizontal table scrolling work
without page-wide overflow, console/runtime errors or API requests. Desktop/mobile
screenshots were inspected and final desktop scroll containment verified. Exact
Figma matching still needs the referenced screenshots; established MedTrail table
patterns are used. No backend/other-role files, accounts or records were changed.

## Compact desktop Overview

Measured original content height was 1596px at each requested desktop size: the
Revenue/statistics row was 416px, renewals/integrations 419px and activities 381px,
with repeated 24px section gaps and generous header/banner spacing.

overview.css is scoped exclusively under data-super-admin-overview and applies
from 1280px width. Desktop-only styling tightens header/banner spacing, row gaps,
card padding, chart height and table/list row padding. Metric icons share the
label row to reduce stacked height. Primary color, all records/labels, counts,
tabs and data states remain intact. Body/table text stays at 12px, metadata at
11px, overview heading at 20px and headline counts at 22px. Chart labels stay
readable at 11px. Taller desktop viewports receive a taller chart. No content is
removed, hidden, cropped or absolutely positioned. Sidebar dimensions remain
viewport-aligned. Tablet/mobile styling below 1280px is unchanged.

At the actual port 5176 preview, all sections fit at 1280x800 and 1440x900. At
1366x768 the complete content needs 800px, so the existing content scroll area
allows 32px of scrolling rather than further compromising readability. Shorter
desktops, zoom, longer records or error messages also retain natural scrolling.
No fixed section height or overflow-hidden is used to conceal content, and the
activity section has only normal bottom padding rather than extra whitespace.

78 focused unit tests and 36 dashboard/authentication browser tests passed,
including the three requested desktop sizes and 1280x600 fallback, all seven
prior responsive widths, both tabs, complete row counts, no section overlaps,
no outer-page overflow, authentication isolation and unchanged login styles.
Scoped lint, whitespace checks and production build passed. Full-project lint
still reports only the same two unchanged Doctor/Patient errors; the existing
bundle-size warning remains. Desktop screenshots were visually inspected.

## Facilities — Stage 1 visual structure

The existing sidebar, header, profile and session-safe logout modal now live in
SuperAdminLayout.jsx, shared by Overview and Facilities. The Overview DOM and
compact desktop rules are preserved; only shell/header selectors are shared.
The sidebar uses active NavLinks for Overview/Facilities. Other destinations
remain disabled. No ordinary-role components, auth guards or APIs were modified.

/super-admin/facilities is connected behind the unchanged deny-all Super Admin
boundary. /super-admin/preview/facilities is registered only in development on
localhost/127.0.0.1/IPv6 loopback and is excluded from production, as is its fixture
module. Preview navigation stays within the local preview routes; no authenticated
route is bypassed. The actual preview runs at
http://127.0.0.1:5176/super-admin/preview/facilities.

The page includes the exact Facilities heading/subtitle, All/Active/Trial/Past due
filters, hospital-name search appearance, eight-column table, seven visible sample
rows, status badges, selection checkboxes, eye controls and page-number/arrow
pagination. There are no extra status filters or page-size choices. All filters,
search, checkboxes, eye buttons and pagination are disabled for Stage 1. Only
sidebar navigation and the existing logout design modal are functional.

All 21 aggregate hospital fixtures and sample counts exist solely in the clearly
labeled development preview. Clinicians sum registered doctors and pharmacists;
patients use the total registered count; messages sum SMS and WhatsApp sent without
filtering by delivery. Missing/invalid aggregates remain unavailable. Every sample
row, including past-due hospitals, retains its current plan and billing cycle.
No patient-level records, real hospital names, emails, sessions or API requests
are used. The production page has no mock fallback and remains unconnected.

The table scrolls horizontally inside its own focusable container on smaller
screens. Seven rows fit the tested 1280x800 and 1440x900 desktop viewports without
extra vertical scrolling; shorter/mobile layouts retain natural scrolling. The
referenced Figma frame was not available, so exact pixel matching of spacing,
badges and pagination requires that reference. Established MedTrail styles and
Lavender/600 #475AA2 are used. Functional search/filtering/sorting/pagination and
any backend integration remain out of scope until Stage 2.

### Facilities Stage 1 verification

80 focused unit tests passed, including aggregate definitions and unknown-value
handling. All 44 distinct Overview/authentication/Facilities browser cases passed
across the final runs: 36 Overview/auth cases and eight Facilities cases. One
375px check initially needed vertical scrolling before asserting horizontal eye
access; its test setup was corrected and all eight Facilities cases rerun.
Browser coverage includes active navigation, disabled controls, table rows/statuses,
contained horizontal scrolling, preview-safe logout, preserved Overview and denial
of protected Facilities access for all existing/fake role claims.

The actual port 5176 Facilities URL was checked in Chromium at 1440x900 and 375x667,
including reload and navigation back to Overview: no runtime/console errors,
API calls or horizontal page overflow. Desktop screenshots were inspected.
Scoped lint, diff checks and production build passed. Full lint retains only the
same two unchanged Doctor/Patient errors noted above, plus the existing build
bundle-size warning. No backend, environment, API, authentication, authorization
or other-role source files were changed. Nothing was committed or pushed.

## Facilities visual correction: desktop height and Figma pagination

Before this correction the Facilities content needed approximately 757px; the
1280x720 viewport therefore scrolled. facilities.css now tightens only Facilities
desktop heading/filter/search gaps, table row padding and footer spacing. All
seven rows remain present, with readable text and no fixed height, cropping or
overflow-hidden. At the actual port 5176 preview the page fits at 1280x720,
1366x768 and 1440x900; mobile keeps natural vertical and contained horizontal
scrolling. Overview and other dashboards are unaffected.

The footer uses three desktop grid columns: Page 2 of 16 left; first/previous
arrows, 1 2 3 4 5 … 16, next/last arrows centered; 7 / page and a downward chevron
right. Smaller screens place the summary and fixed page-size display above a
contained horizontally scrollable navigation row. Every control is disabled.
There is no filtering, search, sorting, page navigation or page-size behavior.

The isolated preview now contains 112 aggregate sample hospitals, corresponding
to 16 seven-row pages, and statically displays rows 8–14 as the page-2 design
example. This replaces the earlier 21-row fixture only; it is not live data or
functional pagination. Preview counts derive from the full sample collection.
Pagination presentation metadata is passed separately so Stage 2 can later supply
actual frontend pagination state after approval. Production has no sample records.

80 focused unit tests and 45 browser tests passed, including the new 1280x720
case, all prior viewports, three-section footer alignment, arrows/page sequence,
fixed page-size control, disabled functionality, Overview and authentication
regressions. Scoped lint, whitespace checks and production build passed. Full
lint retains the two unchanged Doctor/Patient errors and the build retains its
existing bundle-size warning. The actual 5176 preview was checked at desktop
and mobile sizes with no runtime/console errors or horizontal page overflow,
and the 1280x720 screenshot was visually reviewed.

## Facilities: fill spare desktop height

A Facilities-only min-width:1280px rule uses flex column layout on its content
area and table card. flex-grow:1 lets the card and table wrapper consume remaining
viewport height; the table's flex growth and height:100% distribute it among the
existing seven rows. The table header retains its intrinsic-size 37px height.
flex-shrink:0 preserves intrinsic minimum content heights for short-screen
scrolling, while flex:none keeps pagination at its unchanged natural 45px height.
No row count, widths, text size, badges, controls, shared header/sidebar or Overview
styles were changed. Mobile/tablet rules are unchanged.

At actual preview sizes 1280x720, 1366x768 and 1440x900, content scroll height
equals viewport height and the card ends exactly 10px above the content bottom,
matching normal bottom padding. The seven rows share the additional space evenly
(to subpixel rounding), with pagination directly attached. At 1280x600, intrinsic
content needs 666px and naturally scrolls rather than clipping or compressing rows.
The 1440x900 screenshot was inspected. All 25 Facilities/Overview browser checks,
scoped lint, whitespace checks and production build passed. Existing build
bundle-size warning remains. Only facilities.css, the Facilities browser tests
and this documentation changed for this adjustment. No Stage 2 behavior added.

## Facility Details modal

FacilityDetailsModal.jsx follows the existing native-dialog/portal design used by
MedTrail dialogs without modifying shared components. Clicking a Facilities row
or eye button opens that exact mock hospital; Enter/Space on a focused row also
opens it. Checkbox-cell clicks are excluded and selection remains disabled. Rows
have a subtle hover/focus treatment. Search, filters and pagination are unchanged
and inactive. The table fill-height CSS, seven rows, footer, sidebar and header
were not changed.

The centered white dialog has a rounded border, shadow, dim backdrop, selected
hospital heading and X. Three responsive cards show the same clinicians, patients
and messages totals as the row, including all sent SMS/WhatsApp regardless of
delivery. Messages (Oct) is the specified preview label. Decorative thin lavender
bars have no progress semantics, percentage calculation or invented usage limit.

The existing preview records were extended with distinct sample administrator
names/emails under example.test, subscription dates, status-specific renewal/
trial/expiry dates, recorded payment method, full cycle amount and billing cycle.
No duplicate hospital records were introduced and no actual personal data is used.
Trial always shows Not available payment and ₦0 (Free trial), even if a paid field
is present. Paid Active/Past due retains its positive full-cycle amount; unknown
paid amounts stay unavailable instead of becoming zero. Past due now uses the
requested soft pink/red badge in both table and modal; other badges are unchanged.

The native modal makes background content inert; root/body and the Facilities
scroll area are locked temporarily. On close their original overflow and scroll
positions are restored, then focus returns to the invoking row/eye without
scrolling. X, true outside/backdrop clicks and Escape close it. Tab/Shift+Tab stay
on its only interactive control, the close button. ARIA title/description and
modal semantics are present. The dialog has viewport-relative maximum height
and internal scrolling so all fields remain accessible on short/mobile screens.
No authentication, route, API or shared dashboard changes were made.

83 focused unit tests and 51 distinct browser cases passed across the final runs,
including six dialog viewports from 390x320 to 1440x900 plus all existing Facilities,
Overview and authentication cases. Tests verify selected names/emails/counts, all
three billing states, full amounts, row/eye/keyboard opening, inactive checkbox
clicks, X/outside/Escape dismissal, focus trap/restore, background locking, unchanged
row/card/footer dimensions and desktop fit. An initial test used exact amount
text despite the adjacent cycle label; its assertion was corrected and all six
dialog cases rerun successfully.

The actual port 5176 preview was checked at 1440x900 and 375x667 for all three
statuses, close behavior, unchanged table dimensions, no runtime/console errors
and no API requests; screenshots were inspected. Scoped lint, whitespace checks
and production build passed. Full lint retains only the same two unchanged
Doctor/Patient errors; the existing bundle-size warning remains. The preview
module and sample admin identities remain excluded from production.

## Compact Facility Details visual correction

Only FacilityDetailsModal.jsx presentation was changed. Its maximum width is
520px instead of 600px, with content-based height and reduced padding/gaps. The
modal-only sample/placeholder description was removed along with its unused
aria-describedby reference; the underlying page preview warning stays intact.
Three borderless white rounded summary cards now share one softly tinted
lavender/pink container. Labels and numbers are smaller, with the same decorative
purple bars and unchanged per-hospital totals.

The information list has no divider lines and uses compact grey-label/dark-value
columns. Administrator name and email share a desktop line with a visible bullet;
small screens wrap the email naturally. All original billing states, sample data,
calculations, row/eye/keyboard opening, close/backdrop/Escape handling, focus trap
and scroll restoration remain unchanged. No Facilities table, pagination, sidebar,
header, Overview, backend or API files were edited.

All five aggregate/billing unit tests, 15 Facilities/modal browser checks, scoped
ESLint, diff checks and production build passed. Browser checks include a 390x320
viewport, every status, the new white borderless cards, removed description,
single-line desktop administrator details and unchanged underlying table geometry.
At the actual port 5176 preview the Active dialog measures 520x354 on desktop
and 343x402 at 375px mobile width; both were visually inspected without runtime
errors. Heights remain intrinsic and can grow/scroll for longer content. The
existing production build bundle-size warning remains. Only this documentation
and the modal-specific browser test were updated alongside the component.

## Subscriptions — Stage 1 plan cards and billing switch

The new Subscriptions page reuses SuperAdminLayout and the existing header,
sidebar, colors and typography. Subscriptions is now an active sidebar link;
Overview/Facilities navigation and all remaining disabled items retain their
styles/behavior. /super-admin/subscriptions is registered behind the unchanged
closed Super Admin boundary. /super-admin/preview/subscriptions is a separate
localhost/development-only route and its fixture module is excluded from
production. No authorization or backend/API files were modified.

SuperAdminSubscriptions.jsx owns local billing-cycle state, default Monthly.
The native-radio segmented control supports click, focus and arrow keys. Reusable
SubscriptionPlanCard.jsx renders only informational plan content. Starter shows
₦30,000/month or ₦300,000/year with original ₦360,000 struck through annually;
Growth shows ₦70,000/month or ₦700,000/year with original ₦840,000 struck through.
Features remain exactly as specified and sample subscriber counts stay 1 and 5
regardless of billing cycle. No counts are derived from cycle state or other
preview datasets. Card height and subscriber placement remain stable when
switching; cards share a row at tablet/desktop widths and stack on small screens.

All sample prices/features/subscriber counts live exclusively in
SuperAdminSubscriptionsPreview.jsx. Production has no sample fallback: until
backend authentication/integration is approved, the protected page cannot be
entered and its presentation defaults to plans unavailable with the switch
disabled. The preview makes no API/storage requests and has a visible sample
notice. No Subscribers table, payment integration, management action, purchase,
upgrade, edit/delete controls or additional page sections were built.

83 focused unit tests and 59 browser cases passed, including eight new responsive
Subscriptions cases, all previous Overview/Facilities/modal cases and guarded
route checks for anonymous/other/fake roles. Checks cover exact monthly/annual
prices and periods, annual strikethrough, unchanged features and counts, both
click/keyboard switching, stable card heights, default reset on reload, active
sidebar state, navigation to existing pages, desktop fit and no horizontal page
overflow or API calls. Scoped lint, diff checks and production build passed.
Full lint retains only the existing unchanged Doctor/Patient errors; the build
retains its existing bundle-size warning.

The actual http://127.0.0.1:5176/super-admin/preview/subscriptions was checked
in Chromium at 1440x900 and 375x667 for Monthly/Annually switching, correct cards
and zero runtime/console errors or API calls. Annual desktop and monthly mobile
screenshots were visually inspected. No backend files, environment, database,
existing authentication/authorization or other-role dashboards were changed.
Nothing was committed, pushed, merged or deployed. Stopped after Stage 1.

## Subscriptions — Stage 2 Subscribers table

SubscribersTable.jsx now follows the unchanged Stage 1 plan cards. Facility, Plan,
Cycle, Amount, Next charge, Method and Status are the only columns. Rows are
read-only: no modal, click handler, checkbox, edit/delete/payment/upgrade action.
The existing Subscriptions route and preview/authentication restrictions were not
changed. SubscriptionPlanCard.jsx and its prices, features, subscriber counts,
height and billing-cycle switch remain unchanged; the switch does not filter or
modify any table records.

subscriberTableModel.js applies facility-name-only case-insensitive search, then
status/plan filters, then one selected sort, then seven-row pagination. Both
filters combine and Clear filters resets them while retaining search/sort. Search
and filter changes reset page 1. Sorting retains the current page; derived page
clamping keeps it valid if results shrink. All six requested sort directions are
available. Missing dates/amounts sort last rather than becoming zero. Dates use
UTC/padded day, e.g. 02 Nov 2026. Empty results show a clear message with Page 1
of 1 and disabled navigation.

SubscriberPopover.jsx provides compact filter/sort controls, Escape/outside
dismissal and trigger focus on Escape. SuperAdminPagination.jsx follows the
Facilities three-part design, with first/previous, actual numbered pages and
ellipses, next/last, plus the disabled fixed 7 / page indicator. Total pages come
from filtered results, with no hardcoded design page count. subscribers.css is
scoped to this section; its table and pagination can scroll horizontally within
their own containers on smaller screens without outer-page overflow.

The unchanged Facilities fixtures were extracted to previews/facilityPreviewData.js
so both preview pages use the same trial records. Existing Facilities paid fixtures
have different amounts from the newly specified Subscribers prices; rather than
change or contradict those records, new paid/past-due examples have distinct Sample
facility names. Six shared trial facilities retain their exact names, IDs, plan,
cycle, trial date and zero amounts. previews/subscriptionPreviewData.js holds the
unchanged plan-card data and 70 subscriber examples: 64 distinct paid/past-due
hospitals plus six shared trials, initially ten pages. All four price combinations,
three statuses and both paid payment methods exist. Paid dates are future charges,
Past due uses original overdue dates, and trial uses the shared trial-end date with
Not available method. Stage 1 counts stay 1/5 design values, not verified totals.

The dataset and pricing fixtures are development-only. The production page has
no mock fallback or backend request and defaults to subscribers unavailable behind
the unchanged protected boundary. No APIs, backend, database or authorization
contracts were changed, and no live records are accessed.

92 focused unit tests and all 69 distinct Super Admin browser cases passed across
the final runs. The new nine unit cases cover name-only search, combined filters,
six sorts, immutable data, unknown values, fixed pagination/page clamping, dynamic
page numbers, mock pricing, cross-page trial consistency and dates. Ten new browser
cases cover the full control pipeline, all statuses/plans, empty results, first/
previous/numbered/next/last navigation, independent billing switch and eight widths.
The first combined run had 68 passes and one assertion comparing innerText to
textContent; that whitespace-only test issue was corrected. All 18 Subscribers/
Stage 1 browser cases then passed again. Existing Overview/Facilities/dialog/auth
cases passed without changing those designs or functionality.

Scoped ESLint, diff checks and final production build passed. Full-project lint
retains only the same two unchanged Doctor/Patient errors; the existing build
bundle-size warning remains. At actual port 5176 the complete page fits 1440x900
without vertical scrolling, and all interactions work at 375x667 with natural
vertical/contained horizontal scrolling. Shorter desktops scroll as needed because
the Stage 1 cards and all seven table rows remain intact. Desktop/mobile screenshots
were reviewed, with no runtime/console errors or API calls. Stopped after Stage 2.

## Subscriptions Figma visual correction

Measured original content height was approximately 899px: the cards alone were
339px tall and the switch sat outside them with separate 20px margins. This
caused vertical overflow on 1280x720 and 1366x768 screens.

SuperAdminSubscriptions.jsx now places the segmented switch at the top-left of
one softly tinted pink/lavender rounded panel, with both white cards in a
responsive grid beneath it. SubscriptionPlanCard.jsx uses compact padding, 16px
plan headings, 24px prices and readable 13px features. Card/footer margins and
reserved annual-price spacing are reduced; flex-column cards and a growing feature
list align both footers at equal height. Each footer has a thin divider, Subscribers
on the left and its unchanged count (1/5) on the right. Prices, feature text,
subscriber counts, native radio switching and annual strikethroughs are unchanged.

The plan panel is now 253px including its switch and both 197px cards. Smaller
page-heading and Subscribers top gaps reduce total intrinsic desktop content to
about 719px. At the actual preview, heading, panel, all seven subscriber rows and
pagination fit at 1280x720, 1366x768 and 1440x900 without vertical scrolling.
At 1280x600 the existing scroll area naturally exposes the full 719px of content.
No overflow-hidden, fixed card height, hidden rows, pagination clipping, shared
header/sidebar edits, or changes to Overview/Facilities were used. The grid uses
min-height:0/min-width:0 and the existing layout's min-height/overflow-auto fallback
preserves access for short screens, zoom, larger text and mobile stacking.

Only three Subscriptions presentation files changed, plus their two browser tests
and this documentation. SubscribersTable.jsx changed only its top gap. Its search,
filter, six sort orders, seven-row pagination, status mapping and record cycles
remain unchanged and independent from the plan-card switch. No mock-data, model,
API, route, authentication or authorization changes were made.

92 focused unit tests and all 70 Super Admin browser cases passed. New visual
assertions check the tinted parent around switch/cards, white cards, split footer
alignment, equal/stable card heights, full desktop table/pagination visibility and
the 1280x600 scrolling fallback. Existing control, modal, Overview, Facilities and
authentication cases still pass. Scoped lint, diff checks and production build
passed; full-project lint retains only the same unchanged Doctor/Patient errors,
and the existing build bundle warning remains. The actual port 5176 preview was
checked at 1280x720 and 375x667 for annual/monthly prices, search, combined filters,
clearing, sorting and pagination, with no runtime/console errors or API calls.
Monthly and annual screenshots were visually compared to the written specification.

## Payments — Stage 1 heading, gateway indicator and summaries

SuperAdminPayments.jsx reuses the existing layout/header/sidebar and displays the
exact Payments heading/subtitle, a compact Paystack indicator at the heading's
right on desktop, and PaymentSummaryCards.jsx below. The indicator is informational
only: it has no gateway status, configuration, switching, SDK, integration or API
request. Other navigation items retain their existing behavior and styling.

The three equal-height white cards use existing borders, corners and typography:
Collected (last 90 days) means successful subscription payments received; Upcoming
payments means expected hospital subscription payments in the next 30 days, not
gateway settlements; Failed charges means unsuccessful attempts. All supporting
descriptions match the written specification. Cards share one row from tablet
width and stack below it, using intrinsic grid rows rather than tall fixed heights.
Space below is intentionally reserved for a later Transactions table.

Only three sample values exist, in SuperAdminPaymentsPreview.jsx: 1500000, 70000
and 2. There are no generated transactions, payment calculations or date-window
arithmetic. The reusable summary component accepts future approved summary props;
unknown/invalid values render a dash, distinct from actual numeric zero. The
production page passes no samples and is behind the unchanged Super Admin boundary.
/payments is not a public API: /super-admin/payments is the protected frontend
route and /super-admin/preview/payments is the development/localhost-only design
route. The preview module/route is excluded from production, with a visible
notice that values are not verified payment data or a gateway connection.

No Transactions table, export, search/filter/sort controls, payment management,
backend, API, database or authorization changes were added. Existing Overview,
Facilities and Subscriptions components/data and shared dimensions are preserved.

92 focused unit tests and all 79 browser tests passed, including nine new Payments
cases covering exact labels/values/descriptions, active navigation, header/indicator
alignment, compact equal-height cards, eight viewport sizes, desktop fit, mobile
overflow, absent gateway SDKs/tables/controls, session-safe preview logout, other
page navigation and unavailable/zero handling. Existing page and guarded-route
regressions pass, including denying Payments to anonymous and other-role sessions.
Scoped lint, diff checks and production build passed. Full lint retains the same
two unchanged Doctor/Patient errors; the existing bundle-size warning remains.

The actual http://127.0.0.1:5176/super-admin/preview/payments was verified in
Chromium at 1440x900, 1280x720 and 375x667, including reload, no runtime/console
errors, no API calls or horizontal overflow, and no desktop vertical scrolling.
Desktop/mobile screenshots were reviewed. No credentials or actual payment data
were accessed. Nothing was committed, pushed, merged or deployed. Stage 1 only.

## Payments — Stage 2 Transactions

TransactionsTable.jsx adds the Transactions heading, visibly disabled Export list
button, seven-column semantic table and shared three-part pagination below the
unchanged payment summaries. Columns are Reference, Facility, Amount, Channel,
Gateway, Date and Status. Rows/references are read-only, with no checkbox, modal,
edit/refund/retry/delete/payment actions. No search/filter/sort controls were added.
Dates reuse the existing UTC padded-day formatter, and amounts reuse NGN formatting.
Successful/Pending/Failed use soft green/yellow/pink badges.

previews/paymentPreviewData.js contains exactly seven sample transactions with
unique TXN-2026 references, historical October 2026 dates, both Card/Bank Transfer
and Paystack/Flutterwave labels. Names and amounts reference the first seven
existing Subscribers samples without modifying them. There is no gateway SDK,
processing, connectivity check or API request. The three summary values were
moved unchanged into the same preview-only module as independent literals; they
are never computed from the sample transactions. No extra transactions were
generated to demonstrate more pages.

transactionTableModel.js implements only seven-row frontend pagination and valid
page clamping. The shared SuperAdminPagination accepts an optional accessible
label/disabled flag; default Subscribers behavior is unchanged. Transactions
show Page 1 of 1 with all navigation disabled for seven records, plus a fixed
7 / page indicator. It can support additional records later through component
state. Future page ranges were tested with isolated integers and controlled
pagination only, not extra financial fixtures. Empty and unconnected states
show clear messages with no fallback to samples.

payments.css distributes only Payments desktop height using flex columns on its
content/table regions, preserving intrinsic minimum row heights and fixed-height
pagination. All seven existing rows share available space rather than leaving
blank area below the footer. At actual preview sizes 1280x720, 1366x768 and
1440x900 the full page fits with pagination ending at the normal 10px bottom
padding; at 1280x500, 637px of intrinsic content scrolls naturally. Mobile stacks
the preserved summary cards and scrolls the table horizontally inside its own
container. No overflow-hidden, row removal, shared sidebar/header dimension
change or summary-card redesign was used.

95 focused unit tests and 89 distinct browser cases passed across the final runs.
The first combined browser run passed 88 cases; a duplicate-React hook in the
isolated pagination test harness was removed without application changes, and
all ten Transactions cases then passed. Checks include columns, references,
amounts, all badges/channels/gateways, disabled/no-download Export, read-only rows,
single-page navigation, future pagination control state, empty/unavailable
presentation, eight responsive widths, desktop fit/bottom padding and preservation
of all existing Super Admin pages and session guards.

Scoped lint, diff checks and production build passed. Full lint retains only the
same two unchanged Doctor/Patient errors; the existing bundle-size warning remains.
At the actual port 5176 preview, 1440x900, 1280x720 and 375x667 were checked for all
seven rows, reload, correct disabled controls, no runtime/console errors, gateway
SDKs, API calls or downloads. Desktop/mobile screenshots were inspected. The
production build excludes the Payments preview route/module and sample financial
references. No backend/API/database/authentication/authorization or other-role
changes were made. No commits, pushes, merges or deployment. Stage 2 complete.


## Messaging — Stage 1

Messaging now uses the existing sidebar, header and layout at the protected
/super-admin/messaging route. The localhost-only development preview is
http://127.0.0.1:5176/super-admin/preview/messaging. Role protection is unchanged;
no authentication bypass or live Termii integration was added. Production assets
exclude the preview route/module and isolated unlimited-usage sample.

SuperAdminMessaging.jsx composes MessagingSummaryCards.jsx and MessagingPanels.jsx.
The four white summary cards share a softly tinted rounded container. Messages
and Usage sit side by side on desktop and stack on mobile. The Termii indicator
is informational; View all is disabled. No message log or Stage 2 controls exist.

messagingModel.js calculates summaries from just two monthly aggregate records in
previews/messagingPreviewData.js. Current/previous UTC calendar month labels update
automatically, including year rollover. Current SMS has 1,803 delivered and 67
failed; WhatsApp has 1,482 delivered and 14 failed. Delivered plus failed gives
3,366 attempted messages and 81 failures; 52 queued messages are excluded from
all attempted-message denominators. Rates round to 97.6% overall, WhatsApp 99.1%
and SMS 96.4%. The previous 2,853 attempts support the rounded +18% comparison.
Missing totals and zero-attempt rates remain unavailable, without division by zero.
The 48,000 naira balance and three-week estimate are explicit mock values.

The three requested category counts and hospital usage values are preserved.
Category bars are decorative relative-count representations. Limited usage bars
show used/allowance; Lifeline's 91% uses the orange warning fill. Unlimited usage
shows a used count with Unlimited, never a fabricated percentage or limit. Its
isolated fixture is tested without adding a fourth visible hospital. All sample
statistics are passed only by the development preview, whose warning remains
visible. No individual message records or recipient information were generated.

Verification: 103 focused unit tests and 99 browser cases passed, covering existing
Super Admin pages, session guards, Messaging calculations, queue exclusion, month
rollover, disabled controls, unlimited handling and eight responsive viewports
from 375px to 1440px. Desktop cards remain in one row; panels sit side by side;
there is no desktop vertical or overall horizontal overflow. Actual port-5176
preview screenshots at 1440x900, 1280x720 and 375x667 were visually reviewed, with
no runtime/console errors or API requests. Scoped ESLint, diff checks and the
production build passed. Full lint retains the two unchanged Doctor/Patient
errors documented above; the existing bundle-size warning remains.

No backend, API, database, authentication, payment integration or other dashboard
files were changed for this stage. Nothing was committed, pushed, merged or
deployed. Stage 1 only; Stage 2 awaits review.


## Messaging — Stage 2 Message log

MessageLogTable.jsx adds the six-column read-only Message log directly below the
unchanged Stage 1 panels. All, Failed and Queued pills use React state and reset
to page one on selection. messageLogModel.js filters before seven-row pagination,
clamps invalid pages and formats UTC date/time. It allows only pre-masked Nigerian
recipient display strings; invalid/unmasked values show Recipient unavailable.
Descriptions come from approved kinds, not message bodies; channels display only
SMS or WhatsApp (unknown values remain unavailable). No row actions, checkboxes,
modal, navigation, search, date picker or export controls were added.

previews/messageLogPreviewData.js contains exactly seven fictional records with
stable unique IDs, pre-masked recipients and approved generic descriptions.
These are injected only by the existing localhost development preview. Monthly
statistics remain independent and unchanged; the seven rows never calculate
summary totals. No API, Termii or other messaging provider is contacted.

SuperAdminPagination has an optional simple mode for Previous/Next-only controls.
Its default full pagination behavior remains unchanged on the other pages.
subscribers.css extends its existing scoped three-part layout to Message log,
with Page X of Y on the left, navigation centered and fixed 7 / page on the right.
Mobile uses the existing wrapping pagination and horizontal table scrolling.
Empty/unconnected logs display honest compact states with disabled navigation.

Verification: 109 focused unit tests and 110 browser cases passed, including
Stage 1, all existing Super Admin pages, protected routes, all log filters,
status styles, privacy checks, inactive rows, empty/unconnected states and
isolated 25-record pagination tests. The preview dataset remains seven records.
Eight viewport sizes from 375px to 1440px were tested. Actual port-5176 screenshots
at 1440x900, 1280x720 and 375x667 were visually reviewed with no runtime errors or
overall horizontal overflow. The complete page fits at 1440x900. At 1280x720,
872px of content scrolls naturally rather than altering Stage 1 or clipping rows.
Production assets exclude the preview route and sample log IDs/recipients.
Scoped lint and production build passed; full lint retains the same two existing
Doctor/Patient errors, and the existing bundle-size warning remains.

No backend, API, database, authentication, external integration, shared sidebar
or header, or other dashboard functionality was changed. Nothing was committed,
pushed, merged or deployed. Stop after Stage 2 for review.


## Messaging — compact desktop spacing correction

The 1280x720 preview previously needed 872px of content: repeated 16px section
margins, 128px summary cards, 216px panels and 33px message rows exceeded the
available height. The main viewport height already accounted for the header;
there was no need to change h-screen/min-h-screen or add a nested scroll area.

messaging.css now scopes desktop-only spacing to Messaging content at 1024px and
above. Section margins are 8–10px, summary vertical padding is 8px with 4px
internal margins, panel vertical padding is 10px with tighter list spacing, and
table cells use 2px vertical padding (25px rows). Table header/footer padding is
also reduced. Fonts, line heights, colors, bar dimensions/proportions, values,
section arrangement and all controls remain unchanged. The style import is in
SuperAdminMessaging.jsx; MessagingPanels.jsx adds only a CSS scope marker.

Actual preview measurements show intrinsic content of 714px and pagination
ending at y=703: all seven rows fit without scrolling at 1280x720, 1366x768 and
1440x900. Mobile retains its original 33px rows and spacing. At 1280x500 or narrower
1024x768, natural content scrolling remains available without clipping. No height
constraint, overflow-hidden, shared sidebar/header change or other page styling
was introduced. The existing sidebar can scroll independently on short screens;
Messaging itself has just one vertical scroll area. Regression coverage checks
desktop fit, mobile horizontal containment and short-screen pagination access.


## System Health — Stage 1

System Health now uses the existing sidebar/header/layout at the protected
/super-admin/system-health route. Local development preview:
http://127.0.0.1:5176/super-admin/preview/system-health. The existing role boundary
is unchanged and remains closed pending backend Super Admin authentication.
Preview routing and its sample monitoring data are excluded from production.

SuperAdminSystemHealth.jsx composes SystemHealthAlert.jsx and
SystemHealthSummaryCards.jsx. The exact subtitle is preserved, including Checked
every minute, but there is no polling, simulated checks, monitoring integration,
API request or timer. Run checks now is visible and disabled with no handler.
The alert uses the existing warm warning palette, derives service names/counts
from degraded statuses, supports singular/plural warnings and disappears when
none are degraded. It has no dismiss control. Four white summary cards sit in a
shared softly tinted rounded container, with one row on desktop and responsive
stacking on smaller screens. Platform table, filters and incident list are not
implemented in Stage 1.

systemHealthModel.js calculates uptime as available/monitored time, response time
as the mean recorded measurement, webhook reliability as successfully processed
webhook events/total processed events, and open incidents as all non-Resolved
statuses. Missing/invalid data remains unavailable rather than pretending to be
healthy; empty incident lists correctly produce zero. Webhook processing is
independent of successful customer payments.

previews/systemHealthPreviewData.js contains six stable service IDs and their
names, status, monitoring duration, response samples and derived uptime/response
metrics. API uptime is 49,990/50,000 seconds = 99.98%; [180,182,184] averages 182ms;
499/500 processed webhooks = 99.8%. Termii SMS is initially degraded; all other
services are Operational in this isolated mock snapshot, as requested. Existing
Overview integration samples are unchanged. Additional monitoring figures are
illustrative preview data, not verified service measurements. One Investigating
incident links to Termii SMS, with title SMS Delays to MTN numbers, a stable sample
timestamp 2026-10-27T13:40:00Z and preview display label Today, 13:40. It is prepared
for Stage 2, not rendered yet; the sample date is not a live incident timestamp.

Actual port-5176 desktop/mobile preview screenshots at 1440x900, 1280x720 and
375x667 were visually inspected, including reload and disabled checks. No runtime
errors, monitoring requests or page-wide horizontal overflow occurred. Desktop
content fits without scrolling; mobile scrolls naturally. Production assets were
checked to exclude the preview route/module and mock incident. Scoped lint,
whitespace checks and production build pass; full-project lint retains the same
two unchanged Doctor/Patient errors, and the existing bundle-size warning remains.
No backend, API, database, authentication, monitoring integration or other role
files changed. Nothing committed, pushed, merged or deployed. Stop after Stage 1.


## System Health — Stage 2 Platform and Open incidents

SystemHealthPlatform.jsx adds the white rounded Platform table below the unchanged
Stage 1 cards. Its Service/Uptime/Response time/Status columns use all six existing
service objects and their existing metrics. A native accessible select shows
All by default and filters Operational/Degraded immediately in React state. Only
table rows change; the source data, service alert, summary and incident list stay
unchanged. Rows are informational with no actions, checkbox, navigation, modal,
search, sorting or pagination. Compact green/amber badges reuse existing colors.

SystemHealthIncidents.jsx uses the same incident/service props, resolves service
names by stable ID and displays the existing SMS incident title, service, sample
Today, 13:40 label and Investigating badge. It supports Investigating, Identified,
Monitoring and Resolved presentation while excluding resolved incidents from the
open list. The shared openHealthIncidents helper in systemHealthModel.js now also
supplies the summary count, preserving all previous calculations and missing-data
behavior. No open incidents and unconnected monitoring have distinct honest
states. Incidents are read-only with no actions or status editing. Resolving an
incident does not change service status; making a service Operational does not
resolve its incidents. The centralized preview dataset was not changed or copied.

SuperAdminSystemHealth.jsx adds only the two new sections after the cards.
Stage 1 heading, button, alert and summary styling is unchanged. Existing routes,
preview guards, sidebar/header and other dashboard pages were not modified.
Platform scrolling is contained horizontally on mobile; incident text wraps.
The actual port-5176 preview fits fully at 1280x720, 1440x900 and 1024x768, with
the incident section ending at y=672/672/718 respectively. Screenshots at desktop
and 375px mobile were visually reviewed. Short screens scroll naturally through
the existing single content scroll area. No clipping, added vertical scroll
container, fixed-height crop, monitoring request or simulated update was added.
Production assets still exclude the preview route and monitoring fixtures.

Tests cover the existing service values, all three filters, read-only rows and
incidents, status badges, no-match/empty/unconnected states, resolved exclusion,
summary/list consistency and independent service/incident statuses using isolated
copies only. No backend, API, database, authentication or external monitoring
changes; no new dependencies. Nothing committed, pushed, merged or deployed.
Stop after Stage 2 for review.

Stage 2 verification results: 118 focused unit tests and 137 distinct browser
cases passed across final runs, including all 26 System Health cases. Five
isolated tests initially mounted the shared layout without Router context; the
test harness now mounts the monitoring components directly. No application or
authentication change was needed. All existing-page regression cases passed.
Scoped ESLint, whitespace checks and production build passed; full lint still
reports only the two unchanged Doctor/Patient baseline errors noted above.


## Audit log — complete frontend preview

SuperAdminAuditLog.jsx uses the existing layout at the protected
/super-admin/audit-log route; the new sidebar destination has the same active
styling. The role boundary is unchanged. Local development preview:
http://127.0.0.1:5176/super-admin/preview/audit-log. It remains restricted to DEV
and localhost. Export data includes the existing download icon and is disabled,
with no handler, request or download. Existing Overview View all controls remain
unchanged; no unrelated page functionality was added.

AuditLogTable.jsx provides When/Who/Action/Facility in a bordered, rounded white
table with grey headers and compact dividers. Who displays the actor name and
role on separate lines. Every heading has a keyboard-accessible sorting button,
grey direction icon, next-direction tooltip and aria-sort indicator. Default
ordering is newest first; clicking the active heading reverses direction, while
new text columns start A-Z. Sorting resets pagination to page one. Timestamp
comparisons use actual dates; actor sorting uses names, not roles. All ties keep
original input order. Null facilities display an em dash. Invalid dates sort
last; empty and unconnected datasets have distinct honest messages.

auditLogModel.js sorts before seven-row pagination and clamps page requests.
The existing SuperAdminPagination simple mode supplies Page X of Y, centered
Previous/Next and fixed 7 / page. The shared CSS adds only the Audit log scope,
leaving existing page styles and pagination behavior unchanged. Seven sample
records show Page 1 of 1 with both navigation controls disabled. Future multi-page
behavior was tested with isolated fixtures, not additional visible audit records.
Rows have no click handler, link, action, checkbox or modal. No search, status/date
filters, local storage, event tracking or backend connection was introduced.

previews/auditLogPreviewData.js contains exactly seven fictional historical
records with stable IDs and ISO timestamps, the seven requested activity labels,
System/Automated action and Adekemi Johnson/Super Admin presentations, established
hospital names and one platform-wide null facility. These are not real accounts
or events and do not alter Facilities status. Preview data is passed only by
SuperAdminAuditLogPreview.jsx; production assets exclude that route/module,
fixture IDs and sample actor name. No clinical or recipient data is included.

Verification: 126 focused unit tests and 152 browser cases passed, including all
existing Super Admin pages, protected-route/session checks, every sorting column
and direction, timestamp semantics, stable ties, disabled export, read-only rows,
seven-row pagination, sort-reset behavior, empty/unconnected states and eight
responsive viewports from 375px to 1440px. Actual port-5176 screenshots at
1440x900, 1280x720 and 375x667 were visually reviewed, including reload and sort
interaction, with no runtime errors or API requests. Desktop fits without vertical
scrolling; mobile horizontal scrolling is confined to the table. Scoped ESLint,
whitespace checks and production build pass. Full-project lint retains the two
unchanged Doctor/Patient errors documented above; the existing bundle-size
warning remains. No backend, database, API, authentication/authorization or other
role changes. No dependencies installed. Nothing committed, pushed, merged or
deployed. Stop after Audit Log for review.


## Overview — unavailable defaults for future backend integration

Overview no longer displays hardcoded samples, even on the development preview.
SuperAdminDashboardPreview.jsx now contains only the existing localhost/DEV guard
and layout render; its subscriptions/hospital arrays, revenue amounts/month bars,
plan shares, platform totals, generated renewals/dates, integration health figures
and sample activities have been removed. No fixture was moved into another runtime
module. Other pages' preview datasets and routes are unchanged.

overviewState.js defines createOverviewState(), overviewSectionState() and the
UNAVAILABLE/LOADING/SUCCESS/EMPTY/ERROR state names. SUCCESS maps to the components'
existing ready status. The default section states contain null numeric metrics
and empty record collections, with unavailable status distinguishing missing data
from a confirmed empty response. Each call creates independent mutable containers.
This is a frontend presentation model, not a proposed or assumed backend contract.
The documented fields match the existing component props:
- statisticsState: monthlyRevenue, previousMonthlyRevenue, months[{label,amount}],
  plans[{name,count,share}]. Values are absent until supplied; no fake percentages.
- platformState: registeredFacilities, activeSubscribers, messagesSent,
  patientsOnRecord, pendingApplications, trialSubscriptions, overdueSubscriptions,
  deliveryPercentage and liveFacilities. All default to null rather than zero.
- renewalsState: existing id/hospitalName/plan/amount/renewalDate records.
- integrationsState: existing service ID/uptimePercentage/responseTimeMs/status.
- activitiesState: existing occurredAt/actionType/actor/facilityName records.

SuperAdminDashboard accepts overviewState while retaining all individual section
state props for compatibility. Both the default protected component and preview
use unavailable defaults. Authentication, protected routes, sidebar/header and
state ownership are unchanged. Future integration must map confirmed backend
responses into these fields and explicitly set each section's status; no endpoint,
service, request, token handling or new state library is included.

RevenuePlanMix retains tabs, titles, primary value typography, chart rendering,
keyboard navigation and successful-data behavior, while unknown revenue displays
an em dash and empty chart areas show No revenue data available / No plan
distribution data available. overviewRevenueData safely handles missing/partial
collections, preserves known zeroes and never calculates absent values. Existing
platform cards already support unavailable metrics and now show four em dashes.
Upcoming renewals displays No renewal data available. Recent platform activities
retains all four table headings and displays No activity data available. Integration
service names/icons remain with Unavailable health, never inferred Operational.
Existing loading/error/empty views and retry callbacks remain reusable; no error is
shown simply because no API is connected. Renewal date-refresh listeners/timers
are now installed only for ready nonempty renewal data, not on the unavailable page.

The compact Overview CSS, all reusable sections and table/chart components remain.
No figures or records have been added to the displayed unavailable state. Isolated
unit/browser fixtures verify ready-data chart/plan rendering, partial/zero values,
loading/error/empty states and future props without becoming page data. There is
no remaining runtime dependency on mock records in Overview. Pure preview helper
functions retained elsewhere are reusable/tested utilities, not displayed data.
Other Super Admin pages continue using their existing isolated samples.

Actual port-5176 Overview preview at 1440x900, 1366x768 and 375x667 was checked in
both tabs with screenshots, no runtime errors, no backend requests, no fabricated
chart points or activity timestamps, and no desktop overflow. Mobile scrolls
naturally without overall horizontal overflow. Scoped lint and build pass; full
lint retains the same two existing Doctor/Patient errors. No backend integration,
authentication change, commit, push, merge or deployment. Stop before API work.


## Facilities — unavailable defaults and frontend data readiness

SuperAdminFacilitiesPreview.jsx no longer imports facilityPreviewData.js or passes
sample records/counts/Page 2 of 16 metadata. It renders the existing page with
unavailable defaults. The shared fixture file is intentionally unchanged because
Subscriptions still imports it; it is not a runtime dependency of Facilities.
The Facilities-only preview warning now accurately states that no facility data
or backend connection is present. Other page warnings are unchanged.

facilitiesModel.js defines createFacilitiesState(status, records), with an empty
records collection and unavailable status by default. Supported section statuses
are unavailable/loading/ready/empty/error. Record fields document the existing
facility presentation/modal model, not an assumed backend API contract. The page
accepts state for future supplied records while retaining its original data.rows
presentation prop for compatibility. Counts and pagination are computed from
provided records rather than accepted fabricated page/count metadata. Unknown
filter totals remain em dashes; confirmed empty results can display zero. Missing
clinician/patient/message fields continue to display em dashes, never assumed zero.

The existing search and filter controls were Stage 1 disabled placeholders, and
pagination was static. They are now wired to React state as required: hospital-name
only, case-insensitive trimmed search; All/Active/Trial/Past due filtering; stable
ascending/descending header sorting; and seven-record pagination after filtering
and sorting. Search/filter/sort changes reset page one. Numeric unknowns sort last
in either direction. Empty pagination is Page 1 of 1, with Previous/Next disabled
and a fixed 7 / page indicator. Existing three-part pagination classes and table
styles are retained. Sorting buttons inherit the existing heading appearance.
No search or filter is disabled just because no backend is connected.

Default empty text is No facilities available yet. A nonempty name search or
selected status with no matches displays No matching facilities found. Loading
and error presentations are explicit states supplied by a caller, not simulated
requests or errors caused by missing backend connectivity. No records are generated.
No network, storage, auth or protected-route changes were introduced.

FacilityDetailsModal retains its design, calculations, click/outside/Escape close
behavior, focus restoration and scroll locking. A guard renders nothing for a
missing/unnamed facility. The page derives selection by ID from currently available
records, so removing data or leaving a ready state closes stale details. No sample
facility opens automatically. Selection checkboxes remain intentionally inactive;
row and eye actions remain available only for actual supplied rows. The approved
CSS declarations were unchanged (only a stale comment was updated), preserving
full desktop table height, bottom pagination and responsive table scrolling.

Verification: 134 focused unit tests and 157 browser cases passed, including all
Super Admin pages, session guards, unavailable Facilities across nine viewports,
combined search/filter/sort/seven-row pagination, empty/loading/error/success,
missing numeric fields, stale selection cleanup, and the original modal keyboard/
focus/close coverage. Existing samples are used only by isolated browser-test hosts
in tests/fixtures/FacilitiesHarness.jsx and tests/e2e/facilityHarness.mjs; no mock
route or application fallback was added. The test host supplies its own Router
without altering app authentication. Other page datasets remain unchanged.

Actual port-5176 screenshots at 1440x900, 1366x768 and 375x667 were visually reviewed:
no example rows, no open modal, Page 1 of 1, no runtime errors, no backend requests,
no page-wide horizontal overflow or desktop vertical scrolling. Reload restores
the unavailable state. Scoped ESLint, whitespace checks and production build pass;
full lint retains the same two unchanged Doctor/Patient errors. Future work requires
a confirmed API adapter feeding the documented presentation props, after approval.
Nothing committed, pushed, merged or deployed; no backend integration performed.

## Authentication integration — October 27, 2026

This section supersedes the pending-authentication descriptions above. The existing
SuperAdminLogin page now uses POST /api/auth/login with role `super_admin`, as
verified in fetched origin/main commit 081737228422d5ad00ca655912b47828952ff545.
The response must contain a nonexpired JWT and matching user ID/role. Login then
checks GET /api/auth/profile for matching identity, Super Admin role, verified email,
and non-pending invitation status before navigating to /super-admin/overview.
The boundary repeats server verification before rendering any protected child.

`authentication.js` follows the existing role-session patterns, with isolated
`medtrailSuperAdminSession` sessionStorage containing only the candidate token.
Ordinary Admin sessions never authorize Super Admin content. Reload requires a
fresh backend profile check. Expiry, logout, failed authorization, and abandoned
login attempts cannot restore protected access. Recoverable profile/network errors
keep content hidden and offer retry or logout. Preview routes remain isolated.

The existing login UI and dashboard designs are unchanged. Shared Login adds
Super Admin role recognition only when explicitly configured with its adapter.
Password recovery remains disabled: enabling that workflow is outside this change.
No public signup, credentials, token bypass, or backend changes were introduced.

For live testing, use a separately running updated backend, set VITE_API_BASE_URL
to its origin (default http://localhost:3000), ensure frontend CORS access, and use
an existing verified account provisioned with role super_admin. No backend was
started here. Its schema synchronization and sample seeding must be addressed by
the backend owner before running it against a shared database. Overview data/API
integration remains separate from this authentication change.

Validation: 62 focused session unit tests passed, covering Super Admin and existing
Admin/Doctor/Pharmacist/Patient sessions. All 62 selected browser cases passed
across the main run and targeted rerun; one Patient form interaction timed out in
the main run and passed on rerun without code changes. Browser checks include
seven login viewport widths, preview rendering/navigation, verified login and
reload, role/identity rejection, session expiry, logout isolation, retry, and
restored-token 401/403/404 rejection. Changed-file ESLint, git diff --check, and
production build passed. Build retains the bundle-size warning. All API responses
and account/token inputs in these checks are isolated test fixtures; no live
credentials, backend startup, database operations, or live login were used.

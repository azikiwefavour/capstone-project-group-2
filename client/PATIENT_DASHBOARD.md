# Patient dashboard

Preview: http://localhost:5174/patient/dashboard (requires a verified Patient login).

Local visual preview without login: http://localhost:5174/patient/preview/dashboard.
This separate route is available only in Vite development mode on localhost,
127.0.0.1 or ::1. Its lazy-loaded module is excluded from the production build.
The preview contains no medication or diagnosis records; its four zero counts
represent an explicit empty visual state, not a successful backend lookup.
The empty preview has no development information banner; the name remains labeled
as a mock placeholder. The preview makes no API calls and does not change browser storage or sessions. Its logout
control opens the shared confirmation modal; confirming only closes the modal.
The real dashboard route remains protected and uses the existing Patient logout.

The protected route and profile verification remain unchanged. The dashboard uses
the verified profile name, existing MedTrail logo/icons, and the established summary
card palette, borders, typography, spacing, and shadows. The logout confirmation
component is reused unchanged from the Pharmacist worktree; confirming invokes the
existing Patient-only logout handler. Other roles are untouched.

## Current data limitation

The latest origin/main source now declares Patient dashboard, prescription,
diagnosis and profile endpoints. Clinical integration is intentionally deferred
in this resolution worktree; see PATIENT_API_REVIEW.md for the required mappings
and diagnosis-semantics question. Doctor prescription reads
require Doctor permissions; Pharmacy reads require Pharmacist or Admin permissions.
The shared authenticated profile endpoint supplies identity, not clinical records.
The frontend therefore makes no unconfirmed clinical requests and shows unavailable
counts as `—` on desktop, and labeled unavailable zero placeholders on mobile.
These placeholders are not confirmed totals. Diagnosis search is disabled until
records are available; unavailable records remain distinct from a confirmed empty list.

`PatientDashboardContent` supports rendering supplied complete Patient prescriptions
and diagnosis records, calculating counts, displaying active medication cards, and
searching diagnoses. Its props are a presentation interface, not an invented backend
contract. Populated fixtures are isolated to tests and the explicitly labeled localhost-only
pagination preview; they never populate the protected dashboard or empty preview.
Diagnoses must come from authoritative diagnosis records, not inferred prescription
reasons. A future adapter must validate and map the confirmed Patient-authorized reads
before these props can be supplied. No clinical fetches are added here.

## Design scope

Desktop shows four summary cards in one row from 1024px, with active prescriptions
and diagnoses below. Desktop content is capped at 1440px with 24px side padding,
22px bottom padding and 40px gaps between the main sections. The 1440×929
reference uses flexible height so shorter screens and populated tables can scroll.
The same components provide the completed mobile layout. Diagnosis search is
left-aligned beneath its heading. Short viewports and populated lists can scroll;
content is not hidden to force the dashboard into a fixed height.
Diagnoses are filtered, then sorted, then paginated locally: 10 per page from
1024px, otherwise 5. Click a column heading to sort Diagnosis, First recorded,
Treated with or Status ascending; click again for descending. Text sorting is
case-insensitive and numeric-aware; dates sort chronologically. Missing/invalid
values stay last and equal values retain their input order. Header buttons support
keyboard activation and expose the current direction with aria-sort.
Desktop has numbered pages and Previous/Next; smaller widths use Previous/Next.
Search or sort changes reset to page 1, and empty/single-page results have no pagination
footer. Populated pagination fixtures are isolated to automated tests and the
localhost-only `/patient/preview/diagnoses-pagination` route. This separate preview
has 25 explicitly labeled test diagnoses; search `Alpha` for 12 matching records.
It makes no API calls or storage changes and is excluded from production.
The original empty preview and protected dashboard never receive these fixtures.

## Mobile dashboard

The same components switch below 1024px to a two-column summary grid, with the
icons above the counts and labels. Mobile icon backgrounds follow the requested
yellow, pink, lavender and light-grey order; desktop colors remain unchanged.
Active medication cards stack, with prescription details wrapping safely.
The four-column diagnosis table scrolls inside its focusable container, and
pagination uses five rows with Previous/Next controls. Tests use 51 isolated
diagnoses to cover records beyond the 25-record development preview.
Without a confirmed clinical API, mobile zero counts are explicitly labeled as
unavailable placeholders; they are not represented as verified empty records.
Search, sorting and pagination share the same behavior on desktop and mobile.
The mobile summary grid is capped at 361×412px with 22px gaps and 195px cards.
Cards use 16px corners, 1px borders, 16px vertical padding and 8px horizontal
padding; columns shrink on smaller phones without changing the desktop cards.
No Figma URL or image was available during implementation; the layout follows the
requested structure and repository dashboard styles, pending exact Figma comparison.
Patient authentication components and CSS were not changed.

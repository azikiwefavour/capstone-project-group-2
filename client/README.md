# React + Vite

## Pharmacist authentication

Pharmacists join through an Admin invitation at `/accept-invite?token=...`.
Validated Pharmacist invitations open `/pharmacist/create-password`, using the
same password setup form as Doctor. Completing setup verifies email ownership
and establishes a candidate Pharmacist session using the existing backend JWT.

Login is at `/pharmacist/login`. Password recovery uses
`/pharmacist/forgot-password`, `/pharmacist/verify-reset-code`, and
`/pharmacist/new-password`. These routes call the real authentication APIs;
the Doctor preview recovery configuration is unchanged. Email verification and
resending a verification code are available from login errors where applicable.

Set `VITE_API_BASE_URL` to the backend origin (defaults to `http://localhost:3000`).
The backend must allow requests from the frontend origin and have email delivery
configured. No new endpoints are required.

The `/pharmacist/dashboard` page renders only after `/api/auth/profile` confirms
a matching, verified Pharmacist identity. Pharmacist tokens use a separate
tab-scoped session storage key; logout and expiry remove that session.

The dashboard follows the Doctor dashboard's responsive structure and reuses its
shared header, logo, and icons. It reads `GET /api/pharmacy/dashboard` for awaiting
clarification and dispensed counts, and lists distinct patients from the returned
recent prescriptions. View All expands the received recent patients within the
dashboard; the endpoint currently returns the latest ten prescriptions.

The backend does not currently expose a verified-prescription count or a recent
activity feed. These sections display unavailable states, never fabricated
counts, descriptions, or dates. The activity View All control remains disabled
until its data is available.

The protected `/pharmacist/verification-queue` page uses the same layout and
verified profile header as the dashboard. It reads
`GET /api/pharmacy/prescriptions?status=pending`, displays only the backend's
`pending` (unverified) records, and sorts `createdAt` oldest first. Medication
indications use `reason` when supplied; missing display fields remain unavailable.
Dates use the Doctor timestamp formatter in the browser's local timezone; unknown
or timezone-less timestamps display a dash and sort after known dates.

Patient names and the three-dot Open prescription menu link to the protected
`/pharmacist/verification-queue/:prescriptionId` details page. Details are resolved
by exact prescription ID from a fresh `GET /api/pharmacy/prescriptions?status=all`;
there is no pharmacy GET-by-ID endpoint. Current medications are records with the
same patient ID and `active` or `pending` status, matching the Doctor backend's
definition. This list is limited to the pharmacist's hospital, as scoped by the API.
Medication menus can open their read-only prescription details too.

The pharmacy API does not expose patient age or gender, so these are unavailable.
A missing patient ID makes Current medications unavailable rather than empty;
names are never used to associate prescriptions with a patient. A pharmacy patient
profile/medication endpoint would be needed for demographics and a complete
cross-hospital medication list. Doctor and Admin endpoints are not called.

Verify prescription opens a confirmation modal with the already-loaded patient
and prescription data. It reuses the Doctor `PrescriptionDialog` for native modal
focus handling, Escape/X closing, scroll locking, and responsive sizing, and shares
the prescription information panel with the details page.

Verify and dispense prescription remains disabled. The existing
`POST /api/pharmacy/prescriptions/:id/dispense` marks a prescription dispensed,
records the pharmacist, and creates a dispensing activity. There is no explicit
verification endpoint or documented combined verification/dispensing contract.
The intended verification transition and audit requirements need backend
confirmation before enabling that button; the modal performs no requests.
Request clarification opens a modal using the same Doctor dialog and selected
patient data. It requires one of Dose, Frequency, Duration, Possible duplicate,
or Other, plus notes with at least 10 trimmed characters containing a letter and
at most 200 characters. The radio group and textarea do not submit on Enter;
only activating Submit request sends a request.

Submission rechecks the prescription in the hospital-scoped pharmacy list, then
posts `{ concern, reason: notes.trim() }` to
`POST /api/pharmacy/prescriptions/:id/clarify`. These are existing DTO fields.
The backend stores the concern/reason, changes status to `awaiting_clarification`,
and records the pharmacist and clarification activity. A matching prescription,
patient, status, concern, and reason must be returned before success is shown.
The page refreshes after success, and returning to Queue reloads pending records.
Already-requested, dispensed, discontinued, completed, or cancelled records cannot
be submitted again through this UI. Verify and Dispense remains disabled.

While submitting, repeat clicks and modal dismissal are blocked. Validation/4xx
errors preserve the notes for an explicit retry. Lost, malformed, or server-error
write responses disable retry until the modal is closed and the prescription is
refreshed: a write may already have succeeded. The backend does not provide an
idempotency key or an atomic duplicate-clarification guard; frontend checks cannot
prevent simultaneous submissions from different clients. Live submission testing
requires an authorized real Pharmacist account and prescription and is separate
from the isolated fixture-based browser tests.

Pharmacy requests share the Pharmacist-only API client, which discards abandoned requests
and responses after session changes. Details are also keyed to the route ID to
avoid displaying the previous prescription while another record loads.

`/pharmacist/clarifications` lists real requests and replies from
`GET /api/pharmacy/prescriptions?status=all`. Patient-name links open
`/pharmacist/clarifications/:prescriptionId`, using the same details page, patient
profile, prescription information, and current medications table as Queue. IDs
identify prescriptions/requests, not patient names, so multiple requests for the
same patient remain separate. These pages make GET requests only.

The orange Pending clarification banner uses the actual `awaiting_clarification`
status, `concern`, `clarificationReason`, and prescriber's name. Dismissing it
changes component state only; returning or reloading restores the banner. Replies
use `clarificationResponse` and the actual backend status (`clarified`, or a later
prescription state). Missing responses are never inferred from generic notes or
invented. Reloading the page fetches current responses. Request history remains
visible when returned by the API even after dispensing. The API has no dedicated
clarification timestamp/history endpoint, so the list labels its date as
Prescription date and cannot display older overwritten request/response versions.

`/pharmacist/dispensed-medication` shows Dispensation History using
`GET /api/pharmacy/prescriptions?status=dispensed`. It reuses the existing layout,
icons, table styling, and shared Admin/Doctor pagination. Search filters the
returned medication, indication, patient, dose/frequency, and prescriber fields
locally; pagination offers 7, 14, or 28 records per page. Search and page-size
changes return to page 1. Only records actually marked `dispensed` are displayed.

The current pharmacy API lists hospital-scoped prescriptions with their current
status, rather than immutable dispensing events. There is no dedicated
dispensing-history endpoint or dispensing timestamp: `date` is the prescription's
creation time, and `updatedAt` can change for other reasons. Dispensed on therefore
shows unavailable, never an inferred date. A backend dispensing-event history with
an explicit timestamp is required for accurate event dates and for records whose
status changes after dispensing. The page performs only read requests and does not
enable the still-disabled Verify and Dispense operation.

Run checks from `client`:

```sh
npm ci
npm test
npm run lint
npm run build
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
npm run test:e2e
```

Browser tests use API response fixtures confined to `tests/e2e`; the application
always authenticates through the backend. Live invitation emails and real
account credentials require a separate check against a running backend.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

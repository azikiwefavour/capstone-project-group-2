# Patient API review for the isolated resolution

This review reads the API source added on origin/main (dbeb1c5). It does not
connect clinical APIs, send real requests or modify backend source/configuration.
The completed responsive Patient UI and its protected route remain authoritative.
The standalone Patient dashboard added on main was not wired into main's router;
its generic-session access and alternate UI are not carried into the Patient route.

## Authentication resolution

Patient sessions have one owner: `auth/patientSession.js`, with role/subject/expiry
validation followed by backend profile verification. The shared `auth/session.js`
retains its Admin persistence behavior and never touches Patient storage. Existing
Patient `{token}` storage and main's `{token, role: "patient"}` shape both restore
through the dedicated Patient module; no user storage is migrated or deleted.
Patient generic login entry redirects to `/patient/login`. Invitation activation
uses setPatientAccessToken. Admin, Doctor and Pharmacist settings/profile changes
from main are retained, as are all their routes, workflows and logout controls.

`admin/invitationLinks.js` had no textual conflict. Its current-origin,
development-only registration helper is preserved and covered by its origin,
token encoding, role-validation and Admin-to-Patient browser tests. No fixed
frontend port or invitation API contract is introduced by the resolution.

## Clinical mappings to implement only after approval

| API/source field | Existing UI expectation / mapping requirement |
| --- | --- |
| GET /api/patient/dashboard | Supplies patient, stats, activePrescriptions and diagnoses. Validate patient.id against the verified Patient subject and validate every required collection/count before display. |
| stats.pending, active, all, discontinued | Keep server totals; the active-prescription subset cannot supply all counts. Server pending includes awaiting_clarification, while the current list helper counts literal pending only. Reconcile that semantics explicitly. |
| activePrescriptions.status | Dashboard returns `Active`; the UI's active filter uses `active`. Normalize recognized values in a future adapter. |
| activePrescriptions.medicationName, dosage, frequency, reason, doctorName | Correspond to existing card fields. Do not infer missing values from examples or unrelated fields. |
| activePrescriptions.date | Human-formatted ordinal date, with no raw timestamp in this dashboard collection. Do not parse it as ISO or invent createdAt. GET /api/patient/prescriptions supplies createdAt, so a future integration can use that confirmed source or agree a timestamp contract with the backend engineer. |
| diagnoses.firstRecorded / diagnoses.date | firstRecorded is a formatted local date string; date is the raw timestamp. Map date to the UI's firstRecorded field for reliable sorting/formatting. |
| diagnoses.status / rawStatus | Server labels are Current treatment/Past treatment. Keep their display meaning and preserve rawStatus separately; do not turn every treatment label into an Active badge. |
| diagnoses.diagnosis | The service derives this from prescription.reason. Confirm with the backend engineer/product owner whether these are approved diagnoses or prescription indications before presenting them as recorded diagnoses. |

Additional routes on main: GET /api/patient/prescriptions (optional status),
GET /api/patient/prescriptions/:id, GET /api/patient/diagnoses and
GET /api/patient/profile. They are guarded, and the service scopes records to the
JWT subject. Deployment/availability on the approved development backend has not
been verified as part of this isolated conflict resolution.

Until integration is separately approved, retain unavailable/loading/error versus
confirmed-empty distinctions. Test/preview data never enters the protected page.
The backend-generated invitation email URL mismatch remains a separate unresolved
configuration issue; this work does not change FRONTEND_URL or any backend files.

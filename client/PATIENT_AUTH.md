# Patient authentication

Patient accounts are created by a hospital invitation. The Patient login page has no public registration link. The public `/create-account` page remains the Admin registration flow.

Routes:

- `/patient/login`
- `/patient/create-password?token=…`
- `/patient/forgot-password`
- `/patient/verify-reset-code`
- `/patient/new-password`
- `/patient/verify-email`
- `/patient/dashboard` (protected responsive dashboard)

Existing hospital email links enter through `/accept-invite?token=…`. The server validates the token and supplies the role before a Patient invitation redirects to the Patient password form. Query-string role hints never authorize activation. Completing registration activates the account and verifies email through the existing backend operation.

## Confirmed API support

The checked-in backend implements these operations for Patient users:

| Operation | Existing endpoint | Confirmation |
| --- | --- | --- |
| Validate invitation | `GET /api/auth/validate-invitation?token=…` | `AuthService.validateInvitationToken` returns the stored invited role; `InviteUserDto` permits Patient invitations. |
| Activate invited account | `POST /api/auth/complete-registration` | `AuthService.completeRegistration` applies the invited role, verifies email, consumes the invitation, and issues a JWT. |
| Login | `POST /api/auth/login` | `LoginDto` includes Patient in `UserRole`; the service enforces the requested role. |
| Verify session | `GET /api/auth/profile` | The service returns the authenticated user profile for the JWT subject. |
| Request reset code | `POST /api/auth/forgot-password` | Role-independent lookup and OTP creation in `AuthService.forgotPassword`. |
| Verify reset code | `POST /api/auth/verify-reset-code` | Role-independent OTP and expiry validation. |
| Save new password | `POST /api/auth/reset-password` | Role-independent OTP validation, password update, and OTP consumption. |
| Verify email / resend | `POST /api/auth/verify-email`, `POST /api/auth/resend-email-otp` | Role-independent email verification operations; invitation activation normally already verifies email. |

Authentication uses `VITE_API_BASE_URL`, defaulting to `http://localhost:3000`, consistent with the existing role sessions. Invitation requests retain the existing `VITE_API_URL` fallback.

Patient bearer tokens use a separate `medtrailPatientSession` key in sessionStorage, following the existing Doctor and Pharmacist session pattern. Passwords, OTPs, profiles, and invitation tokens are not persisted in browser storage. Protected content waits for a matching, verified Patient profile from the server. Logout, expiry, rejected profiles, and abandoned login requests cannot grant access.

The existing Doctor/Pharmacist forms and styling are reused. Patient-only CSS hides the large illustration below 1024px, gives the form the full viewport, and allows scrolling on short screens without changing the other roles' dedicated layouts. The shared invitation entry screen applies these mobile overrides only when its validated role or presentation-only URL hint is Patient. Other roles and unknown-role links retain the original illustration and panel styling. Role hints never authorize registration.

## Admin invitation testing

The existing Admin Users > Add new user form now permits Patient invitations.
It posts to `/api/admin/invite-user` with the existing Admin bearer session:
`name` (trimmed), `email` (lowercase), `phone` (existing +234 format),
`role: "patient"`, `gender: "Male" | "Female"`, and numeric whole-year `age`.
Age zero is valid; blank, fractional and unsafe integer ages are blocked.
No hospital is fabricated: the existing backend resolves it from the Admin account
when no hospitalName is supplied. Doctor/Pharmacist payloads remain unchanged and
do not contain age or gender. Editing remains unsupported by the current API.

In Vite development mode only, successful Patient invitations with the confirmed
`invitationToken` and Patient user role in the response expose an **Open Patient
registration** link. It uses `window.location.origin`, not a fixed port or the
backend-supplied frontend URL, and opens the existing `/accept-invite` flow in a
new tab. The server still validates the token and role before password creation.
The link is held only in component memory and discarded when the dialog closes;
it is never stored in localStorage or sessionStorage. API errors show no test link.
This does not change the destination of emailed invitations or claim email delivery.

Frontend API requests use VITE_API_BASE_URL (existing fallback localhost:3000).
Both local frontend ports can be in use: confirm the correct Patient worktree in
the browser. Backend-generated emails and the backend browser invitation entry
use FRONTEND_URL. The running backend previously redirected to localhost:5173,
while this Patient worktree runs at localhost:5174. No port was hardcoded or
configuration changed by this frontend update. The backend engineer must confirm
FRONTEND_URL points to a frontend deployment containing these Patient routes
before testing the emailed-link flow. The development-only current-origin link
can test activation separately without changing backend settings.

For real testing, explicitly authorize creating a development invitation, use an
approved unused test inbox, submit the Patient form, and open the testing link or
correctly configured email link. Set a password, verify profile-gated dashboard
access, logout, log in again, and confirm the invitation cannot be reused. These
operations create/update development records and send mail. Automated tests mock
all such requests and never create real accounts or send invitation emails.

## Remaining live integration checks

The user has confirmed successful Patient invitation, password creation, login,
logout and dashboard access against the development backend. Automated frontend
tests separately verify these flows with isolated API fixtures.

The backend-generated invitation email URL still needs correction: it previously
targeted the other frontend on port 5173. The current-origin development testing
link does not resolve the emailed-link configuration issue. The complete email
journey must be checked after the backend engineer corrects FRONTEND_URL.

No missing authentication endpoint was found for this scope. The backend mail
service catches SMTP errors without returning delivery failure to the caller;
the frontend cannot confirm email delivery from a successful reset request.
Patient recovery therefore uses conditional account-existence wording and only
advances after the API accepts each request. The responsive dashboard UI, search,
sorting, pagination and logout modal are implemented. Patient prescription and
diagnosis API integration remains pending; the protected dashboard makes no
unconfirmed clinical API requests. See PATIENT_DASHBOARD.md for the data boundary
and local preview routes.

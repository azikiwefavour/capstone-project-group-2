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

The `/pharmacist/dashboard` placeholder renders only after `/api/auth/profile`
confirms a matching, verified Pharmacist identity. Pharmacist tokens use a
separate tab-scoped session storage key; logout and expiry remove that session.
The placeholder contains no patient or prescription data.

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

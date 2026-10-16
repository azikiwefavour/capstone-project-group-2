# 🩺 MedTrail API – Endpoints & Frontend Integration Guide

> **Base URL:** `http://localhost:3000/api`  
> **Interactive Swagger UI:** `http://localhost:3000/api/docs`  
> **Auth Scheme:** Bearer JWT token (`Authorization: Bearer <accessToken>`)

---

## 📌 Table of Contents
1. [Overview of the User Invitation & Onboarding Flow](#1-overview-of-the-user-invitation--onboarding-flow)
2. [Admin Endpoints (`/api/admin`)](#2-admin-endpoints-apiadmin)
   - [POST `/api/admin/invite-user`](#post-apiadmininvite-user)
   - [GET `/api/admin/invited-users`](#get-apiadmininvited-users)
   - [POST `/api/admin/resend-invitation/:id`](#post-apiadminresend-invitationid)
   - [GET `/api/admin/dashboard`](#get-apiadmindashboard)
   - [GET `/api/admin/users`](#get-apiadminusers)
   - [DELETE `/api/admin/users/:id`](#delete-apiadminusersid)
3. [Authentication & Registration Endpoints (`/api/auth`)](#3-authentication--registration-endpoints-apiauth)
   - [GET `/api/auth/accept-invite`](#get-apiauthaccept-invite)
   - [GET `/api/auth/validate-invitation`](#get-apiauthvalidate-invitation)
   - [POST `/api/auth/complete-registration`](#post-apiauthcomplete-registration)
   - [POST `/api/auth/login`](#post-apiauthlogin)
   - [POST `/api/auth/register`](#post-apiauthregister)
   - [POST `/api/auth/verify-email`](#post-apiauthverify-email)
   - [POST `/api/auth/resend-email-otp`](#post-apiauthresend-email-otp)
   - [POST `/api/auth/forgot-password`](#post-apiauthforgot-password)
   - [POST `/api/auth/verify-reset-code`](#post-apiauthverify-reset-code)
   - [POST `/api/auth/reset-password`](#post-apiauthreset-password)
4. [Frontend Wiring Checklist (What Needs to Be Connected)](#4-frontend-wiring-checklist)

---

## 1. Overview of the User Invitation & Onboarding Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant FE as Frontend Dashboard
    participant BE as Backend API
    participant Mail as Gmail SMTP
    actor Doctor as Doctor / Pharmacist

    Admin->>FE: Fill "Add new user" (Name, Email, Role)
    FE->>BE: POST /api/admin/invite-user (Bearer Token)
    BE->>BE: Create user record (invitationStatus: "pending")
    BE->>Mail: Send branded invitation email with link
    Mail-->>Doctor: Receive email with "Complete Registration" button
    Doctor->>BE: Clicks link (GET /api/auth/accept-invite?token=...)
    BE-->>Doctor: Render "Welcome Dr. [Name] / Create your password" UI
    Doctor->>BE: POST /api/auth/complete-registration (Password + ConfirmPassword)
    BE->>BE: Hash password, mark isEmailVerified: true, status: "accepted"
    BE-->>Doctor: Return JWT accessToken + Welcome confirmation
    Doctor->>FE: Next time: Select Role ("Doctor") + Login (POST /api/auth/login)
    FE->>BE: Check role & credentials
    BE-->>FE: Authenticated! Enter Doctor Dashboard
```

---

## 2. Admin Endpoints (`/api/admin`)

> [!IMPORTANT]
> All admin endpoints require a valid JWT token with `role: "admin"` in the header:  
> `Authorization: Bearer <admin_access_token>`

### `POST /api/admin/invite-user`
Invites a new doctor or pharmacist. Creates a pending account and sends the invitation email.

- **URL:** `/api/admin/invite-user`
- **Method:** `POST`
- **Auth Required:** Yes (`Bearer <token>`, role: `admin`)
- **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <accessToken>
  ```
- **Request Body:**
  ```json
  {
    "name": "Dr. Adewale Okafor",
    "email": "adewale@hospital.com",
    "role": "doctor",
    "hospitalName": "Lagos University Teaching Hospital",
    "phone": "+2348012345678"
  }
  ```
  *(Note: `role` must be `"doctor"` or `"pharmacist"`. Uppercase e.g. `"Doctor"` is automatically normalized).*
- **Success Response (`201 Created`):**
  ```json
  {
    "message": "Invitation sent successfully to adewale@hospital.com. The account is pending activation.",
    "invitationToken": "e4b2d56a-7f12-4c89-a032-11bfae9124cc",
    "invitationLink": "http://localhost:3000/api/auth/accept-invite?token=e4b2d56a-7f12-4c89-a032-11bfae9124cc",
    "browserInviteUrl": "http://localhost:3000/api/auth/accept-invite?token=e4b2d56a-7f12-4c89-a032-11bfae9124cc",
    "frontendInviteUrl": "http://localhost:5173/accept-invite?token=e4b2d56a-7f12-4c89-a032-11bfae9124cc",
    "user": {
      "id": "c1f7b7e3-0d34-4b55-a50e-5bb55387d8df",
      "name": "Dr. Adewale Okafor",
      "email": "adewale@hospital.com",
      "role": "doctor",
      "invitationStatus": "pending"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation error (invalid email format, invalid phone, missing name).
  - `401 Unauthorized`: Missing or invalid JWT token.
  - `403 Forbidden`: User is not an admin.
  - `409 Conflict`: An account with this email already exists.

---

### `GET /api/admin/invited-users`
Lists all invited users, filtered by their invitation status (`pending` or `accepted`).

- **URL:** `/api/admin/invited-users`
- **Method:** `GET`
- **Auth Required:** Yes (`admin`)
- **Success Response (`200 OK`):**
  ```json
  [
    {
      "id": "c1f7b7e3-0d34-4b55-a50e-5bb55387d8df",
      "name": "Dr. Adewale Okafor",
      "email": "adewale@hospital.com",
      "role": "doctor",
      "invitedRole": "doctor",
      "hospitalName": "Lagos University Teaching Hospital",
      "phone": "+2348012345678",
      "invitationStatus": "pending",
      "invitationTokenExpiry": "2026-10-18T01:30:00.000Z",
      "isEmailVerified": false,
      "invitedBy": "Samuel (e6690dc8-2778-4632-b7e4-2af79ae5531c)",
      "createdAt": "2026-10-16T01:30:00.000Z"
    }
  ]
  ```

---

### `POST /api/admin/resend-invitation/:id`
Regenerates an invitation token (valid for 48 hours) and resends the email to a pending doctor/pharmacist.

- **URL:** `/api/admin/resend-invitation/:id`
- **Method:** `POST`
- **Param:** `:id` (UUID of the user)
- **Auth Required:** Yes (`admin`)
- **Success Response (`200 OK`):**
  ```json
  {
    "message": "Invitation resent to adewale@hospital.com successfully.",
    "invitationToken": "d3c1a2f4-...",
    "browserInviteUrl": "http://localhost:3000/api/auth/accept-invite?token=d3c1a2f4-..."
  }
  ```
- **Error Responses:**
  - `404 Not Found`: User does not exist.
  - `409 Conflict`: User has already accepted and completed their registration.

---

### `GET /api/admin/dashboard`
Returns live statistical metrics for the admin overview dashboard cards.

- **URL:** `/api/admin/dashboard`
- **Method:** `GET`
- **Auth Required:** Yes (`admin`)
- **Success Response (`200 OK`):**
  ```json
  {
    "totalUsers": 24,
    "doctorsCount": 8,
    "pharmacistsCount": 5,
    "patientsCount": 10,
    "adminsCount": 1,
    "pendingInvitations": 3,
    "acceptedInvitations": 10
  }
  ```

---

### `GET /api/admin/users`
Returns all users in the system (Doctors, Pharmacists, Patients, Admins).

- **URL:** `/api/admin/users`
- **Method:** `GET`
- **Auth Required:** Yes (`admin`)
- **Success Response (`200 OK`):** Array of all user objects.

---

### `DELETE /api/admin/users/:id`
Deletes a user account from the system.

- **URL:** `/api/admin/users/:id`
- **Method:** `DELETE`
- **Param:** `:id` (UUID of the user)
- **Auth Required:** Yes (`admin`)
- **Success Response (`200 OK`):**
  ```json
  {
    "message": "User deleted successfully"
  }
  ```

---

## 3. Authentication & Registration Endpoints (`/api/auth`)

### `GET /api/auth/accept-invite`
Dual-mode endpoint:
- **In Chrome (Accept: `text/html`):** Renders the full interactive **"Welcome Dr. [Name]"** screen where the user enters and confirms their password.
- **In JSON API Client (Accept: `application/json`):** Returns the user's name and role for programmatic frontend rendering.

- **URL:** `/api/auth/accept-invite?token=<token>`
- **Method:** `GET`
- **Auth Required:** Public (None)
- **Query Param:** `token` (UUID)
- **JSON Response (`200 OK`):**
  ```json
  {
    "valid": true,
    "name": "Dr. Adewale Okafor",
    "email": "adewale@hospital.com",
    "role": "doctor"
  }
  ```

---

### `GET /api/auth/validate-invitation`
JSON-only validation endpoint (alias for `accept-invite`).

- **URL:** `/api/auth/validate-invitation?token=<token>`
- **Method:** `GET`
- **Auth Required:** Public (None)

---

### `POST /api/auth/complete-registration`
Called when the invited user sets their password. Activates the account, hashes the password, marks email as verified, invalidates the token, and returns a JWT `accessToken`.

- **URL:** `/api/auth/complete-registration`
- **Method:** `POST`
- **Auth Required:** Public (None)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "token": "e4b2d56a-7f12-4c89-a032-11bfae9124cc",
    "password": "Password@123",
    "confirmPassword": "Password@123"
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "message": "Registration complete! Welcome to MedTrail.",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": "c1f7b7e3-0d34-4b55-a50e-5bb55387d8df",
      "name": "Dr. Adewale Okafor",
      "email": "adewale@hospital.com",
      "role": "doctor",
      "hospitalName": "Lagos University Teaching Hospital",
      "phone": "+2348012345678"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Passwords do not match. Please try again."
  - `400 Bad Request`: "This invitation link has expired. Please ask your administrator to send a new one."
  - `400 Bad Request`: "Registration already completed. Please log in with your credentials."

---

### `POST /api/auth/login`
Role-aware login. Verifies email, password, and enforces that the user logs in under their registered role.

- **URL:** `/api/auth/login`
- **Method:** `POST`
- **Auth Required:** Public (None)
- **Request Body:**
  ```json
  {
    "email": "adewale@hospital.com",
    "password": "Password@123",
    "role": "doctor"
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "message": "Login successful",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": "c1f7b7e3-0d34-4b55-a50e-5bb55387d8df",
      "name": "Dr. Adewale Okafor",
      "email": "adewale@hospital.com",
      "role": "doctor",
      "hospitalName": "Lagos University Teaching Hospital",
      "phone": "+2348012345678"
    }
  }
  ```
- **Role Enforcement Protection:**
  - If Dr. Adewale selects `pharmacist` or `patient`, the backend blocks with:
    > `401 Unauthorized: "Your account is registered as a doctor. Please select the doctor role to log in."`
  - If an invited doctor has not set their password yet:
    > `401 Unauthorized: "Please complete your registration first by clicking the invitation link sent to your email."`

---

### `POST /api/auth/register`
Self-service registration for general accounts.

- **URL:** `/api/auth/register`
- **Request Body:** `{ "name": "...", "email": "...", "password": "...", "role": "patient" }`
- **Success Response (`201 Created`):** Sends 6-digit OTP to the email.

---

### `POST /api/auth/verify-email`
Verifies the 6-digit email OTP.

- **URL:** `/api/auth/verify-email`
- **Request Body:** `{ "email": "...", "otp": "123456" }`
- **Success Response (`200 OK`):** `{ "message": "Email verified successfully. You can now log in." }`

---

### `POST /api/auth/forgot-password`
Requests a 6-digit password reset OTP.

- **URL:** `/api/auth/forgot-password`
- **Request Body:** `{ "email": "..." }`
- **Success Response (`200 OK`):** `{ "message": "If an account exists with this email, a reset code has been sent." }`

---

### `POST /api/auth/verify-reset-code`
Validates that the reset OTP is correct and unexpired.

- **URL:** `/api/auth/verify-reset-code`
- **Request Body:** `{ "email": "...", "otp": "123456" }`

---

### `POST /api/auth/reset-password`
Sets the new password using the verified OTP.

- **URL:** `/api/auth/reset-password`
- **Request Body:** `{ "email": "...", "otp": "123456", "newPassword": "NewPassword@123" }`

---

## 4. Frontend Wiring Checklist

When you are ready to connect the frontend to the backend, here is the exact mapping needed:

| Frontend Component | Action Needed | Backend Endpoint to Connect |
|---|---|---|
| [`AddUserModal.jsx`](file:///c:/Users/Sam/Desktop/capstone%201/capstone-project-group-2/client/src/admin/components/AddUserModal.jsx) | Replace local `newDemoUser` object submission with `fetch('/api/admin/invite-user')` | `POST /api/admin/invite-user` |
| [`AdminUsers.jsx`](file:///c:/Users/Sam/Desktop/capstone%201/capstone-project-group-2/client/src/admin/pages/AdminUsers.jsx) | Fetch live users on load instead of `demoUsers` state | `GET /api/admin/invited-users` and `GET /api/admin/users` |
| [`AdminUsers.jsx`](file:///c:/Users/Sam/Desktop/capstone%201/capstone-project-group-2/client/src/admin/pages/AdminUsers.jsx) | "Resend invitation" button | `POST /api/admin/resend-invitation/:id` |
| [`AdminUsers.jsx`](file:///c:/Users/Sam/Desktop/capstone%201/capstone-project-group-2/client/src/admin/pages/AdminUsers.jsx) | "Delete user" button | `DELETE /api/admin/users/:id` |
| [`AdminDashboard.jsx`](file:///c:/Users/Sam/Desktop/capstone%201/capstone-project-group-2/client/src/admin/pages/AdminDashboard.jsx) | Connect metrics cards to live counts | `GET /api/admin/dashboard` |
| New Route: `/accept-invite` in [`App.jsx`](file:///c:/Users/Sam/Desktop/capstone%201/capstone-project-group-2/client/src/App.jsx) | If you want the frontend to host the invite page instead of backend HTML | `GET /api/auth/validate-invitation` & `POST /api/auth/complete-registration` |

---

### Example: Frontend Code Snippet for `AddUserModal.jsx`

```javascript
// Example helper for connecting AddUserModal to the backend:
async function handleInviteUser(userData) {
  const token = getAccessToken(); // from auth session
  
  const response = await fetch('http://localhost:3000/api/admin/invite-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: userData.name,
      email: userData.email,
      role: userData.role.toLowerCase(), // 'doctor' or 'pharmacist'
      phone: userData.phone,
      hospitalName: userData.hospitalName
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to invite user');
  }
  return data;
}
```

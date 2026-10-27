# 🛡️ MedTrail – System Architecture, Scaling & Security Guide

**Date:** October 25, 2026  
**Scope:** Backend (`MedTrail-Api`) – Core Performance, Security, Multi-Hospital Scalability, and Super Admin Telemetry.

---

## 📋 Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Real-World High-Traffic Blueprint (Horizontal Auto-Scaling)](#2-real-world-high-traffic-blueprint)
3. [Server Strength Indicator & Hardware Telemetry](#3-server-strength-indicator--hardware-telemetry)
4. [Distributed Caching Layer (Dual-Mode Redis + Memory)](#4-distributed-caching-layer)
5. [Anti-Hacker Rate Limiting & DDoS Shield](#5-anti-hacker-rate-limiting--ddos-shield)
6. [Super Admin Module & Endpoints](#6-super-admin-module--endpoints)
7. [PostHog Product Analytics & Feature Flags](#7-posthog-product-analytics--feature-flags)
8. [Hosting & Deployment Analysis (Render vs. Supabase vs. Railway)](#8-hosting--deployment-analysis)
9. [Complete Environment Configuration (.env)](#9-complete-environment-configuration)

---

## 1. Executive Summary

Tonight's engineering session focused on preparing **MedTrail** for high-volume, multi-hospital production use without crashes, lag, or security vulnerabilities:

1. **Horizontal Scaling Readiness**: Decoupled in-memory dependencies and prepared the API for multi-server auto-scaling behind an Application Load Balancer.
2. **Server Strength Indicator**: Implemented a live diagnostic engine that measures CPU load, RAM pressure, PostgreSQL query round-trip latency, and Event Loop responsiveness to compute a real-time **0–100% Strength Score**.
3. **Distributed Redis Architecture**: Built a resilient `RedisService` supporting distributed caching, zero-sleep multi-instance sync, and async workers with seamless in-memory local fallback.
4. **Anti-Hacker Rate Limiting Shield**: Deployed `@nestjs/throttler` with a 3-tier global throttle and strict, targeted limits on brute-force attack vectors (logins, registrations, and OTP requests).
5. **Super Admin Module**: Created `src/super-admin/` with multi-hospital platform analytics, server diagnostics, and `SUPER_ADMIN` role integration.
6. **Privacy-Safe Healthcare Analytics**: Integrated a non-blocking `PosthogService` for product analytics and hospital-specific feature flags adhering to HIPAA/GDPR standards.

---

## 2. Real-World High-Traffic Blueprint

### How to Prevent Server Overload with Multiple Hospitals
When hundreds of doctors, nurses, and patients access MedTrail simultaneously:

```
                            [ Hospitals & Clients ]
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │    LOAD BALANCER    │ (Nginx / AWS ALB / Cloudflare)
                           │   Traffic Router    │
                           └──────────┬──────────┘
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
      ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
      │  Server #1    │       │  Server #2    │       │  Server #3    │
      │ (Primary API) │       │ (Auto-spawned)│       │ (Auto-spawned)│
      └───────┬───────┘       └───────┬───────┘       └───────┬───────┘
              │                       │                       │
              └───────────────────────┼───────────────────────┘
                                      ▼
                       ┌─────────────────────────────┐
                       │     SHARED REDIS CACHE      │
                       │  (Distributed State & TTL)  │
                       └──────────────┬──────────────┘
                                      ▼
                       ┌─────────────────────────────┐
                       │    POSTGRESQL DATABASE      │
                       │ (PgBouncer Connection Pool) │
                       └─────────────────────────────┘
```

1. **Auto-Scale Trigger**: When CPU or RAM hits 70%, the cloud platform automatically spins up Server #2 and Server #3.
2. **Stateless Operations**: Because servers do not store session state in RAM, any server instance can handle any hospital's request interchangeably.
3. **Load Balancer Health Ping**: The `/api/super-admin/health-check` endpoint lets the load balancer route traffic only to healthy instances.

---

## 3. Server Strength Indicator & Hardware Telemetry

Located in [`src/super-admin/super-admin.service.ts`](file:///e:/capstone-project-group-2/MedTrail-Api/src/super-admin/super-admin.service.ts).

### Live Telemetry Factors & Scoring Algorithm
The score starts at **100** and dynamically adjusts based on 5 live telemetry probes:

1. **RAM Pressure (up to 30 pt deduction)**:
   - Evaluates system memory (`os.totalmem()` vs `os.freemem()`) and Node process memory (`heapUsed`, `rss`).
   - > 90% used: -30 pts | > 80% used: -15 pts | > 70% used: -5 pts
2. **CPU Utilization (up to 25 pt deduction)**:
   - Tracks active cores and normalized system load average.
   - > 90% load: -25 pts | > 75% load: -15 pts | > 50% load: -5 pts
3. **Database Round-Trip Latency (up to 35 pt deduction)**:
   - Executes real-time `SELECT 1` on PostgreSQL and records milliseconds.
   - `< 20ms`: Ultra Fast (0 deduction)
   - `20ms – 80ms`: Normal (0 deduction)
   - `> 100ms`: -10 pts
   - `> 300ms`: -25 pts
   - Disconnected / Timeout: -35 pts
4. **Event Loop Lag (up to 15 pt deduction)**:
   - Measures Node.js single-thread execution delay.
   - `> 50ms`: -15 pts | `> 25ms`: -7 pts
5. **Cache Health**:
   - Pings Redis (if configured) or in-memory cache to verify sub-millisecond retrieval.

### Status Tiers
- 🟢 **OPTIMAL (85–100%)**: Peak efficiency, ample CPU/RAM headroom.
- 🟡 **STABLE (70–84%)**: Normal operating conditions under hospital workload.
- 🟠 **DEGRADED (50–69%)**: Moderate stress. Cloud auto-scaler should prepare extra replica.
- 🔴 **CRITICAL (< 50%)**: Server near resource limits. Risk of timeouts.

---

## 4. Distributed Caching Layer

Located in [`src/cache/`](file:///e:/capstone-project-group-2/MedTrail-Api/src/cache/).

### Architecture:
- Built [`redis.service.ts`](file:///e:/capstone-project-group-2/MedTrail-Api/src/cache/redis.service.ts) using `ioredis`.
- **Zero-Config Dual Mode**:
  - When `REDIS_URL` is empty: uses in-memory `@nestjs/cache-manager` (5 min default TTL, 500 items max).
  - When `REDIS_URL` is supplied: seamlessly connects to shared Redis with exponential backoff retries.
- Integrated into `AppCacheModule` as a globally exported provider.

---

## 5. Anti-Hacker Rate Limiting & DDoS Shield

Configured in [`src/app.module.ts`](file:///e:/capstone-project-group-2/MedTrail-Api/src/app.module.ts#L68) and [`src/auth/auth.controller.ts`](file:///e:/capstone-project-group-2/MedTrail-Api/src/auth/auth.controller.ts) using `@nestjs/throttler`.

### 1. Global Multi-Tier Shield
- **Short Tier**: Max 15 req/sec (blocks rapid-fire scripts and volumetric bursts).
- **Medium Tier**: Max 50 req/10sec (catches scrapers and aggressive bots).
- **Long Tier**: Max 120 req/minute (prevents resource starvation attacks).

### 2. High-Risk Route Locks
- `POST /api/auth/login`: Strict limit of **5 attempts per minute** (and max 2/sec). Halts brute-force password cracking and credential stuffing.
- `POST /api/auth/register`: Max **5 registrations per minute per IP**. Prevents automated account creation spam.
- `POST /api/auth/forgot-password`, `resend-email-otp`, `resend-reset-code`: Max **3 requests per minute**. Prevents OTP SMS/email flooding.

### 3. Attack Response
Offending IP addresses immediately receive **HTTP 429 Too Many Requests**:
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## 6. Super Admin Module & Endpoints

Module: [`src/super-admin/`](file:///e:/capstone-project-group-2/MedTrail-Api/src/super-admin/)

| Endpoint | Method | Auth Guard | Role Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/super-admin/server-strength` | `GET` | `JwtAuthGuard` | `SUPER_ADMIN`, `ADMIN` | Returns live 0–100 score, CPU, RAM, and DB latency. |
| `/api/super-admin/overview` | `GET` | `JwtAuthGuard` | `SUPER_ADMIN`, `ADMIN` | Multi-hospital platform stats (users, roles, hospital list). |
| `/api/super-admin/health-check` | `GET` | Public (`@SkipThrottle`) | None | Lightweight ping for AWS/Render/Railway load balancers. |

---

## 7. PostHog Product Analytics & Feature Flags

Service: [`src/super-admin/posthog.service.ts`](file:///e:/capstone-project-group-2/MedTrail-Api/src/super-admin/posthog.service.ts)

- **What it does**: Product analytics, feature toggling per hospital, and session diagnostics.
- **Healthcare Compliance (HIPAA / GDPR)**:
  - **Rule**: Never pass patient names, phone numbers, or clinical notes to PostHog.
  - **Allowed**: Anonymous IDs, role names, and action events:
    ```typescript
    this.posthogService.captureEvent(user.id, 'prescription_created', {
      hospitalName: user.hospitalName,
      role: user.role,
    });
    ```
- **Safe Mode**: If no `POSTHOG_API_KEY` is set in `.env`, the service operates safely in mock mode without throwing errors.

---

## 8. Hosting & Deployment Analysis

### Render vs. Supabase vs. Railway

| Criteria | Render | Supabase | Railway (Recommended) |
| :--- | :--- | :--- | :--- |
| **Role** | Node.js Server Host | Database & File Storage | Node.js Server Host |
| **Can run MedTrail NestJS?** | **Yes** | **No** (Database only) | **Yes** |
| **Free Tier Behavior** | Sleeps after 15m (50s cold start lag) | Active DB | Active |
| **Paid Tier ($5–$7/mo)** | Zero sleep on Starter plan | Free tier generous | Pay-as-you-go, fast deploys |
| **1-Click Redis** | Available on paid | N/A | 1-Click instant Redis |

**Recommended Production Architecture**:
- **Compute (Backend)**: Railway or Render Paid (no sleep).
- **Database & File Storage**: Supabase (PostgreSQL with PgBouncer connection pooling + encrypted medical file storage).
- **Caching & Queues**: Upstash Redis or Railway Redis.

---

## 9. Complete Environment Configuration

Updated in [`.env`](file:///e:/capstone-project-group-2/MedTrail-Api/.env) and documented in [`.env.example`](file:///e:/capstone-project-group-2/MedTrail-Api/.env.example):

```env
# Application
PORT=3000
NODE_ENV=development

# JWT Authentication
JWT_SECRET=medtrail_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d

# Database (PostgreSQL with TypeORM)
DATABASE_URL=postgresql://username:password@host/neondb?sslmode=require
DB_SSL=true

# Mailer (Nodemailer SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM="MedTrail <no-reply@medtrail.com>"

# OTP Expiry
OTP_EXPIRY_MINUTES=10

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Redis Distributed Cache (Leave empty for in-memory)
REDIS_URL=
CACHE_TTL=300
CACHE_MAX=500

# PostHog Analytics (Optional)
POSTHOG_API_KEY=
POSTHOG_HOST=https://us.i.posthog.com

# Anti-Hacker Rate Limiting (Optional Overrides)
THROTTLE_SHORT_LIMIT=15
THROTTLE_MEDIUM_LIMIT=50
THROTTLE_LONG_LIMIT=120
```

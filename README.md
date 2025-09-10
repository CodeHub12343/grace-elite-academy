# School Management Backend System

Node.js + Express backend for a full-featured School Management System: Auth/RBAC, Students/Teachers/Classes/Subjects, Attendance, Assignments (S3 presigned uploads), Files/Media, Grades & Reviews, CBT (exams + auto-grading), Payments (Paystack) with invoices/fees and split payments + late fees, Notifications (email/SMS/in-app), and Reports/Analytics.

## Tech Stack
- Runtime: Node.js 20+
- Framework: Express 5
- DB: MongoDB (Mongoose ODM)
- Auth: JWT access + refresh (httpOnly cookie), RBAC
- Validation: Joi
- File Storage: AWS S3 (presigned URLs)
- Realtime: Socket.IO
- Queue (optional): BullMQ + Redis
- Payments: Paystack (axios)
- Email/SMS: Nodemailer, Twilio
- Analytics: MongoDB aggregation endpoints

## Project Structure
```
config/           # env + DB
controllers/      # route handlers
middleware/       # error handling, auth, roles
models/           # Mongoose schemas
routes/           # API routers (mounted under /api)
scripts/          # seed utilities (attendance/CBT)
utils/            # helpers (jwt, s3, mailer, sockets, notifier, queue, validate)
server.js         # app entry
```

## Features
- Authentication & RBAC
  - Register/Login/Logout/Refresh
  - Roles: admin, teacher, student, parent
  - Profile get/update
- Core Entities
  - Users, Students, Teachers, Classes, Subjects (CRUD, pagination/search/sort)
- Attendance
  - Bulk mark by class (+subject optional)
  - Class/student views, summary and report endpoints
- Assignments & Files
  - Assignments with due dates and grading
  - Presigned S3 upload (PUT), confirm, download (GET presigned), delete
- Grades & Teacher Reviews
  - Grade creation, auto percentage/letter, queries
  - Student reviews for teachers + analytics
- CBT (Computer-Based Testing)
  - Exams + questions (MCQ/True-False/Short Answer)
  - Randomized student fetch, time window checks
  - Auto-grading and result analytics
- Payments & Fees
  - v1: Categories/Invoices/Payments (init/verify/webhook)
  - v2: Split/partial payments with dynamic late fee; Transactions; Webhook reconciliation
- Notifications
  - Model + endpoints; email/SMS utility; Socket.IO bootstrap
  - Hooks for payment success and grade posted
  - Optional BullMQ + Redis queue for delivery with retry/backoff
- Reports & Analytics
  - Student, Class, Finance, Exam, Attendance summaries

## Requirements
- Node.js 20+
- MongoDB (Atlas or local)
- AWS S3 bucket (for file uploads)
- Paystack account (secret key)
- SMTP (for email), Twilio (for SMS) – optional
- Redis (optional; required for queued notifications)

## Environment Variables
Create a `.env` in project root. See `.env.example` for a template. Important keys:

- Core
  - `NODE_ENV=development`
  - `PORT=5000`
  - `MONGO_URI=...`
- JWT
  - `JWT_ACCESS_SECRET=...`
  - `JWT_REFRESH_SECRET=...`
- CORS
  - `CORS_ORIGIN=http://localhost:3000` (frontend origin)
- AWS S3
  - `AWS_REGION=...`
  - `AWS_S3_BUCKET=...`
  - `AWS_ACCESS_KEY_ID=...`
  - `AWS_SECRET_ACCESS_KEY=...`
- Email
  - `SMTP_HOST=...`
  - `SMTP_PORT=587`
  - `SMTP_USER=...`
  - `SMTP_PASS=...`
  - `SMTP_FROM=no-reply@example.com`
- SMS
  - `TWILIO_SID=...`
  - `TWILIO_TOKEN=...`
  - `TWILIO_FROM=+1xxxxxxxxxx`
- Payments
  - `PAYSTACK_SECRET_KEY=...`
- Queue (optional)
  - `REDIS_URL=redis://localhost:6379`

## Installation & Run
```
npm install
npm run dev
```
Server runs at `http://localhost:5000`. Health: `GET /health` and `GET /api/health`.

## API Overview (high-level)
- Auth: `/api/auth/*` (register, login, logout, refresh-token, profile)
- Core: `/api/teachers`, `/api/students`, `/api/classes`, `/api/subjects`
- Attendance: `/api/attendance/mark`, `/api/attendance/class/:classId`, `/api/attendance/student/:studentId`, `/api/attendance/report`
- Assignments: `/api/assignments`, `/api/assignments/presign`, `/api/assignments/submit`, grading & listing
- Files: `/api/files/*` (upload-url, confirm, list, download, delete)
- Grades: `/api/grades/*`; Reviews: `/api/reviews/*`
- CBT: Exam mgmt `/api/exams*`, Student flow `/api/cbt/*`
- Payments v1: `/api/fees/*`, `/api/payments/*` (initiate, verify, webhook)
- Fees v2 (split/late fee): `/api/fees` (create), `/api/fees/student/:id`, `/api/payments/initiate`, `/api/payments/webhook`
- Notifications: `/api/notifications/*` (send, bulk, list, mark-read)
- Reports: `/api/reports/*` (student, class, finance, exams, attendance)

Most create/update endpoints use Joi validation and RBAC. See `routes/*.routes.js` for details.

## Security
- JWT access + refresh (refresh token in httpOnly cookie). Cookies are set with `secure` and `sameSite` hardened when `NODE_ENV=production`.
- CORS: restricted via `CORS_ORIGIN` and `credentials: true`.
- Basic sanitization, rate limiting, helmet. Add further hardening as needed.

## Payments
- Initialize: `/api/payments/initiate` (v2) or `/api/payments/initiate/:invoiceId` (v1)
- Verify: `/api/payments/verify/:reference`
- Webhook: `/api/payments/webhook` (includes SHA512 signature validation)
- v2 calculates dynamic late fees and supports partial amounts.

## Files & S3
- Get presigned PUT URL: `POST /api/files/upload-url` with `fileName`, `mimeType`, `category`, `relatedId` (optional), `isPublic`.
- Upload directly to S3 using the returned URL.
- Confirm: `PATCH /api/files/confirm/:fileKey`.
- Private download uses presigned GET URLs.

## Realtime (Socket.IO)
- Server is initialized; clients should connect with `userId` in auth/query.
- Emits:
  - `grade:new` to the student after grade creation
  - `payment:success` to the student on successful webhook
  - `exam:published` (broadcast placeholder)

## Background Jobs (optional)
- BullMQ + Redis worker for queued notifications with retry/backoff.
- Enable by setting `REDIS_URL`. Without it, app runs and notifications queueing is skipped.

## Reports & Analytics
- Student: grades + attendance + CBT submissions
- Class: subject averages, top performers, attendance breakdown
- Finance: total collected in range, outstanding balance
- Exams: attempts, average, pass/fail
- Attendance summary: class/date range

## Scripts
- Seed attendance demo: `node scripts/seed_attendance.js`
- Seed CBT demo: `node scripts/seed_cbt.js`

## Testing (recommended)
- Add Jest + Supertest; start with `/health`, auth flows, and a couple of entity CRUDs.
- Add CI (GitHub Actions) to run tests on PRs.

## Deployment Notes
- Set all required env variables.
- Use process manager (PM2) or containerize.
- Restrict CORS origins to your frontend.
- Configure HTTPS and secure cookies in production.
- Attach logging (Pino/Winston) and error tracking (Sentry) for observability.

## Roadmap / Nice-to-Haves
- Comprehensive Joi validation on all update endpoints
- Socket.IO: per-class broadcasts, presence, heartbeats
- Pino logger + request ID middleware; Sentry
- Redis caching for heavy reports; rate limit exports
- Swagger/OpenAPI docs; Postman collection
- More robust webhook idempotency store
- Tests + coverage; staging pipeline

---

MIT License. Contributions welcome.


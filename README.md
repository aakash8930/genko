# Sora

A learning platform starting with Japanese and designed to expand to other subjects.

## Technology today

- **Frontend:** Vite, HTML, CSS and JavaScript. The existing learning experience remains framework-free while Vite provides a modern development and build pipeline.
- **Backend:** Node.js and Express. The API provides public configuration, a health endpoint and a published-lesson endpoint. Supabase Auth runs in the browser.
- **Database and authentication:** Supabase Postgres and Supabase Auth. The initial row-level-security-protected schema and Japanese seed content have been applied to the Sora project. The browser reads published lessons using a public publishable key and database row-level security. If the service is unavailable, the app uses its built-in introductory lessons, says so and offers a retry. The backend also exposes a lesson endpoint for environments with Supabase network access. The health endpoint checks configuration, not reachability.
- **Progress:** guest progress stays in local browser storage. Signed-in progress syncs through Supabase when reachable, with a separate per-account local cache and an explicit guest import option. Sync and authentication need end-to-end verification against the deployed project.

## Run locally

Requires Node.js 20 or newer.

```sh
npm install
cp .env.example .env
npm run dev
```

Open the Vite URL printed in the terminal. The frontend uses relative `/api` requests; Vite proxies them to Express. The app works without Supabase configuration for now. If using Supabase later, add the project URL and its **publishable** (or legacy anon) key to `.env`; never use a secret or service-role key. Do not commit `.env`.

Run `npm test` and `npm run build` to verify. For a production build, run `npm run build` then `NODE_ENV=production npm start`.

## Ordered roadmap

1. **Foundation (current):** establish the build pipeline, API, initial schema and tests; preserve the existing prototype.
2. **Connect Supabase:** the schema and initial content are in the Sora project. Browser-side public lesson loading avoids the preview backend’s restricted network. Verify live loading and database permissions, and confirm free-tier limits in the Supabase dashboard.
3. **Accounts (in progress):** email/password sign-up, sign-in and sign-out are implemented with Supabase Auth. Configure the Supabase email templates for code entry and test confirmation end to end. Password recovery is implemented but needs end-to-end email testing; additional account management is still to come. Supabase’s default email service is restricted and not suitable for production delivery.
4. **Real learning data:** verify database lesson loading, cross-device progress syncing and the explicit local-progress import end to end. Progress now uses stable lesson IDs; existing local three-lesson progress is migrated without removing its legacy backup. Two additional Japanese lessons have been added. Keep a clear guest experience.
5. **Learning experience:** expand Japanese content and accessibility testing, and collect feedback from learners. A basic review session is available for completed lessons; spaced repetition and persistent review history are not implemented.
6. **Broaden carefully:** add another language, then generalize content and exercises for other subjects based on what we learn.
7. **Launch readiness:** monitoring, backups, privacy and security review, automated end-to-end tests, deployment and usage/cost monitoring.

Each stage should be tested before moving to the next. This is an initial direction, not a claim that later features are already implemented.

## Authentication setup

The example environment file contains the Sora project URL and its public publishable key (not a secret). Copy it to `.env` for local development. Never use a service-role or secret key in the app.

Sora accepts email codes for both sign-up and password recovery, so email links need not open the protected Arena preview. Before testing, in Supabase **Authentication → Email Templates**, change **Confirm signup** and **Reset password** to include `{{ .Token }}` (the numeric code), and remove `{{ .ConfirmationURL }}` if you want code-only messages. Save each template. The existing templates send links and will not display a code until changed. Keep the existing token expiry and rate limits; the default mail service is limited to organization members and is not suitable for production.

Example confirmation body:

```html
<h2>Confirm your Sora account</h2>
<p>Enter this code in Sora to confirm your email: <strong>{{ .Token }}</strong></p>
<p>If you didn't request this, ignore this email.</p>
```

Example recovery body:

```html
<h2>Reset your Sora password</h2>
<p>Enter this code in Sora to reset your password: <strong>{{ .Token }}</strong></p>
<p>If you didn't request this, ignore this email.</p>
```

Codes are entered on the originating Sora page, so Site URL configuration is not required for these code flows. Configure the correct Site URL and redirect allowlist when deploying other redirect-based flows. Account sync uses a separate local cache for each user; guest progress is imported only on request.

## Confirmation and recovery test checklist

1. Configure both email templates as above and use a permitted test email.
2. Create an account; enter the code from the email in Sora and confirm sign-in. For an earlier unconfirmed account, use “Already have a confirmation code?” and request a new one. Check spam and respect email rate limits.
3. Sign out, request a password reset, enter the recovery code and choose a new password. Verify sign-in with the new password.
4. Complete a lesson, sign in on a second device, and confirm progress appears. Import guest progress explicitly and verify it belongs only to that account. Test with a second account and an offline connection.
5. Configure custom SMTP and a verified sender before public launch.

The automated auth tests use a mock Supabase client; real email delivery, confirmation, recovery and cross-device sync must still be verified end to end.

## Progress migration

Original three-lesson guest and account caches used indexes. On first use, Sora copies them to stable seeded lesson IDs under separate v2 keys, preserving the old keys as a backup. Existing server-side progress already references lesson UUIDs and is unchanged. Seeded IDs must never be reassigned. If course data is offline, the built-in three lessons remain available; additional published lessons require a connection.

## Review practice

Open the Japanese learning path and choose **Review what you learned** after completing at least one lesson. Review questions cover completed lessons available in the current path. The result counts first attempts; review sessions do not change completion progress or save scores.

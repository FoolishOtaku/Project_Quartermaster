# Project Quartermaster — Requirements (v0.5.1)

Scope and acceptance criteria for **Version 0.5.1 — Self-Service Registration &
User Management**, building on the v0.5.0 reports release. Implements the
user-onboarding part of Design.md §15.2.

## 1. Goal

Let new people request access themselves, and let the **main admin** (the
creator) approve them with a role and manage existing users' roles — all inside
Telegram. No more hand-editing the database to add a teammate.

## 2. Behaviour

### Applicant (any unregistered user)
- On `/start` (or `/register`, or the 📝 Register button) an unregistered user is
  guided through: **full name → NIM → confirm**.
- Submitting creates a **pending registration request** that **expires 2 minutes**
  after submission. If it lapses, the user simply sends `/register` again.
- The user is told the request was submitted and that the admin will review it.

### Main admin (the creator only)
- "Main admin" = the single account whose Telegram id equals `ADMIN_TELEGRAM_ID`
  (the seeded creator). Having the ADMIN *role* is **not** enough — only this one
  account can approve requests and change roles.
- Gets a 🛡 **Admin panel** entry in the menu (and the `/requests` command) showing
  pending requests. Tapping a request shows the applicant's details and a set of
  **role buttons**; choosing one creates/activates the user with that role.
- Can also **Manage users**: list users, pick one, change their role, or
  deactivate them.
- Is notified when a new request arrives; applicants are notified when approved,
  when their role changes, or when they are deactivated.
- The main-admin account is protected: it cannot be role-changed or deactivated
  through the panel.

## 3. Design notes

- Pending requests live in an **in-memory store** (`RegistrationStore`) with a
  2-minute lazy TTL — mirroring the existing in-memory conversation state
  (Design.md §20). Pending requests are intentionally lost on bot restart; the
  short window makes this acceptable and avoids a schema migration.
- Approved users are persisted via the existing `User` model (which already has
  `role` and `isActive`), so **no Prisma migration** was required.
- Callback-data namespaces: `qm|reg|*` (applicant) and `qm|adm|*` (main-admin
  panel), routed centrally alongside `qm|menu|*`.

## 4. Access control

| Action | Who |
| ------ | --- |
| `/register`, registration flow | anyone (the point is unregistered users) |
| `/requests`, 🛡 Admin panel, approve, change/deactivate roles | main admin only (`ADMIN_TELEGRAM_ID`) |

## 5. Acceptance criteria

1. An unregistered user can complete name → NIM → confirm and submit a request. ✅
2. A request expires exactly 2 minutes after submission (verified by unit test). ✅
3. Only the `ADMIN_TELEGRAM_ID` account can open the panel / approve / change
   roles; other users (including other ADMINs) are refused. ✅
4. Approving creates the user with the selected role (or reactivates an existing
   row) and notifies the applicant. ✅
5. The main admin cannot be demoted or deactivated via the panel. ✅
6. Existing slash commands and the role-aware menu are unchanged for registered
   users. ✅

## 6. Verification

- `npm run build` — clean.
- `npm test` — **10 suites / 72 tests** pass, including
  `registration.store.spec.ts` (TTL/expiry) and
  `registration-admin.service.spec.ts` (main-admin gate, approval, main-admin
  protection).

No migration is required for this release.

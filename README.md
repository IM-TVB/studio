# Angkor Hosting — Next.js frontend (migration in progress)

## What's here
- `app/login/` — TSX login page, ported 1:1 from `login.php`'s markup/states
  (invalid credentials, email not verified, account suspended).
- `app/home/` — TSX node-status dashboard, ported 1:1 from `home.php`,
  including the 15s visibility-aware polling loop.
- `app/components/AppShell.tsx` — shared sidebar/topnav layout ported from
  `sidebar_header.php` + `sidebar_footer.php`. Every protected page (home,
  and everything still to come) wraps its content in `<AppShell activeNav="...">`.
  Handles the auth-gate check (redirects to `/login` if not authenticated,
  or `/login?suspended=1` if suspended), role-based nav (admin vs user), the
  mobile hamburger menu, and logout.
  - NOT ported yet: the confirm-modal (`data-confirm` pattern for destructive
    actions). Deliberately deferred until the first page that actually needs
    it (likely `servers.php`), so it gets designed as a `useConfirm()` hook
    against a real call site instead of guessed at.
  - NOT ported: the four dead placeholder links (Contact/About/Terms/Privacy)
    that were `href="#"` no-ops in the PHP version — left out rather than
    reproducing inert links. Add them for real if/when those pages exist.
- `app/lib/api.ts` — typed client: `login()`, `getSession()`, `logout()`,
  `getNodeStatus()`.
- `app/globals.css` — design tokens ported from the PHP dashboard's
  `header.php`/`sidebar_header.php` `:root` block (now includes `--panel`).
  Keep these in sync by hand for now.
- `next.config.js` — the CORS/session decision from the migration plan:
  same-origin reverse proxy. `/api/*` is rewritten server-side to the PHP
  backend, so the browser never leaves this app's origin and the existing
  `HttpOnly` + `Secure` + `SameSite=Lax` session cookie needs no changes.

## PHP side (`php-api/api/`)
- `login.php` — JSON login endpoint, calls `attemptLogin()` unchanged.
- `session.php` — new. Returns `{ authenticated, role, is_super_admin,
  username }` (or `{ authenticated: false, suspended: true }`). Needed
  because, unlike the login response, a page reload has no client-side
  memory of auth state — `AppShell` calls this on every mount. Mirrors
  `requireLogin()`'s live suspension re-check but responds with JSON
  instead of redirecting.
- `logout.php` — new. POST-only JSON wrapper around `logout()`, since the
  PHP pages use a plain `<a href="logout">` GET link that a full-page nav
  handles naturally, but `fetch` needs a real endpoint.
- `api-node-status.php` — moved here from the PHP root (was
  `/api-node-status.php`, now `/api/api-node-status.php`) to fit the `api/`
  convention now that the proxy only forwards that prefix. One-line change
  inside: `require_once __DIR__ . '/../auth.php'` (was `/auth.php`).
- `api-server-status.php` — same move, same one-line fix, for the servers
  list's 12s status polling.
- `server-list.php` — new. Returns the scoped server list (own servers for
  regular users, everyone's for admins) plus the billing/limit header
  context and every server's live suspend-cooldown. Reuses
  `listServersWithLiveStatus()`, `getServerSuspendCooldownRemaining()`,
  `getServerDeleteCooldownRemaining()` unchanged.
- `server-form-options.php` — new. Returns everything the create-server
  form needs: server types, software presets, plans (from
  `plans-config.php`), Paper versions (`getPaperVersions()` — does its own
  live-fetch + caching, untouched), locations, and nodes with the same
  free/out-of-stock/maintenance/offline data the PHP `<option>` tags used to
  carry as `data-*` attributes.
- `server-action.php` — new. POST-only. `{ id, action: suspend|unsuspend|
  delete }`. This is servers.php's inline-action handler (lines ~42-111)
  verbatim in logic — ownership check, cooldown enforcement, activity
  logging, billing refund on delete. Nothing reimplemented, just reshaped.
- `server-create.php` — new. POST-only. This is servers.php's create-form
  handler (lines ~114-228) verbatim in logic — server limit check,
  validation, the server-side capacity re-check (not just disabled in the
  UI — matters since the UI can be bypassed with a direct POST), upfront
  billing charge, activity logging, billing-cycle record write.

  **Not run through a PHP linter/interpreter** — this sandbox couldn't
  install `php-cli` (package mirror 404s). Checked by hand and for
  brace/paren balance, but run `php -l` on each new file before deploying,
  just in case.
- `profile.php` (new file, same name as the old page — now under `api/`) —
  GET returns the current profile; POST updates username/email via
  `updateUserProfile()` unchanged. Mirrors the PHP page's super-admin
  redirect: super admin has no linked user record, so both verbs return
  `{ noProfile: true }` and the TSX page redirects to `/home` itself,
  matching the original's `header('Location: /home')`.
  - **Pre-existing quirk, ported as-is, not fixed:** the "please re-verify
    your email" success message depends on `$_SESSION['prev_email']`,
    which is read in `profile.php` but never written anywhere in the
    codebase — so that comparison is always false and the message never
    actually shows. Flagged in a code comment rather than silently
    changed, since that's a behavior decision, not a migration detail.
- `profile-password.php` — new. POST-only. Wraps `updateUserPassword()`
  unchanged (which itself verifies `current_password`).
- `profile-avatar.php` — new. POST-only, **multipart/form-data** (not
  JSON — it's a file upload). Same MIME whitelist (PNG/JPG/WEBP), same 2MB
  limit, same `is_uploaded_file()` defense-in-depth check, same
  write-new-then-update-DB-then-delete-old ordering as the original, so a
  failure partway through never leaves the account with no avatar at all.
- `redeem.php` (new file, same name as the old page — now under `api/`) —
  GET returns the credit balance; POST redeems a code via `redeemCode()`
  unchanged. Same super-admin `{ noProfile: true }` pattern as `profile.php`.
- `activity.php` (new file, same name as old page — now under `api/`) —
  GET only, returns the combined activity+transaction feed via
  `getUserCombinedActivity()` unchanged. Same super-admin pattern. The
  icon/color mapping for each event type stays entirely client-side
  (`app/activity/iconMap.ts`) since it's presentation, not data — PHP just
  returns the raw events.
- `admin-users-list.php` — new. GET only, admin-gated via `requireAdmin()`
  (mirrored as a 403 JSON response, since there's no PHP `die()` equivalent
  to hand back from a JSON endpoint). Returns every user with
  `countUserServers()` computed per row, plus `myUserId` so the TSX side
  can grey out self-targeting actions the same way the PHP version's
  disabled-with-title buttons did.
- `admin-user-action.php` — new. POST-only, admin-gated. `{ id, action,
  server_limit?, grant_amount?, new_balance? }`. **Shared by two pages**:
  admin-users.php's row actions (promote/demote/set_limit/suspend/
  unsuspend/delete) and admin-user-detail.php's panel actions
  (grant_credit/set_balance, added to this same endpoint rather than
  duplicating the first five actions in a second file). All logic ported
  verbatim from both PHP handlers, including both self-targeting guards.
- `admin-user-detail.php` (new file, same name as old page — now under
  `api/`) — GET only, admin-gated, `?id=<userId>`. Returns the target
  user's profile, their servers (`listServersWithLiveStatus()`, same as
  servers.php), and their 25 most recent combined activity events (same
  `getUserCombinedActivity()` as activity.php's endpoint, just scoped +
  capped). An unknown id returns `{ notFound: true }` instead of the PHP
  version's redirect; the TSX page does the redirect to `/admin-users`
  itself.
- `admin-billing-list.php` — new. GET only, admin-gated. Every user (for
  the Grant Credit / Set Balance dropdowns — same `listAllUsers()` as
  admin-users.php) plus every active redeem code (`listRedeemCodes()`
  unchanged).
- `admin-billing-action.php` — new. POST-only, admin-gated. This is
  admin-billing.php's inline handler verbatim in logic for all four
  actions (create_code/delete_code/grant_credit/set_balance) — same
  functions (`createRedeemCode`/`deleteRedeemCode`/`addUserCredit`/
  `setUserCredit`), same validation. **Ported an existing asymmetry, not a
  bug I introduced:** `grant_credit` has no `userId > 0` check in the
  original (unlike `set_balance`, which does) — `addUserCredit()` itself is
  the only guard against a bad/missing user id for that action. Left as-is.
- `admin-billing-test-list.php` / `admin-billing-test-action.php` — new.
  **⚠️ These have real, non-simulated effects, ported exactly as
  dangerous as the original.** `run_cron_now` executes the literal same
  code `billing-cron.php` runs on schedule — if a test server's owner
  can't afford the charge, their server WILL be suspended on the actual
  Pterodactyl panel, immediately, for real. Not linked from any nav on
  either side (PHP or TSX) — reachable only by visiting
  `/admin-billing-test` directly, matching the original's "not linked in
  any nav" note. The warning box text in the TSX page must stay in sync
  with this endpoint's actual behavior if either ever changes.
- `admin-activity.php` (new file, same name as old page — now under
  `api/`) — GET only, admin-gated. `?user=<userId>` optional filter, same
  as the PHP page's own `$_GET['user']`. Without it: everyone's combined
  activity via `getAllCombinedActivity(400)`; with it: one user's via
  `getUserCombinedActivity($id, 300)`. Also returns a username lookup
  table and the full user list for the filter dropdown.
  - `ActivityEvent` (shared type, used by both `/activity` and
    `/admin-activity`) gained an optional `user_id` field — additive only,
    doesn't affect the personal activity page which never used it.
  - Reuses `iconFor()` from `app/activity/iconMap.ts` rather than
    duplicating the icon/color table a second time.
  - The "By admin: X" / "By: super admin" meta-line logic is a slightly
    different rule from the personal activity page (it compares actor
    against *subject*, not against "me") — ported as its own function
    rather than trying to force-fit the existing one, since the two pages'
    rules aren't actually the same despite looking similar.

**Action needed on the PHP side:** delete or redirect the old root-level
`api-node-status.php` and `api-server-status.php` (or repoint `home.php`'s
and `servers.php`'s own PHP-side polling scripts at `api/...`) so you're not
left with stale duplicates if you keep both PHP and TSX pages live during
rollout.

## Servers page (`app/servers/`)
- `page.tsx` — list + create wizard, wrapped in `<AppShell activeNav="servers">`.
  Wires: initial list load, 12s status-only polling (paused when the tab is
  hidden, same as the PHP version), the `?refunded=` banner after a delete,
  and `?plan=` preselection for the create form (both were URL params in the
  PHP version too).
- `ServerRow.tsx` — one server's row: status pill, Icon/Startup/Panel links,
  Suspend/Unsuspend and Delete buttons, each respecting their own cooldown.
- `CreateServerForm.tsx` — the cascading software/plan/version/location/node
  selects and live spec preview, ported from servers.php's inline `<script>`
  into React state. Node availability recomputes per-plan the same way
  `updateNodeAvailability()` did.
- `app/lib/useConfirm.tsx` + `app/components/ConfirmModal.tsx` — the
  confirm-modal deferred from the `/home` pass. Built now against a real
  call site (Delete), as an explicit hook instead of the PHP version's
  global `<form data-confirm>` intercept — React has no equivalent of "any
  form submission anywhere" to hook into, and an explicit
  `if (!(await confirm(...))) return;` is the more idiomatic fit anyway.


## Running it
1. `npm install` in `nextjs-app/`.
2. Set `PHP_BACKEND_ORIGIN` (env var) to wherever PHP actually listens —
   defaults to `http://127.0.0.1:8080`. In production this should be an
   internal address, not public.
3. `npm run dev` — visit `/login`, then `/home` after signing in.

## Known trade-off
`AppShell`'s auth check happens client-side after mount (calls
`session.php`, redirects if unauthenticated). That means a brief blank
render while the check is in flight, rather than a server-side redirect
before any HTML ships. This is the normal pattern for an App Router
frontend that doesn't have direct access to PHP's session store from a
Next.js server component — flagging it here rather than treating it as
solved, in case a tighter server-side gate becomes worth it later (e.g. a
Next.js middleware that forwards the cookie to `session.php` before
rendering).

## Profile page (`app/profile/`)
- `page.tsx` — three independent forms (account settings, password change,
  avatar upload), each with its own success/error banner, wrapped in
  `<AppShell activeNav="profile">`. Redirects to `/home` for the super
  admin, matching the PHP page.
- Avatar images are user-uploaded files that live on the PHP side
  (`data/avatars/`), not something Next.js can bundle at build time —
  `next.config.js` now also proxies `/data/avatars/*` to PHP alongside
  `/api/*`. Confirmed `data/avatars/.htaccess` explicitly re-grants public
  access (unlike `data/.htaccess`, which denies everything), so this
  matches the original's intended access boundary rather than loosening it.

## Redeem page (`app/redeem/`)
- `page.tsx` — single code-redemption form, wrapped in
  `<AppShell activeNav="servers">`. That's not a typo: the original
  `redeem.php` sets `$activeNav = 'servers'`, so the sidebar highlights
  "Servers" while on this page even though "Redeem Code" has its own nav
  entry pointing here. Ported as-is rather than "fixed."

## Activity page (`app/activity/`)
- `page.tsx` — read-only combined feed (account events + credit
  transactions), wrapped in `<AppShell activeNav="activity">`.
- `iconMap.ts` — the per-event-type icon/background/foreground lookup,
  ported 1:1 from activity.php's `$iconMap` array.
- Timestamp formatting matches PHP's `date('M j, Y g:ia', $ts)` exactly
  (e.g. "Aug 24, 2026 3:45pm") via a small hand-written formatter rather
  than a date library, to avoid a new dependency for one format string.

## Admin: Users page (`app/admin-users/`)
- `page.tsx` — table with promote/demote/suspend/delete/set-limit actions,
  wrapped in `<AppShell activeNav="users" requireAdmin>`. The new
  `requireAdmin` prop on `AppShell` mirrors `requireAdmin()` from
  `auth.php`: redirects non-admins to `/home` (there's no client-side
  equivalent of PHP's `die('Admin access required.')` to render mid-layout,
  so a redirect is the closest match). Delete goes through `useConfirm()`,
  same as `servers.php`'s delete action.
- Each row's "Set" limit button has its own local input state, matching
  the PHP version's per-row `<form>`.

## Admin: User Detail page (`app/admin-user-detail/`)
- `page.tsx` — profile header, stat cards, account-actions panel (limit,
  grant credit, set exact balance, promote/demote, suspend/unsuspend,
  delete), server list, and recent-activity list. Wrapped in
  `<AppShell activeNav="users" requireAdmin>`. `?id=` comes from the URL,
  same as the PHP version's `$_GET['id']`.
- Both `set_balance` and `delete` go through `useConfirm()` — `set_balance`
  because overwriting a balance is easy to fat-finger, `delete` because
  it's irreversible. Both match the PHP version's `data-confirm` prompts
  word-for-word.
- Successful delete navigates to `/admin-users`, matching the PHP
  version's `header('Location: admin-users')` after a successful delete.
- **API shape change from the previous pass:** `performAdminUserAction()`'s
  third parameter changed from a single `serverLimit?: number` to an
  `extra?: { serverLimit?, grantAmount?, newBalance? }` object, since this
  page needed two more optional fields. `admin-users/page.tsx`'s call site
  was updated to match — if you've already deployed the previous zip and
  wired anything else against the old signature, it'll need the same
  update.

## Admin: Billing page (`app/admin-billing/`)
- `page.tsx` — four independent forms (create redeem code, grant credit,
  set exact balance, and each code's own delete button) plus the codes
  table, wrapped in `<AppShell activeNav="billing_admin" requireAdmin>`.
  `set_balance` and each code's `delete` both go through `useConfirm()`,
  matching the PHP version's `data-confirm` prompts word-for-word.
- Links to `/admin-billing-test` at the bottom, same as the original —
  that page isn't migrated yet (it's next).

## Admin: Billing Test Tool (`app/admin-billing-test/`)
- `page.tsx` — the two-step test flow (schedule a test charge, then run the
  real cron logic) plus the current billing state table. Wrapped in
  `<AppShell activeNav="billing_admin" requireAdmin>` — deliberately **not**
  added to `AppShell`'s `ADMIN_NAV` array, so it stays unlinked from the
  sidebar exactly like the PHP version, reachable only by URL.
  `run_cron_now` goes through `useConfirm()` with the exact same warning
  wording as the original's `data-confirm`.
- Timestamp formatting matches PHP's `date('M j, g:i:sa', ...)` — note this
  includes **seconds**, unlike `activity.php`'s minute-level format,
  because this tool schedules test charges down to the second.

## Admin: Activity Log page (`app/admin-activity/`)
- `page.tsx` — all-users combined feed with a per-user filter dropdown
  (`?user=` in the URL, same as the PHP version), wrapped in
  `<AppShell activeNav="activity_admin" requireAdmin>`.

## Plans page (`app/plans/`)
- `page.tsx` — static plan grid, wrapped in `<AppShell activeNav="plans">`
  (no `requireAdmin` — any logged-in user can browse plans).
- `api/plans.php` is a **separate, smaller endpoint** from
  `server-form-options.php` rather than reusing it — the two pages need
  different shapes from the same `plans-config.php` source of truth. This
  page needs the display label fields (`ramLabel`/`cpuLabel`/`diskLabel`/
  `fromPrice`) that the create-form endpoint doesn't carry, since the
  create-form's dropdowns render their own labels inline.
- The "featured" card styling is tied to the specific plan key `'temple'`,
  matching the PHP version's hardcoded `$key === 'temple'` check — **not**
  driven by the `fromPrice` flag, even though today `temple` is the only
  plan with both. Ported the distinction faithfully rather than
  conflating the two, since a future plan could have one flag without
  the other.

## Migration complete
All 13 pages from the README's plan are done: login, home, servers,
profile, redeem, activity, admin-users, admin-user-detail, admin-billing,
admin-billing-test, admin-activity, and plans. 23 PHP JSON endpoints under
`api/`, all reusing the original's business-logic functions unchanged —
nothing was reimplemented, only reshaped from HTML-rendering to JSON
in/out. Every page type-checks and the whole app builds together cleanly
(`npx next build`, 16/16 routes).

**Before deploying:**
1. Run `php -l` on every file under `php-api/api/` — this sandbox couldn't
   install a PHP interpreter to verify syntax directly (see the note
   under servers.php's endpoints above for why). Checked by hand and for
   brace/paren balance throughout, but that's not a substitute for
   actually parsing it.
2. Delete or repoint the old root-level `api-node-status.php` and
   `api-server-status.php` if you're keeping the PHP pages live during
   rollout, so they don't diverge from the copies now under `api/`.
3. Set `PHP_BACKEND_ORIGIN` for your actual deployment topology in
   `next.config.js` (or via env var).
4. Read through the flagged pre-existing quirks in this doc — the
   never-shows email re-verify message (`profile.php`), the
   `grant_credit` validation asymmetry (`admin-billing-action.php`) — and
   decide whether to fix them now or leave them as they were.
5. `admin-billing-test` is real, not a simulation — re-read that section
   above before anyone touches it against production data.

## Flagged, not fixed (out of scope for this migration)
`ptero.php` has live Pterodactyl Application/Client API keys hardcoded in
the source. Pre-existing, not introduced by this migration — just noting it
in case this repo is ever made public or shared.


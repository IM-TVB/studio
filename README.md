# KPE Dashboard (PHP) — Angkor Hosting Server Panel

Plain PHP dashboard for your VPS — no build step, no Composer, no Node.
Talks to Pterodactyl via the Application API (server management) and Client API
(file uploads, e.g. server icons).

Supports open registration with email verification, per-user server ownership
and limits, live node/allocation stats, a preset-driven server creation form,
and clean URLs without `.php`.

---

## Requirements

### System
- **PHP 7.4+** (tested on 8.5)
- **Apache 2.4+** with:
  - `mod_php` or `php-fpm`
  - `mod_rewrite` enabled (for clean URLs)
  - `AllowOverride All` set on the `/var/www/html` `<Directory>` block (for `.htaccess` to take effect)

### PHP extensions
| Extension | Used for | Install |
|---|---|---|
| `curl` | All Pterodactyl API calls (Application + Client API) | `sudo apt install php-curl` |
| `gd` | Converting uploaded JPG server icons to PNG | `sudo apt install php-gd` |
| `json` | Reading/writing `data/users.json`, API payloads | Built into PHP core — no install needed |
| `session` | Login sessions | Built into PHP core — no install needed |
| `openssl` | Required by PHPMailer for SMTP TLS | Usually built-in; `sudo apt install php-openssl` if missing |

After installing any extension:
```bash
sudo phpenmod curl gd
sudo systemctl restart apache2
```

Verify what's active:
```bash
php -m | grep -E "curl|gd|json|session|openssl"
```

### PHP libraries (bundled, no Composer needed)
- **PHPMailer** — included directly under `lib/PHPMailer/` as plain `.php` files
  (`Exception.php`, `PHPMailer.php`, `SMTP.php`). Used for sending verification emails via SMTP.

### External services
- A **Pterodactyl panel** with:
  - An **Application API key** (`ptla_...`) — Admin → Application API, needs Read & Write on Servers, Users, Nodes, Allocations
  - A **Client API key** (`ptlc_...`) — from an admin's own Account → API Credentials (no permission picker; inherits full account access). Used only for uploading server icons.
- An **SMTP account** for sending verification emails (this project is configured for Gmail SMTP + an App Password, but any SMTP host works by editing `mail.php`)

---

## Full file structure

```
/var/www/html/
├── .htaccess                 ← clean URL rewriting (strips .php from links)
├── assets/presets/*.png      ← preset server icon images
├── auth.php                  ← session/login logic (admin + regular users)
├── data/
│   ├── .htaccess              ← blocks direct web access to this folder
│   └── users.json             ← auto-created on first registration
├── footer.php / header.php    ← shared shell for centered-layout pages (login, register)
├── home.php                   ← sidebar home page — live node/allocation cards
├── lib/PHPMailer/              ← bundled PHPMailer source
├── login.php / logout.php      ← auth pages
├── mail.php                    ← SMTP config + sendVerificationEmail()
├── ptero.php                    ← Pterodactyl API client (Application + Client API)
├── register.php                 ← signup, creates dashboard + Pterodactyl user, sends verification email
├── resend-verification.php       ← re-send a lost verification email
├── server-icon.php                ← change a server's icon (preset or upload)
├── servers.php                     ← server list + create form (sidebar layout)
├── sidebar_footer.php / sidebar_header.php  ← shared shell for sidebar-layout pages
├── users.php                        ← JSON user store (register, login, ownership, limits)
└── verify-email.php                  ← landing page for the emailed verification link
```

Legacy standalone pages (`index.php`, `create.php`) are superseded by `servers.php` and can be deleted.

---

## Install on your VPS

```bash
sudo apt update
sudo apt install apache2 php php-curl php-gd
sudo a2enmod rewrite
sudo phpenmod curl gd
```

Copy all project files (including hidden `.htaccess` files and the `lib/`, `data/`, `assets/` folders):
```bash
sudo cp -r . /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo find /var/www/html -type f -exec chmod 644 {} \;
sudo find /var/www/html -type d -exec chmod 755 {} \;
sudo chmod -R 775 /var/www/html/data   # PHP needs to write users.json here
```

Make sure your vhost (e.g. `/etc/apache2/sites-available/000-default.conf`) has:
```apache
<Directory /var/www/html>
    Options Indexes FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>
```

Then:
```bash
sudo apache2ctl configtest   # should print "Syntax OK"
sudo systemctl restart apache2
```

---

## Configuration — required before first use

### 1. Pterodactyl API keys — `ptero.php`
```php
$PANEL_URL = 'https://panel.kpeclub.site';
$API_KEY   = 'ptla_...';        // Application API key
$CLIENT_API_KEY = 'ptlc_...';   // Client API key (admin account)
```

### 2. Admin login — `auth.php`
Generate a password hash:
```bash
php -r "echo password_hash('your-real-password-here', PASSWORD_DEFAULT);"
```
Paste the result in:
```php
$AUTH_USERNAME = 'admin';
$AUTH_PASSWORD_HASH = '$2y$...';
```

### 3. Email sending — `mail.php`
```php
define('SMTP_USERNAME', 'youraddress@gmail.com');
define('SMTP_APP_PASSWORD', 'your16charapppassword'); // from https://myaccount.google.com/apppasswords
define('SITE_BASE_URL', 'https://yourdomain.com');    // used to build the verification link
```
Requires 2-Step Verification enabled on the Google account, then an App Password generated —
regular Gmail passwords are rejected by SMTP auth.

### 4. Server presets — `servers.php`
```php
$SOFTWARE = [
    'paper'   => ['label' => 'Paper', 'eggId' => 4, 'startup' => '...'],
    // ...
];
$JAVA_IMAGES = [
    'java_21' => ['image' => 'ghcr.io/pterodactyl/yolks:java_21'],
    'java_25' => ['image' => 'ghcr.io/pterodactyl/yolks:java_25'],
];
$DEFAULT_NODE_ID = 1; // your real node ID
```
Egg IDs are panel-specific — check Admin → Nests on your Pterodactyl panel.

---

## How it works

### Ownership & limits
- Each registered user gets a matching Pterodactyl panel user, created automatically via the Application API.
- Regular users can only create/view/manage servers where `server.user` matches their own Pterodactyl user ID — enforced server-side, not just hidden in the UI.
- New accounts default to a `server_limit` of `1`. Change a specific user's limit by editing their entry in `data/users.json`, or change the default for new signups in `register.php`.
- The `admin` account bypasses all filtering and can manage every server.

### Email verification
- On registration, a random 64-character token is stored per-user (`verification_token`) with `email_verified: false`.
- `sendVerificationEmail()` emails a link to `/verify-email?token=...`.
- Login is blocked with a specific message + resend link until `email_verified` is `true`.
- The `admin` account is exempt (no verification required).

### Server icons
- Uses the Client API (not Application API) since icon files live inside a specific server's own filesystem.
- Users can pick from 6 bundled preset block icons or upload their own PNG/JPG (auto-converted to PNG, max 2MB).
- Ownership is checked the same way as the rest of the dashboard.

### Clean URLs
- `.htaccess` rewrites `/servers` → `servers.php` internally (query strings like `?id=5` pass through).
- Requires `mod_rewrite` and `AllowOverride All` — see Install section above.

---

## Security notes

- Sessions are server-side (PHP `session_start()`); passwords use `password_hash()` / `password_verify()`.
- `data/users.json` contains password hashes, never plaintext — but must stay unreachable over the web.
  The bundled `data/.htaccess` blocks this on Apache (`Require all denied`), assuming `AllowOverride All` is active.
- The Application API key has full admin power over your panel — keep it out of any public repo.
- The Client API key (admin account) can access every server's files — same caution applies.
- Serve over **HTTPS** in production (Certbot/Let's Encrypt) so login credentials and API keys in transit aren't sent in plaintext.

---

## Notes

- A `422` error about a missing environment variable usually means the selected egg expects
  different variables than what's being sent (e.g. Bungeecord needs `BUNGEE_VERSION`, not `SERVER_JARFILE` — Bungeecord isn't included in the current software presets for this reason).
- `ghcr.io/pterodactyl/yolks:java_25` is now an official image; older references to a third-party
  `ghcr.io/ptero-eggs/yolks:java_25` fork are no longer used.

## Credit / Billing System

Users get a credit wallet. Servers cost a monthly amount depending on plan (set in `servers.php`
under `$PLANS`, key `monthlyCost`). Free plan is `0` (no charge). Credit is spent upfront on
creation, then re-charged automatically every 30 days by a cron job.

### How users get credit
- **Redeem codes** — `/redeem` page, single-use-per-user by default (or multi-use if the admin allows it)
- **Admin grants** — `/admin-billing` → "Grant Credit Directly", or exact balance correction via `setUserCredit()`

### Admin billing page (`/admin-billing`)
- Create redeem codes (custom or random, fixed amount, optional max uses)
- Delete codes
- Grant credit directly to any user
- All changes are logged to `data/transactions.json` for an audit trail

### Recurring billing — cron setup (required for renewals to actually charge)
```bash
crontab -e
```
Add this line (runs daily at midnight):
```
0 0 * * * php /var/www/html/billing-cron.php >> /var/www/html/data/billing.log 2>&1
```
The cron script (`billing-cron.php`) checks every server with a recorded billing plan
(`data/server_billing.json`), charges the owner if their 30-day cycle is due, and **suspends
the server automatically** if they don't have enough credit. It does not delete servers on its own —
suspension only, so admins/users can top up and the cron will pick it back up next run
(no automatic un-suspend on payment — currently requires the user or an admin to manually
unsuspend after adding credit; can be added if wanted).

### Data files
- `data/redeem_codes.json` — all codes, their amount, usage cap, and who's redeemed them
- `data/transactions.json` — full credit/debit history per user
- `data/server_billing.json` — per-server plan, monthly cost, and next charge date

All three are blocked from direct web access via the existing `data/.htaccess` (`Require all denied`).

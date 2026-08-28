# 🚀 VolunTrack VMS Backend — Production Deployment & Operations Guide

This guide outlines the production deployment architecture, security hardening, queue worker management, and maintenance workflows for the **Volunteer Management System (VMS) Backend**.

---

## 1. System Requirements

- **PHP**: 8.2 or 8.3 with `pdo_mysql`, `bcmath`, `gd`, `redis`, `mbstring`, `openssl`, `zip`, and `curl` extensions.
- **Web Server**: Nginx (configured with HTTP/2 and TLS 1.3).
- **Database**: MySQL 8.0+ or MariaDB 10.6+ with InnoDB engine.
- **In-Memory Cache & Queue**: Redis 6.2+.
- **Process Manager**: Supervisor or Systemd for queue workers and scheduler.

---

## 2. Server Environment Configuration

### `.env` Production Hardening Settings
Ensure the following variables are set in production:

```env
APP_NAME="VolunTrack Platform"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.voluntrackapp.com

LOG_CHANNEL=stack
LOG_STACK=daily
LOG_LEVEL=info

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=voluntrack_prod
DB_USERNAME=voluntrack_user
DB_PASSWORD="<STRONG_RANDOMLY_GENERATED_PASSWORD>"

SESSION_DRIVER=redis
SESSION_ENCRYPT=true

QUEUE_CONNECTION=redis
CACHE_STORE=redis

MAIL_MAILER=smtp
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=postmaster@voluntrackapp.com
MAIL_PASSWORD="<MAILGUN_SMTP_PASSWORD>"
MAIL_FROM_ADDRESS="notifications@voluntrackapp.com"
MAIL_FROM_NAME="VolunTrack Platform"

GEMINI_API_KEY="<PRODUCTION_GEMINI_API_KEY>"
GEMINI_MODEL=gemini-1.5-flash
```

---

## 3. Deployment Steps

Run the deployment script sequentially on the target server:

```bash
# 1. Pull latest master code
git pull origin master

# 2. Install production PHP dependencies
composer install --no-dev --optimize-autoloader

# 3. Run database migrations
php artisan migrate --force

# 4. Cache configuration, routes, and views
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 5. Create storage symlink for certificates and public uploads
php artisan storage:link

# 6. Restart queue workers & clear OPcache
php artisan queue:restart
```

---

## 4. Background Queue Worker Setup (Supervisor)

Create `/etc/supervisor/conf.d/voluntrack-worker.conf`:

```ini
[program:voluntrack-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/voluntrack/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=4
redirect_stderr=true
stdout_logfile=/var/www/voluntrack/storage/logs/worker.log
stopwaitsecs=3600
```

Start Supervisor:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start voluntrack-worker:*
```

---

## 5. Cron Scheduler Setup

Add the following single entry to the server crontab:

```bash
* * * * * cd /var/www/voluntrack && php artisan schedule:run >> /dev/null 2>&1
```

### Scheduled Automatic Jobs Configured:
- `AutoTransitionEventStatusJob` (Runs hourly — transitions events from upcoming -> ongoing -> completed)
- `RevokeExpiredQrCodesJob` (Runs every 15 minutes — invalidates stale QR check-in signatures)

---

## 6. Automated Backup Strategy

Set up a daily automated database backup via Spatie Backup or crontab:

```bash
0 2 * * * mysqldump -u voluntrack_user -p'<PASSWORD>' voluntrack_prod | gzip > /backups/db_$(date +\%F).sql.gz
```

---

## 7. Security Headers Verification

Verify HTTP response headers using curl:

```bash
curl -I https://api.voluntrackapp.com/api/health
```

Expected Headers Output:
```http
HTTP/2 200
x-frame-options: DENY
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
strict-transport-security: max-age=31536000; includeSubDomains
content-security-policy: default-src 'self'...
referrer-policy: strict-origin-when-cross-origin
```

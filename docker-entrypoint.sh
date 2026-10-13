#!/bin/bash
set -e

# Dynamically bind Apache to the port assigned by Render or default to 80
PORT="${PORT:-80}"
sed -i "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost \*:${PORT}>/" /etc/apache2/sites-available/000-default.conf

# Generate .env if missing
if [ ! -f /var/www/html/.env ]; then
    cp /var/www/html/.env.example /var/www/html/.env
fi

# Ensure APP_KEY exists
if [ -z "$APP_KEY" ]; then
    php artisan key:generate --force
fi

# Ensure SQLite database and folder permissions
mkdir -p /var/www/html/database
if [ ! -f /var/www/html/database/database.sqlite ]; then
    touch /var/www/html/database/database.sqlite
fi

# Ensure storage, cache, and database write permissions for Apache
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/database
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/database

# Clear and optimize config
php artisan config:clear
php artisan route:clear

# Auto-migrate and auto-seed database tables on startup
php artisan migrate --force || true
php artisan db:seed --force || true

exec "$@"

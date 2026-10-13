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

# Ensure SQLite database file exists if DB_CONNECTION is sqlite
if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
    if [ ! -f /var/www/html/database/database.sqlite ]; then
        touch /var/www/html/database/database.sqlite
    fi
    chown -R www-data:www-data /var/www/html/database
    chmod -R 775 /var/www/html/database
fi

# Ensure storage and cache write permissions
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Clear and optimize config
php artisan config:clear
php artisan route:clear

# Auto-migrate database tables on startup
php artisan migrate --force || true

exec "$@"

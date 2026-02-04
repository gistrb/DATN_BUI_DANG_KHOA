#!/usr/bin/env bash
# Render build script for Django backend
set -o errexit

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Collecting static files..."
python manage.py collectstatic --no-input

# Optional: Reset database if RESET_DATABASE=true is set
# ⚠️ WARNING: This will DELETE ALL DATA in the database!
if [ "$RESET_DATABASE" = "true" ]; then
    echo "⚠️ ⚠️ ⚠️  RESETTING DATABASE - DELETING ALL DATA  ⚠️ ⚠️ ⚠️"
    python manage.py flush --no-input
    echo "Database reset complete!"
fi

echo "Running migrations..."
python manage.py migrate

# Create superuser if environment variables are set
if [ -n "$DJANGO_SUPERUSER_USERNAME" ]; then
    echo "Creating superuser..."
    python manage.py createsuperuser --noinput || echo "Superuser already exists"
fi

echo "Build complete!"

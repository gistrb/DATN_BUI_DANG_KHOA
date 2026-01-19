#!/usr/bin/env bash
# exit on error
set -o errexit

# Install python dependencies
pip install -r requirements.txt

# Create static directory if not exists
mkdir -p static

# Collect static files
python manage.py collectstatic --no-input

# Run migrations
python manage.py migrate

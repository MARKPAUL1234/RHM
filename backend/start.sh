#!/usr/bin/env bash
set -e
python manage.py migrate --noinput
exec gunicorn rhmt_backend.wsgi:application --bind 0.0.0.0:"${PORT:-10000}"

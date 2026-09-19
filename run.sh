#!/bin/bash
# Quick start script
set -e
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt

echo ""
echo "Starting server at http://127.0.0.1:8000"
echo "Swagger docs at http://127.0.0.1:8000/docs"
echo ""
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

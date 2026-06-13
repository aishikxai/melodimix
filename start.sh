#!/bin/bash
echo "Starting Melodix..."
cd backend && pip install -r requirements.txt -q && uvicorn main:app --host 0.0.0.0 --port 8000 &
cd ../frontend && npm install -q && npm run dev &
wait

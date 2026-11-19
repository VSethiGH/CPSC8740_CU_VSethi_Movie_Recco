#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if [ ! -f backend/data/movies.csv ] || [ ! -f backend/data/movie_feature_dictionary.json ]; then
  echo "Copy movies.csv and movie_feature_dictionary.json into backend/data/ first."
  exit 1
fi

if [ ! -x node_modules/.bin/vite ]; then
  npm install
fi

python3 backend/server.py &
API_PID=$!
trap 'kill "$API_PID" 2>/dev/null || true' EXIT INT TERM
npm run dev -- --host 127.0.0.1

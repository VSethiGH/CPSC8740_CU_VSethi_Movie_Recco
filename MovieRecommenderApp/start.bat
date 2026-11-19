@echo off
cd /d "%~dp0"

if not exist "backend\data\movies.csv" (
    echo Copy movies.csv into backend\data\ first.
    pause
    exit /b 1
)
if not exist "backend\data\movie_feature_dictionary.json" (
    echo Copy movie_feature_dictionary.json into backend\data\ first.
    pause
    exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" npm install

start "Movie Recommender API" cmd /k py backend\server.py
npm run dev -- --host 127.0.0.1

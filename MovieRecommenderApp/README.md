# Reelgood Movie Recommender

This is the Figma React app connected to your Python Logistic Regression model. The app reads your existing movie CSV, gets movie details and poster paths from it, and saves each viewer's likes and dislikes in a separate CSV.

## Add your movie data

Copy these two files from your notebook into `backend/data/`:

- `movies.csv`
- `movie_feature_dictionary.json`

The app does not include made-up movie data. The two files were not included with the Figma files you attached, so they have to be copied in before the app can start.

The `.gitignore` keeps these catalog files, viewer feedback CSVs, and API keys out of GitHub by default. If you want testers to run the app, give them the two catalog files separately or include them in the repository if you are allowed to share them. Pushing this project to GitHub will not create a live website; testers run it on their own computers.

## Run it on Linux or macOS

Install Python 3.10 or newer and Node.js 20.19 or newer. From this folder, run:

```bash
python3 -m pip install -r backend/requirements.txt
```

After adding the two data files, start both parts with one command. On the first run, the script installs the Node packages if Vite is not installed yet:

```bash
./start.sh
```

Open the local URL printed by Vite, usually `http://localhost:8443`. Keep the terminal window open while using the app. If you prefer two terminals, run `npm install` once, then run `python3 backend/server.py` in one and `npm run dev` in the other.

## Run it on Windows

Install Python 3.10 or newer and Node.js 20.19 or newer. In PowerShell, open this project folder and run:

```powershell
py -m pip install -r backend/requirements.txt
```

Then use two PowerShell windows in this folder. Run `npm install` once if you plan to start the app manually. In the first:

```powershell
py backend/server.py
```

In the second:

```powershell
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:8443`.

You can also double-click `start.bat` after adding the two data files. It installs Node packages if needed, opens the Python API in a second command window, and runs the UI.

## Optional: show full language names

The app always uses `movie_feature_dictionary.json` to map each saved language number to its language code. To show the full English language name (for example, “English” instead of `en`), set your TMDb API key before starting the Python server.

Linux or macOS:

```bash
export TMDB_API_KEY="your TMDb key"
python3 backend/server.py
```

Windows PowerShell:

```powershell
$env:TMDB_API_KEY = "your TMDb key"
py backend/server.py
```

The key is read from the environment and is not stored in the project files. Movie recommendations do not need the key.

## What the app does

- **Home:** Shows the top 10 movies ranked by the user's feedback. Until the user has both likes and dislikes, it starts with the most popular movies. Search works on movie titles and genres.
- **Reels:** Shows one unrated movie at a time. Swipe right or tap the check mark to like it; swipe left or tap X to dislike it. Tap **Skip** to move past a movie without creating feedback. Skipped movies stay out of that viewer's Reels feed until they reset.
- **Settings:** Shows that viewer's rating history, exports their feedback CSV, imports another ratings CSV as a named profile, lets them switch between profiles, and resets the selected profile after two typed confirmations.

The default profile uses `backend/data/users/<viewer_id>_movie.csv`; imported profiles use `backend/data/users/<viewer_id>__<profile>_movie.csv`. CSV imports need `movie_id` and `liked` columns, where 1 means liked and 0 means disliked. Skipped movie IDs are stored separately for each profile. Skipping does not count as a like or dislike and is not used to train the model. The ID sign-in is for this local class-project prototype and does not use a password or account service.

## Usability testing

Send testers [TESTER_INSTRUCTIONS.md](TESTER_INSTRUCTIONS.md) with the project and the two catalog files. It gives them a short list of tasks and questions to report back. The app does not automatically send their ratings or feedback to you; each tester's files stay on the computer where they run it.

## Files

- `src/` — React UI from the Figma project, connected to the API
- `backend/server.py` — Python API and Logistic Regression model
- `backend/data/` — put the movie CSV and feature dictionary here
- `backend/data/users/` — created automatically for viewer feedback CSVs
- `vite.config.ts` — sends `/api` requests from Vite to the Python API

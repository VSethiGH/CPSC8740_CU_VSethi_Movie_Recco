# Movie Recommender Usability Test

Thanks for helping test this movie recommendation app. It is a class project prototype, so some recommendations may be rough.

## Before you start

This app runs on your computer; it is not a live website. You need the project folder plus these two files from Varun:

- `movies.csv`
- `movie_feature_dictionary.json`

Put both files in the project's `backend/data/` folder. If they are missing, the app will not start. You do not need a TMDb API key to test the recommendations.

Install Python and Node.js, then install the Python packages once from the project folder.

Linux or macOS:

```bash
python3 -m pip install -r backend/requirements.txt
```

Windows PowerShell:

```powershell
py -m pip install -r backend/requirements.txt
```

On Linux or macOS, run:

```bash
./start.sh
```

On Windows, double-click `start.bat`. Open the local address printed in the terminal.

## Try these tasks

1. Sign in with a test ID, such as `tester1`. Do not use your name, email, or another personal ID.
2. On Home, search for a movie title or genre. Open a movie and look at its details.
3. On Reels, like one movie, dislike another, and skip a third. Check whether Skip is clear and whether it avoids recording a vote.
4. Go back to Home and look at the recommendations. The model needs at least one like and one dislike before it can personalize recommendations.
5. In Settings, export your ratings CSV. Import it with a new profile name, then switch between the original and imported profiles.
6. Check the rating history for each profile. Reset is optional; it clears ratings and skipped movies only in the selected profile.

## Send back your feedback

You can reply to Varun with short answers:

- Which tasks did you complete? Was anything confusing?
- Were the like, dislike, and skip actions clear?
- Was it clear how to import a CSV and switch profiles?
- Did the app respond the way you expected after each action?
- After rating movies, did the recommendations seem relevant to your preferences?
- Did you run into any errors or bugs?
- How easy was the app to use, from 1 (hard) to 5 (easy)?

Your ratings are saved only on the computer where you run the app. The app does not send them to Varun automatically. Please do not send your rating CSV unless you choose to share it.

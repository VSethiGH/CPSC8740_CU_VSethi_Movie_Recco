import json
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pandas as pd
import requests
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = BACKEND_DIR / "data"
USERS_DIR = DATA_DIR / "users"
MOVIES_FILE = DATA_DIR / "movies.csv"
DICTIONARY_FILE = DATA_DIR / "movie_feature_dictionary.json"
POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500"

movies = pd.DataFrame()
feature_columns = []
genre_names = {}
language_mapping = {}
language_names = {}


def load_data():
    global movies, feature_columns, genre_names, language_mapping, language_names

    if not MOVIES_FILE.exists() or not DICTIONARY_FILE.exists():
        raise FileNotFoundError(
            "Copy movies.csv and movie_feature_dictionary.json into backend/data/ "
            "before starting the server. See README.md."
        )

    # The Python parser also handles the long movie descriptions in this CSV.
    movies = pd.read_csv(MOVIES_FILE, engine="python")
    with DICTIONARY_FILE.open(encoding="utf-8") as file:
        feature_dictionary = json.load(file)

    genre_names = feature_dictionary["genres"]
    language_mapping = feature_dictionary["original_language_code"]
    feature_columns = [column for column in movies.columns if column.startswith("genre_")]
    feature_columns += [
        "adult",
        "softcore",
        "video",
        "original_language_code",
        "popularity",
        "vote_average",
        "vote_count",
        "release_year",
    ]

    required_columns = {
        "id",
        "title",
        "overview",
        "poster_path",
        *feature_columns,
        "adult",
        "softcore",
        "video",
        "original_language_code",
        "popularity",
        "vote_average",
        "vote_count",
        "release_year",
    }
    missing_columns = sorted(required_columns - set(movies.columns))
    if missing_columns:
        raise ValueError(
            "movies.csv is missing these columns: " + ", ".join(missing_columns)
        )
    if not any(column.startswith("genre_") for column in movies.columns):
        raise ValueError("movies.csv needs the genre_ columns used by the model.")

    movies["id"] = pd.to_numeric(movies["id"], errors="raise").astype("int64")
    for column in feature_columns:
        movies[column] = pd.to_numeric(movies[column], errors="coerce")
    movies = movies.dropna(subset=feature_columns).drop_duplicates("id").reset_index(drop=True)
    movies["overview"] = movies["overview"].fillna("")

    api_key = os.environ.get("TMDB_API_KEY", "").strip()
    if api_key:
        try:
            response = requests.get(
                "https://api.themoviedb.org/3/configuration/languages",
                params={"api_key": api_key},
                timeout=10,
            )
            response.raise_for_status()
            language_names = {
                item["iso_639_1"]: item["english_name"]
                for item in response.json()
            }
        except requests.RequestException:
            language_names = {}


def clean_user_id(user_id):
    user_id = re.sub(r"[^A-Za-z0-9_-]", "", str(user_id)).strip()
    if not user_id:
        raise ValueError("Enter a user ID containing letters or numbers.")
    return user_id[:48]


def feedback_path(user_id):
    USERS_DIR.mkdir(parents=True, exist_ok=True)
    return USERS_DIR / f"{clean_user_id(user_id)}_movie.csv"


def skipped_path(user_id):
    USERS_DIR.mkdir(parents=True, exist_ok=True)
    return USERS_DIR / f"{clean_user_id(user_id)}_skipped.csv"


def load_skipped_ids(user_id):
    path = skipped_path(user_id)
    if not path.exists():
        return set()
    skipped = pd.read_csv(path)
    if "movie_id" not in skipped.columns:
        return set()
    ids = pd.to_numeric(skipped["movie_id"], errors="coerce").dropna().astype("int64")
    return set(ids.tolist())


def load_feedback(user_id):
    path = feedback_path(user_id)
    if not path.exists():
        pd.DataFrame(columns=["movie_id", "title", "liked"]).to_csv(path, index=False)
    feedback = pd.read_csv(path)
    if feedback.empty:
        return pd.DataFrame(columns=["movie_id", "title", "liked"])
    feedback["movie_id"] = pd.to_numeric(feedback["movie_id"], errors="coerce")
    feedback["liked"] = pd.to_numeric(feedback["liked"], errors="coerce")
    feedback = feedback.dropna(subset=["movie_id", "liked"])
    feedback["movie_id"] = feedback["movie_id"].astype("int64")
    feedback["liked"] = feedback["liked"].astype("int64")
    return feedback[["movie_id", "title", "liked"]].drop_duplicates("movie_id", keep="last")


def movie_to_json(movie, match=None):
    genres = [
        genre_names.get(column, column)
        for column in feature_columns
        if column.startswith("genre_") and movie[column] == 1
    ]
    language_code = language_mapping.get(str(int(movie["original_language_code"])), "")
    language = language_names.get(language_code, language_code or "Unknown")
    poster_path = movie.get("poster_path", "")
    image = (
        POSTER_BASE_URL + str(poster_path)
        if pd.notna(poster_path) and str(poster_path).strip()
        else "/poster-placeholder.svg"
    )
    year = int(movie["release_year"]) if pd.notna(movie["release_year"]) else None
    return {
        "id": int(movie["id"]),
        "title": str(movie["title"]),
        "year": year,
        "genres": genres,
        "language": language,
        "description": str(movie.get("overview", "") or ""),
        "image": image,
        "match": None if match is None else round(float(match) * 100),
    }


def rated_movies(user_id):
    feedback = load_feedback(user_id)
    if feedback.empty:
        return feedback, []

    lookup = movies.set_index("id", drop=False)
    rated = []
    for row in feedback.to_dict("records"):
        movie_id = int(row["movie_id"])
        if movie_id not in lookup.index:
            continue
        item = lookup.loc[movie_id]
        rated.append({"movie": movie_to_json(item), "liked": int(row["liked"])})
    return feedback, rated


def session_data(user_id):
    feedback, rated = rated_movies(user_id)
    return {
        "user_id": clean_user_id(user_id),
        "feedback": {str(int(row.movie_id)): int(row.liked) for row in feedback.itertuples()},
        "rated": rated,
    }


def rank_movies(user_id, number=10, unrated_only=False):
    feedback = load_feedback(user_id)
    candidates = movies.copy()
    if unrated_only:
        rated_ids = set(feedback["movie_id"].tolist())
        skipped_ids = load_skipped_ids(user_id)
        candidates = candidates[
            ~candidates["id"].isin(rated_ids | skipped_ids)
        ].copy()
    if candidates.empty:
        return []

    if feedback["liked"].nunique() < 2:
        top = candidates.sort_values("popularity", ascending=False).head(number)
        return [movie_to_json(row) for _, row in top.iterrows()]

    training_data = feedback.merge(
        movies[["id"] + feature_columns],
        left_on="movie_id",
        right_on="id",
    )
    if training_data["liked"].nunique() < 2:
        top = candidates.sort_values("popularity", ascending=False).head(number)
        return [movie_to_json(row) for _, row in top.iterrows()]

    model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))
    model.fit(training_data[feature_columns], training_data["liked"])
    probabilities = model.predict_proba(candidates[feature_columns])[:, 1]
    candidates["like_probability"] = probabilities
    top = candidates.sort_values("like_probability", ascending=False).head(number)
    return [movie_to_json(row, row["like_probability"]) for _, row in top.iterrows()]


def next_movie(user_id):
    recommendations = rank_movies(user_id, number=1, unrated_only=True)
    return recommendations[0] if recommendations else None


def search_movies(query, number=50):
    query = query.strip()
    if not query:
        return []

    title_match = movies["title"].astype(str).str.contains(query, case=False, na=False)
    genre_match = pd.Series(False, index=movies.index)
    for column in feature_columns:
        if column.startswith("genre_") and query.lower() in genre_names.get(column, "").lower():
            genre_match |= movies[column].eq(1)

    results = movies[title_match | genre_match]
    results = results.sort_values("popularity", ascending=False).head(number)
    return [movie_to_json(row) for _, row in results.iterrows()]


class MovieHandler(BaseHTTPRequestHandler):
    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def get_user(self, query):
        user_values = parse_qs(query).get("user_id", [""])
        return clean_user_id(user_values[0])

    def do_GET(self):
        url = urlparse(self.path)
        try:
            if url.path == "/api/health":
                return self.send_json(200, {"ok": True, "movie_count": len(movies)})
            if url.path == "/api/session":
                return self.send_json(200, session_data(self.get_user(url.query)))
            if url.path == "/api/recommendations":
                query = parse_qs(url.query)
                user_id = clean_user_id(query.get("user_id", [""])[0])
                number = min(max(int(query.get("limit", ["10"])[0]), 1), 50)
                return self.send_json(200, {"movies": rank_movies(user_id, number)})
            if url.path == "/api/reels/next":
                return self.send_json(200, {"movie": next_movie(self.get_user(url.query))})
            if url.path == "/api/search":
                query = parse_qs(url.query).get("q", [""])[0]
                return self.send_json(200, {"movies": search_movies(query)})
            return self.send_json(404, {"error": "Unknown API route."})
        except ValueError as error:
            return self.send_json(400, {"error": str(error)})
        except Exception as error:
            return self.send_json(500, {"error": str(error)})

    def do_POST(self):
        url = urlparse(self.path)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            user_id = clean_user_id(data.get("user_id", ""))

            if url.path == "/api/feedback":
                movie_id = int(data["movie_id"])
                liked = int(data["liked"])
                if liked not in (0, 1):
                    return self.send_json(400, {"error": "liked must be 0 or 1."})
                movie = movies.loc[movies["id"] == movie_id].iloc[0]
                feedback = load_feedback(user_id)
                feedback = feedback[feedback["movie_id"] != movie_id]
                feedback.loc[len(feedback)] = {
                    "movie_id": movie_id,
                    "title": str(movie["title"]),
                    "liked": liked,
                }
                feedback.to_csv(feedback_path(user_id), index=False)
                return self.send_json(200, session_data(user_id))

            if url.path == "/api/skip":
                movie_id = int(data["movie_id"])
                if not movies["id"].eq(movie_id).any():
                    return self.send_json(404, {"error": "Movie not found."})
                skipped_ids = load_skipped_ids(user_id)
                skipped_ids.add(movie_id)
                pd.DataFrame({"movie_id": sorted(skipped_ids)}).to_csv(
                    skipped_path(user_id), index=False
                )
                return self.send_json(200, {"movie": next_movie(user_id)})

            if url.path == "/api/reset":
                pd.DataFrame(columns=["movie_id", "title", "liked"]).to_csv(
                    feedback_path(user_id), index=False
                )
                skipped_path(user_id).unlink(missing_ok=True)
                return self.send_json(200, session_data(user_id))

            return self.send_json(404, {"error": "Unknown API route."})
        except (ValueError, KeyError, IndexError, json.JSONDecodeError) as error:
            return self.send_json(400, {"error": str(error)})
        except Exception as error:
            return self.send_json(500, {"error": str(error)})

    def log_message(self, format_string, *args):
        print(f"[API] {format_string % args}")


def main():
    load_data()
    USERS_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", 8765), MovieHandler)
    print(f"Loaded {len(movies)} movies. API running at http://127.0.0.1:8765")
    print("Keep this terminal open while using the app.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping movie recommendation API.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

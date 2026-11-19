import { FormEvent, PointerEvent, useEffect, useMemo, useState } from "react";

type Movie = {
  id: number;
  title: string;
  year: number | null;
  genres: string[];
  language: string;
  description: string;
  image: string;
  match: number | null;
};

type Feedback = Record<number, 0 | 1>;
type RatedMovie = { movie: Movie; liked: 0 | 1 };
type SessionData = { feedback: Feedback; rated: RatedMovie[] };
type MovieListData = { movies: Movie[] };
type NextMovieData = { movie: Movie | null };
type Tab = "home" | "reels" | "settings";

async function apiRequest<T>(route: string, options?: RequestInit): Promise<T> {
  const response = await fetch(route, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

const Icon = ({
  name,
  size = 20,
}: {
  name:
    | "home"
    | "play"
    | "settings"
    | "search"
    | "back"
    | "heart"
    | "x"
    | "check"
    | "skip"
    | "logout"
    | "trash"
    | "film"
    | "sun"
    | "moon";
  size?: number;
}) => {
  const paths: Record<string, React.ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9M9 20v-7h6v7" />
      </>
    ),
    play: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="m10 9 5 3-5 3Z" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    back: (
      <>
        <path d="m15 18-6-6 6-6" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    x: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    skip: (
      <>
        <path d="m5 5 10 7-10 7V5Z" />
        <path d="M19 5v14" />
      </>
    ),
    logout: (
      <>
        <path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />
      </>
    ),
    film: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />,
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
};

const escapeCsv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

function App() {
  const [userId, setUserId] = useState(() => localStorage.getItem("reelgood_active_id") || "");
  const [idInput, setIdInput] = useState("");
  const [tab, setTab] = useState<Tab>("home");
  const [feedback, setFeedback] = useState<Feedback>({});
  const [ratedMovies, setRatedMovies] = useState<RatedMovie[]>([]);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [search, setSearch] = useState("");
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [reelMovie, setReelMovie] = useState<Movie | null>(null);
  const [apiError, setApiError] = useState("");
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [resetText, setResetText] = useState("");
  const [pointerStart, setPointerStart] = useState<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const [voteFx, setVoteFx] = useState<{ liked: 0 | 1; token: number } | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("reelgood_theme") as "light" | "dark") || "dark",
  );

  const storageKey = userId ? `${userId}_movie.csv` : "";

  useEffect(() => {
    if (!userId) return;
    let active = true;
    apiRequest<SessionData>(`/api/session?user_id=${encodeURIComponent(userId)}`)
      .then((session) => {
        if (!active) return;
        setFeedback(session.feedback);
        setRatedMovies(session.rated);
        setApiError("");
      })
      .catch((error: Error) => active && setApiError(error.message));
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    apiRequest<MovieListData>(
      `/api/recommendations?user_id=${encodeURIComponent(userId)}&limit=10`,
    )
      .then((result) => active && setRecommendations(result.movies))
      .catch((error: Error) => active && setApiError(error.message));
    return () => {
      active = false;
    };
  }, [feedback, userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    apiRequest<NextMovieData>(`/api/reels/next?user_id=${encodeURIComponent(userId)}`)
      .then((result) => active && setReelMovie(result.movie))
      .catch((error: Error) => active && setApiError(error.message));
    return () => {
      active = false;
    };
  }, [feedback, userId]);

  useEffect(() => {
    if (!userId || !search.trim()) {
      setSearchResults([]);
      return;
    }
    let active = true;
    apiRequest<MovieListData>(`/api/search?q=${encodeURIComponent(search)}`)
      .then((result) => active && setSearchResults(result.movies))
      .catch((error: Error) => active && setApiError(error.message));
    return () => {
      active = false;
    };
  }, [search, userId]);

  useEffect(() => {
    localStorage.setItem("reelgood_theme", theme);
  }, [theme]);

  const hasBoth = useMemo(
    () => Object.values(feedback).includes(1) && Object.values(feedback).includes(0),
    [feedback],
  );
  const rated = ratedMovies;
  const filtered = search.trim() ? searchResults : recommendations;

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    const clean = idInput.trim().replace(/[^a-zA-Z0-9_-]/g, "");
    if (!clean) return;
    try {
      const session = await apiRequest<SessionData>(
        `/api/session?user_id=${encodeURIComponent(clean)}`,
      );
      localStorage.setItem("reelgood_active_id", clean);
      setFeedback(session.feedback);
      setRatedMovies(session.rated);
      setApiError("");
      setUserId(clean);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Could not open this ID.");
    }
  };

  const rate = async (movie: Movie, liked: 0 | 1) => {
    try {
      const session = await apiRequest<SessionData>("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, movie_id: movie.id, liked }),
      });
      setFeedback(session.feedback);
      setRatedMovies(session.rated);
      setApiError("");
      setSelected(null);
      setDragX(0);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Could not save this rating.");
    }
  };

  const skipReel = async (movie: Movie) => {
    try {
      const result = await apiRequest<NextMovieData>("/api/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, movie_id: movie.id }),
      });
      setReelMovie(result.movie);
      setApiError("");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Could not skip this movie.");
    }
  };

  const playVoteSound = (liked: 0 | 1) => {
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    void context.resume();
    const master = context.createGain();
    master.gain.setValueAtTime(0.38, context.currentTime);
    master.connect(context.destination);

    const notes = liked ? [523.25, 659.25, 783.99, 1046.5] : [196, 164.81, 123.47];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const noteGain = context.createGain();
      const start = context.currentTime + index * (liked ? 0.065 : 0.1);
      oscillator.type = liked ? (index % 2 ? "triangle" : "sine") : "sawtooth";
      oscillator.frequency.setValueAtTime(frequency, start);
      if (!liked) oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, start + 0.2);
      noteGain.gain.setValueAtTime(0.0001, start);
      noteGain.gain.exponentialRampToValueAtTime(liked ? 0.22 : 0.13, start + 0.012);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, start + (liked ? 0.28 : 0.24));
      oscillator.connect(noteGain);
      noteGain.connect(master);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
    });
    window.setTimeout(() => void context.close(), 750);
  };

  const voteOnReel = (movie: Movie, liked: 0 | 1) => {
    if (voteFx) return;
    playVoteSound(liked);
    setVoteFx({ liked, token: Date.now() });
    window.setTimeout(() => void rate(movie, liked), 560);
    window.setTimeout(() => setVoteFx(null), 950);
  };

  const downloadCsv = () => {
    const csv = [
      "movie_id,title,liked",
      ...rated.map(({ movie, liked }) => `${escapeCsv(movie.id)},${escapeCsv(movie.title)},${liked}`),
    ].join("\n");
    const blob = new Blob([`${csv}\n`], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = storageKey;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const resetCsv = async () => {
    try {
      const session = await apiRequest<SessionData>("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      setFeedback(session.feedback);
      setRatedMovies(session.rated);
      setResetStep(0);
      setResetText("");
      setApiError("");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Could not reset feedback.");
    }
  };

  const logout = () => {
    localStorage.removeItem("reelgood_active_id");
    setUserId("");
    setIdInput("");
    setFeedback({});
    setRatedMovies([]);
    setRecommendations([]);
    setReelMovie(null);
    setSearch("");
    setTab("home");
  };

  const finishSwipe = (event: PointerEvent) => {
    if (pointerStart === null || !reelMovie) return;
    const distance = event.clientX - pointerStart;
    if (Math.abs(distance) > 90) voteOnReel(reelMovie, distance > 0 ? 1 : 0);
    setPointerStart(null);
    setDragX(0);
  };

  if (!userId) {
    return (
      <main className={`signin-page theme-${theme}`}>
        <ThemeToggle theme={theme} setTheme={setTheme} />
        <section className="signin-card">
          <div className="brand-mark">
            <Icon name="film" size={25} />
          </div>
          <p className="eyebrow">YOUR NEXT FAVORITE</p>
          <h1>
            Find a film
            <br />
            worth feeling.
          </h1>
          <p className="signin-copy">
            Your taste stays yours. Enter an ID to open an existing profile or begin a new one.
          </p>
          {apiError && <p className="api-error" role="alert">{apiError}</p>}
          <form onSubmit={signIn}>
            <label htmlFor="user-id">Your viewer ID</label>
            <div className="id-field">
              <span>#</span>
              <input
                id="user-id"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                placeholder="e.g. alex_07"
                autoFocus
              />
            </div>
            <button className="primary-button" type="submit" disabled={!idInput.trim()}>
              Continue <span>→</span>
            </button>
          </form>
          <div className="local-note">
            <span className="status-dot" />
            Local prototype · no password required
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`stage theme-${theme}`}>
      <div className="app-shell">
        <section className="phone-content">
          {apiError && <div className="api-error app-error" role="alert">{apiError}</div>}
          {tab === "home" && (
            <div className="page home-page">
              <header className="mobile-header">
                <div className="wordmark">
                  <Icon name="film" size={18} /> reelgood
                </div>
                <div className="header-actions">
                  <ThemeToggle theme={theme} setTheme={setTheme} />
                  <button className="avatar" onClick={() => setTab("settings")}>
                    {userId.slice(0, 2).toUpperCase()}
                  </button>
                </div>
              </header>
              <div className="home-heading">
                <p className="eyebrow">{hasBoth ? "CURATED FOR YOU" : "POPULAR STARTERS"}</p>
                <h1>{hasBoth ? "Your top picks" : "Popular movies"}</h1>
                <p>
                  {hasBoth
                    ? "Shaped by everything you’ve rated."
                    : "Like and dislike a few titles to tune your picks."}
                </p>
              </div>
              <div className="search-box">
                <Icon name="search" size={19} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search titles or genres"
                />
                {search && (
                  <button onClick={() => setSearch("")}>
                    <Icon name="x" size={15} />
                  </button>
                )}
              </div>
              <div className="movie-list">
                {filtered.map((movie, index) => (
                  <button className="movie-row" key={movie.id} onClick={() => setSelected(movie)}>
                    <div className="poster-wrap">
                      <img src={movie.image} alt="" />
                      <span>{index + 1}</span>
                    </div>
                    <div className="movie-row-copy">
                      <h3>{movie.title}</h3>
                      <p>
                        {movie.year ?? "Year unknown"} · {movie.genres.slice(0, 2).join(" · ")}
                      </p>
                      {movie.match !== null && (
                        <div className="match-line">
                          <span style={{ width: `${movie.match}%` }} />
                        </div>
                      )}
                    </div>
                    <span className="match">
                      {movie.match === null ? "Popular" : `${movie.match}%`}
                      <small>{movie.match === null ? "pick" : "match"}</small>
                    </span>
                  </button>
                ))}
                {!filtered.length && (
                  <div className="empty-state">No titles found. Try another search.</div>
                )}
              </div>
            </div>
          )}

          {tab === "reels" && (
            <div className="page reels-page">
              <header className="page-header">
                <div>
                  <p className="eyebrow">DISCOVER</p>
                  <h1>Quick picks</h1>
                </div>
                <ThemeToggle theme={theme} setTheme={setTheme} />
              </header>
              {reelMovie ? (
                <>
                  <div
                    className={`reel-card ${
                      voteFx ? (voteFx.liked ? "card-liked" : "card-disliked") : ""
                    }`}
                    style={{ transform: `translateX(${dragX}px) rotate(${dragX / 25}deg)` }}
                    onPointerDown={(e) => {
                      setPointerStart(e.clientX);
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) =>
                      pointerStart !== null && setDragX(e.clientX - pointerStart)
                    }
                    onPointerUp={finishSwipe}
                    onPointerCancel={() => {
                      setPointerStart(null);
                      setDragX(0);
                    }}
                  >
                    <img
                      src={reelMovie.image}
                      alt={`${reelMovie.title} poster`}
                      draggable={false}
                    />
                    <div className="reel-shade" />
                    {dragX > 35 && <span className="swipe-stamp like-stamp">LIKE</span>}
                    {dragX < -35 && <span className="swipe-stamp pass-stamp">PASS</span>}
                    <div className="reel-info">
                      <span className="language">{reelMovie.language}</span>
                      <h2>{reelMovie.title}</h2>
                      <p className="reel-meta">
                        {reelMovie.year ?? "Year unknown"} · {reelMovie.genres.join(" · ")}
                      </p>
                      <p>{reelMovie.description}</p>
                    </div>
                  </div>
                  <div className="reel-actions">
                    <button
                      className="reject"
                      aria-label="Dislike"
                      onClick={() => voteOnReel(reelMovie, 0)}
                    >
                      <Icon name="x" size={29} />
                    </button>
                    <button
                      className="skip-action"
                      aria-label="Skip this movie"
                      onClick={() => skipReel(reelMovie)}
                    >
                      <Icon name="skip" size={17} /> Skip
                    </button>
                    <button
                      className="accept"
                      aria-label="Like"
                      onClick={() => voteOnReel(reelMovie, 1)}
                    >
                      <Icon name="check" size={29} />
                    </button>
                  </div>
                  {voteFx && (
                    <div
                      className={`vote-feedback ${voteFx.liked ? "vote-liked" : "vote-disliked"}`}
                      key={voteFx.token}
                      aria-live="polite"
                    >
                      <div className="vote-badge">
                        <Icon name={voteFx.liked ? "check" : "x"} size={38} />
                      </div>
                      <strong>{voteFx.liked ? "LOCKED IN!" : "NEXT!"}</strong>
                      <small>{voteFx.liked ? "YOUR TASTE IS HEATING UP" : "NOT YOUR VIBE"}</small>
                      <div className="vote-particles" aria-hidden="true">
                        {Array.from({ length: 12 }).map((_, index) => (
                          <span key={index}>
                            <Icon name={voteFx.liked ? "check" : "x"} size={16} />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="finished">
                  <div>
                    <Icon name="check" size={34} />
                  </div>
                  <h2>You’re all caught up</h2>
                  <p>No more movies to show in Reels. Your recommendations are ready.</p>
                  <button className="primary-button" onClick={() => setTab("home")}>
                    See my picks
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "settings" && (
            <div className="page settings-page">
              <header className="page-header">
                <div>
                  <p className="eyebrow">PROFILE</p>
                  <h1>Your taste</h1>
                </div>
                <div className="header-actions">
                  <ThemeToggle theme={theme} setTheme={setTheme} />
                  <button className="logout-icon" onClick={logout} aria-label="Log out">
                    <Icon name="logout" />
                  </button>
                </div>
              </header>
              <section className="profile-card">
                <div className="large-avatar">{userId.slice(0, 2).toUpperCase()}</div>
                <div>
                  <h2>{userId}</h2>
                  <p>{storageKey}</p>
                </div>
                <button onClick={downloadCsv}>Export CSV</button>
              </section>
              <div className="stats">
                <div>
                  <b>{rated.filter((item) => item.liked === 1).length}</b>
                  <span>Liked</span>
                </div>
                <div>
                  <b>{rated.filter((item) => item.liked === 0).length}</b>
                  <span>Disliked</span>
                </div>
                <div>
                  <b>{rated.length}</b>
                  <span>Total</span>
                </div>
              </div>
              <div className="section-title">
                <h2>Rating history</h2>
                <span>{rated.length} movies</span>
              </div>
              <div className="ratings-table">
                <div className="table-head">
                  <span>Movie</span>
                  <span>Year</span>
                  <span>Rating</span>
                </div>
                {rated.map(({ movie, liked }) => (
                  <button key={movie.id} onClick={() => setSelected(movie)}>
                    <span>
                      <img src={movie.image} alt="" />
                      <b>{movie.title}</b>
                    </span>
                    <span>{movie.year ?? "—"}</span>
                    <span className={liked ? "liked" : "disliked"}>
                      {liked ? "Liked" : "Disliked"}
                    </span>
                  </button>
                ))}
                {!rated.length && <div className="empty-table">Your ratings will appear here.</div>}
              </div>
              <section className="danger-zone">
                <div>
                  <h3>Reset feedback</h3>
                  <p>Clear all ratings and skipped movies for this ID.</p>
                </div>
                <button onClick={() => setResetStep(1)}>
                  <Icon name="trash" size={17} /> Reset
                </button>
              </section>
              <button className="logout-button" onClick={logout}>
                <Icon name="logout" size={18} /> Log out of {userId}
              </button>
            </div>
          )}

          <nav className="bottom-nav">
            <NavButton tab="home" active={tab} onClick={setTab} icon="home" label="Home" />
            <NavButton tab="reels" active={tab} onClick={setTab} icon="play" label="Reels" />
            <NavButton
              tab="settings"
              active={tab}
              onClick={setTab}
              icon="settings"
              label="Settings"
            />
          </nav>
        </section>
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <article className="details-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-back" onClick={() => setSelected(null)}>
              <Icon name="back" size={22} />
            </button>
            <img src={selected.image} alt={`${selected.title} poster`} />
            <div className="details-shade" />
            <div className="details-copy">
              <span className="language">{selected.language}</span>
              <h2>{selected.title}</h2>
              <p className="details-meta">
                {selected.year ?? "Year unknown"} · {selected.genres.join(" · ")}
              </p>
              <p>{selected.description}</p>
              <div className="detail-actions">
                <button
                  className={feedback[selected.id] === 0 ? "chosen" : ""}
                  onClick={() => rate(selected, 0)}
                >
                  <Icon name="x" /> Not for me
                </button>
                <button
                  className={feedback[selected.id] === 1 ? "chosen" : ""}
                  onClick={() => rate(selected, 1)}
                >
                  <Icon name="heart" /> I like it
                </button>
              </div>
            </div>
          </article>
        </div>
      )}

      {resetStep > 0 && (
        <div className="confirm-backdrop">
          <div className="confirm-modal">
            <div className="warning-icon">
              <Icon name="trash" />
            </div>
            <p className="eyebrow">STEP {resetStep} OF 2</p>
            <h2>{resetStep === 1 ? "Reset your feedback?" : "Confirm your viewer ID"}</h2>
            <p>
              {resetStep === 1 ? (
                <>
                  This permanently clears every rating in <b>{storageKey}</b>. Type <b>RESET</b> to
                  continue.
                </>
              ) : (
                <>
                  For one last check, type <b>{userId}</b>.
                </>
              )}
            </p>
            <input
              autoFocus
              value={resetText}
              onChange={(e) => setResetText(e.target.value)}
              placeholder={resetStep === 1 ? "Type RESET" : `Type ${userId}`}
            />
            <div>
              <button
                onClick={() => {
                  setResetStep(0);
                  setResetText("");
                }}
              >
                Cancel
              </button>
              <button
                className="destructive"
                disabled={resetText !== (resetStep === 1 ? "RESET" : userId)}
                onClick={() => {
                  if (resetStep === 1) {
                    setResetStep(2);
                    setResetText("");
                  } else resetCsv();
                }}
              >
                {resetStep === 1 ? "Continue" : "Reset CSV"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function NavButton({
  tab,
  active,
  onClick,
  icon,
  label,
}: {
  tab: Tab;
  active: Tab;
  onClick: (tab: Tab) => void;
  icon: "home" | "play" | "settings";
  label: string;
}) {
  return (
    <button className={active === tab ? "active" : ""} onClick={() => onClick(tab)}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}) {
  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
    </button>
  );
}

export default App;

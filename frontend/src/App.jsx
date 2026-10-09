
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const SCORE_KEY = "touchgrassScore";
const HISTORY_KEY = "touchgrassHistory";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const MILESTONES = [
  { score: 50, label: "First Steps" },
  { score: 100, label: "Getting Outside" },
  { score: 250, label: "Regular Explorer" },
  { score: 500, label: "TouchGrass Veteran" },
  { score: 1000, label: "Outside Is Home" },
];

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return getDateKey(date);
}

function calculateCurrentStreak(history) {
  if (!history.length) return 0;

  const dates = [
    ...new Set(history.map((item) => item.date)),
  ].sort().reverse();

  const today = getDateKey();
  const yesterday = getDaysAgo(1);

  if (dates[0] !== today && dates[0] !== yesterday) {
    return 0;
  }

  let streak = 0;

  for (let i = 0; i < dates.length; i++) {
    const expected = getDaysAgo(
      dates[0] === today ? i : i + 1
    );

    if (dates[i] === expected) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function calculateBestStreak(history) {
  if (!history.length) return 0;

  const dates = [
    ...new Set(history.map((item) => item.date)),
  ].sort();

  let best = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const previous = new Date(`${dates[i - 1]}T00:00:00`);
    const currentDate = new Date(`${dates[i]}T00:00:00`);

    const difference = Math.round(
      (currentDate - previous) / (1000 * 60 * 60 * 24)
    );

    if (difference === 1) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

function getNextMilestone(score) {
  return MILESTONES.find((milestone) => score < milestone.score);
}

function App() {
  const [time, setTime] = useState("30");
  const [energy, setEnergy] = useState("Medium");
  const [interest, setInterest] = useState("Nature");
  const [company, setCompany] = useState("Solo");

  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [outsideMode, setOutsideMode] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  const [score, setScore] = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const savedScore = localStorage.getItem(SCORE_KEY);
    const savedHistory = localStorage.getItem(HISTORY_KEY);

    if (savedScore) {
      setScore(Number(savedScore));
    }

    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch {
        localStorage.removeItem(HISTORY_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SCORE_KEY, String(score));
  }, [score]);

  useEffect(() => {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(history)
    );
  }, [history]);

  const completedToday = history.some(
    (item) => item.date === getDateKey()
  );

  const completedMissions = history.length;

  const currentStreak = useMemo(
    () => calculateCurrentStreak(history),
    [history]
  );

  const bestStreak = useMemo(
    () => calculateBestStreak(history),
    [history]
  );

  const nextMilestone = getNextMilestone(score);

  const milestoneProgress = nextMilestone
    ? Math.min(
        100,
        Math.round((score / nextMilestone.score) * 100)
      )
    : 100;

  async function generateMission() {
    setLoading(true);
    setError("");
    setMission(null);

    try {
      const response = await fetch(
        `${API_URL}/api/mission`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            time,
            energy,
            interest,
            company,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Mission generation failed."
        );
      }

      setMission(data.mission);
    } catch (err) {
      console.error(err);
      setError(
        "Could not reach TouchGrass AI. Make sure Ollama and the backend are running."
      );
    } finally {
      setLoading(false);
    }
  }

  function completeMission() {
    if (!mission) return;

    const minutes = Number.parseInt(mission.time, 10);

    const basePoints = Math.min(
      Number.isNaN(minutes) ? 30 : minutes,
      120
    );

    const streakBonus =
      completedToday ? 0 : currentStreak * 5;

    const earnedPoints = basePoints + streakBonus;

    const item = {
      id: Date.now(),
      title: mission.title,
      description: mission.description,
      time: mission.time,
      interest,
      energy,
      company,
      points: earnedPoints,
      basePoints,
      streakBonus,
      date: getDateKey(),
      completedAt: new Date().toISOString(),
    };

    setScore((previous) => previous + earnedPoints);
    setHistory((previous) => [item, ...previous]);
    setOutsideMode(false);
    setCompleted(true);
  }

  function startNewMission() {
    setCompleted(false);
    setOutsideMode(false);
    setMission(null);
    setError("");
  }

  function resetProgress() {
    const confirmed = window.confirm(
      "Reset all TouchGrass progress?"
    );

    if (!confirmed) return;

    localStorage.removeItem(SCORE_KEY);
    localStorage.removeItem(HISTORY_KEY);

    setScore(0);
    setHistory([]);
    setMission(null);
    setCompleted(false);
    setOutsideMode(false);
  }

  if (completed && mission) {
    const latest = history[0];

    return (
      <div className="complete-mode">
        <div className="complete-inner">
          <span className="complete-label">
            TOUCHGRASS / MISSION COMPLETE
          </span>

          <div className="complete-icon">🌱</div>

          <h1>
            You touched
            <br />
            <span>grass.</span>
          </h1>

          <p>
            You spent {mission.time} away from your
            screen and back in the real world.
          </p>

          <div className="score-card">
            <span>MISSION SCORE</span>
            <strong>+{latest?.points || 0}</strong>

            {latest?.streakBonus > 0 && (
              <small>
                +{latest.streakBonus} STREAK BONUS
              </small>
            )}

            <small>TOTAL SCORE: {score}</small>
          </div>

          <div className="mini-stats">
            <div>
              <strong>{completedMissions}</strong>
              <span>MISSIONS</span>
            </div>

            <div>
              <strong>{currentStreak}</strong>
              <span>DAY STREAK</span>
            </div>

            <div>
              <strong>{bestStreak}</strong>
              <span>BEST STREAK</span>
            </div>
          </div>

          <button
            className="complete-button"
            onClick={startNewMission}
          >
            🌿 PLAN ANOTHER ESCAPE
          </button>
        </div>
      </div>
    );
  }

  if (outsideMode && mission) {
    return (
      <div className="outside-mode">
        <div className="outside-inner">
          <span className="outside-label">
            TOUCHGRASS / OUTSIDE MODE
          </span>

          <div className="outside-icon">🌳</div>

          <h1>
            Your mission
            <br />
            starts <span>now.</span>
          </h1>

          <p>
            Put your phone away.
            <br />
            Pay attention to the world around you.
          </p>

          <div className="outside-mission">
            <span>{mission.title}</span>
            <strong>{mission.time}</strong>
          </div>

          <div className="outside-reminder">
            <span>✦ FIELD NOTE</span>
            <p>
              You don't need to document this.
              <br />
              Just experience it.
            </p>
          </div>

          <button
            className="back-button"
            onClick={completeMission}
          >
            ✓ I'M BACK — MARK MISSION COMPLETE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <div className="logo">🌱 TouchGrass AI</div>

        <h1>
          <span className="less-screen">Less screen.</span>
          <span className="leaves">🍃</span>
          <br />
          <span className="leaves">🍃</span>
          <span className="more-world">More world.</span>
        </h1>

        <p>
          Your local AI companion for getting
          outside.
        </p>
      </header>

      <main>
        <section className="stats">
          <div className="stat-card">
            <span>TOUCHGRASS SCORE</span>
            <strong>{score}</strong>
            <small>POINTS</small>
          </div>

          <div className="stat-card">
            <span>MISSIONS</span>
            <strong>{completedMissions}</strong>
            <small>COMPLETED</small>
          </div>

          <div className="stat-card">
            <span>STREAK</span>
            <strong>{currentStreak}</strong>
            <small>BEST: {bestStreak}</small>
          </div>
        </section>

        <section className="today-banner">
          <div>
            <span>TODAY</span>
            <strong>
              {completedToday
                ? "You touched grass today. 🌱"
                : "The outside world is waiting."}
            </strong>
          </div>

          <span className="today-status">
            {completedToday ? "✓ COMPLETE" : "NOT YET"}
          </span>
        </section>

        {nextMilestone && (
          <section className="milestone">
            <div className="milestone-top">
              <span>NEXT MILESTONE</span>
              <strong>{nextMilestone.label}</strong>
              <span>
                {score}/{nextMilestone.score}
              </span>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${milestoneProgress}%` }}
              />
            </div>
          </section>
        )}

        {!nextMilestone && (
          <section className="milestone complete-milestone">
            <span>🏆 ALL MILESTONES REACHED</span>
            <strong>Outside Is Home</strong>
          </section>
        )}

        <section className="card">
          <h2>Plan your escape</h2>

          <p className="card-intro">
            Tell the local AI what you have.
            It will decide what you can do with it.
          </p>

          <label>How much time do you have?</label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
          </select>

          <label>What's your energy like?</label>
          <select
            value={energy}
            onChange={(e) => setEnergy(e.target.value)}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>

          <label>What sounds fun?</label>
          <select
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
          >
            <option>Nature</option>
            <option>Walking</option>
            <option>Observation</option>
            <option>Birds</option>
            <option>Gardening</option>
            <option>Running</option>
            <option>Exploring</option>
          </select>

          <label>Who are you going with?</label>
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          >
            <option>Solo</option>
            <option>Friend</option>
            <option>Family</option>
            <option>Run club</option>
          </select>

          {error && (
            <div className="error-box">{error}</div>
          )}

          <button onClick={generateMission} disabled={loading}>
            {loading
              ? "Creating your mission..."
              : "🌿 Give me a mission"}
          </button>
        </section>

        {mission && (
          <section className="mission">
            <span className="badge">YOUR MISSION</span>
            <h2>{mission.title}</h2>

            <p className="mission-description">
              {mission.description}
            </p>

            <div className="mission-meta">
              <span>⏱ {mission.time}</span>
              <span>🌿 {company}</span>
              <span>⚡ {energy}</span>
            </div>

            <div className="mission-section">
              <h3>YOUR FIELD TASK</h3>
              <ol>
                {mission.mission?.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="mission-section">
              <h3>BRING</h3>
              <ul>
                {mission.bring?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="challenge">
              <span>✳ CHALLENGE</span>
              <p>{mission.challenge}</p>
            </div>

            <div className="mission-note">
              <span>TOUCHGRASS RULE</span>
              <p>
                The mission is complete when
                you've experienced it — not when
                you've documented it.
              </p>
            </div>

            <button
              className="outside"
              onClick={() => setOutsideMode(true)}
            >
              🌳 I'M GOING OUTSIDE
            </button>
          </section>
        )}

        {history.length > 0 && (
          <section className="history">
            <div className="history-heading">
              <div>
                <span>FIELD LOG</span>
                <h2>Your escapes</h2>
              </div>

              <button
                className="reset-button"
                onClick={resetProgress}
              >
                RESET
              </button>
            </div>

            <div className="history-list">
              {history.slice(0, 7).map((item) => (
                <article
                  className="history-item"
                  key={item.id}
                >
                  <div className="history-icon">🌱</div>

                  <div className="history-content">
                    <h3>{item.title}</h3>
                    <p>
                      {item.time} · {item.interest} ·{" "}
                      {item.company}
                    </p>
                  </div>

                  <div className="history-score">
                    <strong>+{item.points}</strong>
                    <span>{item.date}</span>
                  </div>
                </article>
              ))}
            </div>

            {history.length > 7 && (
              <p className="history-footer">
                Showing your 7 most recent missions.
              </p>
            )}
          </section>
        )}

        <section className="philosophy">
          <span>WHY TOUCHGRASS?</span>
          <h2>
            The best AI interface
            <br />
            is one you stop looking at.
          </h2>
          <p>
            TouchGrass AI uses local AI to create
            a reason to leave your screen — not
            another reason to stay on it.
          </p>
        </section>

        <footer>
          <span>TOUCHGRASS AI</span>
          <span>LOCAL AI · REAL WORLD</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
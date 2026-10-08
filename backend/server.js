import "dotenv/config";
import express from "express";
import cors from "cors";
import { Ollama } from "ollama";
import { BackboardClient } from "backboard-sdk";

const app = express();

const PORT = process.env.PORT || 5000;
const OLLAMA_HOST =
  process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "gemma3:4b";

const BACKBOARD_ASSISTANT_ID =
  process.env.BACKBOARD_ASSISTANT_ID;

// -----------------------------
// Clients
// -----------------------------

const ollama = new Ollama({
  host: OLLAMA_HOST,
});

const backboard = new BackboardClient({
  apiKey: process.env.BACKBOARD_API_KEY,
});

// -----------------------------
// Middleware
// -----------------------------

app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
  })
);

app.use(express.json({ limit: "1mb" }));

// -----------------------------
// Backboard Memory
// -----------------------------

async function saveUserPreferences({
  time,
  energy,
  interest,
  company,
}) {
  if (!BACKBOARD_ASSISTANT_ID) return;

  try {
    await backboard.addMemory(BACKBOARD_ASSISTANT_ID, {
      content: `Outdoor activity preferences: ${interest} interest, ${energy} energy, ${time} minutes available, ${company} company.`,
      metadata: {
        source: "TouchGrass AI",
        type: "user_preference",
      },
    });
  } catch (error) {
    console.error(
      "Backboard memory error:",
      error.message
    );
  }
}

async function getUserMemories() {
  if (!BACKBOARD_ASSISTANT_ID) return [];

  try {
    const result = await backboard.searchMemories(
      BACKBOARD_ASSISTANT_ID,
      "outdoor activity preferences",
      5
    );

    return result.memories || [];
  } catch (error) {
    console.error(
      "Backboard retrieval error:",
      error.message
    );

    return [];
  }
}

// -----------------------------
// Routes
// -----------------------------

app.get("/", (req, res) => {
  res.json({
    name: "TouchGrass AI",
    status: "running",
    ai: "Ollama + Gemma 3",
    model: OLLAMA_MODEL,
    memory: BACKBOARD_ASSISTANT_ID
      ? "Backboard enabled"
      : "Backboard disabled",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const models = await ollama.list();

    const available = models.models?.some(
      (model) => model.name === OLLAMA_MODEL
    );

    res.json({
      success: true,
      ollama: true,
      model: OLLAMA_MODEL,
      modelAvailable: available,
      backboard: Boolean(BACKBOARD_ASSISTANT_ID),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      ollama: false,
      error: error.message,
    });
  }
});

// -----------------------------
// Prompt
// -----------------------------

function buildPrompt({
  time,
  energy,
  interest,
  company,
  memoryContext,
}) {
  return `
You are TouchGrass AI.

Your ONLY purpose is to help someone spend meaningful time outside.

Create ONE practical outdoor mission using the user's preferences.

USER:
Available time: ${time} minutes
Energy: ${energy}
Interest: ${interest}
Company: ${company}

PREVIOUS USER PREFERENCES:
${memoryContext}

Use previous preferences only when they are relevant.
Do not mention that you have memory.
Do not reveal or discuss stored user data.

CORE PHILOSOPHY:
AI should create a reason to leave the screen, not another reason to stay on it.

RULES:
- The activity MUST happen outdoors.
- It MUST fit within the available time.
- It should require little or no equipment.
- It should be safe and realistic for a college student.
- It should be specific and memorable.
- It should encourage movement, observation, exploration, nature,
  or real-world interaction.
- The user should NOT need to keep looking at their phone.
- Do NOT require taking photos.
- Do NOT require social media.
- Do NOT require internet.
- Do NOT require an app.
- Do NOT require QR codes.
- Do NOT suggest documenting the experience.
- Do NOT suggest generic "go for a walk" advice.
- Do NOT suggest dangerous places, climbing, traffic-heavy roads,
  isolated areas, or unsafe behavior.
- Give exactly 3 practical mission steps.
- Give a small challenge involving the physical environment.

RETURN ONLY VALID JSON.

EXACT STRUCTURE:

{
  "title": "Short memorable mission name",
  "description": "Two sentence description",
  "mission": [
    "Step 1",
    "Step 2",
    "Step 3"
  ],
  "time": "${time} minutes",
  "bring": [
    "Item 1",
    "Item 2"
  ],
  "challenge": "One small real-world observation challenge"
}
`;
}

// -----------------------------
// JSON helpers
// -----------------------------

function cleanJson(text) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function validateMission(mission) {
  return (
    mission &&
    typeof mission.title === "string" &&
    typeof mission.description === "string" &&
    Array.isArray(mission.mission) &&
    mission.mission.length === 3 &&
    typeof mission.time === "string" &&
    Array.isArray(mission.bring) &&
    typeof mission.challenge === "string"
  );
}

// -----------------------------
// Mission generation
// -----------------------------

app.post("/api/mission", async (req, res) => {
  try {
    const {
      time = "30",
      energy = "Medium",
      interest = "Nature",
      company = "Solo",
    } = req.body;

    // Save the current preferences
    const memories = await getUserMemories();

const memoryContext = memories.length
  ? memories
      .map((memory) => `- ${memory.content}`)
      .join("\n")
  : "No previous preferences stored.";

await saveUserPreferences({
  time,
  energy,
  interest,
  company,
});
    // Generate mission using local Gemma model
    const response = await ollama.chat({
      model: OLLAMA_MODEL,
      messages: [
        {
          role: "user",
          content: buildPrompt({
            time,
            energy,
            interest,
            company,
            memoryContext,
          }),
        },
      ],
      options: {
        temperature: 0.8,
      },
    });

    const raw = response.message?.content || "";
    const cleaned = cleanJson(raw);

    let mission;

    try {
      mission = JSON.parse(cleaned);
    } catch {
      console.error("Invalid JSON from Gemma:");
      console.error(raw);

      return res.status(502).json({
        success: false,
        error:
          "The local AI returned an invalid mission.",
      });
    }

    if (!validateMission(mission)) {
      return res.status(502).json({
        success: false,
        error:
          "The AI returned an incomplete mission.",
      });
    }

    res.json({
      success: true,
      mission,
      provider: "ollama",
      model: OLLAMA_MODEL,
      memoryEnabled: Boolean(
        BACKBOARD_ASSISTANT_ID
      ),
    });
  } catch (error) {
    console.error(
      "Mission generation error:",
      error
    );

    res.status(500).json({
      success: false,
      error:
        "Could not generate a mission. Make sure Ollama is running and Gemma 3 is installed.",
    });
  }
});

// -----------------------------
// Start server
// -----------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🌱 TouchGrass AI backend running on http://localhost:${PORT}`
  );
});
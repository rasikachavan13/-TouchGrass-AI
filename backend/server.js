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

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || "";

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

const BACKBOARD_ASSISTANT_ID =
  process.env.BACKBOARD_ASSISTANT_ID || "";


// ============================================================
// CLIENTS
// ============================================================

const ollama = new Ollama({
  host: OLLAMA_HOST,
});

const backboard = new BackboardClient({
  apiKey: process.env.BACKBOARD_API_KEY,
});


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);


// ============================================================
// BACKBOARD MEMORY
// ============================================================

async function saveUserPreferences({
  time,
  energy,
  interest,
  company,
}) {
  if (!BACKBOARD_ASSISTANT_ID) {
    return;
  }

  try {
    await backboard.addMemory(
      BACKBOARD_ASSISTANT_ID,
      {
        content:
          "Outdoor activity preferences: " +
          interest +
          " interest, " +
          energy +
          " energy, " +
          time +
          " minutes available, " +
          company +
          " company.",

        metadata: {
          source: "TouchGrass AI",
          type: "user_preference",
        },
      }
    );
  } catch (error) {
    console.error(
      "Backboard memory error:",
      error.message
    );
  }
}


async function getUserMemories() {
  if (!BACKBOARD_ASSISTANT_ID) {
    return [];
  }

  try {
    const result =
      await backboard.searchMemories(
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


// ============================================================
// HOME ROUTE
// ============================================================

app.get("/", (req, res) => {
  const provider = GEMINI_API_KEY
    ? "Gemini"
    : "Ollama + Gemma 3";

  res.json({
    name: "TouchGrass AI",
    status: "running",
    ai: provider,
    model: GEMINI_API_KEY
      ? GEMINI_MODEL
      : OLLAMA_MODEL,
    memory: BACKBOARD_ASSISTANT_ID
      ? "Backboard enabled"
      : "Backboard disabled",
  });
});


// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", async (req, res) => {

  // ----------------------------------------------------------
  // RENDER / GEMINI MODE
  // ----------------------------------------------------------

  if (GEMINI_API_KEY) {
    return res.json({
      success: true,
      provider: "gemini",
      model: GEMINI_MODEL,
      modelAvailable: true,
      backboard: Boolean(
        BACKBOARD_ASSISTANT_ID
      ),
    });
  }


  // ----------------------------------------------------------
  // LOCAL / OLLAMA MODE
  // ----------------------------------------------------------

  try {
    const models = await ollama.list();

    const available =
      models.models?.some(
        (model) =>
          model.name === OLLAMA_MODEL
      );

    return res.json({
      success: true,
      provider: "ollama",
      ollama: true,
      model: OLLAMA_MODEL,
      modelAvailable: available,
      backboard: Boolean(
        BACKBOARD_ASSISTANT_ID
      ),
    });

  } catch (error) {

    return res.status(503).json({
      success: false,
      provider: "ollama",
      ollama: false,
      error: error.message,
    });
  }
});


// ============================================================
// PROMPT
// ============================================================

function buildPrompt({
  time,
  energy,
  interest,
  company,
  memoryContext,
}) {

  return (
    "You are TouchGrass AI.\n\n" +

    "Your ONLY purpose is to help someone spend " +
    "meaningful time outside.\n\n" +

    "Create ONE practical outdoor mission using " +
    "the user's preferences.\n\n" +

    "USER:\n" +
    "Available time: " +
    time +
    " minutes\n" +

    "Energy: " +
    energy +
    "\n" +

    "Interest: " +
    interest +
    "\n" +

    "Company: " +
    company +
    "\n\n" +

    "PREVIOUS USER PREFERENCES:\n" +
    memoryContext +
    "\n\n" +

    "Use previous preferences only when they are relevant.\n" +
    "Do not mention that you have memory.\n" +
    "Do not reveal or discuss stored user data.\n\n" +

    "CORE PHILOSOPHY:\n" +
    "AI should create a reason to leave the screen, " +
    "not another reason to stay on it.\n\n" +

    "RULES:\n" +
    "- The activity MUST happen outdoors.\n" +
    "- It MUST fit within the available time.\n" +
    "- It should require little or no equipment.\n" +
    "- It should be safe and realistic for a college student.\n" +
    "- It should be specific and memorable.\n" +
    "- It should encourage movement, observation, " +
    "exploration, nature, or real-world interaction.\n" +
    "- The user should NOT need to keep looking at their phone.\n" +
    "- Do NOT require taking photos.\n" +
    "- Do NOT require social media.\n" +
    "- Do NOT require internet.\n" +
    "- Do NOT require an app.\n" +
    "- Do NOT require QR codes.\n" +
    "- Do NOT suggest documenting the experience.\n" +
    "- Do NOT suggest generic 'go for a walk' advice.\n" +
    "- Do NOT suggest dangerous places, climbing, " +
    "traffic-heavy roads, isolated areas, or unsafe behavior.\n" +
    "- Give exactly 3 practical mission steps.\n" +
    "- Give a small challenge involving the physical environment.\n\n" +

    "RETURN ONLY VALID JSON.\n\n" +

    "EXACT STRUCTURE:\n\n" +

    "{\n" +
    '  "title": "Short memorable mission name",\n' +
    '  "description": "Two sentence description",\n' +
    '  "mission": [\n' +
    '    "Step 1",\n' +
    '    "Step 2",\n' +
    '    "Step 3"\n' +
    "  ],\n" +
    '  "time": "' +
    time +
    ' minutes",' +
    "\n" +
    '  "bring": [\n' +
    '    "Item 1",\n' +
    '    "Item 2"\n' +
    "  ],\n" +
    '  "challenge": "One small real-world observation challenge"' +
    "\n" +
    "}"
  );
}


// ============================================================
// CLEAN AI JSON
// ============================================================

function cleanJson(text) {

  if (!text) {
    return "";
  }

  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}


// ============================================================
// VALIDATE MISSION
// ============================================================

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


// ============================================================
// GEMINI GENERATION WITH RETRY
// ============================================================

async function generateWithGemini(prompt) {

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    GEMINI_MODEL +
    ":generateContent?key=" +
    GEMINI_API_KEY;

  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {

    try {

      console.log(
        `Gemini generation attempt ${attempt}/3 using ${GEMINI_MODEL}`
      );

      const response = await fetch(
        url,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            contents: [
              {
                role: "user",

                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],

            generationConfig: {
              temperature: 0.8,
              responseMimeType: "application/json",
            },
          }),
        }
      );


      const data =
        await response.json();


      // --------------------------------------------------------
      // RETRY TEMPORARY GEMINI ERRORS
      // --------------------------------------------------------

      if (!response.ok) {

        const errorMessage =
          data?.error?.message ||
          JSON.stringify(data);


        if (
          (response.status === 503 ||
            response.status === 429) &&
          attempt < 3
        ) {

          console.log(
            `Gemini temporarily unavailable (${response.status}). ` +
            `Retrying in ${attempt * 2} seconds...`
          );

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                attempt * 2000
              )
          );

          continue;
        }


        throw new Error(
          "Gemini API error " +
          response.status +
          ": " +
          JSON.stringify(
            data,
            null,
            2
          )
        );
      }


      // --------------------------------------------------------
      // EXTRACT GEMINI RESPONSE
      // --------------------------------------------------------

      const text =
        data.candidates?.[0]?.content?.parts
          ?.map(
            (part) =>
              part.text || ""
          )
          .join("") || "";


      if (!text) {
        throw new Error(
          "Gemini returned an empty response."
        );
      }


      return text;


    } catch (error) {

      lastError = error;

      console.error(
        `Gemini attempt ${attempt}/3 failed:`,
        error.message
      );


      // Retry unexpected network errors.
      if (
        attempt < 3 &&
        !error.message.includes(
          "Gemini API error"
        )
      ) {

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              attempt * 2000
            )
        );

        continue;
      }


      throw error;
    }
  }


  throw (
    lastError ||
    new Error(
      "Gemini generation failed."
    )
  );
}


// ============================================================
// OLLAMA GENERATION
// ============================================================

async function generateWithOllama(prompt) {

  const response =
    await ollama.chat({

      model: OLLAMA_MODEL,

      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],

      options: {
        temperature: 0.8,
      },
    });


  return (
    response.message?.content || ""
  );
}


// ============================================================
// MISSION GENERATION
// ============================================================

app.post(
  "/api/mission",
  async (req, res) => {

    try {

      const {
        time = "30",
        energy = "Medium",
        interest = "Nature",
        company = "Solo",
      } = req.body;


      // ------------------------------------------------------
      // 1. GET PREVIOUS MEMORY
      // ------------------------------------------------------

      const memories =
        await getUserMemories();


      const memoryContext =
        memories.length
          ? memories
              .map(
                (memory) =>
                  "- " +
                  memory.content
              )
              .join("\n")
          : "No previous preferences stored.";


      // ------------------------------------------------------
      // 2. BUILD PROMPT
      // ------------------------------------------------------

      const prompt =
        buildPrompt({
          time,
          energy,
          interest,
          company,
          memoryContext,
        });


      // ------------------------------------------------------
      // 3. GENERATE USING GEMINI OR OLLAMA
      // ------------------------------------------------------

      let raw;
      let provider;
      let model;


      if (GEMINI_API_KEY) {

        raw =
          await generateWithGemini(
            prompt
          );

        provider = "gemini";
        model = GEMINI_MODEL;

      } else {

        raw =
          await generateWithOllama(
            prompt
          );

        provider = "ollama";
        model = OLLAMA_MODEL;
      }


      // ------------------------------------------------------
      // 4. CLEAN RESPONSE
      // ------------------------------------------------------

      const cleaned =
        cleanJson(raw);


      // ------------------------------------------------------
      // 5. PARSE JSON
      // ------------------------------------------------------

      let mission;

      try {

        mission =
          JSON.parse(cleaned);

      } catch (error) {

        console.error(
          "Invalid JSON returned by AI:"
        );

        console.error(raw);

        return res.status(502).json({
          success: false,
          error:
            "The AI returned an invalid mission.",
        });
      }


      // ------------------------------------------------------
      // 6. VALIDATE MISSION
      // ------------------------------------------------------

      if (!validateMission(mission)) {

        return res.status(502).json({
          success: false,
          error:
            "The AI returned an incomplete mission.",
        });
      }


      // ------------------------------------------------------
      // 7. SAVE CURRENT PREFERENCES
      // ------------------------------------------------------

      await saveUserPreferences({
        time,
        energy,
        interest,
        company,
      });


      // ------------------------------------------------------
      // 8. SEND RESPONSE
      // ------------------------------------------------------

      return res.json({

        success: true,

        mission: mission,

        provider: provider,

        model: model,

        memoryEnabled:
          Boolean(
            BACKBOARD_ASSISTANT_ID
          ),
      });


    } catch (error) {

      console.error(
        "Mission generation error:",
        error
      );

      return res.status(500).json({

        success: false,

        error:
          "Could not generate a mission. Please try again.",
      });
    }
  }
);


// ============================================================
// START SERVER
// ============================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "🌱 TouchGrass AI backend running on port " +
      PORT
    );

  }
);
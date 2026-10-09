# 🌱 TouchGrass AI

> **AI that gives you a reason to leave the screen.**

TouchGrass AI is a local-first outdoor activity companion that uses AI to generate personalized, real-world missions based on your available time, energy, interests, and company.

Instead of keeping users inside another chatbot, TouchGrass AI encourages them to **go outside, move, observe, explore, and interact with the physical world.**

🌐 **Live Demo:** https://touchgrass-ai-fq0a.onrender.com

<img width="1896" height="1004" alt="image" src="https://github.com/user-attachments/assets/db77df6b-10f8-4555-81e7-4c0727367b08" />


## ✨ What It Does

Tell TouchGrass AI:

* ⏱️ How much time you have
* ⚡ Your current energy level
* 🌿 What interests you
* 👥 Whether you're going alone or with others

The AI generates an outdoor mission tailored to your preferences.

<img width="1892" height="1001" alt="image" src="https://github.com/user-attachments/assets/f5f714c3-7c55-47e2-b30d-9b1f4d3f242e" />


Each mission includes:

* A memorable title
* A short description

<img width="1220" height="503" alt="image" src="https://github.com/user-attachments/assets/395cc57e-9524-4d30-b9f5-b8cc453c3030" />

* Three practical steps

<img width="1218" height="309" alt="image" src="https://github.com/user-attachments/assets/b58d7c02-fd91-49d2-94df-760fc80cb4f0" />

* Suggested items to bring

<img width="1196" height="203" alt="image" src="https://github.com/user-attachments/assets/43409f42-66f4-45f4-9e99-68e12fa98849" />

* A real-world observation challenge

<img width="1220" height="556" alt="image" src="https://github.com/user-attachments/assets/50078b0c-d2a8-453b-91e7-86b62249dee7" />

### Example Mission

**Quiet Campus Explorer**

Turn an ordinary walk into a deliberate exploration by observing environmental details, noticing patterns in nature, and experiencing your surroundings without digital distractions.

## 🌿 Core Features

| Feature                        | Description                                                           |
| ------------------------------ | --------------------------------------------------------------------- |
| Personalized missions          | Generate outdoor activities from user-selected preferences.           |
| Local AI inference             | Run missions locally using Ollama and Gemma 3 4B.                     |
| Cloud AI generation            | Use Gemini through the deployed backend.                              |
| Memory-powered personalization | Backboard stores and retrieves outdoor preference memories.           |
| Outside Mode                   | A distraction-free experience designed around completing the mission. |
| Mission history                | Review previously generated missions.                                 |
| TouchGrass Score               | Earn points for completing missions.                                  |
| Streaks and milestones         | Track progress and encourage consistent outdoor activity.             |
| Local persistence              | Save progress in the browser using `localStorage`.                    |



## 🧠 AI Architecture

### Local Development

<img width="818" height="510" alt="image" src="https://github.com/user-attachments/assets/20d79147-67a1-42a0-804d-53a560ef0dd0" />


The local setup supports inference on the user's machine after the required model has been downloaded. Mission history and score are stored separately in browser localStorage.

### Production Deployment

<img width="778" height="529" alt="image" src="https://github.com/user-attachments/assets/4eb252f9-597a-422d-886e-e5fcb0b0d1fb" />

The deployed application uses Gemini for cloud-based mission generation. The local Ollama setup is used for local development and testing; it is not automatically available to the cloud deployment.

## 🛠️ Tech Stack

| Component              | Technology       |
| ---------------------- | ---------------- |
| Frontend               | React, Vite, CSS |
| Backend                | Node.js, Express |
| Local inference        | Ollama           |
| Local model            | Gemma 3 4B       |
| Cloud inference        | Gemini API       |
| Preference memory      | Backboard        |
| Fine-tuning experiment | Tinker, LoRA     |
| Deployment             | Render           |
| Browser persistence    | localStorage     |

## 🧠 Tinker Fine-Tuning Experiment

TouchGrass AI also includes a domain-specific fine-tuning experiment using Tinker.

### Fine-Tuning Setup

* **Base model:** `Qwen/Qwen3.5-4B`
* **Fine-tuning method:** LoRA
* **LoRA rank:** 16
* **Training examples:** 8
* **Training steps:** 10
* **Checkpoint:** `touchgrass-v1`
* **Checkpoint type:** Sampler weights

The training examples were designed to encourage the behavior required by TouchGrass AI:

* Screen-free outdoor activities
* Safe, practical real-world experiences
* Minimal equipment requirements
* Specific, actionable instructions
* Physical-world observation challenges
* No unnecessary dependence on apps, internet access, photos, or digital navigation

### Why Fine-Tune?

A general-purpose model can suggest outdoor activities, but TouchGrass AI has a more specific goal: generate practical missions that encourage users to disconnect from their screens.

The experiment explored whether a small, domain-specific dataset could encourage more consistent adherence to these requirements.

> **AI should create a reason to leave the screen, not another reason to stay on it.**

### Evaluation and Limitations

The fine-tuned model was compared with base-model generations using the same prompts.

In the observed examples, the fine-tuned model showed stronger adherence to some screen-free and outdoor-activity constraints. However, the results were not consistently better across every dimension, including creativity and specificity.

The experiment is preliminary. With only eight training examples and ten training steps, it does not establish a general performance improvement. A larger dataset, repeatable evaluation set, and quantitative measurements would be needed to support stronger conclusions.

The fine-tuned checkpoint is a separate experiment and is **not the model currently serving missions in the live application**.

## 🔓 Why Local-First and Open Innovation?

TouchGrass AI explores how locally run AI can support a more privacy-conscious, accessible experience.

* **Local inference:** Run the local version without sending mission prompts to a cloud AI provider.
* **Privacy-conscious design:** Keep local mission history and score in browser storage.
* **Reduced API dependence:** Local generation does not require a paid cloud inference request once the model is available.
* **Model experimentation:** Explore different models and specialized fine-tuning approaches.
* **Practical AI:** Use AI to encourage real-world activity rather than maximize screen time.

Ollama provides the local inference tooling, while Gemma 3 is an open-weight model distributed under its applicable license. These are distinct from the separate cloud Gemini integration.

##  Run Locally

### Prerequisites

* Node.js and npm
* [Ollama](https://ollama.com/)
* Git

### 1. Clone the repository

```bash
git clone https://github.com/rasikachavan13/-TouchGrass-AI.git
cd -TouchGrass-AI
```

### 2. Download the local model

```bash
ollama pull gemma3:4b
```

Make sure Ollama is running before generating missions locally.

### 3. Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file using `.env.example` as a reference.

Configure the local model and, if desired, your Backboard credentials:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173

OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:4b

BACKBOARD_API_KEY=
BACKBOARD_ASSISTANT_ID=

GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
```

Start the backend:

```bash
npm start
```

### 4. Configure the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env` with:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

**Note:** The deployed application uses Gemini; local development uses Ollama. Configure the required credentials and environment variables for whichever provider you intend to use. API keys should remain on the backend, never in frontend environment variables prefixed with `VITE_`.

## 🔐 Security

* Never commit `.env` files or API keys.
* Keep provider credentials on the backend.
* Use `.env.example` to document variable names without exposing secrets.
* Avoid collecting unnecessary personal information.

## 🗺️ Roadmap

* [ ] Improve cloud-provider reliability and fallback behavior.
* [ ] Expand and systematically evaluate the fine-tuning dataset.
* [ ] Add optional cross-session preference controls.
* [ ] Improve mission accessibility and safety guidance.
* [ ] Explore additional local models and inference options.

## 💚 Project Philosophy

TouchGrass AI is built around a simple idea:

**The best AI interface for this product is one you stop looking at.**

The goal is not to create another destination for endless scrolling or chatting. It is to give people a small, meaningful reason to step away from their devices and reconnect with the world around them.

---

Built with 🌱 for the Hacktoberfest 2026 open-source AI challenge.

**Less screen. More world.**

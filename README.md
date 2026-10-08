# 🌱 TouchGrass AI

> **AI that gives you a reason to leave the screen.**

TouchGrass AI is a local-first outdoor activity companion that uses AI to generate personalized real-world missions based on your available time, energy, interests, and company.

Instead of keeping users inside another chatbot, TouchGrass AI is designed to get them **outside, moving, observing, exploring, and interacting with the physical world.**

## ✨ What It Does

Tell TouchGrass AI:

- ⏱️ How much time you have
- ⚡ Your energy level
- 🌿 What interests you
- 👥 Whether you're alone or with others

The AI generates a practical outdoor mission tailored to you.

### Example

> **Quiet Campus Explorer**

> Turn a casual walk into a deliberate exploration by focusing on environmental details without screen distraction.

The mission includes:

- A memorable title
- A short description
- Exactly 3 practical steps
- What to bring
- A real-world observation challenge

## 🧠 AI Architecture

```text
React Frontend
      ↓
Express Backend
      ↓
Ollama
      ↓
Gemma 3 4B
      ↓
Personalized Outdoor Mission

## 🧠 Tinker Fine-Tuning

TouchGrass AI also includes a domain-specific fine-tuned model created with Tinker.

### Fine-Tuning Setup

- **Base model:** Qwen/Qwen3.5-4B
- **Fine-tuning method:** LoRA
- **LoRA rank:** 16
- **Training examples:** 8
- **Training steps:** 10
- **Fine-tuned checkpoint:** `touchgrass-v1`
- **Checkpoint type:** Sampler weights

The training examples were designed to teach the model the specific behavior required by TouchGrass AI:

- Safe outdoor activities
- Screen-free experiences
- Real-world interaction
- Specific and practical missions
- Minimal equipment
- No dependence on apps, internet, photos, or digital navigation

### Why Fine-Tune?

A general-purpose model can generate outdoor activities, but TouchGrass AI needs a more specific behavior.

The fine-tuning experiment was designed to make the model more consistently follow the project's core philosophy:

> **AI should create a reason to leave the screen, not another reason to stay on it.**

### Evaluation

The fine-tuned model was tested against base-model generations using the same prompts.

The evaluation showed a noticeable shift toward:

- Screen-free instructions
- Explicit avoidance of digital devices
- Safe public outdoor activities
- Structured 3-step missions
- Physical-world observation challenges

The experiment also showed that fine-tuning did not automatically improve every dimension, such as creativity or specificity. This is an important limitation of the current small training dataset.

### Open Innovation

The fine-tuning experiment demonstrates how an open-weight base model can be specialized for a focused real-world use case without training a model from scratch.
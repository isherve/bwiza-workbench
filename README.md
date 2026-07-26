# Bwiza Workbench

**AI co-pilot for clinic front desks in Rwanda** — symptom intake, urgency triage, specialty routing, and clinician-ready notes with human-in-the-loop review.

Built for the [IBM AI Builders Challenge with IBM Bob](https://aibuilderschallenge-bob.bemyapp.com/) (July–September 2026). Extends ideas from [Ubuzima Bwiza](https://github.com/isherve/ubuzima-bwiza) healthcare work.

## Problem

Front-desk staff at clinics and health centers face long queues, inconsistent triage, and language barriers (English / Kinyarwanda). Clinicians need structured intake notes without replacing clinical judgment.

## Solution

Bwiza Workbench provides:

- **Patient chat intake** — describe symptoms in EN or RW
- **Rule-based triage engine** — urgency (low / medium / high) + specialty routing
- **Clinician note draft** — structured summary for EMR handoff
- **Human-in-the-loop** — nurse/clinician marks triage as reviewed
- **Optional LLM enhancement** — Groq API for richer note drafts when `GROQ_API_KEY` is set

> **Disclaimer:** This is an AI-assisted draft tool only. It does not diagnose or prescribe. Qualified clinicians must confirm all decisions.

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite (better-sqlite3) |
| AI (optional) | Groq OpenAI-compatible API |

## Quick start

```bash
# From repo root
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

cp .env.example .env
# Optional: add GROQ_API_KEY for LLM note enhancement

npm run dev
```

- **Frontend:** http://localhost:5174  
- **API:** http://localhost:8787  

## Demo flow

1. Switch role to **Patient intake**, enter symptoms (e.g. *"My child has had fever and cough for 2 days"*).
2. View triage result: urgency, specialty, suggested actions, clinician note.
3. Switch to **Clinician review**, verify the draft, click **Mark reviewed**.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/sessions` | Create intake session |
| GET | `/api/sessions/:id` | Session + messages + triage |
| POST | `/api/sessions/:id/messages` | Patient message → triage |
| POST | `/api/sessions/:id/review` | Clinician sign-off |

## IBM Bob integration (challenge)

This repo is structured for IBM Bob-assisted development:

1. Use **IBM Bob** to extend triage rules, add MoH-style specialty lists, or integrate with SkillsBuild modules.
2. Record a **2–3 min demo video** showing patient intake → triage → clinician review.
3. Submit on the [Challenge Hub](https://aibuilderschallenge-bobhub.bemyapp.com/) under **Future of Work** or **Wildcard**.

Suggested next steps with Bob:

- Connect real LLM via IBM watsonx / Bob trial
- Add Kinyarwanda NLP samples from local datasets
- Export triage PDF for front-desk printouts
- Role-based auth (reception vs clinician)

## Author

**Hervin ISHIMWE** — Full-Stack Developer · B.Sc. IT · Rwanda

- Portfolio: https://isherve.github.io/personal-portfolia/
- GitHub: https://github.com/isherve

## License

MIT

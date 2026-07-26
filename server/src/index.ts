import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v4 as uuid } from "uuid";
import { db } from "./db.js";
import { enhanceNoteWithLlm, runTriage } from "./triage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "..", "..", "client", "dist");

const app = express();
const PORT = Number(process.env.PORT ?? 8787);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5174";
const isProduction = process.env.NODE_ENV === "production";

app.use(
  cors({
    origin: isProduction ? true : CLIENT_ORIGIN,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "bwiza-workbench", version: "1.0.0" });
});

app.post("/api/sessions", (req, res) => {
  const id = uuid();
  const now = new Date().toISOString();
  const locale = req.body?.locale === "rw" ? "rw" : "en";
  const patientName = typeof req.body?.patientName === "string" ? req.body.patientName : null;

  db.prepare(
    "INSERT INTO sessions (id, locale, patient_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, locale, patientName, now, now);

  res.status(201).json({ id, locale, patientName, createdAt: now });
});

app.get("/api/sessions/:id", (req, res) => {
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id) as
    | { id: string; locale: string; patient_name: string | null; created_at: string }
    | undefined;

  if (!session) return res.status(404).json({ error: "Session not found" });

  const messages = db
    .prepare("SELECT id, role, content, created_at as createdAt FROM messages WHERE session_id = ? ORDER BY created_at ASC")
    .all(session.id);

  const triage = db
    .prepare(
      "SELECT urgency, specialty, summary, suggested_actions as suggestedActions, clinician_note as clinicianNote, reviewed, reviewed_by as reviewedBy, created_at as createdAt FROM triage_results WHERE session_id = ?",
    )
    .get(session.id) as Record<string, unknown> | undefined;

  res.json({
    id: session.id,
    locale: session.locale,
    patientName: session.patient_name,
    createdAt: session.created_at,
    messages,
    triage: triage
      ? {
          ...triage,
          suggestedActions: JSON.parse(String(triage.suggestedActions)),
          reviewed: Boolean(triage.reviewed),
        }
      : null,
  });
});

app.post("/api/sessions/:id/messages", async (req, res) => {
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const content = String(req.body?.content ?? "").trim();
  if (!content) return res.status(400).json({ error: "Message content is required" });

  const messageId = uuid();
  const now = new Date().toISOString();

  db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
    messageId,
    req.params.id,
    "patient",
    content,
    now,
  );

  db.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(now, req.params.id);

  const history = db
    .prepare("SELECT content FROM messages WHERE session_id = ? AND role = 'patient' ORDER BY created_at ASC")
    .all(req.params.id)
    .map((row: { content: string }) => row.content);

  const triage = runTriage(content, history.slice(0, -1));
  let clinicianNote = triage.clinicianNote;
  const enhanced = await enhanceNoteWithLlm(clinicianNote, content);
  if (enhanced) clinicianNote = enhanced;

  db.prepare(
    `INSERT INTO triage_results (session_id, urgency, specialty, summary, suggested_actions, clinician_note, reviewed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       urgency = excluded.urgency,
       specialty = excluded.specialty,
       summary = excluded.summary,
       suggested_actions = excluded.suggested_actions,
       clinician_note = excluded.clinician_note,
       reviewed = 0,
       reviewed_by = NULL,
       created_at = excluded.created_at`,
  ).run(
    req.params.id,
    triage.urgency,
    triage.specialty,
    triage.summary,
    JSON.stringify(triage.suggestedActions),
    clinicianNote,
    now,
  );

  const assistantReply =
    req.body?.locale === "rw"
      ? `Murakoze. Dusuzuma ibimenyetso byanyu. Ubwitabire: ${triage.urgency.toUpperCase()}. Inama: ${triage.specialty}. Umuganga azabishyira mu gihe cy'ukuri.`
      : `Thank you. I've analyzed your symptoms. Urgency: ${triage.urgency.toUpperCase()}. Suggested specialty: ${triage.specialty}. A clinician will confirm before any final decision.`;

  const assistantId = uuid();
  db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
    assistantId,
    req.params.id,
    "assistant",
    assistantReply,
    now,
  );

  res.json({
    message: { id: messageId, role: "patient", content, createdAt: now },
    assistant: { id: assistantId, role: "assistant", content: assistantReply, createdAt: now },
    triage: { ...triage, clinicianNote, reviewed: false },
  });
});

app.post("/api/sessions/:id/review", (req, res) => {
  const reviewedBy = String(req.body?.reviewedBy ?? "Clinician").trim();
  const existing = db.prepare("SELECT session_id FROM triage_results WHERE session_id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "No triage result to review" });

  db.prepare("UPDATE triage_results SET reviewed = 1, reviewed_by = ? WHERE session_id = ?").run(
    reviewedBy,
    req.params.id,
  );

  res.json({ ok: true, reviewedBy });
});

if (isProduction) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Bwiza Workbench API running on http://localhost:${PORT}`);
});

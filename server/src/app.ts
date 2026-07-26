import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v4 as uuid } from "uuid";
import { store } from "./store.js";
import { enhanceNoteWithLlm, runTriage } from "./triage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "..", "..", "client", "dist");

export function createApp() {
  const app = express();
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

    store.createSession(id, locale, patientName, now);
    res.status(201).json({ id, locale, patientName, createdAt: now });
  });

  app.get("/api/sessions/:id", (req, res) => {
    const session = store.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const messages = store.getMessages(session.id).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    }));

    const triage = store.getTriage(session.id);

    res.json({
      id: session.id,
      locale: session.locale,
      patientName: session.patient_name,
      createdAt: session.created_at,
      messages,
      triage: triage
        ? {
            urgency: triage.urgency,
            specialty: triage.specialty,
            summary: triage.summary,
            suggestedActions: JSON.parse(triage.suggested_actions),
            clinicianNote: triage.clinician_note,
            reviewed: Boolean(triage.reviewed),
            reviewedBy: triage.reviewed_by,
            createdAt: triage.created_at,
          }
        : null,
    });
  });

  app.post("/api/sessions/:id/messages", async (req, res) => {
    const session = store.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const content = String(req.body?.content ?? "").trim();
    if (!content) return res.status(400).json({ error: "Message content is required" });

    const messageId = uuid();
    const now = new Date().toISOString();

    store.addMessage(messageId, req.params.id, "patient", content, now);
    store.updateSessionTime(req.params.id, now);

    const history = store.getPatientMessageContents(req.params.id);
    const triage = runTriage(content, history.slice(0, -1));
    let clinicianNote = triage.clinicianNote;
    const enhanced = await enhanceNoteWithLlm(clinicianNote, content);
    if (enhanced) clinicianNote = enhanced;

    store.upsertTriage({
      session_id: req.params.id,
      urgency: triage.urgency,
      specialty: triage.specialty,
      summary: triage.summary,
      suggested_actions: JSON.stringify(triage.suggestedActions),
      clinician_note: clinicianNote,
      reviewed: 0,
      reviewed_by: null,
      created_at: now,
    });

    const assistantReply =
      req.body?.locale === "rw"
        ? `Murakoze. Dusuzuma ibimenyetso byanyu. Ubwitabire: ${triage.urgency.toUpperCase()}. Inama: ${triage.specialty}. Umuganga azabishyira mu gihe cy'ukuri.`
        : `Thank you. I've analyzed your symptoms. Urgency: ${triage.urgency.toUpperCase()}. Suggested specialty: ${triage.specialty}. A clinician will confirm before any final decision.`;

    const assistantId = uuid();
    store.addMessage(assistantId, req.params.id, "assistant", assistantReply, now);

    res.json({
      message: { id: messageId, role: "patient", content, createdAt: now },
      assistant: { id: assistantId, role: "assistant", content: assistantReply, createdAt: now },
      triage: { ...triage, clinicianNote, reviewed: false },
    });
  });

  app.post("/api/sessions/:id/review", (req, res) => {
    const reviewedBy = String(req.body?.reviewedBy ?? "Clinician").trim();
    const existing = store.getTriage(req.params.id);
    if (!existing) return res.status(404).json({ error: "No triage result to review" });

    store.markReviewed(req.params.id, reviewedBy);
    res.json({ ok: true, reviewedBy });
  });

  if (isProduction && process.env.VERCEL !== "1" && process.env.VERCEL !== "true") {
    app.use(express.static(clientDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  return app;
}

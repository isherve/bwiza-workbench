import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Store, SessionRow, MessageRow, TriageRow } from "./store-types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "bwiza.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    locale TEXT NOT NULL DEFAULT 'en',
    patient_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS triage_results (
    session_id TEXT PRIMARY KEY,
    urgency TEXT NOT NULL,
    specialty TEXT NOT NULL,
    summary TEXT NOT NULL,
    suggested_actions TEXT NOT NULL,
    clinician_note TEXT NOT NULL,
    reviewed INTEGER NOT NULL DEFAULT 0,
    reviewed_by TEXT,
    created_at TEXT NOT NULL
  );
`);

export const sqliteStore: Store = {
  createSession(id, locale, patientName, now) {
    db.prepare(
      "INSERT INTO sessions (id, locale, patient_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run(id, locale, patientName, now, now);
  },
  getSession(id) {
    return db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow | undefined;
  },
  updateSessionTime(id, now) {
    db.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(now, id);
  },
  addMessage(id, sessionId, role, content, now) {
    db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
      id,
      sessionId,
      role,
      content,
      now,
    );
  },
  getMessages(sessionId) {
    return db
      .prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC")
      .all(sessionId) as MessageRow[];
  },
  getPatientMessageContents(sessionId) {
    return db
      .prepare("SELECT content FROM messages WHERE session_id = ? AND role = 'patient' ORDER BY created_at ASC")
      .all(sessionId)
      .map((row: { content: string }) => row.content);
  },
  upsertTriage(row: TriageRow) {
    db.prepare(
      `INSERT INTO triage_results (session_id, urgency, specialty, summary, suggested_actions, clinician_note, reviewed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
      row.session_id,
      row.urgency,
      row.specialty,
      row.summary,
      row.suggested_actions,
      row.clinician_note,
      row.reviewed,
      row.created_at,
    );
  },
  getTriage(sessionId) {
    return db.prepare("SELECT * FROM triage_results WHERE session_id = ?").get(sessionId) as TriageRow | undefined;
  },
  markReviewed(sessionId, reviewedBy) {
    db.prepare("UPDATE triage_results SET reviewed = 1, reviewed_by = ? WHERE session_id = ?").run(
      reviewedBy,
      sessionId,
    );
  },
};

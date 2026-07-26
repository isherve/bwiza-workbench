import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";

type SessionRow = {
  id: string;
  locale: string;
  patient_name: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
};

type TriageRow = {
  session_id: string;
  urgency: string;
  specialty: string;
  summary: string;
  suggested_actions: string;
  clinician_note: string;
  reviewed: number;
  reviewed_by: string | null;
  created_at: string;
};

export type Store = {
  createSession(id: string, locale: string, patientName: string | null, now: string): void;
  getSession(id: string): SessionRow | undefined;
  updateSessionTime(id: string, now: string): void;
  addMessage(id: string, sessionId: string, role: string, content: string, now: string): void;
  getMessages(sessionId: string): MessageRow[];
  getPatientMessageContents(sessionId: string): string[];
  upsertTriage(row: TriageRow): void;
  getTriage(sessionId: string): TriageRow | undefined;
  markReviewed(sessionId: string, reviewedBy: string): void;
};

function createMemoryStore(): Store {
  const sessions = new Map<string, SessionRow>();
  const messages = new Map<string, MessageRow>();
  const triage = new Map<string, TriageRow>();

  return {
    createSession(id, locale, patientName, now) {
      sessions.set(id, { id, locale, patient_name: patientName, created_at: now, updated_at: now });
    },
    getSession(id) {
      return sessions.get(id);
    },
    updateSessionTime(id, now) {
      const session = sessions.get(id);
      if (session) session.updated_at = now;
    },
    addMessage(id, sessionId, role, content, now) {
      messages.set(id, { id, session_id: sessionId, role, content, created_at: now });
    },
    getMessages(sessionId) {
      return [...messages.values()]
        .filter((m) => m.session_id === sessionId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
    getPatientMessageContents(sessionId) {
      return this.getMessages(sessionId)
        .filter((m) => m.role === "patient")
        .map((m) => m.content);
    },
    upsertTriage(row) {
      triage.set(row.session_id, row);
    },
    getTriage(sessionId) {
      return triage.get(sessionId);
    },
    markReviewed(sessionId, reviewedBy) {
      const row = triage.get(sessionId);
      if (row) {
        row.reviewed = 1;
        row.reviewed_by = reviewedBy;
      }
    },
  };
}

function createSqliteStore(): Store {
  const Database = require("better-sqlite3") as typeof import("better-sqlite3").default;
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

  return {
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
    upsertTriage(row) {
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
}

export const store: Store = isVercel ? createMemoryStore() : createSqliteStore();

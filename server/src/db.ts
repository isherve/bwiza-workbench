import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "bwiza.db");

export const db = new Database(dbPath);

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
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
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
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );
`);

import type { Store, TriageRow } from "./store-types.js";

const sessions = new Map<string, { id: string; locale: string; patient_name: string | null; created_at: string; updated_at: string }>();
const messages = new Map<string, { id: string; session_id: string; role: string; content: string; created_at: string }>();
const triage = new Map<string, TriageRow>();

export const memoryStore: Store = {
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

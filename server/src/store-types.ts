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

export type { SessionRow, MessageRow, TriageRow };

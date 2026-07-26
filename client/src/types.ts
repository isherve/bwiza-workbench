export type Locale = "en" | "rw";
export type Role = "patient" | "clinician";

export type Urgency = "low" | "medium" | "high";

export type TriageResult = {
  urgency: Urgency;
  specialty: string;
  summary: string;
  suggestedActions: string[];
  clinicianNote: string;
  reviewed: boolean;
  reviewedBy?: string | null;
};

export type ChatMessage = {
  id: string;
  role: "patient" | "assistant";
  content: string;
  createdAt: string;
};

export type Session = {
  id: string;
  locale: Locale;
  patientName: string | null;
  messages: ChatMessage[];
  triage: TriageResult | null;
};

export const copy = {
  en: {
    title: "Bwiza Workbench",
    tagline: "Clinic front-desk AI co-pilot for Rwanda",
    patient: "Patient intake",
    clinician: "Clinician review",
    namePlaceholder: "Patient name (optional)",
    inputPlaceholder: "Describe symptoms (e.g. fever and cough for 2 days)...",
    send: "Send",
    startNew: "New session",
    urgency: "Urgency",
    specialty: "Suggested specialty",
    actions: "Suggested actions",
    note: "Clinician note draft",
    review: "Mark reviewed",
    reviewed: "Reviewed by",
    disclaimer:
      "AI-assisted triage draft only. A qualified clinician must confirm all routing and care decisions.",
    empty: "Start by describing symptoms. Triage runs after each patient message.",
    low: "Low",
    medium: "Medium",
    high: "High",
  },
  rw: {
    title: "Bwiza Workbench",
    tagline: "Ubufasha bwa AI ku biro by'ibitaro mu Rwanda",
    patient: "Kwakira umurwayi",
    clinician: "Isuzuma ry'umuganga",
    namePlaceholder: "Izina ry'umurwayi (ntibisabwa)",
    inputPlaceholder: "Sobanura ibimenyetso (urug. umuriro n'inkorora iminsi 2)...",
    send: "Ohereza",
    startNew: "Gutangira indi session",
    urgency: "Ubwitabire",
    specialty: "Ishami risabwa",
    actions: "Ibikorwa byasabwe",
    note: "Inyandiko y'umuganga",
    review: "Emeza isuzuma",
    reviewed: "Byemejwe na",
    disclaimer:
      "Ibi ni inyandiko y'ubufasha bwa AI gusa. Umuganga wemewe agomba kwemeza ibyemezo byose.",
    empty: "Tangira usobanura ibimenyetso. Isuzuma rikorwa nyuma y'ubutumwa bw'umurwayi.",
    low: "Hasi",
    medium: "Hagati",
    high: "Hejuru",
  },
} as const;

export function urgencyColor(u: Urgency) {
  if (u === "high") return "bg-rose-500/20 text-rose-300 border-rose-500/40";
  if (u === "medium") return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
}

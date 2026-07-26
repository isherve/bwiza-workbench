export type Urgency = "low" | "medium" | "high";
export type Specialty =
  | "General Practice"
  | "Pediatrics"
  | "Obstetrics & Gynecology"
  | "Internal Medicine"
  | "Emergency";

export type TriageResult = {
  urgency: Urgency;
  specialty: Specialty;
  summary: string;
  suggestedActions: string[];
  clinicianNote: string;
  matchedSignals: string[];
};

const emergencyKeywords = [
  "chest pain",
  "difficulty breathing",
  "can't breathe",
  "unconscious",
  "severe bleeding",
  "seizure",
  "stroke",
  "kubabara",
  "ntacyashobora guhumeka",
];

const pediatricKeywords = ["child", "baby", "infant", "umwana", "akana", "years old", "amezi"];

const obgynKeywords = ["pregnant", "pregnancy", "menstrual", "gutwita", "ubuzima bw'umugore", "period pain"];

const internalKeywords = ["diabetes", "hypertension", "fever", "cough", "malaria", "umuriro", "inkorora"];

function includesAny(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function runTriage(symptoms: string, history: string[] = []): TriageResult {
  const combined = [symptoms, ...history].join(" ").toLowerCase();

  let urgency: Urgency = "low";
  let specialty: Specialty = "General Practice";
  const matchedSignals: string[] = [];

  if (includesAny(combined, emergencyKeywords)) {
    urgency = "high";
    specialty = "Emergency";
    matchedSignals.push("Emergency indicators detected");
  } else if (includesAny(combined, pediatricKeywords)) {
    specialty = "Pediatrics";
    matchedSignals.push("Pediatric context");
    urgency = includesAny(combined, ["fever", "vomiting", "dehydration"]) ? "medium" : "low";
  } else if (includesAny(combined, obgynKeywords)) {
    specialty = "Obstetrics & Gynecology";
    matchedSignals.push("Women's health context");
    urgency = includesAny(combined, ["bleeding", "severe pain"]) ? "high" : "medium";
  } else if (includesAny(combined, internalKeywords)) {
    specialty = "Internal Medicine";
    matchedSignals.push("General medical symptoms");
    urgency = includesAny(combined, ["high fever", "persistent", "severe"]) ? "medium" : "low";
  }

  if (urgency === "low" && includesAny(combined, ["severe", "worsening", "3 days", "week"])) {
    urgency = "medium";
    matchedSignals.push("Duration/severity escalation");
  }

  const summary = buildSummary(symptoms, urgency, specialty);
  const suggestedActions = buildActions(urgency, specialty);
  const clinicianNote = buildClinicianNote(symptoms, urgency, specialty, matchedSignals);

  return { urgency, specialty, summary, suggestedActions, clinicianNote, matchedSignals };
}

function buildSummary(symptoms: string, urgency: Urgency, specialty: Specialty) {
  return `Patient reports: ${symptoms.trim()}. Triage suggests ${urgency} urgency with referral to ${specialty}. Clinician confirmation required before final diagnosis.`;
}

function buildActions(urgency: Urgency, specialty: Specialty): string[] {
  const base = [
    `Route to ${specialty} for evaluation`,
    "Capture vitals and allergy history at front desk",
    "Schedule appointment or direct to waiting area based on queue",
  ];
  if (urgency === "high") {
    return ["Escalate immediately to emergency triage nurse", "Prepare rapid assessment bay", ...base];
  }
  if (urgency === "medium") {
    return ["Prioritize same-day appointment slot", "Provide hydration/rest guidance while waiting", ...base];
  }
  return ["Offer standard appointment within 24–72 hours", "Share self-care guidance if appropriate", ...base];
}

function buildClinicianNote(
  symptoms: string,
  urgency: Urgency,
  specialty: Specialty,
  signals: string[],
) {
  return [
    "CHIEF CONCERN (patient-reported):",
    symptoms.trim(),
    "",
    "AI TRIAGE DRAFT:",
    `- Urgency: ${urgency.toUpperCase()}`,
    `- Suggested specialty: ${specialty}`,
    `- Signals: ${signals.join("; ") || "General intake"}`,
    "",
    "PLAN (requires clinician review):",
    "- Verify symptoms and red flags in person",
    "- Confirm specialty routing and urgency",
    "- Document final decision in EMR",
    "",
    "Disclaimer: AI-assisted draft only — not a medical diagnosis.",
  ].join("\n");
}

export async function enhanceNoteWithLlm(note: string, symptoms: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are a clinical documentation assistant for Rwanda clinics. Improve the draft note for clarity. Keep it concise. Never provide a final diagnosis. Always include a disclaimer.",
          },
          {
            role: "user",
            content: `Symptoms: ${symptoms}\n\nDraft note:\n${note}`,
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

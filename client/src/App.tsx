import { useCallback, useEffect, useMemo, useState } from "react";
import { copy, Locale, Role, Session, urgencyColor } from "./types";

async function createSession(locale: Locale, patientName: string) {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale, patientName: patientName || null }),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json() as Promise<{ id: string }>;
}

async function fetchSession(id: string) {
  const res = await fetch(`/api/sessions/${id}`);
  if (!res.ok) throw new Error("Failed to load session");
  return res.json() as Promise<Session>;
}

async function sendMessage(sessionId: string, content: string, locale: Locale) {
  const res = await fetch(`/api/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, locale }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

async function markReviewed(sessionId: string, reviewedBy: string) {
  const res = await fetch(`/api/sessions/${sessionId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviewedBy }),
  });
  if (!res.ok) throw new Error("Failed to mark reviewed");
}

export default function App() {
  const [locale, setLocale] = useState<Locale>("en");
  const [role, setRole] = useState<Role>("patient");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [patientName, setPatientName] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [reviewedBy, setReviewedBy] = useState("Nurse / Clinician");

  const t = useMemo(() => copy[locale], [locale]);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const { id } = await createSession(locale, patientName);
      setSessionId(id);
      const data = await fetchSession(id);
      setSession(data);
    } finally {
      setLoading(false);
    }
  }, [locale, patientName]);

  useEffect(() => {
    void bootstrap();
  }, []);

  const handleSend = async () => {
    if (!sessionId || !input.trim() || role !== "patient") return;
    setLoading(true);
    try {
      await sendMessage(sessionId, input.trim(), locale);
      setInput("");
      const data = await fetchSession(sessionId);
      setSession(data);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!sessionId || !session?.triage) return;
    setLoading(true);
    try {
      await markReviewed(sessionId, reviewedBy);
      const data = await fetchSession(sessionId);
      setSession(data);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = async () => {
    setInput("");
    await bootstrap();
  };

  const triage = session?.triage;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-teal-400">IBM AI Builders Challenge</p>
            <h1 className="text-2xl font-bold text-white">{t.title}</h1>
            <p className="text-sm text-slate-400">{t.tagline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
            >
              <option value="en">English</option>
              <option value="rw">Kinyarwanda</option>
            </select>
            <div className="flex rounded-lg border border-white/10 p-1">
              {(["patient", "clinician"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${
                    role === r ? "bg-teal-600 text-white" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {r === "patient" ? t.patient : t.clinician}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleNewSession()}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
            >
              {t.startNew}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-5">
        <section className="lg:col-span-3 rounded-2xl border border-white/10 bg-black/30 p-4 shadow-xl">
          {role === "patient" && (
            <input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="mb-4 w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2 text-sm outline-none focus:border-teal-500"
            />
          )}

          <div className="mb-4 h-[420px] space-y-3 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/60 p-4">
            {session?.messages.length ? (
              session.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "patient"
                      ? "ml-auto bg-teal-700/40 text-teal-50"
                      : "mr-auto bg-slate-800 text-slate-100"
                  }`}
                >
                  {m.content}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">{t.empty}</p>
            )}
          </div>

          {role === "patient" ? (
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleSend()}
                placeholder={t.inputPlaceholder}
                className="flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm outline-none focus:border-teal-500"
              />
              <button
                type="button"
                disabled={loading || !input.trim()}
                onClick={() => void handleSend()}
                className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {t.send}
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t.disclaimer}</p>
          )}
        </section>

        <aside className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">{t.clinician}</h2>
            {triage ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${urgencyColor(triage.urgency)}`}>
                    {t.urgency}: {t[triage.urgency]}
                  </span>
                  <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs text-sky-200">
                    {t.specialty}: {triage.specialty}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{triage.summary}</p>
                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">{t.actions}</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {triage.suggestedActions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">{t.note}</h3>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950/80 p-3 text-xs text-slate-300">
                    {triage.clinicianNote}
                  </pre>
                </div>
                {role === "clinician" && (
                  <div className="space-y-2 border-t border-white/10 pt-4">
                    <input
                      value={reviewedBy}
                      onChange={(e) => setReviewedBy(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                      placeholder="Reviewer name"
                    />
                    <button
                      type="button"
                      disabled={loading || triage.reviewed}
                      onClick={() => void handleReview()}
                      className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      {triage.reviewed ? `${t.reviewed} ${triage.reviewedBy}` : t.review}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t.empty}</p>
            )}
          </div>

          <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-100/90">
            {t.disclaimer}
          </p>
        </aside>
      </main>
    </div>
  );
}

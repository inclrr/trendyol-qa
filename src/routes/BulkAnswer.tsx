import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type AnswerTemplate, type StoredQuestion, type SubmitAnswerResult } from "../api/tauri";
import { ChevronLeft, Send, Sparkles } from "../components/icons";

type Mode = "ai" | "template";

interface Row {
  question: StoredQuestion;
  text: string;
  state: "ready" | "skipped" | "success" | "failed";
  message?: string;
}

export default function BulkAnswer() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("ai");
  const [rows, setRows] = useState<Row[]>([]);
  const [templates, setTemplates] = useState<AnswerTemplate[]>([]);
  const [tplId, setTplId] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    const ids: number[] = JSON.parse(sessionStorage.getItem("bulk:ids") ?? "[]");
    if (ids.length === 0) {
      nav("/inbox");
      return;
    }
    (async () => {
      const fetched = await Promise.all(ids.map((id) => api.getQuestion(id)));
      const valid = fetched.filter((q): q is StoredQuestion => !!q);
      setRows(
        valid.map((q) => ({
          question: q,
          text: "",
          state: q.status === "WAITING_FOR_ANSWER" ? "ready" : "skipped",
          message:
            q.status === "WAITING_FOR_ANSWER"
              ? undefined
              : "Cevaplanamaz statü",
        }))
      );
    })();
    api.listTemplates().then(setTemplates);
  }, []);

  function applyTemplateToAll() {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;
    setRows((rs) =>
      rs.map((r) =>
        r.state === "ready" ? { ...r, text: tpl.body } : r
      )
    );
  }

  async function generateAll() {
    setGenerating(true);
    const targets = rows.filter((r) => r.state === "ready");
    for (let i = 0; i < targets.length; i++) {
      const row = targets[i];
      try {
        const out = await api.generateAnswer(row.question.questionId);
        setRows((rs) =>
          rs.map((r) =>
            r.question.questionId === row.question.questionId
              ? { ...r, text: out }
              : r
          )
        );
      } catch (e: any) {
        setRows((rs) =>
          rs.map((r) =>
            r.question.questionId === row.question.questionId
              ? { ...r, message: String(e) }
              : r
          )
        );
      }
    }
    setGenerating(false);
  }

  async function sendAll() {
    setBusy(true);
    const targets = rows.filter(
      (r) => r.state === "ready" && r.text.trim().length >= 10
    );
    setProgress({ done: 0, total: targets.length });

    const payload = targets.map((r) => ({
      questionId: r.question.questionId,
      text: r.text,
    }));

    try {
      const results = await api.submitBulkAnswers(payload);
      const byId = new Map<number, SubmitAnswerResult>();
      results.forEach((r) => byId.set(r.questionId, r));
      setRows((rs) =>
        rs.map((r) => {
          const res = byId.get(r.question.questionId);
          if (!res) return r;
          return {
            ...r,
            state: res.success ? "success" : "failed",
            message: res.message,
          };
        })
      );
      setProgress({ done: results.length, total: targets.length });
    } catch (e: any) {
      alert(String(e));
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4 p-6">
      <button onClick={() => nav(-1)} className="btn-ghost">
        <ChevronLeft className="mr-1 h-4 w-4" /> {t("app.back")}
      </button>
      <h2 className="text-xl font-semibold">{t("bulk.title")}</h2>

      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t("bulk.mode")}:</span>
          <button
            onClick={() => setMode("ai")}
            className={`btn ${mode === "ai" ? "bg-brand text-brand-fg" : "btn-ghost"}`}
          >
            {t("bulk.modeAi")}
          </button>
          <button
            onClick={() => setMode("template")}
            className={`btn ${mode === "template" ? "bg-brand text-brand-fg" : "btn-ghost"}`}
          >
            {t("bulk.modeTemplate")}
          </button>
        </div>

        {mode === "template" && (
          <div className="flex items-center gap-2">
            <select
              className="input max-w-md"
              value={tplId}
              onChange={(e) => setTplId(Number(e.target.value))}
            >
              <option value="">{t("bulk.selectTemplate")}</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id ?? 0}>
                  {tpl.title}
                </option>
              ))}
            </select>
            <button onClick={applyTemplateToAll} className="btn-secondary">
              Tümüne Uygula
            </button>
          </div>
        )}
        {mode === "ai" && (
          <div className="flex items-center gap-2">
            <button
              onClick={generateAll}
              disabled={generating}
              className="btn-secondary"
            >
              <Sparkles className="mr-1 h-4 w-4" />
              {generating ? t("question.generating") : t("bulk.generateAll")}
            </button>
            <span className="text-xs text-muted">
              Her soru için ayrı AI çağrısı yapılır. Eğitim verisi ve müşteri sohbet geçmişi otomatik kullanılır.
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={sendAll}
            disabled={busy || rows.filter((r) => r.state === "ready").length === 0}
            className="btn-primary"
          >
            <Send className="mr-1 h-4 w-4" />
            {busy ? t("question.sending") : t("bulk.sendAll")}
          </button>
          {progress.total > 0 && (
            <span className="text-sm text-muted">
              {t("bulk.progress", { done: progress.done, total: progress.total })}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.question.questionId} className="card space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="text-xs text-muted">
                  {r.question.storeName} · {r.question.customerName}
                </div>
                <div className="text-sm">{r.question.text}</div>
              </div>
              <span
                className={`badge ${
                  r.state === "success"
                    ? "bg-success/15 text-success"
                    : r.state === "failed"
                    ? "bg-danger/15 text-danger"
                    : r.state === "skipped"
                    ? "bg-muted/15 text-muted"
                    : "bg-bg-elev-2 text-muted"
                }`}
              >
                {t(`bulk.${r.state}`)}
              </span>
            </div>
            <textarea
              rows={3}
              className="input"
              value={r.text}
              disabled={r.state !== "ready"}
              onChange={(e) =>
                setRows((rs) =>
                  rs.map((row) =>
                    row.question.questionId === r.question.questionId
                      ? { ...row, text: e.target.value }
                      : row
                  )
                )
              }
            />
            {r.message && (
              <div className="text-xs text-muted">{r.message}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

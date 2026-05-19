import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type AnswerTemplate } from "../api/tauri";
import { Send, Sparkles } from "./icons";

interface Props {
  questionId: number;
  questionStatus: string;
  onSent: () => void;
}

type Mode = "manual" | "template" | "ai";

export default function AnswerComposer({ questionId, questionStatus, onSent }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("manual");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<AnswerTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | "">("");
  const canAnswer = questionStatus === "WAITING_FOR_ANSWER";

  useEffect(() => {
    api.listTemplates().then(setTemplates).catch(() => {});
  }, []);

  function pickTemplate(id: number) {
    setSelectedTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) setText(tpl.body);
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const out = await api.generateAnswer(questionId);
      setText(out);
    } catch (e: any) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function send() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.submitAnswer(questionId, text);
      if (res.success) {
        setText("");
        onSent();
      } else {
        setError(res.message);
      }
    } catch (e: any) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  const charCount = text.length;
  const valid = charCount >= 10 && charCount <= 2000;

  if (!canAnswer) {
    return (
      <div className="card border-warning/30 bg-warning/10 text-sm">
        <strong>{t("question.cannotAnswer")}</strong>
        <p className="mt-1 text-muted">
          {questionStatus === "ANSWERED" ? t("question.answeredAlready") : ""}
        </p>
      </div>
    );
  }

  const modes: { value: Mode; label: string }[] = [
    { value: "manual", label: t("question.manual") },
    { value: "template", label: t("question.template") },
    { value: "ai", label: t("question.ai") },
  ];

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-1 border-b border-border pb-3">
        {modes.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`btn ${
              mode === m.value ? "bg-brand text-brand-fg" : "btn-ghost"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "template" && (
        <div>
          <label className="label">{t("question.useTemplate")}</label>
          <select
            className="input"
            value={selectedTemplateId}
            onChange={(e) => pickTemplate(Number(e.target.value))}
          >
            <option value="">—</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id ?? 0}>
                {tpl.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === "ai" && (
        <div className="flex items-center gap-2">
          <button
            onClick={generate}
            disabled={generating}
            className="btn-secondary"
          >
            <Sparkles className="mr-1 h-4 w-4" />
            {generating ? t("question.generating") : t("question.generate")}
          </button>
        </div>
      )}

      <textarea
        rows={6}
        className="input resize-y"
        placeholder="Cevap metnini yazın…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex items-center justify-between text-xs">
        <span className={charCount > 2000 ? "text-danger" : "text-muted"}>
          {t("question.characterCount", { count: charCount })}
        </span>
        <button
          onClick={send}
          disabled={!valid || busy}
          className="btn-primary"
        >
          <Send className="mr-1 h-4 w-4" />
          {busy ? t("question.sending") : t("question.send")}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
    </div>
  );
}

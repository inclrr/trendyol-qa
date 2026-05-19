import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type AnswerTemplate } from "../api/tauri";
import { Send, Sparkles } from "./icons";

interface Props {
  questionId: number;
  questionStatus: string;
  onSent: () => void;
  productName?: string | null;
  customerName?: string | null;
  storeName?: string | null;
}

type Mode = "manual" | "template" | "ai";

const DRAFT_KEY_PREFIX = "draft-question-";

function applyTemplateVariables(
  body: string,
  ctx: { musteri: string; urun: string; magaza: string; tarih: string }
): string {
  return body
    .replace(/\{\{\s*musteri\s*\}\}/gi, ctx.musteri)
    .replace(/\{\{\s*urun\s*\}\}/gi, ctx.urun)
    .replace(/\{\{\s*magaza\s*\}\}/gi, ctx.magaza)
    .replace(/\{\{\s*tarih\s*\}\}/gi, ctx.tarih);
}

export default function AnswerComposer({
  questionId,
  questionStatus,
  onSent,
  productName,
  customerName,
  storeName,
}: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("manual");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannedWord, setBannedWord] = useState<string | null>(null);
  const [templates, setTemplates] = useState<AnswerTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | "">("");
  const draftTimer = useRef<number | null>(null);
  const canAnswer = questionStatus === "WAITING_FOR_ANSWER";
  const draftKey = `${DRAFT_KEY_PREFIX}${questionId}`;

  useEffect(() => {
    api.listTemplates().then(setTemplates).catch(() => {});
    // Draft kurtarma
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft) setText(draft);
    } catch {}
  }, [questionId]);

  // Draft autosave (debounced 500ms)
  useEffect(() => {
    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      try {
        if (text.trim()) {
          localStorage.setItem(draftKey, text);
        } else {
          localStorage.removeItem(draftKey);
        }
      } catch {}
    }, 500);
    return () => {
      if (draftTimer.current) window.clearTimeout(draftTimer.current);
    };
  }, [text, draftKey]);

  function pickTemplate(id: number) {
    setSelectedTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    const filled = applyTemplateVariables(tpl.body, {
      musteri: customerName || "değerli müşterimiz",
      urun: productName || "ürünümüz",
      magaza: storeName || "",
      tarih: new Date().toLocaleDateString("tr-TR"),
    });
    setText(filled);
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setBannedWord(null);
    try {
      const out = await api.generateAnswer(questionId);
      setText(out);
    } catch (e: any) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function send(forceIgnoreBanned = false) {
    setError(null);
    setBusy(true);
    try {
      const res = await api.submitAnswer(questionId, text, forceIgnoreBanned);
      if (res.success) {
        try {
          localStorage.removeItem(draftKey);
        } catch {}
        setText("");
        setBannedWord(null);
        onSent();
      } else if (res.bannedWord) {
        setBannedWord(res.bannedWord);
        setError(res.message);
      } else {
        setError(res.message);
      }
    } catch (e: any) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (valid && !busy) send(false);
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
          <p className="mt-1 text-[10px] text-muted">
            Şablonda {"{{musteri}}, {{urun}}, {{magaza}}, {{tarih}}"} değişkenleri otomatik dolar.
          </p>
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
        onKeyDown={handleKey}
        title={t("question.shortcutHint")}
      />
      <div className="flex items-center justify-between text-xs">
        <span className={charCount > 2000 ? "text-danger" : "text-muted"}>
          {t("question.characterCount", { count: charCount })}
        </span>
        <button
          onClick={() => send(false)}
          disabled={!valid || busy}
          className="btn-primary"
          title={t("question.shortcutHint")}
        >
          <Send className="mr-1 h-4 w-4" />
          {busy ? t("question.sending") : t("question.send")}
        </button>
      </div>

      {bannedWord && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="font-semibold text-warning">
            ⚠️ {t("question.bannedWordWarning")}: <span className="font-mono">{bannedWord}</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            Trendyol bu kelimeyi reddedip soruyu kapatabilir. Yine de göndermek istiyorsanız onaylayın.
          </p>
          <button onClick={() => send(true)} disabled={busy} className="btn-danger mt-2">
            {t("question.sendAnyway")}
          </button>
        </div>
      )}

      {error && !bannedWord && (
        <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
    </div>
  );
}

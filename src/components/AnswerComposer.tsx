import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type AnswerTemplate } from "../api/tauri";
import { Search, Send, Sparkles } from "./icons";

interface Props {
  questionId: number;
  questionStatus: string;
  onSent: () => void;
  productName?: string | null;
  customerName?: string | null;
  storeName?: string | null;
  /** Sol şablon paneli görünsün mü (modal'da true, dar yerlerde false) */
  showTemplatePanel?: boolean;
  /** Mount'ta textarea'yı bu metinle başlat (AI önerisini önceden doldurmak için) */
  initialText?: string;
}

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
  showTemplatePanel = false,
  initialText,
}: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannedWord, setBannedWord] = useState<string | null>(null);
  const [templates, setTemplates] = useState<AnswerTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(showTemplatePanel);
  const draftTimer = useRef<number | null>(null);
  const canAnswer = questionStatus === "WAITING_FOR_ANSWER";
  const draftKey = `${DRAFT_KEY_PREFIX}${questionId}`;

  useEffect(() => {
    api.listTemplates().then(setTemplates).catch(() => {});
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft) setText(draft);
      else if (initialText) setText(initialText);
      else setText("");
    } catch {
      setText(initialText ?? "");
    }
    setBannedWord(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, initialText]);

  useEffect(() => {
    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      try {
        if (text.trim()) localStorage.setItem(draftKey, text);
        else localStorage.removeItem(draftKey);
      } catch {}
    }, 500);
    return () => {
      if (draftTimer.current) window.clearTimeout(draftTimer.current);
    };
  }, [text, draftKey]);

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates;
    const needle = search.toLowerCase();
    return templates.filter(
      (tpl) =>
        tpl.title.toLowerCase().includes(needle) ||
        tpl.body.toLowerCase().includes(needle) ||
        (tpl.category ?? "").toLowerCase().includes(needle)
    );
  }, [templates, search]);

  function pickTemplate(tpl: AnswerTemplate) {
    const filled = applyTemplateVariables(tpl.body, {
      musteri: customerName || t("app.defaultCustomerTitle"),
      urun: productName || t("app.defaultProductTitle"),
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

  const composer = (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      <textarea
        rows={8}
        className="input resize-y min-h-[180px]"
        placeholder={t("question.placeholder")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        disabled={generating || busy}
        title={t("question.shortcutHint")}
      />
      <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={generate}
            disabled={generating || busy}
            className="btn-secondary text-xs"
            title="Yapay zekayla cevap üret"
          >
            <Sparkles className={`mr-1 h-4 w-4 ${generating ? "animate-pulse" : ""}`} />
            {generating ? t("question.generating") : t("question.generate")}
          </button>
          {showTemplatePanel || (
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="btn-ghost text-xs"
            >
              📋 {t("question.toggleTemplates")}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {bannedWord && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="font-semibold text-warning">
            ⚠️ {t("question.bannedWordWarning")}: <span className="font-mono">{bannedWord}</span>
          </p>
          <p className="mt-1 text-xs text-muted">{t("question.bannedExtraInfo")}</p>
          <button onClick={() => send(true)} disabled={busy} className="btn-danger mt-2">
            {t("question.sendAnyway")}
          </button>
        </div>
      )}

      {error && !bannedWord && (
        <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</div>
      )}
    </div>
  );

  const panel = (
    <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2 border-border md:border-r md:pr-3">
      <div className="text-xs font-semibold text-muted">{t("question.templatesPanel")}</div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          className="input pl-7 text-xs"
          placeholder={t("question.templatesSearchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-[360px] md:max-h-[420px] overflow-y-auto space-y-1 pr-1">
        {templates.length === 0 ? (
          <div className="rounded-md bg-bg-elev-2 p-2 text-xs text-muted">
            {t("question.templatesEmpty")}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-md bg-bg-elev-2 p-2 text-xs text-muted">
            {t("question.noTemplateMatch")}
          </div>
        ) : (
          filteredTemplates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => pickTemplate(tpl)}
              className="w-full rounded-md border border-border bg-bg-elev px-2 py-1.5 text-left text-xs hover:border-brand/40 hover:bg-bg-elev-2 transition"
            >
              <div className="font-medium truncate">{tpl.title}</div>
              <div className="mt-0.5 line-clamp-2 text-[10px] text-muted">{tpl.body}</div>
            </button>
          ))
        )}
      </div>
    </aside>
  );

  if (!showTemplatePanel && !panelOpen) {
    return <div className="card">{composer}</div>;
  }

  return (
    <div className="card flex flex-col md:flex-row gap-3">
      {(showTemplatePanel || panelOpen) && panel}
      {composer}
    </div>
  );
}

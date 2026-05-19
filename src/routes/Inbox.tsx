import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type StoredQuestion } from "../api/tauri";
import { useAppStore } from "../stores/useAppStore";
import { useInboxStore, type Preset } from "../stores/useInboxStore";
import StoreSelector from "../components/StoreSelector";
import QuestionCard from "../components/QuestionCard";
import QuestionModal from "../components/QuestionModal";
import { RefreshCw, Search } from "../components/icons";

const STATUSES = [
  "WAITING_FOR_ANSWER",
  "ANSWERED",
  "REPORTED",
  "REJECTED",
  "UNANSWERED",
  "ALL",
] as const;

export default function Inbox() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { selectedStoreIds } = useAppStore();
  const {
    status,
    preset,
    fromDate,
    toDate,
    search,
    setStatus,
    setPreset,
    setFromDate,
    setToDate,
    setSearch,
  } = useInboxStore();
  const [questions, setQuestions] = useState<StoredQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [modalQuestion, setModalQuestion] = useState<StoredQuestion | null>(null);
  const syncTimer = useRef<number | null>(null);
  const searchTimer = useRef<number | null>(null);

  function buildRange() {
    return {
      start: new Date(fromDate).getTime(),
      end: new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1,
    };
  }

  async function load() {
    setLoading(true);
    try {
      const { start, end } = buildRange();
      const list = await api.listQuestions({
        storeIds: selectedStoreIds,
        status,
        search: search || null,
        startDate: start,
        endDate: end,
        limit: 500,
      });
      setQuestions(list);
    } finally {
      setLoading(false);
    }
  }

  async function sync(silent = false) {
    setSyncing(true);
    if (!silent) setSyncMsg(null);
    try {
      const { start, end } = buildRange();
      const res = await api.syncNow({
        status: status === "ALL" ? null : status,
        startDate: start,
        endDate: end,
      });
      if (!silent) {
        let msg = t("inbox.syncDone", {
          new: res.newQuestions,
          updated: res.updatedQuestions,
        });
        if (res.errors && res.errors.length > 0) {
          const errs = res.errors
            .map((e) => `${e.storeName}: ${e.message}`)
            .join(" · ");
          msg += ` | Hatalar: ${errs}`;
        }
        setSyncMsg(msg);
      }
      await load();
    } catch (e: any) {
      if (!silent) setSyncMsg(String(e));
    } finally {
      setSyncing(false);
      if (!silent) {
        window.setTimeout(() => setSyncMsg(null), 6000);
      }
    }
  }

  // Filtre değişince hem yerelde yükle hem de uzaktan sessizce senkronize et
  useEffect(() => {
    load();
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => sync(true), 400);
    return () => {
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
    };
  }, [selectedStoreIds, status, fromDate, toDate]);

  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(load, 300);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [search]);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected =
    questions.length > 0 && selected.size === questions.length;

  function selectAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(questions.map((q) => q.questionId)));
  }

  function openBulk() {
    const ids = Array.from(selected);
    sessionStorage.setItem("bulk:ids", JSON.stringify(ids));
    nav("/bulk");
  }

  const presets: { value: Preset; label: string }[] = [
    { value: "7d", label: t("inbox.datePresets.7d") },
    { value: "14d", label: t("inbox.datePresets.14d") },
    { value: "30d", label: t("inbox.datePresets.30d") },
    { value: "custom", label: t("inbox.datePresets.custom") },
  ];

  return (
    <div className="space-y-4 p-6">
      <StoreSelector />

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg-elev p-2">
        <span className="px-2 text-sm text-muted">{t("inbox.dateRange")}:</span>
        {presets.map((p) => (
          <button
            key={p.value}
            onClick={() => setPreset(p.value)}
            className={`badge cursor-pointer border ${
              preset === p.value
                ? "bg-brand text-brand-fg border-brand"
                : "bg-bg-elev-2 text-fg border-border"
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="ml-2 flex items-center gap-2 text-sm">
          <span className="text-muted">{t("inbox.from")}:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="input max-w-[160px]"
          />
          <span className="text-muted">{t("inbox.to")}:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="input max-w-[160px]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-elev p-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`btn ${
                status === s ? "bg-brand text-brand-fg" : "btn-ghost"
              }`}
            >
              {t(`inbox.statusFilter.${s}`)}
            </button>
          ))}
        </div>
        <div className="relative ml-auto flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            placeholder={t("app.search") ?? ""}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <button onClick={selectAll} className="btn-secondary">
          {allSelected ? t("inbox.deselectAll") : t("inbox.selectAll")}
        </button>
        <button
          onClick={openBulk}
          disabled={selected.size === 0}
          className="btn-primary"
        >
          {t("inbox.bulkAnswer")} ({selected.size})
        </button>
        <button onClick={() => sync(false)} disabled={syncing} className="btn-secondary">
          <RefreshCw className={`mr-1 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? t("inbox.syncing") : t("inbox.syncNow")}
        </button>
      </div>

      {syncMsg && (
        <div className="rounded-lg border border-border bg-bg-elev px-4 py-2 text-sm">
          {syncMsg}
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted">{t("app.loading")}</div>
      ) : questions.length === 0 ? (
        <div className="card text-center text-muted">{t("inbox.noQuestions")}</div>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <QuestionCard
              key={q.questionId}
              question={q}
              selectable
              selected={selected.has(q.questionId)}
              onToggleSelect={toggleSelect}
              onOpen={() => setModalQuestion(q)}
            />
          ))}
        </div>
      )}

      {modalQuestion && (
        <QuestionModal
          question={modalQuestion}
          onClose={() => setModalQuestion(null)}
          onSent={() => {
            sync(true);
            load();
          }}
        />
      )}
    </div>
  );
}

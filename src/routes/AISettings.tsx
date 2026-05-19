import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  type ActiveTraining,
  type AiModel,
  type AiProviderRow,
} from "../api/tauri";
import { useAppStore } from "../stores/useAppStore";
import { useAiStore } from "../stores/useAiStore";
import { Check, RefreshCw, Sparkles, Trash } from "../components/icons";
import { formatDate } from "../lib/format";

interface ProviderForm {
  provider: "gemini" | "openrouter";
  displayName: string;
  apiKey: string;
  baseUrl: string;
  selectedModel: string;
}

const DEFAULTS: ProviderForm[] = [
  {
    provider: "gemini",
    displayName: "Google Gemini",
    apiKey: "",
    baseUrl: "",
    selectedModel: "",
  },
  {
    provider: "openrouter",
    displayName: "OpenRouter",
    apiKey: "",
    baseUrl: "https://openrouter.ai/api/v1",
    selectedModel: "",
  },
];

export default function AISettings() {
  const { t } = useTranslation();
  const stores = useAppStore((s) => s.stores);
  const { training, trainMsg, trainErr, trainProgressLabel, startTraining } =
    useAiStore();
  const [list, setList] = useState<AiProviderRow[]>([]);
  const [forms, setForms] = useState<ProviderForm[]>(DEFAULTS);
  const [maskedKeys, setMaskedKeys] = useState<Record<string, string | null>>(
    {}
  );
  const [models, setModels] = useState<Record<string, AiModel[]>>({});
  const [loadingModels, setLoadingModels] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [trainStart, setTrainStart] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [trainEnd, setTrainEnd] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [trainStores, setTrainStores] = useState<number[]>([]);
  const [active, setActive] = useState<ActiveTraining | null>(null);

  async function refresh() {
    const rows = await api.listAiProviders();
    setList(rows);
    setForms((prev) =>
      prev.map((f) => {
        const r = rows.find((x) => x.provider === f.provider);
        if (!r) return f;
        return {
          ...f,
          displayName: r.displayName,
          baseUrl: r.baseUrl ?? f.baseUrl,
          selectedModel: r.selectedModel ?? "",
        };
      })
    );
    setActive(await api.getActiveTraining());
    // Maskeli API key'leri yükle
    const masked: Record<string, string | null> = {};
    for (const r of rows) {
      if (r.hasApiKey) {
        try {
          masked[r.provider] = await api.getAiKeyMasked(r.provider);
        } catch {
          masked[r.provider] = null;
        }
      }
    }
    setMaskedKeys(masked);
  }

  useEffect(() => {
    refresh();
  }, []);

  // Eğitim tamamlandığında "active" alanını tekrar yükle
  useEffect(() => {
    if (!training && trainMsg) {
      refresh();
    }
  }, [training, trainMsg]);

  async function saveProvider(form: ProviderForm) {
    setBusy(true);
    try {
      await api.upsertAiProvider({
        provider: form.provider,
        displayName: form.displayName,
        selectedModel: form.selectedModel || null,
        baseUrl: form.baseUrl || null,
        apiKey: form.apiKey || null,
      });
      await refresh();
      setForms((prev) =>
        prev.map((f) =>
          f.provider === form.provider ? { ...f, apiKey: "" } : f
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadModels(form: ProviderForm) {
    setLoadingModels(form.provider);
    try {
      if (form.apiKey) await saveProvider(form);
      const ms = await api.listModels(form.provider);
      setModels((p) => ({ ...p, [form.provider]: ms }));
    } catch (e: any) {
      alert(String(e));
    } finally {
      setLoadingModels(null);
    }
  }

  async function setActiveProvider(provider: string) {
    await api.setActiveProvider(provider);
    await refresh();
  }

  async function deleteProvider(provider: string) {
    if (!confirm("Bu sağlayıcıyı silmek istediğinize emin misiniz?")) return;
    await api.deleteAiProvider(provider);
    await refresh();
  }

  function handleTrain() {
    const start = new Date(trainStart).getTime();
    const end = new Date(trainEnd).getTime() + 24 * 60 * 60 * 1000 - 1;
    startTraining(start, end, trainStores.length > 0 ? trainStores : null);
  }

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-xl font-semibold">{t("ai.title")}</h2>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted">{t("ai.providers")}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {forms.map((form) => {
            const row = list.find((x) => x.provider === form.provider);
            const ms = models[form.provider] ?? [];
            return (
              <div key={form.provider} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">
                    {form.provider === "gemini"
                      ? t("ai.gemini")
                      : t("ai.openrouter")}
                  </h4>
                  <div className="flex items-center gap-2">
                    {row?.active && (
                      <span className="badge bg-success/15 text-success">
                        <Check className="mr-1 h-3 w-3" />
                        {t("ai.active")}
                      </span>
                    )}
                    {row?.hasApiKey ? (
                      <span className="badge bg-info/15 text-info">
                        {t("ai.configured")}
                      </span>
                    ) : (
                      <span className="badge bg-warning/15 text-warning">
                        {t("ai.notConfigured")}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="label">{t("ai.apiKey")}</label>
                  {row?.hasApiKey && maskedKeys[form.provider] && (
                    <div className="mb-1 rounded-md bg-bg-elev-2 px-2 py-1 font-mono text-xs text-muted">
                      Kayıtlı: {maskedKeys[form.provider]}
                    </div>
                  )}
                  <input
                    type="password"
                    className="input"
                    placeholder={
                      row?.hasApiKey
                        ? "Değiştirmek için yeni key'i yazıp Kaydet'e basın"
                        : ""
                    }
                    value={form.apiKey}
                    onChange={(e) =>
                      setForms((prev) =>
                        prev.map((f) =>
                          f.provider === form.provider
                            ? { ...f, apiKey: e.target.value }
                            : f
                        )
                      )
                    }
                  />
                </div>
                {form.provider === "openrouter" && (
                  <div>
                    <label className="label">Base URL</label>
                    <input
                      className="input"
                      value={form.baseUrl}
                      onChange={(e) =>
                        setForms((prev) =>
                          prev.map((f) =>
                            f.provider === form.provider
                              ? { ...f, baseUrl: e.target.value }
                              : f
                          )
                        )
                      }
                    />
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="label">{t("ai.selectedModel")}</label>
                    <select
                      className="input"
                      value={form.selectedModel}
                      onChange={(e) =>
                        setForms((prev) =>
                          prev.map((f) =>
                            f.provider === form.provider
                              ? { ...f, selectedModel: e.target.value }
                              : f
                          )
                        )
                      }
                    >
                      <option value="">—</option>
                      {ms.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => loadModels(form)}
                    disabled={
                      loadingModels === form.provider ||
                      (!form.apiKey && !row?.hasApiKey)
                    }
                    className="btn-secondary"
                  >
                    <RefreshCw
                      className={`mr-1 h-4 w-4 ${
                        loadingModels === form.provider ? "animate-spin" : ""
                      }`}
                    />
                    {t("ai.loadModels")}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveProvider(form)}
                      disabled={busy}
                      className="btn-primary"
                    >
                      {t("ai.save")}
                    </button>
                    {row && !row.active && (
                      <button
                        onClick={() => setActiveProvider(form.provider)}
                        className="btn-secondary"
                      >
                        {t("ai.setActive")}
                      </button>
                    )}
                  </div>
                  {row && (
                    <button
                      onClick={() => deleteProvider(form.provider)}
                      className="btn-ghost text-danger"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card space-y-3">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-brand" />
          {t("ai.trainTitle")}
        </h3>
        <p className="text-sm text-muted">{t("ai.trainDesc")}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label">{t("ai.startDate")}</label>
            <input
              type="date"
              className="input"
              value={trainStart}
              onChange={(e) => setTrainStart(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t("ai.endDate")}</label>
            <input
              type="date"
              className="input"
              value={trainEnd}
              onChange={(e) => setTrainEnd(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">{t("ai.storeFilter")}</label>
          <div className="flex flex-wrap gap-2">
            {stores.map((s) => {
              const sel = trainStores.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() =>
                    setTrainStores((prev) =>
                      sel ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                    )
                  }
                  className={`badge cursor-pointer border ${
                    sel
                      ? "bg-brand/10 text-brand border-brand/40"
                      : "bg-bg-elev-2 text-muted border-border"
                  }`}
                >
                  {sel ? "✓ " : ""}
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTrain}
            disabled={training}
            className="btn-primary"
          >
            <Sparkles className="mr-1 h-4 w-4" />
            {training ? t("ai.training") : t("ai.train")}
          </button>
          {trainProgressLabel && training && (
            <span className="text-sm text-muted">{trainProgressLabel}</span>
          )}
          {trainMsg && !training && (
            <span className="text-sm text-success">{trainMsg}</span>
          )}
          {trainErr && !training && (
            <span className="text-sm text-danger">{trainErr}</span>
          )}
        </div>
        <div className="border-t border-border pt-3">
          <h4 className="text-sm font-semibold text-muted">
            {t("ai.activeTraining")}
          </h4>
          {active ? (
            <div className="mt-2 space-y-2 text-sm">
              <div>
                {formatDate(active.startDate)} → {formatDate(active.endDate)} ·{" "}
                {active.qaPairCount} cevap kullanıldı ·{" "}
                {formatDate(active.createdAt)} tarihinde eğitildi
              </div>
              <div>
                <div className="mb-1 text-xs text-muted">
                  {t("ai.systemPrompt")} ({active.systemPrompt.length} karakter)
                </div>
                <pre className="whitespace-pre-wrap rounded-lg bg-bg-elev-2 p-3 text-xs max-h-96 overflow-auto">
                  {active.systemPrompt}
                </pre>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted">
              {t("ai.activeTrainingNone")}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

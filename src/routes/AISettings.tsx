import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  type ActiveTraining,
  type AiModel,
  type AiOptions,
  type AiProviderRow,
  type TrainingRecord,
} from "../api/tauri";
import { useAppStore } from "../stores/useAppStore";
import { useAiStore } from "../stores/useAiStore";
import { Check, RefreshCw, Sparkles, Trash } from "../components/icons";
import { formatDate } from "../lib/format";
import ModelWizardModal from "../components/ModelWizardModal";
import StyleTestModal from "../components/StyleTestModal";
import CustomModelModal from "../components/CustomModelModal";

interface ProviderForm {
  provider: "gemini" | "openrouter" | "ollama";
  displayName: string;
  apiKey: string;
  baseUrl: string;
  selectedModel: string;
  options: AiOptions;
}

const DEFAULT_OPTIONS: AiOptions = {
  temperature: 0.3,
  topP: 0.7,
  topK: 20,
  repeatPenalty: 1.15,
  numCtx: 4096,
  keepAlive: "10m",
};

const PRESET_CONSISTENT: AiOptions = {
  temperature: 0.3,
  topP: 0.7,
  topK: 20,
  repeatPenalty: 1.15,
  numCtx: 4096,
  keepAlive: "10m",
};

const PRESET_CREATIVE: AiOptions = {
  temperature: 0.8,
  topP: 0.95,
  topK: 40,
  repeatPenalty: 1.1,
  numCtx: 4096,
  keepAlive: "10m",
};

const DEFAULTS: ProviderForm[] = [
  {
    provider: "gemini",
    displayName: "Google Gemini",
    apiKey: "",
    baseUrl: "",
    selectedModel: "",
    options: { ...DEFAULT_OPTIONS },
  },
  {
    provider: "openrouter",
    displayName: "OpenRouter",
    apiKey: "",
    baseUrl: "https://openrouter.ai/api/v1",
    selectedModel: "",
    options: { ...DEFAULT_OPTIONS },
  },
  {
    provider: "ollama",
    displayName: "Ollama (Yerel)",
    apiKey: "",
    baseUrl: "http://127.0.0.1:11434",
    selectedModel: "",
    options: { ...DEFAULT_OPTIONS },
  },
];

export default function AISettings() {
  const { t } = useTranslation();
  const stores = useAppStore((s) => s.stores);
  const { training, trainMsg, trainErr, trainProgressLabel, startTraining, initListeners } =
    useAiStore();

  useEffect(() => {
    initListeners();
  }, [initListeners]);
  const [list, setList] = useState<AiProviderRow[]>([]);
  const [forms, setForms] = useState<ProviderForm[]>(DEFAULTS);
  const [maskedKeys, setMaskedKeys] = useState<Record<string, string | null>>(
    {}
  );
  const [models, setModels] = useState<Record<string, AiModel[]>>({});
  const [loadingModels, setLoadingModels] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [styleTestOpen, setStyleTestOpen] = useState(false);
  const [customModelOpen, setCustomModelOpen] = useState(false);
  const [trainStart, setTrainStart] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [trainEnd, setTrainEnd] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [trainStores, setTrainStores] = useState<number[]>([]);
  const [active, setActive] = useState<ActiveTraining | null>(null);
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [promptDraft, setPromptDraft] = useState<string>("");
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptSavedMsg, setPromptSavedMsg] = useState<string | null>(null);

  async function refresh() {
    const rows = await api.listAiProviders();
    setList(rows);
    setForms((prev) =>
      prev.map((f) => {
        const r = rows.find((x) => x.provider === f.provider);
        if (!r) return f;
        let parsedOptions: AiOptions = f.options;
        if (r.optionsJson) {
          try {
            parsedOptions = { ...DEFAULT_OPTIONS, ...JSON.parse(r.optionsJson) };
          } catch {}
        }
        return {
          ...f,
          displayName: r.displayName,
          baseUrl: r.baseUrl ?? f.baseUrl,
          selectedModel: r.selectedModel ?? "",
          options: parsedOptions,
        };
      })
    );
    // selectedModel'i olan provider'lar için modelleri arka planda yükle
    // (dropdown'da kayıtlı modelin görünmesi için)
    for (const r of rows) {
      if (r.selectedModel && (r.hasApiKey || r.provider === "ollama")) {
        api
          .listModels(r.provider)
          .then((ms) => setModels((p) => ({ ...p, [r.provider]: ms })))
          .catch(() => {
            // sessizce yok say — kullanıcı manuel "Modelleri Yükle" yapabilir
          });
      }
    }
    const act = await api.getActiveTraining();
    setActive(act);
    setPromptDraft(act?.systemPrompt ?? "");
    setTrainings(await api.listTrainings());
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
      const result = await api.upsertAiProvider({
        provider: form.provider,
        displayName: form.displayName,
        selectedModel: form.selectedModel || null,
        baseUrl: form.baseUrl || null,
        apiKey: form.apiKey || null,
        optionsJson: JSON.stringify(form.options),
      });
      // DB'den dönen sonuca güven; refresh state'i override etmesin
      setForms((prev) =>
        prev.map((f) =>
          f.provider === form.provider
            ? {
                ...f,
                displayName: result.displayName,
                baseUrl: result.baseUrl ?? f.baseUrl,
                selectedModel: result.selectedModel ?? f.selectedModel,
                apiKey: "",
              }
            : f
        )
      );
      setList((prev) => {
        const idx = prev.findIndex((p) => p.provider === result.provider);
        if (idx === -1) return [...prev, result];
        const copy = [...prev];
        copy[idx] = result;
        return copy;
      });
    } catch (e: any) {
      alert(`Kaydetme hatası: ${e}`);
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function loadModels(form: ProviderForm) {
    setLoadingModels(form.provider);
    try {
      // Ollama API key gerektirmez, bu yüzden provider satırı yoksa burada oluşturulur.
      // Diğer sağlayıcılarda da yeni key girilmişse önce kaydet.
      const needsSave =
        form.apiKey ||
        form.provider === "ollama" ||
        !list.find((x) => x.provider === form.provider);
      if (needsSave) await saveProvider(form);
      const ms = await api.listModels(form.provider);
      setModels((p) => ({ ...p, [form.provider]: ms }));
    } catch (e: any) {
      alert(String(e));
    } finally {
      setLoadingModels(null);
    }
  }

  async function setActiveProvider(provider: string) {
    // Provider DB'de yoksa önce kaydet (UPDATE WHERE eşleşmediği için aktif yap sessizce fail oluyordu)
    const exists = list.find((x) => x.provider === provider);
    if (!exists) {
      const form = forms.find((f) => f.provider === provider);
      if (form) await saveProvider(form);
    }
    await api.setActiveProvider(provider);
    await refresh();
  }

  /** Model dropdown'ı veya base URL değiştiğinde provider satırını otomatik DB'ye yaz */
  async function autoSaveProvider(form: ProviderForm) {
    try {
      await api.upsertAiProvider({
        provider: form.provider,
        displayName: form.displayName,
        selectedModel: form.selectedModel || null,
        baseUrl: form.baseUrl || null,
        apiKey: null, // mevcut key korunsun (COALESCE arka tarafta)
        optionsJson: JSON.stringify(form.options),
      });
      // refresh çağırmıyoruz — kullanıcının seçim state'ini override etmesin
    } catch (e) {
      console.warn("autoSave provider hatası", e);
    }
  }

  /** Provider options değiştiğinde state + DB güncelle */
  function updateOptions(provider: string, patch: Partial<AiOptions>) {
    setForms((prev) => {
      const next = prev.map((f) =>
        f.provider === provider
          ? { ...f, options: { ...f.options, ...patch } }
          : f
      );
      const updated = next.find((f) => f.provider === provider);
      if (updated) autoSaveProvider(updated);
      return next;
    });
  }

  function applyPreset(provider: string, preset: AiOptions) {
    updateOptions(provider, preset);
  }

  async function deleteProvider(provider: string) {
    if (!confirm(t("ai.deleteProviderConfirm"))) return;
    await api.deleteAiProvider(provider);
    await refresh();
  }

  function handleTrain() {
    const start = new Date(trainStart).getTime();
    const end = new Date(trainEnd).getTime() + 24 * 60 * 60 * 1000 - 1;
    startTraining(start, end, trainStores.length > 0 ? trainStores : null);
  }

  async function savePromptEdits() {
    if (!active) return;
    setPromptSaving(true);
    try {
      await api.updateTrainingPrompt(active.id, promptDraft);
      await refresh();
      setPromptSavedMsg(t("app.save") + " ✓");
      setTimeout(() => setPromptSavedMsg(null), 2500);
    } catch (e: any) {
      alert(String(e));
    } finally {
      setPromptSaving(false);
    }
  }

  async function resetPromptEdits() {
    if (!active) return;
    try {
      await api.resetTrainingPrompt(active.id);
      await refresh();
    } catch (e: any) {
      alert(String(e));
    }
  }

  async function activateTraining(id: number) {
    await api.activateTraining(id);
    await refresh();
  }

  async function deleteTraining(id: number) {
    if (!confirm(t("ai.deleteTrainingConfirm"))) return;
    await api.deleteTraining(id);
    await refresh();
  }

  return (
    <div className="space-y-6 p-6">
      {wizardOpen && (
        <ModelWizardModal
          onClose={() => setWizardOpen(false)}
          onSelect={(modelId) => {
            const ollamaForm = forms.find((f) => f.provider === "ollama");
            if (ollamaForm) {
              const updated = { ...ollamaForm, selectedModel: modelId };
              setForms((prev) =>
                prev.map((f) => (f.provider === "ollama" ? updated : f))
              );
              autoSaveProvider(updated);
            }
          }}
        />
      )}
      {styleTestOpen && (
        <StyleTestModal
          onClose={() => setStyleTestOpen(false)}
          generate={(q) => api.aiTestStyle(q)}
        />
      )}
      {customModelOpen &&
        (() => {
          const active = trainings.find((t) => t.active);
          if (!active) return null;
          const ollamaModels = models["ollama"] ?? [];
          return (
            <CustomModelModal
              trainingId={active.id}
              availableModels={ollamaModels.map((m) => ({
                id: m.id,
                name: m.name,
              }))}
              onClose={() => setCustomModelOpen(false)}
              onCreated={() => {
                const ollamaForm = forms.find((f) => f.provider === "ollama");
                if (ollamaForm) loadModels(ollamaForm);
              }}
            />
          );
        })()}
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
                {form.provider !== "ollama" ? (
                  <div>
                    <label className="label">{t("ai.apiKey")}</label>
                    {row?.hasApiKey && maskedKeys[form.provider] && (
                      <div className="mb-1 rounded-md bg-bg-elev-2 px-2 py-1 font-mono text-xs text-muted">
                        {t("ai.savedKeyLabel")}: {maskedKeys[form.provider]}
                      </div>
                    )}
                    <input
                      type="password"
                      className="input"
                      placeholder={row?.hasApiKey ? t("ai.keyHintReplace") : ""}
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
                ) : (
                  <div className="rounded-md bg-info/10 p-2 text-xs text-info">
                    {t("ai.noApiKeyNeeded")}
                    <div className="mt-1 text-muted">
                      {t("ai.ollamaSetupSteps")}
                    </div>
                    <button
                      type="button"
                      onClick={() => setWizardOpen(true)}
                      className="btn-secondary mt-2 text-xs"
                    >
                      🧙 Model Önerisi Sihirbazı
                    </button>
                  </div>
                )}
                {(form.provider === "openrouter" || form.provider === "ollama") && (
                  <div>
                    <label className="label">{t("ai.baseUrl")}</label>
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
                      onChange={(e) => {
                        const newModel = e.target.value;
                        const updated = { ...form, selectedModel: newModel };
                        setForms((prev) =>
                          prev.map((f) =>
                            f.provider === form.provider ? updated : f
                          )
                        );
                        // Model seçimi otomatik kaydet — kullanıcı Kaydet'e basmadan da kalıcı
                        autoSaveProvider(updated);
                      }}
                    >
                      <option value="">—</option>
                      {/* Kayıtlı model henüz listeye yüklenmediyse fallback option */}
                      {form.selectedModel &&
                        !ms.find((m) => m.id === form.selectedModel) && (
                          <option value={form.selectedModel}>
                            {form.selectedModel} (kayıtlı)
                          </option>
                        )}
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
                      (form.provider !== "ollama" &&
                        !form.apiKey &&
                        !row?.hasApiKey)
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
                <details className="rounded-lg border border-border bg-surface/50 p-3">
                  <summary className="cursor-pointer select-none text-sm font-medium">
                    ⚙️ {t("ai.advancedSettings")}
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() =>
                          applyPreset(form.provider, PRESET_CONSISTENT)
                        }
                      >
                        {t("ai.presetConsistent")}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() =>
                          applyPreset(form.provider, PRESET_CREATIVE)
                        }
                      >
                        {t("ai.presetCreative")}
                      </button>
                    </div>
                    <div>
                      <label className="label flex justify-between">
                        <span>{t("ai.temperature")}</span>
                        <span className="text-xs text-muted">
                          {(form.options.temperature ?? 0.3).toFixed(2)}
                        </span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={0.05}
                        value={form.options.temperature ?? 0.3}
                        onChange={(e) =>
                          updateOptions(form.provider, {
                            temperature: parseFloat(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="label flex justify-between">
                        <span>{t("ai.topP")}</span>
                        <span className="text-xs text-muted">
                          {(form.options.topP ?? 0.7).toFixed(2)}
                        </span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={form.options.topP ?? 0.7}
                        onChange={(e) =>
                          updateOptions(form.provider, {
                            topP: parseFloat(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="label flex justify-between">
                        <span>{t("ai.topK")}</span>
                        <span className="text-xs text-muted">
                          {form.options.topK ?? 20}
                        </span>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={100}
                        step={1}
                        value={form.options.topK ?? 20}
                        onChange={(e) =>
                          updateOptions(form.provider, {
                            topK: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="label flex justify-between">
                        <span>{t("ai.repeatPenalty")}</span>
                        <span className="text-xs text-muted">
                          {(form.options.repeatPenalty ?? 1.15).toFixed(2)}
                        </span>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={2}
                        step={0.05}
                        value={form.options.repeatPenalty ?? 1.15}
                        onChange={(e) =>
                          updateOptions(form.provider, {
                            repeatPenalty: parseFloat(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                    {form.provider === "ollama" && (
                      <>
                        <div>
                          <label className="label">{t("ai.numCtx")}</label>
                          <select
                            className="input"
                            value={form.options.numCtx ?? 4096}
                            onChange={(e) =>
                              updateOptions(form.provider, {
                                numCtx: parseInt(e.target.value, 10),
                              })
                            }
                          >
                            <option value={2048}>2048</option>
                            <option value={4096}>4096</option>
                            <option value={8192}>8192</option>
                            <option value={16384}>16384</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">{t("ai.keepAlive")}</label>
                          <select
                            className="input"
                            value={form.options.keepAlive ?? "10m"}
                            onChange={(e) =>
                              updateOptions(form.provider, {
                                keepAlive: e.target.value,
                              })
                            }
                          >
                            <option value="0">0 (kapat)</option>
                            <option value="5m">5 dakika</option>
                            <option value="10m">10 dakika</option>
                            <option value="30m">30 dakika</option>
                            <option value="-1">Sınırsız</option>
                          </select>
                        </div>
                      </>
                    )}
                    <p className="text-xs text-muted">{t("ai.advancedHint")}</p>
                  </div>
                </details>
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
        <details className="card border-dashed border-info/30 bg-info/5 text-xs">
          <summary className="cursor-pointer font-semibold text-info">
            🔍 Tanılama (sorun bildirmek için kopyala)
          </summary>
          <div className="mt-2 space-y-2">
            <div>
              <div className="text-muted mb-1">DB'deki sağlayıcılar (list_ai_providers):</div>
              <pre className="rounded bg-bg-elev-2 p-2 overflow-auto max-h-40">
{JSON.stringify(list, null, 2)}
              </pre>
            </div>
            <div>
              <div className="text-muted mb-1">UI form state:</div>
              <pre className="rounded bg-bg-elev-2 p-2 overflow-auto max-h-40">
{JSON.stringify(forms.map((f) => ({ ...f, apiKey: f.apiKey ? "***" : "" })), null, 2)}
              </pre>
            </div>
            <div>
              <div className="text-muted mb-1">Yüklenmiş modeller (list_models cache):</div>
              <pre className="rounded bg-bg-elev-2 p-2 overflow-auto max-h-40">
{JSON.stringify(models, null, 2)}
              </pre>
            </div>
            <button
              onClick={() => {
                const text = JSON.stringify(
                  {
                    list,
                    forms: forms.map((f) => ({ ...f, apiKey: f.apiKey ? "***" : "" })),
                    models,
                  },
                  null,
                  2
                );
                navigator.clipboard.writeText(text);
              }}
              className="btn-secondary text-xs"
            >
              📋 Tümünü Panoya Kopyala
            </button>
          </div>
        </details>
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
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {t("ai.systemPrompt")} ({promptDraft.length} karakter)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={resetPromptEdits}
                      className="btn-ghost text-xs"
                      title={t("ai.resetPrompt")}
                    >
                      {t("ai.resetPrompt")}
                    </button>
                    <button
                      onClick={savePromptEdits}
                      disabled={
                        promptSaving || promptDraft === active.systemPrompt
                      }
                      className="btn-primary text-xs"
                    >
                      {promptSaving
                        ? t("app.saving")
                        : t("ai.savePromptEdits")}
                    </button>
                    {promptSavedMsg && (
                      <span className="text-xs text-success">
                        {promptSavedMsg}
                      </span>
                    )}
                  </div>
                </div>
                <textarea
                  className="input min-h-[200px] max-h-[400px] font-mono text-xs"
                  value={promptDraft}
                  onChange={(e) => setPromptDraft(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted">
              {t("ai.activeTrainingNone")}
            </div>
          )}
        </div>

        {trainings.length > 0 && (
          <>
          {(() => {
            const active = trainings.find((tr) => tr.active);
            if (!active) return null;
            return (
              <div className="border-t border-border pt-3 space-y-2">
                <h4 className="text-sm font-semibold text-muted">
                  Aktif Eğitim Aksiyonları
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setStyleTestOpen(true)}
                    className="btn-secondary text-xs"
                  >
                    🧪 AI Stilimi Test Et
                  </button>
                  <button
                    onClick={() => setCustomModelOpen(true)}
                    className="btn-secondary text-xs"
                  >
                    🔧 Bu Eğitimden Özel Model Oluştur
                  </button>
                </div>
              </div>
            );
          })()}
          <div className="border-t border-border pt-3">
            <h4 className="mb-2 text-sm font-semibold text-muted">
              {t("ai.trainingHistory")}
            </h4>
            <div className="space-y-2">
              {trainings.map((tr) => (
                <div
                  key={tr.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-bg-elev-2 px-3 py-2 text-xs"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {tr.name ?? `#${tr.id}`}
                      {tr.active && (
                        <span className="ml-2 badge bg-success/15 text-success">
                          {t("ai.active")}
                        </span>
                      )}
                    </div>
                    <div className="text-muted">
                      {tr.qaPairCount} cevap · {formatDate(tr.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!tr.active && (
                      <button
                        onClick={() => activateTraining(tr.id)}
                        className="btn-secondary text-xs"
                      >
                        {t("ai.activate")}
                      </button>
                    )}
                    <button
                      onClick={() => deleteTraining(tr.id)}
                      className="btn-ghost text-xs text-danger"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
        )}
      </section>
    </div>
  );
}

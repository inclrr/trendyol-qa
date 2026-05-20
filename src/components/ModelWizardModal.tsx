import { useState } from "react";
import { X } from "./icons";
import {
  recommendModels,
  type GpuChoice,
  type PriorityChoice,
  type RecommendedModel,
} from "../lib/ollama-models";

interface Props {
  onClose: () => void;
  /** Kullanıcı bir model'i seçtiğinde — AISettings dropdown'una set etmek için */
  onSelect?: (modelId: string) => void;
}

export default function ModelWizardModal({ onClose, onSelect }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [ramGB, setRamGB] = useState<number>(8);
  const [gpu, setGpu] = useState<GpuChoice>("none");
  const [vramGB, setVramGB] = useState<number>(0);
  const [priority, setPriority] = useState<PriorityChoice>("balanced");
  const [results, setResults] = useState<RecommendedModel[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function next() {
    if (step === 1) setStep(2);
    else if (step === 2) {
      const recs = recommendModels({
        ramGB,
        gpu,
        vramGB: gpu === "none" ? 0 : vramGB,
        priority,
      });
      setResults(recs);
      setStep(3);
    }
  }

  function copyCmd(cmd: string, id: string) {
    navigator.clipboard.writeText(cmd).catch(() => {});
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card w-full max-w-xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">
            🧙 Model Önerisi Sihirbazı (2026 Güncel)
          </h3>
          <button onClick={onClose} className="btn-ghost p-2" aria-label="Kapat">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted">
          <span
            className={`badge ${
              step === 1 ? "bg-brand/15 text-brand" : "bg-bg-elev-2 text-muted"
            }`}
          >
            1. Donanım
          </span>
          <span>→</span>
          <span
            className={`badge ${
              step === 2 ? "bg-brand/15 text-brand" : "bg-bg-elev-2 text-muted"
            }`}
          >
            2. Öncelik
          </span>
          <span>→</span>
          <span
            className={`badge ${
              step === 3 ? "bg-brand/15 text-brand" : "bg-bg-elev-2 text-muted"
            }`}
          >
            3. Sonuç
          </span>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="label">Sistem RAM (GB)</label>
              <select
                className="input"
                value={ramGB}
                onChange={(e) => setRamGB(Number(e.target.value))}
              >
                <option value={4}>4 GB</option>
                <option value={8}>8 GB</option>
                <option value={16}>16 GB</option>
                <option value={32}>32 GB</option>
                <option value={64}>64 GB</option>
              </select>
            </div>
            <div>
              <label className="label">GPU</label>
              <select
                className="input"
                value={gpu}
                onChange={(e) => setGpu(e.target.value as GpuChoice)}
              >
                <option value="none">Yok (CPU only)</option>
                <option value="low">Düşük (entegre / 4 GB altı)</option>
                <option value="mid">Orta (4-8 GB)</option>
                <option value="high">Yüksek (8 GB üstü)</option>
              </select>
            </div>
            {gpu !== "none" && (
              <div>
                <label className="label">GPU VRAM (GB)</label>
                <input
                  type="number"
                  min={2}
                  max={48}
                  className="input"
                  value={vramGB}
                  onChange={(e) => setVramGB(Number(e.target.value))}
                />
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <label className="label">Önceliğiniz neyse onu seçin</label>
            {(
              [
                {
                  v: "speed",
                  l: "⚡ Hız",
                  d: "Mümkün olduğunca hızlı cevap, kalite ikincil",
                },
                {
                  v: "turkish",
                  l: "🇹🇷 Türkçe kalite",
                  d: "Türkçe akıcılığı + nuans",
                },
                {
                  v: "balanced",
                  l: "⚖️ Dengeli",
                  d: "Makul hız + iyi Türkçe (önerilen)",
                },
              ] as { v: PriorityChoice; l: string; d: string }[]
            ).map((opt) => (
              <label
                key={opt.v}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                  priority === opt.v
                    ? "border-brand/40 bg-brand/5"
                    : "border-border hover:border-brand/30"
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value={opt.v}
                  checked={priority === opt.v}
                  onChange={() => setPriority(opt.v)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium">{opt.l}</div>
                  <div className="text-xs text-muted">{opt.d}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            {results.length === 0 ? (
              <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
                Donanımınıza uygun model bulunamadı. RAM yetersiz olabilir —
                en az 4 GB RAM gerekir.
              </div>
            ) : (
              results.map((m, idx) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-border bg-surface/50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">
                      {idx === 0 && "⭐ "}
                      {m.name}{" "}
                      <span className="text-xs text-muted">({m.id})</span>
                    </div>
                    <span className="text-xs text-muted">{m.sizeGB} GB</span>
                  </div>
                  <div className="mt-1 text-xs text-muted">{m.bestFor}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="badge bg-info/15 text-info">
                      RAM ≥{m.ramMinGB}GB
                    </span>
                    <span className="badge bg-info/15 text-info">
                      VRAM ≥{m.vramMinGB}GB
                    </span>
                    <span className="badge bg-info/15 text-info">
                      Hız: {m.speed}
                    </span>
                    <span className="badge bg-info/15 text-info">
                      TR: {m.turkish}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-bg-elev-2 px-2 py-1 text-xs">
                      {m.pullCmd}
                    </code>
                    <button
                      onClick={() => copyCmd(m.pullCmd, m.id)}
                      className="btn-secondary text-xs"
                    >
                      {copiedId === m.id ? "Kopyalandı ✓" : "Kopyala"}
                    </button>
                    {onSelect && (
                      <button
                        onClick={() => {
                          onSelect(m.id);
                          onClose();
                        }}
                        className="btn-primary text-xs"
                      >
                        Seç
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <button
            onClick={() => {
              if (step === 1) onClose();
              else setStep((step - 1) as 1 | 2);
            }}
            className="btn-ghost"
          >
            {step === 1 ? "Vazgeç" : "← Geri"}
          </button>
          {step < 3 ? (
            <button onClick={next} className="btn-primary">
              Devam →
            </button>
          ) : (
            <button onClick={onClose} className="btn-primary">
              Kapat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

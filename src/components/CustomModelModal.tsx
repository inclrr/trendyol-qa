import { useState } from "react";
import { X } from "./icons";
import { api } from "../api/tauri";

interface Props {
  trainingId: number;
  availableModels: { id: string; name: string }[];
  onClose: () => void;
  onCreated: (newModelId: string) => void;
}

export default function CustomModelModal({
  trainingId,
  availableModels,
  onClose,
  onCreated,
}: Props) {
  const [name, setName] = useState("trendyol-stil");
  const [baseModel, setBaseModel] = useState(
    availableModels[0]?.id ?? "qwen2.5:7b"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const created = await api.ollamaCreateCustomModel(
        name,
        baseModel,
        trainingId
      );
      setDone(created);
      onCreated(created);
    } catch (e: any) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card w-full max-w-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">
            🔧 Eğitimden Özel Model Oluştur
          </h3>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted">
          Sistem promptu modelin kendisine gömülür → her cevap üretiminde
          tekrar gönderilmez (%30-50 hız kazancı).
        </p>
        {done ? (
          <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm">
            ✓ <code>{done}</code> başarıyla oluşturuldu. AI Settings'te
            model dropdown'undan seçebilirsin.
          </div>
        ) : (
          <>
            <div>
              <label className="label">Yeni model adı</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="trendyol-stil"
              />
              <div className="mt-1 text-xs text-muted">
                Sadece harf, rakam, - ve _ izinli. Otomatik dönüştürülür.
              </div>
            </div>
            <div>
              <label className="label">Temel (FROM) model</label>
              <select
                className="input"
                value={baseModel}
                onChange={(e) => setBaseModel(e.target.value)}
              >
                {availableModels.length === 0 ? (
                  <option value="qwen2.5:7b">qwen2.5:7b</option>
                ) : (
                  availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}
          </>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
          <button onClick={onClose} className="btn-ghost">
            {done ? "Kapat" : "Vazgeç"}
          </button>
          {!done && (
            <button
              onClick={create}
              disabled={busy || !name.trim() || !baseModel.trim()}
              className="btn-primary"
            >
              {busy ? "Oluşturuluyor…" : "Oluştur"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

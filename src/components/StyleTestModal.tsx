import { useEffect, useState } from "react";
import { X, Sparkles } from "./icons";

interface Props {
  onClose: () => void;
  /** AI cevap üretici fonksiyon — sample soru için generate_answer'i question yerine
   * doğrudan free-form prompt ile çağıramıyoruz, bu yüzden parent çağırıcı ister. */
  generate: (sampleQuestion: string) => Promise<string>;
}

const SAMPLES = [
  "Bu ürünün bedeni dar mı, normal kalıp mı?",
  "Kargonuz ne kadar sürede gelir?",
  "İade etmek istesem nasıl yapacağım?",
];

interface Result {
  question: string;
  answer: string | null;
  loading: boolean;
  error: string | null;
}

export default function StyleTestModal({ onClose, generate }: Props) {
  const [results, setResults] = useState<Result[]>(
    SAMPLES.map((q) => ({ question: q, answer: null, loading: true, error: null }))
  );

  useEffect(() => {
    SAMPLES.forEach((q, i) => {
      generate(q)
        .then((a) =>
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, answer: a, loading: false } : r
            )
          )
        )
        .catch((e) =>
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? { ...r, error: String(e), loading: false }
                : r
            )
          )
        );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card w-full max-w-2xl space-y-3 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-5 w-5 text-brand" /> AI Stilini Test Et
          </h3>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted">
          3 örnek soru için AI'nin nasıl cevap verdiğini gör. Stil
          uyumsuzsa AI Settings'ten Sistem Promptunu düzenleyebilirsin.
        </p>
        <div className="space-y-3">
          {results.map((r, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border bg-surface/50 p-3"
            >
              <div className="text-xs font-semibold text-muted">
                Soru {idx + 1}
              </div>
              <div className="text-sm font-medium">{r.question}</div>
              <div className="mt-2 border-t border-border pt-2 text-sm">
                {r.loading ? (
                  <span className="text-muted">⏳ Üretiliyor…</span>
                ) : r.error ? (
                  <span className="text-danger">Hata: {r.error}</span>
                ) : (
                  <span>{r.answer}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end border-t border-border pt-3">
          <button onClick={onClose} className="btn-primary">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

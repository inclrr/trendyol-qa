import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type StoredQuestion } from "../api/tauri";
import AnswerComposer from "./AnswerComposer";
import ImageLightbox from "./ImageLightbox";
import { ExternalLink, Sparkles, X } from "./icons";
import {
  deadlineColor,
  deadlineIcon,
  formatDate,
  getDeadlineState,
  statusColor,
  statusLabel,
} from "../lib/format";
import { useAppStore } from "../stores/useAppStore";
import { openExternal } from "../lib/open";

interface Props {
  questionId: number;
  onClose: () => void;
  onSent: () => void;
}

/**
 * Bildirim üzerinden açılan AI cevap onay modalı.
 * `draft_ai_answer` doluysa textarea'ya önceden yüklenir; kullanıcı onaylar veya düzenler.
 */
export default function AIApprovalModal({ questionId, onClose, onSent }: Props) {
  const { t } = useTranslation();
  const [question, setQuestion] = useState<StoredQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const nowTick = useAppStore((s) => s.nowTick);
  const deadlineHours = useAppStore((s) => s.answerDeadlineHours);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .getQuestion(questionId)
      .then((q) => {
        if (alive) {
          setQuestion(q);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [questionId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="card">{t("app.loading")}</div>
      </div>
    );
  }
  if (!question) {
    onClose();
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card w-full max-w-2xl space-y-3 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            <h3 className="text-base font-semibold">
              {question.draftAiAnswer
                ? "AI Cevap Hazır"
                : "Cevap"}
            </h3>
            <span className={`badge ${statusColor(question.status)}`}>
              {statusLabel(question.status)}
            </span>
            {question.status === "WAITING_FOR_ANSWER" &&
              (() => {
                const dl = getDeadlineState(
                  question.creationDate,
                  deadlineHours,
                  nowTick
                );
                return (
                  <span
                    className={`badge text-sm font-semibold ${deadlineColor(
                      dl.status
                    )}`}
                  >
                    {deadlineIcon(dl.status)} {dl.label}
                  </span>
                );
              })()}
          </div>
          <button onClick={onClose} className="btn-ghost p-2" aria-label="Kapat">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-start gap-3">
          {question.productImageUrl && (
            <ImageLightbox
              src={question.productImageUrl}
              alt={question.productName ?? ""}
              className="h-16 w-16 rounded-md border border-border object-cover shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">
              {question.productName ?? "Ürün"}
            </div>
            <div className="text-xs text-muted">
              {question.customerName || t("app.anonymous")} ·{" "}
              {question.storeName} · {formatDate(question.creationDate)}
            </div>
            {question.productWebUrl && (
              <button
                onClick={() => openExternal(question.productWebUrl)}
                className="mt-0.5 inline-flex items-center text-xs text-info hover:underline"
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                {t("question.openOnTrendyol")}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl rounded-tl-sm bg-bg-elev-2 px-4 py-2 text-sm">
          <div className="text-[10px] text-muted mb-1">Soru</div>
          {question.text}
        </div>

        <AnswerComposer
          questionId={question.questionId}
          questionStatus={question.status}
          productName={question.productName}
          customerName={question.customerName}
          storeName={question.storeName}
          showTemplatePanel={false}
          initialText={question.draftAiAnswer ?? undefined}
          onSent={() => {
            onSent();
            onClose();
          }}
        />
      </div>
    </div>
  );
}

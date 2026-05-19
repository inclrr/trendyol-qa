import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api, type StoredQuestion } from "../api/tauri";
import AnswerComposer from "./AnswerComposer";
import ImageLightbox from "./ImageLightbox";
import { ExternalLink, X } from "./icons";
import { formatDate, statusColor, statusLabel } from "../lib/format";
import { openExternal } from "../lib/open";

interface Props {
  question: StoredQuestion;
  onClose: () => void;
  onSent: () => void;
}

export default function QuestionModal({ question, onClose, onSent }: Props) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [historyCount, setHistoryCount] = useState<number>(0);

  useEffect(() => {
    if (question.customerId) {
      api
        .getCustomerHistory(question.customerId, question.storeId, question.questionId)
        .then((h) => setHistoryCount(h.length))
        .catch(() => setHistoryCount(0));
    } else {
      setHistoryCount(0);
    }
  }, [question.questionId, question.customerId, question.storeId]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card w-full max-w-3xl space-y-3 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {question.productImageUrl && (
              <ImageLightbox
                src={question.productImageUrl}
                alt={question.productName ?? ""}
                className="h-20 w-20 rounded-md border border-border object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold">
                  {question.productName ?? "Ürün"}
                </h3>
                <span className={`badge ${statusColor(question.status)}`}>
                  {statusLabel(question.status)}
                </span>
                <span className="badge bg-bg-elev-2 text-muted border border-border">
                  {question.storeName}
                </span>
              </div>
              <div className="text-xs text-muted mt-1">
                {question.customerName || "Anonim Müşteri"} ·{" "}
                {formatDate(question.creationDate)}
              </div>
              {question.productWebUrl && (
                <button
                  onClick={() => openExternal(question.productWebUrl)}
                  className="mt-1 inline-flex items-center text-xs text-info hover:underline"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  {t("question.openOnTrendyol")}
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2" aria-label="Kapat">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-2xl rounded-tl-sm bg-bg-elev-2 px-4 py-3 text-sm">
          {question.text}
        </div>

        {question.answerText && (
          <div className="rounded-2xl rounded-tr-sm bg-brand/10 px-4 py-3 text-sm">
            <div className="text-[10px] text-muted mb-1">Mevcut Cevap</div>
            {question.answerText}
          </div>
        )}

        {historyCount > 0 && (
          <button
            onClick={() => {
              onClose();
              nav(`/inbox/${question.questionId}`);
            }}
            className="btn-secondary w-full"
          >
            💬 Bu müşterinin {historyCount} önceki soru-cevabı var — Tam sohbete git
          </button>
        )}

        <AnswerComposer
          questionId={question.questionId}
          questionStatus={question.status}
          onSent={() => {
            onSent();
            onClose();
          }}
        />
      </div>
    </div>
  );
}

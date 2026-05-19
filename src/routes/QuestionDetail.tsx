import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type StoredQuestion } from "../api/tauri";
import ChatView from "../components/ChatView";
import AnswerComposer from "../components/AnswerComposer";
import ImageLightbox from "../components/ImageLightbox";
import { ChevronLeft, ExternalLink } from "../components/icons";
import { formatDate, statusColor, statusLabel } from "../lib/format";
import { openExternal } from "../lib/open";

export default function QuestionDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [question, setQuestion] = useState<StoredQuestion | null>(null);
  const [history, setHistory] = useState<StoredQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const qid = Number(id);

  async function load() {
    if (!qid) return;
    setLoading(true);
    setError(null);
    try {
      const q = await api.getQuestion(qid);
      setQuestion(q);
      if (q?.customerId) {
        const h = await api.getCustomerHistory(q.customerId, q.storeId, qid);
        setHistory(h);
      } else {
        setHistory([]);
      }
    } catch (e: any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [qid]);

  if (!question) {
    return (
      <div className="p-6 text-center text-muted">
        <button onClick={() => nav(-1)} className="btn-ghost mb-4">
          <ChevronLeft className="mr-1 h-4 w-4" /> {t("app.back")}
        </button>
        {error ? (
          <div className="card border-danger/30 bg-danger/10 text-sm text-danger">
            <p>{error}</p>
            <button onClick={load} className="btn-secondary mt-3">
              {t("app.tryAgain")}
            </button>
          </div>
        ) : (
          <div>{loading ? t("app.loading") : "Soru bulunamadı."}</div>
        )}
      </div>
    );
  }

  const canAnswer = question.status === "WAITING_FOR_ANSWER";

  return (
    <div
      className={`grid grid-cols-1 gap-6 p-6 ${
        canAnswer ? "lg:grid-cols-[1fr_420px]" : ""
      }`}
    >
      <div className="space-y-4">
        <button onClick={() => nav(-1)} className="btn-ghost">
          <ChevronLeft className="mr-1 h-4 w-4" /> {t("app.back")}
        </button>

        <div className="card space-y-2">
          <div className="flex items-start gap-3">
            {question.productImageUrl && (
              <ImageLightbox
                src={question.productImageUrl}
                alt={question.productName ?? ""}
                className="h-20 w-20 rounded-md border border-border object-cover"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">
                  {question.productName ?? "Ürün"}
                </h2>
                <span className={`badge ${statusColor(question.status)}`}>
                  {statusLabel(question.status)}
                </span>
              </div>
              <div className="text-xs text-muted">
                {question.storeName} · {question.customerName ?? "Anonim"} ·{" "}
                {t("question.askedAt")}: {formatDate(question.creationDate)}
              </div>
              {question.productWebUrl && (
                <button
                  onClick={() => openExternal(question.productWebUrl)}
                  className="mt-1 inline-flex items-center text-sm text-info hover:underline"
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  {t("question.openOnTrendyol")}
                </button>
              )}
            </div>
          </div>
        </div>

        {!canAnswer && (
          <div className="card border-warning/30 bg-warning/10 text-sm">
            <strong>{t("question.cannotAnswer")}</strong>
            <p className="mt-1 text-muted">
              {question.status === "ANSWERED" ? t("question.answeredAlready") : ""}
            </p>
          </div>
        )}

        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-muted">
            {t("question.customerChat")} —{" "}
            {history.length > 0
              ? t("question.previousQAs", { count: history.length })
              : t("question.noPrevious")}
          </h3>
          <ChatView history={history} current={question} />
        </div>
      </div>

      {canAnswer && (
        <div>
          <AnswerComposer
            questionId={question.questionId}
            questionStatus={question.status}
            productName={question.productName}
            customerName={question.customerName}
            storeName={question.storeName}
            onSent={load}
          />
        </div>
      )}
    </div>
  );
}

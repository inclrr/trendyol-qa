import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { StoredQuestion } from "../api/tauri";
import {
  deadlineColor,
  deadlineIcon,
  formatRelativeTime,
  getDeadlineState,
  statusColor,
  statusLabel,
} from "../lib/format";
import { useAppStore } from "../stores/useAppStore";
import ImageLightbox from "./ImageLightbox";

interface Props {
  question: StoredQuestion;
  selected?: boolean;
  selectable?: boolean;
  onToggleSelect?: (id: number) => void;
  onOpen?: (id: number) => void;
  historyCount?: number;
}

function QuestionCard({
  question,
  selected,
  selectable,
  onToggleSelect,
  onOpen,
  historyCount,
}: Props) {
  const { t } = useTranslation();
  const nowTick = useAppStore((s) => s.nowTick);
  const deadlineHours = useAppStore((s) => s.answerDeadlineHours);
  const showDeadline = question.status === "WAITING_FOR_ANSWER";
  const dl = showDeadline
    ? getDeadlineState(question.creationDate, deadlineHours, nowTick)
    : null;
  return (
    <div
      className={`card cursor-pointer transition hover:border-brand/40 ${
        selected ? "ring-2 ring-brand/40 border-brand/40" : ""
      }`}
      onClick={() => onOpen?.(question.questionId)}
    >
      <div className="flex items-start gap-3">
        {selectable && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect?.(question.questionId);
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 h-4 w-4 cursor-pointer accent-[color:rgb(var(--brand))]"
          />
        )}
        {question.productImageUrl && (
          <div onClick={(e) => e.stopPropagation()}>
            <ImageLightbox
              src={question.productImageUrl}
              alt={question.productName ?? ""}
              className="h-14 w-14 rounded-md border border-border object-cover"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-semibold">
              {question.customerName || t("app.anonymous")}
            </span>
            <span className={`badge ${statusColor(question.status)}`}>
              {statusLabel(question.status)}
            </span>
            <span className="badge bg-bg-elev-2 text-muted border border-border">
              {question.storeName}
            </span>
            {historyCount !== undefined && historyCount > 0 && (
              <span className="badge bg-info/15 text-info">
                💬 {historyCount}
              </span>
            )}
            {dl && (
              <span
                className={`badge ${deadlineColor(dl.status)}`}
                title={`${deadlineHours} saat içinde cevaplanmalı`}
              >
                {deadlineIcon(dl.status)} {dl.label}
              </span>
            )}
          </div>
          <p className="line-clamp-2 text-sm text-fg">{question.text}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
            {question.productName && (
              <span className="truncate">📦 {question.productName}</span>
            )}
            <span>·</span>
            <span>{formatRelativeTime(question.creationDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(QuestionCard);

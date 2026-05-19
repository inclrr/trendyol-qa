import type { StoredQuestion } from "../api/tauri";
import { formatDate } from "../lib/format";

interface Props {
  history: StoredQuestion[];
  current: StoredQuestion;
}

export default function ChatView({ history, current }: Props) {
  const all = [...history, current].sort((a, b) => a.creationDate - b.creationDate);

  return (
    <div className="flex flex-col gap-3">
      {all.map((q) => (
        <div key={q.questionId} className="flex flex-col gap-2">
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-bg-elev-2 px-4 py-2 text-sm">
              <p>{q.text}</p>
              <div className="mt-1 text-[10px] text-muted">
                {q.customerName || "Müşteri"} · {formatDate(q.creationDate)}
              </div>
            </div>
          </div>
          {q.answerText && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand/10 px-4 py-2 text-sm">
                <p>{q.answerText}</p>
                <div className="mt-1 text-[10px] text-muted text-right">
                  {q.answerCreationDate ? formatDate(q.answerCreationDate) : ""}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

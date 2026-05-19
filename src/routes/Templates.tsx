import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type AnswerTemplate } from "../api/tauri";
import { Pencil, Plus, Trash } from "../components/icons";

const emptyTpl: AnswerTemplate = {
  title: "",
  body: "",
  category: "",
  usageCount: 0,
  createdAt: 0,
};

export default function Templates() {
  const { t } = useTranslation();
  const [list, setList] = useState<AnswerTemplate[]>([]);
  const [editing, setEditing] = useState<AnswerTemplate | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setList(await api.listTemplates());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      await api.upsertTemplate(editing);
      await refresh();
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm(t("templates.deleteConfirm"))) return;
    await api.deleteTemplate(id);
    await refresh();
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("templates.title")}</h2>
        <button onClick={() => setEditing({ ...emptyTpl })} className="btn-primary">
          <Plus className="mr-1 h-4 w-4" /> {t("templates.addNew")}
        </button>
      </div>

      {list.length === 0 ? (
        <div className="card text-center text-muted">{t("templates.noTemplates")}</div>
      ) : (
        <div className="space-y-2">
          {list.map((tpl) => (
            <div key={tpl.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{tpl.title}</h3>
                    {tpl.category && (
                      <span className="badge bg-bg-elev-2 text-muted border border-border">
                        {tpl.category}
                      </span>
                    )}
                    <span className="badge bg-info/15 text-info">
                      {t("templates.usage", { count: tpl.usageCount })}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{tpl.body}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(tpl)} className="btn-ghost p-2">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => tpl.id && remove(tpl.id)}
                    className="btn-ghost p-2 text-danger"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <div className="card w-full max-w-lg space-y-3">
            <h3 className="text-lg font-semibold">
              {editing.id ? t("app.edit") : t("templates.addNew")}
            </h3>
            <div>
              <label className="label">{t("templates.templateTitle")}</label>
              <input
                className="input"
                value={editing.title}
                onChange={(e) =>
                  setEditing((p) => ({ ...p!, title: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label">{t("templates.category")}</label>
              <input
                className="input"
                value={editing.category ?? ""}
                onChange={(e) =>
                  setEditing((p) => ({ ...p!, category: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label">{t("templates.body")}</label>
              <textarea
                rows={6}
                className="input"
                value={editing.body}
                onChange={(e) =>
                  setEditing((p) => ({ ...p!, body: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn-ghost">
                {t("app.cancel")}
              </button>
              <button onClick={save} disabled={busy} className="btn-primary">
                {busy ? t("app.saving") : t("app.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

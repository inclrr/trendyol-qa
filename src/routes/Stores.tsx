import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type Store } from "../api/tauri";
import { useAppStore } from "../stores/useAppStore";
import { Pencil, Plus, Trash } from "../components/icons";

interface FormData {
  id?: number;
  name: string;
  sellerId: number;
  environment: "prod" | "stage";
  integratorName: string;
  active: boolean;
  apiKey: string;
  apiSecret: string;
}

const empty: FormData = {
  name: "",
  sellerId: 0,
  environment: "prod",
  integratorName: "SelfIntegration",
  active: true,
  apiKey: "",
  apiSecret: "",
};

export default function Stores() {
  const { t } = useTranslation();
  const { setStores } = useAppStore();
  const stores = useAppStore((s) => s.stores);
  const [editing, setEditing] = useState<FormData | null>(null);
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const list = await api.listStores();
    setStores(list);
  }

  useEffect(() => {
    refresh();
  }, []);

  function startNew() {
    setEditing({ ...empty });
    setError(null);
    setTestResult(null);
  }

  function startEdit(s: Store) {
    setEditing({
      id: s.id,
      name: s.name,
      sellerId: s.sellerId,
      environment: s.environment,
      integratorName: s.integratorName,
      active: s.active,
      apiKey: "",
      apiSecret: "",
    });
    setError(null);
    setTestResult(null);
  }

  async function save() {
    if (!editing) return;
    // Frontend validation
    if (editing.name.trim() === "") {
      setError("Mağaza adı boş olamaz.");
      return;
    }
    if (!editing.id) {
      if (!Number.isInteger(editing.sellerId) || editing.sellerId <= 0) {
        setError("Geçerli bir Satıcı ID (sellerId) giriniz.");
        return;
      }
      if (editing.apiKey.trim().length < 10 || editing.apiSecret.trim().length < 10) {
        setError("API Key ve Secret en az 10 karakter olmalıdır.");
        return;
      }
    } else if (
      (editing.apiKey && editing.apiKey.length < 10) ||
      (editing.apiSecret && editing.apiSecret.length < 10)
    ) {
      setError("Güncelleme için yeni API Key/Secret de en az 10 karakter olmalı (veya boş bırakın).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing.id) {
        await api.updateStore({
          id: editing.id,
          name: editing.name.trim(),
          environment: editing.environment,
          integratorName: editing.integratorName.trim() || "SelfIntegration",
          active: editing.active,
          apiKey: editing.apiKey || undefined,
          apiSecret: editing.apiSecret || undefined,
        });
      } else {
        await api.createStore({
          name: editing.name.trim(),
          sellerId: editing.sellerId,
          environment: editing.environment,
          integratorName: editing.integratorName.trim() || "SelfIntegration",
          active: editing.active,
          apiKey: editing.apiKey.trim(),
          apiSecret: editing.apiSecret.trim(),
        });
      }
      await refresh();
      setEditing(null);
    } catch (e: any) {
      setError(String(e));
    }
    setBusy(false);
  }

  async function remove(s: Store) {
    if (!confirm(t("stores.deleteConfirm"))) return;
    await api.deleteStore(s.id);
    await refresh();
  }

  async function test() {
    if (!editing) return;
    setBusy(true);
    setTestResult(null);
    setError(null);
    try {
      await api.testStoreConnection({
        sellerId: editing.sellerId,
        environment: editing.environment,
        integratorName: editing.integratorName,
        apiKey: editing.apiKey,
        apiSecret: editing.apiSecret,
      });
      setTestResult(t("stores.testSuccess"));
    } catch (e: any) {
      setTestResult(`${t("stores.testFailed")}: ${String(e)}`);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("stores.title")}</h2>
        <button onClick={startNew} className="btn-primary">
          <Plus className="mr-1 h-4 w-4" />
          {t("stores.addNew")}
        </button>
      </div>

      {stores.length === 0 ? (
        <div className="card text-center text-muted">{t("stores.noStores")}</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {stores.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{s.name}</span>
                    {s.active ? (
                      <span className="badge bg-success/15 text-success">
                        {t("stores.statusActive")}
                      </span>
                    ) : (
                      <span className="badge bg-muted/15 text-muted">
                        {t("stores.statusInactive")}
                      </span>
                    )}
                    <span className="badge bg-bg-elev-2 text-muted border border-border">
                      {s.environment === "prod"
                        ? t("stores.envShortProd")
                        : t("stores.envShortStage")}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    sellerId: {s.sellerId} · {s.integratorName}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(s)} className="btn-ghost p-2">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(s)} className="btn-ghost p-2 text-danger">
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
              {editing.id ? t("app.edit") : t("stores.addNew")}
            </h3>
            <div>
              <label className="label">{t("stores.name")}</label>
              <input
                className="input"
                value={editing.name}
                onChange={(e) =>
                  setEditing((p) => ({ ...p!, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="label">{t("stores.sellerId")}</label>
                <input
                  type="number"
                  disabled={!!editing.id}
                  className="input"
                  value={editing.sellerId || ""}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p!, sellerId: Number(e.target.value) }))
                  }
                />
              </div>
              <div>
                <label className="label">{t("stores.environment")}</label>
                <select
                  className="input"
                  value={editing.environment}
                  onChange={(e) =>
                    setEditing((p) => ({
                      ...p!,
                      environment: e.target.value as "prod" | "stage",
                    }))
                  }
                >
                  <option value="prod">{t("stores.prod")}</option>
                  <option value="stage">{t("stores.stage")}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">{t("stores.integratorName")}</label>
              <input
                className="input"
                value={editing.integratorName}
                onChange={(e) =>
                  setEditing((p) => ({ ...p!, integratorName: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label">
                {t("stores.apiKey")}
                {editing.id ? ` (${t("stores.leaveBlank")})` : ""}
              </label>
              <input
                type="password"
                className="input"
                value={editing.apiKey}
                onChange={(e) =>
                  setEditing((p) => ({ ...p!, apiKey: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label">
                {t("stores.apiSecret")}
                {editing.id ? ` (${t("stores.leaveBlank")})` : ""}
              </label>
              <input
                type="password"
                className="input"
                value={editing.apiSecret}
                onChange={(e) =>
                  setEditing((p) => ({ ...p!, apiSecret: e.target.value }))
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) =>
                  setEditing((p) => ({ ...p!, active: e.target.checked }))
                }
              />
              {t("stores.active")}
            </label>

            {testResult && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  testResult.startsWith(t("stores.testSuccess"))
                    ? "bg-success/10 text-success"
                    : "bg-danger/10 text-danger"
                }`}
              >
                {testResult}
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={test}
                disabled={busy || !editing.apiKey || !editing.apiSecret}
                className="btn-secondary"
              >
                {t("stores.testConnection")}
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="btn-ghost">
                  {t("app.cancel")}
                </button>
                <button onClick={save} disabled={busy} className="btn-primary">
                  {busy ? t("app.saving") : t("app.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

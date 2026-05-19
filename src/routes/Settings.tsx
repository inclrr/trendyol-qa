import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { getVersion } from "@tauri-apps/api/app";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { api } from "../api/tauri";
import { openExternal } from "../lib/open";
import { useUpdaterStore } from "../stores/useUpdaterStore";
import { RefreshCw } from "../components/icons";

export default function Settings() {
  const { t } = useTranslation();
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [pollInterval, setPollInterval] = useState(120);
  const [autostart, setAutostart] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [autoAiReply, setAutoAiReply] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [version, setVersion] = useState<string>("");
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [backupErr, setBackupErr] = useState<string | null>(null);
  const [restartCountdown, setRestartCountdown] = useState<number | null>(null);
  const {
    checking,
    available,
    version: newVersion,
    notes,
    downloading,
    progress,
    error: updaterError,
    lastChecked,
    manualCheck,
    downloadAndInstall,
  } = useUpdaterStore();

  useEffect(() => {
    (async () => {
      const s = await api.getAllSettings();
      setPollingEnabled(s.polling_enabled === "true");
      setPollInterval(Number(s.poll_interval_seconds ?? 120));
      setAutoAdvance(s.auto_advance_after_answer !== "false");
      setAutoAiReply(s.auto_ai_reply !== "false");
      setNotificationSound(s.notification_sound_enabled !== "false");
      try {
        setAutostart(await isEnabled());
      } catch {
        setAutostart(false);
      }
      try {
        setVersion(await getVersion());
      } catch {
        setVersion("");
      }
    })();
  }, []);

  async function save() {
    await api.setSetting("polling_enabled", String(pollingEnabled));
    await api.setSetting("poll_interval_seconds", String(pollInterval));
    await api.setSetting("auto_advance_after_answer", String(autoAdvance));
    await api.setSetting("auto_ai_reply", String(autoAiReply));
    await api.setSetting("notification_sound_enabled", String(notificationSound));
    try {
      if (autostart) await enable();
      else await disable();
      await api.setSetting("autostart_enabled", String(autostart));
    } catch (e) {
      console.warn(e);
    }
    setSavedMsg(t("settings.saved"));
    setTimeout(() => setSavedMsg(null), 2500);
  }

  async function handleBackupExport() {
    setBackupErr(null);
    setBackupMsg(null);
    try {
      const stamp = new Date()
        .toISOString()
        .replace(/[:T]/g, "-")
        .slice(0, 16);
      const path = await saveDialog({
        defaultPath: `trendyol-qa-yedek-${stamp}.sqlite`,
        filters: [{ name: "SQLite", extensions: ["sqlite", "db"] }],
      });
      if (!path) return;
      setBackupBusy(true);
      const size = await api.backupExport(path);
      setBackupMsg(
        t("settings.backupSuccess", { size: Math.round(size / 1024) })
      );
    } catch (e: any) {
      setBackupErr(String(e));
    } finally {
      setBackupBusy(false);
    }
  }

  async function handleBackupImport() {
    setBackupErr(null);
    setBackupMsg(null);
    try {
      const path = await openDialog({
        multiple: false,
        filters: [{ name: "SQLite", extensions: ["sqlite", "db"] }],
      });
      if (!path || Array.isArray(path)) return;
      if (!confirm(t("settings.restoreConfirm"))) return;
      setBackupBusy(true);
      await api.backupImport(path);
      setBackupMsg(t("settings.restoreSuccess"));
      // Pool eski DB'ye bağlı olduğu için restart şart. Geri sayım göster.
      let secs = 5;
      setRestartCountdown(secs);
      const interval = window.setInterval(() => {
        secs -= 1;
        setRestartCountdown(secs);
        if (secs <= 0) {
          window.clearInterval(interval);
          relaunch().catch(() => {});
        }
      }, 1000);
    } catch (e: any) {
      setBackupErr(String(e));
    } finally {
      setBackupBusy(false);
    }
  }

  function formatLastChecked() {
    if (!lastChecked) return t("settings.neverChecked");
    return new Date(lastChecked).toLocaleString("tr-TR");
  }

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-xl font-semibold">{t("settings.title")}</h2>

      <section className="card space-y-3">
        <h3 className="text-sm font-semibold text-muted">
          {t("settings.updates")}
        </h3>
        <div className="text-sm">
          {t("settings.currentVersion")}:{" "}
          <span className="font-mono">{version || "—"}</span>
        </div>

        {available ? (
          <div className="rounded-lg bg-success/10 p-3 text-sm">
            <div className="font-semibold text-success">
              {t("settings.updateAvailable", { version: newVersion })}
            </div>
            {notes && (
              <div className="mt-2">
                <div className="mb-1 text-xs font-semibold text-fg">
                  ✨ {t("settings.whatsNew")}
                </div>
                <div className="max-h-72 overflow-auto rounded-md bg-bg-elev-2 p-2 text-xs leading-relaxed">
                  {notes.split("\n").map((line, i) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <br key={i} />;
                    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                      return (
                        <div key={i} className="ml-2">
                          • {trimmed.slice(2)}
                        </div>
                      );
                    }
                    if (trimmed.startsWith("#")) {
                      return (
                        <div key={i} className="mt-2 font-semibold text-fg">
                          {trimmed.replace(/^#+\s*/, "")}
                        </div>
                      );
                    }
                    return <div key={i}>{trimmed}</div>;
                  })}
                </div>
                <button
                  onClick={() =>
                    openExternal(
                      "https://github.com/inclrr/trendyol-qa/blob/main/CHANGELOG.md"
                    )
                  }
                  className="mt-2 text-xs text-info hover:underline"
                >
                  {t("settings.viewFullChangelog")} →
                </button>
              </div>
            )}
            <button
              onClick={downloadAndInstall}
              disabled={downloading}
              className="btn-primary mt-3"
            >
              {downloading
                ? t("settings.downloading", { progress })
                : t("settings.downloadAndInstall")}
            </button>
          </div>
        ) : (
          <div className="text-sm text-muted">
            {checking ? t("settings.checking") : t("settings.upToDate")}
          </div>
        )}

        {updaterError && (
          <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">
            {updaterError}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={manualCheck}
            disabled={checking || downloading}
            className="btn-secondary"
          >
            <RefreshCw
              className={`mr-1 h-4 w-4 ${checking ? "animate-spin" : ""}`}
            />
            {checking ? t("settings.checking") : t("settings.checkForUpdates")}
          </button>
          <span className="text-xs text-muted">
            {t("settings.lastChecked")}: {formatLastChecked()}
          </span>
        </div>
      </section>

      <section className="card space-y-3">
        <h3 className="text-sm font-semibold text-muted">
          {t("settings.polling")}
        </h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pollingEnabled}
            onChange={(e) => setPollingEnabled(e.target.checked)}
          />
          {t("settings.pollingEnabled")}
        </label>
        <div>
          <label className="label">{t("settings.pollInterval")}</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={30}
              max={3600}
              className="input max-w-[120px]"
              value={pollInterval}
              onChange={(e) => setPollInterval(Number(e.target.value))}
            />
            <span className="text-sm text-muted">{t("settings.seconds")}</span>
            <span className="text-xs text-muted">
              ({Math.round(pollInterval / 60)} {t("settings.minutes")})
            </span>
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h3 className="text-sm font-semibold text-muted">
          {t("settings.backup")}
        </h3>
        <p className="text-xs text-muted">{t("settings.backupHint")}</p>
        <div className="flex gap-2">
          <button
            onClick={handleBackupExport}
            disabled={backupBusy}
            className="btn-secondary"
          >
            {t("settings.backupExport")}
          </button>
          <button
            onClick={handleBackupImport}
            disabled={backupBusy}
            className="btn-secondary"
          >
            {t("settings.backupImport")}
          </button>
        </div>
        {backupMsg && (
          <div className="rounded-lg bg-success/10 p-2 text-xs text-success">
            {backupMsg}
            {restartCountdown !== null && restartCountdown > 0 && (
              <span className="ml-2 font-semibold">
                {t("settings.restartingIn", { secs: restartCountdown })}
              </span>
            )}
          </div>
        )}
        {backupErr && (
          <div className="rounded-lg bg-danger/10 p-2 text-xs text-danger">
            {backupErr}
          </div>
        )}
      </section>

      <section className="card space-y-3">
        <h3 className="text-sm font-semibold text-muted">
          {t("settings.answeringBehavior")}
        </h3>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoAdvance}
            onChange={(e) => setAutoAdvance(e.target.checked)}
            className="mt-1"
          />
          <span>
            {t("settings.autoAdvance")}
            <div className="text-xs text-muted">{t("settings.autoAdvanceHint")}</div>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoAiReply}
            onChange={(e) => setAutoAiReply(e.target.checked)}
            className="mt-1"
          />
          <span>
            {t("settings.autoAiReply")}
            <div className="text-xs text-muted">{t("settings.autoAiReplyHint")}</div>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={notificationSound}
            onChange={(e) => setNotificationSound(e.target.checked)}
            className="mt-1"
          />
          <span>{t("settings.notificationSound")}</span>
        </label>
      </section>

      <section className="card space-y-3">
        <h3 className="text-sm font-semibold text-muted">
          {t("settings.startup")}
        </h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autostart}
            onChange={(e) => setAutostart(e.target.checked)}
          />
          {t("settings.autostart")}
        </label>
        <p className="text-xs text-muted">{t("settings.autostartHint")}</p>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={save} className="btn-primary">
          {t("app.save")}
        </button>
        {savedMsg && <span className="text-sm text-success">{savedMsg}</span>}
      </div>
    </div>
  );
}

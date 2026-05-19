import { useEffect } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import Layout from "./components/Layout";
import Inbox from "./routes/Inbox";
import QuestionDetail from "./routes/QuestionDetail";
import BulkAnswer from "./routes/BulkAnswer";
import Stores from "./routes/Stores";
import Templates from "./routes/Templates";
import AISettings from "./routes/AISettings";
import Settings from "./routes/Settings";
import { applyTheme, useAppStore } from "./stores/useAppStore";
import { useUpdaterStore } from "./stores/useUpdaterStore";
import { api } from "./api/tauri";

export default function App() {
  const { theme, setTheme, setStores, setPendingCount } = useAppStore();
  const silentCheckUpdate = useUpdaterStore((s) => s.silentCheck);

  useEffect(() => {
    (async () => {
      const settings = await api.getAllSettings();
      const t = (settings.theme as "light" | "dark" | "system") || "system";
      setTheme(t);
      applyTheme(t);
      const stores = await api.listStores();
      setStores(stores);
      await refreshPending();
      // Açılışta sessizce güncelleme kontrolü (5 saniye bekleyip)
      window.setTimeout(() => {
        silentCheckUpdate();
      }, 5000);
    })();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (useAppStore.getState().theme === "system") applyTheme("system");
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [setTheme, setStores, setPendingCount]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const un1 = listen("questions:synced", () => {
      refreshPending();
    });
    const un2 = listen("tray:sync-request", async () => {
      try {
        await api.syncNow();
        refreshPending();
      } catch (e) {
        console.warn(e);
      }
    });
    return () => {
      un1.then((f) => f());
      un2.then((f) => f());
    };
  }, []);

  async function refreshPending() {
    try {
      const list = await api.listQuestions({ status: "WAITING_FOR_ANSWER" });
      setPendingCount(list.length);
    } catch (e) {
      console.warn(e);
    }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/inbox" replace />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/inbox/:id" element={<QuestionDetail />} />
        <Route path="/bulk" element={<BulkAnswer />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/stores" element={<Stores />} />
        <Route path="/ai" element={<AISettings />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

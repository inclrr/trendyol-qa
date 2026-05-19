import { useEffect } from "react";
import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import Layout from "./components/Layout";
import { useInboxStore } from "./stores/useInboxStore";
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
  const nav = useNavigate();
  const setInboxStatus = useInboxStore((s) => s.setStatus);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const un3 = listen<number[]>("notification:focus", (ev) => {
      // Pencere ön plana geldi ve bekleyen bildirimler var → inbox'ta WAITING_FOR_ANSWER'a git
      const ids = ev.payload;
      if (ids && ids.length > 0) {
        setInboxStatus("WAITING_FOR_ANSWER");
        const target = ids[ids.length - 1];
        nav(`/inbox/${target}`);
      }
    });
    // Pencere focus alınca update kontrolü (son kontrolden 5dk+ geçtiyse)
    let lastFocusCheck = 0;
    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusCheck > 5 * 60 * 1000) {
        lastFocusCheck = now;
        silentCheckUpdate();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => {
      un1.then((f) => f());
      un2.then((f) => f());
      un3.then((f) => f());
      window.removeEventListener("focus", onFocus);
    };
  }, [nav, setInboxStatus, silentCheckUpdate]);

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

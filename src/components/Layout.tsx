import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../stores/useAppStore";
import { useInboxStore } from "../stores/useInboxStore";
import { useUpdaterStore } from "../stores/useUpdaterStore";
import ThemeToggle from "./ThemeToggle";
import { Bell, Inbox, Settings as SettingsIcon, Store, FileText, Sparkles } from "./icons";

export default function Layout() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const pendingCount = useAppStore((s) => s.pendingCount);
  const setStatus = useInboxStore((s) => s.setStatus);
  const updateAvailable = useUpdaterStore((s) => s.available);

  function openNotifications() {
    setStatus("WAITING_FOR_ANSWER");
    nav("/inbox");
  }

  const navItems = [
    { to: "/inbox", label: t("nav.inbox"), Icon: Inbox },
    { to: "/templates", label: t("nav.templates"), Icon: FileText },
    { to: "/stores", label: t("nav.stores"), Icon: Store },
    { to: "/ai", label: t("nav.ai"), Icon: Sparkles },
    { to: "/settings", label: t("nav.settings"), Icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-fg">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-bg-elev">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-brand-fg font-bold">Q</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Trendyol</div>
            <div className="text-xs text-muted">Soru-Cevap</div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-2">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand/10 text-brand"
                    : "text-fg hover:bg-bg-elev-2"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {to === "/inbox" && pendingCount > 0 && (
                <span className="badge bg-warning text-white">{pendingCount}</span>
              )}
              {to === "/settings" && updateAvailable && (
                <span className="badge bg-success text-white" title="Yeni sürüm var">
                  ●
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border bg-bg-elev px-6 py-3">
          <h1 className="text-lg font-semibold">{t("app.title")}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={openNotifications}
              title={t("inbox.notificationsAll")}
              className="relative rounded-md p-2 transition hover:bg-bg-elev-2"
            >
              <Bell className="h-5 w-5 text-muted" />
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-warning px-1 text-[10px] text-white">
                  {pendingCount}
                </span>
              )}
            </button>
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

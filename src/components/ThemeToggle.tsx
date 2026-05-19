import { useTranslation } from "react-i18next";
import { useAppStore, applyTheme } from "../stores/useAppStore";
import { api } from "../api/tauri";
import { Sun, Moon, Monitor } from "./icons";

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useAppStore();

  async function set(next: "light" | "dark" | "system") {
    setTheme(next);
    applyTheme(next);
    await api.setSetting("theme", next);
  }

  const buttons: { value: "light" | "dark" | "system"; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: t("settings.themeLight"), Icon: Sun },
    { value: "dark", label: t("settings.themeDark"), Icon: Moon },
    { value: "system", label: t("settings.themeSystem"), Icon: Monitor },
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-elev p-1">
      {buttons.map(({ value, label, Icon }) => (
        <button
          key={value}
          onClick={() => set(value)}
          title={label}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
            theme === value
              ? "bg-brand text-brand-fg"
              : "text-muted hover:bg-bg-elev-2 hover:text-fg"
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

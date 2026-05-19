import { useTranslation } from "react-i18next";
import { useAppStore } from "../stores/useAppStore";

export default function StoreSelector() {
  const { t } = useTranslation();
  const { stores, selectedStoreIds, setSelectedStoreIds } = useAppStore();

  const allSelected = selectedStoreIds === null;

  function toggle(id: number) {
    if (allSelected) {
      const others = stores.filter((s) => s.id !== id).map((s) => s.id);
      setSelectedStoreIds(others);
      return;
    }
    const current = selectedStoreIds ?? [];
    if (current.includes(id)) {
      const next = current.filter((x) => x !== id);
      setSelectedStoreIds(next.length === 0 ? [] : next);
    } else {
      const next = [...current, id];
      setSelectedStoreIds(next.length === stores.length ? null : next);
    }
  }

  function toggleAll() {
    setSelectedStoreIds(allSelected ? [] : null);
  }

  if (stores.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg-elev p-2">
      <span className="px-2 text-sm text-muted">{t("inbox.filterByStore")}:</span>
      <button
        onClick={toggleAll}
        className={`badge cursor-pointer border ${
          allSelected
            ? "bg-brand text-brand-fg border-brand"
            : "bg-bg-elev-2 text-fg border-border"
        }`}
      >
        ✓ {t("inbox.all")}
      </button>
      {stores.map((s) => {
        const selected = allSelected || (selectedStoreIds ?? []).includes(s.id);
        return (
          <button
            key={s.id}
            onClick={() => toggle(s.id)}
            className={`badge cursor-pointer border ${
              selected
                ? "bg-brand/10 text-brand border-brand/40"
                : "bg-bg-elev-2 text-muted border-border"
            }`}
          >
            {selected ? "✓ " : ""}
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

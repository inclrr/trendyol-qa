import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { api } from "../api/tauri";

interface AiState {
  training: boolean;
  trainMsg: string | null;
  trainErr: string | null;
  trainProgressLabel: string | null;
  initListeners: () => void;
  startTraining: (
    startDate: number,
    endDate: number,
    storeIds: number[] | null
  ) => Promise<void>;
  clearMessages: () => void;
}

let listenersInitialized = false;

export const useAiStore = create<AiState>((set, get) => ({
  training: false,
  trainMsg: null,
  trainErr: null,
  trainProgressLabel: null,
  initListeners: () => {
    if (listenersInitialized) return;
    listenersInitialized = true;
    listen<{
      storeIdx: number;
      storeTotal: number;
      storeName: string;
      pageIdx: number;
      pairsFound: number;
      phase: string;
    }>("ai-training:progress", (event) => {
      const p = event.payload;
      let label = "";
      if (p.phase === "fetching") {
        if (p.storeTotal > 0) {
          label = `Mağaza ${p.storeIdx + 1}/${p.storeTotal} (${p.storeName})`;
          if (p.pageIdx > 0) label += `, sayfa ${p.pageIdx}`;
          label += ` — ${p.pairsFound} cevap bulundu`;
        }
      } else if (p.phase === "fetched") {
        label = `${p.pairsFound} cevap bulundu — AI'ya gönderiliyor…`;
      } else if (p.phase === "generating") {
        label = `${p.pairsFound} cevap AI'ya analiz için gönderildi, sistem promptu üretiliyor…`;
      } else if (p.phase === "done") {
        label = "Eğitim tamamlandı, kayıt yapılıyor…";
      }
      if (label) {
        set({ trainProgressLabel: label });
      }
    });
  },
  startTraining: async (startDate, endDate, storeIds) => {
    if (get().training) return;
    set({
      training: true,
      trainMsg: null,
      trainErr: null,
      trainProgressLabel: "Geçmiş soru-cevap verisi çekiliyor…",
    });
    try {
      const res = await api.trainAi(startDate, endDate, storeIds);
      set({
        training: false,
        trainMsg: `Eğitim tamamlandı! ${res.qaPairCount} soru-cevap çifti kullanıldı.`,
        trainErr: null,
        trainProgressLabel: null,
      });
    } catch (e: any) {
      set({
        training: false,
        trainMsg: null,
        trainErr: String(e),
        trainProgressLabel: null,
      });
    }
  },
  clearMessages: () => set({ trainMsg: null, trainErr: null }),
}));

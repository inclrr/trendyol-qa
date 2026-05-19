import { create } from "zustand";
import { api } from "../api/tauri";

interface AiState {
  training: boolean;
  trainMsg: string | null;
  trainErr: string | null;
  trainProgressLabel: string | null;
  startTraining: (
    startDate: number,
    endDate: number,
    storeIds: number[] | null
  ) => Promise<void>;
  clearMessages: () => void;
}

export const useAiStore = create<AiState>((set, get) => ({
  training: false,
  trainMsg: null,
  trainErr: null,
  trainProgressLabel: null,
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

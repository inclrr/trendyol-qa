// 2026 Mayıs itibarıyla Ollama için tavsiye edilen modellerin statik listesi.
// Web araştırması kaynakları: morphllm.com, whatllm.org, localaimaster.com,
// computingforgeeks.com, ollama.com/library

export type ModelSpeed = "very-fast" | "fast" | "medium" | "slow";
export type LangQuality = "excellent" | "good" | "fair" | "weak";

export interface RecommendedModel {
  id: string;
  name: string;
  sizeGB: number;
  ramMinGB: number;
  vramMinGB: number;
  speed: ModelSpeed;
  turkish: LangQuality;
  bestFor: string;
  pullCmd: string;
}

export const RECOMMENDED_MODELS: RecommendedModel[] = [
  {
    id: "qwen2.5:7b",
    name: "Qwen 2.5 7B",
    sizeGB: 4.7,
    ramMinGB: 8,
    vramMinGB: 5,
    speed: "fast",
    turkish: "excellent",
    bestFor: "Türkçe müşteri hizmetleri (önerilen)",
    pullCmd: "ollama pull qwen2.5:7b",
  },
  {
    id: "llama3.2:3b",
    name: "Llama 3.2 3B",
    sizeGB: 2.0,
    ramMinGB: 4,
    vramMinGB: 3,
    speed: "very-fast",
    turkish: "fair",
    bestFor: "Düşük donanım, çok hızlı cevap",
    pullCmd: "ollama pull llama3.2:3b",
  },
  {
    id: "phi3:mini",
    name: "Phi-3 Mini 3.8B",
    sizeGB: 2.3,
    ramMinGB: 4,
    vramMinGB: 3,
    speed: "very-fast",
    turkish: "fair",
    bestFor: "Reasoning + hızlı cevap",
    pullCmd: "ollama pull phi3:mini",
  },
  {
    id: "mistral:7b",
    name: "Mistral 7B",
    sizeGB: 4.1,
    ramMinGB: 8,
    vramMinGB: 5,
    speed: "fast",
    turkish: "good",
    bestFor: "Stabil ve öngörülebilir cevap",
    pullCmd: "ollama pull mistral:7b",
  },
  {
    id: "gemma3:12b",
    name: "Gemma 3 12B",
    sizeGB: 8.0,
    ramMinGB: 12,
    vramMinGB: 10,
    speed: "medium",
    turkish: "good",
    bestFor: "Yüksek kalite, güçlü donanım",
    pullCmd: "ollama pull gemma3:12b",
  },
];

export const EMBEDDING_MODELS = [
  {
    id: "nomic-embed-text",
    name: "Nomic Embed Text",
    sizeMB: 274,
    pullCmd: "ollama pull nomic-embed-text",
    bestFor: "Genel amaçlı embedding (önerilen, küçük + hızlı)",
  },
  {
    id: "mxbai-embed-large",
    name: "MixedBread Embed Large",
    sizeMB: 670,
    pullCmd: "ollama pull mxbai-embed-large",
    bestFor: "Daha kaliteli arama (daha büyük)",
  },
];

export type PriorityChoice = "speed" | "turkish" | "balanced";
export type GpuChoice = "none" | "low" | "mid" | "high";

export interface HardwareProfile {
  ramGB: number;
  gpu: GpuChoice;
  vramGB: number;
  priority: PriorityChoice;
}

/** Donanım + öncelik bilgisine göre uygun modelleri skorla ve sırala. */
export function recommendModels(
  profile: HardwareProfile
): RecommendedModel[] {
  return RECOMMENDED_MODELS.map((m) => {
    let score = 0;
    // Donanım uygunluğu (filtre değil, ceza)
    if (profile.ramGB >= m.ramMinGB) score += 30;
    else score -= 50;
    if (profile.gpu === "none") {
      // CPU only — küçük model tercih
      if (m.sizeGB <= 3) score += 25;
      else if (m.sizeGB <= 5) score += 5;
      else score -= 30;
    } else if (profile.vramGB >= m.vramMinGB) {
      score += 25;
    } else {
      score -= 25;
    }
    // Öncelik
    if (profile.priority === "speed") {
      if (m.speed === "very-fast") score += 30;
      else if (m.speed === "fast") score += 15;
      else if (m.speed === "medium") score += 0;
      else score -= 15;
    } else if (profile.priority === "turkish") {
      if (m.turkish === "excellent") score += 30;
      else if (m.turkish === "good") score += 15;
      else if (m.turkish === "fair") score += 0;
      else score -= 20;
    } else {
      // dengeli
      if (m.speed === "fast" || m.speed === "very-fast") score += 10;
      if (m.turkish === "excellent" || m.turkish === "good") score += 15;
    }
    return { model: m, score };
  })
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score > 0)
    .slice(0, 3)
    .map((x) => x.model);
}

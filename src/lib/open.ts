import { openUrl } from "@tauri-apps/plugin-opener";

export async function openExternal(url: string | null | undefined) {
  if (!url) return;
  try {
    await openUrl(url);
  } catch (e) {
    console.warn("openUrl failed", e);
    // fallback: window.open denemesi (Tauri webview'da çalışmaz ama browserda çalışır)
    window.open(url, "_blank");
  }
}

export function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec} sn önce`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} dk önce`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} sa önce`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} gün önce`;
  return new Date(ms).toLocaleDateString("tr-TR");
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleString("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusLabel(status: string): string {
  switch (status) {
    case "WAITING_FOR_ANSWER":
      return "Bekleyen";
    case "ANSWERED":
      return "Cevaplanan";
    case "REPORTED":
      return "Raporlanan";
    case "REJECTED":
      return "Reddedilen";
    case "UNANSWERED":
      return "Süresi Doldu";
    default:
      return status;
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "WAITING_FOR_ANSWER":
      return "bg-warning/15 text-warning";
    case "ANSWERED":
      return "bg-success/15 text-success";
    case "REPORTED":
      return "bg-info/15 text-info";
    case "REJECTED":
      return "bg-danger/15 text-danger";
    case "UNANSWERED":
      return "bg-muted/15 text-muted";
    default:
      return "bg-bg-elev-2 text-muted";
  }
}

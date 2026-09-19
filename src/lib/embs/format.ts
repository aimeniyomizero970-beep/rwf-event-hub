export function rwf(amount: number): string {
  return `${amount.toLocaleString("en-US")} RWF`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function randomId(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ticketCode(): string {
  const year = new Date().getFullYear();
  const n = Math.random().toString(36).toUpperCase().slice(2, 7);
  return `TKT-${year}-${n}`;
}

export function txReference(method: string): string {
  const prefix = method.startsWith("MTN")
    ? "MTN"
    : method.startsWith("Airtel")
      ? "AIR"
      : method === "Card"
        ? "CRD"
        : "CSH";
  return `${prefix}-${Date.now().toString().slice(-8)}-${Math.random().toString(36).toUpperCase().slice(2, 6)}`;
}

export function bookingRef(): string {
  return `BK-${new Date().getFullYear()}-${Math.random().toString(36).toUpperCase().slice(2, 7)}`;
}

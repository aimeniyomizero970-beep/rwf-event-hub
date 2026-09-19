const WRAPPER = (body: string, title: string) => `<!doctype html>
<html><head><meta charset="utf-8" /><title>${title}</title>
<style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;margin:24px;color:#0f172a;background:#fff}
  .ticket{border:1px solid #cbd5e1;border-radius:12px;padding:16px;margin-bottom:16px;display:flex;gap:16px;justify-content:space-between;page-break-inside:avoid}
  h3{margin:4px 0;font-size:16px}
  p{margin:2px 0;font-size:13px;color:#475569}
  .code{font-family:ui-monospace,monospace;font-weight:700;letter-spacing:1px}
</style></head><body>${body}</body></html>`;

function collect(elementId: string): string | null {
  const el = document.getElementById(elementId);
  return el ? el.innerHTML : null;
}

export function printArea(elementId: string, title = "EMBS Tickets") {
  const html = collect(elementId);
  if (!html) return;
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(WRAPPER(html, title));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

export function downloadArea(elementId: string, filename = "embs-tickets.html", title = "EMBS Tickets") {
  const html = collect(elementId);
  if (!html) return;
  const blob = new Blob([WRAPPER(html, title)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(rows: (string | number)[][], filename: string) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

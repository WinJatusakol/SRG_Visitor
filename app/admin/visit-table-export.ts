const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const downloadCsv = (rows: Array<Record<string, string>>, filename: string) => {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const escapeCell = (value: string) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header] ?? "")).join(",")),
  ];
  const blob = new Blob([`\ufeff${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename);
};

export const downloadExcel = (rows: Array<Record<string, string>>, filename: string) => {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const escapeHtml = (text: string) =>
    String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const tableHead = `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;
  const tableBody = rows
    .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`).join("")}</tr>`)
    .join("");
  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>` +
    `<table border="1">${tableHead}${tableBody}</table>` +
    `</body></html>`;

  const blob = new Blob([`\ufeff${html}`], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  triggerDownload(blob, filename);
};

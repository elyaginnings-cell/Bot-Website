const LOG_EXPORT_COLUMNS = [
  "id", "created_at", "event_type", "category", "action",
  "actor_name", "actor_id", "target_name", "target_id",
  "channel_name", "channel_id", "reason", "metadata"
];

function csvCell(value) {
  let text = value == null
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  // Prevent spreadsheet formula execution when a log field begins with a
  // formula marker, while preserving the original value in the export.
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function buildLogCsv(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return [
    LOG_EXPORT_COLUMNS.map(csvCell).join(","),
    ...list.map((row) => LOG_EXPORT_COLUMNS.map((key) => csvCell(row?.[key])).join(","))
  ].join("\r\n");
}

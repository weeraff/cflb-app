// Minimal CSV writer for the opt-in export. Prefixes values that a
// spreadsheet would run as a formula, since display names are user input.
function cell(value) {
  let text = value == null ? '' : String(value)
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return /[",\r\n']/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows, columns = rows.length ? Object.keys(rows[0]) : []) {
  const lines = [columns.join(',')]
  for (const row of rows) lines.push(columns.map((c) => cell(row[c])).join(','))
  return lines.join('\r\n') + '\r\n'
}

import { readFileSync, writeFileSync } from 'fs'

const path = 'db/schema.ts'
let content = readFileSync(path, 'utf-8')

const idxLine = (name) => `\tindex("idx_${name}_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),`

const tables = [
  'user', 'store', 'stockMovement', 'sessions', 'session',
  'webhookEvents', 'deliveryTracking', 'modifierOptions', 'productModifiers', 'ticketCounters',
  'mealMenuSchedules', 'mealMenuCourses', 'gestoriaDocuments',
  'mealMenuCourseItems', 'gestoriaTaxModels', 'gestoriaAuthorization',
  'reservationRecurring', 'gestoriaDocumentLines',
  'modifierRecipeIngredients', 'gestoriaSettings', 'qrCalls', 'kdsPairings',
  'paymentLogs', 'kdsAuditLog', 'timeOffRequests', 'gestoriaPayrolls',
  'closures',
]

let count = 0

for (const t of tables) {
  const re = new RegExp(`export const ${t} = pgTable\\(`)
  const match = re.exec(content)
  if (!match) { console.log(`  ${t}: not found`); continue }

  const start = match.index
  let depth = 0, inStr = false, strChar = ''
  let end = -1
  for (let i = start; i < content.length; i++) {
    const ch = content[i]
    if (inStr) {
      if (ch === '\\') { i++; continue }
      if (ch === strChar) inStr = false
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; continue }
    if (ch === '(') depth++
    if (ch === ')') {
      depth--
      if (depth === 0) { end = i + 1; break }
    }
  }
  if (end === -1) { console.log(`  ${t}: could not find end`); continue }

  const block = content.slice(start, end)
  const hasTenantIdx = /idx_\w+_tenant/.test(block)
  if (hasTenantIdx) { continue }

  const hasTableBlock = block.includes('(table) =>')

  if (hasTableBlock) {
    // Block ends with ]) — insert index line before ])
    const closeIdx = block.lastIndexOf('])')
    if (closeIdx === -1) { console.log(`  ${t}: cannot find ]) after table block`); continue }
    const absPos = start + closeIdx
    content = content.slice(0, absPos) + idxLine(t) + '\n' + content.slice(absPos)
  } else {
    // No table block — block ends with }) — replace }) with }, (table) => [ ... ]);
    const closeIdx = block.lastIndexOf('})')
    if (closeIdx === -1) { console.log(`  ${t}: cannot find }) at end`); continue }
    const absPos = start + closeIdx
    content = content.slice(0, absPos) +
      `}, (table) => [\n${idxLine(t)}\n]);` +
      content.slice(absPos + 2)
  }

  count++
  console.log(`  ${t}: added`)
}

writeFileSync(path, content)
console.log(`\nDone! ${count} tables updated.`)

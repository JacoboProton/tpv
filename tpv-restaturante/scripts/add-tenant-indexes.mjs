import { readFileSync, writeFileSync } from 'fs'

const path = 'db/schema.ts'
let content = readFileSync(path, 'utf-8')
const SKIP = new Set(['backups', 'migrations', 'fiskalyConfig', 'tenants', 'Tenant', 'User', 'Store'])

// Find all table names and whether they have tenantId and tenant index
const tables = []
const re = /export const (\w+) = pgTable\("[^"]+",\s*\{/g
let m
while ((m = re.exec(content))) {
  tables.push(m[1])
}

// For each table, check what it has
const idxLine = (name) => `\tindex("idx_${name}_tenant").using("btree", table.tenantId.asc().nullsLast().op("text_ops")),`

for (const t of tables) {
  if (SKIP.has(t)) continue
  
  const blockRe = new RegExp(`export const ${t} = pgTable\\("[^"]+",\\s*\\{[\\s\\S]*?(?:(?=\\n\\nexport const)|(?=\\n\\n\\);))`)
  const blockMatch = content.match(blockRe)
  if (!blockMatch) {
    // Try simpler match - find the whole block
    const simpleRe = new RegExp(`export const ${t} = pgTable\\([^;]+?\\);`, 'g')
    const simpleMatch = simpleRe.exec(content)
    // Reset lastIndex
  }
}

// Much simpler: for each pgTable that has tenantId but no idx_*_tenant, check format
let edits = []
let i = 0
let continueSearching = true

while (continueSearching) {
  const tableStart = content.indexOf(`export const `, i)
  if (tableStart === -1) { continueSearching = false; break }
  
  const pgTablePos = content.indexOf('pgTable(', tableStart)
  if (pgTablePos === -1) { i = tableStart + 1; continue }
  
  // Find the name
  const nameStart = tableStart + 'export const '.length
  const nameEnd = content.indexOf(' ', nameStart)
  const name = content.slice(nameStart, nameEnd)
  
  if (SKIP.has(name)) { i = tableStart + 1; continue }
  
  // Find the end of this table definition
  // Strategy: find the }; or ); that closes it by tracking parens
  let depth = 0
  let inStr = false
  let strChar = ''
  let endPos = -1
  let possibleEnd = -1
  
  for (let j = pgTablePos; j < content.length; j++) {
    const c = content[j]
    const prev = content[j-1]
    
    if (inStr) {
      if (c === '\\') { j++; continue }
      if (c === strChar) inStr = false
      continue
    }
    
    if (c === '"' || c === "'" || c === '`') {
      inStr = true
      strChar = c
      continue
    }
    
    if (c === '(') depth++
    if (c === ')') {
      depth--
      if (depth === 0 && content.slice(j-2, j+1) === ');' ||
          depth === 0 && content.slice(j-1, j+1) === ');') {
        endPos = j + 1  // Include the ;
        break
      }
    }
  }
  
  if (endPos === -1) { i = tableStart + 1; continue }
  
  const block = content.slice(tableStart, endPos + 1)
  const hasTenantId = block.includes('tenantId') || block.includes('tenant_id')
  const hasTenantIdx = block.includes('idx_') && block.includes('_tenant')
  
  i = endPos + 1
  
  if (!hasTenantId || hasTenantIdx) continue
  
  // Does it have a (table) => [...] block?
  const hasTableBlock = block.includes('(table) => [')
  
  if (hasTableBlock) {
    // Find the end of the table block
    // The format is: ..., (table) => [ ... ]);
    // We need to insert before the ]);
    const closePos = content.lastIndexOf(']);', endPos)
    if (closePos !== -1) {
      content = content.slice(0, closePos) + '\t' + idxLine(name) + '\n' + content.slice(closePos)
      edits.push(`  ${name}: added inside existing (table) block`)
    }
  } else {
    // No table block - replace the closing });
    const closePos = content.indexOf('});', endPos)
    if (closePos !== -1 && closePos === endPos - 1) {
      const before = content.slice(0, closePos)
      const after = content.slice(closePos + 2) // skip });
      
      const replacement = `\n}, (table) => [\n\t${idxLine(name)}\n]);`
      content = before + replacement + after
      edits.push(`  ${name}: added new (table) block`)
    }
  }
}

for (const e of edits) console.log(e)
writeFileSync(path, content)
console.log(`\nDone! ${edits.length} tables updated.`)

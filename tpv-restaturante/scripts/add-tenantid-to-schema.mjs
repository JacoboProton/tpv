import { readFileSync, writeFileSync } from 'fs'

const path = 'db/schema.ts'
let content = readFileSync(path, 'utf-8')

// Track tables that already have tenantId
const tablesWithTenant = new Set()

// Find all table names and whether they have tenantId
const tableRegex = /export const (\w+) = pgTable\("([^"]+)",\s*\{/g
let match
while ((match = tableRegex.exec(content)) !== null) {
  const varName = match[1]
  const start = match.index
  // Find the closing of this table definition
  const tableEnd = findBlockEnd(content, start)
  const block = content.slice(start, tableEnd)
  if (block.includes('tenantId') || block.includes('tenant_id')) {
    tablesWithTenant.add(varName)
  }
}

console.log(`Tables with tenantId: ${tablesWithTenant.size}`)
console.log(`Tables WITHOUT tenantId:`)

// Now find all tables and add tenantId to those missing it
const result = content.replace(
  /(export const (\w+) = pgTable\("[^"]+",\s*\{)([\s\S]*?)(\}\);)/g,
  (fullMatch, header, varName, body, footer) => {
    if (tablesWithTenant.has(varName)) return fullMatch
    if (varName === 'backups' || varName === 'migrations' || varName === 'fiskalyConfig' || varName === 'tenants' || varName === 'Tenant') return fullMatch
    
    console.log(`  - ${varName}`)
    
    // Find the first column (usually id) and add tenantId after its line
    const lines = body.split('\n')
    let insertIdx = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('primaryKey()')) {
        // Find the end of the primary key line (might have trailing comma)
        insertIdx = i + 1
        break
      }
    }
    // If no primaryKey found, add after first column
    if (insertIdx === -1) {
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim()
        if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('}')) {
          insertIdx = i + 1
          break
        }
      }
    }
    
    if (insertIdx === -1) {
      // Empty body, add before closing
      lines.splice(0, 0, '\ttenantId: text("tenant_id").default(\'default\').notNull(),')
    } else {
      lines.splice(insertIdx, 0, '\ttenantId: text("tenant_id").default(\'default\').notNull(),')
    }
    
    return header + lines.join('\n') + footer
  }
)

writeFileSync(path, result)
console.log('\nDone! Schema updated.')

function findBlockEnd(str, start) {
  let depth = 0
  let inString = false
  let char = ''
  let escaped = false
  const startStr = str.slice(start, start + 100)
  
  for (let i = start; i < str.length; i++) {
    const c = str[i]
    
    if (escaped) { escaped = false; continue }
    if (c === '\\' && inString) { escaped = true; continue }
    
    if (c === '"' || c === "'" || c === '`') {
      if (inString && char === c) inString = false
      else if (!inString) { inString = true; char = c }
      continue
    }
    
    if (!inString) {
      if (c === '{') depth++
      if (c === '}') {
        depth--
        if (depth === 0) return i + 1
      }
    }
  }
  return str.length
}

import { getDb, saveDb } from './db.js'

// Helper: run a SELECT query and return array of objects
export function queryAll(sql, params = []) {
  const db = getDb()
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

// Helper: run a SELECT query and return first row or null
export function queryOne(sql, params = []) {
  const rows = queryAll(sql, params)
  return rows.length > 0 ? rows[0] : null
}

// Helper: run INSERT and return the last insert rowid
export function insertAndGetId(sql, params = []) {
  const db = getDb()
  db.run(sql, params)
  const idResults = db.exec("SELECT last_insert_rowid() as id")
  saveDb()
  if (idResults && idResults.length > 0 && idResults[0].values && idResults[0].values.length > 0) {
    return idResults[0].values[0][0]
  }
  return null
}

// Helper: run UPDATE/DELETE and save
export function runMutate(sql, params = []) {
  const db = getDb()
  db.run(sql, params)
  saveDb()
}

// For backward compatibility
export const runSql = runMutate

// Deprecated - use insertAndGetId for INSERT operations
export function lastInsertId() {
  const db = getDb()
  const rows = db.exec("SELECT last_insert_rowid() as id")
  if (rows && rows.length > 0 && rows[0].values && rows[0].values.length > 0) {
    return rows[0].values[0][0]
  }
  return null
}

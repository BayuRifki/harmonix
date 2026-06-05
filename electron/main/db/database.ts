import initSqlJs, { type Database, type SqlJsStatic, type SqlJsConfig } from 'sql.js';
import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runMigrations } from './migrations';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let testMode = false;

export function __setDbForTest(testDb: Database | null): void {
  db = testDb;
  testMode = testDb !== null;
  if (testDb === null) {
    SQL = null;
  }
}

function resolveWasmPath(): string {
  const appPath = app.getAppPath();
  const candidates: string[] = [
    join(process.resourcesPath ?? '', 'sql-wasm.wasm'),
    join(appPath, '..', '..', 'resources', 'sql-wasm.wasm'),
    join(appPath, 'resources', 'sql-wasm.wasm'),
    join(appPath, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    resolve(__dirname, '..', '..', 'resources', 'sql-wasm.wasm'),
    resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
  ];
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return candidates[0] ?? '';
}

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const wasmPath = resolveWasmPath();
  if (!wasmPath || !existsSync(wasmPath)) {
    throw new Error(
      `sql.js WASM file not found. Searched in: resourcesPath, app path/resources, app path/node_modules. ` +
        `Tried: ${wasmPath}`,
    );
  }

  const locateFile = (file: string): string => {
    if (file.endsWith('.wasm')) {
      if (existsSync(wasmPath)) return resolve(wasmPath);
    }
    return file;
  };
  const options: SqlJsConfig = { locateFile };
  if (!SQL) {
    SQL = await initSqlJs(options);
  }

  const dbPath = getDbPath();
  if (!existsSync(dbPath)) mkdirSync(dbPath, { recursive: true });

  const dbFile = join(dbPath, 'harmonix.db');
  if (existsSync(dbFile)) {
    const buffer = readFileSync(dbFile);
    db = new SQL.Database(new Uint8Array(buffer));
  } else {
    db = new SQL.Database();
  }

  runMigrations(db);
  persist();

  return db;
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function persist(): void {
  if (!db) return;
  if (testMode) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dbFile = join(getDbPath(), 'harmonix.db');
  writeFileSync(dbFile, buffer);
}

export function getDbPath(): string {
  return join(app.getPath('userData'), 'data');
}

export function closeDatabase(): void {
  if (db) {
    persist();
    db.close();
    db = null;
  }
}

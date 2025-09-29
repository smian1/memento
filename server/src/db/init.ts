import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'memento.db');

export function createDatabaseConnection() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new Database(DB_FILE);
  db.pragma('foreign_keys = ON');
  return db;
}

export function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      limitless_api_key TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_configs_user ON user_configs(user_id);

    CREATE TABLE IF NOT EXISTS insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_insights_user_date ON insights(user_id, date);

    CREATE TABLE IF NOT EXISTS action_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      insight_id INTEGER,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      source TEXT NOT NULL DEFAULT 'LIMITLESS',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(insight_id) REFERENCES insights(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      insight_id INTEGER,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(insight_id) REFERENCES insights(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      insight_id INTEGER,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(insight_id) REFERENCES insights(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      insight_id INTEGER,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(insight_id) REFERENCES insights(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS themes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      insight_id INTEGER,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(insight_id) REFERENCES insights(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      insight_id INTEGER,
      date TEXT NOT NULL,
      text TEXT NOT NULL,
      speaker TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(insight_id) REFERENCES insights(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS highlights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      insight_id INTEGER,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(insight_id) REFERENCES insights(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lifelogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      limitless_id TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      title TEXT,
      summary TEXT,
      markdown_content TEXT,
      start_time TEXT,
      end_time TEXT,
      segment_type TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#667eea',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name);

    CREATE TABLE IF NOT EXISTS action_item_tags (
      action_item_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY(action_item_id, tag_id),
      FOREIGN KEY(action_item_id) REFERENCES action_items(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      last_sync_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_insights_sync_at TEXT,
      last_lifelogs_sync_at TEXT,
      last_sync_status TEXT NOT NULL DEFAULT 'idle',
      insights_fetched INTEGER NOT NULL DEFAULT 0,
      insights_updated INTEGER NOT NULL DEFAULT 0,
      insights_added INTEGER NOT NULL DEFAULT 0,
      lifelogs_fetched INTEGER NOT NULL DEFAULT 0,
      lifelogs_updated INTEGER NOT NULL DEFAULT 0,
      lifelogs_added INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
  `);
  
  // Add new columns to sync_metadata if they don't exist
  try {
    // Check if the new columns exist by trying to query them
    db.prepare("SELECT last_insights_sync_at FROM sync_metadata LIMIT 1").all();
  } catch (error) {
    // Columns don't exist, add them
    db.exec(`
      ALTER TABLE sync_metadata ADD COLUMN last_insights_sync_at TEXT DEFAULT NULL;
      ALTER TABLE sync_metadata ADD COLUMN last_lifelogs_sync_at TEXT DEFAULT NULL;
      ALTER TABLE sync_metadata ADD COLUMN lifelogs_fetched INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE sync_metadata ADD COLUMN lifelogs_updated INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE sync_metadata ADD COLUMN lifelogs_added INTEGER NOT NULL DEFAULT 0;
    `);
  }

  // Create speaker_profiles table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS speaker_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      speaker_name TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      description TEXT,
      color_hex TEXT NOT NULL DEFAULT '#64748b',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, speaker_name)
    );
  `);

  // Create discovery system tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS section_discoveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_header TEXT NOT NULL,
      section_pattern TEXT NOT NULL,
      subsection_pattern TEXT,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      occurrence_count INTEGER NOT NULL DEFAULT 1,
      sample_content TEXT,
      extraction_rules TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS discovered_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discovery_id INTEGER NOT NULL,
      insight_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      extracted_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(discovery_id) REFERENCES section_discoveries(id) ON DELETE CASCADE,
      FOREIGN KEY(insight_id) REFERENCES insights(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS knowledge_nuggets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      insight_id INTEGER,
      date TEXT NOT NULL,
      category TEXT,
      fact TEXT NOT NULL,
      source TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(insight_id) REFERENCES insights(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS memorable_exchanges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      insight_id INTEGER,
      date TEXT NOT NULL,
      dialogue TEXT NOT NULL,
      context TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(insight_id) REFERENCES insights(id) ON DELETE CASCADE
    );
  `);
}

export const databasePath = DB_FILE;

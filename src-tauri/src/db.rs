use crate::errors::{AppError, AppResult};
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::params;
use std::path::Path;

pub type DbPool = Pool<SqliteConnectionManager>;
pub type DbConn = r2d2::PooledConnection<SqliteConnectionManager>;

pub fn create_pool(db_path: &Path) -> AppResult<DbPool> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Db(format!("Veritabanı klasörü oluşturulamadı: {}", e)))?;
    }

    // WAL modunu ilk kez ayarlamak için tek bir geçici bağlantı kullan
    // (havuzdaki paralel bağlantıların eşzamanlı PRAGMA çağrısı kilit yaratıyor)
    {
        let conn = rusqlite::Connection::open(db_path)?;
        conn.busy_timeout(std::time::Duration::from_secs(5))?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL; \
             PRAGMA foreign_keys = ON; \
             PRAGMA synchronous = NORMAL;",
        )?;
    }

    let manager = SqliteConnectionManager::file(db_path).with_init(|c| {
        c.busy_timeout(std::time::Duration::from_secs(5))?;
        c.execute_batch("PRAGMA foreign_keys = ON;")
    });
    let pool = Pool::builder()
        .max_size(4)
        .build(manager)
        .map_err(|e| AppError::Db(e.to_string()))?;
    run_migrations(&pool.get()?)?;
    Ok(pool)
}

fn run_migrations(conn: &DbConn) -> AppResult<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER NOT NULL PRIMARY KEY
        );

        CREATE TABLE IF NOT EXISTS stores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            seller_id INTEGER NOT NULL UNIQUE,
            environment TEXT NOT NULL DEFAULT 'prod',
            integrator_name TEXT NOT NULL DEFAULT 'SelfIntegration',
            active INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS questions (
            question_id INTEGER PRIMARY KEY,
            store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
            customer_id INTEGER,
            customer_name TEXT,
            text TEXT NOT NULL,
            status TEXT NOT NULL,
            creation_date INTEGER NOT NULL,
            product_main_id TEXT,
            product_name TEXT,
            product_web_url TEXT,
            product_image_url TEXT,
            barcode TEXT,
            public INTEGER,
            answer_id INTEGER,
            answer_text TEXT,
            answer_creation_date INTEGER,
            reported_date INTEGER,
            rejected_date INTEGER,
            raw_json TEXT,
            fetched_at INTEGER NOT NULL,
            notified INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
        CREATE INDEX IF NOT EXISTS idx_questions_customer ON questions(customer_id);
        CREATE INDEX IF NOT EXISTS idx_questions_store ON questions(store_id);
        CREATE INDEX IF NOT EXISTS idx_questions_creation ON questions(creation_date DESC);

        CREATE TABLE IF NOT EXISTS answer_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            category TEXT,
            usage_count INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ai_providers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT NOT NULL,
            display_name TEXT NOT NULL,
            selected_model TEXT,
            base_url TEXT,
            active INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            UNIQUE(provider)
        );

        CREATE TABLE IF NOT EXISTS ai_training_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_date INTEGER NOT NULL,
            end_date INTEGER NOT NULL,
            store_ids TEXT,
            qa_pair_count INTEGER NOT NULL,
            system_prompt TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS qa_index USING fts5(
            question_text,
            answer_text,
            store_id UNINDEXED,
            question_id UNINDEXED,
            tokenize='unicode61'
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        "#,
    )?;

    seed_defaults(conn)?;
    Ok(())
}

fn seed_defaults(conn: &DbConn) -> AppResult<()> {
    let defaults: &[(&str, &str)] = &[
        ("theme", "system"),
        ("language", "tr"),
        ("poll_interval_seconds", "120"),
        ("autostart_enabled", "false"),
        ("notification_sound", "true"),
        ("default_answer_mode", "manual"),
        ("polling_enabled", "true"),
    ];
    for (k, v) in defaults {
        conn.execute(
            "INSERT OR IGNORE INTO settings(key, value) VALUES (?1, ?2)",
            params![k, v],
        )?;
    }
    Ok(())
}

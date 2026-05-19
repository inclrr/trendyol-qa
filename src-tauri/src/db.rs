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
    run_migrations(&mut pool.get()?)?;
    Ok(pool)
}

/// Migrationlar (versiyon, SQL bloğu). Her migration tek bir transaction içinde uygulanır.
/// Yeni migration eklerken sona ekle, asla mevcut olanı değiştirme.
const MIGRATIONS: &[(i64, &str)] = &[
    (
        1,
        r#"
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
    ),
    (
        2,
        // v2: training_runs için orijinal prompt ve isim alanı. Eski v0.3.0'da yarım
        // uygulanmış olabileceği için ALTER hataları yutuluyor (aşağıdaki kodda).
        r#"
        ALTER TABLE ai_training_runs ADD COLUMN name TEXT;
        ALTER TABLE ai_training_runs ADD COLUMN original_prompt TEXT;
        "#,
    ),
    (
        3,
        // v3: questions tablosuna draft AI cevap sütunları
        r#"
        ALTER TABLE questions ADD COLUMN draft_ai_answer TEXT;
        ALTER TABLE questions ADD COLUMN draft_ai_generated_at INTEGER;
        "#,
    ),
];

fn run_migrations(conn: &mut DbConn) -> AppResult<()> {
    // Eski sürümlerden upgrade için: schema_version tablosu zaten varsa applied_at sütununu
    // eklemeye çalış (yoksa eklenir, varsa hata sessizce yutulur)
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER NOT NULL PRIMARY KEY
        );",
    )?;
    let _ = conn.execute(
        "ALTER TABLE schema_version ADD COLUMN applied_at INTEGER",
        [],
    );

    let current: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    for (version, sql) in MIGRATIONS {
        if *version <= current {
            continue;
        }
        let tx = conn.transaction()?;
        // Migration içindeki ALTER TABLE'lar zaten uygulanmış olabilir (v0.3.0 fail durumu).
        // Her cümleyi tek tek dene, "duplicate column" benzeri hataları yut.
        for stmt in sql.split(';').map(|s| s.trim()).filter(|s| !s.is_empty()) {
            if let Err(e) = tx.execute_batch(stmt) {
                let msg = e.to_string().to_lowercase();
                if msg.contains("duplicate column") || msg.contains("already exists") {
                    log::warn!("Migration v{} cümlesi atlandı (zaten uygulanmış): {}", version, e);
                } else {
                    return Err(AppError::Db(format!("Migration v{} cümlesi başarısız: {}", version, e)));
                }
            }
        }
        tx.execute(
            "INSERT INTO schema_version (version, applied_at) VALUES (?1, ?2)",
            params![*version, chrono::Utc::now().timestamp_millis()],
        )?;
        tx.commit()?;
        log::info!("Schema migration v{} uygulandı.", version);
    }

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
        ("auto_advance_after_answer", "true"),
        ("auto_ai_reply", "true"),
        ("notification_sound_enabled", "true"),
    ];
    for (k, v) in defaults {
        conn.execute(
            "INSERT OR IGNORE INTO settings(key, value) VALUES (?1, ?2)",
            params![k, v],
        )?;
    }
    Ok(())
}

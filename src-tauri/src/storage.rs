use std::path::Path;
use std::time::Duration;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;

const DATABASE_SCHEMA_VERSION: i64 = 1;
const PROMPT_SCHEMA_VERSION: u32 = 1;
const CURRENT_DOCUMENT_KEY: &str = "current_document_id";
const AI_PREFERENCES_KEY: &str = "ai";
const SHELL_PREFERENCES_KEY: &str = "desktop_shell";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PromptDocument {
    pub id: String,
    pub title: String,
    pub schema_version: u32,
    pub revision: u64,
    pub content: Value,
    pub created_at: String,
    pub updated_at: String,
}

pub fn initialize(path: &Path) -> Result<(), String> {
    let mut connection = open(path)?;
    migrate(&mut connection)
}

pub fn list(path: &Path) -> Result<Vec<PromptDocument>, String> {
    let connection = open_initialized(path)?;
    let mut statement = connection
        .prepare(
            "SELECT id, title, schema_version, revision, content_json, created_at, updated_at
             FROM prompt_documents
             ORDER BY updated_at DESC, id ASC",
        )
        .map_err(error_message)?;
    let rows = statement
        .query_map([], row_to_document)
        .map_err(error_message)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(error_message)
}

pub fn get(path: &Path, id: &str) -> Result<Option<PromptDocument>, String> {
    let connection = open_initialized(path)?;
    connection
        .query_row(
            "SELECT id, title, schema_version, revision, content_json, created_at, updated_at
             FROM prompt_documents WHERE id = ?1",
            [id],
            row_to_document,
        )
        .optional()
        .map_err(error_message)
}

pub fn save(path: &Path, document: &PromptDocument) -> Result<(), String> {
    validate_document(document)?;
    let revision = i64::try_from(document.revision)
        .map_err(|_| "PromptDocument.revision 超出 SQLite INTEGER 范围。".to_string())?;
    let content_json = serde_json::to_string(&document.content).map_err(error_message)?;
    let connection = open_initialized(path)?;
    connection
        .execute(
            "INSERT INTO prompt_documents (
                id, title, schema_version, revision, content_json, created_at, updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                schema_version = excluded.schema_version,
                revision = excluded.revision,
                content_json = excluded.content_json,
                created_at = excluded.created_at,
                updated_at = excluded.updated_at
             WHERE prompt_documents.revision <= excluded.revision",
            params![
                document.id,
                document.title,
                document.schema_version,
                revision,
                content_json,
                document.created_at,
                document.updated_at,
            ],
        )
        .map_err(error_message)?;
    Ok(())
}

pub fn remove(path: &Path, id: &str) -> Result<(), String> {
    let connection = open_initialized(path)?;
    connection
        .execute("DELETE FROM prompt_documents WHERE id = ?1", [id])
        .map_err(error_message)?;
    Ok(())
}

pub fn get_current_id(path: &Path) -> Result<Option<String>, String> {
    let connection = open_initialized(path)?;
    connection
        .query_row(
            "SELECT value FROM app_state WHERE key = ?1",
            [CURRENT_DOCUMENT_KEY],
            |row| row.get(0),
        )
        .optional()
        .map_err(error_message)
}

pub fn set_current_id(path: &Path, id: &str) -> Result<(), String> {
    let connection = open_initialized(path)?;
    connection
        .execute(
            "INSERT INTO app_state (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![CURRENT_DOCUMENT_KEY, id],
        )
        .map_err(error_message)?;
    Ok(())
}

pub fn load_preferences(path: &Path) -> Result<Option<Value>, String> {
    load_named_preferences(path, AI_PREFERENCES_KEY)
}

pub fn save_preferences(path: &Path, preferences: &Value) -> Result<(), String> {
    validate_preferences(preferences)?;
    save_named_preferences(path, AI_PREFERENCES_KEY, preferences)
}

pub fn load_shell_preferences(path: &Path) -> Result<Option<Value>, String> {
    load_named_preferences(path, SHELL_PREFERENCES_KEY)
}

pub fn save_shell_preferences(path: &Path, preferences: &Value) -> Result<(), String> {
    validate_preferences(preferences)?;
    save_named_preferences(path, SHELL_PREFERENCES_KEY, preferences)
}

fn load_named_preferences(path: &Path, key: &str) -> Result<Option<Value>, String> {
    let connection = open_initialized(path)?;
    let raw = connection
        .query_row(
            "SELECT value_json FROM preferences WHERE key = ?1",
            [key],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(error_message)?;
    raw.map(|value| serde_json::from_str(&value).map_err(error_message))
        .transpose()
}

fn save_named_preferences(path: &Path, key: &str, preferences: &Value) -> Result<(), String> {
    let value_json = serde_json::to_string(preferences).map_err(error_message)?;
    let connection = open_initialized(path)?;
    connection
        .execute(
            "INSERT INTO preferences (key, value_json) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json",
            params![key, value_json],
        )
        .map_err(error_message)?;
    Ok(())
}

fn open(path: &Path) -> Result<Connection, String> {
    let connection = Connection::open(path).map_err(error_message)?;
    connection
        .busy_timeout(Duration::from_secs(5))
        .map_err(error_message)?;
    Ok(connection)
}

fn open_initialized(path: &Path) -> Result<Connection, String> {
    let mut connection = open(path)?;
    migrate(&mut connection)?;
    Ok(connection)
}

fn migrate(connection: &mut Connection) -> Result<(), String> {
    let version: i64 = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(error_message)?;
    if version > DATABASE_SCHEMA_VERSION {
        return Err(format!(
            "PromptNote 数据库版本 {version} 高于当前支持的 {DATABASE_SCHEMA_VERSION}。"
        ));
    }
    if version == DATABASE_SCHEMA_VERSION {
        return Ok(());
    }

    let transaction = connection.transaction().map_err(error_message)?;
    if version == 0 {
        transaction
            .execute_batch(
                "CREATE TABLE prompt_documents (
                    id TEXT PRIMARY KEY NOT NULL,
                    title TEXT NOT NULL,
                    schema_version INTEGER NOT NULL,
                    revision INTEGER NOT NULL CHECK (revision >= 0),
                    content_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                 );
                 CREATE INDEX idx_prompt_documents_updated_at
                    ON prompt_documents(updated_at DESC, id ASC);
                 CREATE TABLE app_state (
                    key TEXT PRIMARY KEY NOT NULL,
                    value TEXT NOT NULL
                 );
                 CREATE TABLE preferences (
                    key TEXT PRIMARY KEY NOT NULL,
                    value_json TEXT NOT NULL
                 );
                 PRAGMA user_version = 1;",
            )
            .map_err(error_message)?;
    }
    transaction.commit().map_err(error_message)
}

fn row_to_document(row: &rusqlite::Row<'_>) -> rusqlite::Result<PromptDocument> {
    let raw_revision: i64 = row.get(3)?;
    let revision = u64::try_from(raw_revision).map_err(|error| {
        rusqlite::Error::FromSqlConversionFailure(
            3,
            rusqlite::types::Type::Integer,
            Box::new(error),
        )
    })?;
    let content_json: String = row.get(4)?;
    let content = serde_json::from_str(&content_json).map_err(|error| {
        rusqlite::Error::FromSqlConversionFailure(
            4,
            rusqlite::types::Type::Text,
            Box::new(error),
        )
    })?;
    Ok(PromptDocument {
        id: row.get(0)?,
        title: row.get(1)?,
        schema_version: row.get(2)?,
        revision,
        content,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

fn validate_document(document: &PromptDocument) -> Result<(), String> {
    if document.id.trim().is_empty() {
        return Err("PromptDocument.id 不能为空。".to_string());
    }
    if document.schema_version != PROMPT_SCHEMA_VERSION {
        return Err(format!(
            "不支持的 PromptDocument schemaVersion：{}",
            document.schema_version
        ));
    }
    if !document.content.is_object() {
        return Err("PromptDocument.content 必须是对象。".to_string());
    }
    Ok(())
}

fn validate_preferences(preferences: &Value) -> Result<(), String> {
    let object = preferences
        .as_object()
        .ok_or_else(|| "Desktop preferences 必须是对象。".to_string())?;
    if object.contains_key("apiKey") {
        return Err("API Key 不允许写入 SQLite preferences。".to_string());
    }
    Ok(())
}

fn error_message(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::sync::atomic::{AtomicU64, Ordering};

    use serde_json::json;

    use super::*;

    static NEXT_DB: AtomicU64 = AtomicU64::new(1);

    fn temp_database() -> std::path::PathBuf {
        let id = NEXT_DB.fetch_add(1, Ordering::Relaxed);
        std::env::temp_dir().join(format!("promptnote-p3-{}-{id}.sqlite3", std::process::id()))
    }

    fn document(revision: u64, title: &str) -> PromptDocument {
        PromptDocument {
            id: "doc-1".to_string(),
            title: title.to_string(),
            schema_version: 1,
            revision,
            content: json!({ "type": "doc", "content": [{ "type": "paragraph" }] }),
            created_at: "2026-08-11T00:00:00.000Z".to_string(),
            updated_at: format!("2026-08-11T00:00:{revision:02}.000Z"),
        }
    }

    #[test]
    fn persists_documents_and_current_id_across_reopen() {
        let path = temp_database();
        initialize(&path).unwrap();
        save(&path, &document(1, "第一版")).unwrap();
        set_current_id(&path, "doc-1").unwrap();

        initialize(&path).unwrap();
        assert_eq!(list(&path).unwrap().len(), 1);
        assert_eq!(get(&path, "doc-1").unwrap().unwrap().title, "第一版");
        assert_eq!(get_current_id(&path).unwrap().as_deref(), Some("doc-1"));
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn ignores_stale_document_writes() {
        let path = temp_database();
        initialize(&path).unwrap();
        save(&path, &document(4, "新版本")).unwrap();
        save(&path, &document(3, "旧版本")).unwrap();

        let stored = get(&path, "doc-1").unwrap().unwrap();
        assert_eq!(stored.revision, 4);
        assert_eq!(stored.title, "新版本");
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn rejects_revision_outside_sqlite_integer_range() {
        let path = temp_database();
        initialize(&path).unwrap();
        let result = save(&path, &document(i64::MAX as u64 + 1, "超范围"));
        assert!(result.is_err());
        assert!(get(&path, "doc-1").unwrap().is_none());
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn persists_non_sensitive_preferences_and_rejects_api_key() {
        let path = temp_database();
        initialize(&path).unwrap();
        let preferences = json!({
            "enabled": true,
            "configured": false,
            "provider": "openai-compatible"
        });
        save_preferences(&path, &preferences).unwrap();

        initialize(&path).unwrap();
        assert_eq!(load_preferences(&path).unwrap(), Some(preferences));
        assert!(save_preferences(&path, &json!({ "apiKey": "secret" })).is_err());
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn persists_shell_preferences_separately_from_ai_preferences() {
        let path = temp_database();
        initialize(&path).unwrap();
        let ai = json!({ "enabled": true, "provider": "openai-compatible" });
        let shell = json!({ "orbEnabled": true, "edge": "right", "yRatio": 0.5 });
        save_preferences(&path, &ai).unwrap();
        save_shell_preferences(&path, &shell).unwrap();

        initialize(&path).unwrap();
        assert_eq!(load_preferences(&path).unwrap(), Some(ai));
        assert_eq!(load_shell_preferences(&path).unwrap(), Some(shell));
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn records_explicit_schema_version() {
        let path = temp_database();
        initialize(&path).unwrap();
        let connection = Connection::open(&path).unwrap();
        let version: i64 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(version, DATABASE_SCHEMA_VERSION);
        drop(connection);
        fs::remove_file(path).unwrap();
    }
}

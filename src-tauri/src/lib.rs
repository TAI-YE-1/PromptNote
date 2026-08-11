mod credentials;
mod storage;

use std::path::PathBuf;
use std::sync::Mutex;

use serde_json::Value;
use storage::PromptDocument;
use tauri::Manager;

struct DesktopState {
    database_path: PathBuf,
    credential_lock: Mutex<()>,
}

#[tauri::command]
fn prompt_list(state: tauri::State<'_, DesktopState>) -> Result<Vec<PromptDocument>, String> {
    storage::list(&state.database_path)
}

#[tauri::command]
fn prompt_get(
    state: tauri::State<'_, DesktopState>,
    id: String,
) -> Result<Option<PromptDocument>, String> {
    storage::get(&state.database_path, &id)
}

#[tauri::command]
fn prompt_save(
    state: tauri::State<'_, DesktopState>,
    document: PromptDocument,
) -> Result<(), String> {
    storage::save(&state.database_path, &document)
}

#[tauri::command]
fn prompt_remove(state: tauri::State<'_, DesktopState>, id: String) -> Result<(), String> {
    storage::remove(&state.database_path, &id)
}

#[tauri::command]
fn prompt_get_current_id(state: tauri::State<'_, DesktopState>) -> Result<Option<String>, String> {
    storage::get_current_id(&state.database_path)
}

#[tauri::command]
fn prompt_set_current_id(
    state: tauri::State<'_, DesktopState>,
    id: String,
) -> Result<(), String> {
    storage::set_current_id(&state.database_path, &id)
}

#[tauri::command]
fn preferences_load(state: tauri::State<'_, DesktopState>) -> Result<Option<Value>, String> {
    storage::load_preferences(&state.database_path)
}

#[tauri::command]
fn preferences_save(
    state: tauri::State<'_, DesktopState>,
    preferences: Value,
) -> Result<(), String> {
    storage::save_preferences(&state.database_path, &preferences)
}

#[tauri::command]
fn secret_get(state: tauri::State<'_, DesktopState>, name: String) -> Result<Option<String>, String> {
    let _guard = state
        .credential_lock
        .lock()
        .map_err(|_| "Windows Credential Manager 锁已损坏。".to_string())?;
    credentials::get(&name)
}

#[tauri::command]
fn secret_set(
    state: tauri::State<'_, DesktopState>,
    name: String,
    value: String,
) -> Result<(), String> {
    let _guard = state
        .credential_lock
        .lock()
        .map_err(|_| "Windows Credential Manager 锁已损坏。".to_string())?;
    credentials::set(&name, &value)
}

#[tauri::command]
fn secret_remove(state: tauri::State<'_, DesktopState>, name: String) -> Result<(), String> {
    let _guard = state
        .credential_lock
        .lock()
        .map_err(|_| "Windows Credential Manager 锁已损坏。".to_string())?;
    credentials::remove(&name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let data_dir = app.path().app_local_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let database_path = data_dir.join("promptnote.sqlite3");
            storage::initialize(&database_path).map_err(std::io::Error::other)?;
            credentials::initialize().map_err(std::io::Error::other)?;
            app.manage(DesktopState {
                database_path,
                credential_lock: Mutex::new(()),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            prompt_list,
            prompt_get,
            prompt_save,
            prompt_remove,
            prompt_get_current_id,
            prompt_set_current_id,
            preferences_load,
            preferences_save,
            secret_get,
            secret_set,
            secret_remove,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run PromptNote Desktop");
}

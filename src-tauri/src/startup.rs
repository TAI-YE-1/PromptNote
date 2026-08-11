use std::sync::Mutex;

use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt as AutostartExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

pub const AUTOSTART_ARG: &str = "--autostart";
pub const SHORTCUT_LABEL: &str = "Ctrl + Alt + P";

pub struct StartupState {
    shortcut_registered: bool,
    shortcut_error: Mutex<Option<String>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupSnapshot {
    pub shortcut_label: &'static str,
    pub shortcut_registered: bool,
    pub shortcut_error: Option<String>,
    pub autostart_enabled: bool,
}

pub fn promptnote_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyP)
}

pub fn register_global_shortcut(app: &AppHandle) -> StartupState {
    match app.global_shortcut().register(promptnote_shortcut()) {
        Ok(()) => StartupState {
            shortcut_registered: true,
            shortcut_error: Mutex::new(None),
        },
        Err(error) => StartupState {
            shortcut_registered: false,
            shortcut_error: Mutex::new(Some(error.to_string())),
        },
    }
}

pub fn snapshot(app: &AppHandle, state: &StartupState) -> Result<StartupSnapshot, String> {
    let shortcut_error = state
        .shortcut_error
        .lock()
        .map_err(|_| "Desktop shortcut status lock 已损坏。".to_string())?
        .clone();
    let autostart_enabled = app.autolaunch().is_enabled().map_err(error_message)?;
    Ok(StartupSnapshot {
        shortcut_label: SHORTCUT_LABEL,
        shortcut_registered: state.shortcut_registered,
        shortcut_error,
        autostart_enabled,
    })
}

pub fn set_autostart(app: &AppHandle, enabled: bool) -> Result<bool, String> {
    let autostart = app.autolaunch();
    if enabled {
        autostart.enable().map_err(error_message)?;
    } else {
        autostart.disable().map_err(error_message)?;
    }
    let actual = autostart.is_enabled().map_err(error_message)?;
    if actual != enabled {
        return Err(format!(
            "Windows 开机启动状态校验失败：期望 {}，实际 {}。",
            enabled, actual
        ));
    }
    Ok(actual)
}

pub fn launched_from_autostart() -> bool {
    std::env::args().any(|argument| argument == AUTOSTART_ARG)
}

fn error_message(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frozen_shortcut_is_ctrl_alt_p() {
        let shortcut = promptnote_shortcut();
        assert_eq!(shortcut, Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyP));
        assert_eq!(SHORTCUT_LABEL, "Ctrl + Alt + P");
    }

    #[test]
    fn autostart_marker_is_explicit() {
        assert_eq!(AUTOSTART_ARG, "--autostart");
    }
}

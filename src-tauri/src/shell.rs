use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::webview::{WebviewWindow, WebviewWindowBuilder};
use tauri::window::Monitor;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl};

use crate::storage;

const MAIN_LABEL: &str = "main";
const ORB_LABEL: &str = "orb";
const PANEL_WIDTH_LOGICAL: f64 = 420.0;
const ORB_SIZE_LOGICAL: f64 = 48.0;
const ORB_IDLE_VISIBLE_LOGICAL: f64 = 20.0;
const FULL_WINDOW_WIDTH_LOGICAL: f64 = 1080.0;
const FULL_WINDOW_HEIGHT_LOGICAL: f64 = 720.0;
const FULL_WINDOW_MIN_WIDTH_LOGICAL: f64 = 720.0;
const FULL_WINDOW_MIN_HEIGHT_LOGICAL: f64 = 520.0;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ShellMode {
    TrayBackground,
    Orb,
    DockedPanel,
    FullWindow,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DockEdge {
    Left,
    Right,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct ShellPreferences {
    pub launched_once: bool,
    pub orb_enabled: bool,
    pub panel_always_on_top: bool,
    pub monitor_name: Option<String>,
    pub edge: DockEdge,
    pub y_ratio: f64,
    pub last_mode: ShellMode,
}

impl Default for ShellPreferences {
    fn default() -> Self {
        Self {
            launched_once: false,
            orb_enabled: true,
            panel_always_on_top: true,
            monitor_name: None,
            edge: DockEdge::Right,
            y_ratio: 0.5,
            last_mode: ShellMode::Orb,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellSnapshot {
    pub mode: ShellMode,
    pub orb_enabled: bool,
    pub panel_always_on_top: bool,
    pub edge: DockEdge,
    pub y_ratio: f64,
}

#[derive(Debug, Clone)]
struct FullWindowBounds {
    position: Option<PhysicalPosition<i32>>,
    size: PhysicalSize<u32>,
    maximized: bool,
}

pub struct ShellController {
    database_path: PathBuf,
    preferences: Mutex<ShellPreferences>,
    mode: Mutex<ShellMode>,
    full_window_bounds: Mutex<Option<FullWindowBounds>>,
    exiting: AtomicBool,
}

impl ShellController {
    pub fn load(database_path: PathBuf) -> Result<Self, String> {
        let preferences: ShellPreferences = storage::load_shell_preferences(&database_path)?
            .map(serde_json::from_value)
            .transpose()
            .map_err(|error| error.to_string())?
            .unwrap_or_default();
        Ok(Self {
            database_path,
            mode: Mutex::new(preferences.last_mode),
            preferences: Mutex::new(preferences),
            full_window_bounds: Mutex::new(None),
            exiting: AtomicBool::new(false),
        })
    }

    pub fn initialize(&self, app: &AppHandle) -> Result<(), String> {
        self.ensure_orb_window(app)?;
        self.install_tray(app)?;

        let first_launch = {
            let mut preferences = self.lock_preferences()?;
            if preferences.launched_once {
                false
            } else {
                preferences.launched_once = true;
                preferences.last_mode = ShellMode::FullWindow;
                self.persist_preferences(&preferences)?;
                true
            }
        };

        if first_launch {
            self.show_full_window(app)
        } else {
            match self.lock_preferences()?.last_mode {
                ShellMode::FullWindow => self.show_full_window(app),
                ShellMode::DockedPanel => self.show_panel(app),
                ShellMode::Orb | ShellMode::TrayBackground => self.show_orb_or_tray(app),
            }
        }
    }

    pub fn snapshot(&self) -> Result<ShellSnapshot, String> {
        let preferences = self.lock_preferences()?.clone();
        Ok(ShellSnapshot {
            mode: *self.lock_mode()?,
            orb_enabled: preferences.orb_enabled,
            panel_always_on_top: preferences.panel_always_on_top,
            edge: preferences.edge,
            y_ratio: preferences.y_ratio,
        })
    }

    pub fn show_full_window(&self, app: &AppHandle) -> Result<(), String> {
        let main = main_window(app)?;
        self.capture_full_window_bounds_if_needed(&main)?;
        hide_window(app, ORB_LABEL)?;

        main.unminimize().map_err(error_message)?;
        main.unmaximize().map_err(error_message)?;
        main.set_decorations(true).map_err(error_message)?;
        main.set_resizable(true).map_err(error_message)?;
        main.set_maximizable(true).map_err(error_message)?;
        main.set_minimizable(true).map_err(error_message)?;
        main.set_skip_taskbar(false).map_err(error_message)?;
        main.set_always_on_top(false).map_err(error_message)?;
        main.set_min_size(Some(PhysicalSize::new(
            logical_to_physical(
                FULL_WINDOW_MIN_WIDTH_LOGICAL,
                main.scale_factor().map_err(error_message)?,
            ),
            logical_to_physical(
                FULL_WINDOW_MIN_HEIGHT_LOGICAL,
                main.scale_factor().map_err(error_message)?,
            ),
        )))
        .map_err(error_message)?;

        let saved = self
            .full_window_bounds
            .lock()
            .map_err(|_| "Desktop full-window bounds lock 已损坏。".to_string())?
            .clone();
        if let Some(bounds) = saved {
            main.set_size(bounds.size).map_err(error_message)?;
            if let Some(position) = bounds.position {
                main.set_position(position).map_err(error_message)?;
            } else {
                main.center().map_err(error_message)?;
            }
            if bounds.maximized {
                main.maximize().map_err(error_message)?;
            }
        } else {
            let scale = main.scale_factor().map_err(error_message)?;
            main.set_size(PhysicalSize::new(
                logical_to_physical(FULL_WINDOW_WIDTH_LOGICAL, scale),
                logical_to_physical(FULL_WINDOW_HEIGHT_LOGICAL, scale),
            ))
            .map_err(error_message)?;
            main.center().map_err(error_message)?;
        }

        main.show().map_err(error_message)?;
        main.set_focus().map_err(error_message)?;
        self.set_mode_and_persist(ShellMode::FullWindow)?;
        self.emit_snapshot(app)
    }

    pub fn show_panel(&self, app: &AppHandle) -> Result<(), String> {
        let main = main_window(app)?;
        self.capture_full_window_bounds_if_needed(&main)?;
        hide_window(app, ORB_LABEL)?;
        main.unminimize().map_err(error_message)?;
        main.unmaximize().map_err(error_message)?;

        let preferences = self.lock_preferences()?.clone();
        let monitor = select_monitor(&main, preferences.monitor_name.as_deref())?;
        let work = monitor.work_area();
        let scale = monitor.scale_factor();
        let width = logical_to_physical(PANEL_WIDTH_LOGICAL, scale).min(work.size.width);
        let x = match preferences.edge {
            DockEdge::Left => work.position.x,
            DockEdge::Right => work.position.x + work.size.width as i32 - width as i32,
        };

        main.set_min_size(None::<PhysicalSize<u32>>)
            .map_err(error_message)?;
        main.set_decorations(false).map_err(error_message)?;
        main.set_resizable(false).map_err(error_message)?;
        main.set_maximizable(false).map_err(error_message)?;
        main.set_minimizable(false).map_err(error_message)?;
        main.set_skip_taskbar(true).map_err(error_message)?;
        main.set_always_on_top(preferences.panel_always_on_top)
            .map_err(error_message)?;
        main.set_size(PhysicalSize::new(width, work.size.height))
            .map_err(error_message)?;
        main.set_position(PhysicalPosition::new(x, work.position.y))
            .map_err(error_message)?;
        main.show().map_err(error_message)?;
        main.set_focus().map_err(error_message)?;
        self.set_mode_and_persist(ShellMode::DockedPanel)?;
        self.emit_snapshot(app)
    }

    pub fn collapse_panel(&self, app: &AppHandle) -> Result<(), String> {
        hide_window(app, MAIN_LABEL)?;
        self.show_orb_or_tray(app)
    }

    pub fn toggle_compact(&self, app: &AppHandle) -> Result<(), String> {
        match *self.lock_mode()? {
            ShellMode::DockedPanel => self.collapse_panel(app),
            ShellMode::Orb | ShellMode::TrayBackground => self.show_panel(app),
            ShellMode::FullWindow => self.show_panel(app),
        }
    }

    pub fn toggle_orb_enabled(&self, app: &AppHandle) -> Result<(), String> {
        let enabled = {
            let mut preferences = self.lock_preferences()?;
            preferences.orb_enabled = !preferences.orb_enabled;
            self.persist_preferences(&preferences)?;
            preferences.orb_enabled
        };

        if enabled {
            if matches!(
                *self.lock_mode()?,
                ShellMode::TrayBackground | ShellMode::Orb
            ) {
                self.show_orb(app)?;
            }
        } else {
            hide_window(app, ORB_LABEL)?;
            if *self.lock_mode()? == ShellMode::Orb {
                self.set_mode_and_persist(ShellMode::TrayBackground)?;
            }
        }
        self.emit_snapshot(app)
    }

    pub fn set_panel_always_on_top(&self, app: &AppHandle, enabled: bool) -> Result<(), String> {
        {
            let mut preferences = self.lock_preferences()?;
            preferences.panel_always_on_top = enabled;
            self.persist_preferences(&preferences)?;
        }
        if *self.lock_mode()? == ShellMode::DockedPanel {
            main_window(app)?
                .set_always_on_top(enabled)
                .map_err(error_message)?;
        }
        self.emit_snapshot(app)
    }

    pub fn start_orb_drag(&self, app: &AppHandle) -> Result<(), String> {
        orb_window(app)?.start_dragging().map_err(error_message)
    }

    pub fn snap_orb(&self, app: &AppHandle) -> Result<(), String> {
        let orb = orb_window(app)?;
        let position = orb.outer_position().map_err(error_message)?;
        let size = orb.outer_size().map_err(error_message)?;
        let center_x = position.x + (size.width as i32 / 2);
        let center_y = position.y + (size.height as i32 / 2);
        let monitor = orb
            .monitor_from_point(center_x as f64, center_y as f64)
            .map_err(error_message)?
            .or_else(|| orb.current_monitor().ok().flatten())
            .or_else(|| orb.primary_monitor().ok().flatten())
            .ok_or_else(|| "没有可用显示器，无法吸附悬浮球。".to_string())?;
        let work = monitor.work_area();
        let distance_left = (position.x - work.position.x).unsigned_abs();
        let right_x = work.position.x + work.size.width as i32 - size.width as i32;
        let distance_right = (position.x - right_x).unsigned_abs();
        let edge = if distance_left <= distance_right {
            DockEdge::Left
        } else {
            DockEdge::Right
        };
        let travel = work.size.height.saturating_sub(size.height) as f64;
        let y_ratio = if travel <= 0.0 {
            0.5
        } else {
            ((position.y - work.position.y) as f64 / travel).clamp(0.0, 1.0)
        };

        {
            let mut preferences = self.lock_preferences()?;
            preferences.monitor_name = monitor.name().cloned();
            preferences.edge = edge;
            preferences.y_ratio = y_ratio;
            self.persist_preferences(&preferences)?;
        }
        self.position_orb(&orb, &monitor, false)?;
        self.emit_snapshot(app)
    }

    pub fn set_orb_idle(&self, app: &AppHandle, idle: bool) -> Result<(), String> {
        let orb = orb_window(app)?;
        let preferences = self.lock_preferences()?.clone();
        let monitor = select_monitor(&orb, preferences.monitor_name.as_deref())?;
        self.position_orb(&orb, &monitor, idle)
    }

    pub fn handle_main_close(&self, app: &AppHandle) -> Result<(), String> {
        if self.exiting.load(Ordering::Acquire) {
            return Ok(());
        }
        self.show_orb_or_tray(app)
    }

    pub fn exit(&self, app: &AppHandle) {
        self.exiting.store(true, Ordering::Release);
        app.exit(0);
    }

    fn show_orb_or_tray(&self, app: &AppHandle) -> Result<(), String> {
        if self.lock_preferences()?.orb_enabled {
            self.show_orb(app)
        } else {
            hide_window(app, ORB_LABEL)?;
            self.set_mode_and_persist(ShellMode::TrayBackground)?;
            self.emit_snapshot(app)
        }
    }

    fn show_orb(&self, app: &AppHandle) -> Result<(), String> {
        let orb = orb_window(app)?;
        self.set_mode_and_persist(ShellMode::Orb)?;
        if crate::fullscreen::is_suppressed() {
            hide_window(app, ORB_LABEL)?;
            return self.emit_snapshot(app);
        }
        let preferences = self.lock_preferences()?.clone();
        let monitor = select_monitor(&orb, preferences.monitor_name.as_deref())?;
        self.position_orb(&orb, &monitor, false)?;
        orb.show().map_err(error_message)?;
        self.emit_snapshot(app)
    }

    fn position_orb(
        &self,
        orb: &WebviewWindow,
        monitor: &Monitor,
        idle: bool,
    ) -> Result<(), String> {
        let preferences = self.lock_preferences()?.clone();
        let work = monitor.work_area();
        let scale = monitor.scale_factor();
        let size =
            logical_to_physical(ORB_SIZE_LOGICAL, scale).min(work.size.width.min(work.size.height));
        let visible = logical_to_physical(ORB_IDLE_VISIBLE_LOGICAL, scale).min(size);
        let travel = work.size.height.saturating_sub(size);
        let y =
            work.position.y + (travel as f64 * preferences.y_ratio.clamp(0.0, 1.0)).round() as i32;
        let edge_x = match preferences.edge {
            DockEdge::Left => work.position.x,
            DockEdge::Right => work.position.x + work.size.width as i32 - size as i32,
        };
        let x = if idle {
            match preferences.edge {
                DockEdge::Left => edge_x - (size - visible) as i32,
                DockEdge::Right => edge_x + (size - visible) as i32,
            }
        } else {
            edge_x
        };
        orb.set_size(PhysicalSize::new(size, size))
            .map_err(error_message)?;
        orb.set_position(PhysicalPosition::new(x, y))
            .map_err(error_message)
    }

    fn ensure_orb_window(&self, app: &AppHandle) -> Result<(), String> {
        if app.get_webview_window(ORB_LABEL).is_some() {
            return Ok(());
        }
        WebviewWindowBuilder::new(app, ORB_LABEL, WebviewUrl::App("orb.html".into()))
            .title("PromptNote Floating Orb")
            .inner_size(ORB_SIZE_LOGICAL, ORB_SIZE_LOGICAL)
            .resizable(false)
            .maximizable(false)
            .minimizable(false)
            .closable(false)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .visible(false)
            .shadow(false)
            .build()
            .map(|_| ())
            .map_err(error_message)
    }

    fn install_tray(&self, app: &AppHandle) -> Result<(), String> {
        let open = MenuItem::with_id(app, "open", "Open PromptNote", true, None::<&str>)
            .map_err(error_message)?;
        let new_prompt = MenuItem::with_id(app, "new", "New Prompt", true, None::<&str>)
            .map_err(error_message)?;
        let orb = MenuItem::with_id(
            app,
            "toggle-orb",
            "Show / Hide Floating Orb",
            true,
            None::<&str>,
        )
        .map_err(error_message)?;
        let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)
            .map_err(error_message)?;
        let exit = MenuItem::with_id(app, "exit", "Exit PromptNote", true, None::<&str>)
            .map_err(error_message)?;
        let menu = Menu::with_items(app, &[&open, &new_prompt, &orb, &settings, &exit])
            .map_err(error_message)?;
        let icon = app
            .default_window_icon()
            .cloned()
            .ok_or_else(|| "PromptNote Desktop 缺少默认应用图标。".to_string())?;

        TrayIconBuilder::with_id("promptnote-tray")
            .icon(icon)
            .tooltip("PromptNote")
            .menu(&menu)
            .show_menu_on_left_click(false)
            .on_menu_event(|app, event| {
                let controller = app.state::<ShellController>();
                let result = match event.id().as_ref() {
                    "open" => controller.show_full_window(app),
                    "new" => controller
                        .show_full_window(app)
                        .and_then(|_| emit_host_command(app, "new-prompt")),
                    "toggle-orb" => controller.toggle_orb_enabled(app),
                    "settings" => controller
                        .show_full_window(app)
                        .and_then(|_| emit_host_command(app, "settings")),
                    "exit" => {
                        controller.exit(app);
                        Ok(())
                    }
                    _ => Ok(()),
                };
                if let Err(error) = result {
                    eprintln!("PromptNote tray action failed: {error}");
                }
            })
            .on_tray_icon_event(|tray, event| {
                if let TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } = event
                {
                    let app = tray.app_handle();
                    if let Err(error) = app.state::<ShellController>().show_full_window(app) {
                        eprintln!("PromptNote tray open failed: {error}");
                    }
                }
            })
            .build(app)
            .map(|_| ())
            .map_err(error_message)
    }

    fn capture_full_window_bounds_if_needed(&self, main: &WebviewWindow) -> Result<(), String> {
        if *self.lock_mode()? != ShellMode::FullWindow
            || !main.is_visible().map_err(error_message)?
        {
            return Ok(());
        }
        let bounds = FullWindowBounds {
            position: main.outer_position().ok(),
            size: main.outer_size().map_err(error_message)?,
            maximized: main.is_maximized().map_err(error_message)?,
        };
        *self
            .full_window_bounds
            .lock()
            .map_err(|_| "Desktop full-window bounds lock 已损坏。".to_string())? = Some(bounds);
        Ok(())
    }

    fn set_mode_and_persist(&self, mode: ShellMode) -> Result<(), String> {
        *self.lock_mode()? = mode;
        let mut preferences = self.lock_preferences()?;
        preferences.last_mode = mode;
        self.persist_preferences(&preferences)
    }

    fn persist_preferences(&self, preferences: &ShellPreferences) -> Result<(), String> {
        let value = serde_json::to_value(preferences).map_err(|error| error.to_string())?;
        storage::save_shell_preferences(&self.database_path, &value)
    }

    fn emit_snapshot(&self, app: &AppHandle) -> Result<(), String> {
        let snapshot = self.snapshot()?;
        app.emit_to(MAIN_LABEL, "promptnote:shell-state", &snapshot)
            .map_err(error_message)?;
        app.emit_to(ORB_LABEL, "promptnote:shell-state", &snapshot)
            .map_err(error_message)
    }

    fn lock_preferences(&self) -> Result<std::sync::MutexGuard<'_, ShellPreferences>, String> {
        self.preferences
            .lock()
            .map_err(|_| "Desktop shell preferences lock 已损坏。".to_string())
    }

    fn lock_mode(&self) -> Result<std::sync::MutexGuard<'_, ShellMode>, String> {
        self.mode
            .lock()
            .map_err(|_| "Desktop shell mode lock 已损坏。".to_string())
    }
}

fn emit_host_command(app: &AppHandle, command: &str) -> Result<(), String> {
    app.emit_to(MAIN_LABEL, "promptnote:host-command", command)
        .map_err(error_message)
}

fn main_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window(MAIN_LABEL)
        .ok_or_else(|| "PromptNote main window 不存在。".to_string())
}

fn orb_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window(ORB_LABEL)
        .ok_or_else(|| "PromptNote orb window 不存在。".to_string())
}

fn hide_window(app: &AppHandle, label: &str) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(label) {
        window.hide().map_err(error_message)?;
    }
    Ok(())
}

fn select_monitor(window: &WebviewWindow, preferred_name: Option<&str>) -> Result<Monitor, String> {
    let monitors = window.available_monitors().map_err(error_message)?;
    if let Some(name) = preferred_name {
        if let Some(monitor) = monitors
            .iter()
            .find(|monitor| monitor.name().map(String::as_str) == Some(name))
        {
            return Ok(monitor.clone());
        }
    }
    window
        .current_monitor()
        .map_err(error_message)?
        .or_else(|| window.primary_monitor().ok().flatten())
        .or_else(|| monitors.into_iter().next())
        .ok_or_else(|| "没有可用显示器。".to_string())
}

fn logical_to_physical(value: f64, scale: f64) -> u32 {
    (value * scale).round().max(1.0) as u32
}

fn error_message(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_shell_preferences_match_desktop_contract() {
        let preferences = ShellPreferences::default();
        assert!(preferences.orb_enabled);
        assert!(preferences.panel_always_on_top);
        assert_eq!(preferences.edge, DockEdge::Right);
        assert_eq!(preferences.y_ratio, 0.5);
        assert_eq!(preferences.last_mode, ShellMode::Orb);
        assert!(!preferences.launched_once);
    }

    #[test]
    fn logical_sizes_scale_for_high_dpi() {
        assert_eq!(logical_to_physical(PANEL_WIDTH_LOGICAL, 1.0), 420);
        assert_eq!(logical_to_physical(PANEL_WIDTH_LOGICAL, 1.25), 525);
        assert_eq!(logical_to_physical(ORB_SIZE_LOGICAL, 1.5), 72);
    }
}

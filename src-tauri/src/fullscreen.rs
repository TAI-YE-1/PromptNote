use std::mem::size_of;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Manager};
use windows_sys::Win32::Foundation::RECT;
use windows_sys::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetWindowRect, GetWindowThreadProcessId, IsWindowVisible, IsZoomed,
};

use crate::shell::{ShellController, ShellMode};

const POLL_INTERVAL: Duration = Duration::from_millis(750);
const FULLSCREEN_TOLERANCE_PX: i32 = 2;
const ORB_LABEL: &str = "orb";

static SUPPRESSED: AtomicBool = AtomicBool::new(false);

pub fn is_suppressed() -> bool {
    SUPPRESSED.load(Ordering::Acquire)
}

pub fn start(app: AppHandle) -> Result<(), String> {
    thread::Builder::new()
        .name("promptnote-fullscreen-watch".to_string())
        .spawn(move || loop {
            let suppressed = foreground_is_fullscreen();
            let changed = SUPPRESSED.swap(suppressed, Ordering::AcqRel) != suppressed;
            if changed || suppressed {
                let ui_app = app.clone();
                if app
                    .run_on_main_thread(move || apply_visibility(&ui_app, suppressed))
                    .is_err()
                {
                    break;
                }
            }
            thread::sleep(POLL_INTERVAL);
        })
        .map(|_| ())
        .map_err(|error| format!("无法启动全屏检测线程：{error}"))
}

fn apply_visibility(app: &AppHandle, suppressed: bool) {
    let Some(orb) = app.get_webview_window(ORB_LABEL) else {
        return;
    };

    if suppressed {
        let _ = orb.hide();
        return;
    }

    let Some(shell) = app.try_state::<ShellController>() else {
        return;
    };
    if let Ok(snapshot) = shell.snapshot() {
        if snapshot.mode == ShellMode::Orb && snapshot.orb_enabled {
            let _ = orb.show();
        }
    }
}

fn foreground_is_fullscreen() -> bool {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_null() || IsWindowVisible(hwnd) == 0 || IsZoomed(hwnd) != 0 {
            return false;
        }

        let mut process_id = 0_u32;
        GetWindowThreadProcessId(hwnd, &mut process_id);
        if process_id == 0 || process_id == std::process::id() {
            return false;
        }

        let mut window_rect = RECT {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
        };
        if GetWindowRect(hwnd, &mut window_rect) == 0 {
            return false;
        }

        let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        if monitor.is_null() {
            return false;
        }

        let mut monitor_info: MONITORINFO = std::mem::zeroed();
        monitor_info.cbSize = size_of::<MONITORINFO>() as u32;
        if GetMonitorInfoW(monitor, &mut monitor_info) == 0 {
            return false;
        }

        covers_monitor(window_rect, monitor_info.rcMonitor)
    }
}

fn covers_monitor(window: RECT, monitor: RECT) -> bool {
    window.left <= monitor.left + FULLSCREEN_TOLERANCE_PX
        && window.top <= monitor.top + FULLSCREEN_TOLERANCE_PX
        && window.right >= monitor.right - FULLSCREEN_TOLERANCE_PX
        && window.bottom >= monitor.bottom - FULLSCREEN_TOLERANCE_PX
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fullscreen_geometry_accepts_small_border_tolerance() {
        let monitor = RECT {
            left: 0,
            top: 0,
            right: 1920,
            bottom: 1080,
        };
        assert!(covers_monitor(
            RECT {
                left: 1,
                top: 1,
                right: 1919,
                bottom: 1079,
            },
            monitor,
        ));
        assert!(!covers_monitor(
            RECT {
                left: 0,
                top: 0,
                right: 1200,
                bottom: 900,
            },
            monitor,
        ));
    }

    #[test]
    fn fullscreen_geometry_handles_negative_monitor_coordinates() {
        assert!(covers_monitor(
            RECT {
                left: -1920,
                top: 0,
                right: 0,
                bottom: 1080,
            },
            RECT {
                left: -1920,
                top: 0,
                right: 0,
                bottom: 1080,
            },
        ));
    }
}

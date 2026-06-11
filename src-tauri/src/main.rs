// MoleUI — a native macOS GUI for the Mole cleanup CLI.
// Copyright (C) 2026 Zhili Liang
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation, either version 3 of the License, or (at your option)
// any later version. This program is distributed WITHOUT ANY WARRANTY; see
// the GNU General Public License <https://www.gnu.org/licenses/> for details.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use portable_pty::{native_pty_system, ChildKiller, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, Emitter, Manager, State};

/// Resource dir of the bundled mole copy, set once at startup.
static MOLE_DIST: OnceLock<Option<PathBuf>> = OnceLock::new();

fn mole_dist_dir() -> Option<&'static PathBuf> {
    MOLE_DIST.get().and_then(|o| o.as_ref())
}

/// Every shell we spawn gets the bundled mole appended to PATH, so a
/// system-installed mole always wins and the bundled copy is the fallback.
fn shell_prelude() -> String {
    match mole_dist_dir() {
        Some(p) => format!("export PATH=\"$PATH:{}\"; ", p.display()),
        None => String::new(),
    }
}

struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    killer: Box<dyn ChildKiller + Send + Sync>,
}

#[derive(Default)]
struct AppState {
    session: Mutex<Option<PtySession>>,
    generation: AtomicU64,
    tasks: Mutex<HashMap<String, Child>>,
}

#[derive(Serialize)]
struct MoleInfo {
    installed: bool,
    path: Option<String>,
    version: Option<String>,
    bundled: bool,
    bundled_path: Option<String>,
}

#[derive(Serialize)]
struct TouchIdStatus {
    enabled: bool,
    location: Option<String>,
}

fn home_dir() -> PathBuf {
    PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| "/tmp".into()))
}

fn login_sh(cmd: &str) -> Option<String> {
    let cmd = format!("{}{}", shell_prelude(), cmd);
    let out = Command::new("/bin/bash")
        .args(["-lc", &cmd])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}

fn strip_ansi(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\u{1b}' {
            if chars.peek() == Some(&'[') {
                chars.next();
                while let Some(&n) = chars.peek() {
                    chars.next();
                    if n.is_ascii_alphabetic() {
                        break;
                    }
                }
            }
        } else {
            out.push(c);
        }
    }
    out
}

fn canonical_path(path: impl AsRef<Path>) -> PathBuf {
    std::fs::canonicalize(path.as_ref()).unwrap_or_else(|_| path.as_ref().to_path_buf())
}

fn root_has_mole_bins(root: &Path) -> bool {
    root.join("bin/status-go").exists() || root.join("bin/analyze-go").exists()
}

fn mole_root_from_path(path: &str) -> Option<PathBuf> {
    let resolved = canonical_path(path);
    let parent = resolved.parent()?;
    if root_has_mole_bins(parent) {
        return Some(parent.to_path_buf());
    }
    let grandparent = parent.parent()?;
    if root_has_mole_bins(grandparent) {
        return Some(grandparent.to_path_buf());
    }
    None
}

fn touchid_config_status(paths: &[&str]) -> TouchIdStatus {
    for path in paths {
        let Ok(content) = std::fs::read_to_string(path) else {
            continue;
        };
        if content.lines().any(|line| line.contains("pam_tid.so")) {
            return TouchIdStatus {
                enabled: true,
                location: Some((*path).to_string()),
            };
        }
    }
    TouchIdStatus {
        enabled: false,
        location: None,
    }
}

#[tauri::command]
fn check_mole() -> MoleInfo {
    let bundled_path = mole_dist_dir().map(|d| d.join("mole").to_string_lossy().to_string());
    match login_sh("command -v mole") {
        Some(p) => {
            let version =
                login_sh("mole --version 2>/dev/null | grep -m1 'Mole version'").map(|line| {
                    strip_ansi(&line)
                        .trim()
                        .trim_start_matches("Mole version")
                        .trim()
                        .to_string()
                });
            // Resolve symlinks so a /usr/local/bin/mole link into the app
            // bundle still counts as the bundled copy on macOS.
            let resolved = canonical_path(&p);
            let bundled = mole_dist_dir()
                .map(|d| resolved.starts_with(canonical_path(d)))
                .unwrap_or(false);
            MoleInfo {
                installed: true,
                path: Some(p),
                version,
                bundled,
                bundled_path,
            }
        }
        None => MoleInfo {
            installed: false,
            path: None,
            version: None,
            bundled: false,
            bundled_path,
        },
    }
}

#[tauri::command]
fn touchid_status() -> TouchIdStatus {
    touchid_config_status(&["/etc/pam.d/sudo_local", "/etc/pam.d/sudo"])
}

/// Streaming capture task: runs `command` through a login shell without a TTY
/// (mole detects this and switches to its non-interactive mode). Lines from
/// stdout+stderr are forwarded as `task-line` events, completion as `task-done`.
#[tauri::command]
fn run_capture(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    command: String,
) -> Result<(), String> {
    {
        let mut tasks = state.tasks.lock().map_err(|e| e.to_string())?;
        if let Some(mut old) = tasks.remove(&id) {
            let _ = old.kill();
        }
    }

    let full_cmd = format!("{}{}", shell_prelude(), command);
    let mut child = Command::new("/bin/bash")
        .args(["-lc", &full_cmd])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .env("TERM", "dumb")
        .env("NO_COLOR", "1")
        .env("LANG", "en_US.UTF-8")
        .spawn()
        .map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;
    state
        .tasks
        .lock()
        .map_err(|e| e.to_string())?
        .insert(id.clone(), child);

    let spawn_reader = |stream: Box<dyn Read + Send>, app: AppHandle, id: String| {
        std::thread::spawn(move || {
            let reader = BufReader::new(stream);
            for line in reader.split(b'\n').flatten() {
                let text = String::from_utf8_lossy(&line);
                // Spinner frames rewrite the line with \r; keep the last segment.
                let text = text.rsplit('\r').next().unwrap_or("").to_string();
                let _ = app.emit("task-line", serde_json::json!({ "id": id, "line": text }));
            }
        })
    };

    let h1 = spawn_reader(Box::new(stdout), app.clone(), id.clone());
    let h2 = spawn_reader(Box::new(stderr), app.clone(), id.clone());

    let app2 = app.clone();
    std::thread::spawn(move || {
        let _ = h1.join();
        let _ = h2.join();
        let code = {
            let binding = app2.state::<AppState>();
            let mut tasks = match binding.tasks.lock() {
                Ok(t) => t,
                Err(_) => return,
            };
            match tasks.remove(&id) {
                Some(mut child) => child.wait().ok().and_then(|s| s.code()),
                None => None,
            }
        };
        let _ = app2.emit("task-done", serde_json::json!({ "id": id, "code": code }));
    });

    Ok(())
}

#[tauri::command]
fn kill_task(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let mut tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = tasks.remove(&id) {
        let _ = child.kill();
    }
    Ok(())
}

/// One-shot blocking capture, returns stdout. For JSON producers
/// (status-go, analyze-go, uninstall --list, history --json).
#[tauri::command(async)]
fn run_json(command: String) -> Result<String, String> {
    let command = format!("{}{}", shell_prelude(), command);
    let out = Command::new("/bin/bash")
        .args(["-lc", &command])
        .stdin(Stdio::null())
        .env("NO_COLOR", "1")
        .output()
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&out.stdout).to_string())
}

const ALLOWED_CONFIGS: [&str; 5] = [
    "whitelist",
    "whitelist_optimize",
    "purge_paths",
    "clean-list.txt",
    "installer-list.txt",
];

fn config_path(name: &str) -> Result<PathBuf, String> {
    if !ALLOWED_CONFIGS.contains(&name) {
        return Err(format!("config '{name}' not allowed"));
    }
    Ok(home_dir().join(".config/mole").join(name))
}

#[tauri::command]
fn read_mole_config(name: String) -> Result<String, String> {
    let p = config_path(&name)?;
    Ok(std::fs::read_to_string(p).unwrap_or_default())
}

#[tauri::command]
fn write_mole_config(name: String, content: String) -> Result<(), String> {
    let p = config_path(&name)?;
    if let Some(dir) = p.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    std::fs::write(p, content).map_err(|e| e.to_string())
}

/// Locate the dir holding mole's Go binaries (bin/analyze-go, bin/status-go).
#[tauri::command]
fn mole_root() -> Result<String, String> {
    if let Some(path) = login_sh("command -v mole") {
        if let Some(root) = mole_root_from_path(&path) {
            return Ok(root.to_string_lossy().to_string());
        }
    }
    if let Some(d) = mole_dist_dir() {
        return Ok(d.to_string_lossy().to_string());
    }
    Err("mole not found".into())
}

/// Write the GUI askpass helper used for `sudo -A`, returns its path.
#[tauri::command]
fn ensure_askpass(app: AppHandle) -> Result<String, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let p = dir.join("askpass.sh");
    let script = r#"#!/bin/bash
PW=$(osascript -e 'text returned of (display dialog "MoleUI 需要管理员权限来执行系统级操作\nMoleUI needs administrator access for system-level operations" with title "MoleUI" default answer "" with hidden answer buttons {"取消","好"} default button 2 with icon caution)' 2>/dev/null) || exit 1
printf '%s\n' "$PW"
"#;
    std::fs::write(&p, script).map_err(|e| e.to_string())?;
    Command::new("chmod")
        .args(["700", p.to_str().unwrap_or_default()])
        .status()
        .map_err(|e| e.to_string())?;
    Ok(p.to_string_lossy().to_string())
}

/// Extract an app bundle's icon to a cached PNG, return the PNG path.
#[tauri::command(async)]
fn app_icon(app: AppHandle, bundle_path: String) -> Result<Option<String>, String> {
    let cache = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("icons");
    std::fs::create_dir_all(&cache).map_err(|e| e.to_string())?;

    let mut hasher = DefaultHasher::new();
    bundle_path.hash(&mut hasher);
    let out_png = cache.join(format!("{:x}.png", hasher.finish()));
    let as_data_url = |p: &PathBuf| -> Option<String> {
        let bytes = std::fs::read(p).ok()?;
        Some(format!("data:image/png;base64,{}", B64.encode(bytes)))
    };
    if out_png.exists() {
        return Ok(as_data_url(&out_png));
    }

    let resources = PathBuf::from(&bundle_path).join("Contents/Resources");
    let plist = PathBuf::from(&bundle_path).join("Contents/Info.plist");
    let mut icns: Option<PathBuf> = None;

    if plist.exists() {
        if let Ok(out) = Command::new("/usr/bin/plutil")
            .args([
                "-extract",
                "CFBundleIconFile",
                "raw",
                "-o",
                "-",
                plist.to_str().unwrap_or_default(),
            ])
            .output()
        {
            if out.status.success() {
                let mut name = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !name.is_empty() {
                    if !name.ends_with(".icns") {
                        name.push_str(".icns");
                    }
                    let p = resources.join(&name);
                    if p.exists() {
                        icns = Some(p);
                    }
                }
            }
        }
    }
    if icns.is_none() {
        if let Ok(entries) = std::fs::read_dir(&resources) {
            icns = entries
                .flatten()
                .map(|e| e.path())
                .find(|p| p.extension().map(|e| e == "icns").unwrap_or(false));
        }
    }

    let Some(icns) = icns else { return Ok(None) };
    let status = Command::new("/usr/bin/sips")
        .args([
            "-s",
            "format",
            "png",
            "--resampleHeightWidthMax",
            "128",
            icns.to_str().unwrap_or_default(),
            "--out",
            out_png.to_str().unwrap_or_default(),
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map_err(|e| e.to_string())?;

    if status.success() && out_png.exists() {
        Ok(as_data_url(&out_png))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn pty_spawn(
    app: AppHandle,
    state: State<'_, AppState>,
    command: String,
    cols: u16,
    rows: u16,
) -> Result<u64, String> {
    let mut guard = state.session.lock().map_err(|e| e.to_string())?;
    if let Some(mut old) = guard.take() {
        let _ = old.killer.kill();
    }

    let generation = state.generation.fetch_add(1, Ordering::SeqCst) + 1;

    let pty = native_pty_system();
    let pair = pty
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let full_cmd = format!("{}{}", shell_prelude(), command);
    let mut cmd = CommandBuilder::new("/bin/bash");
    cmd.args(["-lc", &full_cmd]);
    cmd.env("TERM", "xterm-256color");
    cmd.env("LANG", "en_US.UTF-8");
    if let Some(home) = std::env::var_os("HOME") {
        cmd.cwd(home);
    }

    let mut child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    drop(pair.slave);

    let killer = child.clone_killer();
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let emitter = app.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let _ = emitter.emit(
                        "pty-output",
                        serde_json::json!({ "gen": generation, "data": B64.encode(&buf[..n]) }),
                    );
                }
            }
        }
        let code = child.wait().ok().map(|s| s.exit_code());
        let _ = emitter.emit(
            "pty-exit",
            serde_json::json!({ "gen": generation, "code": code }),
        );
    });

    *guard = Some(PtySession {
        master: pair.master,
        writer,
        killer,
    });
    Ok(generation)
}

#[tauri::command]
fn pty_write(state: State<'_, AppState>, data: String) -> Result<(), String> {
    let mut guard = state.session.lock().map_err(|e| e.to_string())?;
    if let Some(s) = guard.as_mut() {
        s.writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
        s.writer.flush().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn pty_resize(state: State<'_, AppState>, cols: u16, rows: u16) -> Result<(), String> {
    let guard = state.session.lock().map_err(|e| e.to_string())?;
    if let Some(s) = guard.as_ref() {
        s.master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn pty_kill(state: State<'_, AppState>) -> Result<(), String> {
    let mut guard = state.session.lock().map_err(|e| e.to_string())?;
    if let Some(mut s) = guard.take() {
        let _ = s.killer.kill();
    }
    Ok(())
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    if !url.starts_with("https://") {
        return Err("only https urls allowed".into());
    }
    Command::new("open")
        .arg(url)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let dist = app
                .path()
                .resource_dir()
                .ok()
                .map(|r| r.join("mole-dist"))
                .filter(|p| p.join("mole").exists());
            if let Some(d) = &dist {
                // resource copies can lose exec bits; restore them
                let _ = Command::new("/bin/sh")
                    .args([
                        "-c",
                        &format!("chmod +x '{0}/mole' '{0}/bin/'* 2>/dev/null", d.display()),
                    ])
                    .status();
            }
            let _ = MOLE_DIST.set(dist);
            Ok(())
        })
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            check_mole,
            touchid_status,
            run_capture,
            kill_task,
            run_json,
            read_mole_config,
            write_mole_config,
            mole_root,
            ensure_askpass,
            app_icon,
            pty_spawn,
            pty_write,
            pty_resize,
            pty_kill,
            open_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running MoleUI");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_root(name: &str) -> PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("moleui-{name}-{}-{nanos}", std::process::id()))
    }

    #[test]
    fn resolves_root_when_mole_lives_at_root() {
        let root = temp_root("root-script");
        std::fs::create_dir_all(root.join("bin")).unwrap();
        std::fs::write(root.join("mole"), "").unwrap();
        std::fs::write(root.join("bin/status-go"), "").unwrap();

        let found = mole_root_from_path(root.join("mole").to_str().unwrap()).unwrap();
        assert_eq!(found, canonical_path(&root));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn resolves_root_when_mole_lives_in_bin() {
        let root = temp_root("bin-script");
        std::fs::create_dir_all(root.join("bin")).unwrap();
        std::fs::write(root.join("bin/mole"), "").unwrap();
        std::fs::write(root.join("bin/analyze-go"), "").unwrap();

        let found = mole_root_from_path(root.join("bin/mole").to_str().unwrap()).unwrap();
        assert_eq!(found, canonical_path(&root));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn detects_touchid_sudo_configuration() {
        let root = temp_root("touchid");
        std::fs::create_dir_all(&root).unwrap();
        let disabled = root.join("sudo");
        let enabled = root.join("sudo_local");
        std::fs::write(&disabled, "auth required pam_smartcard.so\n").unwrap();
        std::fs::write(
            &enabled,
            "# local sudo config\nauth       sufficient     pam_tid.so\n",
        )
        .unwrap();

        let status =
            touchid_config_status(&[disabled.to_str().unwrap(), enabled.to_str().unwrap()]);
        assert!(status.enabled);
        assert_eq!(status.location, Some(enabled.to_string_lossy().to_string()));
        let _ = std::fs::remove_dir_all(root);
    }
}

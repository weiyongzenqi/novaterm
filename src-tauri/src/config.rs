//! Configuration file management for NovaTerm.
//! Handles reading/writing JSON config files to platform-standard directories.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{Manager, Runtime};

/// Authentication type for SSH sessions.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AuthType {
    Password,
    Key,
}

/// Saved session configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: AuthType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub private_key_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_used: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group: Option<String>,
}

/// Application configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default)]
    pub sessions: Vec<SessionConfig>,
    #[serde(default = "default_theme")]
    pub active_theme: String,
    #[serde(default)]
    pub download_dir: String,
    #[serde(default = "default_font_size")]
    pub terminal_font_size: u32,
    #[serde(default = "default_font_family")]
    pub terminal_font_family: String,
}

fn default_theme() -> String {
    "dracula".to_string()
}

fn default_font_size() -> u32 {
    14
}

fn default_font_family() -> String {
    "monospace".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            sessions: Vec::new(),
            active_theme: default_theme(),
            download_dir: String::new(),
            terminal_font_size: default_font_size(),
            terminal_font_family: default_font_family(),
        }
    }
}

/// Get the configuration directory path for the application.
/// Uses platform-standard directories:
/// - Linux: ~/.config/novaterm/
/// - Windows: %APPDATA%/novaterm/
/// - macOS: ~/Library/Application Support/novaterm/
pub fn get_config_dir<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf> {
    let config_dir = app
        .path()
        .app_config_dir()
        .context("Failed to get app config directory")?;

    // Ensure the directory exists
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .context("Failed to create config directory")?;
    }

    Ok(config_dir)
}

/// Get the configuration file path.
pub fn get_config_file_path<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf> {
    let config_dir = get_config_dir(app)?;
    Ok(config_dir.join("config.json"))
}

/// Load configuration from file.
pub fn load_config<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<AppConfig> {
    let config_path = get_config_file_path(app)?;

    if !config_path.exists() {
        // Return default config if file doesn't exist
        return Ok(AppConfig::default());
    }

    let content = fs::read_to_string(&config_path)
        .context("Failed to read config file")?;

    let config: AppConfig = serde_json::from_str(&content)
        .context("Failed to parse config file")?;

    Ok(config)
}

/// Save configuration to file.
/// Sets file permissions to 600 (owner read/write only) for security.
pub fn save_config<R: Runtime>(app: &tauri::AppHandle<R>, config: &AppConfig) -> Result<()> {
    let config_path = get_config_file_path(app)?;

    let content = serde_json::to_string_pretty(config)
        .context("Failed to serialize config")?;

    fs::write(&config_path, content)
        .context("Failed to write config file")?;

    // Set file permissions to 600 on Unix systems
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&config_path, fs::Permissions::from_mode(0o600))
            .context("Failed to set config file permissions")?;
    }

    Ok(())
}

/// Import sessions from a JSON file.
pub fn import_sessions(path: &str) -> Result<Vec<SessionConfig>> {
    let content = fs::read_to_string(path)
        .context("Failed to read import file")?;

    let sessions: Vec<SessionConfig> = serde_json::from_str(&content)
        .context("Failed to parse sessions file")?;

    Ok(sessions)
}

/// Export sessions to a JSON file.
pub fn export_sessions(sessions: &[SessionConfig], path: &str) -> Result<()> {
    let content = serde_json::to_string_pretty(sessions)
        .context("Failed to serialize sessions")?;

    fs::write(path, content)
        .context("Failed to write export file")?;

    Ok(())
}
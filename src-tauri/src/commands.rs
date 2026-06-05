//! Tauri IPC commands for SSH, SFTP, and config operations.

use tauri::{AppHandle, Runtime, State};

use crate::config::{self, AppConfig, SessionConfig};
use crate::sftp::SftpManager;
use crate::ssh::{AuthConfig, SSHConfig, SSHManager};

/// Connect to an SSH server.
#[tauri::command]
pub async fn ssh_connect<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, SSHManager>,
    host: String,
    port: u16,
    username: String,
    auth: AuthConfig,
    cols: u32,
    rows: u32,
) -> Result<String, String> {
    let config = SSHConfig {
        host,
        port,
        username,
        auth,
    };

    manager
        .connect(app, config, cols, rows)
        .await
        .map_err(|e| format!("{:#}", e))
}

/// Disconnect from an SSH server.
#[tauri::command]
pub async fn ssh_disconnect(
    manager: State<'_, SSHManager>,
    session_id: String,
) -> Result<(), String> {
    manager
        .disconnect(&session_id)
        .await
        .map_err(|e| format!("{:#}", e))
}

/// Send data to an SSH session.
#[tauri::command]
pub async fn ssh_send_data(
    manager: State<'_, SSHManager>,
    session_id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    manager
        .send_data(&session_id, data)
        .await
        .map_err(|e| format!("{:#}", e))
}

/// Resize an SSH session terminal.
#[tauri::command]
pub async fn ssh_resize(
    manager: State<'_, SSHManager>,
    session_id: String,
    cols: u32,
    rows: u32,
) -> Result<(), String> {
    manager
        .resize(&session_id, cols, rows)
        .await
        .map_err(|e| format!("{:#}", e))
}

/// Accept an unknown host key.
#[tauri::command]
pub async fn ssh_accept_host_key(
    manager: State<'_, SSHManager>,
    session_id: String,
) -> Result<(), String> {
    manager
        .accept_host_key(&session_id)
        .await
        .map_err(|e| format!("{:#}", e))
}

/// Reject an unknown host key.
#[tauri::command]
pub async fn ssh_reject_host_key(
    manager: State<'_, SSHManager>,
    session_id: String,
) -> Result<(), String> {
    manager
        .reject_host_key(&session_id)
        .await
        .map_err(|e| format!("{:#}", e))
}

// ==================== SFTP Commands ====================

/// Connect to an SFTP session.
#[tauri::command]
pub async fn sftp_connect<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, SftpManager>,
    host: String,
    port: u16,
    username: String,
    auth: AuthConfig,
) -> Result<String, String> {
    manager
        .connect(app, host, port, username, auth)
        .await
        .map_err(|e| format!("{:#}", e))
}

/// Disconnect an SFTP session.
#[tauri::command]
pub async fn sftp_disconnect(
    manager: State<'_, SftpManager>,
    session_id: String,
) -> Result<(), String> {
    manager
        .disconnect(&session_id)
        .await
        .map_err(|e| format!("{:#}", e))
}

/// List directory contents.
#[tauri::command]
pub async fn sftp_list_dir(
    manager: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<(), String> {
    manager
        .list_dir(&session_id, &path)
        .await
        .map_err(|e| format!("{:#}", e))
}

/// Download a remote file.
#[tauri::command]
pub async fn sftp_download(
    manager: State<'_, SftpManager>,
    session_id: String,
    remote_path: String,
    local_dir: String,
) -> Result<(), String> {
    manager
        .download(&session_id, &remote_path, &local_dir)
        .await
        .map_err(|e| format!("{:#}", e))
}

/// Upload a local file.
#[tauri::command]
pub async fn sftp_upload(
    manager: State<'_, SftpManager>,
    session_id: String,
    local_path: String,
    remote_dir: String,
) -> Result<(), String> {
    manager
        .upload(&session_id, &local_path, &remote_dir)
        .await
        .map_err(|e| format!("{:#}", e))
}

/// Delete a remote file or empty directory.
#[tauri::command]
pub async fn sftp_delete(
    manager: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<(), String> {
    manager
        .delete(&session_id, &path)
        .await
        .map_err(|e| format!("{:#}", e))
}

/// Create a directory.
#[tauri::command]
pub async fn sftp_mkdir(
    manager: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<(), String> {
    manager
        .mkdir(&session_id, &path)
        .await
        .map_err(|e| format!("{:#}", e))
}

// ==================== Config Commands ====================

/// Load application configuration.
#[tauri::command]
pub async fn load_config<R: Runtime>(
    app: AppHandle<R>,
) -> Result<AppConfig, String> {
    config::load_config(&app).map_err(|e| format!("{:#}", e))
}

/// Save application configuration.
#[tauri::command]
pub async fn save_config<R: Runtime>(
    app: AppHandle<R>,
    config: AppConfig,
) -> Result<(), String> {
    config::save_config(&app, &config).map_err(|e| format!("{:#}", e))
}

/// Import sessions from a JSON file.
#[tauri::command]
pub async fn import_sessions(path: String) -> Result<Vec<SessionConfig>, String> {
    config::import_sessions(&path).map_err(|e| format!("{:#}", e))
}

/// Export sessions to a JSON file.
#[tauri::command]
pub async fn export_sessions(
    sessions: Vec<SessionConfig>,
    path: String,
) -> Result<(), String> {
    config::export_sessions(&sessions, &path).map_err(|e| format!("{:#}", e))
}
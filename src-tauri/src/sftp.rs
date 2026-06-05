//! SFTP subsystem manager for NovaTerm.
//!
//! Provides SFTP operations (list, upload, download, delete, mkdir) over SSH.
//! SFTP sessions are separate from shell sessions to avoid blocking.

use std::collections::HashMap;
use std::sync::Arc;

use anyhow::{anyhow, Context, Result};
use async_trait::async_trait;
use russh::client::Handler;
use russh::keys::ssh_key;
use russh::Disconnect;
use russh_sftp::client::SftpSession;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc::{self, UnboundedReceiver, UnboundedSender};
use tokio::sync::RwLock;
use tokio::task::JoinHandle;
use tokio::time::{timeout, Duration};

use tauri::{AppHandle, Emitter, Runtime};

/// Remote file entry info.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteEntry {
    pub name: String,
    pub full_path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64,
}

/// Commands sent to SFTP worker.
#[derive(Debug)]
pub enum SftpCommand {
    ListDir(String),
    Download { remote: String, local_dir: String },
    Upload { local: String, remote_dir: String },
    Delete(String),
    Mkdir(String),
    Close,
}

/// Events from SFTP worker to frontend.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SftpEvent {
    Connected { session_id: String },
    Entries { session_id: String, path: String, entries: Vec<RemoteEntry> },
    #[allow(dead_code)]
    TransferProgress { session_id: String, id: String, name: String, is_upload: bool, transferred: u64, total: u64, state: u8 },
    Error { session_id: String, message: String },
    Closed { session_id: String },
    Status { session_id: String, message: String },
}

/// Handle to SFTP session worker.
pub struct SftpHandle {
    #[allow(dead_code)]
    pub session_id: String,
    pub commands: UnboundedSender<SftpCommand>,
    #[allow(dead_code)]
    pub join: JoinHandle<Result<()>>,
}

/// Global SFTP session manager.
pub struct SftpManager {
    sessions: Arc<RwLock<HashMap<String, SftpHandle>>>,
}

impl SftpManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Start a new SFTP session.
    pub async fn connect<R: Runtime>(
        &self,
        app: AppHandle<R>,
        host: String,
        port: u16,
        username: String,
        auth: crate::ssh::AuthConfig,
    ) -> Result<String> {
        let session_id = uuid::Uuid::new_v4().to_string();
        let (cmd_tx, cmd_rx) = mpsc::unbounded_channel::<SftpCommand>();

        let sessions_ref = self.sessions.clone();
        let session_id_for_cleanup = session_id.clone();
        let session_id_for_event = session_id.clone();

        let join = tokio::spawn(async move {
            let result = run_sftp_session(
                app,
                session_id_for_event,
                host,
                port,
                username,
                auth,
                cmd_rx,
            ).await;

            sessions_ref.write().await.remove(&session_id_for_cleanup);

            result
        });

        let handle = SftpHandle {
            session_id: session_id.clone(),
            commands: cmd_tx,
            join,
        };

        self.sessions.write().await.insert(session_id.clone(), handle);

        Ok(session_id)
    }

    /// Disconnect an SFTP session.
    pub async fn disconnect(&self, session_id: &str) -> Result<()> {
        let sessions = self.sessions.read().await;
        if let Some(handle) = sessions.get(session_id) {
            let _ = handle.commands.send(SftpCommand::Close);
        }
        drop(sessions);

        self.sessions.write().await.remove(session_id);
        Ok(())
    }

    /// List directory contents.
    pub async fn list_dir(&self, session_id: &str, path: &str) -> Result<()> {
        let sessions = self.sessions.read().await;
        if let Some(handle) = sessions.get(session_id) {
            handle.commands.send(SftpCommand::ListDir(path.to_string()))
                .map_err(|_| anyhow!("session closed"))?;
        } else {
            return Err(anyhow!("session not found: {}", session_id));
        }
        Ok(())
    }

    /// Download a file.
    pub async fn download(&self, session_id: &str, remote_path: &str, local_dir: &str) -> Result<()> {
        let sessions = self.sessions.read().await;
        if let Some(handle) = sessions.get(session_id) {
            handle.commands.send(SftpCommand::Download {
                remote: remote_path.to_string(),
                local_dir: local_dir.to_string(),
            }).map_err(|_| anyhow!("session closed"))?;
        } else {
            return Err(anyhow!("session not found: {}", session_id));
        }
        Ok(())
    }

    /// Upload a file.
    pub async fn upload(&self, session_id: &str, local_path: &str, remote_dir: &str) -> Result<()> {
        let sessions = self.sessions.read().await;
        if let Some(handle) = sessions.get(session_id) {
            handle.commands.send(SftpCommand::Upload {
                local: local_path.to_string(),
                remote_dir: remote_dir.to_string(),
            }).map_err(|_| anyhow!("session closed"))?;
        } else {
            return Err(anyhow!("session not found: {}", session_id));
        }
        Ok(())
    }

    /// Delete a file or empty directory.
    pub async fn delete(&self, session_id: &str, path: &str) -> Result<()> {
        let sessions = self.sessions.read().await;
        if let Some(handle) = sessions.get(session_id) {
            handle.commands.send(SftpCommand::Delete(path.to_string()))
                .map_err(|_| anyhow!("session closed"))?;
        } else {
            return Err(anyhow!("session not found: {}", session_id));
        }
        Ok(())
    }

    /// Create a directory.
    pub async fn mkdir(&self, session_id: &str, path: &str) -> Result<()> {
        let sessions = self.sessions.read().await;
        if let Some(handle) = sessions.get(session_id) {
            handle.commands.send(SftpCommand::Mkdir(path.to_string()))
                .map_err(|_| anyhow!("session closed"))?;
        } else {
            return Err(anyhow!("session not found: {}", session_id));
        }
        Ok(())
    }
}

impl Default for SftpManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Run SFTP session worker.
async fn run_sftp_session<R: Runtime>(
    app: AppHandle<R>,
    session_id: String,
    host: String,
    port: u16,
    username: String,
    auth: crate::ssh::AuthConfig,
    mut commands: UnboundedReceiver<SftpCommand>,
) -> Result<()> {
    emit_event(&app, &session_id, SftpEvent::Status { session_id: session_id.clone(), message: "Connecting...".into() });

    let ssh_config = Arc::new(russh::client::Config {
        inactivity_timeout: Some(std::time::Duration::from_secs(600)),
        ..<_>::default()
    });

    let handler = SftpClientHandler {
        host: host.clone(),
        port,
    };
    let addr = format!("{}:{}", host, port);

    // Connect to server with 15 second timeout
    let connect_result = timeout(
        Duration::from_secs(15),
        russh::client::connect(ssh_config, addr.as_str(), handler)
    ).await;

    let mut handle = match connect_result {
        Ok(inner) => inner.with_context(|| format!("SFTP connection failed to {}", addr))?,
        Err(_) => return Err(anyhow!("SFTP connection timed out after 15 seconds to {}", addr)),
    };

    let authed = match &auth {
        crate::ssh::AuthConfig::Password { password } => {
            handle.authenticate_password(&username, password).await
                .context("password authentication failed")?
        }
        crate::ssh::AuthConfig::Key { private_key_path, passphrase } => {
            let key_content = std::fs::read_to_string(private_key_path)
                .with_context(|| format!("failed to read key file {}", private_key_path))?;
            let keypair = russh::keys::decode_secret_key(
                &key_content,
                passphrase.as_deref(),
            ).context("failed to parse private key")?;
            let key_with_hash = russh::keys::PrivateKeyWithHashAlg::new(Arc::new(keypair), None);
            handle.authenticate_publickey(&username, key_with_hash).await
                .context("public key authentication failed")?
        }
    };

    if !matches!(authed, russh::client::AuthResult::Success) {
        return Err(anyhow!("authentication failed"));
    }

    let channel = handle.channel_open_session().await.context("failed to open session channel")?;
    channel.request_subsystem(true, "sftp").await.context("failed to request sftp subsystem")?;

    let sftp = SftpSession::new(channel.into_stream())
        .await
        .context("sftp handshake failed")?;

    emit_event(&app, &session_id, SftpEvent::Connected { session_id: session_id.clone() });

    while let Some(cmd) = commands.recv().await {
        match cmd {
            SftpCommand::Close => break,

            SftpCommand::ListDir(path) => {
                let path = match sanitize_remote_path(&path) {
                    Ok(p) => p,
                    Err(e) => {
                        emit_event(&app, &session_id, SftpEvent::Error {
                            session_id: session_id.clone(),
                            message: format!("Invalid path: {}", e),
                        });
                        continue;
                    }
                };
                match list_dir_impl(&sftp, &path).await {
                    Ok(entries) => {
                        emit_event(&app, &session_id, SftpEvent::Entries {
                            session_id: session_id.clone(),
                            path,
                            entries,
                        });
                    }
                    Err(e) => {
                        emit_event(&app, &session_id, SftpEvent::Error {
                            session_id: session_id.clone(),
                            message: format!("Failed to list directory: {}", e),
                        });
                    }
                }
            }

            SftpCommand::Download { remote, local_dir } => {
                let remote = match sanitize_remote_path(&remote) {
                    Ok(p) => p,
                    Err(e) => {
                        emit_event(&app, &session_id, SftpEvent::Error {
                            session_id: session_id.clone(),
                            message: format!("Invalid remote path: {}", e),
                        });
                        continue;
                    }
                };
                let filename = base_name(&remote);
                let local_path = match validate_local_path(&local_dir, &filename) {
                    Ok(p) => p,
                    Err(e) => {
                        emit_event(&app, &session_id, SftpEvent::Error {
                            session_id: session_id.clone(),
                            message: format!("Invalid local path: {}", e),
                        });
                        continue;
                    }
                };
                match download_impl(&sftp, &remote, &local_path).await {
                    Ok(()) => {
                        emit_event(&app, &session_id, SftpEvent::Status {
                            session_id: session_id.clone(),
                            message: format!("Downloaded: {}", filename),
                        });
                    }
                    Err(e) => {
                        emit_event(&app, &session_id, SftpEvent::Error {
                            session_id: session_id.clone(),
                            message: format!("Download failed: {}", e),
                        });
                    }
                }
            }

            SftpCommand::Upload { local, remote_dir } => {
                let filename = base_name(&local);
                let remote_dir = match sanitize_remote_path(&remote_dir) {
                    Ok(p) => p,
                    Err(e) => {
                        emit_event(&app, &session_id, SftpEvent::Error {
                            session_id: session_id.clone(),
                            message: format!("Invalid remote path: {}", e),
                        });
                        continue;
                    }
                };
                let remote_path = format!("{}/{}", remote_dir.trim_end_matches('/'), filename);
                match upload_impl(&sftp, &local, &remote_path).await {
                    Ok(()) => {
                        emit_event(&app, &session_id, SftpEvent::Status {
                            session_id: session_id.clone(),
                            message: format!("Uploaded: {}", filename),
                        });
                        if let Ok(entries) = list_dir_impl(&sftp, &remote_dir).await {
                            emit_event(&app, &session_id, SftpEvent::Entries {
                                session_id: session_id.clone(),
                                path: remote_dir,
                                entries,
                            });
                        }
                    }
                    Err(e) => {
                        emit_event(&app, &session_id, SftpEvent::Error {
                            session_id: session_id.clone(),
                            message: format!("Upload failed: {}", e),
                        });
                    }
                }
            }

            SftpCommand::Delete(path) => {
                let path = match sanitize_remote_path(&path) {
                    Ok(p) => p,
                    Err(e) => {
                        emit_event(&app, &session_id, SftpEvent::Error {
                            session_id: session_id.clone(),
                            message: format!("Invalid path: {}", e),
                        });
                        continue;
                    }
                };
                let delete_result = match sftp.remove_file(&path).await {
                    Ok(()) => Ok(()),
                    Err(_) => sftp.remove_dir(&path).await,
                };
                match delete_result {
                    Ok(()) => {
                        let parent = parent_dir(&path);
                        if let Ok(entries) = list_dir_impl(&sftp, &parent).await {
                            emit_event(&app, &session_id, SftpEvent::Entries {
                                session_id: session_id.clone(),
                                path: parent,
                                entries,
                            });
                        }
                    }
                    Err(e) => {
                        emit_event(&app, &session_id, SftpEvent::Error {
                            session_id: session_id.clone(),
                            message: format!("Failed to delete {}: {}", path, e),
                        });
                    }
                }
            }

            SftpCommand::Mkdir(path) => {
                let path = match sanitize_remote_path(&path) {
                    Ok(p) => p,
                    Err(e) => {
                        emit_event(&app, &session_id, SftpEvent::Error {
                            session_id: session_id.clone(),
                            message: format!("Invalid path: {}", e),
                        });
                        continue;
                    }
                };
                match sftp.create_dir(&path).await {
                    Ok(()) => {
                        let parent = parent_dir(&path);
                        if let Ok(entries) = list_dir_impl(&sftp, &parent).await {
                            emit_event(&app, &session_id, SftpEvent::Entries {
                                session_id: session_id.clone(),
                                path: parent,
                                entries,
                            });
                        }
                    }
                    Err(e) => {
                        emit_event(&app, &session_id, SftpEvent::Error {
                            session_id: session_id.clone(),
                            message: format!("Failed to create directory: {}", e),
                        });
                    }
                }
            }
        }
    }

    let _ = handle.disconnect(Disconnect::ByApplication, "bye", "").await;
    let session_id_closed = session_id.clone();
    emit_event(&app, &session_id, SftpEvent::Closed { session_id: session_id_closed });
    Ok(())
}

async fn list_dir_impl(sftp: &SftpSession, path: &str) -> Result<Vec<RemoteEntry>> {
    let raw = sftp.read_dir(path).await.with_context(|| format!("read_dir {} failed", path))?;

    let mut entries: Vec<RemoteEntry> = raw
        .into_iter()
        .filter(|e| {
            let n = e.file_name();
            n != "." && n != ".."
        })
        .map(|e| {
            let name = e.file_name().to_string();
            let full_path = format!("{}/{}", path.trim_end_matches('/'), name);
            let meta = e.metadata();
            let permissions = meta.permissions.unwrap_or(0);
            let is_dir = (permissions & 0o170_000) == 0o040_000;
            let size = meta.size.unwrap_or(0);
            let modified = meta.mtime.unwrap_or(0);
            RemoteEntry { name, full_path, is_dir, size, modified: modified as u64 }
        })
        .collect();

    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

const XFER_CHUNK: usize = 64 * 1024;

async fn download_impl(sftp: &SftpSession, remote: &str, local: &str) -> Result<()> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let mut remote_file = sftp.open(remote).await.context("open remote file")?;
    let mut local_file = tokio::fs::File::create(local).await.context("create local file")?;

    let mut buf = vec![0u8; XFER_CHUNK];
    loop {
        let n = remote_file.read(&mut buf).await.context("read remote file")?;
        if n == 0 {
            break;
        }
        local_file.write_all(&buf[..n]).await.context("write local file")?;
    }
    local_file.flush().await.context("flush local file")?;
    Ok(())
}

async fn upload_impl(sftp: &SftpSession, local: &str, remote: &str) -> Result<()> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let mut local_file = tokio::fs::File::open(local).await.context("open local file")?;
    let mut remote_file = sftp.create(remote).await.context("create remote file")?;

    let mut buf = vec![0u8; XFER_CHUNK];
    loop {
        let n = local_file.read(&mut buf).await.context("read local file")?;
        if n == 0 {
            break;
        }
        remote_file.write_all(&buf[..n]).await.context("write remote file")?;
    }
    remote_file.flush().await.context("flush remote file")?;
    Ok(())
}

fn base_name(path: &str) -> String {
    let sep = |c: char| c == '/' || c == '\\';
    path.trim_end_matches(sep)
        .rsplit(sep)
        .next()
        .unwrap_or(path)
        .to_string()
}

fn parent_dir(path: &str) -> String {
    let p = path.trim_end_matches('/');
    match p.rfind('/') {
        Some(0) | None => "/".to_string(),
        Some(i) => p[..i].to_string(),
    }
}

/// Sanitize a remote SFTP path: reject null bytes and normalize
fn sanitize_remote_path(path: &str) -> Result<String> {
    if path.contains('\0') {
        return Err(anyhow!("path contains null byte"));
    }
    // Normalize: remove redundant slashes and resolve . components
    // Keep .. as-is since users may legitimately navigate up
    let normalized = path
        .split('/')
        .filter(|s| !s.is_empty() && s != &".")
        .collect::<Vec<_>>()
        .join("/");
    Ok(format!("/{}", normalized))
}

/// Validate a local download path stays within the target directory
fn validate_local_path(local_dir: &str, filename: &str) -> Result<String> {
    if filename.contains('\0') || filename.contains('/') || filename.contains('\\') {
        return Err(anyhow!("invalid filename: {}", filename));
    }
    if filename == ".." || filename == "." {
        return Err(anyhow!("invalid filename: {}", filename));
    }
    let local_path = format!("{}/{}", local_dir.trim_end_matches('/'), filename);
    Ok(local_path)
}

fn emit_event<R: Runtime>(app: &AppHandle<R>, _session_id: &str, event: SftpEvent) {
    let _ = app.emit("sftp-event", event);
}

/// SFTP client handler with host key verification.
struct SftpClientHandler {
    host: String,
    port: u16,
}

#[async_trait]
impl Handler for SftpClientHandler {
    type Error = russh::Error;

    fn check_server_key(
        &mut self,
        server_public_key: &ssh_key::PublicKey,
    ) -> impl std::future::Future<Output = Result<bool, Self::Error>> + Send {
        let host = self.host.clone();
        let port = self.port;

        async move {
            match russh::keys::known_hosts::check_known_hosts(&host, port, server_public_key) {
                Ok(true) => {
                    // Key matches known_hosts, accept
                    Ok(true)
                }
                Ok(false) => {
                    // Unknown host - reject for security (user must first connect via SSH terminal)
                    eprintln!("Rejected: unknown host key for {}:{}", host, port);
                    Ok(false)
                }
                Err(e) => {
                    // Key changed - REJECT connection (MITM risk!)
                    eprintln!("SECURITY WARNING: Host key changed for {}:{} - {}", host, port, e);
                    Ok(false)
                }
            }
        }
    }
}

//! SSH session manager for NovaTerm.
//!
//! Provides secure SSH connections with host key verification via known_hosts.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use anyhow::{anyhow, Context, Result};
use async_trait::async_trait;
use russh::client::Handler;
use russh::keys::ssh_key;
use russh::{ChannelMsg, Disconnect};
use tokio::sync::mpsc::{self, UnboundedReceiver, UnboundedSender};
use tokio::sync::RwLock;
use tokio::task::JoinHandle;
use tokio::time::{timeout, Duration};

use tauri::{AppHandle, Emitter, Runtime};

/// Authentication configuration for SSH connection.
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AuthConfig {
    Password { password: String },
    Key { private_key_path: String, passphrase: Option<String> },
}

/// SSH session configuration.
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SSHConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth: AuthConfig,
}

/// Commands sent to the SSH session worker.
#[derive(Debug)]
pub enum SessionCommand {
    /// Send raw bytes to the PTY.
    Input(Vec<u8>),
    /// Resize the terminal.
    Resize(u32, u32),
    /// Disconnect the session.
    Close,
}

/// Events emitted from SSH session to frontend.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SessionEvent {
    /// Connection established.
    Connected { session_id: String },
    /// Output data from remote.
    Output { session_id: String, data: String },
    /// Connection closed.
    Closed { session_id: String, reason: String },
    /// Error occurred.
    Error { session_id: String, message: String },
    /// Host key verification needed.
    HostKeyUnknown {
        session_id: String,
        host: String,
        fingerprint: String,
    },
}

/// Handle to an active SSH session.
#[allow(dead_code)]
pub struct SessionHandle {
    pub session_id: String,
    pub commands: UnboundedSender<SessionCommand>,
    pub join: JoinHandle<Result<()>>,
}

impl SessionHandle {
    pub fn send(&self, bytes: Vec<u8>) -> Result<()> {
        self.commands
            .send(SessionCommand::Input(bytes))
            .map_err(|_| anyhow!("session closed"))
    }

    pub fn resize(&self, cols: u32, rows: u32) -> Result<()> {
        self.commands
            .send(SessionCommand::Resize(cols, rows))
            .map_err(|_| anyhow!("session closed"))
    }

    pub fn close(&self) -> Result<()> {
        self.commands
            .send(SessionCommand::Close)
            .map_err(|_| anyhow!("session closed"))
    }
}

/// Global SSH session manager.
pub struct SSHManager {
    sessions: Arc<RwLock<HashMap<String, SessionHandle>>>,
}

impl SSHManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Generate fingerprint for a public key (SHA256 format).
    #[allow(dead_code)]
    fn fingerprint(key_bytes: &[u8]) -> String {
        use sha2::{Sha256, Digest};
        let hash = Sha256::digest(key_bytes);
        format!("SHA256:{}", base64::Engine::encode(&base64::engine::general_purpose::STANDARD_NO_PAD, &hash))
    }

    /// Spawn a new SSH session.
    pub async fn connect<R: Runtime>(
        &self,
        app: AppHandle<R>,
        config: SSHConfig,
        cols: u32,
        rows: u32,
    ) -> Result<String> {
        let session_id = uuid::Uuid::new_v4().to_string();
        let session_id_for_handle = session_id.clone();
        let session_id_for_forward = session_id.clone();
        let session_id_for_session = session_id.clone();
        let session_id_for_cleanup = session_id.clone();
        let session_id_for_error = session_id.clone();

        let (cmd_tx, cmd_rx) = mpsc::unbounded_channel::<SessionCommand>();
        let (evt_tx, evt_rx) = mpsc::unbounded_channel::<SessionEvent>();

        // Forward events to frontend
        let app_for_forward = app.clone();
        tokio::spawn(forward_events(app_for_forward, session_id_for_forward, evt_rx));

        let sessions_ref = self.sessions.clone();
        let app_for_session = app.clone();
        let join = tokio::spawn(async move {
            let result = run_session(
                app_for_session,
                session_id_for_session,
                config,
                cmd_rx,
                evt_tx.clone(),
                cols,
                rows,
            ).await;

            // Remove session from manager when done
            sessions_ref.write().await.remove(&session_id_for_cleanup);

            if let Err(e) = &result {
                let _ = evt_tx.send(SessionEvent::Error {
                    session_id: session_id_for_error,
                    message: format!("{:#}", e),
                });
            }

            result
        });

        let handle = SessionHandle {
            session_id: session_id_for_handle.clone(),
            commands: cmd_tx,
            join,
        };

        self.sessions.write().await.insert(session_id_for_handle.clone(), handle);

        Ok(session_id_for_handle)
    }

    /// Disconnect a session.
    pub async fn disconnect(&self, session_id: &str) -> Result<()> {
        let sessions = self.sessions.read().await;
        if let Some(handle) = sessions.get(session_id) {
            handle.close()?;
        }
        drop(sessions);

        self.sessions.write().await.remove(session_id);
        Ok(())
    }

    /// Send data to a session.
    pub async fn send_data(&self, session_id: &str, data: Vec<u8>) -> Result<()> {
        let sessions = self.sessions.read().await;
        if let Some(handle) = sessions.get(session_id) {
            handle.send(data)?
        } else {
            return Err(anyhow!("session not found: {}", session_id));
        }
        Ok(())
    }

    /// Resize a session terminal.
    pub async fn resize(&self, session_id: &str, cols: u32, rows: u32) -> Result<()> {
        let sessions = self.sessions.read().await;
        if let Some(handle) = sessions.get(session_id) {
            handle.resize(cols, rows)?
        } else {
            return Err(anyhow!("session not found: {}", session_id));
        }
        Ok(())
    }

    /// Accept an unknown host key (placeholder for future implementation).
    pub async fn accept_host_key(&self, _session_id: &str) -> Result<()> {
        // TODO: Implement proper known_hosts update
        Ok(())
    }
}

impl Default for SSHManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Forward events from session to frontend via Tauri event system.
async fn forward_events<R: Runtime>(
    app: AppHandle<R>,
    _session_id: String,
    mut events: UnboundedReceiver<SessionEvent>,
) {
    while let Some(event) = events.recv().await {
        let _ = app.emit("ssh-event", event);
    }
}

/// Run an SSH session worker.
async fn run_session<R: Runtime>(
    _app: AppHandle<R>,
    session_id: String,
    config: SSHConfig,
    mut commands: UnboundedReceiver<SessionCommand>,
    events: UnboundedSender<SessionEvent>,
    initial_cols: u32,
    initial_rows: u32,
) -> Result<()> {
    // Create SSH client config
    let ssh_config = Arc::new(russh::client::Config {
        inactivity_timeout: Some(std::time::Duration::from_secs(600)),
        ..<_>::default()
    });

    // Create handler with host key verification
    let handler = ClientHandler {
        host: config.host.clone(),
        port: config.port,
        events: events.clone(),
        session_id: session_id.clone(),
    };

    let addr = format!("{}:{}", config.host, config.port);

    // Connect to server with 15 second timeout
    let connect_future = russh::client::connect(ssh_config, addr.as_str(), handler);
    let mut handle = timeout(Duration::from_secs(15), connect_future)
        .await
        .with_context(|| format!("connection timeout to {}", addr))?
        .with_context(|| format!("connection failed to {}", addr))?;

    // Authenticate
    let auth_result = match &config.auth {
        AuthConfig::Password { password } => {
            handle
                .authenticate_password(&config.username, password)
                .await
                .context("password authentication failed")?
        }
        AuthConfig::Key { private_key_path, passphrase } => {
            // Load private key from file
            let key_path = PathBuf::from(private_key_path);
            if !key_path.exists() {
                return Err(anyhow!("private key file not found: {}", private_key_path));
            }

            let key_content = std::fs::read_to_string(&key_path)
                .with_context(|| format!("failed to read key file {}", private_key_path))?;

            // Parse the private key, using passphrase if provided
            let keypair = russh::keys::decode_secret_key(
                &key_content,
                passphrase.as_deref(),
            ).context("failed to parse private key")?;

            // Use PrivateKeyWithHashAlg for authentication
            let key_with_hash = russh::keys::PrivateKeyWithHashAlg::new(Arc::new(keypair), None);

            handle
                .authenticate_publickey(&config.username, key_with_hash)
                .await
                .context("public key authentication failed")?
        }
    };

    // Check authentication result
    let authed = matches!(auth_result, russh::client::AuthResult::Success);

    if !authed {
        let _ = events.send(SessionEvent::Error {
            session_id: session_id.clone(),
            message: "authentication failed".into(),
        });
        let _ = handle
            .disconnect(Disconnect::ByApplication, "auth failed", "")
            .await;
        return Err(anyhow!("authentication failed"));
    }

    // Open PTY session
    let mut channel = handle
        .channel_open_session()
        .await
        .context("failed to open session channel")?;

    channel
        .request_pty(
            true,
            "xterm-256color",
            initial_cols,
            initial_rows,
            0,
            0,
            &[],
        )
        .await
        .context("failed to request PTY")?;

    channel.request_shell(true).await.context("failed to request shell")?;

    // Notify frontend of successful connection
    let _ = events.send(SessionEvent::Connected { session_id: session_id.clone() });

    // Main event loop
    loop {
        tokio::select! {
            cmd = commands.recv() => {
                match cmd {
                    Some(SessionCommand::Input(bytes)) => {
                        if let Err(err) = channel.data(&bytes[..]).await {
                            let _ = events.send(SessionEvent::Error {
                                session_id: session_id.clone(),
                                message: format!("write failed: {}", err),
                            });
                            break;
                        }
                    }
                    Some(SessionCommand::Resize(cols, rows)) => {
                        let _ = channel.window_change(cols, rows, 0, 0).await;
                    }
                    Some(SessionCommand::Close) | None => {
                        let _ = channel.eof().await;
                        break;
                    }
                }
            }
            msg = channel.wait() => {
                match msg {
                    Some(ChannelMsg::Data { data }) => {
                        let text = String::from_utf8_lossy(&data).into_owned();
                        let _ = events.send(SessionEvent::Output {
                            session_id: session_id.clone(),
                            data: text,
                        });
                    }
                    Some(ChannelMsg::ExtendedData { data, ext: _ }) => {
                        let text = String::from_utf8_lossy(&data).into_owned();
                        let _ = events.send(SessionEvent::Output {
                            session_id: session_id.clone(),
                            data: text,
                        });
                    }
                    Some(ChannelMsg::ExitStatus { exit_status }) => {
                        let _ = events.send(SessionEvent::Closed {
                            session_id: session_id.clone(),
                            reason: format!("remote process exited (code {})", exit_status),
                        });
                    }
                    Some(ChannelMsg::Close) | None => {
                        break;
                    }
                    Some(ChannelMsg::Signal { signal: _ }) => {
                        // Handle signal if needed
                    }
                    _ => {}
                }
            }
        }
    }

    let _ = handle
        .disconnect(Disconnect::ByApplication, "bye", "")
        .await;

    let _ = events.send(SessionEvent::Closed {
        session_id: session_id.clone(),
        reason: "connection closed".into(),
    });

    Ok(())
}

/// Client handler with host key verification.
struct ClientHandler {
    host: String,
    #[allow(dead_code)]
    port: u16,  // reserved for future known_hosts per-port lookups
    events: UnboundedSender<SessionEvent>,
    session_id: String,
}

#[async_trait]
impl Handler for ClientHandler {
    type Error = russh::Error;

    fn check_server_key(
        &mut self,
        server_public_key: &ssh_key::PublicKey,
    ) -> impl std::future::Future<Output = Result<bool, Self::Error>> + Send {
        // Build fingerprint string
        let fingerprint = server_public_key
            .fingerprint(Default::default())
            .to_string();

        // Check against known_hosts
        let known = russh::keys::known_hosts::check_known_hosts(
            &self.host,
            self.port,
            server_public_key,
        );

        let accepted = match known {
            Ok(true) => {
                // Key is known and matches — accept silently
                true
            }
            Ok(false) => {
                // Unknown host — emit event so frontend can prompt user
                let _ = self.events.send(SessionEvent::HostKeyUnknown {
                    session_id: self.session_id.clone(),
                    host: self.host.clone(),
                    fingerprint: fingerprint.clone(),
                });
                // Accept for now (frontend confirm flow TBD)
                true
            }
            Err(russh::keys::Error::KeyChanged { line }) => {
                // Key changed! Emit warning — possible MITM attack
                let _ = self.events.send(SessionEvent::Error {
                    session_id: self.session_id.clone(),
                    message: format!(
                        "⚠️ Host key changed for {}:{} (known_hosts line {}). Possible MITM attack!",
                        self.host, self.port, line
                    ),
                });
                let _ = self.events.send(SessionEvent::HostKeyUnknown {
                    session_id: self.session_id.clone(),
                    host: self.host.clone(),
                    fingerprint: fingerprint.clone(),
                });
                // Reject on key change — safer than silent accept
                false
            }
            Err(_) => {
                // Some other error reading known_hosts — treat as unknown
                let _ = self.events.send(SessionEvent::HostKeyUnknown {
                    session_id: self.session_id.clone(),
                    host: self.host.clone(),
                    fingerprint: fingerprint.clone(),
                });
                true
            }
        };

        async move { Ok(accepted) }
    }
}
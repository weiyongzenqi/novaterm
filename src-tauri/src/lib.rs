mod commands;
mod config;
mod sftp;
mod ssh;

use sftp::SftpManager;
use ssh::SSHManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(SSHManager::new())
        .manage(SftpManager::new())
        .invoke_handler(tauri::generate_handler![
            commands::ssh_connect,
            commands::ssh_disconnect,
            commands::ssh_send_data,
            commands::ssh_resize,
            commands::ssh_accept_host_key,
            commands::sftp_connect,
            commands::sftp_disconnect,
            commands::sftp_list_dir,
            commands::sftp_download,
            commands::sftp_upload,
            commands::sftp_delete,
            commands::sftp_mkdir,
            commands::load_config,
            commands::save_config,
            commands::import_sessions,
            commands::export_sessions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
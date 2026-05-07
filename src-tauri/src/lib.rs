mod commands;
mod error;
mod s3;
mod state;
mod storage;
mod transfer_emit;

use commands::{bucket, connection, download, object_ops, upload};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                tracing_subscriber::EnvFilter::new("info")
            }),
        )
        .try_init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(state::AppState::default())
        .invoke_handler(tauri::generate_handler![
            connection::list_account_buckets,
            connection::bulk_add_connections,
            connection::add_connection,
            connection::list_connections,
            connection::remove_connection,
            connection::activate_connection,
            connection::update_connection,
            connection::duplicate_connection,
            connection::check_connection_health,
            bucket::list_files,
            bucket::delete_file,
            bucket::create_folder,
            bucket::get_presigned_url,
            upload::upload_file,
            upload::collect_upload_candidates,
            download::download_file,
            object_ops::move_object,
            object_ops::delete_objects,
            object_ops::delete_prefix_recursive,
            object_ops::duplicate_object,
            object_ops::open_object,
            object_ops::download_as_zip,
            object_ops::list_file_versions,
            object_ops::download_file_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

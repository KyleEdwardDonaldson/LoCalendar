mod licensing;

use licensing::{verify_license_token, LicenseStatus};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn verify_license(token: String) -> LicenseStatus {
    verify_license_token(&token)
}

#[cfg(debug_assertions)]
#[tauri::command]
fn generate_demo_license(email: String) -> String {
    licensing::generate_demo_license(&email)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(debug_assertions)]
    let handler = tauri::generate_handler![greet, verify_license, generate_demo_license];
    
    #[cfg(not(debug_assertions))]
    let handler = tauri::generate_handler![greet, verify_license];
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(handler)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

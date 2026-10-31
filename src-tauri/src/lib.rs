// LowCor desktop: la finestra con l'interfaccia React. Quello che il browser non sa fare
// (file su disco, notifiche, rete locale) arriva qui come comandi Tauri sottili:
// validano, delegano a un modulo testabile e restituiscono errori da mostrare all'utente.
mod storage;

use std::path::PathBuf;

use tauri::{AppHandle, Manager};

// I dati stanno in <cartella dati dell'utente>/lowcor: ~/.local/share/lowcor su Linux,
// %APPDATA%\lowcor su Windows. Un nome corto, facile da trovare e da copiare a mano.
fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .data_dir()
        .map(|dir| dir.join("lowcor"))
        .map_err(|_| "Non trovo la cartella dei dati".to_string())
}

#[tauri::command]
fn load_state(app: AppHandle) -> Result<storage::Stored, String> {
    storage::load(&data_dir(&app)?).map_err(|e| format!("Non riesco a leggere i dati: {e}"))
}

#[tauri::command]
fn save_state(app: AppHandle, json: String) -> Result<(), String> {
    storage::save_data(&data_dir(&app)?, &json)
}

#[tauri::command]
fn save_background(app: AppHandle, data_url: Option<String>) -> Result<(), String> {
    storage::save_background(&data_dir(&app)?, data_url.as_deref())
}

#[tauri::command]
fn clear_state(app: AppHandle) -> Result<(), String> {
    storage::clear(&data_dir(&app)?).map_err(|e| format!("Non riesco a cancellare i dati: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Richieste HTTP dal lato Rust: Ollama e i calendari .ics non rispondono all'origine dell'app
        // (CORS), il plugin sì. Gli indirizzi permessi sono in capabilities/default.json.
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            save_background,
            clear_state
        ])
        .run(tauri::generate_context!())
        .expect("LowCor non è riuscito ad avviarsi");
}

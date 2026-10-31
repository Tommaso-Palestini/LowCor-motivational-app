// Salvataggio su file: data.json (tutto lo stato) e background.txt (lo sfondo, una data URL).
// Ogni scrittura va prima in un file temporaneo e poi prende il posto di quello vero con un rename:
// se il computer si spegne a metà resta la versione precedente, mai un file troncato.
use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

pub const DATA_FILE: &str = "data.json";
pub const BACKGROUND_FILE: &str = "background.txt";

#[derive(Debug, Default, Serialize, PartialEq)]
pub struct Stored {
    pub data: Option<String>,
    pub background: Option<String>,
}

pub fn write_atomic(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let dir = path
        .parent()
        .ok_or_else(|| io::Error::other("percorso senza cartella"))?;
    fs::create_dir_all(dir)?;
    let tmp = path.with_extension("tmp");
    {
        let mut file = File::create(&tmp)?;
        file.write_all(bytes)?;
        file.sync_all()?;
    }
    fs::rename(&tmp, path)
}

fn read_optional(path: &Path) -> io::Result<Option<String>> {
    match fs::read_to_string(path) {
        Ok(text) => Ok(Some(text)),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error),
    }
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

// Legge quello che c'è. Un data.json che non è JSON valido non viene mai sovrascritto:
// si sposta in data.corrotto-<secondi>.json e l'app riparte come se non ci fosse.
pub fn load(dir: &Path) -> io::Result<Stored> {
    let data_path = dir.join(DATA_FILE);
    let mut data = read_optional(&data_path)?;
    if let Some(text) = &data
        && serde_json::from_str::<serde_json::Value>(text).is_err()
    {
        fs::rename(&data_path, dir.join(format!("data.corrotto-{}.json", now_secs())))?;
        data = None;
    }
    let background = read_optional(&dir.join(BACKGROUND_FILE))?;
    Ok(Stored { data, background })
}

pub fn save_data(dir: &Path, json: &str) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(json).map_err(|_| "Dati non validi: non li salvo".to_string())?;
    write_atomic(&dir.join(DATA_FILE), json.as_bytes()).map_err(|e| format!("Non riesco a salvare i dati: {e}"))
}

pub fn save_background(dir: &Path, data_url: Option<&str>) -> Result<(), String> {
    let path = dir.join(BACKGROUND_FILE);
    match data_url {
        Some(url) if url.starts_with("data:image/") => {
            write_atomic(&path, url.as_bytes()).map_err(|e| format!("Non riesco a salvare lo sfondo: {e}"))
        }
        Some(_) => Err("Lo sfondo deve essere un'immagine".into()),
        None => remove_if_exists(&path).map_err(|e| e.to_string()),
    }
}

fn remove_if_exists(path: &PathBuf) -> io::Result<()> {
    match fs::remove_file(path) {
        Err(error) if error.kind() != io::ErrorKind::NotFound => Err(error),
        _ => Ok(()),
    }
}

// Diritto alla cancellazione: via dati e sfondo. Le copie corrotte messe da parte restano
// (sono dell'utente, magari vuole recuperarle a mano).
pub fn clear(dir: &Path) -> io::Result<()> {
    remove_if_exists(&dir.join(DATA_FILE))?;
    remove_if_exists(&dir.join(BACKGROUND_FILE))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("lowcor-test-{name}-{}-{}", std::process::id(), now_secs()));
        let _ = fs::remove_dir_all(&dir);
        dir
    }

    #[test]
    fn cartella_vuota_niente_dati() {
        let dir = temp_dir("vuota");
        assert_eq!(load(&dir).unwrap(), Stored::default());
    }

    #[test]
    fn salva_e_rilegge() {
        let dir = temp_dir("salva");
        save_data(&dir, r#"{"aura":3}"#).unwrap();
        save_background(&dir, Some("data:image/png;base64,AA")).unwrap();
        let stored = load(&dir).unwrap();
        assert_eq!(stored.data.as_deref(), Some(r#"{"aura":3}"#));
        assert_eq!(stored.background.as_deref(), Some("data:image/png;base64,AA"));
        assert!(!dir.join("data.tmp").exists());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rifiuta_json_non_valido_e_lascia_il_file_com_era() {
        let dir = temp_dir("rifiuta");
        save_data(&dir, r#"{"aura":1}"#).unwrap();
        assert!(save_data(&dir, "{rotto").is_err());
        assert_eq!(load(&dir).unwrap().data.as_deref(), Some(r#"{"aura":1}"#));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn file_corrotto_messo_da_parte() {
        let dir = temp_dir("corrotto");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join(DATA_FILE), "{troncato").unwrap();
        assert_eq!(load(&dir).unwrap().data, None);
        let kept: Vec<_> = fs::read_dir(&dir)
            .unwrap()
            .filter_map(|entry| entry.ok()?.file_name().into_string().ok())
            .filter(|name| name.starts_with("data.corrotto-"))
            .collect();
        assert_eq!(kept.len(), 1);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn sfondo_solo_immagini_e_si_puo_togliere() {
        let dir = temp_dir("sfondo");
        assert!(save_background(&dir, Some("javascript:alert(1)")).is_err());
        save_background(&dir, Some("data:image/jpeg;base64,AA")).unwrap();
        save_background(&dir, None).unwrap();
        assert_eq!(load(&dir).unwrap().background, None);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn clear_cancella_dati_e_sfondo() {
        let dir = temp_dir("clear");
        save_data(&dir, "{}").unwrap();
        save_background(&dir, Some("data:image/png;base64,AA")).unwrap();
        clear(&dir).unwrap();
        clear(&dir).unwrap();
        assert_eq!(load(&dir).unwrap(), Stored::default());
        fs::remove_dir_all(dir).unwrap();
    }
}

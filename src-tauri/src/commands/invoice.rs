use base64::Engine;
use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub async fn copy_file_to_workspace(
    source_path: String,
    workspace_dir: String,
) -> Result<String, String> {
    let source = PathBuf::from(&source_path);
    let workspace = PathBuf::from(&workspace_dir);

    if !workspace.exists() {
        fs::create_dir_all(&workspace).map_err(|e| format!("Failed to create dir: {}", e))?;
    }

    // Add timestamp to avoid name conflicts
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let ext = source.extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default();
    let stem = source.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
    let new_name = format!("{}_{}.{}", stem, timestamp, ext);

    let dest = workspace.join(&new_name);
    fs::copy(&source, &dest).map_err(|e| format!("Failed to copy file: {}", e))?;

    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn read_file_as_base64(file_path: String) -> Result<String, String> {
    let data = fs::read(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&data))
}

#[tauri::command]
pub async fn ensure_dir(dir_path: String) -> Result<(), String> {
    fs::create_dir_all(&dir_path).map_err(|e| format!("Failed to create dir: {}", e))?;
    Ok(())
}

#[derive(serde::Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[tauri::command]
pub async fn list_dir(dir_path: String) -> Result<Vec<FileEntry>, String> {
    let dir = PathBuf::from(&dir_path);
    if !dir.exists() || !dir.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    let mut entries: Vec<FileEntry> = Vec::new();
    let read_dir = fs::read_dir(&dir).map_err(|e| format!("Failed to read dir: {}", e))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry.metadata().map_err(|e| format!("Failed to read metadata: {}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') {
            continue;
        }

        entries.push(FileEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
        });
    }

    entries.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else if a.is_dir {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });

    Ok(entries)
}

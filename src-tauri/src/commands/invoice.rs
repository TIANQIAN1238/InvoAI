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

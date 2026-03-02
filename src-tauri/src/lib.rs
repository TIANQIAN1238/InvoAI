mod commands;

use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create invoices table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS invoices (
                    id INTEGER PRIMARY KEY AUTO_INCREMENT,
                    invoice_number VARCHAR(50) DEFAULT '',
                    invoice_code VARCHAR(50) DEFAULT '',
                    invoice_date DATE NULL,
                    amount DECIMAL(12, 2) DEFAULT 0,
                    tax_amount DECIMAL(12, 2) DEFAULT 0,
                    total_amount DECIMAL(12, 2) DEFAULT 0,
                    seller_name VARCHAR(255) DEFAULT '',
                    buyer_name VARCHAR(255) DEFAULT '',
                    invoice_type VARCHAR(50) DEFAULT '',
                    file_path TEXT NOT NULL,
                    file_name VARCHAR(255) DEFAULT '',
                    remarks TEXT,
                    raw_ocr_result TEXT,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                );
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create indexes",
            sql: r#"
                CREATE INDEX idx_invoice_date ON invoices(invoice_date);
                CREATE INDEX idx_seller_name ON invoices(seller_name);
                CREATE INDEX idx_buyer_name ON invoices(buyer_name);
                CREATE INDEX idx_status ON invoices(status);
            "#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("mysql://root:root@localhost/invoice_db", migrations)
                .build(),
        )
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ai::chat_stream,
            commands::ai::recognize_invoice,
            commands::invoice::copy_file_to_workspace,
            commands::invoice::read_file_as_base64,
            commands::invoice::ensure_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

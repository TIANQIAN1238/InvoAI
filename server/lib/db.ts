import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL || 'mysql://root:root@localhost:4000/invoice_db';
    pool = mysql.createPool({
      uri: url,
      waitForConnections: true,
      connectionLimit: 10,
      ssl: url.includes('tidbcloud.com') ? { rejectUnauthorized: true } : undefined,
    });
  }
  return pool;
}

export async function query<T = unknown>(sql: string, params?: unknown[]): Promise<T> {
  const p = getPool();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows] = await p.execute(sql, params as any);
  return rows as T;
}

export async function execute(sql: string, params?: unknown[]): Promise<mysql.ResultSetHeader> {
  const p = getPool();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result] = await p.execute(sql, params as any);
  return result as mysql.ResultSetHeader;
}

// 初始化数据库表
export async function initDatabase(): Promise<void> {
  const p = getPool();

  await p.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(100) DEFAULT '',
      balance DECIMAL(10, 4) DEFAULT 5.0000,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await p.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
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
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_date (invoice_date)
    )
  `);

  await p.execute(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      model VARCHAR(100),
      prompt_tokens INT DEFAULT 0,
      completion_tokens INT DEFAULT 0,
      cost DECIMAL(10, 6) DEFAULT 0,
      endpoint VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id)
    )
  `);
}

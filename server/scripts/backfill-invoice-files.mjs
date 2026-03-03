import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

function parseEnv(content) {
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

function inferMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.bmp':
      return 'image/bmp';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

async function loadDbConfig() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.resolve(__dirname, '..', '.env.local');
  const envRaw = await fs.readFile(envPath, 'utf8');
  const env = parseEnv(envRaw);
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in server/.env.local');
  }

  const u = new URL(databaseUrl);
  const sslParam = u.searchParams.get('ssl');
  let ssl = undefined;
  if (sslParam) {
    try {
      ssl = JSON.parse(sslParam);
    } catch {
      ssl = { rejectUnauthorized: true };
    }
  }

  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
    ssl,
  };
}

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, '..', '..');
  const reportsDir = path.join(repoRoot, 'reports');
  await fs.mkdir(reportsDir, { recursive: true });

  const config = await loadDbConfig();
  const conn = await mysql.createConnection(config);

  const [rows] = await conn.query(
    `SELECT i.id, i.file_path, i.file_name
     FROM invoices i
     LEFT JOIN invoice_files f ON f.invoice_id = i.id
     WHERE f.invoice_id IS NULL`
  );

  const reportRows = [];
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const id = Number(row.id);
    const filePath = String(row.file_path || '');
    const fileName = String(row.file_name || '');

    if (!filePath || filePath.startsWith('web:')) {
      skipped += 1;
      reportRows.push([id, filePath, fileName, 'SKIPPED', 'non-local path']);
      continue;
    }

    try {
      const data = await fs.readFile(filePath);
      const mimeType = inferMimeType(fileName || filePath);
      await conn.execute(
        'INSERT INTO invoice_files (invoice_id, mime_type, file_data) VALUES (?, ?, ?)',
        [id, mimeType, data]
      );
      inserted += 1;
      reportRows.push([id, filePath, fileName, 'INSERTED', `bytes=${data.length}`]);
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message.replace(/\s+/g, ' ') : 'unknown';
      reportRows.push([id, filePath, fileName, 'FAILED', msg]);
    }
  }

  await conn.end();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportsDir, `backfill-invoice-files-${timestamp}.csv`);
  const header = 'invoice_id,file_path,file_name,status,note\n';
  const body = reportRows
    .map((r) => `${r[0]},"${String(r[1]).replace(/"/g, '""')}","${String(r[2]).replace(/"/g, '""')}",${r[3]},"${String(r[4]).replace(/"/g, '""')}"`)
    .join('\n');
  await fs.writeFile(reportPath, `${header}${body}${body ? '\n' : ''}`, 'utf8');

  console.log(
    JSON.stringify(
      {
        missingBefore: rows.length,
        inserted,
        skipped,
        failed,
        reportPath,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/* =====================================================================
 *  Import 11 detailed models into Supabase public.smed_docs (coll='models').
 *
 *  Chạy:  node supabase/import-models.mjs
 *  Cần MỘT trong hai loại quyền (anon key KHÔNG đủ để DELETE):
 *    A) SUPABASE_ACCESS_TOKEN=sbp_…  (.env) — Management API
 *    B) SUPABASE_DB_URL=postgresql://…     — Postgres (cần `npm install pg`)
 *  Hoặc dán supabase/import-models.sql vào SQL Editor (cách C).
 *
 *  Idempotent: chạy lại không trùng lặp; xóa model cũ ngoài 11 mã.
 * ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';

const here = import.meta.dirname;
const root = path.join(here, '..');
const sql = fs.readFileSync(path.join(here, 'import-models.sql'), 'utf8');
const cfgSrc = fs.readFileSync(path.join(root, 'supabase-config.js'), 'utf8');
const projectUrl = ((cfgSrc.match(/url:\s*'([^']+)'/) || [])[1] || '').replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
const ref = (projectUrl.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i) || [])[1];

function readEnvFile(p) {
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const dotenv = readEnvFile(path.join(root, '.env'));
const token = process.env.SUPABASE_ACCESS_TOKEN || dotenv.SUPABASE_ACCESS_TOKEN || '';
const dbUrl = process.env.SUPABASE_DB_URL || dotenv.SUPABASE_DB_URL || '';

console.log(`Project: ${projectUrl} (ref ${ref})`);
console.log(`SQL: supabase/import-models.sql (${(sql.length / 1024).toFixed(1)} KB)\n`);

if (!token && !dbUrl) {
  console.log('Chưa có quyền ghi/xóa. Chọn một cách:\n');
  console.log('  A) Management API (khuyến nghị)');
  console.log('     1. https://supabase.com/dashboard/account/tokens → Generate new token');
  console.log('     2. Tạo .env: SUPABASE_ACCESS_TOKEN=sbp_…');
  console.log('     3. Chạy lại: node supabase/import-models.mjs\n');
  console.log('  B) Postgres (cần npm install pg)');
  console.log('     SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db.' + ref + '.supabase.co:5432/postgres\n');
  console.log('  C) Dán supabase/import-models.sql vào SQL Editor rồi Run.');
  process.exit(2);
}

let applied = false;
if (token) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (res.status === 200 || res.status === 201) { console.log('✔ Đã import 11 models qua Management API'); applied = true; }
  else { console.error(`✖ Management API HTTP ${res.status}: ${text.slice(0, 400)}`); }
} else {
  const pg = (await import('pg').catch(() => null))?.default;
  if (!pg) { console.error('✖ Chưa cài gói pg — chạy: npm install pg'); process.exit(1); }
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try { await client.connect(); await client.query(sql); console.log('✔ Đã import 11 models qua Postgres'); applied = true; }
  catch (e) { console.error('✖ SQL lỗi: ' + (e.message || e)); } finally { await client.end().catch(() => {}); }
}
process.exitCode = applied ? 0 : 1;

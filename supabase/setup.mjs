/* =====================================================================
 *  Tạo bảng + hàm + realtime + RLS trên Supabase, tự động.
 *
 *  Chạy:  node supabase/setup.mjs
 *
 *  Cần MỘT trong hai loại quyền (anon key KHÔNG đủ — nó không được tạo bảng):
 *
 *    A) Personal Access Token  (khuyến nghị)
 *       Supabase Dashboard → avatar góc phải → Access Tokens → Generate new token
 *       → đặt vào .env:   SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxx
 *
 *    B) Chuỗi kết nối Postgres
 *       Project Settings → Database → Connection string → URI
 *       → đặt vào .env:   SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres
 *       (đường này cần gói `pg`: npm install pg)
 *
 *  Nội dung SQL lấy từ supabase/schema.sql — một nguồn duy nhất, không chép tay.
 *  Chạy lại nhiều lần vô hại (idempotent).
 * ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';

const here = import.meta.dirname;
const root = path.join(here, '..');

/* ---------- Cấu hình project ---------- */
const cfgSrc = fs.readFileSync(path.join(root, 'supabase-config.js'), 'utf8');
const cfgUrl = (cfgSrc.match(/url:\s*'([^']+)'/) || [])[1] || '';
const anonKey = (cfgSrc.match(/anonKey:\s*'([^']+)'/) || [])[1] || '';
const projectUrl = cfgUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
const ref = (projectUrl.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i) || [])[1];

if (!ref) {
  console.error('✖ Không đọc được project ref từ supabase-config.js');
  process.exit(2);
}

/* ---------- .env (không cần thư viện ngoài) ---------- */
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

const sql = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');

const ok  = (m) => console.log('✔ ' + m);
const bad = (m) => console.log('✖ ' + m);

console.log(`Project: ${projectUrl}  (ref ${ref})`);
console.log(`Schema : supabase/schema.sql (${(sql.length / 1024).toFixed(1)} KB)\n`);

if (!token && !dbUrl) {
  console.log('Chưa có quyền tạo bảng. Chọn một cách:\n');
  console.log('  A) Personal Access Token (khuyến nghị)');
  console.log('     1. https://supabase.com/dashboard/account/tokens → Generate new token');
  console.log('     2. Tạo file .env ở thư mục gốc dự án:');
  console.log('          SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxx');
  console.log('     3. Chạy lại: node supabase/setup.mjs\n');
  console.log('  B) Chuỗi kết nối Postgres (cần npm install pg)');
  console.log('     Project Settings → Database → Connection string → URI');
  console.log('          SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db.' + ref + '.supabase.co:5432/postgres\n');
  console.log('  C) Không muốn dùng script: dán supabase/schema.sql vào');
  console.log(`     https://supabase.com/dashboard/project/${ref}/sql/new → Run\n`);
  process.exit(2);
}

/* ---------- Áp dụng ---------- */
async function applyViaManagementApi() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch { /* text */ }

  if (res.status !== 200 && res.status !== 201) {
    const hint = res.status === 401 ? 'token sai hoặc đã bị thu hồi'
               : res.status === 403 ? 'token thiếu quyền database_write'
               : res.status === 404 ? 'project ref không tồn tại hoặc token không thuộc tổ chức này'
               : body?.message || `HTTP ${res.status}`;
    bad('Management API: ' + hint);
    if (body?.message) console.log('  ' + body.message);
    return false;
  }
  ok('đã chạy schema.sql qua Management API');
  return true;
}

async function applyViaPostgres() {
  let pg;
  try {
    pg = (await import('pg')).default;
  } catch {
    bad('chưa cài gói pg — chạy: npm install pg   (hoặc dùng phương án A)');
    return false;
  }
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
  } catch (e) {
    bad('không kết nối được Postgres: ' + (e.message || e));
    console.log('  Kiểm tra mật khẩu trong SUPABASE_DB_URL (Project Settings → Database → Reset password nếu quên).');
    return false;
  }
  try {
    await client.query(sql);
    ok('đã chạy schema.sql qua Postgres');
    return true;
  } catch (e) {
    bad('SQL lỗi: ' + (e.message || e));
    if (e.position) console.log('  vị trí ký tự: ' + e.position);
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

const applied = token ? await applyViaManagementApi() : await applyViaPostgres();

if (!applied) {
  console.log('\nChưa tạo được bảng. Xem hướng dẫn ở trên hoặc dùng SQL Editor.');
  process.exitCode = 1;
} else {
  /* ---------- Kiểm tra ngay bằng anon key ---------- */
  console.log('\nKiểm tra bằng anon key…');
  try {
    const res = await fetch(`${projectUrl}/rest/v1/rpc/smed_selfcheck`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    const s = await res.json().catch(() => null);
    if (res.status === 200 && s) {
      s.table    ? ok('bảng smed_docs')            : bad('bảng smed_docs');
      s.patch    ? ok('hàm smed_patch()')          : bad('hàm smed_patch()');
      s.realtime ? ok('realtime publication')      : bad('realtime publication');
      s.rls      ? ok(`RLS + ${s.policies} policy`) : bad('RLS/policy');
    } else {
      bad(`smed_selfcheck trả HTTP ${res.status}: ${s?.message || ''}`);
      console.log('  (PostgREST có thể cần vài giây để nạp lại schema — chạy lại: node supabase/verify.mjs)');
    }
  } catch (e) {
    bad('không gọi được REST API: ' + (e.message || e));
  }

  console.log('\nBước tiếp theo: node supabase/verify.mjs   (kiểm tra merge + quyền ghi/xoá)');
}

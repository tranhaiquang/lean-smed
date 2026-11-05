/* =====================================================================
 *  Import danh sách nhân viên từ seed của SMED_App_standalone (1).html
 *  vào cấu hình hệ thống trên Supabase (doc smed/config).
 *
 *  - Parse demoUsers trực tiếp từ file HTML (giữ đúng dữ liệu gốc)
 *  - pinHash tính đúng thuật toán hashPin() của app:
 *      'sha256:' + SHA256('smed|' + userId + '|' + pin)   (pin = 1234)
 *  - Chèn THÊM vào config.users, không xóa/ghi đè user hiện có (idempotent)
 *  - Giữ nguyên isDemo:true như seed (làm dữ liệu demo, xóa được 1 bấm)
 *
 *  Chạy:  node tools/import-seed-users.mjs [đường-dẫn-file-html]
 * ===================================================================== */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = process.argv[2] || join(ROOT, 'SMED_App_standalone (1).html');
const URL_BASE = 'https://neotjnwkdjtxiafjbvhl.supabase.co';
const SCRATCH = process.env.TMPDIR || '/tmp';

/* ---------- hashPin y hệt app (supabase-config.js lấy key) ---------- */
function hashPin(userId, pin) {
  const txt = 'smed|' + userId + '|' + pin;
  return 'sha256:' + createHash('sha256').update(txt, 'utf8').digest('hex');
}

/* ---------- 1. anonKey từ supabase-config.js ---------- */
const cfgSrc = readFileSync(join(ROOT, 'supabase-config.js'), 'utf8');
const m = cfgSrc.match(/anonKey:\s*'([^']+)'/);
if (!m) { console.error('Không tìm thấy anonKey trong supabase-config.js'); process.exit(1); }
const KEY = m[1];
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

/* ---------- 2. Parse demoUsers từ file standalone ---------- */
const html = readFileSync(HTML, 'utf8');
const mm = html.match(/const\s+demoUsers\s*=\s*(\[[\s\S]*?\]);/);
if (!mm) { console.error('Không tìm thấy demoUsers trong ' + HTML); process.exit(1); }
const demoUsers = new Function('return ' + mm[1])();
if (!Array.isArray(demoUsers) || !demoUsers.length) { console.error('demoUsers rỗng'); process.exit(1); }
console.log('Parse được ' + demoUsers.length + ' người dùng từ seed:');
demoUsers.forEach(u => console.log('  ' + u[0] + ' | ' + u[1] + ' | ' + u[2] + ' | ' + u[3]));

/* ---------- 3. GET config hiện tại ---------- */
const getRes = await fetch(`${URL_BASE}/rest/v1/smed_docs?select=coll,id,data,updated_at&coll=eq.smed&id=eq.config`, { headers: H });
if (!getRes.ok) { console.error('GET config lỗi HTTP ' + getRes.status + ': ' + await getRes.text()); process.exit(1); }
const rows = await getRes.json();
if (!rows.length) { console.error('Chưa có doc smed/config — hãy khởi tạo hệ thống trong app trước.'); process.exit(1); }
const cfg = rows[0].data;
const existing = Array.isArray(cfg.users) ? cfg.users : [];
console.log('\nConfig hiện có: ' + existing.length + ' người dùng, site=' + (cfg.site?.name || '?') + ', chuyền=' + (cfg.lines || []).length);

/* ---------- 4. Dựng user mới đúng shape của seedDemo ---------- */
const byId = new Set(existing.map(u => u.id));
const byCode = new Set(existing.map(u => (u.code || '').toUpperCase()).filter(Boolean));
const added = [], skipped = [];
for (const [id, name, role, code, lines] of demoUsers) {
  if (byId.has(id)) { skipped.push(id + ' (đã có id)'); continue; }
  if (code && byCode.has(code.toUpperCase())) { skipped.push(id + ' (trùng mã NV ' + code + ')'); continue; }
  cfg.users.push({
    id, name, role, code,
    lines: lines && lines.length ? lines : ['*'],
    active: true,
    pinHash: hashPin(id, '1234'),
    isDemo: true,
    createdAt: Date.now(),
  });
  added.push({ id, name, role, code });
}
console.log('\nSẽ thêm ' + added.length + ' người dùng' + (skipped.length ? '; bỏ qua: ' + skipped.join(', ') : ''));
if (!added.length) { console.log('Không có gì thay đổi.'); process.exit(0); }

/* ---------- 5. PATCH config (ghi đè nguyên khối data) ---------- */
const nowIso = new Date().toISOString();
const patchRes = await fetch(`${URL_BASE}/rest/v1/smed_docs?coll=eq.smed&id=eq.config`, {
  method: 'PATCH',
  headers: { ...H, Prefer: 'return=representation' },
  body: JSON.stringify({ data: cfg, updated_at: nowIso }),
});
if (!patchRes.ok) {
  console.error('PATCH lỗi HTTP ' + patchRes.status + ': ' + await patchRes.text());
  process.exit(1);
}
console.log('PATCH config thành công.');

/* ---------- 6. Verify: GET lại và đối chiếu ---------- */
const vRes = await fetch(`${URL_BASE}/rest/v1/smed_docs?select=data&coll=eq.smed&id=eq.config`, { headers: H });
const vRows = await vRes.json();
const vCfg = vRows[0].data;
let ok = 0, fail = 0;
for (const u of added) {
  const x = (vCfg.users || []).find(y => y.id === u.id);
  const good = x && x.pinHash === hashPin(u.id, '1234') && x.isDemo === true;
  if (good) ok++; else { fail++; console.error('  THIẾU/SAI: ' + JSON.stringify(x || {})); }
}
console.log(`\nVerify: ${ok}/${added.length} người dùng đã vào Supabase đúng pinHash sha256 (PIN 1234), isDemo=true`);
console.log('Tổng users trong config sau import: ' + (vCfg.users || []).length);
const report = { at: nowIso, added, totalUsers: (vCfg.users || []).length, verified: ok, failed: fail };
writeFileSync(join(SCRATCH, 'import-seed-users-report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log('Report: ' + join(SCRATCH, 'import-seed-users-report.json'));
process.exit(fail ? 1 : 0);

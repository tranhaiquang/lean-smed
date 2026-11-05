/* =====================================================================
 *  Cập nhật danh sách nhân viên trên Supabase (doc smed/config)
 *  cho KHỚP với seed trong SMED_App_standalone (1).html — KHÔNG gắn tag Demo.
 *
 *  - Parse demoUsers trực tiếp từ file HTML (id/name/role/code/lines, PIN 1234)
 *  - pinHash = 'sha256:' + SHA256('smed|'+id+'|1234') — đúng thuật toán hashPin() của app
 *  - Thay thế toàn bộ config.users bằng 9 người dùng của seed (isDemo: không đặt)
 *  - Người dùng cũ KHÔNG bị xóa khỏi lịch sử: chuyển vào config.deletedUsers
 *    để changeover/audit cũ vẫn hiển thị đúng tên (đúng cơ chế userName() của app)
 *  - Sao lưu config đầy đủ ra file JSON trước khi ghi (hoàn tác được)
 *  - Ghi 1 dòng audit vào sme_docs (coll=auditlog, tháng hiện tại)
 *
 *  Chạy:  node tools/sync-users-from-seed.mjs [đường-dẫn-file-html]
 * ===================================================================== */
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = process.argv[2] || join(ROOT, 'SMED_App_standalone (1).html');
const URL_BASE = 'https://neotjnwkdjtxiafjbvhl.supabase.co';
const REASON = 'Cập nhật danh sách nhân viên theo seed SMED_App_standalone (bỏ tag Demo)';

/* ---------- hashPin y hệt app ---------- */
function hashPin(userId, pin) {
  const txt = 'smed|' + userId + '|' + pin;
  return 'sha256:' + createHash('sha256').update(txt, 'utf8').digest('hex');
}
const uid = (p = 'AU') => p + '-' + Date.now().toString(36).toUpperCase() + '-' + randomUUID().slice(0, 8).toUpperCase();

/* ---------- Supabase REST ---------- */
const cfgSrc = readFileSync(join(ROOT, 'supabase-config.js'), 'utf8');
const m = cfgSrc.match(/anonKey:\s*'([^']+)'/);
if (!m) { console.error('Không tìm thấy anonKey trong supabase-config.js'); process.exit(1); }
const H = { apikey: m[1], Authorization: `Bearer ${m[1]}`, 'Content-Type': 'application/json' };
async function get(path) {
  const r = await fetch(URL_BASE + '/rest/v1/smed_docs?select=' + path, { headers: H });
  if (!r.ok) throw new Error('GET ' + path + ' → HTTP ' + r.status + ': ' + await r.text());
  return r.json();
}
async function patchDoc(coll, id, data) {
  const r = await fetch(`${URL_BASE}/rest/v1/smed_docs?coll=eq.${coll}&id=eq.${id}`, {
    method: 'PATCH', headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(`PATCH ${coll}/${id} → HTTP ${r.status}: ` + await r.text());
}

/* ---------- 1. Parse demoUsers từ file standalone ---------- */
const html = readFileSync(HTML, 'utf8');
const mm = html.match(/const\s+demoUsers\s*=\s*(\[[\s\S]*?\]);/);
if (!mm) { console.error('Không tìm thấy demoUsers trong ' + HTML); process.exit(1); }
const demoUsers = new Function('return ' + mm[1])();
if (!demoUsers.length) { console.error('demoUsers rỗng'); process.exit(1); }
const seedUsers = demoUsers.map(([id, name, role, code, lines]) => ({
  id, name, role, code,
  lines: lines && lines.length ? lines : ['*'],
  active: true,
  pinHash: hashPin(id, '1234'),
  createdAt: Date.now(),
}));
console.log('Seed trong file (' + seedUsers.length + ' người dùng):');
seedUsers.forEach(u => console.log('  ' + u.id + ' | ' + u.name + ' | ' + u.role + ' | ' + u.code + ' | ' + (u.lines || []).join(',')));

/* ---------- 2. GET config hiện tại + SAO LƯU ---------- */
const rows = await get('coll,id,data&coll=eq.smed&id=eq.config');
if (!rows.length) { console.error('Chưa có doc smed/config.'); process.exit(1); }
const cfg = rows[0].data;
const oldUsers = Array.isArray(cfg.users) ? cfg.users : [];
console.log('\nConfig hiện tại: ' + oldUsers.length + ' người dùng, site=' + (cfg.site?.name || '?'));

const bkDir = join(ROOT, 'tools', 'backups');
mkdirSync(bkDir, { recursive: true });
const bkPath = join(bkDir, 'config-before-user-sync-' + Date.now() + '.json');
writeFileSync(bkPath, JSON.stringify({ at: new Date().toISOString(), note: 'backup trước khi sync users theo seed', data: cfg }, null, 2), 'utf8');
console.log('Đã sao lưu config: ' + bkPath);

/* ---------- 3. Users mới + người dùng cũ → deletedUsers (giữ tên trong lịch sử) ---------- */
const newById = new Map(seedUsers.map(u => [u.id, u]));
const removed = oldUsers.filter(u => !newById.has(u.id));
const kept = oldUsers.filter(u => newById.has(u.id));
const nowIso = new Date().toISOString();
const now = Date.now();
const deletedUsers = { ...(cfg.deletedUsers || {}) };
for (const u of removed) deletedUsers[u.id] = { name: u.name, code: u.code || '', role: u.role, by: 'system', at: now, reason: REASON };
console.log('Sẽ thay thế: bỏ ' + removed.length + ' người dùng cũ' + (kept.length ? ' (giữ/đè ' + kept.length + ' trùng id)' : '') + ' → ' + seedUsers.length + ' người dùng theo seed.');
if (!removed.length && kept.length === seedUsers.length) console.log('  (không có ai bị bỏ — danh sách giờ đã đúng seed)');

/* ---------- 4. PATCH config ---------- */
await patchDoc('smed', 'config', { ...cfg, users: seedUsers, deletedUsers });
console.log('PATCH config thành công.');

/* ---------- 5. Ghi audit (best-effort) ---------- */
try {
  const d = new Date(); const aId = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0');
  const ar = await get('coll,id,data&coll=eq.auditlog&id=eq.' + aId);
  const doc = ar[0] ? ar[0].data : { month: aId, entries: {} };
  const e = { id: uid(), at: now, by: 'system', byName: 'system · sync script', role: 'system',
    action: 'user.sync.seed', entity: 'config', field: 'users',
    before: { users: oldUsers.length }, after: { users: seedUsers.length, removedToDeletedUsers: removed.length }, reason: REASON };
  await patchDoc('auditlog', aId, { ...doc, entries: { ...(doc.entries || {}), [e.id]: e } });
  console.log('Đã ghi audit ' + aId + '/' + e.id);
} catch (err) { console.warn('Bỏ qua audit (không lỗi chính): ' + err.message); }

/* ---------- 6. Verify ---------- */
const vr = await get('data&coll=eq.smed&id=eq.config');
const v = vr[0].data;
let ok = 0, fail = 0;
for (const u of seedUsers) {
  const x = (v.users || []).find(y => y.id === u.id);
  const good = x && x.pinHash === u.pinHash && x.isDemo === undefined && x.active === true && x.role === u.role;
  good ? ok++ : (fail++, console.error('  SAI: ' + JSON.stringify(x)));
}
const anyDemo = (v.users || []).some(u => u.isDemo);
console.log(`\nVerify: ${ok}/${seedUsers.length} người dùng đã đúng (pinHash sha256, PIN 1234, không có tag Demo)`);
console.log('Tổng users: ' + (v.users || []).length + ' · còn isDemo: ' + (anyDemo ? 'CÓ (sai!)' : 'không'));
console.log('deletedUsers (giữ tên trong lịch sử): ' + Object.keys(v.deletedUsers || {}).length);
const roles = {};
(v.users || []).forEach(u => roles[u.role] = (roles[u.role] || 0) + 1);
console.log('Vai trò: ' + Object.entries(roles).map(([r, n]) => r + ':' + n).join(', ') + (roles.admin ? '' : '  ⚠ KHÔNG CÓ System Admin!'));
process.exit(fail || anyDemo ? 1 : 0);

/* =====================================================================
 *  Kiểm tra Supabase đã sẵn sàng cho SMED chưa.
 *
 *  Chạy:  node supabase/verify.mjs
 *
 *  Kiểm tra thật, không giả lập:
 *    1. kết nối + key (401 = sai key, 404 = chưa chạy schema)
 *    2. bảng smed_docs, RLS, policy, realtime publication
 *    3. RPC smed_patch: ghi 2 lần, đọc lại → phải merge đệ quy
 *       (đây là điều kiện để auditlog không mất entry cũ)
 *    4. quyền xoá
 *
 *  Ghi tạm 1 dòng coll='__selfcheck' rồi xoá; app không bao giờ đọc coll này.
 * ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';

const cfgSrc = fs.readFileSync(path.join(import.meta.dirname, '..', 'supabase-config.js'), 'utf8');
const pick = (k) => (cfgSrc.match(new RegExp(k + ":\\s*'([^']+)'")) || [])[1] || '';
const url = pick('url').replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
const key = pick('anonKey').trim();

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

let failed = 0;
const ok  = (m) => console.log('✔ ' + m);
const bad = (m) => { failed++; console.log('✖ ' + m); };

const explain = (r) => {
  const c = r.body?.code;
  if (r.status === 401) return 'key sai hoặc đã bị thu hồi';
  if (c === 'PGRST205' || c === '42P01') return 'chưa chạy supabase/schema.sql (thiếu bảng smed_docs)';
  if (c === 'PGRST202' || c === '42883') return 'chưa chạy schema.sql (thiếu hàm)';
  if (c === '42501') return 'RLS chặn — kiểm tra policy + grant trong schema.sql';
  return r.body?.message || `HTTP ${r.status}`;
};

async function call(pathname, init = {}) {
  const res = await fetch(url + pathname, { headers, ...init });
  const text = await res.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch { /* giữ nguyên text */ }
  return { status: res.status, body };
}

async function main() {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) || key.length < 40 || /YOUR[-_]/.test(url + key)) {
    console.error('✖ supabase-config.js chưa có url/anonKey hợp lệ.');
    failed++;
    return;
  }
  console.log(`Project: ${url}\n`);

  /* 1–2. Bảng + trạng thái cấu hình ----------------------------------- */
  const self = await call('/rest/v1/rpc/smed_selfcheck', { method: 'POST', body: '{}' });
  if (self.status !== 200) {
    bad('smed_selfcheck: ' + explain(self));
    console.error('\n→ Mở https://supabase.com/dashboard/project/' + url.split('//')[1].split('.')[0] +
                  '/sql/new và chạy toàn bộ supabase/schema.sql, sau đó chạy lại lệnh này.');
    return;
  }

  const s = self.body;
  s.table    ? ok('bảng public.smed_docs tồn tại')       : bad('thiếu bảng public.smed_docs');
  s.patch    ? ok('hàm smed_patch() tồn tại')            : bad('thiếu hàm smed_patch()');
  s.realtime ? ok('smed_docs đã ở publication realtime') : bad('chưa bật realtime → chạy lại mục 5 của schema.sql');
  s.rls      ? ok('RLS đang bật')                        : bad('RLS chưa bật');
  s.policies >= 4 ? ok(`có ${s.policies} policy`)         : bad(`chỉ có ${s.policies} policy (cần ≥4)`);
  if (typeof s.rows === 'number') console.log(`  dữ liệu hiện có: ${s.rows} document`);

  /* 3. Merge đệ quy qua RPC ------------------------------------------- */
  const patch = (p) => call('/rest/v1/rpc/smed_patch', {
    method: 'POST',
    body: JSON.stringify({ p_coll: '__selfcheck', p_id: 'merge', p_patch: p }),
  });

  let r = await patch({ a: 1, nested: { x: 1 } });
  (r.status === 204 || r.status === 200) ? ok('ghi lần 1 (a, nested.x)') : bad('ghi lần 1: ' + explain(r));

  r = await patch({ b: 2, nested: { y: 2 } });
  (r.status === 204 || r.status === 200) ? ok('ghi lần 2 (b, nested.y) — không ghi đè') : bad('ghi lần 2: ' + explain(r));

  const read = await call('/rest/v1/smed_docs?coll=eq.__selfcheck&id=eq.merge&select=data');
  const d = Array.isArray(read.body) ? read.body[0]?.data : null;
  if (d && d.a === 1 && d.b === 2 && d.nested?.x === 1 && d.nested?.y === 2) {
    ok('merge đệ quy đúng: {a, b, nested:{x, y}} đều còn');
  } else {
    bad('merge SAI — dữ liệu đọc lại: ' + JSON.stringify(d));
    console.log('  → auditlog sẽ mất entry cũ. Kiểm tra lại hàm smed_jsonb_merge / smed_patch.');
  }

  /* 4. Xoá ------------------------------------------------------------ */
  const del = await call('/rest/v1/smed_docs?coll=eq.__selfcheck&id=eq.merge', { method: 'DELETE' });
  if (del.status === 204 || del.status === 200) {
    ok('xoá được (đã dọn dòng kiểm tra)');
  } else {
    bad('không xoá được: ' + explain(del));
    console.log('  → còn 1 dòng coll=__selfcheck, xoá tay trong Table Editor.');
  }

  console.log(failed ? `\n✖ ${failed} mục chưa đạt.` : '\n✔ Supabase sẵn sàng. Mở index_public.html để kiểm tra giao diện.');
}

await main();
process.exitCode = failed ? 1 : 0;

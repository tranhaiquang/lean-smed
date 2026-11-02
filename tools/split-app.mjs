/* =====================================================================
 *  Tách file HTML một-khối thành nhiều file nguồn, mỗi trang 1 file.
 *
 *  Chạy:  node tools/split-app.mjs
 *         node tools/split-app.mjs --src index.html            (bản không Supabase)
 *         node tools/split-app.mjs --src index_supabase.html    (mặc định)
 *         node tools/split-app.mjs --force                      (ghi đè src/ đã sửa)
 *
 *  Nguyên tắc: CHÉP NGUYÊN BYTE, không sửa một ký tự nào trong code.
 *  Mỗi file là một đoạn dòng liên tiếp của khối <script> ứng dụng, theo
 *  đúng thứ tự cũ → ghép lại (join bằng '\n') phải bằng khối gốc 100%.
 *  Script tự kiểm tra điều đó trước khi ghi file.
 *
 *  Mốc cắt được nhận diện bằng NỘI DUNG DÒNG (lấy từ index.html), không
 *  phải số dòng tuyệt đối — nhờ vậy tách được cả index_supabase.html
 *  (nhiều hơn index.html 5 dòng) mà không phải sửa manifest.
 *
 *  Kết quả:
 *    src/**\/*.js        — mã nguồn đã tách
 *    src/README.md       — bản đồ file → dòng → nội dung
 *    index_split.html    — bản chạy được, nạp từng file bằng <script src>
 *                          (vẫn chứa seed dữ liệu thật: KHÔNG deploy)
 * ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const args = process.argv.slice(2);
const arg = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const REF  = path.join(ROOT, 'index.html');                                   // nguồn của các mốc cắt
const SRC  = path.join(ROOT, arg('--src', 'index_supabase.html'));            // file đem tách
const OUT  = path.join(ROOT, 'src');
const force = args.includes('--force');

/* Số dòng mốc trong index.html + tên file + nhãn.
 * Chỉ dùng để lấy NỘI DUNG dòng mốc; vị trí thật do tìm trong SRC. */
const MANIFEST = [
  ['src/core/i18n-rows.js',            'Từ điển dịch vi → en/ko (dữ liệu)',            285],
  ['src/core/constants.js',            'Hằng số: quyền, trạng thái, danh mục',          287],
  ['src/core/default-config.js',       'Cấu hình mặc định (Phụ lục A & B)',             371],
  ['src/core/utils.js',                'Tiện ích: id, format ngày/giờ, toast, ảnh',     434],
  ['src/core/store.js',                'Store: cloud (Supabase/Firestore) hoặc local',  502],
  ['src/core/session.js',              'Đăng nhập, PIN, phân quyền, phạm vi chuyền',    619],
  ['src/core/models.js',               'Tra cứu model / revision / standard / SOP',     663],
  ['src/core/compare.js',              'So sánh A/B giữa 2 revision',                   691],
  ['src/core/kpi.js',                  'KPI engine (mục 7)',                            719],
  ['src/core/alerts.js',               'Cảnh báo (mục 8)',                              800],
  ['src/core/i18n.js',                 'Bộ dịch giao diện + chọn ngôn ngữ',             846],
  ['src/core/workflow.js',             'Workflow changeover: checklist, gate, timer',   955],
  ['src/core/ui.js',                   'UI nguyên thuỷ: Icon, Pill, Field, Modal…',    1191],
  ['src/core/router.js',               'Router hash + xuất file + CSV/XLSX',           1283],
  ['src/core/charts.js',               'Biểu đồ SVG: Pareto, Gantt, Trend, HBars',     1319],
  ['src/core/nav.js',                  'Menu điều hướng',                              1379],

  ['src/pages/setup.js',               'Trang Khởi tạo (lần đầu) + Loader',            1392],
  ['src/pages/login.js',               'Trang Đăng nhập + Đổi PIN bắt buộc',           1428],
  ['src/pages/shell.js',               'Khung app: App, Shell, MobileShell, cảnh báo', 1472],
  ['src/components/co-filters.js',     'Bộ lọc + bảng changeover dùng chung',          1581],
  ['src/pages/dashboard.js',           'Trang Tổng quan (4.1)',                        1642],
  ['src/pages/changeovers.js',         'Trang danh sách Changeover',                   1700],
  ['src/pages/plan-form.js',           'Trang lập kế hoạch (4.2) — route #new',        1723],
  ['src/pages/changeover-detail.js',   'Trang chi tiết (4.3/4.4): overview, prep, so sánh', 1826],
  ['src/pages/tab-live.js',            'Tab Live changeover / bấm giờ (4.5)',          2012],
  ['src/pages/tab-quality.js',         'Tab Quality Gate (4.6)',                       2094],
  ['src/pages/tab-rampup.js',          'Tab Ramp-up (4.7)',                            2142],
  ['src/pages/tab-review.js',          'Tab Review / đóng + lịch sử',                  2174],
  ['src/pages/prep-board.js',          'Bảng Chuẩn bị',                                2218],
  ['src/pages/quality-board.js',       'Bảng Quality Gate',                            2233],
  ['src/components/rows-editor.js',    'Editor bảng dùng chung (OP/QC rows)',          2248],
  ['src/pages/models.js',              'Model Library (4.8) + so sánh model',          2266],
  ['src/pages/sops.js',                'Standard Work / SOP (4.9)',                    2337],
  ['src/pages/kaizen.js',              'Kaizen & AI Coach (4.10)',                     2376],
  ['src/pages/reports.js',             'Báo cáo',                                      2504],
  ['src/pages/settings.js',            'Cài đặt + quản trị (users, line, quyền…)',     2557],
  ['src/pages/demo-seed.js',           'Sinh dữ liệu demo',                            2751],
  ['src/boot.js',                      'Khởi động app (render + Store.init)',          2852],
];

/* ---------- Lấy nội dung dòng mốc từ index.html ---------- */
const ref = fs.readFileSync(REF, 'utf8').split('\n');
const anchors = MANIFEST.map(([file, , line]) => {
  const text = ref[line - 1];
  if (typeof text !== 'string' || !text.trim()) {
    console.error(`✖ index.html dòng ${line} trống — mốc cho ${file} sai.`);
    process.exit(1);
  }
  return text;
});

/* ---------- Tìm mốc trong file đem tách ---------- */
const lines = fs.readFileSync(SRC, 'utf8').split('\n');
const where = anchors.map((text, i) => {
  const hits = [];
  lines.forEach((l, k) => { if (l === text) hits.push(k + 1); });
  if (hits.length !== 1) {
    console.error(`✖ Mốc của ${MANIFEST[i][0]} xuất hiện ${hits.length} lần trong ${path.basename(SRC)} (cần đúng 1):`);
    console.error('  ' + text.trim().slice(0, 110));
    process.exit(1);
  }
  return hits[0];
});

for (let i = 1; i < where.length; i++) {
  if (where[i] <= where[i - 1]) {
    console.error(`✖ Mốc sai thứ tự: ${MANIFEST[i][0]} (dòng ${where[i]}) sau ${MANIFEST[i - 1][0]} (dòng ${where[i - 1]}).`);
    process.exit(1);
  }
}

/* ---------- Khối script app: từ mốc đầu đến dòng Store.init() cuối ---------- */
const bodyStart = where[0];
let bodyEnd = -1;
for (let i = lines.length - 1; i >= bodyStart; i--) {
  if (/^Store\.init\(\);$/.test(lines[i]) && /^<\/script>/.test(lines[i + 1] ?? '')) { bodyEnd = i + 1; break; }
}
if (bodyEnd < 0) {
  console.error('✖ Không thấy "Store.init();" ngay trước </script> — cấu trúc file đã đổi.');
  process.exit(1);
}

const slice = (a, b) => lines.slice(a - 1, b).join('\n');
const parts = MANIFEST.map(([file, label], i) => {
  const a = where[i];
  const b = i + 1 < where.length ? where[i + 1] - 1 : bodyEnd;
  return { file, label, a, b, text: slice(a, b) };
});

const body = slice(bodyStart, bodyEnd);
const rebuilt = parts.map(p => p.text).join('\n');
if (rebuilt !== body) {
  const x = body.split('\n'), y = rebuilt.split('\n');
  const i = x.findIndex((l, k) => l !== y[k]);
  console.error(`✖ Ghép lại KHÔNG khớp bản gốc (lệch ở dòng ${i + 1}) — dừng, không ghi file nào.`);
  console.error('  gốc : ' + (x[i] ?? '').slice(0, 100));
  console.error('  ghép: ' + (y[i] ?? '').slice(0, 100));
  process.exit(1);
}
console.log(`✔ ${path.basename(SRC)}: ghép ${parts.length} file = khối script gốc (${(body.length / 1024).toFixed(0)} KB, ${body.split('\n').length} dòng)`);
if (/SMED_DB/.test(body)) console.log('✔ có nối Supabase (window.SMED_DB) — bản này dùng được chế độ cloud');

/* ---------- Ghi src/ ---------- */
if (fs.existsSync(OUT) && !force) {
  const hasFiles = fs.readdirSync(OUT, { recursive: true }).some(f => String(f).endsWith('.js'));
  if (hasFiles) {
    console.error('✖ src/ đã có file .js — sẽ ghi đè mất phần sửa tay.');
    console.error('  Nếu chắc chắn muốn tách lại: node tools/split-app.mjs --force');
    process.exit(1);
  }
}
for (const p of parts) {
  const abs = path.join(ROOT, p.file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, p.text, 'utf8');
}

/* ---------- index_split.html ---------- */
const headAll = lines.slice(0, bodyStart - 1).join('\n');      // mọi thứ trước khối app
const tailAll = lines.slice(bodyEnd).join('\n');               // </script></body></html>…
const cut = headAll.lastIndexOf('<script>');                   // thẻ mở của khối app
if (cut < 0) { console.error('✖ Không thấy thẻ <script> mở khối app.'); process.exit(1); }

const head  = headAll.slice(0, cut);                                        // …</script>
const after = tailAll.replace(/^<\/script>/, '');                           // </body></html>…
if (!head.endsWith('</script>') || !after.startsWith('</body>')) {
  console.error('✖ Không xác định được chỗ thay thế trong ' + path.basename(SRC));
  process.exit(1);
}

const tags = parts.map(p => `<script src="${p.file}"></script>`).join('\n');
fs.writeFileSync(path.join(ROOT, 'index_split.html'), head + '\n' + tags + '\n' + after, 'utf8');

/* ---------- src/README.md ---------- */
const size = s => (s.length / 1024).toFixed(1).padStart(6) + ' KB';
const doc = [
  '# Mã nguồn SMED — tách theo trang',
  '',
  `Sinh tự động từ \`${path.basename(SRC)}\` bằng \`node tools/split-app.mjs\`.`,
  'Nội dung là bản chép nguyên byte — không sửa cấu trúc, chỉ tách dòng.',
  '',
  '## Hai cách chạy',
  '',
  '- **Phát triển**: mở `index_split.html` — nạp từng file bằng `<script src>`,',
  '  sửa file nào thấy ngay file đó khi F5.',
  '- **Một file để deploy**: `node tools/build-app.mjs` → `index_app.html`',
  '  (ghép lại đúng như bản gốc), rồi `node tools/build-public.mjs --in index_app.html`.',
  '',
  '## Thứ tự nạp (bắt buộc giữ nguyên)',
  '',
  'Đây là JavaScript cổ điển (không phải ES module): các file dùng chung phạm vi',
  'toàn cục và nạp tuần tự, đúng thứ tự dưới đây. `src/boot.js` phải là file cuối.',
  '',
  '| # | File | Dòng trong bản gốc | KB | Nội dung |',
  '|---:|---|---|---:|---|',
  ...parts.map((p, i) => `| ${i + 1} | \`${p.file}\` | ${p.a}–${p.b} | ${size(p.text)} | ${MANIFEST[i][1]} |`),
  '',
  '## Quy ước',
  '',
  '- `src/core/` — dùng chung, không phụ thuộc trang nào.',
  '- `src/components/` — khối UI dùng ở nhiều trang.',
  '- `src/pages/` — mỗi trang/màn hình một file, tên theo route.',
  '- Không khai báo trùng tên ở hai file (chung phạm vi toàn cục → lỗi ngay khi nạp).',
  '- `index_split.html` và `index_app.html` là file sinh tự động: đừng sửa tay.',
  '',
  '## Kiểm tra sau khi sửa',
  '',
  '```powershell',
  'node tools/check-split.mjs   # nạp 37 file vào 1 phạm vi, bắt lỗi thứ tự',
  'node tools/build-app.mjs     # ghép lại + so với bản gốc (phải 100%)',
  '```',
].join('\n') + '\n';
fs.writeFileSync(path.join(OUT, 'README.md'), doc, 'utf8');

console.log(`✔ ghi ${parts.length} file vào src/ + src/README.md + index_split.html`);
console.log('\nTiếp theo:  node tools/check-split.mjs  &&  node tools/build-app.mjs');

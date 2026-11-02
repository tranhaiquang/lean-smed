/* =====================================================================
 *  Ghép src/**\/*.js lại thành MỘT file HTML (bản deploy).
 *
 *  Chạy:  node tools/build-app.mjs
 *         node tools/build-app.mjs --in index_split.html --out index_app.html
 *
 *  Việc nó làm:
 *    1. đọc index_split.html, gom mọi <script src="src/..."> theo đúng thứ tự
 *    2. nối nội dung các file bằng '\n'
 *    3. so với khối <script> app trong index.html → phải giống 100%
 *    4. nhúng vào HTML, ghi index_app.html
 *
 *  Nhờ bước 3, "tách file" không thể âm thầm làm đổi hành vi app.
 *  Sau đó: node tools/build-public.mjs --in index_app.html
 * ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const args = process.argv.slice(2);
const arg = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const inFile   = path.resolve(ROOT, arg('--in', 'index_split.html'));
const outFile  = path.resolve(ROOT, arg('--out', 'index_app.html'));

if (!fs.existsSync(inFile)) {
  console.error(`✖ Không thấy ${path.basename(inFile)}`);
  console.error('  Tạo lại bằng: node tools/split-app.mjs');
  process.exit(1);
}

const html = fs.readFileSync(inFile, 'utf8');

/* ---------- Gom các thẻ <script src> ---------- */
const tagRe = /<script src="(src\/[^"]+\.js)"><\/script>/g;
const tags = [...html.matchAll(tagRe)];
if (!tags.length) {
  console.error('✖ Không thấy <script src="src/..."> nào trong ' + path.basename(inFile));
  process.exit(1);
}

const files = tags.map(m => m[1]);
const srcs = files.map(f => {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) {
    console.error(`✖ Thiếu file ${f} — chạy lại node tools/split-app.mjs`);
    process.exit(1);
  }
  return fs.readFileSync(abs, 'utf8');
});
const js = srcs.join('\n');

/* ---------- Đối chiếu với khối app của bản gốc ---------- */
const refLine = l => /^\/\* Từ điển giao diện/.test(l);
const bodyOf = (file) => {
  const rl = fs.readFileSync(file, 'utf8').split('\n');
  const start = rl.findIndex(refLine) + 1;
  if (!start) return null;
  let end = -1;
  for (let i = rl.length - 1; i >= start; i--) {
    if (/^Store\.init\(\);$/.test(rl[i]) && /^<\/script>/.test(rl[i + 1] ?? '')) { end = i + 1; break; }
  }
  return end < 0 ? null : { body: rl.slice(start - 1, end).join('\n'), lines: rl };
};

const refCandidates = args.includes('--ref')
  ? [path.resolve(ROOT, arg('--ref'))]
  : ['index_supabase.html', 'index.html'].map(f => path.join(ROOT, f)).filter(f => fs.existsSync(f));

let verdict = 'không có bản gốc để đối chiếu';
for (const file of refCandidates) {
  const got = bodyOf(file);
  if (!got) continue;
  if (got.body === js) {
    verdict = `giống ${path.basename(file)} 100% (${(js.length / 1024).toFixed(0)} KB, ${js.split('\n').length} dòng)`;
    break;
  }
  if (file === refCandidates[refCandidates.length - 1]) {
    const a = got.body.split('\n'), b = js.split('\n');
    const i = a.findIndex((l, k) => l !== b[k]);
    console.error(`✖ Ghép lại KHÁC ${path.basename(file)} tại dòng ${i + 1} của khối app.`);
    console.error('  bản gốc : ' + (a[i] ?? '').slice(0, 100));
    console.error('  src/     : ' + (b[i] ?? '').slice(0, 100));
    console.error('  → sửa tay src/ không khớp bản gốc. Bỏ phần sửa hoặc cập nhật cả bản gốc.');
    process.exit(1);
  }
}

/* ---------- Nhúng ---------- */
if (js.includes('</script')) {
  console.error('✖ Trong mã có chuỗi </script> — không nhúng thẳng vào HTML được.');
  process.exit(1);
}

const first = tags[0];
const last  = tags[tags.length - 1];
const from  = first.index;
const to    = last.index + last[0].length;
const before = html.slice(0, from).replace(/\n$/, '');   // bỏ '\n' trước thẻ đầu, để ra đúng `</script><script>`
const after  = html.slice(to).replace(/^\n/, '');       // bỏ '\n' sau thẻ cuối, để ra đúng `</script></body>`
const out    = before + '<script>\n' + js + '\n</script>' + after;

fs.writeFileSync(outFile, out, 'utf8');

const kb = n => (n / 1024).toFixed(0);
console.log(`✔ đọc ${files.length} file từ ${path.basename(inFile)}`);
console.log(`✔ nội dung ${verdict}`);
console.log(`✔ ghi ${path.basename(outFile)}  (${kb(out.length)} KB)`);
console.log('\nTiếp theo:');
console.log('  • thử giao diện : mở ' + path.basename(outFile));
console.log('  • bản deploy    : node tools/build-public.mjs --in ' + path.basename(outFile));

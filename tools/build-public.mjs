/* =====================================================================
 *  Tạo bản PUBLIC (không kèm dữ liệu thật) từ bản có seed.
 *
 *  Chạy:  node tools/build-public.mjs
 *         node tools/build-public.mjs --in index_supabase.html --out index_public.html
 *
 *  Việc duy nhất nó làm: thay
 *      window.SMED_SEED={ ...26 người dùng, 7 changeover, ảnh... };
 *  bằng
 *      window.SMED_SEED=null;
 *
 *  Sau đó tự kiểm tra: không còn JSON seed, không còn pinHash sha256,
 *  không còn ảnh base64, và phần còn lại của file giữ nguyên từng byte.
 * ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const inFile  = path.resolve(arg('--in', 'index_supabase.html'));
const outFile = path.resolve(arg('--out', 'index_public.html'));

if (!fs.existsSync(inFile)) {
  console.error(`✖ Không thấy ${inFile}`);
  console.error('  Chỉ định bản có dữ liệu: node tools/build-public.mjs --in <file.html>');
  process.exit(1);
}

const src = fs.readFileSync(inFile, 'utf8');
const start = src.indexOf('window.SMED_SEED=');
if (start < 0) {
  console.error(`✖ ${path.basename(inFile)} không có window.SMED_SEED — có thể đã là bản public.`);
  process.exit(1);
}

const end = src.indexOf('</script>', start);
if (end < 0) {
  console.error('✖ Không xác định được cuối khối seed.');
  process.exit(1);
}

const seedBlock = src.slice(start, end);
const replacement = 'window.SMED_SEED=null;';
const out = src.slice(0, start) + replacement + src.slice(end);

/* ---------- Kiểm tra ---------- */
const checks = [
  ['không còn JSON seed',      !/window\.SMED_SEED=\{/.test(out)],
  ['không còn pinHash sha256', !/"pinHash"\s*:\s*"sha256:/.test(out)],
  ['không còn ảnh base64',     !/data:image\/(jpeg|png);base64,[A-Za-z0-9+/]{500,}/.test(out)],
  ['đầu file giữ nguyên',      out.slice(0, start) === src.slice(0, start)],
  ['phần sau giữ nguyên',      out.slice(start + replacement.length) === src.slice(end)],
  ['bản public có khai báo',   out.includes(replacement)],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? '✔' : '✖'} ${name}`);

if (failed.length) {
  console.error('\n✖ Kiểm tra thất bại — KHÔNG ghi file.');
  process.exit(1);
}

fs.writeFileSync(outFile, out, 'utf8');

const kb = (n) => (n / 1024).toFixed(0);
console.log(`\nNguồn : ${path.basename(inFile)}  (${kb(src.length)} KB)`);
console.log(`Bản public: ${path.basename(outFile)}  (${kb(out.length)} KB, bỏ ${kb(seedBlock.length)} KB dữ liệu)`);
console.log('\nBước tiếp theo:');
console.log('  1. Mở ' + path.basename(outFile) + ' một lần để kiểm tra: màn hình Khởi tạo, dữ liệu Supabase, không có dữ liệu cũ.');
console.log('  2. Đưa file này lên Vercel (đổi tên thành index.html khi deploy).');
console.log('  3. KHÔNG commit ' + path.basename(inFile) + ' nếu repo public.');

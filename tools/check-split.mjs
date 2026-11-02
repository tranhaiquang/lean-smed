/* =====================================================================
 *  Kiểm tra bản tách file: nạp 38 file vào CÙNG một phạm vi toàn cục,
 *  đúng thứ tự trong index_split.html — giống trình duyệt nạp <script src>.
 *
 *  Chạy:  node tools/check-split.mjs
 *
 *  Mục đích: bắt lỗi "file A dùng hàm của file B nhưng B nạp sau" — lỗi
 *  duy nhất mà việc tách file có thể sinh ra (code đã được chứng minh
 *  giống index.html 100% bằng tools/build-app.mjs).
 *
 *  Không cần trình duyệt: htmPreact và DOM được giả lập tối thiểu, chỉ đủ
 *  để mọi khai báo ở cấp cao nhất chạy qua. Boot (render) không chạy.
 * ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.join(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index_split.html'), 'utf8');

const files = [...html.matchAll(/<script src="(src\/[^"]+\.js)"><\/script>/g)].map(m => m[1]);
const ordered = files.filter(f => !f.endsWith('src/boot.js'));
if (ordered.length !== files.length - 1) {
  console.error('✖ Không xác định được boot.js ở cuối danh sách nạp.');
  process.exit(1);
}

/* ---------- Giả lập tối thiểu ---------- */
const noop = () => {};
const el = () => ({
  style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  appendChild: noop, removeChild: noop, insertBefore: noop, setAttribute: noop, getAttribute: () => null,
  addEventListener: noop, removeEventListener: noop, querySelector: () => null, querySelectorAll: () => [],
  focus: noop, blur: noop, click: noop, replaceChildren: noop, children: [], firstChild: null, lastChild: null,
});
const tag = () => ({ type: null, props: {}, children: [] });
const hook = (v) => [typeof v === 'function' ? v() : v, noop];

const sandbox = {
  console,
  htmPreact: { html: tag, render: noop, useState: hook, useEffect: noop, useMemo: (f) => f(), useRef: (v) => ({ current: v }), useCallback: (f) => f },
  document: {
    documentElement: { lang: 'vi', dataset: {}, setAttribute: noop, style: {} },
    body: { ...el(), appendChild: noop },
    head: el(),
    getElementById: () => el(),
    createElement: () => el(),
    createTextNode: () => ({}),
    createDocumentFragment: () => el(),
    addEventListener: noop,
    removeEventListener: noop,
    querySelector: () => null,
    querySelectorAll: () => [],
  },
  localStorage: { store: {}, getItem(k) { return this.store[k] ?? null; }, setItem(k, v) { this.store[k] = String(v); }, removeItem(k) { delete this.store[k]; } },
  sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  location: { hash: '', search: '', pathname: '/', href: 'http://localhost/', reload: noop },
  history: { back: noop, pushState: noop, replaceState: noop },
  navigator: { userAgent: 'node', language: 'vi', languages: ['vi'], onLine: true, clipboard: { writeText: async () => {} } },
  MutationObserver: class { observe() {} disconnect() {} },
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop }),
  requestAnimationFrame: (f) => 0,
  cancelAnimationFrame: noop,
  setInterval: () => 0,
  clearInterval: noop,
  setTimeout: (f) => 0,
  clearTimeout: noop,
  fetch: async () => ({ ok: false, status: 0, json: async () => ({}), text: async () => '' }),
  addEventListener: noop,
  removeEventListener: noop,
  alert: noop,
  confirm: () => true,
  print: noop,
  URLSearchParams,
  URL,
  Image: class {},
  File: class {},
  Blob: class {},
  FileReader: class {},
  crypto: { randomUUID: () => 'uuid' },
  indexedDB: undefined,
  SMED_SEED: null,
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);

/* ---------- Nạp tuần tự ---------- */
let failed = 0;
for (const f of ordered) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try {
    vm.runInContext(code, sandbox, { filename: f });
    console.log('✔ ' + f);
  } catch (e) {
    failed++;
    console.log('✖ ' + f + '  →  ' + (e && e.message));
    if (e && e.stack) console.log(e.stack.split('\n').slice(1, 4).join('\n'));
    break;
  }
}

/* ---------- Các thành phần phải có sau khi nạp ---------- */
if (!failed) {
  /* const/let ở cấp cao nhất nằm trong "global lexical environment", không phải
     thuộc tính của global object → phải kiểm tra bằng typeof trong cùng context. */
  const need = ['Store', 'Session', 'I18N', 'tr', 'html', 'Dashboard', 'CoList', 'PlanForm', 'CoDetail',
                'ModelLibrary', 'SopLibrary', 'KaizenPage', 'Reports', 'Settings', 'PrepBoard', 'QualityBoard',
                'Setup', 'Login', 'Shell', 'App', 'seedDemo'];
  const missing = need.filter(n => vm.runInContext(`typeof ${n}`, sandbox) === 'undefined');
  if (missing.length) {
    failed++;
    console.log('✖ thiếu định nghĩa toàn cục: ' + missing.join(', '));
  } else {
    console.log(`\n✔ ${ordered.length} file nạp được, đủ ${need.length} thành phần chính`);
  }
}

console.log(failed ? '\n✖ Bản tách file CÓ LỖI.' : '\n✔ Bản tách file nạp sạch (thứ tự toàn cục đúng).');
process.exitCode = failed ? 1 : 0;

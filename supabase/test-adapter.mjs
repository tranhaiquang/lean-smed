/* =====================================================================
 *  Smoke test cho supabase-client.js — không cần mạng, không cần project.
 *
 *  Kiểm tra đúng "hợp đồng" mà Store (index.html) mong đợi:
 *    db.doc().onSnapshot  → { exists, data() }
 *    db.collection().onSnapshot → { docs: [{ id, data() }] }
 *    set / update / delete  → gọi đúng bảng & RPC
 *    lỗi 42501 → mã 'invalid_argument' (để Store khoá ghi)
 *
 *  Chạy:  node --test supabase/test-adapter.mjs
 * ===================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(here, '..', 'supabase-client.js'), 'utf8');

/** Client Supabase giả: đủ bề mặt mà adapter dùng. */
function makeFake() {
  const state = {
    rows: new Map(),          // 'coll\u0000id' -> data
    upserts: [],
    rpcs: [],
    deletes: [],
    rpcError: null,
    realtimeCb: null,
    channelState: 'SUBSCRIBED',
  };

  function exec(st) {
    if (st.kind === 'select') {
      const found = [];
      state.rows.forEach((data, key) => {
        const [coll, id] = key.split('\u0000');
        const hit = st.eqs.every(([k, v]) => (k === 'coll' ? coll === v : id === v));
        if (hit) found.push({ id, data });
      });
      if (st.single) return { data: found[0] || null, error: null };
      return { data: found, error: null };
    }
    if (st.kind === 'upsert') {
      const [row, opts] = st.args;
      state.upserts.push({ row, opts });
      state.rows.set(row.coll + '\u0000' + row.id, row.data);
      return { error: null };
    }
    if (st.kind === 'delete') {
      state.deletes.push(st.eqs);
      const [coll, id] = st.eqs.map(([, v]) => v);
      state.rows.delete(coll + '\u0000' + id);
      return { error: null };
    }
    throw new Error('unexpected builder kind: ' + st.kind);
  }

  const sb = {
    from() {
      const st = { kind: null, args: null, eqs: [], single: false };
      const api = {
        select() { st.kind = 'select'; return api; },
        upsert(row, opts) { st.kind = 'upsert'; st.args = [row, opts]; return api; },
        delete() { st.kind = 'delete'; return api; },
        eq(k, v) { st.eqs.push([k, v]); return api; },
        limit() { return api; },
        maybeSingle() { st.single = true; return api; },
        then(res, rej) { return Promise.resolve(exec(st)).then(res, rej); },
        catch(rej) { return Promise.resolve(exec(st)).catch(rej); },
      };
      return api;
    },
    rpc(name, args) {
      state.rpcs.push({ name, args });
      return Promise.resolve({ error: state.rpcError });
    },
    channel() {
      const ch = {
        on(_type, _filter, cb) { state.realtimeCb = cb; return ch; },
        subscribe(cb) { cb(state.channelState); return ch; },
        state: 'joined',
      };
      return ch;
    },
  };

  return { sb, state };
}

function load(sandboxOverrides = {}) {
  const { sb, state } = makeFake();
  const sandbox = {
    console: { info() {}, warn() {}, error() {} },
    setTimeout, clearTimeout,
    setInterval: () => 0, clearInterval() {},
    addEventListener() {}, removeEventListener() {},
    URLSearchParams, Map, Object, Array, JSON, Promise, Date, Math,
    document: {
      body: { appendChild() {} },
      createElement: () => ({ style: {}, remove() {}, set textContent(v) {} }),
      addEventListener() {},
      visibilityState: 'visible',
    },
    SMED_SUPABASE: { url: 'https://demo-project.supabase.co', anonKey: 'a'.repeat(60) },
    ...sandboxOverrides,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.location = { search: '' };
  sandbox.supabase = { createClient: () => sb };
  vm.runInNewContext(code, sandbox, { filename: 'supabase-client.js' });
  return { sandbox, state, db: sandbox.SMED_DB };
}

const tick = () => new Promise((r) => setTimeout(r, 10));

test('adapter chỉ bật khi đã cấu hình', () => {
  const { sandbox } = load();
  assert.equal(typeof sandbox.SMED_DB.doc, 'function');
  assert.equal(typeof sandbox.SMED_DB.collection, 'function');

  const off = { ...sandbox, SMED_SUPABASE: { url: 'https://YOUR-PROJECT.supabase.co', anonKey: 'x'.repeat(60) } };
  const { sandbox: sb2 } = load({ SMED_SUPABASE: off.SMED_SUPABASE });
  assert.equal(sb2.SMED_DB, undefined, 'placeholder → phải rơi về local');
});

test('URL dán kèm /rest/v1/ vẫn bật được adapter', () => {
  const { sandbox } = load({
    SMED_SUPABASE: { url: 'https://demo-project.supabase.co/rest/v1/', anonKey: 'a'.repeat(60) },
  });
  assert.equal(typeof sandbox.SMED_DB.doc, 'function');
});

test('doc + collection onSnapshot trả đúng shape', async () => {
  const { db, state } = load();

  let cfg;
  db.doc('smed', 'config').onSnapshot((s) => { cfg = s; });
  await tick();
  assert.deepEqual({ ...cfg, data: cfg.data() }, { exists: false, data: undefined });

  state.rows.set('smed\u0000config', { site: { name: 'Nhà máy 1' } });
  state.realtimeCb({ eventType: 'UPDATE', new: { coll: 'smed', id: 'config', data: { site: { name: 'Nhà máy 1' } } } });
  assert.equal(cfg.exists, true);
  assert.equal(cfg.data().site.name, 'Nhà máy 1');

  let snap;
  db.collection('changeovers').onSnapshot((s) => { snap = s; });
  await tick();
  assert.equal(snap.docs.length, 0);

  state.realtimeCb({ eventType: 'INSERT', new: { coll: 'changeovers', id: 'CO-1', data: { id: 'CO-1', status: 'Planned' } } });
  assert.equal(snap.docs.length, 1);
  assert.equal(snap.docs[0].id, 'CO-1');
  assert.equal(snap.docs[0].data().status, 'Planned');

  state.realtimeCb({ eventType: 'DELETE', old: { coll: 'changeovers', id: 'CO-1' } });
  assert.equal(snap.docs.length, 0);
});

test('set → upsert, update → RPC merge, delete → delete', async () => {
  const { db, state } = load();

  await db.doc('changeovers', 'CO-9').set({ id: 'CO-9', status: 'Draft' });
  assert.equal(state.upserts.length, 1);
  assert.equal(state.upserts[0].row.coll, 'changeovers');
  assert.equal(state.upserts[0].row.id, 'CO-9');
  assert.equal(state.upserts[0].opts.onConflict, 'coll,id');

  await db.doc('auditlog', '202611').update({ entries: { AU1: { id: 'AU1' } } });
  assert.deepEqual(JSON.parse(JSON.stringify(state.rpcs[0])), {
    name: 'smed_patch',
    args: { p_coll: 'auditlog', p_id: '202611', p_patch: { entries: { AU1: { id: 'AU1' } } } },
  });

  await db.collection('kaizen').doc('KZ-1').delete();
  assert.equal(state.deletes.length, 1);
});

test('lỗi quyền 42501 → invalid_argument để Store khoá ghi', async () => {
  const { db, state } = load();
  state.rpcError = { code: '42501', message: 'permission denied' };
  await assert.rejects(
    () => db.doc('sops', 'SOP-1').update({ status: 'Approved' }),
    (e) => e.code === 'invalid_argument',
  );
});

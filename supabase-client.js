/* =====================================================================
 *  SMED ⇄ Supabase — adapter
 *
 *  Mục đích: cung cấp đúng 4 method mà `Store` trong index.html cần,
 *  nhưng chạy trên Supabase Postgres (jsonb) + Realtime:
 *
 *      db.doc(coll, id)      -> { onSnapshot(cb), set(data), update(patch), delete() }
 *      db.collection(coll)   -> { onSnapshot(cb), doc(id) -> như trên }
 *
 *  Nhờ vậy toàn bộ UI/Store (2.800 dòng) không phải sửa gì.
 *
 *  Yêu cầu:
 *    - supabase/schema.sql đã chạy (bảng smed_docs + RPC smed_patch + realtime)
 *    - supabase-config.js đã điền url + anonKey
 *    - supabase.min.js (@supabase/supabase-js 2.118.0 UMD) tải trước file này
 *
 *  Ghi chú thiết kế:
 *    - 1 kênh realtime duy nhất cho cả bảng, tự phân phối theo `coll`.
 *    - update() đi qua RPC smed_patch → merge jsonb ĐỆ QUY (giữ entry auditlog…).
 *    - Mã lỗi được quy về bộ mã Firestore-like mà Store.write() đang xử lý:
 *        invalid_argument → khoá ghi (read-only) + toast quyền
 *        quota_exceeded   → toast "DB đầy"
 *        unavailable      → đưa vào hàng đợi offline, tự đồng bộ sau
 *    - Đọc lỗi thì KHÔNG bỏ cuộc (không để app rơi về màn hình Setup và
 *      ghi đè config): giữ Loader + banner lỗi, thử lại có backoff.
 * ===================================================================== */
(function () {
  'use strict';

  var cfg        = window.SMED_SUPABASE || {};
  var forceLocal = new URLSearchParams(location.search).get('db') === 'local';
  var rawUrl     = String(cfg.url || '').trim();
  var key        = String(cfg.anonKey || '').trim();
  /* Chấp nhận cả URL dán kèm '/rest/v1/' (rất hay gặp): supabase-js cần URL gốc project. */
  var url        = rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '').replace(/\/+$/, '');
  var configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) &&
                   key.length > 40 &&
                   !/YOUR[-_]/.test(url + key);

  if (forceLocal || !configured) {
    console.info('[SMED] Supabase ' + (forceLocal ? 'tắt bằng ?db=local' : 'chưa cấu hình') + ' → dùng chế độ cục bộ (localStorage).');
    return;
  }
  if (url !== rawUrl) console.info('[SMED] URL Supabase đã chuẩn hoá:', rawUrl, '→', url);
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('[SMED] Không tìm thấy supabase-js. Kiểm tra thứ tự <script> trong index_supabase.html.');
    return;
  }

  var sb = window.supabase.createClient(url, key, {
    auth:     { persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  window.SMED_SB = sb;

  /* ------------------------------------------------------------------ */
  /* Hạ tầng nhỏ                                                        */
  /* ------------------------------------------------------------------ */
  var SEP      = '\u0000';                 // coll không bao giờ chứa NUL
  var rows     = new Map();                // key -> data (undefined = không tồn tại)
  var docSubs  = [];                       // { coll, id, cb }
  var collSubs = [];                       // { coll, cb }
  var loading  = Object.create(null);      // key -> true (đang tải)
  var channel  = null;
  var warnShown = Object.create(null);
  var bannerEl = null;

  function k(coll, id) { return coll + SEP + id; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function banner(msg) {
    if (!document.body) return;
    if (!bannerEl) {
      bannerEl = document.createElement('div');
      bannerEl.id = 'smed-db-banner';
      bannerEl.style.cssText =
        'position:fixed;left:12px;right:12px;bottom:12px;max-width:560px;z-index:99999;' +
        'background:#c0362c;color:#fff;padding:12px 14px;border-radius:8px;' +
        'font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.35);white-space:pre-wrap';
      document.body.appendChild(bannerEl);
    }
    bannerEl.textContent = msg;
  }
  function clearBanner() {
    if (bannerEl) { bannerEl.remove(); bannerEl = null; }
  }

  /** Lỗi Supabase/PostgREST → mã mà Store.write() hiểu. */
  function mapError(e) {
    var code = (e && e.code) ? String(e.code) : '';
    var msg  = (e && (e.message || e.details || e.hint)) || '';
    var out  = { code: 'unavailable', message: msg, raw: e };

    if (/^(42501|42P01|42703|42883|23505|23503|23514|22P02|22001|PGRST301|PGRST116|PGRST202|PGRST204|PGRST205)$/.test(code)) {
      out.code = 'invalid_argument';               // quyền / schema / JWT → khoá ghi
    } else if (/^(53100|53300|53400|54000|57P03)$/.test(code)) {
      out.code = 'quota_exceeded';                 // hết chỗ / quá tải
    } else if (/failed to fetch|networkerror|load failed|fetch failed|network request failed|timeout/i.test(msg)) {
      out.code = 'unavailable';                    // mất mạng → hàng đợi offline
    }
    return out;
  }

  function explain(e) {
    var c = (e && e.code) || '';
    if (c === '42501') return 'Supabase từ chối quyền (RLS). Kiểm tra policy trong supabase/schema.sql mục 6.';
    if (c === '42P01' || c === 'PGRST205') return 'Chưa có bảng public.smed_docs. Hãy chạy supabase/schema.sql trong SQL Editor.';
    if (c === 'PGRST202' || c === '42883') return 'Chưa có hàm public.smed_patch(). Hãy chạy lại supabase/schema.sql.';
    if (c === 'PGRST301') return 'Phiên đăng nhập Supabase đã hết hạn. Tải lại trang.';
    return (e && (e.message || e.details)) || 'Không rõ lỗi';
  }

  /* ------------------------------------------------------------------ */
  /* Phát dữ liệu cho người đăng ký                                     */
  /* ------------------------------------------------------------------ */
  function emitDoc(coll, id) {
    var data = rows.get(k(coll, id));
    var exists = data !== undefined;
    var snap = { exists: exists, data: function () { return data; } };
    docSubs.forEach(function (s) {
      if (s.coll === coll && s.id === id) { try { s.cb(snap); } catch (err) { console.error(err); } }
    });
  }

  function emitColl(coll) {
    var docs = [];
    rows.forEach(function (v, key) {
      var i = key.indexOf(SEP);
      if (key.slice(0, i) !== coll) return;
      var docId = key.slice(i + 1);
      docs.push({ id: docId, data: function () { return v; } });
    });
    var snap = { docs: docs };
    collSubs.forEach(function (s) {
      if (s.coll === coll) { try { s.cb(snap); } catch (err) { console.error(err); } }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Đọc dữ liệu (có thử lại, không bỏ cuộc)                            */
  /* ------------------------------------------------------------------ */
  function backoff(n) { return Math.min(1000 * Math.pow(2, n - 1), 15000); }

  async function loadDoc(coll, id, force) {
    var key = k(coll, id);
    if (loading[key] && !force) return;
    loading[key] = true;

    for (var attempt = 1; ; attempt++) {
      var res;
      try {
        res = await sb.from('smed_docs').select('id,data').eq('coll', coll).eq('id', id).maybeSingle();
      } catch (e) {
        res = { error: e };
      }
      if (!res.error) {
        if (res.data) rows.set(key, res.data.data); else rows.delete(key);
        loading[key] = false;
        clearBanner();
        emitDoc(coll, id);
        return;
      }
      if (attempt === 3) {
        console.warn('[SMED] đọc ' + coll + '/' + id + ' lỗi:', res.error);
        banner('Không đọc được dữ liệu Supabase.\n' + explain(res.error) + '\nĐang thử lại…');
      }
      await sleep(backoff(attempt));
    }
  }

  async function loadColl(coll, force) {
    var key = 'coll' + SEP + coll;
    if (loading[key] && !force) return;
    loading[key] = true;

    for (var attempt = 1; ; attempt++) {
      var res;
      try {
        res = await sb.from('smed_docs').select('id,data').eq('coll', coll).limit(5000);
      } catch (e) {
        res = { error: e };
      }
      if (!res.error) {
        // Xoá bản cũ của collection này rồi nạp lại (đồng bộ tuyệt đối với server)
        Array.from(rows.keys()).forEach(function (key) {
          if (key.indexOf(coll + SEP) === 0) rows.delete(key);
        });
        (res.data || []).forEach(function (r) { rows.set(k(coll, r.id), r.data); });
        loading[key] = false;
        clearBanner();
        emitColl(coll);
        return;
      }
      if (attempt === 3) {
        console.warn('[SMED] đọc ' + coll + ' lỗi:', res.error);
        banner('Không đọc được dữ liệu Supabase.\n' + explain(res.error) + '\nĐang thử lại…');
      }
      await sleep(backoff(attempt));
    }
  }

  var refreshTimer = null;
  function refreshAll() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      docSubs.forEach(function (s) { loadDoc(s.coll, s.id, true); });
      var seen = Object.create(null);
      collSubs.forEach(function (s) {
        if (seen[s.coll]) return;
        seen[s.coll] = true;
        loadColl(s.coll, true);
      });
    }, 120);
  }

  /* ------------------------------------------------------------------ */
  /* Realtime: 1 kênh cho cả bảng                                       */
  /* ------------------------------------------------------------------ */
  function onRow(p) {
    if (!p) return;
    var row = p.new || {};
    var old = p.old || {};

    if (p.eventType === 'DELETE') {
      if (!old.coll || !old.id) { refreshAll(); return; }
      rows.delete(k(old.coll, old.id));
      emitDoc(old.coll, old.id);
      if (collSubs.some(function (s) { return s.coll === old.coll; })) emitColl(old.coll);
      return;
    }
    if (!row.coll || !row.id || row.data === undefined) { refreshAll(); return; }

    rows.set(k(row.coll, row.id), row.data);
    emitDoc(row.coll, row.id);
    if (collSubs.some(function (s) { return s.coll === row.coll; })) emitColl(row.coll);
  }

  function ensureChannel() {
    if (channel) return;
    channel = sb.channel('smed_docs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'smed_docs' }, onRow)
      .subscribe(function (status) {
        if (status === 'SUBSCRIBED') { clearBanner(); refreshAll(); return; }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('[SMED] realtime:', status, '→ dùng lại polling 60s');
        }
      });

    // Lưới an toàn: payload realtime > 1MB bị bỏ, hoặc kênh im lặng.
    setInterval(function () {
      if (document.visibilityState === 'visible') refreshAll();
    }, 60000);
    window.addEventListener('online', refreshAll);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') refreshAll();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Ghi dữ liệu                                                        */
  /* ------------------------------------------------------------------ */
  async function upsert(coll, id, data) {
    var res = await sb.from('smed_docs')
      .upsert({ coll: coll, id: id, data: data, updated_at: new Date().toISOString() },
              { onConflict: 'coll,id' });
    if (res.error) {
      if (res.error.code === '42P01' || res.error.code === 'PGRST205') {
        banner('Chưa có bảng public.smed_docs.\nHãy chạy supabase/schema.sql trong SQL Editor.');
      }
      throw mapError(res.error);
    }
    rows.set(k(coll, id), data);          // cập nhật lạc quan, realtime sẽ xác nhận lại
    emitDoc(coll, id);
    if (collSubs.some(function (s) { return s.coll === coll; })) emitColl(coll);
  }

  async function patch(coll, id, data) {
    var res = await sb.rpc('smed_patch', { p_coll: coll, p_id: id, p_patch: data });
    if (res.error) {
      if (res.error.code === 'PGRST202' || res.error.code === '42883') {
        banner('Chưa có hàm public.smed_patch().\nHãy chạy supabase/schema.sql trong SQL Editor.');
      }
      throw mapError(res.error);
    }
    // Không tự merge ở client: chờ echo realtime để tránh lệch dữ liệu.
    // (Store đã phủ "pending op" lên UI ngay, nên người dùng không thấy trễ.)
  }

  async function del(coll, id) {
    var res = await sb.from('smed_docs').delete().eq('coll', coll).eq('id', id);
    if (res.error) throw mapError(res.error);
    rows.delete(k(coll, id));
    emitDoc(coll, id);
    if (collSubs.some(function (s) { return s.coll === coll; })) emitColl(coll);
  }

  /* ------------------------------------------------------------------ */
  /* Interface mà Store mong đợi                                        */
  /* ------------------------------------------------------------------ */
  function docRef(coll, id) {
    return {
      set:    function (data) { return upsert(coll, id, data); },
      update: function (data) { return patch(coll, id, data); },
      delete: function () { return del(coll, id); },
      onSnapshot: function (cb) {
        var rec = { coll: coll, id: id, cb: cb };
        docSubs.push(rec);
        ensureChannel();
        loadDoc(coll, id);
        return function () { docSubs = docSubs.filter(function (x) { return x !== rec; }); };
      },
    };
  }

  function collRef(coll) {
    return {
      doc: function (id) { return docRef(coll, id); },
      onSnapshot: function (cb) {
        var rec = { coll: coll, cb: cb };
        collSubs.push(rec);
        ensureChannel();
        loadColl(coll);
        return function () { collSubs = collSubs.filter(function (x) { return x !== rec; }); };
      },
    };
  }

  function __doc(coll, id) {
    if (id === undefined && typeof coll === 'string' && coll.indexOf('/') >= 0) {
      var parts = coll.split('/');
      coll = parts[0];
      id = parts.slice(1).join('/');
    }
    return docRef(coll, id);
  }
  var db = {
    doc: __doc,
    collection: collRef,
    /** Chẩn đoán nhanh từ console: SMED_DB.stats() */
    stats: function () {
      return {
        url: url,
        docs: rows.size,
        docSubs: docSubs.length,
        collSubs: collSubs.length,
        realtime: channel && channel.state ? channel.state : 'none',
      };
    },
    client: sb,
  };

  window.SMED_DB = db;
  console.info('[SMED] Supabase adapter sẵn sàng:', url);
})();

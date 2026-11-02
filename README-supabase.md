# SMED ⇄ Supabase

Bản `index_supabase.html` giữ nguyên toàn bộ ứng dụng (UI, Store, nghiệp vụ) và chỉ
thay **tầng lưu trữ**: thay vì `localStorage`, dữ liệu nằm trong Supabase Postgres
(`jsonb`) và đồng bộ realtime giữa các máy.

```
┌─────────────────────────── index_supabase.html ───────────────────────────┐
│  Preact UI  →  Store (không đổi)  →  window.SMED_DB  (adapter mới)          │
└──────────────────────────────────────┬────────────────────────────────────┘
                                       │  doc().set / update / delete / onSnapshot
                                       ▼
                       supabase-client.js  (đúng 4 method)
                                       │
                        ┌──────────────┴───────────────┐
                        ▼                              ▼
              PostgREST (bảng smed_docs)      Realtime (postgres_changes)
```

## File đã thêm

| File | Vai trò |
|---|---|
| `supabase/schema.sql` | Bảng `smed_docs`, hàm merge jsonb đệ quy, RPC `smed_patch`, realtime, RLS |
| `supabase-config.js` | **Nơi dán** `url` + `anonKey` |
| `supabase-client.js` | Adapter Supabase cho `Store` (kèm retry, map lỗi, banner) |
| `supabase.min.js` | `@supabase/supabase-js` 2.118.0 (UMD, đã vendor — không cần CDN) |
| `supabase/test-adapter.mjs` | Smoke test không cần mạng: `node --test supabase/test-adapter.mjs` |
| `supabase/verify.mjs` | Kiểm tra project thật: bảng, RLS, realtime, merge RPC, quyền xoá |
| `index_supabase.html` | Bản copy của `index.html` + 2 thay đổi nhỏ (xem dưới). **Còn chứa seed dữ liệu thật → không deploy** |
| `tools/build-public.mjs` | Tạo bản public không kèm dữ liệu, có tự kiểm tra |
| `index_public.html` | Kết quả build: app + Supabase, **không có** người dùng/PIN hash/ảnh |

`index.html` **không bị sửa** — vẫn chạy độc lập ở chế độ local.

Hai thay đổi trong bản copy:

```diff
-  </head><body><div id="app"></div><script>
+  </head><body><div id="app"></div>
+  <script src="supabase-config.js"></script>
+  <script src="supabase.min.js"></script>
+  <script src="supabase-client.js"></script>
+  <script>
```

```diff
   try{ if(window.claude && typeof window.claude.use==='function') db = await window.claude.use('db'); }catch(e){ db=null; }
+  if(!db && window.SMED_DB) db = window.SMED_DB;   /* Supabase — xem supabase-client.js */
   if(db){ this.db=db; this.mode='cloud'; this.startCloud(); }
```

## Cài đặt (5 phút)

1. **Tạo project** trên [supabase.com](https://supabase.com) (region Singapore cho gần VN).
2. **Chạy schema**: Dashboard → *SQL Editor* → dán toàn bộ `supabase/schema.sql` → **Run**.
   Kết quả mong đợi: `Success. No rows returned`.
   Kiểm tra lại bằng lệnh: `node supabase/verify.mjs` (phải ✔ hết).
3. **Lấy key**: *Project Settings → API* → copy **Project URL** và **anon public** key.
4. **Dán vào** `supabase-config.js`:
   ```js
   window.SMED_SUPABASE = {
     url:     'https://abcdxyz.supabase.co',
     anonKey: 'eyJhbGciOi...',
   };
   ```
5. **Mở app**: double-click `index_supabase.html` (hoặc `python -m http.server`) →
   màn hình **Khởi tạo hệ thống** (vì Supabase còn trống) → tạo admin + dữ liệu demo.

Kiểm tra nhanh trong Console trình duyệt:

```js
SMED_DB.stats()          // { url, docs, docSubs, collSubs, realtime:'joined' }
SMED_SB.from('smed_docs').select('coll,id')   // phải trả về dữ liệu, không lỗi 42501
```

Mở app ở **2 tab/máy** → sửa 1 checklist → tab kia tự cập nhật trong ~1 giây.

## Đưa lên production (Vercel)

`index.html` hiện tại **chứa seed dữ liệu thật** (26 người dùng + PIN hash, 7 changeover,
5 ảnh) nên không được deploy. Tạo bản sạch trước:

```powershell
node tools/build-public.mjs
# -> index_public.html: 418 KB (bỏ 274 KB dữ liệu), đã tự kiểm tra
#    ✔ không còn JSON seed  ✔ không còn pinHash  ✔ không còn ảnh base64
```

Rồi chọn một cách:

**Cách A – deploy qua git (Vercel tự build lại):**
```powershell
Copy-Item index.html index_seed.html      # bản có dữ liệu, giữ trên máy (đã gitignore)
Copy-Item index_public.html index.html    # entry point mới, không dữ liệu
git add index.html
git commit -m "deploy data-free build with supabase"
git push
```

**Cách B – kéo thả:** đưa `index_public.html` (đổi tên thành `index.html`) cùng
`supabase-config.js`, `supabase.min.js`, `supabase-client.js` lên Vercel.

Quay lại chế độ local bất cứ lúc nào: thêm `?db=local` vào URL
(`https://.../?db=local`), hoặc để trống key trong `supabase-config.js`.

### ⚠️ Lịch sử git vẫn còn dữ liệu

Xoá seed khỏi file **không** xoá nó khỏi các commit cũ (`git log -S pinHash`). Nếu repo
đang public thì phải coi 26 PIN hash là **đã lộ** (4–8 chữ số + salt cố định → dò ra trong
vài giây). Việc cần làm:

1. Chuyển repo sang **private** (hoặc `git filter-repo` để xoá file khỏi lịch sử rồi force-push).
2. **Đổi PIN cho toàn bộ 26 người** ngay khi chuyển sang Supabase (Cài đặt → Người dùng →
   Đặt lại PIN, hoặc nhập lại danh sách từ Excel).
3. Từ nay chỉ commit bản `index_public.html`.

## Chuyển dữ liệu đang có trên máy lên Supabase

1. Ở bản local: **Cài đặt → Lưu trữ → Tải bản sao lưu JSON**.
2. Ở bản Supabase: **Cài đặt → Lưu trữ → Khôi phục từ file** → chọn file vừa tải,
   gõ `KHOIPHUC`.

Nên **không** bật dữ liệu demo khi khởi tạo nếu sẽ khôi phục từ backup.

## Cách hoạt động (để sau này sửa/bảo trì)

| Thao tác trong app | Đi Supabase |
|---|---|
| `Store.set(coll, id, doc)` | `upsert` vào `smed_docs` (ghi đè cả document) |
| `Store.update(coll, id, patch)` | `rpc('smed_patch')` → `data = smed_jsonb_merge(data, patch)` |
| `Store.remove(coll, id)` | `delete` |
| `onSnapshot` | 1 kênh Realtime cho cả bảng + polling 60 giây dự phòng |
| Mất mạng | `Store.pending` (localStorage) giữ thao tác, tự đẩy lại sau 15 giây |

`update` **phải** merge đệ quy: `auditlog` ghi `entries.<id>` cho từng hành động,
nếu merge nông (`jsonb || patch`) thì mỗi lần ghi audit sẽ xoá sạch các entry cũ.

Bản ghi:
- `coll='smed', id='config'` → cấu hình hệ thống (users, lines, checklist template…)
- `coll='changeovers'` → mỗi changeover 1 dòng (kèm checklist/activities/trials/ảnh)
- `coll IN ('models','sops','kaizen')`
- `coll='auditlog'` → 1 dòng/tháng (`202611`), chứa `entries{}`

## Giới hạn cần biết

| Giới hạn | Ảnh hưởng | Cách xử lý |
|---|---|---|
| PostgREST trả tối đa **1000 dòng**/truy vấn | Chỉ thấy 1000 changeover đầu | *Settings → API → Max rows* tăng lên, adapter đã xin `.limit(5000)` |
| Realtime payload ~**1 MB** | Changeover nhiều ảnh có thể không đẩy được realtime | Adapter có polling 60s làm lưới an toàn; lâu dài chuyển ảnh sang Supabase Storage |
| Ảnh base64 nằm trong document | Dòng phình to, tốn egress | Chuyển sang Storage bucket + chỉ lưu URL (việc riêng) |
| Ghi đè cả document (`set`) | 2 người sửa cùng lúc: người ghi sau thắng | `update` đã merge; các màn hình đều dùng `update` cho thay đổi nhỏ |

## ⚠️ Bảo mật — đọc trước khi đưa lên mạng

Schema đang bật **RLS mở cho `anon`** (mục 6): ai có URL + anon key đều đọc/ghi được.
Phù hợp pilot nội bộ; **không** phù hợp dữ liệu sản xuất thật, vì:

- anon key nằm trong file HTML public → coi như công khai;
- PIN 4–8 số được băm ở client (`sha256('smed|userId|pin')`) và lưu trong `config`,
  nên ai đọc được `config` là brute-force được PIN trong vài giây.

Khi cần chặt hơn, làm **phương án B**: Supabase Auth (email/password) + bảng
`profiles(role, lines)` + RLS theo `auth.uid()`, rồi bỏ khối comment "KHOÁ" ở
mục 7 của `schema.sql` và `revoke` quyền `anon`.

## Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| Kẹt ở màn hình *Đang tải dữ liệu chuyền…* + banner đỏ | Chưa chạy `schema.sql`, sai URL/key, hoặc RLS chặn (banner ghi rõ mã lỗi) |
| Toast "Không ghi được: bạn không có quyền…" | Lỗi `42501` → policy/`grant` thiếu; kiểm tra mục 4–6 của `schema.sql` |
| Dữ liệu không tự cập nhật giữa 2 máy | Bảng chưa ở publication realtime → chạy lại mục 5; kiểm tra `SMED_DB.stats().realtime` |
| Ghi được nhưng audit mất entry cũ | Thiếu hàm `smed_patch` / chưa chạy lại schema → xem banner "Chưa có hàm…" |
| Muốn quay về local ngay | Thêm `?db=local` vào URL |

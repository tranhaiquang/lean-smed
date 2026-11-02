# Mã nguồn SMED — tách theo trang

Sinh tự động từ `index.html` bằng `node tools/split-app.mjs`.
Nội dung là bản chép nguyên byte — không sửa cấu trúc, chỉ tách dòng.

## Hai cách chạy

- **Phát triển**: mở `index_split.html` — nạp từng file bằng `<script src>`,
  sửa file nào thấy ngay file đó khi F5.
- **Một file để deploy**: `node tools/build-app.mjs` → `index_app.html`
  (ghép lại đúng như bản gốc), rồi `node tools/build-public.mjs --in index_app.html`.

## Thứ tự nạp (bắt buộc giữ nguyên)

Đây là JavaScript cổ điển (không phải ES module): các file dùng chung phạm vi
toàn cục và nạp tuần tự, đúng thứ tự dưới đây. `src/boot.js` phải là file cuối.

| # | File | Dòng trong bản gốc | KB | Nội dung |
|---:|---|---|---:|---|
| 1 | `src/core/i18n-rows.js` | 285–286 |   89.6 KB | Từ điển dịch vi → en/ko (dữ liệu) |
| 2 | `src/core/constants.js` | 287–370 |    5.6 KB | Hằng số: quyền, trạng thái, danh mục |
| 3 | `src/core/default-config.js` | 371–433 |    4.9 KB | Cấu hình mặc định (Phụ lục A & B) |
| 4 | `src/core/utils.js` | 434–501 |    4.3 KB | Tiện ích: id, format ngày/giờ, toast, ảnh |
| 5 | `src/core/store.js` | 502–618 |    6.9 KB | Store: cloud (Supabase/Firestore) hoặc local |
| 6 | `src/core/session.js` | 619–662 |    2.6 KB | Đăng nhập, PIN, phân quyền, phạm vi chuyền |
| 7 | `src/core/models.js` | 663–690 |    1.9 KB | Tra cứu model / revision / standard / SOP |
| 8 | `src/core/compare.js` | 691–718 |    2.3 KB | So sánh A/B giữa 2 revision |
| 9 | `src/core/kpi.js` | 719–799 |    5.4 KB | KPI engine (mục 7) |
| 10 | `src/core/alerts.js` | 800–845 |    4.3 KB | Cảnh báo (mục 8) |
| 11 | `src/core/i18n.js` | 846–954 |    5.3 KB | Bộ dịch giao diện + chọn ngôn ngữ |
| 12 | `src/core/workflow.js` | 955–1190 |   17.5 KB | Workflow changeover: checklist, gate, timer |
| 13 | `src/core/ui.js` | 1191–1282 |    9.8 KB | UI nguyên thuỷ: Icon, Pill, Field, Modal… |
| 14 | `src/core/router.js` | 1283–1318 |    3.0 KB | Router hash + xuất file + CSV/XLSX |
| 15 | `src/core/charts.js` | 1319–1378 |    6.1 KB | Biểu đồ SVG: Pareto, Gantt, Trend, HBars |
| 16 | `src/core/nav.js` | 1379–1391 |    0.5 KB | Menu điều hướng |
| 17 | `src/pages/setup.js` | 1392–1427 |    3.3 KB | Trang Khởi tạo (lần đầu) + Loader |
| 18 | `src/pages/login.js` | 1428–1471 |    5.2 KB | Trang Đăng nhập + Đổi PIN bắt buộc |
| 19 | `src/pages/shell.js` | 1472–1580 |   11.2 KB | Khung app: App, Shell, MobileShell, cảnh báo |
| 20 | `src/components/co-filters.js` | 1581–1641 |    6.5 KB | Bộ lọc + bảng changeover dùng chung |
|| 21 | `src/pages/dashboard.js` | 1642–1699 |    6.4 KB | Trang Tổng quan (4.1) |
|| 22 | `src/pages/changeovers.js` | 1700–1722 |    2.2 KB | Trang danh sách Changeover |
|| 23 | `src/pages/plan-form.js` | 1723–1827 |   11.8 KB | Trang lập kế hoạch (4.2) — route #new: form + checklist chuẩn bị preview |
|| 24 | `src/pages/changeover-detail.js` | 1828–2013 |   25.7 KB | Trang chi tiết (4.3/4.4): overview, prep, so sánh |
| 25 | `src/pages/tab-live.js` | 2012–2093 |   11.8 KB | Tab Live changeover / bấm giờ (4.5) |
| 26 | `src/pages/tab-quality.js` | 2094–2141 |    7.1 KB | Tab Quality Gate (4.6) |
| 27 | `src/pages/tab-rampup.js` | 2142–2173 |    4.6 KB | Tab Ramp-up (4.7) |
| 28 | `src/pages/tab-review.js` | 2174–2217 |    6.7 KB | Tab Review / đóng + lịch sử |
| 29 | `src/pages/prep-board.js` | 2218–2232 |    1.8 KB | Bảng Chuẩn bị |
| 30 | `src/pages/quality-board.js` | 2233–2247 |    2.9 KB | Bảng Quality Gate |
| 31 | `src/components/rows-editor.js` | 2248–2265 |    3.0 KB | Editor bảng dùng chung (OP/QC rows) |
| 32 | `src/pages/models.js` | 2266–2336 |   11.7 KB | Model Library (4.8) + so sánh model |
| 33 | `src/pages/sops.js` | 2337–2375 |    7.3 KB | Standard Work / SOP (4.9) |
| 34 | `src/pages/kaizen.js` | 2376–2503 |   20.1 KB | Kaizen & AI Coach (4.10) |
| 35 | `src/pages/reports.js` | 2504–2556 |   11.5 KB | Báo cáo |
| 36 | `src/pages/settings.js` | 2557–2750 |   35.9 KB | Cài đặt + quản trị (users, line, quyền…) |
| 37 | `src/pages/demo-seed.js` | 2751–2851 |   15.2 KB | Sinh dữ liệu demo |
| 38 | `src/boot.js` | 2852–2857 |    0.2 KB | Khởi động app (render + Store.init) |

## Quy ước

- `src/core/` — dùng chung, không phụ thuộc trang nào.
- `src/components/` — khối UI dùng ở nhiều trang.
- `src/pages/` — mỗi trang/màn hình một file, tên theo route.
- Không khai báo trùng tên ở hai file (chung phạm vi toàn cục → lỗi ngay khi nạp).
- `index_split.html` và `index_app.html` là file sinh tự động: đừng sửa tay.

## Kiểm tra sau khi sửa

```powershell
node tools/check-split.mjs   # nạp 37 file vào 1 phạm vi, bắt lỗi thứ tự
node tools/build-app.mjs     # ghép lại + so với bản gốc (phải 100%)
```

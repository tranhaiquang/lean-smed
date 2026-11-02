/* ===================== SMED APP — CORE ===================== */
const {html, render, useState, useEffect, useMemo, useRef, useCallback} = htmPreact;
const APP_VERSION = '1.0.0';

/* ---------- Danh mục cố định ---------- */
const ROLES = {
  admin:'System Admin', lean:'Lean Manager', prod:'Production Manager', leader:'Line Leader', ie:'IE Engineer',
  tech:'Technician', qa:'QA', material:'Material Handler', operator:'Operator', mgmt:'Management'
};
const PERMS = {
  'config.system':['admin'],
  'config.lean':['admin','lean'],
  'standard.edit':['lean','ie'],
  'standard.approve':['lean'],
  'co.create':['prod','leader','lean','admin'],
  'co.plan':['prod','admin'],
  'co.cancel':['prod','admin'],
  'target.override':['prod','lean','ie'],
  'checklist.edit':['prod','leader','lean','ie'],
  'checklist.update':['prod','leader','material','tech','qa','ie','operator','lean'],
  'checklist.verify':['leader','prod'],
  'na.approve':['prod','lean'],
  'exception.approve':['prod','lean'],
  'co.ready':['leader','prod'],
  'co.execute':['leader','tech','ie','prod'],
  'time.edit':['ie','lean','admin'],
  'time.edit.closed':['lean','admin'],
  'qa.decide':['qa'],
  'release':['prod','qa'],
  'rampup.record':['leader','prod','ie'],
  'stable.confirm':['ie','prod'],
  'co.close':['lean','prod'],
  'kpi.exclude':['lean'],
  'comparison.edit':['ie','tech','qa','leader','prod'],
  'kaizen.create':['lean','ie','prod','leader','tech','qa'],
  'kaizen.verify':['lean','ie'],
  'ai.review':['lean','ie'],
  'ai.approve':['lean'],
  'model.edit':['ie','tech','qa','admin'],
  'model.approve':['ie','lean'],
  'sop.edit':['lean','ie'],
  'sop.approve':['lean'],
  'reports':['admin','lean','prod','leader','ie','tech','qa','mgmt'],
  'export':['admin','lean','prod','ie','mgmt','qa'],
  'backup':['admin'],
};
/** Ràng buộc cứng theo đặc tả – không chỉnh được trong ma trận. */
const PERM_LOCKS = {
  'config.system':{must:['admin'], why:'Luôn cần System Admin để không bị khóa ngoài hệ thống'},
  'backup':{must:['admin'], why:'Sao lưu/khôi phục luôn thuộc System Admin'},
  'qa.decide':{must:['qa'], never:['leader','operator','material','mgmt'], why:'Đặc tả: Line Leader không tự duyệt chất lượng; quyết định First Pair thuộc QA'},
  'time.edit.closed':{never:['operator','material','leader'], why:'Sửa thời gian sau khi đóng chỉ dành cho cấp quản lý dữ liệu'},
};
const rolesFor = perm => { const o=Store.config?.permMatrix?.[perm]; return Array.isArray(o) ? o : (PERMS[perm]||[]); };
const PERM_LABELS = {
  'config.system':'Cấu hình hệ thống, người dùng, nhà máy/chuyền','config.lean':'Cấu hình checklist mẫu, delay code, KPI, cảnh báo',
  'standard.edit':'Đề xuất standard time / baseline','standard.approve':'Phê duyệt standard time','co.create':'Tạo kế hoạch changeover',
  'co.plan':'Xác nhận kế hoạch (Draft → Planned)','co.cancel':'Hủy changeover','target.override':'Ghi đè target (có lý do)',
  'checklist.edit':'Thêm/bớt hạng mục checklist','checklist.update':'Cập nhật trạng thái tác vụ được giao','checklist.verify':'Xác nhận (verify) tác vụ',
  'na.approve':'Duyệt N/A','exception.approve':'Duyệt exception hạng mục critical','co.ready':'Xác nhận sẵn sàng dừng chuyền',
  'co.execute':'Bấm giờ hoạt động changeover','time.edit':'Sửa thời gian (có lý do, audit)','time.edit.closed':'Sửa thời gian sau khi đóng',
  'qa.decide':'Quyết định QA First Pair','release':'Release sản xuất','rampup.record':'Ghi sản lượng ramp-up','stable.confirm':'Xác nhận Stable Run',
  'co.close':'Review & đóng changeover','kpi.exclude':'Loại trừ khỏi KPI (có lý do)','comparison.edit':'Xử lý so sánh A/B',
  'kaizen.create':'Tạo Kaizen','kaizen.verify':'Xác minh Kaizen','ai.review':'Review đề xuất AI','ai.approve':'Duyệt đề xuất AI',
  'model.edit':'Sửa model/routing (bản nháp)','model.approve':'Duyệt revision routing','sop.edit':'Soạn SOP','sop.approve':'Duyệt SOP',
  'reports':'Xem báo cáo','export':'Xuất Excel','backup':'Sao lưu / khôi phục / xóa demo'
};
const STATUS = {
  Draft:{l:'Nháp',c:'p-grey',ph:0}, Planned:{l:'Đã lập kế hoạch',c:'p-blue',ph:0}, Preparing:{l:'Đang chuẩn bị',c:'p-blue',ph:1},
  Ready:{l:'Sẵn sàng đổi',c:'p-amber',ph:1}, InChangeover:{l:'Đang changeover',c:'p-red',ph:2},
  AwaitingQuality:{l:'Chờ chất lượng',c:'p-violet',ph:3}, Rework:{l:'Sửa / thử lại',c:'p-red',ph:3},
  Released:{l:'Đã release',c:'p-green',ph:4}, StableRun:{l:'Chạy ổn định',c:'p-green',ph:4},
  Closed:{l:'Đã đóng',c:'p-ink',ph:5}, Cancelled:{l:'Đã hủy',c:'p-grey',ph:-1}
};
const PHASES = ['Plan','Prepare','Execute','Quality Gate','Ramp-up','Review'];
const ACTIVE_STATUSES = ['Planned','Preparing','Ready','InChangeover','AwaitingQuality','Rework','Released','StableRun'];
const ACT_TYPES = {External:{l:'External',c:'t-ext',col:'var(--c-ext)'},Internal:{l:'Internal',c:'t-int',col:'var(--c-int)'},Waiting:{l:'Waiting',c:'t-wait',col:'var(--c-wait)'},Quality:{l:'Quality trial',c:'t-qa',col:'var(--c-qa)'},Rampup:{l:'Ramp-up',c:'t-ramp',col:'var(--c-ramp)'}};
const TASK_STATUS = {NotStarted:{l:'Chưa bắt đầu',c:'p-grey'},InProgress:{l:'Đang làm',c:'p-blue'},Done:{l:'Hoàn thành',c:'p-green'},Blocked:{l:'Bị chặn',c:'p-red'},NA:{l:'N/A',c:'p-grey'}};
const CATEGORIES = ['Material','Machine','Tooling','People','Documents','Quality','Layout'];
const CAT_VN = {Material:'Vật tư',Machine:'Máy',Tooling:'Tooling/cữ gá',People:'Nhân lực',Documents:'Tài liệu',Quality:'Chất lượng',Layout:'Layout'};
const QA_DECISIONS = {Pass:'p-green',Fail:'p-red',Rework:'p-amber',Hold:'p-violet'};
const KZ_STATUS = {Open:{l:'Mở',c:'p-blue'},InProgress:{l:'Đang thực hiện',c:'p-amber'},Done:{l:'Chờ xác minh',c:'p-violet'},Verified:{l:'Đã xác minh',c:'p-green'},Cancelled:{l:'Hủy',c:'p-grey'}};
const AI_STATUS = ['Suggested','Reviewed','Approved','Rejected','Verified'];

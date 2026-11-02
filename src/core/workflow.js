/* ===================== WORKFLOW CHANGEOVER (mục 6) ===================== */
const ROLE_SLOT = {leader:'leader', ie:'ie', tech:'tech', qa:'qa', material:'material'};
const coById = id => Store.data.changeovers[id];

function newCoId(lineId, t=Date.now()){
  const d=new Date(t); const s=`${String(d.getFullYear()).slice(2)}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  let id; do { id=`CO-${s}-${lineId}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; } while(Store.data.changeovers[id]);
  return id;
}
function coPatch(co, patch, action, extra){
  const e = auditEntry(action, co.id, extra);
  return Store.update('changeovers', co.id, {...patch, updatedAt:Date.now(), audit:{[e.id]:e}});
}
function approvalRec(action, note){ const u=me(); const id=uid('AP'); return {[id]:{id, at:Date.now(), by:u?.id, byName:u?.name, role:u?.role, action, note:note||''}}; }

function buildChecklist(co){
  const tpl = Store.config?.checklistTemplate||[];
  const out={}; let n=0;
  for(const t of tpl){
    n++; const id='PREP-'+String(n).padStart(3,'0');
    out[id]={id, tplId:t.id, cat:t.cat, desc:t.desc, type:t.type, ownerRole:t.ownerRole, ownerUser: co.assigned?.[ROLE_SLOT[t.ownerRole]]||null,
      critical:!!t.critical, acceptance:t.acceptance||'', dueOffsetMin:t.dueOffsetMin||0, dueAt: co.plannedStart ? co.plannedStart-(t.dueOffsetMin||0)*60000 : null,
      status:'NotStarted', evidence:'', photos:[], order:n};
  }
  return {checklist:out, taskSeq:n};
}
function buildComparison(co){
  const at = co.plannedStart||Date.now();
  const mA=modelById(co.modelA), mB=modelById(co.modelB);
  const rA=effectiveRev(mA,at), rB=effectiveRev(mB,at);
  const rows={};
  for(const r of compareRevs(rA,rB)){ rows[r.key.replace(/[^A-Za-z0-9_:\-]/g,'_')] = {...r, key:r.key}; }
  const keyOf = m => m ? Object.keys(m.revisions||{}).find(k=>m.revisions[k]===effectiveRev(m,at)) : null;
  return { refs:{ modelA:{id:co.modelA, rev:rA?.rev||null, revKey:keyOf(mA)}, modelB:{id:co.modelB, rev:rB?.rev||null, revKey:keyOf(mB)} }, comparison:{generatedAt:Date.now(), rows} };
}

/** Kiểm tra điều kiện chuyển trạng thái. Trả về danh sách {ok, text}. */
function gateCheck(co, to){
  const g=[]; const add=(ok,text)=>g.push({ok:!!ok,text});
  const cfg=Store.config; const u=me();
  if(to==='Planned'){
    add(can('co.plan'), 'Người xác nhận có quyền lập kế hoạch (Production Manager)');
    add(co.lineId && (cfg.lines||[]).some(l=>l.id===co.lineId && l.status!=='Inactive'), 'Chuyền đang active');
    add(inScope(co.lineId), 'Chuyền nằm trong phạm vi phân quyền của bạn');
    add(co.shiftId, 'Đã chọn ca');
    add(co.modelA, 'Đã chọn Model A');
    add(co.modelB, 'Đã chọn Model B');
    add(!co.modelA || !co.modelB || co.modelA!==co.modelB || co.reSetup, 'Model A khác Model B (hoặc đánh dấu re-setup)');
    const sh=(cfg.shifts||[]).find(s=>s.id===co.shiftId);
    add(co.plannedStart && sh && shiftWindowContains(sh, co.plannedStart), 'Giờ bắt đầu nằm trong ca sản xuất hợp lệ');
    add(co.targetMin>0, 'Có target internal time');
    add(!co.targetOverride || (co.targetOverride.reason && co.targetOverride.by), 'Ghi đè target có lý do và người có quyền');
    const ow=(cfg.users||[]).find(x=>x.id===co.owner);
    add(ow && ow.active!==false, 'Changeover owner là người dùng đang active');
    for(const r of ['leader','ie','tech','qa','material']) add(co.assigned?.[r], `Đã phân công ${ROLES[r]}`);
  }
  if(to==='Preparing'){ add(can('checklist.edit')||can('co.plan'), 'Có quyền bắt đầu chuẩn bị'); add(vals(co.checklist).length>0, 'Checklist đã được tạo'); }
  if(to==='Ready'){
    add(can('co.ready'), can('co.ready')?'Line Leader xác nhận sẵn sàng dừng':`Line Leader xác nhận sẵn sàng dừng – ${userName(co.assigned?.leader)} cần đăng nhập để bấm`);
    const crit = vals(co.checklist).filter(t=>t.critical);
    const open = crit.filter(t=>!(t.status==='Done' || (t.status==='NA' && t.naApprovedBy)));
    const exc = co.exception?.approvedBy;
    add(open.length===0 || exc, open.length ? `Còn ${open.length} hạng mục critical chưa xong${exc?' (đã có exception được duyệt)':''}` : 'Tất cả hạng mục critical đã hoàn tất');
    const rows = vals(co.comparison?.rows);
    const openRows = rows.filter(r => (r.status==='Change required' && !(r.taskId && co.checklist?.[r.taskId]?.status==='Done') && !r.confirmedBy) || (r.status==='Verify' && !r.confirmedBy));
    add(openRows.length===0 || exc, openRows.length ? `Còn ${openRows.length} khác biệt A/B chưa đóng (tab So sánh A/B – IE/Technician/QA xác minh)` : 'So sánh A/B đã đóng hết');
  }
  if(to==='InChangeover') add(can('co.execute'), 'Có quyền thực hiện changeover');
  if(to==='Released'){
    const tr=vals(co.trials).filter(t=>t.decision).sort(by('seq')).pop();
    add(can('release'), 'Có quyền release (Production/QA)');
    add(tr && tr.decision==='Pass', 'Lần thử gần nhất được QA Pass');
    add(!vals(co.trials).some(t=>!t.decision), 'Không còn mẫu thử đang chờ quyết định');
  }
  if(to==='StableRun'){ add(can('stable.confirm'), 'IE/Production xác nhận'); const s=stableCheck(co); add(s.met || co.stableOverride?.reason, s.met?'Đạt tiêu chí ổn định đã duyệt':'Chưa đạt tiêu chí ổn định (cần lý do ghi đè)'); }
  if(to==='Closed'){
    add(can('co.close'), 'Có quyền review & đóng (Lean/Production)');
    const acts=vals(co.activities);
    add(!acts.some(a=>!a.endAt), 'Tất cả hoạt động đã dừng bấm giờ');
    add(!acts.some(a=>a.type==='Waiting' && !a.delayCode), 'Mọi khoảng chờ đều có delay code');
    add(co.review?.summary, 'Đã nhập tóm tắt review');
    const k=coKpi(co); add(k.met!==false || (co.review?.overReason), 'Vượt target: đã gắn reason code/giải thích');
  }
  return g;
}
const gateOk = g => g.every(x=>x.ok);

async function transition(co, to, {note, extraPatch}={}){
  const g = gateCheck({...co, ...(extraPatch||{})}, to);
  if(!gateOk(g)){ toast('Chưa đủ điều kiện: '+g.filter(x=>!x.ok).map(x=>x.text).join('; '), 'bad'); return false; }
  const now=Date.now(); const ev={};
  const evMap = {Planned:'plannedAt',Preparing:'prepStartAt',Ready:'readyAt',InChangeover:'lineStopAt',Released:'releasedAt',StableRun:'stableAt',Closed:'closedAt'};
  if(evMap[to]) ev[evMap[to]]=now;
  let patch = {status:to, statusAt:now, events:ev, approvals:approvalRec('→ '+(STATUS[to]?.l||to), note), ...(extraPatch||{})};
  if(to==='Planned'){
    Object.assign(patch, buildComparison(co));
    if(!vals(co.checklist).length) Object.assign(patch, buildChecklist(co));
    const sop = findSopFor(co.modelB); if(sop){ const r=effectiveSop(sop); const rk=Object.keys(sop.revisions||{}).find(k=>sop.revisions[k]===r); patch.refs = {...(patch.refs||{}), sop:{id:sop.id, rev:r.rev, revKey:rk}}; }
  }
  if(to==='Closed'){ patch.review = {...(co.review||{}), ...(extraPatch?.review||{}), kpiSnapshot: snapshotKpi(co), closedBy:me()?.id, closedAt:now}; }
  await coPatch(co, patch, 'status', {before:co.status, after:to, reason:note});
  toast(`${co.id}: ${STATUS[to]?.l||to}`, 'ok');
  return true;
}
function snapshotKpi(co){ const k=coKpi(co); return {internalMin:mins(k.internalMs), downtimeMin:mins(k.downtimeMs), laborMin:mins(k.laborMs), waitingMin:mins(k.waitingMs), targetMin:co.targetMin, baselineMin:co.baselineMin, met:k.met, firstPass:k.firstPass, trials:k.trialsCount, prepPct:k.prepPct, prepCritPct:k.prepCritPct, rampMin:mins(k.rampMs), rampLoss:k.rampLoss, at:Date.now()}; }
async function cancelCo(co, reason){
  if(!canOn('co.cancel',co)) return toast('Bạn không có quyền hủy changeover này.','bad');
  if(!reason?.trim()) return toast('Cần ghi lý do hủy.','bad');
  await coPatch(co, {status:'Cancelled', statusAt:Date.now(), events:{cancelledAt:Date.now()}, cancel:{reason, by:me().id, at:Date.now(), fromStatus:co.status}, approvals:approvalRec('Hủy', reason)}, 'cancel', {before:co.status, after:'Cancelled', reason});
  toast('Đã hủy '+co.id);
}

/* ---------- Checklist ---------- */
function canUpdateTask(co, t, u=me()){
  if(!u || !canOn('checklist.update',co,u)) return false;
  if(['Closed','Cancelled'].includes(co.status)) return false;
  if(['prod','leader','lean','ie'].includes(u.role)) return true;
  return t.ownerRole===u.role || t.ownerUser===u.id;
}
async function updateTask(co, t, patch, action='task', reason){
  if(!canUpdateTask(co,t)) return toast('Tác vụ này không được giao cho bạn hoặc ngoài phạm vi quyền.','bad');
  if(patch.status==='Done' && t.critical && !(patch.evidence ?? t.evidence) && !(t.photos||[]).length && !(patch.photos||[]).length) return toast('Hạng mục critical cần bằng chứng (mã vật tư/tooling, kết quả đo hoặc ảnh) trước khi hoàn thành.','bad');
  if(patch.status==='Blocked' && !(patch.blockReason||t.blockReason)) return toast('Cần ghi lý do bị chặn.','bad');
  if(patch.status==='NA' && !(patch.naReason||'').trim()) return toast('N/A cần lý do.','bad');
  const now=Date.now(); const u=me();
  const p={...patch};
  if(patch.status==='Done'){ p.completedAt=now; p.completedBy=u.id; }
  if(patch.status && patch.status!=='Done'){ p.completedAt=null; p.verifiedBy=null; p.verifiedAt=null; }
  if(patch.status==='NA'){ p.naRequestedBy=u.id; p.naApprovedBy=null; }
  if(patch.status==='Blocked'){ p.blockedAt=now; p.escalatedAt=now; }
  await coPatch(co, {checklist:{[t.id]:p}}, action, {field:t.id, before:t.status, after:patch.status||null, reason: reason||patch.naReason||patch.blockReason});
}
async function verifyTask(co,t){
  if(!canOn('checklist.verify',co)) return toast('Chỉ Line Leader / Production xác nhận tác vụ.','bad');
  if(t.status!=='Done') return toast('Tác vụ chưa hoàn thành.','bad');
  if(t.completedBy===me().id && t.critical) return toast('Hạng mục critical cần người khác xác nhận (không tự xác nhận).','bad');
  await coPatch(co, {checklist:{[t.id]:{verifiedBy:me().id, verifiedAt:Date.now()}}}, 'verify', {field:t.id});
}
async function approveNA(co,t){
  if(!canOn('na.approve',co)) return toast('Chỉ Production/Lean Manager duyệt N/A.','bad');
  await coPatch(co, {checklist:{[t.id]:{naApprovedBy:me().id, naApprovedAt:Date.now()}}, approvals:approvalRec('Duyệt N/A '+t.id, t.naReason)}, 'na.approve', {field:t.id, reason:t.naReason});
}
async function addTask(co, data){
  if(!canOn('checklist.edit',co)) return toast('Bạn không có quyền thêm hạng mục.','bad');
  const n=(co.taskSeq||vals(co.checklist).length)+1; const id='PREP-'+String(n).padStart(3,'0');
  const t={id, cat:data.cat||'Material', desc:data.desc, type:data.type||'External', ownerRole:data.ownerRole||'leader', ownerUser:data.ownerUser || co.assigned?.[ROLE_SLOT[data.ownerRole]]||null,
    critical:!!data.critical, acceptance:data.acceptance||'', dueAt:data.dueAt|| (co.plannedStart? co.plannedStart-30*60000:null), status:'NotStarted', evidence:'', photos:[], order:n, source:data.source||'manual', cmpKey:data.cmpKey||null};
  const extra = data.cmpRowId ? {comparison:{rows:{[data.cmpRowId]:{taskId:id}}}} : {};
  await coPatch(co, {checklist:{[id]:t}, taskSeq:n, ...extra}, 'task.add', {field:id, after:t.desc});
  return id;
}

/* ---------- Bấm giờ hoạt động (4.5) ---------- */
async function startActivity(co, a){
  if(!canOn('co.execute',co)) return toast('Bạn không có quyền bấm giờ.','bad');
  if(a.type==='Waiting' && !a.delayCode) return toast('Khoảng chờ cần delay code.','bad');
  if(a.temp && !a.tempReason) return toast('Hoạt động tạm cần lý do.','bad');
  const id=uid('ACT'); const u=me();
  const act={id, libId:a.libId||null, name:a.name, type:a.type||'Internal', stdMin:a.stdMin??null, startAt:Date.now(), endAt:null, startBy:u.id, team:a.team||u.name, group:a.group||'', delayCode:a.delayCode||null, downtime: a.downtime ?? (a.type!=='External'), temp:!!a.temp, tempReason:a.tempReason||null, comment:a.comment||''};
  await coPatch(co, {activities:{[id]:act}}, 'timer.start', {field:id, after:act.name});
  return id;
}
async function stopActivity(co, act, extra={}){
  if(!canOn('co.execute',co)) return toast('Bạn không có quyền bấm giờ.','bad');
  await coPatch(co, {activities:{[act.id]:{endAt:Date.now(), endBy:me().id, ...extra}}}, 'timer.stop', {field:act.id, after:act.name});
}
async function editActivity(co, act, patch, reason){
  const closed = co.status==='Closed';
  const timeChanged = ('startAt' in patch && patch.startAt!==act.startAt) || ('endAt' in patch && patch.endAt!==act.endAt);
  if(timeChanged){
    if(!can(closed?'time.edit.closed':'time.edit') || !inScope(co.lineId)) return toast(closed?'Sửa thời gian sau khi đóng cần quyền Lean Manager/Admin.':'Sửa thời gian cần quyền IE/Lean.','bad'), false;
    if(!reason?.trim()) return toast('Sửa thời gian bắt buộc ghi lý do.','bad'), false;
    if(patch.endAt && patch.startAt && patch.endAt<=patch.startAt) return toast('Giờ kết thúc phải sau giờ bắt đầu.','bad'), false;
  } else if(!canOn('co.execute',co) && !can('time.edit')) return toast('Bạn không có quyền sửa.','bad'), false;
  const p={...patch}; if(timeChanged){ p.manualEdit={by:me().id, at:Date.now(), reason}; }
  const extraPatch = closed && timeChanged ? {review:{editedAfterClose:true}} : {};
  await coPatch(co, {activities:{[act.id]:p}, ...extraPatch}, timeChanged?'time.edit':'activity.edit', {field:act.id, before:{startAt:act.startAt,endAt:act.endAt,delayCode:act.delayCode}, after:{startAt:patch.startAt??act.startAt, endAt:patch.endAt??act.endAt, delayCode:patch.delayCode??act.delayCode}, reason});
  if(closed && timeChanged){ const fresh=coById(co.id); await Store.update('changeovers', co.id, {review:{kpiSnapshot:snapshotKpi(fresh), kpiRecalcAt:Date.now()}}); }
  return true;
}
async function deleteActivity(co, act, reason){
  if(!can(co.status==='Closed'?'time.edit.closed':'time.edit')) return toast('Xóa bản ghi thời gian cần quyền IE/Lean.','bad');
  if(!reason?.trim()) return toast('Cần lý do.','bad');
  await coPatch(co, {activities:{[act.id]:{deleted:true, deletedBy:me().id, deletedReason:reason}}}, 'activity.delete', {field:act.id, before:act.name, reason});
}

/* ---------- Quality Gate (4.6) ---------- */
async function sendTrial(co){
  if(!canOn('co.execute',co)) return toast('Bạn không có quyền gửi mẫu thử.','bad');
  if(vals(co.trials).some(t=>!t.decision)) return toast('Đang có mẫu thử chờ QA quyết định.','bad');
  if(!['InChangeover','Rework'].includes(co.status)) return toast('Chỉ gửi mẫu thử khi đang changeover hoặc sau khi sửa.','bad');
  if(co.status==='Rework'){ const last=vals(co.trials).sort(by('seq')).pop(); if(last && !vals(last.corrections).length) return toast('Ghi ít nhất một hành động sửa (tab Quality Gate) trước khi thử lại.','bad'); }
  const seq=vals(co.trials).length+1; const id='TR'+seq; const now=Date.now();
  const qaAct=uid('ACT');
  const patch={status:'AwaitingQuality', statusAt:now,
    trials:{[id]:{id, seq, sentAt:now, sentBy:me().id, checks:{}, defects:{}, corrections:{}, decision:null, qaActId:qaAct}},
    activities:{[qaAct]:{id:qaAct, name:`QA kiểm tra mẫu lần ${seq}`, type:'Quality', startAt:now, endAt:null, startBy:me().id, team:'QA', downtime:true, auto:true}},
    events: seq===1 ? {firstTrialAt:now} : {}};
  await coPatch(co, patch, 'trial.send', {field:id, before:co.status, after:'AwaitingQuality'});
  toast(`Đã gửi mẫu thử lần ${seq} cho QA`, 'ok');
}
async function decideTrial(co, tr, {decision, note, checks, defects}){
  if(!canOn('qa.decide',co)) return toast('Chỉ QA được quyết định First Pair.','bad');
  if(tr.decision) return toast('Kết quả lần thử đã khóa – không ghi đè. Hãy tạo lần thử mới.','bad');
  if(['Fail','Rework'].includes(decision) && !Object.keys(defects||{}).length) return toast('Fail/Rework bắt buộc ghi ít nhất một lỗi.','bad');
  const qcPts = (revOf(co.refs?.modelB?.id, co.refs?.modelB?.revKey)?.qcPoints)||[];
  if(decision==='Pass'){
    const missing = qcPts.filter(q=>q.critical && checks?.[q.id]!=='OK');
    if(missing.length) return toast('Chưa thể Pass: điểm kiểm tra critical chưa OK – '+missing.map(q=>q.name).join(', '),'bad');
  }
  const now=Date.now();
  const patch={trials:{[tr.id]:{decision, note:note||'', checks:checks||{}, defects:defects||{}, decidedBy:me().id, decidedAt:now}}, approvals:approvalRec('QA '+decision+' lần '+tr.seq, note)};
  if(tr.qaActId && co.activities?.[tr.qaActId] && !co.activities[tr.qaActId].endAt) patch.activities={[tr.qaActId]:{endAt:now, endBy:me().id}};
  if(decision==='Pass'){ patch.events={...(co.events?.firstPairApprovedAt?{}:{firstPairApprovedAt:now})}; patch.hold=false; }
  else if(decision==='Hold'){ patch.hold=true; }
  else { patch.status='Rework'; patch.statusAt=now; }
  // Escalation: vượt số lần thử hoặc lỗi lặp lại
  const prevCodes = new Set(vals(co.trials).filter(t=>t.decision && t.id!==tr.id).flatMap(t=>vals(t.defects).map(d=>d.code)));
  const repeat = vals(defects||{}).some(d=>prevCodes.has(d.code));
  if(decision!=='Pass' && (tr.seq >= (alertCfg(co.lineId).maxTrials||3) || repeat)) patch.escalated = {at:now, reason: repeat?'Lỗi lặp lại':'Vượt giới hạn số lần thử'};
  await coPatch(co, patch, 'qa.decision', {field:tr.id, after:decision, reason:note});
  toast(`QA: ${decision} – lần thử ${tr.seq}`, decision==='Pass'?'ok':'bad');
}
async function addCorrection(co, tr, text){
  if(!canOn('co.execute',co) && !canOn('qa.decide',co)) return toast('Không có quyền.','bad');
  const id=uid('CR');
  await coPatch(co, {trials:{[tr.id]:{corrections:{[id]:{id, action:text, by:me().id, at:Date.now()}}}}}, 'trial.correction', {field:tr.id, after:text});
}

/* ---------- Ramp-up (4.7) ---------- */
async function addRamp(co, r){
  if(!canOn('rampup.record',co)) return toast('Bạn không có quyền ghi sản lượng ramp-up.','bad');
  const id=uid('RU'); const rec={id, at:r.at||Date.now(), target:+r.target||0, actual:+r.actual||0, defects:+r.defects||0, rework:+r.rework||0, by:me().id, note:r.note||''};
  const ev = (!co.events?.firstGoodAt && rec.actual>0) ? {events:{firstGoodAt:rec.at}} : {};
  await coPatch(co, {rampup:{[id]:rec}, ...ev}, 'rampup.add', {field:id, after:`${rec.actual}/${rec.target}`});
}
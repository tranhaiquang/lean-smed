function CoDetail({id}){
  const co=coById(id); const now=useNow(1000);
  const [tab,setTabS]=useState(()=>{ const t=sessionStorage.getItem('smed.tab'); sessionStorage.removeItem('smed.tab'); return t||null; });
  const [edit,setEdit]=useState(false);
  if(!co) return html`<${Empty} title=${'Không tìm thấy changeover '+id}><a href="#changeovers">Về danh sách</a><//>`;
  if(!inScope(co.lineId)) return html`<${Empty} title="Changeover ngoài phạm vi chuyền được phân quyền"><//>`;
  const defTab = {Draft:'overview',Planned:'prep',Preparing:'prep',Ready:'live',InChangeover:'live',AwaitingQuality:'qg',Rework:'qg',Released:'ramp',StableRun:'review',Closed:'overview',Cancelled:'overview'}[co.status];
  const t=tab||defTab; const setTab=v=>setTabS(v);
  const k=coKpi(co,now); const ph=STATUS[co.status].ph;
  const tabs=[{v:'overview',l:'Tổng quan'},{v:'prep',l:'Chuẩn bị',n:`${vals(co.checklist).filter(x=>x.status==='Done').length}/${vals(co.checklist).length}`},{v:'cmp',l:'So sánh A/B',n:vals(co.comparison?.rows).filter(r=>r.status!=='No change').length},{v:'live',l:'Thực hiện / Time study'},{v:'qg',l:'Quality Gate',n:vals(co.trials).length||null},{v:'ramp',l:'Ramp-up'},{v:'review',l:'Review'},{v:'hist',l:'Lịch sử & phê duyệt'}];
  const doCancel=async()=>{ const r=await ask({title:'Hủy changeover '+co.id, danger:true, okText:'Hủy changeover', fields:[{k:'reason',label:'Lý do hủy',type:'textarea',required:true}]}); if(r) cancelCo(co, r.reason); };
  return html`<div class="col">
    <div class="row"><button class="btn btn-ghost btn-sm" onClick=${()=>go('changeovers')}><${Icon} n="back"/>Danh sách</button></div>
    <div class="card">
      <div class="row-sb" style="align-items:flex-start">
        <div class="col" style="gap:4px"><div class="row"><span class="mono small muted">${co.id}</span><${Pill} status=${co.status}/><${Demo} on=${co.isDemo}/>${co.escalated?html`<span class="pill p-red">Escalation</span>`:''}${co.hold?html`<span class="pill p-violet">QA Hold</span>`:''}</div>
          <h1>${modelLabel(co.modelA)} <span class="faint">→</span> ${modelLabel(co.modelB)}</h1>
          <div class="muted small">${lineName(co.lineId)} · ${shiftName(co.shiftId)} · Kế hoạch ${fmtDT(co.plannedStart)} · Owner ${userName(co.owner)} · Target ${co.targetMin??'—'} phút${co.targetOverride?' (ghi đè)':''}</div></div>
        <div class="row">${['Draft','Planned'].includes(co.status) && (can('co.create')||can('co.plan'))?html`<button class="btn btn-sm" onClick=${()=>setEdit(true)}>Sửa kế hoạch</button>`:''}
          ${!['Closed','Cancelled'].includes(co.status) && canOn('co.cancel',co)?html`<button class="btn btn-sm btn-ghost" style="color:var(--bad)" onClick=${doCancel}>Hủy</button>`:''}</div>
      </div>
      <div class="phases" style="margin-top:14px">${PHASES.map((p,i)=>html`<div class=${'phase '+(co.status==='Cancelled'?'':i<ph?'done':i===ph?'cur':'')}><b>${p}</b>${i===ph?STATUS[co.status].l:i<ph?'✓':''}</div>`)}</div>
      <${NextAction} co=${co} k=${k} setTab=${setTab}/>
    </div>
    <${Tabs} value=${t} onChange=${setTab} tabs=${tabs}/>
    ${t==='overview'?html`<${TabOverview} co=${co} k=${k} now=${now}/>`:''}
    ${t==='prep'?html`<${TabPrep} co=${co}/>`:''}
    ${t==='cmp'?html`<${TabCompare} co=${co}/>`:''}
    ${t==='live'?html`<${TabLive} co=${co} k=${k} now=${now}/>`:''}
    ${t==='qg'?html`<${TabQG} co=${co}/>`:''}
    ${t==='ramp'?html`<${TabRamp} co=${co} k=${k}/>`:''}
    ${t==='review'?html`<${TabReview} co=${co} k=${k}/>`:''}
    ${t==='hist'?html`<${TabHistory} co=${co}/>`:''}
    ${edit?html`<${Modal} wide title="Sửa kế hoạch" onClose=${()=>setEdit(false)}><${PlanForm} co=${co} onDone=${()=>setEdit(false)}/><//>`:''}
  </div>`;
}

function NextAction({co, k, setTab}){
  const box=(title, gateTo, btn, onClick, extra)=>{ const g=gateTo?gateCheck(co,gateTo):[]; return html`<div class="row-sb" style="margin-top:14px;align-items:flex-start;gap:16px">
    <div class="grow"><div class="eyebrow">Bước tiếp theo</div><b>${title}</b>${g.length?html`<div style="margin-top:6px"><${Gate} items=${g}/></div>`:''}${extra||''}</div>
    ${btn?html`<button class="btn btn-primary btn-xl" disabled=${g.length && !gateOk(g)} onClick=${onClick}>${btn}</button>`:''}</div>`; };
  switch(co.status){
    case 'Draft': return box('Hoàn thiện thông tin bắt buộc và xác nhận kế hoạch','Planned','Xác nhận kế hoạch',()=>transition(co,'Planned'));
    case 'Planned': return box('Bắt đầu chuẩn bị ngoài chuyền (external work)','Preparing','Bắt đầu chuẩn bị',async()=>{ await transition(co,'Preparing'); setTab('prep'); });
    case 'Preparing': return box('Hoàn tất hạng mục critical, đóng khác biệt A/B, rồi Line Leader xác nhận sẵn sàng','Ready','Sẵn sàng dừng chuyền',()=>transition(co,'Ready'));
    case 'Ready': return box('Dừng chuyền model A – thời điểm này là start event của internal time','InChangeover','DỪNG CHUYỀN · Bắt đầu',async()=>{ await transition(co,'InChangeover'); setTab('live'); });
    case 'InChangeover': return box(`Đang changeover · ${fmtClock(k.internalMs)} / ${co.targetMin} phút. Hoàn tất setup → gửi mẫu thử cho QA`, null, 'Gửi mẫu thử lần '+(vals(co.trials).length+1), ()=>{ sendTrial(co); setTab('qg'); });
    case 'AwaitingQuality': { const tr=vals(co.trials).sort(by('seq')).pop();
      if(tr && tr.decision==='Pass') return box('QA đã Pass – Production release sản xuất hàng loạt','Released','Release sản xuất',async()=>{ await transition(co,'Released'); setTab('ramp'); });
      return box(`Chờ QA quyết định mẫu thử lần ${tr?.seq||1} · đã chờ ${tr?fmtClock(Date.now()-tr.sentAt):''}`, null, can('qa.decide')?'Mở Quality Gate':null, ()=>setTab('qg')); }
    case 'Rework': return box('Mẫu chưa đạt – ghi hành động sửa và gửi thử lại (lịch sử fail được giữ nguyên)', null, 'Gửi mẫu thử lại', ()=>{ sendTrial(co); setTab('qg'); });
    case 'Released': { const s=stableCheck(co); return box(`Ramp-up · ${fmtClock(k.rampMs)} từ release. Tiêu chí: ${s.sc.consecutive} khoảng liên tiếp ≥ ${s.sc.minOutputPct}% target, lỗi ≤ ${s.sc.maxDefects}`, null, 'Ghi sản lượng', ()=>setTab('ramp')); }
    case 'StableRun': return box('Review changeover: KPI, delay code, bài học, Kaizen → đóng', null, 'Mở Review', ()=>setTab('review'));
    case 'Closed': return html`<div class="note ok" style="margin-top:14px">Đã đóng ${fmtDT(co.events?.closedAt)} bởi ${userName(co.review?.closedBy)}. ${co.review?.editedAfterClose?'Có chỉnh sửa thời gian sau khi đóng (xem lịch sử).':''}</div>`;
    case 'Cancelled': return html`<div class="note" style="margin-top:14px">Đã hủy ${fmtDT(co.cancel?.at)} bởi ${userName(co.cancel?.by)} · Lý do: ${co.cancel?.reason}</div>`;
  }
  return null;
}

function KpiGrid({co,k}){
  const items=[
    ['Internal time', fmtMin(k.internalMs), 'phút', k.running?'đang chạy':(k.end?'đến '+(Store.config.kpi?.endEvent==='release'?'release':'QA pass'):'')],
    ['Target', co.targetMin??'—', 'phút', k.varianceMs!=null?`chênh ${k.varianceMs>0?'+':''}${fmtMin(k.varianceMs)}′`:''],
    ['Downtime (union)', fmtMin(k.downtimeMs), 'phút', 'không cộng trùng song song'],
    ['Giờ công internal', fmtMin(k.laborMs), 'phút', `song song tiết kiệm ${fmtMin(k.parallelSavedMs)}′`],
    ['Waiting loss', fmtMin(k.waitingMs), 'phút', Object.keys(k.waitByCode).join(', ')],
    ['Tiết kiệm vs baseline', k.savingMs!=null?fmtMin(k.savingMs):'—', 'phút', k.reductionPct!=null?fmtPct(k.reductionPct):''],
    ['Chuẩn bị trước dừng', k.prepPct!=null?Math.round(k.prepPct):'—', '%', `critical ${k.prepCritPct!=null?Math.round(k.prepCritPct):'—'}% · thường ${k.prepNonPct!=null?Math.round(k.prepNonPct):'—'}%`],
    ['First pair', k.firstPass==null?'—':k.firstPass?'Pass':'Fail', '', `${k.trialsCount} lần thử`],
    ['Ramp-up', fmtMin(k.rampMs), 'phút', `loss ${k.rampLoss} đôi`],
  ];
  return html`<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">${items.map(([l,v,u,d])=>html`<div class="note" style="background:var(--surface-2)"><div class="eyebrow">${l}</div><div style="font-family:var(--f-display);font-size:26px;font-weight:600" class="num">${v}<small class="muted" style="font-size:13px"> ${u}</small></div><div class="tiny muted">${d}</div></div>`)}</div>`;
}

function TabOverview({co,k,now}){
  const tasks=vals(co.checklist);
  const cats=CATEGORIES.map(c=>({c, all:tasks.filter(t=>t.cat===c), done:tasks.filter(t=>t.cat===c && (t.status==='Done'||(t.status==='NA'&&t.naApprovedBy)))})).filter(x=>x.all.length);
  const ev=co.events||{};
  const evs=[['plannedAt','Kế hoạch xác nhận'],['prepStartAt','Bắt đầu chuẩn bị'],['readyAt','Sẵn sàng đổi'],['lineStopAt','Dừng chuyền (start event)'],['firstTrialAt','Gửi mẫu thử đầu'],['firstPairApprovedAt','First pair được QA duyệt'],['releasedAt','Release sản xuất'],['firstGoodAt','Sản phẩm đạt đầu tiên'],['stableAt','Đạt Stable Run'],['closedAt','Đóng review'],['cancelledAt','Hủy']].filter(([key])=>ev[key]);
  const mB=revOf(co.refs?.modelB?.id, co.refs?.modelB?.revKey);
  const [note,setNote]=useState(''); const [pv,setPv]=useState(null);
  const addNote=async(photo)=>{ if(!note.trim() && !photo) return; if(photo && JSON.stringify(co).length>200000) return toast('Hồ sơ đã nhiều ảnh – lưu thêm ảnh ở hệ thống tài liệu và ghi mã tham chiếu.','bad'); const id=uid('AT'); await coPatch(co,{attachments:{[id]:{id, type:photo?'photo':'note', data:photo||null, caption:note, by:me().id, at:Date.now()}}},'attachment',{after:note||'ảnh'}); setNote(''); };
  return html`<div class="col">
    <${KpiGrid} co=${co} k=${k}/>
    <div class="grid g2">
      <div class="card"><div class="card-h"><h3>Readiness theo nhóm</h3><span class="small muted">${tasks.filter(t=>t.critical && t.status!=='Done').length} critical còn mở</span></div>
        <div class="col" style="gap:9px">${cats.map(x=>html`<div><div class="row-sb small"><b>${CAT_VN[x.c]}</b><span class="num muted">${x.done.length}/${x.all.length}</span></div><div class=${'bar '+(x.done.length<x.all.length?'warn':'')}><i style=${`width:${x.done.length/x.all.length*100}%`}></i></div></div>`)}</div></div>
      <div class="card"><div class="card-h"><h3>Mốc thời gian</h3></div>
        ${evs.length?html`<dl class="kv">${evs.map(([key,l])=>html`<dt>${l}</dt><dd class="num">${fmtDTs(ev[key])}</dd>`)}</dl>`:html`<div class="muted small">Chưa có mốc nào.</div>`}
        <div class="sep" style="margin:10px 0"></div>
        <dl class="kv"><dt>Model A rev</dt><dd>${co.refs?.modelA?.rev||'—'}</dd><dt>Model B rev</dt><dd>${co.refs?.modelB?.rev||'—'} ${mB?.effectiveFrom?html`<span class="faint">(hiệu lực ${mB.effectiveFrom})</span>`:''}</dd><dt>SOP</dt><dd>${co.refs?.sop?html`<a href=${'#sop-'+co.refs.sop.id}>${vals(Store.data.sops).find(s=>s.id===co.refs.sop.id)?.code||co.refs.sop.id}</a> rev ${co.refs.sop.rev}`:'—'}</dd><dt>Standard</dt><dd>${co.standardRef?`${co.standardRef.id} rev ${co.standardRef.rev}`:'—'}</dd><dt>Đơn hàng</dt><dd>${co.orderRef||'—'} ${co.qty?`· ${co.qty} đôi`:''}</dd><dt>Rủi ro</dt><dd>${co.risk||'—'}</dd><dt>Ghi chú</dt><dd>${co.notes||'—'}</dd></dl></div>
    </div>
    <div class="card"><div class="card-h"><h3>Timeline hoạt động</h3><div class="legend">${Object.values(ACT_TYPES).map(t=>html`<span><i style=${'background:'+t.col}></i>${t.l}</span>`)}</div></div><${Gantt} co=${co} now=${now}/></div>
    <div class="card"><div class="card-h"><h3>Ảnh, video & ghi chú</h3></div>
      <div class="row" style="margin-bottom:10px"><input class="inp grow" id="ov-note" placeholder="Ghi chú hoặc chú thích ảnh / mã video, tài liệu…" value=${note} onInput=${e=>setNote(e.target.value)}/><button class="btn" onClick=${()=>addNote(null)}>Thêm ghi chú</button><${PhotoInput} onAdd=${d=>addNote(d)} label="Thêm ảnh"/></div>
      <div class="col" style="gap:6px">${vals(co.attachments).sort((a,b)=>b.at-a.at).map(a=>html`<div class="row small" style="align-items:flex-start">${a.data?html`<img src=${a.data} style="width:64px;height:64px;object-fit:cover;border-radius:5px;cursor:zoom-in" onClick=${()=>setPv(a.data)} alt=${a.caption||'ảnh'}/>`:''}<div class="grow"><b>${userName(a.by)}</b> <span class="faint">${fmtDT(a.at)}</span><br/>${a.caption}</div></div>`)}
        ${!vals(co.attachments).length?html`<div class="muted small">Chưa có tệp đính kèm.</div>`:''}</div></div>
    ${pv?html`<${PhotoView} src=${pv} onClose=${()=>setPv(null)}/>`:''}
  </div>`;
}

/* ---------- 4.4 Checklist chuẩn bị ---------- */
function TabPrep({co}){
  const tasks=vals(co.checklist).sort(by('order')); const u=me();
  const [mine,setMine]=useState(false); const [pv,setPv]=useState(null);
  const list=mine?tasks.filter(t=>t.ownerUser===u.id||t.ownerRole===u.role):tasks;
  const add=async()=>{ const r=await ask({title:'Thêm hạng mục chuẩn bị', okText:'Thêm', fields:[{k:'desc',label:'Mô tả điều kiện hoàn thành',required:true},{k:'cat',label:'Nhóm',type:'select',required:true,options:CATEGORIES.map(c=>({v:c,l:CAT_VN[c]}))},{k:'type',label:'Loại',type:'select',required:true,options:['External','Internal','Verification'].map(v=>({v,l:v}))},{k:'ownerRole',label:'Vai trò chịu trách nhiệm',type:'select',required:true,options:Object.entries(ROLES).map(([v,l])=>({v,l}))},{k:'critical',label:'Critical?',type:'select',options:[{v:'1',l:'Có'},{v:'',l:'Không'}]},{k:'acceptance',label:'Tiêu chí chấp nhận'}]}); if(r) addTask(co,{...r, critical:!!r.critical}); };
  const exc=co.exception;
  const reqExc=async()=>{ const r=await ask({title:'Yêu cầu exception cho hạng mục critical', body:'Exception cho phép sẵn sàng dừng chuyền khi còn hạng mục critical chưa xong. Cần Production/Lean Manager duyệt.', fields:[{k:'reason',label:'Lý do & biện pháp kiểm soát rủi ro',type:'textarea',required:true}]}); if(r) coPatch(co,{exception:{reason:r.reason, requestedBy:u.id, requestedAt:Date.now(), approvedBy:null}},'exception.request',{reason:r.reason}); };
  const apprExc=async()=>{ if(!canOn('exception.approve',co)) return toast('Chỉ Production/Lean Manager duyệt exception.','bad'); if(exc.requestedBy===u.id) return toast('Không tự duyệt exception do chính mình yêu cầu.','bad'); await coPatch(co,{exception:{approvedBy:u.id, approvedAt:Date.now()}, approvals:approvalRec('Duyệt exception', exc.reason)},'exception.approve',{reason:exc.reason}); };
  const myN=tasks.filter(t=>canUpdateTask(co,t)).length;
  const who=[...new Set(tasks.filter(t=>!['Done','NA'].includes(t.status)).map(t=>t.ownerUser?userName(t.ownerUser)+' ('+ROLES[t.ownerRole]+')':ROLES[t.ownerRole]))];
  return html`<div class="col">
    ${!myN && who.length && !['Closed','Cancelled'].includes(co.status)?html`<div class="note info small"><b>Bạn đang đăng nhập là ${u.name} (${ROLES[u.role]}) – không có việc nào được giao cho bạn ở đây.</b><br/>Mỗi người tự cập nhật việc của mình: ${who.join(', ')}. Họ đăng nhập (trên điện thoại/tablet của mình hoặc máy chung tại chuyền) → mở changeover này → bấm <b>Hoàn thành</b> và nhập bằng chứng.
      <div style="margin-top:6px"><button class="btn btn-sm" onClick=${()=>Session.logout()}><${Icon} n="users"/>Đổi người dùng</button></div></div>`:''}
    <div class="row-sb"><div class="row"><label class="chk"><input type="checkbox" id="prep-mine" checked=${mine} onChange=${e=>setMine(e.target.checked)}/> Chỉ việc của tôi</label><span class="small muted">${tasks.filter(t=>t.status==='Done').length}/${tasks.length} hoàn thành</span></div>
      <div class="row">${canOn('checklist.edit',co)&&!['Closed','Cancelled'].includes(co.status)?html`<button class="btn btn-sm" onClick=${add}><${Icon} n="plus"/>Thêm hạng mục</button>`:''}
        ${!exc && ['Preparing','Planned'].includes(co.status) && (can('co.ready')||can('co.plan'))?html`<button class="btn btn-sm" onClick=${reqExc}>Yêu cầu exception</button>`:''}</div></div>
    ${exc?html`<div class=${'note '+(exc.approvedBy?'ok':'warn')}><b>Exception ${exc.approvedBy?'đã duyệt':'chờ duyệt'}</b> · ${exc.reason} · yêu cầu bởi ${userName(exc.requestedBy)}${exc.approvedBy?` · duyệt bởi ${userName(exc.approvedBy)} ${fmtDT(exc.approvedAt)}`:''}
      ${!exc.approvedBy && can('exception.approve')?html` <button class="btn btn-sm btn-ok" onClick=${apprExc}>Duyệt exception</button>`:''}</div>`:''}
    ${CATEGORIES.filter(c=>list.some(t=>t.cat===c)).map(c=>html`<div class="col" style="gap:8px"><h4 class="eyebrow" style="font-size:12px">${CAT_VN[c]}</h4>${list.filter(t=>t.cat===c).map(t=>html`<${TaskCard} co=${co} t=${t} onPhoto=${setPv}/>`)}</div>`)}
    ${!list.length?html`<${Empty} title="Không có hạng mục"><//>`:''}
    ${pv?html`<${PhotoView} src=${pv} onClose=${()=>setPv(null)}/>`:''}
  </div>`;
}
function TaskCard({co,t,onPhoto}){
  const [ev,setEv]=useState(t.evidence||''); useEffect(()=>setEv(t.evidence||''),[t.evidence]);
  const ok=canUpdateTask(co,t); const overdue=t.dueAt && t.dueAt<Date.now() && !['Done','NA'].includes(t.status);
  const setSt=async st=>{
    if(st==='Blocked'){ const r=await ask({title:'Báo bị chặn: '+t.desc, body:'Production Manager sẽ thấy cảnh báo escalate.', fields:[{k:'r',label:'Lý do bị chặn',type:'textarea',required:true},{k:'code',label:'Delay code liên quan',type:'select',options:(Store.config.delayCodes||[]).map(d=>({v:d.code,l:d.code+' – '+d.reason}))}]}); if(r) updateTask(co,t,{status:'Blocked', blockReason:r.r, blockCode:r.code||null},'task.blocked'); return; }
    if(st==='NA'){ const r=await ask({title:'Đánh dấu N/A: '+t.desc, body:t.critical?'Hạng mục critical: N/A phải được Production/Lean Manager duyệt mới được tính.':'N/A cần người có thẩm quyền xác nhận.', fields:[{k:'r',label:'Lý do N/A',type:'textarea',required:true}]}); if(r) updateTask(co,t,{status:'NA', naReason:r.r},'task.na'); return; }
    updateTask(co,t,{status:st, evidence:ev},'task.status');
  };
  const addPhoto=d=>{ if(JSON.stringify(co).length>200000) return toast('Hồ sơ changeover đã nhiều ảnh – hãy ghi mã tham chiếu thay vì ảnh.','bad'); if((t.photos||[]).length>=3) return toast('Tối đa 3 ảnh mỗi hạng mục.','bad'); updateTask(co,t,{photos:[...(t.photos||[]), d]},'task.photo'); };
  return html`<div class="card" style="padding:12px;border-left:4px solid ${t.status==='Done'?'var(--ok)':t.status==='Blocked'?'var(--bad)':overdue?'var(--warn)':'var(--line)'}">
    <div class="row-sb" style="align-items:flex-start"><div class="grow"><div class="row" style="gap:6px"><span class="mono tiny faint">${t.id}</span>${t.critical?html`<span class="tag crit">Critical</span>`:''}<span class="tag">${t.type}</span>${t.source==='comparison'?html`<span class="tag">từ so sánh A/B</span>`:''}</div>
      <b style="font-size:14.5px">${t.desc}</b>${t.acceptance?html`<div class="small muted">Tiêu chí: ${t.acceptance}</div>`:''}
      <div class="tiny muted" style="margin-top:3px">${ROLES[t.ownerRole]||t.ownerRole}${t.ownerUser?' · '+userName(t.ownerUser):''} · hạn <span style=${overdue?'color:var(--bad);font-weight:700':''}>${fmtDT(t.dueAt)}</span>${t.completedAt?` · xong ${fmtDT(t.completedAt)} (${userName(t.completedBy)})`:''}${t.verifiedBy?` · ✓ xác nhận ${userName(t.verifiedBy)} ${fmtDT(t.verifiedAt)}`:''}</div>
      ${t.status==='Blocked'?html`<div class="note bad small" style="margin-top:6px">Bị chặn: ${t.blockReason}${t.blockCode?' ('+t.blockCode+')':''} → đã escalate Production Manager</div>`:''}
      ${t.status==='NA'?html`<div class="note small" style="margin-top:6px">N/A: ${t.naReason} · ${t.naApprovedBy?'duyệt bởi '+userName(t.naApprovedBy):html`<b>chờ duyệt</b> ${can('na.approve')?html`<button class="btn btn-sm btn-ok" onClick=${()=>approveNA(co,t)}>Duyệt N/A</button>`:''}`}</div>`:''}
    </div><${TPill} s=${t.status}/></div>
    <div class="row" style="margin-top:8px">
      <input class="inp sm grow" id=${'ev-'+t.id} placeholder="Bằng chứng: mã vật tư/tooling, số đo, vị trí…" value=${ev} disabled=${!ok} onInput=${e=>setEv(e.target.value)} onBlur=${()=>{ if(ok && ev!==(t.evidence||'')) updateTask(co,t,{evidence:ev},'task.evidence'); }}/>
      ${ok?html`<${PhotoInput} onAdd=${addPhoto}/>`:''}
      ${(t.photos||[]).length?html`<div class="photo-row">${t.photos.map(p=>html`<img src=${p} onClick=${()=>onPhoto(p)} alt="bằng chứng"/>`)}</div>`:''}
    </div>
    ${!ok && !['Done','NA'].includes(t.status) && !['Closed','Cancelled'].includes(co.status)?html`<div class="tiny muted" style="margin-top:6px">Việc này do <b>${t.ownerUser?userName(t.ownerUser):ROLES[t.ownerRole]}</b> cập nhật – người đó đăng nhập bằng tài khoản của mình để bấm Hoàn thành.</div>`:''}
    ${ok?html`<div class="row" style="margin-top:8px">
      ${t.status!=='InProgress'&&t.status!=='Done'?html`<button class="btn btn-sm" onClick=${()=>setSt('InProgress')}>Bắt đầu</button>`:''}
      ${t.status!=='Done'?html`<button class="btn btn-sm btn-ok" onClick=${()=>setSt('Done')}><${Icon} n="check"/>Hoàn thành</button>`:''}
      ${t.status!=='Blocked'&&t.status!=='Done'?html`<button class="btn btn-sm" onClick=${()=>setSt('Blocked')}>Bị chặn</button>`:''}
      ${t.status!=='NA'&&t.status!=='Done'?html`<button class="btn btn-sm btn-ghost" onClick=${()=>setSt('NA')}>N/A</button>`:''}
      ${t.status==='Done'||t.status==='Blocked'?html`<button class="btn btn-sm btn-ghost" onClick=${()=>setSt('InProgress')}>Mở lại</button>`:''}
      ${t.status==='Done'&&!t.verifiedBy&&can('checklist.verify')?html`<button class="btn btn-sm btn-primary" onClick=${()=>verifyTask(co,t)}>Xác nhận (verify)</button>`:''}
    </div>`:''}
  </div>`;
}

/* ---------- 4.8 So sánh A/B trong changeover ---------- */
function TabCompare({co}){
  const rows=vals(co.comparison?.rows).sort((a,b)=>(a.seq||0)-(b.seq||0)); const ok=canOn('comparison.edit',co) && !['Closed','Cancelled'].includes(co.status);
  const [show,setShow]=useState('diff');
  const list=show==='diff'?rows.filter(r=>r.status!=='No change'):rows;
  const rid=r=>Object.keys(co.comparison.rows).find(k=>co.comparison.rows[k]===r);
  const confirm=async(r)=>{ const id=rid(r); await coPatch(co,{comparison:{rows:{[id]:{confirmedBy:me().id, confirmedAt:Date.now()}}}},'cmp.confirm',{field:r.key, after:r.status}); };
  const setStatus=async(r,st)=>{ const id=rid(r); await coPatch(co,{comparison:{rows:{[id]:{status:st, confirmedBy:null}}}},'cmp.status',{field:r.key, before:r.status, after:st}); };
  const mkTask=async(r)=>{ const cat = /tooling/i.test(r.field)?'Tooling':/máy|công đoạn/i.test(r.field)?'Machine':/kim|chỉ/i.test(r.field)?'Material':/qc|kiểm/i.test(r.field)?'Quality':/layout|người/i.test(r.field)?'Layout':'Machine';
    const role = cat==='Quality'?'qa':cat==='Layout'?'ie':cat==='Material'?'tech':'tech';
    await addTask(co,{desc:`${r.op}: ${r.field} ${r.a} → ${r.b}`, cat, type:'External', ownerRole:role, critical:true, acceptance:`Đúng ${r.field} theo model B rev ${co.refs?.modelB?.rev||''}`, source:'comparison', cmpKey:r.key, cmpRowId:rid(r)}); };
  const regen=async()=>{ if(!['Draft','Planned','Preparing'].includes(co.status)) return; const r=await ask({title:'Tạo lại so sánh A/B', body:'Lấy revision đang hiệu lực tại ngày kế hoạch. Trạng thái xác nhận hiện tại sẽ bị thay thế.', fields:[{k:'reason',label:'Lý do',required:true}]}); if(!r) return; const b=buildComparison(co); await Store.update('changeovers',co.id,{comparison:null}); await coPatch(co,b,'cmp.regenerate',{reason:r.reason}); };
  if(!co.comparison?.generatedAt) return html`<${Empty} title="So sánh A/B được tạo khi xác nhận kế hoạch">Revision model tại thời điểm thực hiện sẽ được khóa tham chiếu.<//>`;
  return html`<div class="col">
    <div class="row-sb"><div class="small muted">Model A ${modelLabel(co.modelA)} rev <b>${co.refs?.modelA?.rev||'—'}</b> → Model B ${modelLabel(co.modelB)} rev <b>${co.refs?.modelB?.rev||'—'}</b> · tạo ${fmtDT(co.comparison.generatedAt)}</div>
      <div class="row"><${Seg} value=${show} onChange=${setShow} options=${[{v:'diff',l:'Chỉ khác biệt'},{v:'all',l:'Tất cả'}]}/>${ok&&['Draft','Planned','Preparing'].includes(co.status)?html`<button class="btn btn-sm" onClick=${regen}>Tạo lại</button>`:''}</div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Công đoạn</th><th>Thuộc tính</th><th>Model A</th><th>Model B</th><th>Trạng thái</th><th>Đóng</th><th></th></tr></thead><tbody>
      ${list.map(r=>{ const task=r.taskId?co.checklist?.[r.taskId]:null; const closed = r.status==='No change' ? true : r.status==='Change required' ? (task?.status==='Done' || !!r.confirmedBy) : !!r.confirmedBy;
        return html`<tr><td><b>${r.op}</b></td><td>${r.field}</td><td class=${r.status!=='No change'?'diff-a':''}>${r.a}</td><td class=${r.status!=='No change'?'diff-b':''}>${r.b}</td>
        <td>${ok?html`<select class="inp sm" value=${r.status} onChange=${e=>setStatus(r,e.target.value)}>${['No change','Change required','Verify'].map(s=>html`<option>${s}</option>`)}</select>`:html`<span class=${'pill '+(r.status==='No change'?'p-grey':r.status==='Verify'?'p-violet':'p-amber')}>${r.status}</span>`}</td>
        <td class="small">${closed?html`<span class="pill p-green">Đã đóng</span>`:html`<span class="pill p-amber">Mở</span>`}${task?html`<div class="tiny">Task ${task.id}: ${TASK_STATUS[task.status].l}</div>`:''}${r.confirmedBy?html`<div class="tiny">✓ ${userName(r.confirmedBy)}</div>`:''}</td>
        <td>${ok && !closed?html`<div class="row" style="gap:4px">${r.status==='Change required'&&!r.taskId?html`<button class="btn btn-sm" onClick=${()=>mkTask(r)}>Tạo task</button>`:''}${r.status==='Verify'&&['ie','tech','qa'].includes(me().role)?html`<button class="btn btn-sm btn-ok" onClick=${()=>confirm(r)}>Xác minh</button>`:''}${r.status==='Change required'&&r.taskId&&task?.status!=='Done'?html`<span class="tiny muted">chờ task xong</span>`:''}</div>`:''}</td></tr>`; })}
    </tbody></table></div>
    ${rows.some(r=>r.key==='rev:missing' && !r.confirmedBy)?html`<div class="note warn small"><b>Model chưa có routing được duyệt.</b> Có 2 cách đóng dòng này: (1) IE/Technician/QA đăng nhập và bấm <b>Xác minh</b> (đã kiểm tra khác biệt thủ công); hoặc (2) vào <a href="#models">Model Library</a> nhập routing cho cả hai model, bấm Duyệt revision, rồi quay lại bấm <b>Tạo lại</b> để app tự so sánh từng công đoạn.</div>`:''}
    ${!list.length?html`<div class="note ok small">Không có khác biệt cần xử lý.</div>`:''}
    <div class="faint small">Quy tắc đóng: No change – người phụ trách xác nhận; Change required – có task, owner, hạn và hoàn tất; Verify – IE/Technical/QA xác minh.</div>
  </div>`;
}
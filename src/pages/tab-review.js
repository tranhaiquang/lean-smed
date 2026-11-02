/* ===================== REVIEW & ĐÓNG ===================== */
function TabReview({co,k}){
  const r=co.review||{}; const [f,setF]=useState({summary:r.summary||'', lessons:r.lessons||'', overReason:r.overReason||'', overCode:r.overCode||''});
  const editable=['StableRun','Released'].includes(co.status) && can('co.close');
  const saveDraft=()=>coPatch(co,{review:{summary:f.summary, lessons:f.lessons, overReason:f.overReason, overCode:f.overCode}},'review.save');
  const close=async()=>{ await Store.update('changeovers',co.id,{review:{summary:f.summary, lessons:f.lessons, overReason:f.overReason, overCode:f.overCode}}); const fresh=coById(co.id); transition({...fresh, review:{...(fresh.review||{}), ...f}},'Closed',{extraPatch:{review:f}}); };
  const wc=Object.entries(k.waitByCode).sort((a,b)=>b[1]-a[1]);
  const mkKz=async(code)=>{ const d=(Store.config.delayCodes||[]).find(x=>x.code===code); const id='KZ-'+uid(); await Store.set('kaizen',id,{id, title:`Giảm ${d?.reason||code} khi đổi ${modelLabel(co.modelA)}→${modelLabel(co.modelB)}`, problem:`${lineName(co.lineId)}: ${code} gây ${fmtMin(k.waitByCode[code])} phút chờ trong ${co.id} (${fmtD(co.events?.lineStopAt)}).`, evidence:`Time study ${co.id}`, delayCode:code, lineId:co.lineId, linkedCo:[co.id], owner:me().id, status:'Open', source:'manual', baselineMin:+fmtMin(k.waitByCode[code]), createdAt:Date.now(), createdBy:me().id, rootCause:{why:['','','','',''], fishbone:{}}, history:{}, isDemo:!!co.isDemo});
    logGlobal('kaizen.create', id, {after:code}); toast('Đã tạo Kaizen '+id,'ok'); go('kz-'+id); };
  const exc=co.excludeKpi;
  const reqEx=async()=>{ const x=await ask({title:'Đề nghị loại khỏi KPI', body:'Định nghĩa loại trừ phải được Lean Manager duyệt.', fields:[{k:'r',label:'Lý do (VD: mất điện toàn nhà máy)',type:'textarea',required:true}]}); if(x) coPatch(co,{excludeKpi:{reason:x.r, requestedBy:me().id, at:Date.now(), approvedBy:null}},'kpi.exclude.request',{reason:x.r}); };
  return html`<div class="col">
    <${KpiGrid} co=${co} k=${k}/>
    <div class="grid g2">
      <div class="card"><div class="card-h"><h3>Waiting loss theo delay code</h3></div>
        ${wc.length?html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Code</th><th>Lý do</th><th class="r">Phút</th><th></th></tr></thead><tbody>${wc.map(([c,ms])=>html`<tr><td class="mono">${c}</td><td>${(Store.config.delayCodes||[]).find(x=>x.code===c)?.reason||''}</td><td class="r num">${fmtMin(ms)}</td><td>${can('kaizen.create')?html`<button class="btn btn-sm" onClick=${()=>mkKz(c)}>Tạo Kaizen</button>`:''}</td></tr>`)}</tbody></table></div>`:html`<div class="muted small">Không có khoảng chờ.</div>`}</div>
      <div class="card"><div class="card-h"><h3>KPI loại trừ</h3></div>
        ${exc?html`<div class=${'note small '+(exc.approvedBy?'warn':'')}>${exc.approvedBy?'Đã loại khỏi KPI':'Chờ Lean duyệt'}: ${exc.reason}${!exc.approvedBy&&can('kpi.exclude')?html` <button class="btn btn-sm" onClick=${()=>coPatch(co,{excludeKpi:{approvedBy:me().id, approvedAt:Date.now()}, approvals:approvalRec('Duyệt loại trừ KPI',exc.reason)},'kpi.exclude.approve',{reason:exc.reason})}>Duyệt</button>`:''}</div>`
          :html`<div class="small muted">Changeover hợp lệ được tính vào Target Achievement.</div>${!['Draft','Cancelled'].includes(co.status)?html`<button class="btn btn-sm" style="margin-top:8px" onClick=${reqEx}>Đề nghị loại trừ</button>`:''}`}</div>
    </div>
    <div class="card"><div class="card-h"><h3>Review changeover</h3>${co.status==='Closed'?html`<span class="pill p-ink">Đã đóng</span>`:''}</div>
      <div class="col">
        <${Field} label="Tóm tắt kết quả" req><textarea class="inp" id="rv-s" disabled=${!editable} value=${f.summary} onInput=${e=>setF({...f,summary:e.target.value})} placeholder="Điểm tốt, vấn đề chính, so với target/baseline"></textarea><//>
        <${Field} label="Bài học / đề xuất chuẩn hóa"><textarea class="inp" id="rv-l" disabled=${!editable} value=${f.lessons} onInput=${e=>setF({...f,lessons:e.target.value})}></textarea><//>
        ${k.met===false?html`<div class="grid g2" style="gap:10px"><${Field} label="Reason code vượt target" req><select class="inp" id="rv-oc" disabled=${!editable} value=${f.overCode} onChange=${e=>setF({...f,overCode:e.target.value})}><option value="">—</option>${(Store.config.delayCodes||[]).map(d=>html`<option value=${d.code}>${d.code} – ${d.reason}</option>`)}</select><//>
          <${Field} label="Giải thích vượt target" req><input class="inp" id="rv-or" disabled=${!editable} value=${f.overReason} onInput=${e=>setF({...f,overReason:e.target.value})}/><//></div>`:''}
        ${editable?html`<div><${Gate} items=${gateCheck({...co, review:{...(co.review||{}), ...f}},'Closed')}/></div>
          <div class="row"><button class="btn" onClick=${saveDraft}>Lưu nháp review</button><button class="btn btn-primary" disabled=${co.status!=='StableRun'} onClick=${close} title=${co.status!=='StableRun'?'Cần đạt Stable Run trước':''}>Đóng changeover</button></div>`:''}
        ${co.review?.kpiSnapshot?html`<div class="small muted">KPI chốt lúc đóng: internal ${co.review.kpiSnapshot.internalMin?.toFixed(1)}′ · downtime ${co.review.kpiSnapshot.downtimeMin?.toFixed(1)}′ · ${co.review.kpiSnapshot.met?'đạt':'không đạt'} target${co.review.kpiRecalcAt?` · tính lại ${fmtDT(co.review.kpiRecalcAt)} do sửa thời gian`:''}</div>`:''}
      </div></div>
  </div>`;
}

function TabHistory({co}){
  const au=vals(co.audit).sort((a,b)=>b.at-a.at); const ap=vals(co.approvals).sort((a,b)=>b.at-a.at);
  const show=v=> v==null?'':typeof v==='object'?Object.entries(v).map(([k,x])=>`${k}: ${typeof x==='number'&&x>1e12?fmtDTs(x):x}`).join(', '):String(v);
  return html`<div class="col">
    <div class="card"><div class="card-h"><h3>Lịch sử xác nhận / phê duyệt</h3></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Thời điểm</th><th>Người</th><th>Vai trò</th><th>Hành động</th><th>Nội dung</th></tr></thead><tbody>${ap.map(a=>html`<tr><td class="num small">${fmtDTs(a.at)}</td><td>${a.byName||userName(a.by)}</td><td class="small">${ROLES[a.role]||''}</td><td>${a.action}</td><td class="small">${a.note}</td></tr>`)}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h3>Audit trail</h3><span class="small muted">${au.length} bản ghi</span></div>
      <div class="tbl-wrap" style="max-height:520px"><table class="tbl"><thead><tr><th>Thời điểm</th><th>Người</th><th>Hành động</th><th>Đối tượng</th><th>Trước</th><th>Sau</th><th>Lý do</th></tr></thead><tbody>${au.map(a=>html`<tr><td class="num small">${fmtDTs(a.at)}</td><td class="small">${a.byName}</td><td class="mono small">${a.action}</td><td class="mono small">${a.field||''}</td><td class="small">${show(a.before)}</td><td class="small">${show(a.after)}</td><td class="small">${a.reason||''}</td></tr>`)}</tbody></table></div></div>
  </div>`;
}

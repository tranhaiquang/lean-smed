/* ===================== 4.7 RAMP-UP ===================== */
function TabRamp({co,k}){
  const sc=stableCfg(co.lineId); const st=stableCheck(co); const rows=vals(co.rampup).sort(by('at'));
  const last=rows[rows.length-1];
  const [f,setF]=useState({at:toLocalInput(Date.now()), target:last?.target||'', actual:'', defects:0, rework:0});
  const ok=canOn('rampup.record',co) && ['Released','StableRun'].includes(co.status);
  const add=async()=>{ if(f.target===''||f.actual==='') return toast('Nhập target và sản lượng thực tế.','bad'); await addRamp(co,{...f, at:fromLocalInput(f.at)}); setF({...f, at:toLocalInput(Date.now()), actual:'', defects:0, rework:0}); };
  const confirmStable=async()=>{ if(st.met) return transition(co,'StableRun'); const r=await ask({title:'Chưa đạt tiêu chí ổn định', body:'Ghi đè cần lý do và được lưu audit.', fields:[{k:'r',label:'Lý do xác nhận Stable Run',type:'textarea',required:true}]}); if(r) transition(co,'StableRun',{note:r.r, extraPatch:{stableOverride:{reason:r.r, by:me().id, at:Date.now()}}}); };
  if(!co.events?.releasedAt) return html`<${Empty} title="Ramp-up bắt đầu sau khi release">Theo dõi riêng từ release đến khi đạt tiêu chí ổn định.<//>`;
  return html`<div class="col">
    <div class="grid g4">
      <div class="note"><div class="eyebrow">Release</div><b class="num">${fmtDTs(co.events.releasedAt)}</b></div>
      <div class="note"><div class="eyebrow">Sản phẩm đạt đầu tiên</div><b class="num">${fmtDTs(co.events.firstGoodAt)}</b>${!co.events.firstGoodAt&&ok?html` <button class="btn btn-sm" onClick=${()=>coPatch(co,{events:{firstGoodAt:Date.now()}},'rampup.firstgood')}>Ghi nhận ngay</button>`:''}</div>
      <div class="note"><div class="eyebrow">Ramp-up time</div><b class="num">${fmtMin(k.rampMs)} phút</b></div>
      <div class="note"><div class="eyebrow">Ramp-up loss</div><b class="num">${k.rampLoss} đôi · lỗi ${k.rampDefects}</b></div></div>
    <div class="card"><div class="card-h"><h3>Tiêu chí ổn định (${lineName(co.lineId)})</h3><span class=${'pill '+(st.met?'p-green':'p-amber')}>${st.met?'Đạt':'Chưa đạt'}</span></div>
      <div class="small">${sc.consecutive} khoảng ${sc.intervalMin} phút liên tiếp · sản lượng ≥ ${sc.minOutputPct}% target · lỗi ≤ ${sc.maxDefects}/khoảng <span class="faint">(IE & Production duyệt theo line/model, cấu hình trong Cài đặt)</span></div>
      ${co.status==='Released' && can('stable.confirm')?html`<button class="btn btn-ok" style="margin-top:10px" onClick=${confirmStable}>Xác nhận Stable Run</button>`:''}
      ${co.stableOverride?html`<div class="note warn small" style="margin-top:8px">Stable Run được ghi đè: ${co.stableOverride.reason} (${userName(co.stableOverride.by)})</div>`:''}</div>
    ${ok?html`<div class="card"><div class="card-h"><h3>Ghi sản lượng theo khoảng</h3></div><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;align-items:end">
      <${Field} label="Cuối khoảng lúc"><input class="inp" id="ru-at" type="datetime-local" value=${f.at} onInput=${e=>setF({...f,at:e.target.value})}/><//>
      <${Field} label="Target (đôi)"><input class="inp" id="ru-t" type="number" min="0" value=${f.target} onInput=${e=>setF({...f,target:e.target.value})}/><//>
      <${Field} label="Thực tế (đôi)"><input class="inp" id="ru-a" type="number" min="0" value=${f.actual} onInput=${e=>setF({...f,actual:e.target.value})}/><//>
      <${Field} label="Lỗi"><input class="inp" id="ru-d" type="number" min="0" value=${f.defects} onInput=${e=>setF({...f,defects:e.target.value})}/><//>
      <${Field} label="Sửa (rework)"><input class="inp" id="ru-r" type="number" min="0" value=${f.rework} onInput=${e=>setF({...f,rework:e.target.value})}/><//>
      <button class="btn btn-primary" onClick=${add}>Ghi khoảng</button></div></div>`:''}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Khoảng</th><th class="r">Target</th><th class="r">Thực tế</th><th class="r">%</th><th class="r">Lỗi</th><th class="r">Sửa</th><th class="r">Thiếu</th><th>Đạt?</th><th>Người ghi</th></tr></thead><tbody>
      ${rows.map(r=>{ const p=r.target?r.actual/r.target*100:0; const pass=p>=sc.minOutputPct && r.defects<=sc.maxDefects; return html`<tr><td class="num">${fmtDT(r.at)}</td><td class="r num">${r.target}</td><td class="r num">${r.actual}</td><td class="r num">${Math.round(p)}%</td><td class="r num">${r.defects}</td><td class="r num">${r.rework}</td><td class="r num">${Math.max(0,r.target-r.actual)}</td><td>${pass?html`<span class="pill p-green">Đạt</span>`:html`<span class="pill p-amber">Chưa</span>`}</td><td class="small">${userName(r.by)}</td></tr>`; })}
      ${!rows.length?html`<tr><td colspan="9" class="muted">Chưa có dữ liệu ramp-up.</td></tr>`:''}</tbody></table></div>
  </div>`;
}

/* ===================== 4.6 QUALITY GATE ===================== */
function TabQG({co}){
  const trials=vals(co.trials).sort(by('seq'));
  const cur=trials.find(t=>!t.decision); const last=trials[trials.length-1];
  const rev=revOf(co.refs?.modelB?.id, co.refs?.modelB?.revKey); const qc=rev?.qcPoints||[];
  const [corr,setCorr]=useState('');
  return html`<div class="col">
    ${co.escalated?html`<div class="note bad"><b>Escalation:</b> ${co.escalated.reason} – đã thông báo QA, Technical, Production (${fmtDT(co.escalated.at)}).</div>`:''}
    ${!trials.length?html`<${Empty} title="Chưa gửi mẫu thử">Sau khi hoàn tất setup, Line Leader bấm "Gửi mẫu thử" ở tab Thực hiện.<//>`:''}
    ${cur?html`<${TrialForm} co=${co} tr=${cur} qc=${qc}/>`:''}
    ${co.status==='Rework' && last?html`<div class="card"><div class="card-h"><h3>Hành động sửa – lần thử ${last.seq}</h3></div>
      <div class="col" style="gap:6px">${vals(last.corrections).sort(by('at')).map(c=>html`<div class="small"><b>${userName(c.by)}</b> <span class="faint">${fmtTime(c.at)}</span> · ${c.action}</div>`)}</div>
      <div class="row" style="margin-top:10px"><input class="inp grow" id="qg-corr" placeholder="VD: chỉnh lại SPI máy 2 kim về 10 mũi/inch" value=${corr} onInput=${e=>setCorr(e.target.value)}/><button class="btn" onClick=${async()=>{ if(corr.trim()){ await addCorrection(co,last,corr.trim()); setCorr(''); } }}>Ghi hành động</button>
      <button class="btn btn-primary" disabled=${!canOn('co.execute',co)} onClick=${()=>{ if(!vals(last.corrections).length) return toast('Ghi ít nhất một hành động sửa trước khi thử lại.','bad'); sendTrial(co); }}>Gửi mẫu thử lại</button></div></div>`:''}
    ${co.status==='AwaitingQuality' && last?.decision==='Pass' && !co.events?.releasedAt?html`<div class="card"><div class="card-h"><h3>Production release</h3></div><${Gate} items=${gateCheck(co,'Released')}/>
      <button class="btn btn-ok btn-xl" style="margin-top:10px" disabled=${!gateOk(gateCheck(co,'Released'))} onClick=${()=>transition(co,'Released')}>Release sản xuất hàng loạt</button></div>`:''}
    ${trials.slice().reverse().filter(t=>t.decision).map(t=>html`<div class="card"><div class="row-sb"><div><b>Lần thử ${t.seq}</b> <span class="small muted">gửi ${fmtTime(t.sentAt)} · quyết định ${fmtTime(t.decidedAt)} · chờ ${fmtMin(t.decidedAt-t.sentAt)}′</span></div><span class=${'pill '+QA_DECISIONS[t.decision]}>${t.decision}</span></div>
      <div class="small" style="margin-top:6px">QA: <b>${userName(t.decidedBy)}</b> ${t.note?'· '+t.note:''}</div>
      ${vals(t.defects).length?html`<div class="tbl-wrap" style="margin-top:8px"><table class="tbl"><thead><tr><th>Mã lỗi</th><th>Mô tả</th><th>Severity</th><th>Vị trí</th><th class="r">SL</th></tr></thead><tbody>${vals(t.defects).map(d=>html`<tr><td class="mono">${d.code}</td><td>${(Store.config.defectCodes||[]).find(x=>x.code===d.code)?.name||''}${d.note?html`<div class="tiny muted">${d.note}</div>`:''}</td><td>${d.severity}</td><td>${d.location}</td><td class="r">${d.qty}</td></tr>`)}</tbody></table></div>`:''}
      ${vals(t.corrections).length?html`<div class="small muted" style="margin-top:6px">Hành động sửa: ${vals(t.corrections).map(c=>c.action).join(' · ')}</div>`:''}
      <div class="tiny faint" style="margin-top:4px">Kết quả đã khóa – không ghi đè.</div></div>`)}
  </div>`;
}
function TrialForm({co,tr,qc}){
  const can_=canOn('qa.decide',co);
  const [checks,setChecks]=useState({}); const [defects,setDefects]=useState({}); const [note,setNote]=useState('');
  const [d,setD]=useState({code:'',location:'',qty:1,note:''});
  const addDef=()=>{ if(!d.code) return toast('Chọn mã lỗi.','bad'); const dc=(Store.config.defectCodes||[]).find(x=>x.code===d.code); const id=uid('DF'); setDefects({...defects,[id]:{id, code:d.code, severity:dc?.severity||'', location:d.location, qty:+d.qty||1, note:d.note}}); setD({code:'',location:'',qty:1,note:''}); };
  const decide=dec=>decideTrial(co,tr,{decision:dec, note, checks, defects});
  return html`<div class="card" style="border-color:var(--c-qa)"><div class="card-h"><h3>Mẫu thử lần ${tr.seq} · chờ QA</h3><span class="small muted">gửi ${fmtTime(tr.sentAt)} bởi ${userName(tr.sentBy)}</span></div>
    ${!can_?html`<div class="note small">Chỉ QA được ghi kết quả và quyết định First Pair.</div>`:html`
    <h4 style="margin-bottom:6px">Inspection checklist (theo control plan rev ${co.refs?.modelB?.rev||'—'})</h4>
    ${qc.length?html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Điểm kiểm tra</th><th>Spec / phương pháp</th><th>Kết quả</th></tr></thead><tbody>${qc.map(q=>html`<tr><td><b>${q.name}</b> ${q.critical?html`<span class="tag crit">Critical</span>`:''}</td><td class="small">${q.spec||''}${q.method?html`<div class="tiny muted">${q.method}</div>`:''}</td>
      <td><${Seg} value=${checks[q.id]} onChange=${v=>setChecks({...checks,[q.id]:v})} options=${[{v:'OK',l:'OK'},{v:'NG',l:'NG'},{v:'NA',l:'N/A'}]}/></td></tr>`)}</tbody></table></div>`:html`<div class="note warn small">Model B chưa có điểm kiểm tra được phê duyệt trong revision tham chiếu. QA cần bổ sung control plan trong Model Library.</div>`}
    <h4 style="margin:12px 0 6px">Lỗi phát hiện</h4>
    <div class="grid" style="grid-template-columns:2fr 1fr 70px 2fr auto;gap:8px;align-items:end" id="qg-def">
      <${Field} label="Mã lỗi"><select class="inp" id="qg-code" value=${d.code} onChange=${e=>setD({...d,code:e.target.value})}><option value="">—</option>${(Store.config.defectCodes||[]).map(x=>html`<option value=${x.code}>${x.code} – ${x.name} (${x.severity})</option>`)}</select><//>
      <${Field} label="Vị trí"><input class="inp" id="qg-loc" value=${d.location} onInput=${e=>setD({...d,location:e.target.value})} placeholder="mũi / gót / trái"/><//>
      <${Field} label="SL"><input class="inp" id="qg-qty" type="number" min="1" value=${d.qty} onInput=${e=>setD({...d,qty:e.target.value})}/><//>
      <${Field} label="Ghi chú"><input class="inp" id="qg-note" value=${d.note} onInput=${e=>setD({...d,note:e.target.value})}/><//>
      <button class="btn" onClick=${addDef}>Thêm lỗi</button></div>
    ${vals(defects).length?html`<div class="col" style="gap:4px;margin-top:8px">${vals(defects).map(x=>html`<div class="row small"><span class="mono">${x.code}</span><span>${x.severity}</span><span>${x.location}</span><span>×${x.qty}</span><span class="muted">${x.note}</span><button class="btn btn-sm btn-ghost" onClick=${()=>{ const n={...defects}; delete n[x.id]; setDefects(n); }}>Bỏ</button></div>`)}</div>`:''}
    <${Field} label="Nhận xét QA" style="margin-top:10px"><textarea class="inp" id="qg-n" value=${note} onInput=${e=>setNote(e.target.value)}></textarea><//>
    <div class="row" style="margin-top:10px"><button class="btn btn-ok btn-xl" onClick=${()=>decide('Pass')}>PASS</button><button class="btn btn-bad btn-xl" onClick=${()=>decide('Fail')}>FAIL</button><button class="btn btn-xl" onClick=${()=>decide('Rework')}>REWORK</button><button class="btn btn-xl" onClick=${()=>decide('Hold')}>HOLD</button></div>
    <div class="tiny faint" style="margin-top:6px">Quyết định được ký bởi ${me().name} · ${fmtDTs(Date.now())}. Không tự đặt thông số kỹ thuật – chỉ dùng điểm kiểm tra được phê duyệt.</div>`}
  </div>`;
}

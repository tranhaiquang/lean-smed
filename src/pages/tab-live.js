/* ===================== 4.5 LIVE CHANGEOVER / TIME STUDY ===================== */
function TabLive({co,k,now}){
  const cfg=Store.config; const ok=canOn('co.execute',co);
  const acts=vals(co.activities).sort(by('startAt'));
  const running=acts.filter(a=>!a.endAt);
  const sop=co.refs?.sop ? Store.data.sops[co.refs.sop.id] : null; const sopRev = sop && co.refs.sop.revKey ? sop.revisions?.[co.refs.sop.revKey] : null;
  const pre=['Planned','Preparing','Ready'].includes(co.status);
  const inExec=['InChangeover','AwaitingQuality','Rework'].includes(co.status);
  const lib = (sopRev?.steps?.length ? sopRev.steps.map((s,i)=>({id:'SOP'+(i+1), name:s.text, type:s.type||'Internal', stdMin:+s.stdMin||null, fromSop:true})) : (cfg.activityLibrary||[]))
    .filter(a=> pre ? a.type==='External' : true);
  const [edit,setEdit]=useState(null);
  const startWait=async()=>{ const r=await ask({title:'Bắt đầu khoảng chờ', body:'Khoảng chờ được tính vào Waiting loss theo delay code (không cộng trùng khi chồng lấp).', fields:[{k:'code',label:'Delay code',type:'select',required:true,options:(cfg.delayCodes||[]).map(d=>({v:d.code,l:d.code+' – '+d.reason}))},{k:'note',label:'Ghi chú (bắt buộc với OTH01)'}]}); if(!r) return; if(r.code==='OTH01' && !r.note.trim()) return toast('OTH01 bắt buộc ghi chú.','bad'); const d=(cfg.delayCodes||[]).find(x=>x.code===r.code); startActivity(co,{name:`Chờ: ${d?.reason||r.code}`, type:'Waiting', delayCode:r.code, comment:r.note}); };
  const startTemp=async()=>{ const r=await ask({title:'Hoạt động tạm (ngoài thư viện chuẩn)', fields:[{k:'name',label:'Tên hoạt động',required:true},{k:'type',label:'Loại',type:'select',required:true,options:Object.entries(ACT_TYPES).filter(([v])=>pre?v==='External':true).map(([v,t])=>({v,l:t.l}))},{k:'reason',label:'Lý do tạo mục tạm',required:true},{k:'group',label:'Nhóm song song (tùy chọn)'}]}); if(r) startActivity(co,{name:r.name, type:r.type, temp:true, tempReason:r.reason, group:r.group}); };
  const stop=async a=>{
    const dur=Date.now()-a.startAt; const tol=(cfg.kpi?.overStdTolPct??20);
    if(a.stdMin && dur > a.stdMin*60000*(1+tol/100) && !a.delayCode && a.type!=='Waiting'){
      const r=await ask({title:`Vượt chuẩn: ${a.name}`, body:`Thực tế ${fmtMin(dur)} phút so với chuẩn ${a.stdMin} phút (+${tol}%). Bắt buộc chọn delay reason.`, fields:[{k:'code',label:'Delay reason',type:'select',required:true,options:(cfg.delayCodes||[]).map(d=>({v:d.code,l:d.code+' – '+d.reason}))},{k:'note',label:'Nguyên nhân / hành động'}]});
      if(!r) return; return stopActivity(co,a,{delayCode:r.code, comment:r.note});
    }
    stopActivity(co,a);
  };
  const pct = k.targetMs ? k.internalMs/k.targetMs*100 : null; const ac=alertCfg(co.lineId);
  const tone = pct==null?'':pct>=(ac.overTargetPct||100)?'var(--bad)':pct>=(ac.warnTargetPct||80)?'var(--warn)':'var(--ok)';
  const runningOf = l => running.find(a=>(a.libId===l.id) || (!a.libId && a.name===l.name));
  return html`<div class="col">
    ${co.status==='Ready'?html`<div class="card" style="text-align:center;padding:28px"><div class="eyebrow">Start event</div><h2 style="margin:6px 0 14px">Dừng sản xuất model ${modelLabel(co.modelA)} vì changeover</h2>
      <button class="btn btn-bad btn-xl" style="min-height:84px;font-size:22px;padding:0 40px" disabled=${!ok} onClick=${()=>transition(co,'InChangeover')}><${Icon} n="stop" s=24/>DỪNG CHUYỀN · BẮT ĐẦU</button>
      <div class="small muted" style="margin-top:10px">Timestamp ghi theo thiết bị · người thao tác: ${me().name}</div></div>`:''}
    ${inExec||co.events?.lineStopAt?html`<div class="card"><div class="row-sb" style="align-items:flex-end">
      <div><div class="eyebrow">Internal changeover time ${k.running?html`<span class="pulse"></span>`:''}</div><div class="big-clock" style=${'color:'+tone}>${fmtClock(k.internalMs)}</div>
        <div class="small muted">Target ${co.targetMin} phút · ${k.varianceMs!=null?(k.varianceMs>0?'vượt ':'còn ')+fmtClock(Math.abs(k.varianceMs)):''} · bắt đầu ${fmtTime(co.events?.lineStopAt)}</div></div>
      <div class="grid" style="grid-template-columns:repeat(3,minmax(90px,1fr));gap:8px">
        <div class="note"><div class="eyebrow">Downtime</div><b class="num" style="font-size:18px">${fmtMin(k.downtimeMs)}′</b></div>
        <div class="note"><div class="eyebrow">Giờ công</div><b class="num" style="font-size:18px">${fmtMin(k.laborMs)}′</b></div>
        <div class="note"><div class="eyebrow">Chờ</div><b class="num" style="font-size:18px;color:var(--warn)">${fmtMin(k.waitingMs)}′</b></div></div></div>
      ${pct!=null?html`<div class=${'bar '+(pct>=100?'bad':pct>=80?'warn':'')} style="height:10px;margin-top:12px"><i style=${`width:${Math.min(100,pct)}%`}></i></div>`:''}</div>`:''}
    ${(inExec||pre) && ok ? html`<div class="card"><div class="card-h"><h3>${pre?'Hoạt động External (trước khi dừng chuyền)':'Hoạt động – bấm Bắt đầu / Dừng'}</h3>
        <div class="row"><button class="btn" onClick=${startWait} style="border-color:var(--c-wait);color:var(--c-wait)" disabled=${pre}><${Icon} n="clock"/>Khoảng chờ</button><button class="btn" onClick=${startTemp}><${Icon} n="plus"/>Hoạt động tạm</button>
        ${co.status==='InChangeover'?html`<button class="btn btn-primary" onClick=${()=>sendTrial(co)}><${Icon} n="flag"/>Gửi mẫu thử lần ${vals(co.trials).length+1}</button>`:''}</div></div>
      ${sopRev?html`<div class="small muted" style="margin-bottom:8px">Theo SOP ${sop.code} rev ${sopRev.rev}</div>`:''}
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">
        ${lib.map(l=>{ const r=runningOf(l); const doneN=acts.filter(a=>a.endAt && ((a.libId===l.id)||(!a.libId&&a.name===l.name))).length;
          return html`<div class=${'act-tile'+(r?' run':'')}><div class="row-sb" style="align-items:flex-start"><b class="small" style="font-size:13.5px">${l.name}</b><span class=${'tiny '+(ACT_TYPES[l.type]?.c||'')}>${ACT_TYPES[l.type]?.l||l.type}</span></div>
            <div class="row-sb tiny muted"><span>Chuẩn ${l.stdMin??'—'}′</span>${doneN?html`<span>✓ ${doneN} lần</span>`:''}</div>
            ${r?html`<div class="row-sb"><span class="mono" style="font-size:20px;font-weight:700;${r.stdMin && Date.now()-r.startAt>r.stdMin*60000?'color:var(--bad)':''}">${fmtClock(now-r.startAt)}</span><button class="btn btn-bad" onClick=${()=>stop(r)}><${Icon} n="stop"/>Dừng</button></div>`
               :html`<button class="btn btn-ok" style="min-height:48px" onClick=${()=>startActivity(co,{libId:l.id, name:l.name, type:l.type, stdMin:l.stdMin})}><${Icon} n="play"/>Bắt đầu</button>`}</div>`; })}
      </div>
      ${running.filter(a=>!lib.some(l=>runningOf(l)===a)).length?html`<h4 style="margin:14px 0 8px">Đang chạy khác</h4><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">${running.filter(a=>!lib.some(l=>runningOf(l)===a)).map(a=>html`<div class=${'act-tile run'+(a.type==='Waiting'?' wait':'')}><b class="small">${a.name}</b><div class="tiny muted">${ACT_TYPES[a.type]?.l}${a.delayCode?' · '+a.delayCode:''}${a.auto?' · tự động':''}</div><div class="row-sb"><span class="mono" style="font-size:20px;font-weight:700">${fmtClock(now-a.startAt)}</span>${a.auto?'':html`<button class="btn btn-bad" onClick=${()=>stop(a)}><${Icon} n="stop"/>Dừng</button>`}</div></div>`)}</div>`:''}
    </div>`:''}
    ${!ok && (inExec||pre)?html`<div class="note small">Bạn đang xem ở chế độ chỉ đọc (bấm giờ dành cho Line Leader, IE, Technician, Production).</div>`:''}
    <div class="card"><div class="card-h"><h3>Bảng time study</h3><span class="small muted">${acts.length} bản ghi · song song tiết kiệm ${fmtMin(k.parallelSavedMs)} phút</span></div>
      ${acts.length?html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Hoạt động</th><th>Loại</th><th>Bắt đầu</th><th>Kết thúc</th><th class="r">Thực tế′</th><th class="r">Chuẩn′</th><th>Nhóm SS</th><th>Delay</th><th>DT</th><th>Người</th><th></th></tr></thead><tbody>
        ${acts.map(a=>{ const d=(a.endAt||now)-a.startAt; const over=a.stdMin && d>a.stdMin*60000; return html`<tr><td><b class="small">${a.name}</b>${a.temp?html` <span class="tag">tạm</span>`:''}${a.manualEdit?html` <span class="tag" title=${'Sửa tay: '+a.manualEdit.reason}>đã sửa</span>`:''}${a.comment?html`<div class="tiny muted">${a.comment}</div>`:''}</td>
          <td class=${'small '+(ACT_TYPES[a.type]?.c||'')}>${ACT_TYPES[a.type]?.l||a.type}</td><td class="num small">${fmtTime(a.startAt)}</td><td class="num small">${a.endAt?fmtTime(a.endAt):html`<span class="pulse"></span>`}</td>
          <td class="r num" style=${over?'color:var(--bad);font-weight:700':''}>${fmtMin(d)}</td><td class="r num">${a.stdMin??'—'}</td><td class="small">${a.group||''}</td><td class="small">${a.delayCode||''}</td><td class="small">${a.downtime?'Yes':'No'}</td><td class="small">${userName(a.startBy)}</td>
          <td><button class="btn btn-sm btn-ghost" onClick=${()=>setEdit(a)}>Sửa</button></td></tr>`; })}
      </tbody></table></div>`:html`<div class="muted small">Chưa có hoạt động.</div>`}</div>
    ${edit?html`<${ActEdit} co=${co} a=${edit} onClose=${()=>setEdit(null)}/>`:''}
  </div>`;
}
function ActEdit({co,a,onClose}){
  const [f,setF]=useState({start:toLocalInput(a.startAt)+':'+pad(new Date(a.startAt).getSeconds()), end:a.endAt?toLocalInput(a.endAt)+':'+pad(new Date(a.endAt).getSeconds()):'', delayCode:a.delayCode||'', group:a.group||'', downtime:!!a.downtime, comment:a.comment||'', reason:''});
  const S=(k,v)=>setF({...f,[k]:v});
  const save=async()=>{ const p={startAt:fromLocalInput(f.start), endAt:f.end?fromLocalInput(f.end):null, delayCode:f.delayCode||null, group:f.group, downtime:f.downtime, comment:f.comment};
    if(a.type==='Waiting' && !p.delayCode) return toast('Khoảng chờ bắt buộc có delay code.','bad');
    const okk=await editActivity(co,a,p,f.reason); if(okk) onClose(); };
  const del=async()=>{ const r=await ask({title:'Xóa bản ghi '+a.name, danger:true, okText:'Xóa', fields:[{k:'r',label:'Lý do',required:true}]}); if(r){ await deleteActivity(co,a,r.r); onClose(); } };
  const closed=co.status==='Closed';
  return html`<${Modal} title=${'Sửa: '+a.name} onClose=${onClose} footer=${html`${can(closed?'time.edit.closed':'time.edit')?html`<button class="btn btn-ghost" style="color:var(--bad);margin-right:auto" onClick=${del}>Xóa</button>`:''}<button class="btn" onClick=${onClose}>Hủy</button><button class="btn btn-primary" onClick=${save}>Lưu</button>`}>
    ${closed?html`<div class="note warn small">Changeover đã đóng – sửa thời gian cần quyền Lean Manager/Admin, lý do và được lưu audit; KPI sẽ được tính lại.</div>`:html`<div class="note small">Thời gian tự ghi theo thiết bị. Sửa giờ cần quyền IE/Lean và lý do (audit log).</div>`}
    <div class="grid g2" style="gap:10px">
      <${Field} label="Bắt đầu"><input class="inp" id="ae-s" type="datetime-local" step="1" value=${f.start} onInput=${e=>S('start',e.target.value)}/><//>
      <${Field} label="Kết thúc"><input class="inp" id="ae-e" type="datetime-local" step="1" value=${f.end} onInput=${e=>S('end',e.target.value)}/><//>
      <${Field} label="Delay code"><select class="inp" id="ae-d" value=${f.delayCode} onChange=${e=>S('delayCode',e.target.value)}><option value="">—</option>${(Store.config.delayCodes||[]).map(d=>html`<option value=${d.code}>${d.code} – ${d.reason}</option>`)}</select><//>
      <${Field} label="Nhóm hoạt động song song"><input class="inp" id="ae-g" value=${f.group} onInput=${e=>S('group',e.target.value)} placeholder="VD: P1"/><//>
    </div>
    <label class="chk"><input type="checkbox" checked=${f.downtime} onChange=${e=>S('downtime',e.target.checked)}/> Ảnh hưởng downtime</label>
    <${Field} label="Ghi chú / nguyên nhân / hành động"><textarea class="inp" id="ae-c" value=${f.comment} onInput=${e=>S('comment',e.target.value)}></textarea><//>
    <${Field} label="Lý do sửa thời gian" hint="Bắt buộc nếu thay đổi giờ bắt đầu/kết thúc"><input class="inp" id="ae-r" value=${f.reason} onInput=${e=>S('reason',e.target.value)}/><//>
  <//>`;
}

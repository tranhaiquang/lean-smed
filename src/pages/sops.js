/* ===================== 4.9 STANDARD WORK / SOP ===================== */
const SOP_COLS = [{k:'seq',l:'TT',type:'number',w:60},{k:'text',l:'Bước thao tác',w:260},{k:'type',l:'Loại',type:'select',options:[{v:'Internal',l:'Internal'},{v:'External',l:'External'}],w:110},{k:'stdMin',l:'Chuẩn (phút)',type:'number',w:90},{k:'tooling',l:'Tooling/vật tư · vị trí',w:180},{k:'safety',l:'An toàn',w:140},{k:'quality',l:'Chất lượng',w:140},{k:'startEnd',l:'Điều kiện bắt đầu/kết thúc',w:180}];
function SopLibrary(){
  const sops=vals(Store.data.sops).sort(by('code'));
  const add=async()=>{ const r=await ask({title:'Tạo SOP changeover', fields:[{k:'code',label:'SOP ID',required:true},{k:'name',label:'Tên SOP',required:true},{k:'lineType',label:'Loại chuyền'}]}); if(!r) return;
    const id='SOP-'+uid(); const rk='R'+uid(); await Store.set('sops',id,{id, code:r.code.trim().toUpperCase(), name:r.name, lineType:r.lineType, models:[], owner:me().id, status:'Active', createdAt:Date.now(), revisions:{[rk]:{key:rk, rev:'1', status:'Draft', steps:[], createdBy:me().id, createdAt:Date.now()}}});
    logGlobal('sop.create', id, {after:r.code}); go('sop-'+id); };
  return html`<div class="col"><div class="row-sb"><h1>Standard Work / SOP</h1>${can('sop.edit')?html`<button class="btn btn-primary" onClick=${add}><${Icon} n="plus"/>Tạo SOP</button>`:''}</div>
    ${sops.length?html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>SOP ID</th><th>Tên</th><th>Áp dụng model</th><th>Rev hiệu lực</th><th class="r">Bước</th><th class="r">Internal′</th><th>Owner</th><th>Review</th></tr></thead><tbody>
      ${sops.map(s=>{ const r=effectiveSop(s); const due=r?.reviewDate && dayStart(r.reviewDate)<Date.now()+14*86400000; return html`<tr class="click" onClick=${()=>go('sop-'+s.id)}><td class="mono"><b>${s.code}</b> <${Demo} on=${s.isDemo}/></td><td>${s.name}</td><td class="small">${(s.models||[]).map(x=>x==='*'?'Tất cả':modelLabel(x)).join(', ')||'—'}</td><td>${r?r.rev:html`<span class="pill p-amber">Chưa duyệt</span>`}</td><td class="r">${r?.steps?.length||0}</td><td class="r num">${r?sum((r.steps||[]).filter(x=>x.type!=='External').map(x=>+x.stdMin||0)):'—'}</td><td>${userName(s.owner)}</td><td class=${due?'t-int':''}>${r?.reviewDate||'—'}</td></tr>`; })}</tbody></table></div>`
      :html`<${Empty} title="Chưa có SOP">SOP được gắn với model sẽ cung cấp danh sách bước và standard time cho màn hình bấm giờ.<//>`}</div>`;
}
function SopDetail({id}){
  const s=Store.data.sops[id]; const [sel,setSel]=useState(null); const [draft,setDraft]=useState(null);
  const revs=vals(s?.revisions).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)); const eff=effectiveSop(s);
  const cur=sel?s?.revisions?.[sel]:(revs.find(r=>r.status==='Draft')||eff||revs[revs.length-1]); const key=cur?.key;
  const editable=cur?.status==='Draft' && can('sop.edit');
  useEffect(()=>{ setDraft(cur?clone(cur):null); },[key, cur?.status, s?.revisions?.[key]]);
  if(!s) return html`<${Empty} title="Không tìm thấy SOP"><a href="#sops">Về thư viện SOP</a><//>`;
  const used=vals(Store.data.changeovers).filter(c=>c.refs?.sop?.id===s.id).length;
  const save=async()=>{ await Store.update('sops',s.id,{revisions:{[key]:{steps:draft.steps, tools:draft.tools||'', reviewer:draft.reviewer||null, notes:draft.notes||'', updatedAt:Date.now()}}}); logGlobal('sop.rev.save', s.id+'/'+cur.rev,{}); toast('Đã lưu','ok'); };
  const approve=async()=>{ if(!can('sop.approve')) return toast('Chỉ Lean Manager duyệt SOP.','bad'); if(!draft.steps?.length) return toast('SOP chưa có bước.','bad');
    const r=await ask({title:`Duyệt SOP ${s.code} rev ${cur.rev}`, fields:[{k:'eff',label:'Ngày hiệu lực',type:'date',required:true,value:todayStr()},{k:'rev',label:'Ngày review/hết hạn',type:'date',required:true,value:todayStr(Date.now()+180*86400000)}]}); if(!r) return;
    await Store.update('sops',s.id,{revisions:{[key]:{steps:draft.steps, tools:draft.tools||'', status:'Approved', effectiveFrom:r.eff, reviewDate:r.rev, approver:me().id, approvedAt:Date.now()}}}); logGlobal('sop.rev.approve', s.id+'/'+cur.rev, {after:r.eff}); toast('Đã duyệt SOP','ok'); };
  const newRev=async()=>{ const rk='R'+uid(); const rv=String((parseInt(revs.map(x=>x.rev).pop(),10)||revs.length)+1); await Store.update('sops',s.id,{revisions:{[rk]:{key:rk, rev:rv, status:'Draft', steps:clone(eff?.steps||[]), tools:eff?.tools||'', createdBy:me().id, createdAt:Date.now()}}}); setSel(rk); };
  const setModels=async()=>{ const r=await ask({title:'Model áp dụng', body:'Nhập mã model cách nhau bởi dấu phẩy, hoặc * cho tất cả. Mã hiện có: '+vals(Store.data.models).map(m=>m.code).join(', '), fields:[{k:'m',label:'Mã model',value:(s.models||[]).map(x=>x==='*'?'*':modelLabel(x)).join(', ')}]}); if(!r) return;
    const codes=r.m.split(',').map(x=>x.trim().toUpperCase()).filter(Boolean); const ids=codes.map(c=>c==='*'?'*':vals(Store.data.models).find(m=>m.code.toUpperCase()===c)?.id).filter(Boolean);
    await Store.update('sops',s.id,{models:ids}); logGlobal('sop.models', s.id, {after:codes.join(',')}); };
  return html`<div class="col"><div class="row"><button class="btn btn-ghost btn-sm" onClick=${()=>go('sops')}><${Icon} n="back"/>Thư viện SOP</button></div>
    <div class="row-sb"><div><div class="row"><span class="mono muted">${s.code}</span><${Demo} on=${s.isDemo}/></div><h1>${s.name}</h1><div class="small muted">Loại chuyền ${s.lineType||'—'} · Owner ${userName(s.owner)} · Áp dụng: ${(s.models||[]).map(x=>x==='*'?'Tất cả model':modelLabel(x)).join(', ')||'chưa gán'} · dùng trong ${used} changeover</div></div>
      <div class="row">${can('sop.edit')?html`<button class="btn btn-sm" onClick=${setModels}>Gán model</button>`:''}${can('sop.edit')&&!revs.some(r=>r.status==='Draft')?html`<button class="btn btn-sm btn-primary" onClick=${newRev}>Tạo revision mới</button>`:''}</div></div>
    <div class="row">${revs.map(r=>html`<button class=${'btn btn-sm '+(r.key===key?'btn-primary':'')} onClick=${()=>setSel(r.key)}>Rev ${r.rev} · ${r.status==='Draft'?'Nháp':r===eff?'Hiệu lực':'Cũ'}</button>`)}</div>
    ${cur&&draft?html`<div class="card"><div class="card-h"><div><h3>Các bước – Rev ${cur.rev}</h3><div class="small muted">${cur.status==='Draft'?'Bản nháp':`Duyệt bởi ${userName(cur.approver)} · hiệu lực ${cur.effectiveFrom} · review ${cur.reviewDate}`}</div></div>
      ${editable?html`<div class="row"><button class="btn" onClick=${save}>Lưu nháp</button>${can('sop.approve')?html`<button class="btn btn-ok" onClick=${approve}>Duyệt SOP</button>`:''}</div>`:''}</div>
      <${RowsEditor} cols=${SOP_COLS} rows=${draft.steps||[]} readOnly=${!editable} onChange=${v=>setDraft({...draft,steps:v})} newRow=${i=>({seq:i+1, type:'Internal'})} addLabel="Thêm bước"/>
      <div class="row small muted" style="margin-top:8px">Tổng chuẩn internal: <b>${sum((draft.steps||[]).filter(x=>x.type!=='External').map(x=>+x.stdMin||0))} phút</b> · external: <b>${sum((draft.steps||[]).filter(x=>x.type==='External').map(x=>+x.stdMin||0))} phút</b></div>
      <${Field} label="Danh sách tooling / vật tư, vị trí lưu, mã nhận diện" style="margin-top:10px"><textarea class="inp" disabled=${!editable} value=${draft.tools||''} onInput=${e=>setDraft({...draft,tools:e.target.value})}></textarea><//>
      <div class="faint tiny" style="margin-top:6px">SOP đã dùng trong changeover không bị xóa; revision cũ được giữ để truy vết. Ảnh/video hướng dẫn: ghi mã tài liệu ở cột bước.</div></div>`:''}</div>`;
}
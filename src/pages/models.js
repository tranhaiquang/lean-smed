/* ===================== 4.8 MODEL LIBRARY ===================== */
const OP_COLS = [{k:'seq',l:'TT',type:'number',w:60},{k:'opCode',l:'Mã CĐ',w:80},{k:'op',l:'Công đoạn',w:200},{k:'machineType',l:'Loại máy',w:150},{k:'needle',l:'Kim',w:100},{k:'thread',l:'Chỉ',w:110},{k:'spi',l:'SPI',w:60},{k:'stitchType',l:'Kiểu mũi',w:100},{k:'tooling',l:'Tooling/cữ gá',w:140},{k:'skill',l:'Kỹ năng',w:90}];
const QC_COLS = [{k:'name',l:'Điểm kiểm tra',w:200},{k:'spec',l:'Spec',w:180},{k:'method',l:'Phương pháp',w:150},{k:'critical',l:'Critical',type:'check'}];
const nextRev = r => { if(!r) return 'A'; if(/^[A-Y]$/.test(r)) return String.fromCharCode(r.charCodeAt(0)+1); const n=parseInt(r,10); return isNaN(n)?r+'1':String(n+1); };

function ModelLibrary(){
  const [q,setQ]=useState(''); const ms=vals(Store.data.models).filter(m=>!q || [m.code,m.name,m.customer,m.article].join(' ').toLowerCase().includes(q.toLowerCase())).sort(by('code'));
  const add=async()=>{ const r=await ask({title:'Thêm model', fields:[{k:'code',label:'Mã model (duy nhất)',required:true},{k:'name',label:'Tên model',required:true},{k:'customer',label:'Khách hàng'},{k:'article',label:'Article'}]}); if(!r) return;
    const code=r.code.trim().toUpperCase(); if(vals(Store.data.models).some(m=>m.code.toUpperCase()===code)) return toast('Mã model đã tồn tại.','bad');
    const id='M-'+uid(); const rk='R'+uid(); await Store.set('models',id,{id, code, name:r.name, customer:r.customer, article:r.article, status:'Active', createdAt:Date.now(), createdBy:me().id, revisions:{[rk]:{key:rk, rev:'A', status:'Draft', ops:[], qcPoints:[], layout:{}, createdBy:me().id, createdAt:Date.now()}}});
    logGlobal('model.create', id, {after:code}); go('model-'+id); };
  return html`<div class="col"><div class="row-sb"><h1>Model Library</h1><div class="row"><button class="btn" onClick=${()=>go('compare')}><${Icon} n="swap"/>So sánh A/B</button>${can('model.edit')?html`<button class="btn btn-primary" onClick=${add}><${Icon} n="plus"/>Thêm model</button>`:''}</div></div>
    <input class="inp" id="ml-q" style="max-width:360px" placeholder="Tìm mã, tên, khách hàng, article…" value=${q} onInput=${e=>setQ(e.target.value)}/>
    ${ms.length?html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mã model</th><th>Tên</th><th>Khách hàng</th><th>Article</th><th>Rev hiệu lực</th><th>Hiệu lực từ</th><th class="r">Công đoạn</th><th>Trạng thái</th></tr></thead><tbody>
      ${ms.map(m=>{ const r=effectiveRev(m); const draft=vals(m.revisions).some(x=>x.status==='Draft'); return html`<tr class="click" onClick=${()=>go('model-'+m.id)}><td class="mono"><b>${m.code}</b> <${Demo} on=${m.isDemo}/></td><td>${m.name}</td><td>${m.customer||''}</td><td>${m.article||''}</td><td>${r?r.rev:html`<span class="pill p-amber">Chưa duyệt</span>`}${draft?html` <span class="tag">có bản nháp</span>`:''}</td><td class="num">${r?.effectiveFrom||'—'}</td><td class="r">${r?.ops?.length||0}</td><td>${m.status==='Active'?html`<span class="pill p-green">Active</span>`:html`<span class="pill p-grey">Inactive</span>`}</td></tr>`; })}</tbody></table></div>`
      :html`<${Empty} title="Chưa có model">Thêm model và nhập routing (có thể dán từ Excel) để dùng cho so sánh A/B và Quality Gate.<//>`}</div>`;
}
function ModelDetail({id}){
  const m=modelById(id);
  const [sel,setSel]=useState(null); const [draft,setDraft]=useState(null);
  const revs=vals(m?.revisions).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  const eff=effectiveRev(m);
  const cur=sel ? m?.revisions?.[sel] : (revs.find(r=>r.status==='Draft') || eff || revs[revs.length-1]);
  const key=cur?.key;
  const editable = cur?.status==='Draft' && can('model.edit');
  useEffect(()=>{ setDraft(cur?clone(cur):null); },[key, cur?.status, m?.revisions?.[key]]);
  if(!m) return html`<${Empty} title="Không tìm thấy model"><a href="#models">Về Model Library</a><//>`;
  const usedIn = vals(Store.data.changeovers).filter(c=>c.refs?.modelA?.revKey===key || c.refs?.modelB?.revKey===key).length;
  const save=async()=>{ await Store.update('models',m.id,{revisions:{[key]:{ops:draft.ops, qcPoints:draft.qcPoints, layout:draft.layout, notes:draft.notes||'', updatedAt:Date.now(), updatedBy:me().id}}}); logGlobal('model.rev.save', m.id+'/'+cur.rev, {}); toast('Đã lưu bản nháp','ok'); };
  const approve=async()=>{ if(!can('model.approve')) return toast('Chỉ IE/Lean duyệt revision routing.','bad');
    if(!draft.ops?.length) return toast('Revision chưa có công đoạn.','bad');
    const r=await ask({title:`Duyệt revision ${cur.rev} – ${m.code}`, body:'Sau khi duyệt, revision bị khóa. Changeover đã thực hiện vẫn tham chiếu revision cũ.', fields:[{k:'eff',label:'Ngày hiệu lực',type:'date',required:true,value:todayStr()},{k:'note',label:'Ghi chú phê duyệt'}]}); if(!r) return;
    await Store.update('models',m.id,{revisions:{[key]:{ops:draft.ops, qcPoints:draft.qcPoints, layout:draft.layout, status:'Approved', effectiveFrom:r.eff, approvedBy:me().id, approvedAt:Date.now(), approvalNote:r.note}}});
    logGlobal('model.rev.approve', m.id+'/'+cur.rev, {after:r.eff, reason:r.note}); toast('Đã duyệt revision '+cur.rev,'ok'); };
  const newRev=async()=>{ const base=eff||revs[revs.length-1]; const rk='R'+uid(); const rv=nextRev(revs.map(x=>x.rev).sort().pop()); await Store.update('models',m.id,{revisions:{[rk]:{key:rk, rev:rv, status:'Draft', ops:clone(base?.ops||[]), qcPoints:clone(base?.qcPoints||[]), layout:clone(base?.layout||{}), basedOn:base?.rev||null, createdBy:me().id, createdAt:Date.now()}}}); logGlobal('model.rev.create', m.id+'/'+rv, {}); setSel(rk); };
  const editInfo=async()=>{ const r=await ask({title:'Thông tin model', fields:[{k:'name',label:'Tên',value:m.name,required:true},{k:'customer',label:'Khách hàng',value:m.customer||''},{k:'article',label:'Article',value:m.article||''},{k:'status',label:'Trạng thái',type:'select',value:m.status,options:[{v:'Active',l:'Active'},{v:'Inactive',l:'Inactive'}],required:true}]}); if(r){ await Store.update('models',m.id,{name:r.name, customer:r.customer, article:r.article, status:r.status}); logGlobal('model.edit', m.id, {before:{name:m.name,status:m.status}, after:{name:r.name,status:r.status}}); } };
  return html`<div class="col">
    <div class="row"><button class="btn btn-ghost btn-sm" onClick=${()=>go('models')}><${Icon} n="back"/>Model Library</button></div>
    <div class="row-sb"><div><div class="row"><span class="mono muted">${m.code}</span><${Demo} on=${m.isDemo}/></div><h1>${m.name}</h1><div class="small muted">${m.customer||'—'} · Article ${m.article||'—'} · Rev hiệu lực: <b>${eff?.rev||'chưa có'}</b></div></div>
      <div class="row">${can('model.edit')?html`<button class="btn btn-sm" onClick=${editInfo}>Sửa thông tin</button>`:''}${can('model.edit') && !revs.some(r=>r.status==='Draft')?html`<button class="btn btn-sm btn-primary" onClick=${newRev}>Tạo revision mới</button>`:''}</div></div>
    <div class="row">${revs.map(r=>html`<button class=${'btn btn-sm '+(r.key===key?'btn-primary':'')} onClick=${()=>setSel(r.key)}>Rev ${r.rev} · ${r.status==='Draft'?'Nháp':r===eff?'Hiệu lực':r.effectiveFrom&&dayStart(r.effectiveFrom)>Date.now()?'Hiệu lực '+r.effectiveFrom:'Cũ'}</button>`)}</div>
    ${cur && draft?html`
      <div class="card"><div class="card-h"><div><h3>Routing – Rev ${cur.rev}</h3><div class="small muted">${cur.status==='Draft'?'Bản nháp – chưa dùng được cho changeover':`Duyệt bởi ${userName(cur.approvedBy)} ${fmtDT(cur.approvedAt)} · hiệu lực ${cur.effectiveFrom}`} ${usedIn?`· được tham chiếu bởi ${usedIn} changeover`:''}</div></div>
        ${editable?html`<div class="row"><button class="btn" onClick=${save}>Lưu nháp</button>${can('model.approve')?html`<button class="btn btn-ok" onClick=${approve}>Duyệt revision</button>`:''}</div>`:''}</div>
        <${RowsEditor} cols=${OP_COLS} rows=${draft.ops||[]} readOnly=${!editable} onChange=${v=>setDraft({...draft, ops:v})} newRow=${i=>({seq:(i+1)*10})} addLabel="Thêm công đoạn"/></div>
      <div class="grid g2">
        <div class="card"><div class="card-h"><h3>Quality checkpoints (control plan)</h3></div><${RowsEditor} cols=${QC_COLS} rows=${draft.qcPoints||[]} readOnly=${!editable} onChange=${v=>setDraft({...draft, qcPoints:v.map(x=>({...x, id:x.id||uid('QC')}))})} addLabel="Thêm điểm kiểm tra"/></div>
        <div class="card"><div class="card-h"><h3>Layout & nhân lực</h3></div><div class="grid g2" style="gap:10px">
          <${Field} label="Layout version"><input class="inp" disabled=${!editable} value=${draft.layout?.version||''} onInput=${e=>setDraft({...draft, layout:{...draft.layout, version:e.target.value}})}/><//>
          <${Field} label="Số người"><input class="inp" type="number" disabled=${!editable} value=${draft.layout?.workers??''} onInput=${e=>setDraft({...draft, layout:{...draft.layout, workers:e.target.value===''?null:+e.target.value}})}/><//>
          <${Field} label="Yêu cầu kỹ năng" style="grid-column:1/-1"><textarea class="inp" disabled=${!editable} value=${draft.layout?.skill||''} onInput=${e=>setDraft({...draft, layout:{...draft.layout, skill:e.target.value}})}></textarea><//></div></div>
      </div>`:html`<${Empty} title="Chưa có revision"><//>`}
  </div>`;
}
function ComparePage(){
  const ms=vals(Store.data.models).sort(by('code'));
  const [a,setA]=useState(''); const [b,setB]=useState(''); const [ra,setRa]=useState(''); const [rb,setRb]=useState(''); const [onlyDiff,setOnly]=useState(true);
  const mA=modelById(a), mB=modelById(b);
  const revA = ra ? mA?.revisions?.[ra] : effectiveRev(mA); const revB = rb ? mB?.revisions?.[rb] : effectiveRev(mB);
  const rows = a&&b ? compareRevs(revA, revB) : [];
  const list = onlyDiff?rows.filter(r=>r.status!=='No change'):rows;
  const revSel=(m,v,set)=>html`<select class="inp" value=${v} onChange=${e=>set(e.target.value)}><option value="">Rev đang hiệu lực</option>${vals(m?.revisions).map(r=>html`<option value=${r.key}>Rev ${r.rev} (${r.status})</option>`)}</select>`;
  return html`<div class="col"><div class="row"><button class="btn btn-ghost btn-sm" onClick=${()=>go('models')}><${Icon} n="back"/>Model Library</button></div><h1>So sánh Model A / B</h1>
    <div class="card"><div class="grid g2" style="gap:10px">
      <div class="col" style="gap:8px"><${Field} label="Model A"><select class="inp" id="cp-a" value=${a} onChange=${e=>{setA(e.target.value);setRa('');}}><option value="">— chọn —</option>${ms.map(m=>html`<option value=${m.id}>${m.code} · ${m.name}</option>`)}</select><//>${a?revSel(mA,ra,setRa):''}</div>
      <div class="col" style="gap:8px"><${Field} label="Model B"><select class="inp" id="cp-b" value=${b} onChange=${e=>{setB(e.target.value);setRb('');}}><option value="">— chọn —</option>${ms.map(m=>html`<option value=${m.id}>${m.code} · ${m.name}</option>`)}</select><//>${b?revSel(mB,rb,setRb):''}</div></div></div>
    ${a&&b?html`<div class="row-sb"><div class="row small"><span class="pill p-amber">${rows.filter(r=>r.status==='Change required').length} Change required</span><span class="pill p-violet">${rows.filter(r=>r.status==='Verify').length} Verify</span><span class="pill p-grey">${rows.filter(r=>r.status==='No change').length} No change</span></div><label class="chk"><input type="checkbox" checked=${onlyDiff} onChange=${e=>setOnly(e.target.checked)}/> Chỉ khác biệt</label></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Công đoạn</th><th>Thuộc tính</th><th>A · rev ${revA?.rev||'—'}</th><th>B · rev ${revB?.rev||'—'}</th><th>Trạng thái</th></tr></thead><tbody>${list.map(r=>html`<tr><td><b>${r.op}</b></td><td>${r.field}</td><td class=${r.status!=='No change'?'diff-a':''}>${r.a}</td><td class=${r.status!=='No change'?'diff-b':''}>${r.b}</td><td><span class=${'pill '+(r.status==='No change'?'p-grey':r.status==='Verify'?'p-violet':'p-amber')}>${r.status}</span></td></tr>`)}</tbody></table></div>`
      :html`<div class="muted small">Chọn hai model để so sánh routing, máy, kim/chỉ/SPI, tooling, layout và điểm kiểm tra chất lượng.</div>`}</div>`;
}

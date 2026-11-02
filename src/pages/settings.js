/* ===================== SETTINGS ===================== */
async function saveCfg(key, value, label){
  const before=Store.config[key];
  await Store.updateConfig({[key]:value});
  logGlobal('config.'+key, 'config', {before: Array.isArray(before)?`${before.length} dòng`:before, after: Array.isArray(value)?`${value.length} dòng`:value});
  toast('Đã lưu '+(label||key),'ok');
}
function CfgList({k, cols, label, perm='config.lean', newRow, validate}){
  const [rows,setRows]=useState(()=>clone(Store.config[k]||[]));
  const dirty=JSON.stringify(rows)!==JSON.stringify(Store.config[k]||[]);
  const ok=can(perm);
  const save=()=>{ const err=validate&&validate(rows); if(err) return toast(err,'bad'); saveCfg(k, rows, label); };
  return html`<div class="card"><div class="card-h"><h3>${label}</h3>${ok?html`<div class="row">${dirty?html`<span class="small t-wait">Chưa lưu</span><button class="btn btn-sm btn-ghost" onClick=${()=>setRows(clone(Store.config[k]||[]))}>Hoàn tác</button>`:''}<button class="btn btn-primary btn-sm" disabled=${!dirty} onClick=${save}>Lưu</button></div>`:html`<span class="small muted">Chỉ xem</span>`}</div>
    <${RowsEditor} cols=${cols} rows=${rows} onChange=${setRows} readOnly=${!ok} newRow=${newRow}/></div>`;
}
const uniq = (key,label) => rows => { const s=new Set(); for(const r of rows){ const v=String(r[key]||'').trim(); if(!v) return `${label} không được trống`; if(s.has(v)) return `${label} trùng: ${v}`; s.add(v); } return null; };

function Settings(){
  const tabs=[
    {v:'users',l:'Người dùng',p:'config.system'},{v:'site',l:'Nhà máy & chuyền',p:'config.system'},{v:'codes',l:'Delay & mã lỗi',p:'config.lean'},
    {v:'check',l:'Checklist mẫu',p:'config.lean'},{v:'acts',l:'Thư viện hoạt động',p:'config.lean'},{v:'std',l:'Standard time',p:null},
    {v:'kpi',l:'KPI, cảnh báo, ổn định',p:'config.lean'},{v:'assets',l:'Máy & tooling',p:null},{v:'perm',l:'Phân quyền',p:null},
    {v:'audit',l:'Audit log',p:null},{v:'data',l:'Sao lưu & dữ liệu',p:null},{v:'me',l:'Tài khoản của tôi',p:null}];
  const [t,setT]=useState(can('config.system')?'users':can('config.lean')?'codes':'me');
  return html`<div class="col"><h1>Cài đặt</h1><${Tabs} value=${t} onChange=${setT} tabs=${tabs}/>
    ${t==='users'?html`<${UsersAdmin}/>`:''}
    ${t==='site'?html`<${SiteAdmin}/>`:''}
    ${t==='codes'?html`<div class="col"><${CfgList} k="delayCodes" label="Delay reason (Phụ lục A)" validate=${uniq('code','Code')} cols=${[{k:'code',l:'Code',w:90},{k:'reason',l:'Lý do',w:280},{k:'owner',l:'Owner group',w:160}]}/>
      <${CfgList} k="defectCodes" label="Danh mục mã lỗi chất lượng" validate=${uniq('code','Mã lỗi')} cols=${[{k:'code',l:'Mã',w:80},{k:'name',l:'Mô tả',w:260},{k:'severity',l:'Severity',type:'select',options:['Critical','Major','Minor'].map(v=>({v,l:v}))}]}/></div>`:''}
    ${t==='check'?html`<div class="col"><div class="note small">Checklist mẫu được sao chép vào mỗi changeover mới. Hạn = giờ dừng chuyền − số phút. Hạng mục Critical không được bỏ qua nếu chưa có exception được duyệt.</div>
      <${CfgList} k="checklistTemplate" label="Checklist trước changeover (Phụ lục B)" validate=${uniq('id','ID')} newRow=${i=>({id:'T'+pad(i+1), type:'External', cat:'Material', ownerRole:'leader', dueOffsetMin:30})} cols=${[{k:'id',l:'ID',w:60},{k:'cat',l:'Nhóm',type:'select',options:CATEGORIES.map(c=>({v:c,l:CAT_VN[c]}))},{k:'desc',l:'Hạng mục',w:220},{k:'type',l:'Loại',type:'select',options:['External','Internal','Verification'].map(v=>({v,l:v}))},{k:'ownerRole',l:'Owner',type:'select',options:Object.entries(ROLES).map(([v,l])=>({v,l}))},{k:'critical',l:'Critical',type:'check'},{k:'dueOffsetMin',l:'Hạn (phút trước dừng)',type:'number',w:90},{k:'acceptance',l:'Tiêu chí chấp nhận',w:240}]}/></div>`:''}
    ${t==='acts'?html`<div class="col"><div class="note small">Thư viện hoạt động chuẩn dùng khi changeover chưa gắn SOP. Nếu SOP của model B đã duyệt, màn hình bấm giờ dùng các bước trong SOP.</div>
      <${CfgList} k="activityLibrary" label="Thư viện hoạt động chuẩn" validate=${uniq('id','ID')} newRow=${i=>({id:'A'+pad(i+1), type:'Internal'})} cols=${[{k:'id',l:'ID',w:60},{k:'name',l:'Hoạt động',w:280},{k:'type',l:'Loại',type:'select',options:Object.keys(ACT_TYPES).map(v=>({v,l:ACT_TYPES[v].l}))},{k:'stdMin',l:'Chuẩn (phút)',type:'number',w:90}]}/></div>`:''}
    ${t==='std'?html`<${StandardsAdmin}/>`:''}
    ${t==='kpi'?html`<${KpiAdmin}/>`:''}
    ${t==='assets'?html`<div class="col"><${CfgList} k="machines" label="Máy" perm="model.edit" validate=${uniq('id','Machine ID')} cols=${[{k:'id',l:'Machine ID',w:100},{k:'type',l:'Loại máy',w:160},{k:'location',l:'Vị trí / chuyền',w:140},{k:'status',l:'Tình trạng',type:'select',options:['Sẵn sàng','Đang dùng','Bảo trì','Hỏng'].map(v=>({v,l:v}))},{k:'maint',l:'Mã bảo trì',w:120}]}/>
      <${CfgList} k="tooling" label="Tooling / cữ gá / folder / chân vịt" perm="model.edit" validate=${uniq('id','Tooling ID')} cols=${[{k:'id',l:'Tooling ID',w:100},{k:'type',l:'Loại',w:140},{k:'models',l:'Model/công đoạn tương thích',w:200},{k:'location',l:'Vị trí lưu',w:140},{k:'condition',l:'Tình trạng',type:'select',options:['Tốt','Cần sửa','Hỏng'].map(v=>({v,l:v}))}]}/></div>`:''}
    ${t==='perm'?html`<${PermMatrix}/>`:''}
    ${t==='audit'?html`<${AuditAdmin}/>`:''}
    ${t==='data'?html`<${DataAdmin}/>`:''}
    ${t==='me'?html`<${MyAccount}/>`:''}
  </div>`;
}
function UsersAdmin(){
  const users=Store.config.users||[]; const ok=can('config.system'); const [q,setQ]=useState('');
  const edit=async(u)=>{ const isNew=!u; const lines=(Store.config.lines||[]).map(l=>l.id).join(', ');
    const r=await ask({title:isNew?'Thêm người dùng':'Sửa '+u.name, body:`Phạm vi chuyền: nhập * cho toàn bộ, hoặc mã chuyền cách nhau dấu phẩy (${lines}).`, fields:[{k:'name',label:'Họ tên',required:true,value:u?.name||''},{k:'code',label:'Mã nhân viên',value:u?.code||''},{k:'role',label:'Vai trò',type:'select',required:true,value:u?.role||'',options:Object.entries(ROLES).map(([v,l])=>({v,l}))},{k:'lines',label:'Phạm vi chuyền',required:true,value:(u?.lines||['*']).join(', ')},...(isNew?[{k:'pin',label:'PIN tạm (4–8 số, người dùng đổi khi đăng nhập lần đầu)',required:true}]:[]),{k:'active',label:'Trạng thái',type:'select',value:u&&u.active===false?'0':'1',options:[{v:'1',l:'Active'},{v:'0',l:'Ngưng'}],required:true}]});
    if(!r) return; if(isNew && !/^\d{4,8}$/.test(r.pin)) return toast('PIN gồm 4–8 chữ số.','bad');
    const sc=r.lines.split(',').map(x=>x.trim()).filter(Boolean);
    let list;
    if(isNew){ const id='U-'+uid(); list=[...users,{id, name:r.name.trim(), code:r.code, role:r.role, lines:sc.length?sc:['*'], active:r.active==='1', pinHash:await hashPin(id,r.pin), mustChangePin:true, createdAt:Date.now(), createdBy:me().id}]; }
    else { if(u.id===me().id && r.active!=='1') return toast('Không thể tự ngưng tài khoản đang đăng nhập.','bad'); list=users.map(x=>x.id===u.id?{...x, name:r.name.trim(), code:r.code, role:r.role, lines:sc.length?sc:['*'], active:r.active==='1'}:x); }
    if(!list.some(x=>x.role==='admin'&&x.active!==false)) return toast('Cần ít nhất một System Admin đang active.','bad');
    await Store.updateConfig({users:list}); logGlobal(isNew?'user.create':'user.edit', r.name, {before:u?{role:u.role,lines:u.lines,active:u.active}:null, after:{role:r.role,lines:sc,active:r.active==='1'}}); toast('Đã lưu người dùng','ok'); };
  const resetPin=async(u)=>{ const r=await ask({title:'Đặt lại PIN cho '+u.name, fields:[{k:'pin',label:'PIN tạm mới',required:true}]}); if(!r) return; if(!/^\d{4,8}$/.test(r.pin)) return toast('PIN gồm 4–8 chữ số.','bad'); const h=await hashPin(u.id,r.pin); await Store.updateConfig({users:users.map(x=>x.id===u.id?{...x,pinHash:h,mustChangePin:true}:x)}); logGlobal('user.pin.reset', u.id, {}); toast('Đã đặt lại PIN','ok'); };
  const [imp,setImp]=useState(false); const [txt,setTxt]=useState('');
  const roleOf = v => { const x=String(v||'').trim().toLowerCase(); if(ROLES[x]) return x; const hit=Object.entries(ROLES).find(([k,l])=>l.toLowerCase()===x); if(hit) return hit[0];
    const alias={'tổ trưởng':'leader','to truong':'leader','line leader':'leader','ie':'ie','kỹ thuật':'tech','ky thuat':'tech','technician':'tech','qa':'qa','qc':'qa','kho':'material','material':'material','công nhân':'operator','cong nhan':'operator','operator':'operator','lean':'lean','quản đốc':'prod','quan doc':'prod','production':'prod','admin':'admin','giám đốc':'mgmt','management':'mgmt'}; return alias[x]||null; };
  const preview = txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{ const c=l.split('\t').map(x=>x.trim()); const role=roleOf(c[2]); const lines=(c[3]||'*').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean); const pin=c[4]||''; const bad=[]; if(!c[0]) bad.push('thiếu tên'); if(!role) bad.push('vai trò không hợp lệ'); if(!/^\d{4,8}$/.test(pin)) bad.push('PIN 4–8 số'); const lineIds=(Store.config.lines||[]).map(x=>x.id); lines.forEach(x=>{ if(x!=='*' && !lineIds.includes(x)) bad.push('không có chuyền '+x); }); if(c[1] && users.some(u=>u.code && u.code.toUpperCase()===c[1].toUpperCase())) bad.push('trùng mã NV'); return {name:c[0], code:c[1]||'', role, lines, pin, bad}; });
  const doImport=async()=>{ const good=preview.filter(r=>!r.bad.length); if(!good.length) return toast('Không có dòng hợp lệ.','bad');
    const add=[]; for(const r of good){ const id='U-'+uid(); add.push({id, name:r.name, code:r.code, role:r.role, lines:r.lines, active:true, pinHash:await hashPin(id,r.pin), mustChangePin:true, createdAt:Date.now(), createdBy:me().id}); }
    await Store.updateConfig({users:[...users,...add]}); logGlobal('user.import','users',{after:`${add.length} người`}); toast(`Đã thêm ${add.length} người dùng`,'ok'); setTxt(''); setImp(false); };
  const list=users.filter(u=>!q||(u.name+' '+(u.code||'')+' '+ROLES[u.role]).toLowerCase().includes(q.toLowerCase()));
  const roleCounts=Object.keys(ROLES).map(r=>[r,users.filter(u=>u.role===r&&u.active!==false).length]);
  return html`<div class="card"><div class="card-h"><h3>Người dùng (${users.length})</h3><div class="row"><input class="inp sm" placeholder="Tìm…" value=${q} onInput=${e=>setQ(e.target.value)}/>${ok?html`<button class="btn btn-sm" onClick=${()=>setImp(!imp)}>Nhập từ Excel</button><button class="btn btn-primary btn-sm" onClick=${()=>edit(null)}><${Icon} n="plus"/>Thêm</button>`:''}</div></div>
    <div class="row" style="margin-bottom:10px;gap:6px">${roleCounts.map(([r,n])=>html`<span class=${'tag'+(n?'':' crit')}>${ROLES[r]}: ${n}</span>`)}</div>
    ${imp&&ok?html`<div class="note" style="margin-bottom:12px"><b>Nhập nhiều người dùng</b><div class="small muted" style="margin:4px 0 8px">Trong Excel chuẩn bị 5 cột theo thứ tự: <b>Họ tên | Mã NV | Vai trò | Phạm vi chuyền | PIN tạm</b>, chọn các dòng (không lấy dòng tiêu đề), Copy rồi dán vào ô dưới.<br/>Vai trò: ${Object.values(ROLES).join(', ')} (hoặc: tổ trưởng, kỹ thuật, QC, kho, công nhân, quản đốc). Phạm vi chuyền: * = tất cả, hoặc mã cách nhau dấu phẩy (${(Store.config.lines||[]).map(l=>l.id).join(', ')}).</div>
      <textarea class="inp" style="min-height:120px;font-family:var(--f-mono);font-size:12px" placeholder=${'Lê Văn Tâm\tLL01\tLine Leader\tL01\t1234'} value=${txt} onInput=${e=>setTxt(e.target.value)}></textarea>
      ${preview.length?html`<div class="tbl-wrap" style="margin-top:8px"><table class="tbl"><thead><tr><th>Họ tên</th><th>Mã NV</th><th>Vai trò</th><th>Chuyền</th><th>Kiểm tra</th></tr></thead><tbody>${preview.map(r=>html`<tr><td>${r.name}</td><td class="mono small">${r.code}</td><td>${r.role?ROLES[r.role]:'—'}</td><td class="small">${r.lines.join(', ')}</td><td>${r.bad.length?html`<span class="pill p-red">${r.bad.join('; ')}</span>`:html`<span class="pill p-green">OK</span>`}</td></tr>`)}</tbody></table></div>
        <div class="row" style="margin-top:8px"><button class="btn btn-primary" onClick=${doImport}>Thêm ${preview.filter(r=>!r.bad.length).length} người dùng hợp lệ</button><span class="small muted">Mọi người phải đổi PIN ở lần đăng nhập đầu.</span></div>`:''}</div>`:''}
    <div class="note small" style="margin-bottom:10px">Mỗi người một tài khoản và PIN riêng – không dùng chung. PIN chỉ lưu dạng băm. ${Store.mode==='cloud'?'Quyền ghi dữ liệu còn được kiểm soát bởi chia sẻ artifact trên claude.ai (Contributor trở lên mới ghi được).':''}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Họ tên</th><th>Mã NV</th><th>Vai trò</th><th>Phạm vi chuyền</th><th>Trạng thái</th><th></th></tr></thead><tbody>${list.map(u=>html`<tr><td><b>${u.name}</b> <${Demo} on=${u.isDemo}/></td><td class="mono small">${u.code||''}</td><td>${ROLES[u.role]}</td><td class="small">${(u.lines||[]).join(', ')}</td><td>${u.active===false?html`<span class="pill p-grey">Ngưng</span>`:html`<span class="pill p-green">Active</span>`}${u.mustChangePin?html` <span class="tag">chờ đổi PIN</span>`:''}</td>
      <td>${ok?html`<div class="row" style="gap:4px"><button class="btn btn-sm" onClick=${()=>edit(u)}>Sửa</button><button class="btn btn-sm btn-ghost" onClick=${()=>resetPin(u)}>Đặt lại PIN</button></div>`:''}</td></tr>`)}</tbody></table></div></div>`;
}
function SiteAdmin(){
  const [site,setSite]=useState(clone(Store.config.site||{})); const [hrs,setHrs]=useState(Store.config.sessionHours||10);
  return html`<div class="col"><div class="card"><div class="card-h"><h3>Site</h3><button class="btn btn-primary btn-sm" onClick=${async()=>{ await Store.updateConfig({site, sessionHours:+hrs||10}); logGlobal('config.site','config',{after:site.name}); toast('Đã lưu','ok'); }}>Lưu</button></div>
    <div class="grid g3" style="gap:10px"><${Field} label="Mã site"><input class="inp" value=${site.id} onInput=${e=>setSite({...site,id:e.target.value})}/><//><${Field} label="Tên site"><input class="inp" value=${site.name} onInput=${e=>setSite({...site,name:e.target.value})}/><//><${Field} label="Múi giờ"><input class="inp" value=${site.timezone} onInput=${e=>setSite({...site,timezone:e.target.value})}/><//>
      <${Field} label="Tự đăng xuất sau (giờ)" hint="Khuyến nghị bằng độ dài ca"><input class="inp" type="number" min="1" value=${hrs} onInput=${e=>setHrs(e.target.value)}/><//></div></div>
    <${CfgList} k="lines" label="Chuyền sản xuất" perm="config.system" validate=${uniq('id','Mã chuyền')} newRow=${i=>({id:'L'+pad(i+1), status:'Active', shifts:['S1','S2']})} cols=${[{k:'id',l:'Mã',w:70},{k:'name',l:'Tên chuyền',w:180},{k:'building',l:'Building',w:120},{k:'floor',l:'Tầng',w:90},{k:'shifts',l:'Ca áp dụng (S1,S2)',type:'csv',w:130},{k:'status',l:'Trạng thái',type:'select',options:[{v:'Active',l:'Active'},{v:'Inactive',l:'Inactive'}]}]}/>
    <${CfgList} k="shifts" label="Ca sản xuất" perm="config.system" validate=${uniq('id','Mã ca')} cols=${[{k:'id',l:'Mã',w:70},{k:'name',l:'Tên ca',w:120},{k:'start',l:'Bắt đầu (HH:MM)',w:110},{k:'end',l:'Kết thúc (HH:MM)',w:110}]}/></div>`;
}
function StandardsAdmin(){
  const list=(Store.config.standards||[]); const models=vals(Store.data.models);
  const mOpt=[{v:'*',l:'* (mọi model)'},...models.map(m=>({v:m.id,l:m.code}))]; const lOpt=[{v:'*',l:'* (mọi chuyền)'},...(Store.config.lines||[]).map(l=>({v:l.id,l:l.name}))];
  const add=async(base)=>{ if(!can('standard.edit')) return toast('Chỉ IE/Lean đề xuất standard.','bad');
    const r=await ask({title:base?'Revision mới cho '+base.id:'Đề xuất standard time', fields:[{k:'lineId',label:'Chuyền',type:'select',required:true,value:base?.lineId||'*',options:lOpt},{k:'modelA',label:'Model A',type:'select',required:true,value:base?.modelA||'*',options:mOpt},{k:'modelB',label:'Model B',type:'select',required:true,value:base?.modelB||'*',options:mOpt},{k:'targetMin',label:'Target internal (phút)',type:'number',required:true,value:base?.targetMin??''},{k:'baselineMin',label:'Baseline (phút)',type:'number',value:base?.baselineMin??''},{k:'effectiveFrom',label:'Hiệu lực từ',type:'date',required:true,value:todayStr()},{k:'note',label:'Cơ sở (time study, số mẫu…)',value:''}]});
    if(!r) return; const s={id: base?.id || 'STD-'+String(list.length+1).padStart(3,'0'), rev: base?(+base.rev||1)+1:1, lineId:r.lineId, modelA:r.modelA, modelB:r.modelB, targetMin:+r.targetMin, baselineMin:r.baselineMin===''?null:+r.baselineMin, effectiveFrom:r.effectiveFrom, status:'Draft', proposedBy:me().id, proposedAt:Date.now(), note:r.note};
    await Store.updateConfig({standards:[...list, s]}); logGlobal('standard.propose', s.id+' rev '+s.rev, {after:s.targetMin}); toast('Đã đề xuất – chờ phê duyệt','ok'); };
  const approve=async(s,i)=>{ if(!can('standard.approve')) return toast('Chỉ Lean Manager (hoặc IE được ủy quyền) duyệt standard.','bad'); if(s.proposedBy===me().id) return toast('Không tự duyệt đề xuất của chính mình.','bad');
    const n=list.map((x,j)=>{ if(j===i) return {...x, status:'Approved', approvedBy:me().id, approvedAt:Date.now()}; if(x.id===s.id && x.status==='Approved' && !x.effectiveTo) return {...x, effectiveTo:s.effectiveFrom}; return x; });
    await Store.updateConfig({standards:n}); logGlobal('standard.approve', s.id+' rev '+s.rev, {after:s.targetMin}); toast('Đã duyệt','ok'); };
  const lab=(v,o)=>o.find(x=>x.v===v)?.l||v;
  return html`<div class="card"><div class="card-h"><h3>Standard time & baseline (StandardVersion)</h3>${can('standard.edit')?html`<button class="btn btn-primary btn-sm" onClick=${()=>add(null)}><${Icon} n="plus"/>Đề xuất</button>`:''}</div>
    <div class="note small" style="margin-bottom:10px">Target khi lập kế hoạch lấy từ standard được duyệt, cụ thể nhất (chuyền > model B > model A) và đang hiệu lực. Mỗi changeover lưu ID/revision standard đã dùng. Revision cũ không bị xóa.</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Rev</th><th>Chuyền</th><th>Model A</th><th>Model B</th><th class="r">Target′</th><th class="r">Baseline′</th><th>Hiệu lực</th><th>Trạng thái</th><th>Cơ sở</th><th></th></tr></thead><tbody>
      ${list.map((s,i)=>html`<tr><td class="mono">${s.id} <${Demo} on=${s.isDemo}/></td><td>${s.rev}</td><td>${lab(s.lineId,lOpt)}</td><td>${lab(s.modelA,mOpt)}</td><td>${lab(s.modelB,mOpt)}</td><td class="r num">${s.targetMin}</td><td class="r num">${s.baselineMin??'—'}</td><td class="small">${s.effectiveFrom}${s.effectiveTo?' → '+s.effectiveTo:''}</td>
        <td>${s.status==='Approved'?html`<span class="pill p-green">Approved</span><div class="tiny muted">${userName(s.approvedBy)}</div>`:html`<span class="pill p-amber">Draft</span><div class="tiny muted">${userName(s.proposedBy)}</div>`}</td><td class="small">${s.note||''}</td>
        <td><div class="row" style="gap:4px">${s.status==='Draft'&&can('standard.approve')?html`<button class="btn btn-sm btn-ok" onClick=${()=>approve(s,i)}>Duyệt</button>`:''}${s.status==='Approved'&&!s.effectiveTo&&can('standard.edit')?html`<button class="btn btn-sm" onClick=${()=>add(s)}>Revision mới</button>`:''}</div></td></tr>`)}</tbody></table></div>
    <label class="chk" style="margin-top:10px"><input type="checkbox" disabled=${!can('config.lean')} checked=${!!Store.config.ideDelegateStandard} onChange=${e=>{ Store.updateConfig({ideDelegateStandard:e.target.checked}); logGlobal('config.ideDelegate','config',{after:e.target.checked}); }}/> Ủy quyền IE Engineer phê duyệt standard time</label></div>`;
}
function KpiAdmin(){
  const c=Store.config; const [kpi,setKpi]=useState(clone(c.kpi||{})); const [al,setAl]=useState(clone(c.alerts||{default:{},byLine:{}})); const [sc,setSc]=useState(clone(c.stableCriteria||{default:{},byLine:{}}));
  const ok=can('config.lean');
  const num=(obj,set,path,k,label,hint)=>html`<${Field} label=${label} hint=${hint}><input class="inp" type="number" disabled=${!ok} value=${obj[path]?.[k]??''} onInput=${e=>set({...obj,[path]:{...(obj[path]||{}),[k]:e.target.value===''?undefined:+e.target.value}})}/><//>`;
  const lineRow=(obj,set,lid,keys)=>html`<tr><td><b>${lineName(lid)}</b></td>${keys.map(k=>html`<td><input class="inp sm" type="number" style="width:90px" disabled=${!ok} placeholder=${obj.default?.[k]??''} value=${obj.byLine?.[lid]?.[k]??''} onInput=${e=>{ const v=e.target.value===''?undefined:+e.target.value; const bl={...(obj.byLine||{})}; bl[lid]={...(bl[lid]||{}),[k]:v}; set({...obj, byLine:bl}); }}/></td>`)}</tr>`;
  const save=async()=>{ await Store.updateConfig({kpi, alerts:al, stableCriteria:sc}); logGlobal('config.kpi','config',{after:JSON.stringify({kpi}).slice(0,200)}); toast('Đã lưu cấu hình KPI','ok'); };
  const AK=[['prepWarnMin','Nhắc checklist critical trước dừng (phút)'],['warnTargetPct','Cảnh báo khi đạt % target'],['overTargetPct','Vượt ngưỡng % target'],['qaWaitMin','Chờ QA quá (phút)'],['maxTrials','Số lần thử tối đa'],['sopReviewDays','Báo SOP sắp hết hạn (ngày)']];
  const SK=[['intervalMin','Độ dài khoảng (phút)'],['consecutive','Số khoảng liên tiếp'],['minOutputPct','Sản lượng ≥ % target'],['maxDefects','Lỗi tối đa/khoảng']];
  return html`<div class="col">
    <div class="card"><div class="card-h"><h3>Định nghĩa KPI</h3>${ok?html`<button class="btn btn-primary btn-sm" onClick=${save}>Lưu tất cả</button>`:''}</div>
      <div class="grid g3" style="gap:10px"><${Field} label="End event của internal time" hint="Start event: chuyền ngừng sản xuất model A vì changeover"><select class="inp" disabled=${!ok} value=${kpi.endEvent} onChange=${e=>setKpi({...kpi,endEvent:e.target.value})}><option value="firstPairApproved">Mẫu đầu model B được QA chấp thuận</option><option value="release">Production release</option></select><//>
        <${Field} label="Dung sai đạt target (%)" hint="0 = actual ≤ target"><input class="inp" type="number" disabled=${!ok} value=${kpi.targetTolerancePct??0} onInput=${e=>setKpi({...kpi,targetTolerancePct:+e.target.value||0})}/><//>
        <${Field} label="Vượt chuẩn hoạt động bắt buộc delay reason (%)"><input class="inp" type="number" disabled=${!ok} value=${kpi.overStdTolPct??20} onInput=${e=>setKpi({...kpi,overStdTolPct:+e.target.value||0})}/><//></div>
      <div class="note small" style="margin-top:10px">Downtime và waiting loss dùng union các khoảng thời gian – hoạt động song song không bị cộng trùng. Target Achievement chỉ tính changeover hợp lệ (có start/end event, không hủy, không bị Lean loại trừ).</div></div>
    <div class="card"><div class="card-h"><h3>Ngưỡng cảnh báo</h3><span class="small muted">mặc định & theo chuyền (để trống = dùng mặc định)</span></div>
      <div class="grid g3" style="gap:10px">${AK.map(([k,l])=>num(al,setAl,'default',k,l))}</div>
      <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Chuyền</th>${AK.map(([,l])=>html`<th style="white-space:normal;min-width:100px">${l}</th>`)}</tr></thead><tbody>${(c.lines||[]).map(l=>lineRow(al,setAl,l.id,AK.map(x=>x[0])))}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h3>Tiêu chí Stable Run (ramp-up)</h3><span class="small muted">IE & Production duyệt theo line</span></div>
      <div class="grid g4" style="gap:10px">${SK.map(([k,l])=>num(sc,setSc,'default',k,l))}</div>
      <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Chuyền</th>${SK.map(([,l])=>html`<th style="white-space:normal">${l}</th>`)}</tr></thead><tbody>${(c.lines||[]).map(l=>lineRow(sc,setSc,l.id,SK.map(x=>x[0])))}</tbody></table></div></div></div>`;
}
function PermMatrix(){
  const roles=Object.keys(ROLES); const ok=can('config.system');
  const cur=()=>Object.fromEntries(Object.keys(PERMS).map(p=>[p,[...rolesFor(p)]]));
  const [m,setM]=useState(cur);
  const saved=JSON.stringify(cur()); const dirty=JSON.stringify(m)!==saved;
  const isDefault = p => JSON.stringify([...(m[p]||[])].sort())===JSON.stringify([...PERMS[p]].sort());
  const locked=(p,r)=>{ const L=PERM_LOCKS[p]; if(!L) return null; if((L.must||[]).includes(r)) return 'Bắt buộc có: '+L.why; if((L.never||[]).includes(r)) return 'Không được cấp: '+L.why; return null; };
  const toggle=(p,r)=>{ if(!ok||locked(p,r)) return; const a=m[p]||[]; setM({...m,[p]: a.includes(r)?a.filter(x=>x!==r):[...a,r]}); };
  const save=async()=>{ const changes=[]; const before=cur();
    for(const p of Object.keys(PERMS)){ const a=new Set(before[p]), b=new Set(m[p]); roles.forEach(r=>{ if(a.has(r)!==b.has(r)) changes.push(`${b.has(r)?'+':'−'} ${ROLES[r]} · ${PERM_LABELS[p]||p}`); }); }
    if(!changes.length) return;
    const r=await ask({title:`Lưu ${changes.length} thay đổi phân quyền`, body:html`<div class="small" style="max-height:200px;overflow:auto">${changes.map(c=>html`<div>${c}</div>`)}</div>`, okText:'Lưu', fields:[{k:'reason',label:'Lý do thay đổi (ghi audit)',type:'textarea',required:true}]}); if(!r) return;
    const pm={}; for(const p of Object.keys(PERMS)){ const L=PERM_LOCKS[p]||{}; let a=[...new Set([...(m[p]||[]), ...(L.must||[])])].filter(x=>!(L.never||[]).includes(x)); if(JSON.stringify([...a].sort())!==JSON.stringify([...PERMS[p]].sort())) pm[p]=a; }
    await Store.updateConfig({permMatrix:null}); await Store.updateConfig({permMatrix:pm});
    logGlobal('config.permMatrix','permissions',{before:null, after:changes.join('; ').slice(0,900), reason:r.reason}); toast('Đã lưu ma trận phân quyền','ok'); };
  const reset=async()=>{ const r=await ask({title:'Khôi phục ma trận mặc định theo đặc tả', danger:true, okText:'Khôi phục', fields:[{k:'reason',label:'Lý do',required:true}]}); if(!r) return;
    await Store.updateConfig({permMatrix:null}); setM(Object.fromEntries(Object.keys(PERMS).map(p=>[p,[...PERMS[p]]]))); logGlobal('config.permMatrix.reset','permissions',{reason:r.reason}); toast('Đã khôi phục mặc định','ok'); };
  const anyCustom=Object.keys(PERMS).some(p=>!isDefault(p));
  return html`<div class="card"><div class="card-h"><div><h3>Ma trận phân quyền</h3><div class="small muted">${ok?'Bấm vào ô để cấp/bỏ quyền, rồi Lưu. Ô có khóa là ràng buộc bắt buộc của đặc tả.':'Chỉ System Admin chỉnh được.'} Quyền còn bị giới hạn theo phạm vi chuyền của từng người.</div></div>
    ${ok?html`<div class="row">${dirty?html`<span class="small t-wait">Chưa lưu</span><button class="btn btn-sm btn-ghost" onClick=${()=>setM(cur())}>Hoàn tác</button>`:''}${anyCustom||Store.config.permMatrix?html`<button class="btn btn-sm" onClick=${reset}>Mặc định</button>`:''}<button class="btn btn-primary btn-sm" disabled=${!dirty} onClick=${save}>Lưu</button></div>`:''}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Quyền</th>${roles.map(r=>html`<th style="white-space:normal;text-align:center;min-width:74px">${ROLES[r]}</th>`)}</tr></thead><tbody>
      ${Object.keys(PERMS).map(p=>html`<tr><td class="small">${PERM_LABELS[p]||p}${!isDefault(p)?html` <span class="tag" style="background:var(--accent-soft);color:var(--warn)">đã chỉnh</span>`:''}<div class="tiny faint mono">${p}</div></td>
        ${roles.map(r=>{ const on=(m[p]||[]).includes(r); const lk=locked(p,r); const def=PERMS[p].includes(r); return html`<td style="text-align:center;padding:4px">
          <button type="button" disabled=${!ok||!!lk} title=${lk||(on?'Bấm để bỏ quyền':'Bấm để cấp quyền')} aria-pressed=${on} aria-label=${`${ROLES[r]} – ${PERM_LABELS[p]||p}`} onClick=${()=>toggle(p,r)}
            style=${`width:34px;height:30px;border-radius:6px;border:1px solid ${on?'var(--ok)':'var(--line)'};background:${on?'var(--ok-soft)':'transparent'};color:var(--ok);cursor:${ok&&!lk?'pointer':'default'};display:inline-grid;place-items:center;${on!==def?'box-shadow:0 0 0 2px var(--accent);':''}${lk?'opacity:.6;':''}`}>
            ${on?html`<${Icon} n="check" s=16/>`:''}${lk&&!on?html`<span style="color:var(--ink-3)"><${Icon} n="lock" s=12/></span>`:''}</button></td>`; })}</tr>`)}</tbody></table></div>
    <div class="small muted" style="margin-top:8px">Viền vàng = khác mặc định. Ngoài ma trận, app luôn giữ các quy tắc: người yêu cầu exception/standard không tự duyệt; hạng mục critical cần người khác xác nhận; Operator, QA, Kỹ thuật, Kho chỉ cập nhật tác vụ giao cho vai trò của mình.</div></div>`;
}
function AuditAdmin(){
  const [q,setQ]=useState(''); const [days,setDays]=useState(30);
  const since=Date.now()-days*86400000;
  const g=vals(Store.data.auditlog).flatMap(d=>Object.values(d.entries||{})).map(e=>({...e, src:'Hệ thống'}));
  const c=vals(Store.data.changeovers).flatMap(co=>vals(co.audit).map(e=>({...e, src:co.id})));
  const k=vals(Store.data.kaizen).flatMap(z=>vals(z.history).map(e=>({...e, src:z.id})));
  const all=[...g,...c,...k].filter(e=>e.at>=since && (!q || JSON.stringify(e).toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>b.at-a.at);
  const show=v=>v==null?'':typeof v==='object'?JSON.stringify(v).slice(0,120):String(v).slice(0,120);
  return html`<div class="card"><div class="card-h"><h3>Audit log (${all.length})</h3><div class="row"><input class="inp sm" placeholder="Lọc theo người, hành động, ID…" value=${q} onInput=${e=>setQ(e.target.value)}/><${Seg} value=${days} onChange=${setDays} options=${[{v:1,l:'24h'},{v:7,l:'7 ngày'},{v:30,l:'30 ngày'},{v:3650,l:'Tất cả'}]}/>
      ${can('export')?html`<button class="btn btn-sm" onClick=${()=>exportWorkbook({'Audit':all.map(e=>({'Thời điểm':fmtDTs(e.at),'Người':e.byName,'Vai trò':ROLES[e.role]||'','Nguồn':e.src,'Hành động':e.action,'Đối tượng':e.field||e.entity,'Trước':show(e.before),'Sau':show(e.after),'Lý do':e.reason||''}))}, 'SMED_audit')}>Xuất</button>`:''}</div></div>
    <div class="tbl-wrap" style="max-height:640px"><table class="tbl"><thead><tr><th>Thời điểm</th><th>Người</th><th>Nguồn</th><th>Hành động</th><th>Đối tượng</th><th>Trước</th><th>Sau</th><th>Lý do</th></tr></thead><tbody>${all.slice(0,500).map(e=>html`<tr><td class="num small">${fmtDTs(e.at)}</td><td class="small">${e.byName}</td><td class="mono small">${e.src.startsWith('CO-')?html`<a href=${'#co-'+e.src}>${e.src}</a>`:e.src}</td><td class="mono small">${e.action}</td><td class="mono small">${e.field||e.entity}</td><td class="small">${show(e.before)}</td><td class="small">${show(e.after)}</td><td class="small">${e.reason||''}</td></tr>`)}</tbody></table></div>
    ${all.length>500?html`<div class="small muted">Hiển thị 500 bản ghi mới nhất – dùng Xuất để lấy toàn bộ.</div>`:''}</div>`;
}
function DataAdmin(){
  const ok=can('backup'); const d=Store.data; const fileRef=useRef();
  const counts={changeover:Object.keys(d.changeovers).length, model:Object.keys(d.models).length, sop:Object.keys(d.sops).length, kaizen:Object.keys(d.kaizen).length};
  const size=(JSON.stringify(d).length/1024).toFixed(0);
  const demoN=Object.values(d.changeovers).filter(x=>x.isDemo).length+Object.values(d.models).filter(x=>x.isDemo).length+Object.values(d.sops).filter(x=>x.isDemo).length+Object.values(d.kaizen).filter(x=>x.isDemo).length+(Store.config.users||[]).filter(u=>u.isDemo).length;
  const backup=async()=>{ const dump={app:'SMED', version:APP_VERSION, exportedAt:Date.now(), exportedBy:me().name, config:Store.config, changeovers:d.changeovers, models:d.models, sops:d.sops, kaizen:d.kaizen, auditlog:d.auditlog}; await saveFile(`SMED_backup_${todayStr()}.json`, JSON.stringify(dump)); logGlobal('backup.export','all',{after:`${counts.changeover} CO`}); };
  const restore=async(file)=>{ try{ const j=JSON.parse(await file.text()); if(j.app!=='SMED'||!j.config) return toast('File không phải bản sao lưu SMED.','bad');
      const r=await ask({title:'Khôi phục dữ liệu', danger:true, okText:'Khôi phục', body:`Bản sao lưu ${fmtDTs(j.exportedAt)} bởi ${j.exportedBy}: ${Object.keys(j.changeovers||{}).length} changeover, ${Object.keys(j.models||{}).length} model. Bản ghi cùng ID sẽ bị ghi đè; bản ghi khác được giữ nguyên.`, fields:[{k:'c',label:'Gõ KHOIPHUC để xác nhận',required:true}]});
      if(!r||r.c!=='KHOIPHUC') return;
      await Store.setConfig(j.config); for(const c of COLLS){ for(const [id,doc] of Object.entries(j[c]||{})) await Store.set(c,id,doc); }
      logGlobal('backup.restore','all',{after:fmtDTs(j.exportedAt)}); toast('Đã khôi phục','ok'); }catch(e){ toast('Không đọc được file: '+e.message,'bad'); } };
  const purge=async()=>{ const r=await ask({title:'Xóa toàn bộ dữ liệu DEMO', danger:true, okText:'Xóa dữ liệu demo', body:`Sẽ xóa ${demoN} bản ghi demo (changeover, model, SOP, Kaizen, người dùng demo, standard demo). Dữ liệu thật không bị ảnh hưởng.`, fields:[{k:'c',label:'Gõ XOADEMO để xác nhận',required:true}]}); if(!r||r.c!=='XOADEMO') return;
    for(const c of ['changeovers','models','sops','kaizen']) for(const [id,x] of Object.entries(d[c])) if(x.isDemo) await Store.remove(c,id);
    const cfg=Store.config; await Store.updateConfig({users:(cfg.users||[]).filter(u=>!u.isDemo), standards:(cfg.standards||[]).filter(s=>!s.isDemo)});
    logGlobal('demo.purge','all',{after:demoN}); toast('Đã xóa dữ liệu demo','ok'); if(me()?.isDemo) Session.logout(); };
  const loadDemo=async()=>{ const r=await ask({title:'Nạp dữ liệu DEMO', body:'Thêm model, SOP, changeover, Kaizen và người dùng demo (PIN 1234) có gắn nhãn để đào tạo. Có thể xóa sau.'}); if(r) { await seedDemo(clone(Store.config)); toast('Đã nạp dữ liệu demo','ok'); } };
  return html`<div class="col">
    <div class="card"><div class="card-h"><h3>Lưu trữ</h3><span class=${'mode-chip '+(Store.mode==='cloud'?'mode-cloud':'mode-local')}>${Store.mode==='cloud'?'Cloud – dùng chung, thời gian thực':'Cục bộ – chỉ thiết bị này'}</span></div>
      <dl class="kv"><dt>Changeover</dt><dd>${counts.changeover}</dd><dt>Model</dt><dd>${counts.model}</dd><dt>SOP</dt><dd>${counts.sop}</dd><dt>Kaizen</dt><dd>${counts.kaizen}</dd><dt>Dung lượng</dt><dd>${size} KB</dd>${Store.seedInfo?html`<dt>Dữ liệu đóng gói</dt><dd>${fmtDTs(Store.seedInfo.at)} · ${Store.seedInfo.n} changeover ${ok?html`<button class="btn btn-sm" onClick=${async()=>{ const r=await ask({title:'Nạp dữ liệu đóng gói', danger:true, okText:'Nạp dữ liệu', body:'Dữ liệu trên thiết bị này sẽ được thay bằng dữ liệu đóng gói trong file. Thay đổi chưa sao lưu trên thiết bị sẽ mất.'}); if(r){ Store.applySeed(); toast('Đã nạp dữ liệu đóng gói','ok'); } }}>Nạp lại</button>`:''}</dd>`:''}<dt>Chờ đồng bộ</dt><dd>${Store.pending.length} thao tác ${Store.pending.length&&Store.mode==='cloud'?html`<button class="btn btn-sm" onClick=${()=>Store.flush()}>Đồng bộ ngay</button>`:''}</dd></dl>
      <div class="note small" style="margin-top:10px">${Store.mode==='cloud'?'Mất mạng: thao tác được lưu tạm trên thiết bị, tự đồng bộ khi có mạng. Xung đột được xử lý ở cấp trường (task, hoạt động, lần thử là các khóa riêng) – ghi sau cùng thắng, mọi thay đổi có audit.':'Chế độ cục bộ dành cho thử nghiệm hoặc một thiết bị dùng chung tại chuyền. Hãy sao lưu JSON định kỳ.'}</div></div>
    ${ok?html`<div class="card"><div class="card-h"><h3>Sao lưu & khôi phục</h3></div><div class="row"><button class="btn btn-primary" onClick=${backup}><${Icon} n="dl"/>Tải bản sao lưu JSON</button>
      <input type="file" accept=".json,application/json" hidden ref=${fileRef} onChange=${e=>{ if(e.target.files[0]) restore(e.target.files[0]); e.target.value=''; }}/><button class="btn" onClick=${()=>fileRef.current.click()}><${Icon} n="upload"/>Khôi phục từ file</button></div></div>
      <div class="card"><div class="card-h"><h3>Dữ liệu demo</h3><span class="small muted">${demoN} bản ghi</span></div><div class="row">${demoN?html`<button class="btn btn-bad" onClick=${purge}>Xóa toàn bộ dữ liệu demo</button>`:html`<button class="btn" onClick=${loadDemo}>Nạp dữ liệu demo để đào tạo</button>`}</div></div>`
      :html`<div class="note small">Sao lưu/khôi phục dành cho System Admin.</div>`}</div>`;
}
function MyAccount(){
  const u=me(); const [a,setA]=useState(''); const [b,setB]=useState(''); const [o,setO]=useState('');
  const save=async()=>{ if(await hashPin(u.id,o)!==u.pinHash) return toast('PIN hiện tại không đúng.','bad'); if(!/^\d{4,8}$/.test(a)) return toast('PIN gồm 4–8 chữ số.','bad'); if(a!==b) return toast('PIN nhập lại không khớp.','bad'); const h=await hashPin(u.id,a); await Store.updateConfig({users:Store.config.users.map(x=>x.id===u.id?{...x,pinHash:h,mustChangePin:false}:x)}); logGlobal('user.pin', u.id, {}); setA('');setB('');setO(''); toast('Đã đổi PIN','ok'); };
  return html`<div class="card" style="max-width:520px"><h3>${u.name}</h3><div class="muted small" style="margin-bottom:10px">${ROLES[u.role]} · phạm vi ${(u.lines||[]).join(', ')}</div>
    <div class="col" style="gap:10px"><${Field} label="PIN hiện tại"><input class="inp" type="password" inputmode="numeric" value=${o} onInput=${e=>setO(e.target.value)}/><//><${Field} label="PIN mới"><input class="inp" type="password" inputmode="numeric" value=${a} onInput=${e=>setA(e.target.value)}/><//><${Field} label="Nhập lại PIN mới"><input class="inp" type="password" inputmode="numeric" value=${b} onInput=${e=>setB(e.target.value)}/><//><div><button class="btn btn-primary" onClick=${save}>Đổi PIN</button></div></div></div>`;
}
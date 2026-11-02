function Loader(){ return html`<div class="loader"><div class="col" style="align-items:center"><div class="brand-mark" style="width:54px;height:54px;font-size:22px">SMED</div><div>Đang tải dữ liệu chuyền…</div></div></div>`; }

function Setup(){
  const [f,setF]=useState({site:'Nhà máy 1', lines:'L01: Chuyền may 01\nL02: Chuyền may 02', admin:'', pin:'', pin2:'', demo:true});
  const [busy,setBusy]=useState(false);
  const submit=async()=>{
    if(!f.admin.trim()) return toast('Nhập tên quản trị viên.','bad');
    if(!/^\d{4,8}$/.test(f.pin)) return toast('PIN gồm 4–8 chữ số.','bad');
    if(f.pin!==f.pin2) return toast('PIN nhập lại không khớp.','bad');
    setBusy(true);
    const cfg=defaultConfig(); cfg.site.name=f.site.trim()||'Nhà máy 1';
    const lines=f.lines.split('\n').map(s=>s.trim()).filter(Boolean).map((s,i)=>{ const [a,...b]=s.split(':'); const id=(b.length?a:'L'+pad(i+1)).trim().replace(/[^A-Za-z0-9-]/g,'').toUpperCase()||('L'+pad(i+1)); return {id, name:(b.length?b.join(':'):a).trim(), building:'', floor:'', shifts:['S1','S2'], status:'Active'}; });
    if(lines.length) cfg.lines=lines;
    const adminId='U-ADMIN';
    cfg.users=[{id:adminId, name:f.admin.trim(), role:'admin', lines:['*'], active:true, pinHash:await hashPin(adminId,f.pin), createdAt:Date.now()}];
    if(f.demo){ await seedDemo(cfg); }
    else await Store.setConfig(cfg);
    logGlobal('system.init', 'config', {after: f.demo?'Khởi tạo + dữ liệu demo':'Khởi tạo'});
    Session.login(adminId); setBusy(false);
  };
  return html`<div class="login"><div class="login-card" style="width:min(560px,100%)">
    <div class="row" style="justify-content:flex-end"><${LangPicker}/></div><div class="row"><div class="brand-mark">SMED</div><div><h2>Khởi tạo hệ thống SMED</h2><div class="muted small">Lần đầu sử dụng · ${Store.mode==='cloud'?'dữ liệu dùng chung trên claude.ai':'dữ liệu lưu trên thiết bị này'}</div></div></div>
    <${Field} label="Tên nhà máy / site" req><input class="inp" id="su-site" value=${f.site} onInput=${e=>setF({...f,site:e.target.value})}/><//>
    <${Field} label="Danh sách chuyền" hint="Mỗi dòng: MÃ: Tên chuyền. Có thể sửa sau trong Cài đặt."><textarea class="inp" id="su-lines" value=${f.lines} onInput=${e=>setF({...f,lines:e.target.value})}></textarea><//>
    <div class="grid g2" style="gap:10px">
      <${Field} label="Tên quản trị viên" req><input class="inp" id="su-admin" value=${f.admin} onInput=${e=>setF({...f,admin:e.target.value})}/><//>
      <div></div>
      <${Field} label="PIN" req><input class="inp" id="su-pin" type="password" inputmode="numeric" value=${f.pin} onInput=${e=>setF({...f,pin:e.target.value})}/><//>
      <${Field} label="Nhập lại PIN" req><input class="inp" id="su-pin2" type="password" inputmode="numeric" value=${f.pin2} onInput=${e=>setF({...f,pin2:e.target.value})}/><//>
    </div>
    <label class="chk"><input type="checkbox" id="su-demo" checked=${f.demo} onChange=${e=>setF({...f,demo:e.target.checked})}/> Kèm dữ liệu DEMO để đào tạo (gắn nhãn, xóa được 1 lần bấm)</label>
    <div class="note small">Danh mục delay code, checklist mẫu, KPI và ngưỡng cảnh báo được nạp theo đặc tả v2.0 (Phụ lục A, B). Các target là giá trị minh họa – IE/Lean cần thay bằng baseline đo tại nhà máy.</div>
    <button class="btn btn-primary btn-xl" disabled=${busy} onClick=${submit}>${busy?'Đang khởi tạo…':'Khởi tạo hệ thống'}</button>
  </div></div>`;
}

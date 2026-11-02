const LOCK_KEY='smed.lock.v1';
function Login(){
  const users=(Store.config?.users||[]).filter(u=>u.active!==false);
  const [sel,setSel]=useState(null); const [pin,setPin]=useState(''); const [q,setQ]=useState(''); const [err,setErr]=useState('');
  const lock=(()=>{ try{ return JSON.parse(localStorage.getItem(LOCK_KEY)||'{}'); }catch(e){ return {}; } })();
  const tryPin=async(p)=>{
    const u=sel; const l=lock[u.id]||{n:0,until:0};
    if(l.until>Date.now()) { setErr(`Tạm khóa ${Math.ceil((l.until-Date.now())/1000)} giây do nhập sai nhiều lần.`); setPin(''); return; }
    const h=await hashPin(u.id,p);
    if(h===u.pinHash){ delete lock[u.id]; try{localStorage.setItem(LOCK_KEY,JSON.stringify(lock));}catch(e){} Session.login(u.id); }
    else { l.n++; if(l.n>=5){ l.until=Date.now()+60000; l.n=0; } lock[u.id]=l; try{localStorage.setItem(LOCK_KEY,JSON.stringify(lock));}catch(e){} setErr('PIN không đúng.'); setPin(''); }
  };
  const press=d=>{ setErr(''); const p=(pin+d).slice(0,8); setPin(p); };
  const list=users.filter(u=>!q || (u.name+' '+ROLES[u.role]+' '+(u.code||'')).toLowerCase().includes(q.toLowerCase()));
  return html`<div class="login"><div class="login-card">
    <div class="row-sb"><div class="row"><div class="brand-mark">SMED</div><div><h2>${Store.config?.site?.name||'SMED'}</h2><div class="muted small">Quản lý đổi model chuyền may · đăng nhập cá nhân</div></div></div><${LangPicker}/></div>
    ${Store.seedNewer?html`<div class="note warn small col" style="gap:8px"><span>File này chứa dữ liệu đóng gói mới hơn (${fmtDTs(Store.seedInfo.at)}). Thiết bị đang dùng dữ liệu cũ hơn.</span><button class="btn btn-sm btn-primary" onClick=${async()=>{ const r=await ask({title:'Nạp dữ liệu đóng gói', danger:true, okText:'Nạp dữ liệu', body:'Dữ liệu trên thiết bị này sẽ được thay bằng dữ liệu đóng gói trong file. Thay đổi chưa sao lưu trên thiết bị sẽ mất.'}); if(r){ Store.applySeed(); toast('Đã nạp dữ liệu đóng gói','ok'); } }}>Nạp dữ liệu đóng gói</button></div>`:''}
    ${!sel ? html`
      <input class="inp" id="lg-q" placeholder="Tìm tên, mã nhân viên hoặc vai trò…" value=${q} onInput=${e=>setQ(e.target.value)}/>
      <div class="col" style="gap:6px;max-height:52vh;overflow:auto">
        ${list.map(u=>html`<button class="btn" style="justify-content:space-between;min-height:48px" onClick=${()=>{setSel(u);setPin('');setErr('');}}><span>${u.name}${u.code?html` <span class="faint mono small">${u.code}</span>`:''}</span><span class="row"><${Demo} on=${u.isDemo}/><span class="tag">${ROLES[u.role]}</span></span></button>`)}
        ${!list.length?html`<div class="muted small">Không tìm thấy người dùng.</div>`:''}
      </div>`
    : html`
      <div class="row-sb"><div><div class="eyebrow">Đăng nhập</div><b style="font-size:16px">${sel.name}</b> <span class="tag">${ROLES[sel.role]}</span></div><button class="btn btn-sm" onClick=${()=>setSel(null)}>Đổi người</button></div>
      <div class="pin-dots" aria-label="PIN đã nhập">${Array.from({length:Math.max(4,pin.length)}).map((_,i)=>html`<i class=${i<pin.length?'f':''}></i>`)}</div>
      ${err?html`<div class="note bad small" role="alert">${err}</div>`:''}
      ${sel.isDemo?html`<div class="note small">Tài khoản demo – PIN: 1234</div>`:''}
      <input class="inp" id="lg-pin" type="password" inputmode="numeric" autocomplete="off" placeholder="Nhập PIN rồi Enter" value=${pin} onInput=${e=>setPin(e.target.value.replace(/\D/g,'').slice(0,8))} onKeyDown=${e=>{ if(e.key==='Enter'&&pin.length>=4) tryPin(pin); }}/>
      <div class="pinpad">${['1','2','3','4','5','6','7','8','9','⌫','0','OK'].map(k=>html`<button type="button" onClick=${()=>{ if(k==='⌫') setPin(pin.slice(0,-1)); else if(k==='OK'){ if(pin.length>=4) tryPin(pin); } else press(k); }} style=${k==='OK'?'background:var(--accent);color:var(--accent-ink);border-color:var(--accent)':''}>${k}</button>`)}</div>`}
    <div class="faint tiny">Không dùng chung tài khoản. Mọi thao tác được ghi audit theo người đăng nhập. ${Store.mode==='local'?'Chế độ cục bộ: dữ liệu chỉ ở thiết bị này.':''}</div>
  </div></div>`;
}
function ChangePin({u}){
  const [a,setA]=useState(''); const [b,setB]=useState('');
  const save=async()=>{ if(!/^\d{4,8}$/.test(a)) return toast('PIN gồm 4–8 chữ số.','bad'); if(a!==b) return toast('PIN nhập lại không khớp.','bad'); if(a==='0000'||a==='1234') return toast('Chọn PIN khác giá trị mặc định.','bad');
    const users=(Store.config.users||[]).map(x=>x.id===u.id?{...x,pinHash:'',mustChangePin:false}:x); const h=await hashPin(u.id,a); users.find(x=>x.id===u.id).pinHash=h;
    await Store.updateConfig({users}); logGlobal('user.pin', u.id, {}); toast('Đã đổi PIN','ok'); };
  return html`<div class="login"><div class="login-card"><h2>Đổi PIN lần đầu</h2><div class="muted">${u.name} · ${ROLES[u.role]}</div>
    <${Field} label="PIN mới" req><input class="inp" id="cp-a" type="password" inputmode="numeric" value=${a} onInput=${e=>setA(e.target.value)}/><//>
    <${Field} label="Nhập lại" req><input class="inp" id="cp-b" type="password" inputmode="numeric" value=${b} onInput=${e=>setB(e.target.value)}/><//>
    <div class="row"><button class="btn btn-primary" onClick=${save}>Lưu PIN</button><button class="btn btn-ghost" onClick=${()=>Session.logout()}>Đăng xuất</button></div></div></div>`;
}

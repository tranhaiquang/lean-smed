function App(){
  const [,force]=useState(0); useView();
  useEffect(()=>{ const off=Store.on(()=>force(x=>x+1)); force(x=>x+1); return off; },[]);
  useEffect(()=>{ const i=setInterval(()=>force(x=>x+1), 30000); return ()=>clearInterval(i); },[]);
  const route=useRoute();
  let body;
  if(!Store.ready) body=html`<${Loader}/>`;
  else if(Store.config===null) body=html`<${Setup}/>`;
  else { const u=me(); body = !u ? html`<${Login}/>` : u.mustChangePin ? html`<${ChangePin} u=${u}/>` : html`<${Shell} route=${route} u=${u}/>`; }
  return html`${body}<${DialogHost}/><${ToastHost}/>`;
}

function Shell({route, u}){
  const [open,setOpen]=useState(false); const [showAlerts,setShowAlerts]=useState(false); const [q,setQ]=useState('');
  const alerts=alertsForMe(computeAlerts());
  const d=Store.data;
  const myTasks = vals(d.changeovers).filter(c=>['Planned','Preparing','Ready'].includes(c.status) && inScope(c.lineId)).flatMap(c=>vals(c.checklist).filter(t=>!['Done','NA'].includes(t.status) && (t.ownerUser===u.id || t.ownerRole===u.role))).length;
  const qaQueue = vals(d.changeovers).filter(c=>c.status==='AwaitingQuality' && inScope(c.lineId)).length;
  const badges={dashboard:alerts.filter(a=>a.sev==='bad').length, prep:myTasks, quality:qaQueue};
  const hasDemo = Object.values(d.changeovers).some(x=>x.isDemo) || Object.values(d.models).some(x=>x.isDemo) || (Store.config.users||[]).some(x=>x.isDemo);
  const base = route.split('-')[0];
  const active = {co:'changeovers', new:'changeovers', model:'models', compare:'models', sop:'sops', kz:'kaizen'}[base] || base;
  let page;
  if(route==='dashboard') page=html`<${Dashboard}/>`;
  else if(route==='changeovers') page=html`<${CoList}/>`;
  else if(route==='new') page=html`<${PlanForm}/>`;
  else if(route.startsWith('co-')) page=html`<${CoDetail} id=${route.slice(3)}/>`;
  else if(route==='prep') page=html`<${PrepBoard}/>`;
  else if(route==='quality') page=html`<${QualityBoard}/>`;
  else if(route==='models') page=html`<${ModelLibrary}/>`;
  else if(route.startsWith('model-')) page=html`<${ModelDetail} id=${route.slice(6)}/>`;
  else if(route==='compare') page=html`<${ComparePage}/>`;
  else if(route==='sops') page=html`<${SopLibrary}/>`;
  else if(route.startsWith('sop-')) page=html`<${SopDetail} id=${route.slice(4)}/>`;
  else if(route==='kaizen') page=html`<${KaizenPage}/>`;
  else if(route.startsWith('kz-')) page=html`<${KaizenDetail} id=${route.slice(3)}/>`;
  else if(route==='reports') page = can('reports') ? html`<${Reports}/>` : html`<${Empty} title="Không có quyền xem báo cáo"><//>`;
  else if(route==='admin') page=html`<${Settings}/>`;
  else page=html`<${Empty} title="Không tìm thấy trang">Quay về <a href="#dashboard">Dashboard</a><//>`;
  const search=e=>{ e.preventDefault(); const s=q.trim().toUpperCase(); if(!s) return; const hit=Object.values(d.changeovers).find(c=>c.id.toUpperCase()===s) || Object.values(d.changeovers).find(c=>c.id.toUpperCase().includes(s)); if(hit){ go('co-'+hit.id); setQ(''); } else { sessionStorage.setItem('smed.q', q.trim()); go('changeovers'); setQ(''); Store.emit(); } };
  const seedBanner = Store.seedNewer?html`<div class="note warn small row-sb"><span>File này chứa dữ liệu đóng gói mới hơn (${fmtDTs(Store.seedInfo.at)}). Thiết bị đang dùng dữ liệu cũ hơn.</span>${can('backup')?html`<button class="btn btn-sm" onClick=${async()=>{ const r=await ask({title:'Nạp dữ liệu đóng gói', danger:true, okText:'Nạp dữ liệu', body:'Dữ liệu trên thiết bị này sẽ được thay bằng dữ liệu đóng gói trong file. Thay đổi chưa sao lưu trên thiết bị sẽ mất.'}); if(r){ Store.applySeed(); toast('Đã nạp dữ liệu đóng gói','ok'); } }}>Nạp dữ liệu đóng gói</button>`:''}</div>`:'';
  const demoBanner = hasDemo?html`<div class="demo-banner"><span class="tag demo">DEMO</span><span class="grow">Hệ thống đang chứa dữ liệu demo (gắn nhãn). Báo cáo thực tế nên lọc bỏ demo; Admin xóa trong Cài đặt → Sao lưu & dữ liệu trước khi chạy thật.</span></div>`:'';
  const alertModal = showAlerts?html`<${Modal} title=${`Cảnh báo (${alerts.length})`} onClose=${()=>setShowAlerts(false)}><${AlertList} alerts=${alerts} onGo=${()=>setShowAlerts(false)}/><//>`:'';
  if(isMobile()) return html`<${MobileShell} u=${u} active=${active} badges=${badges} alerts=${alerts} onAlerts=${()=>setShowAlerts(true)} page=${page} banners=${html`${seedBanner}${demoBanner}`} modal=${alertModal}/>`;
  return html`<div class="app">
    <aside class=${'side'+(open?' open':'')} onClick=${e=>{ if(e.target.closest('button')) setOpen(false); }}>
      <div class="brand"><div class="brand-mark">SMED</div><div><b>SMED</b><span>${Store.config.site?.name||''}</span></div></div>
      <nav class="nav" aria-label="Điều hướng chính">${NAV.filter(n=>!n.perm||can(n.perm)).map(n=>html`<button class=${active===n.r?'on':''} onClick=${()=>go(n.r)}><${Icon} n=${n.i}/>${n.l}${badges[n.r]?html`<span class="badge">${badges[n.r]}</span>`:''}</button>`)}</nav>
      <div class="side-foot"><div><b>${u.name}</b><br/>${ROLES[u.role]}${(u.lines||[]).includes('*')?' · Toàn bộ chuyền':' · '+(u.lines||[]).join(', ')}</div>
        <button class="btn btn-sm" style="background:transparent;color:var(--nav-ink);border-color:rgba(255,255,255,.15)" onClick=${()=>Session.logout()}><${Icon} n="out"/>Đăng xuất</button>
        <div class="view-dark"><${ViewPicker} compact/></div>
        <div class="tiny" style="opacity:.6">v${APP_VERSION} · ${Store.mode==='cloud'?'Cloud':'Cục bộ'}</div></div>
    </aside>
    <div class="main">
      <header class="topbar">
        <button class="icon-btn menu-btn" onClick=${()=>setOpen(true)} aria-label="Mở menu"><${Icon} n="menu"/></button>
        <form class="grow row" onSubmit=${search} style="flex-wrap:nowrap"><input class="inp" id="top-q" style="max-width:380px" placeholder="Tìm Changeover ID, model, chuyền…" value=${q} onInput=${e=>setQ(e.target.value)} aria-label="Tìm kiếm"/></form>
        ${Store.mode==='cloud' ? html`<span class=${'mode-chip '+(Store.pending.length?'mode-local':'mode-cloud')} title="Dữ liệu dùng chung, cập nhật thời gian thực">${Store.pending.length?`Chờ đồng bộ ${Store.pending.length}`:(Store.readOnly?'Chỉ xem':'Đồng bộ')}</span>` : html`<span class="mode-chip mode-local" title="Dữ liệu chỉ lưu trên trình duyệt của thiết bị này">Cục bộ</span>`}
        <${LangPicker}/>
        <button class="btn btn-sm btn-ghost" onClick=${()=>Session.logout()} title="Đăng xuất để người khác đăng nhập"><${Icon} n="users"/><span class="hide-sm">${u.name} · ${ROLES[u.role]}</span></button>
        <button class="icon-btn" style="position:relative" onClick=${()=>setShowAlerts(true)} aria-label="Cảnh báo"><${Icon} n="bell"/>${alerts.length?html`<span style="position:absolute;top:2px;right:2px;background:var(--bad);color:#fff;border-radius:9px;font-size:10px;padding:0 5px;font-weight:700">${alerts.length}</span>`:''}</button>
      </header>
      <main class="content">
        ${seedBanner}${demoBanner}
        ${page}
      </main>
    </div>
    ${alertModal}
  </div>`;
}

const M_TITLES={dashboard:'Tổng quan', changeovers:'Changeover', prep:'Chuẩn bị', quality:'Quality Gate', models:'Model Library', sops:'Standard Work / SOP', kaizen:'Kaizen & AI Coach', reports:'Báo cáo', admin:'Cài đặt'};
function MobileShell({u, active, badges, alerts, onAlerts, page, banners, modal}){
  const [more,setMore]=useState(false); const [q,setQ]=useState(''); const [srch,setSrch]=useState(false);
  const tabs=[{r:'dashboard',l:'Tổng quan',i:'home'},{r:'changeovers',l:'Changeover',i:'swap'},{r:'prep',l:'Chuẩn bị',i:'box'},{r:'quality',l:'Quality',i:'shield'}];
  const inMore=!tabs.some(t=>t.r===active);
  const search=e=>{ e.preventDefault(); const s=q.trim().toUpperCase(); if(!s) return; const d=Store.data; const hit=Object.values(d.changeovers).find(c=>c.id.toUpperCase()===s)||Object.values(d.changeovers).find(c=>c.id.toUpperCase().includes(s)); if(hit) go('co-'+hit.id); else { sessionStorage.setItem('smed.q', q.trim()); go('changeovers'); Store.emit(); } setQ(''); setSrch(false); };
  return html`<div class="m-app">
    <header class="m-top">
      <div class="brand-mark" style="width:32px;height:32px;font-size:10.5px">SMED</div>
      ${srch ? html`<form class="grow" onSubmit=${search}><input class="inp" id="m-q" autofocus placeholder="Tìm Changeover ID, model, chuyền…" value=${q} onInput=${e=>setQ(e.target.value)} style="min-height:38px"/></form>`
        : html`<div class="m-title">${M_TITLES[active]||'SMED'}</div>`}
      <button class="icon-btn" onClick=${()=>setSrch(!srch)} aria-label="Tìm kiếm"><${Icon} n=${srch?'x':'search'}/></button>
      <button class="icon-btn" style="position:relative" onClick=${onAlerts} aria-label="Cảnh báo"><${Icon} n="bell"/>${alerts.length?html`<span class="m-dot">${alerts.length}</span>`:''}</button>
    </header>
    <main class="content m-content">${banners}${page}</main>
    <nav class="m-tabs" aria-label="Điều hướng chính">
      ${tabs.map(t=>html`<button class=${active===t.r?'on':''} onClick=${()=>go(t.r)}><${Icon} n=${t.i}/><span>${t.l}</span>${badges[t.r]?html`<i class="badge">${badges[t.r]}</i>`:''}</button>`)}
      <button class=${inMore||more?'on':''} onClick=${()=>setMore(true)}><${Icon} n="grid"/><span>Khác</span></button>
    </nav>
    ${more?html`<div class="overlay m-sheet-wrap" onMouseDown=${e=>{ if(e.target===e.currentTarget) setMore(false); }}><div class="m-sheet" role="dialog" aria-modal="true">
      <div class="row-sb"><div><b>${u.name}</b><div class="small muted">${ROLES[u.role]}${(u.lines||[]).includes('*')?' · Toàn bộ chuyền':' · '+(u.lines||[]).join(', ')}</div></div><button class="icon-btn" onClick=${()=>setMore(false)} aria-label="Đóng"><${Icon} n="x"/></button></div>
      <div class="m-grid">${NAV.filter(n=>!n.perm||can(n.perm)).filter(n=>!tabs.some(t=>t.r===n.r)).map(n=>html`<button class=${active===n.r?'on':''} onClick=${()=>{ setMore(false); go(n.r); }}><${Icon} n=${n.i} s=22/><span>${n.l}</span></button>`)}</div>
      <div class="col" style="gap:10px">
        <div class="row-sb"><span class="small muted">Giao diện</span><${ViewPicker}/></div>
        <div class="row-sb"><span class="small muted">Ngôn ngữ</span><${LangPicker}/></div>
        <div class="row-sb small muted"><span>v${APP_VERSION} · ${Store.mode==='cloud'?(Store.pending.length?`Chờ đồng bộ ${Store.pending.length}`:'Đồng bộ'):'Cục bộ'}</span></div>
        <button class="btn" onClick=${()=>{ setMore(false); Session.logout(); }}><${Icon} n="out"/>Đăng xuất · Đổi người dùng</button>
      </div></div></div>`:''}
    ${modal}
  </div>`;
}
function AlertList({alerts, onGo, max}){
  if(!alerts.length) return html`<div class="note ok small">Không có cảnh báo cần xử lý.</div>`;
  const list = max ? alerts.slice(0,max) : alerts;
  return html`<div class="col" style="gap:6px">${list.map(a=>html`<button class=${'alert '+a.sev} onClick=${()=>{ onGo&&onGo(); if(a.co) go('co-'+a.co+(a.task?'':'')); else if(a.kz) go('kz-'+a.kz); else if(a.sop) go('sop-'+a.sop); if(a.task) sessionStorage.setItem('smed.tab','prep'); if(a.type==='qa'||a.type==='fail'||a.type==='release') sessionStorage.setItem('smed.tab','qg'); if(a.type==='stable') sessionStorage.setItem('smed.tab','ramp'); }}>
    <span class="ic"></span><span class="grow"><b style="font-size:13.5px">${a.title}</b><br/><span class="small muted">${a.sub}</span></span></button>`)}
    ${max && alerts.length>max?html`<div class="small muted">+${alerts.length-max} cảnh báo khác (biểu tượng chuông)</div>`:''}</div>`;
}
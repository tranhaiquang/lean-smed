/* ===================== UI PRIMITIVES ===================== */
const IC = {
  home:'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  swap:'M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  box:'M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7M12 11v10',
  book:'M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4zM4 16a4 4 0 0 1 4-4h10',
  shield:'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5',
  bulb:'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z',
  chart:'M4 20V10M10 20V4M16 20v-7M22 20H2',
  gear:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  menu:'M3 6h18M3 12h18M3 18h18', bell:'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  out:'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', plus:'M12 5v14M5 12h14', play:'M6 4l14 8-14 8z', stop:'M6 6h12v12H6z',
  check:'M5 12l5 5L20 7', x:'M6 6l12 12M18 6L6 18', cam:'M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', dl:'M12 3v12M7 10l5 5 5-5M5 21h14',
  search:'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3', clock:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2', list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  doc:'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5', flag:'M4 21V4h13l-2 4 2 4H4', users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  sparkle:'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z', back:'M15 18l-6-6 6-6', phone:'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2', monitor:'M3 4h18v12H3zM8 20h8M12 16v4', grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', lock:'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4', upload:'M12 21V9M7 14l5-5 5 5M5 3h14'
};
const Icon = ({n, s}) => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style=${s?`width:${s}px;height:${s}px`:''} aria-hidden="true"><path d=${IC[n]||''}/></svg>`;
const Pill = ({status}) => { const s=STATUS[status]||{l:status,c:'p-grey'}; return html`<span class=${'pill '+s.c}>${s.l}</span>`; };
const TPill = ({s}) => { const t=TASK_STATUS[s]||{l:s,c:'p-grey'}; return html`<span class=${'pill '+t.c}>${t.l}</span>`; };
const Demo = ({on}) => on ? html`<span class="tag demo" title="Dữ liệu demo – không dùng cho báo cáo thật">DEMO</span>` : null;

function Field({label, req, hint, err, children, style}){
  return html`<label class="field" style=${style||''}><span>${label}${req?html`<b class="req">*</b>`:''}</span>${children}${hint?html`<small>${hint}</small>`:''}${err?html`<div class="err">${err}</div>`:''}</label>`;
}
function Modal({title, onClose, wide, children, footer}){
  useEffect(()=>{ const k=e=>{ if(e.key==='Escape') onClose&&onClose(); }; window.addEventListener('keydown',k); return ()=>window.removeEventListener('keydown',k); },[]);
  return html`<div class="overlay" onMouseDown=${e=>{ if(e.target===e.currentTarget) onClose&&onClose(); }}>
    <div class=${'modal'+(wide?' wide':'')} role="dialog" aria-modal="true">
      <div class="modal-h"><h3>${title}</h3><button class="icon-btn" onClick=${onClose} aria-label="Đóng"><${Icon} n="x"/></button></div>
      <div class="modal-b">${children}</div>
      ${footer?html`<div class="modal-f">${footer}</div>`:''}
    </div></div>`;
}

/* Hộp thoại xác nhận / nhập lý do (thay cho confirm/prompt bị chặn trong artifact) */
const Dialog = { cur:null, fns:new Set(),
  open(opts){ return new Promise(res=>{ this.cur={...opts, res}; this.fns.forEach(f=>f()); }); },
  close(v){ const c=this.cur; this.cur=null; this.fns.forEach(f=>f()); c&&c.res(v); } };
const ask = (opts) => Dialog.open(opts);
function DialogHost(){
  const [,setT]=useState(0); useEffect(()=>{ const f=()=>setT(x=>x+1); Dialog.fns.add(f); return ()=>Dialog.fns.delete(f); },[]);
  const c=Dialog.cur; const [v,setV]=useState({});
  useEffect(()=>{ if(c){ const init={}; (c.fields||[]).forEach(f=>init[f.k]=f.value??''); setV(init); } },[c]);
  if(!c) return null;
  const ok = () => { for(const f of (c.fields||[])){ if(f.required && !String(v[f.k]??'').trim()) return toast(`Cần nhập: ${f.label}`,'bad'); } Dialog.close({...v, ok:true}); };
  return html`<${Modal} title=${c.title} onClose=${()=>Dialog.close(null)} footer=${html`<button class="btn" onClick=${()=>Dialog.close(null)}>Hủy</button><button class=${'btn '+(c.danger?'btn-bad':'btn-primary')} onClick=${ok}>${c.okText||'Xác nhận'}</button>`}>
    ${c.body?html`<div>${c.body}</div>`:''}
    ${(c.fields||[]).map(f=>html`<${Field} label=${f.label} req=${f.required} hint=${f.hint}>
      ${f.type==='select' ? html`<select class="inp" value=${v[f.k]} onChange=${e=>setV({...v,[f.k]:e.target.value})}><option value="">— chọn —</option>${f.options.map(o=>html`<option value=${o.v}>${o.l}</option>`)}</select>`
      : f.type==='textarea' ? html`<textarea class="inp" value=${v[f.k]} onInput=${e=>setV({...v,[f.k]:e.target.value})}></textarea>`
      : html`<input class="inp" type=${f.type||'text'} value=${v[f.k]} onInput=${e=>setV({...v,[f.k]:e.target.value})}/>`}
    <//>`)}
  <//>`;
}
function ToastHost(){
  const [,setT]=useState(0); useEffect(()=>{ const f=()=>setT(x=>x+1); Toasts.fns.add(f); return ()=>Toasts.fns.delete(f); },[]);
  return html`<div class="toasts" role="status" aria-live="polite">${Toasts.list.map(t=>html`<div class=${'toast '+t.kind} key=${t.id}>${t.msg}</div>`)}</div>`;
}
function useNow(ms=1000){ const [n,setN]=useState(Date.now()); useEffect(()=>{ const i=setInterval(()=>setN(Date.now()),ms); return ()=>clearInterval(i); },[ms]); return n; }
function Seg({value, options, onChange}){ return html`<div class="seg" role="group">${options.map(o=>html`<button class=${value===o.v?'on':''} onClick=${()=>onChange(o.v)} type="button">${o.l}</button>`)}</div>`; }
function Tabs({value, tabs, onChange}){ return html`<div class="tabs" role="tablist">${tabs.map(t=>html`<button role="tab" aria-selected=${value===t.v} class=${value===t.v?'on':''} onClick=${()=>onChange(t.v)}>${t.l}${t.n!=null?html`<span class="cnt">${t.n}</span>`:''}</button>`)}</div>`; }
function Empty({title, children}){ return html`<div class="empty"><b>${title}</b>${children}</div>`; }
function Gate({items}){ return html`<ul class="gate-list">${items.map(g=>html`<li><span style=${'color:'+(g.ok?'var(--ok)':'var(--bad)')}><${Icon} n=${g.ok?'check':'x'} s=16/></span><span class=${g.ok?'muted':''}>${g.text}</span></li>`)}</ul>`; }
const UserSel = ({value, onChange, role, roles, cls='inp', allowEmpty=true, lineId}) => {
  const us=(Store.config?.users||[]).filter(u=>u.active!==false && (!role||u.role===role) && (!roles||roles.includes(u.role)) && (!lineId || (u.lines||['*']).includes('*') || (u.lines||[]).includes(lineId)));
  const empty = role && !us.length;
  return html`<select class=${cls} value=${value||''} onChange=${e=>onChange(e.target.value||null)} style=${empty?'border-color:var(--warn)':''}>${allowEmpty?html`<option value="">${empty?`— chưa có ${ROLES[role]} nào —`:'— chọn —'}</option>`:''}${us.map(u=>html`<option value=${u.id}>${u.name} · ${ROLES[u.role]}</option>`)}</select>`;
};
function PhotoInput({onAdd, label='Ảnh'}){
  const ref=useRef();
  return html`<span><input type="file" accept="image/*" capture="environment" ref=${ref} hidden onChange=${async e=>{ const f=e.target.files[0]; if(!f) return; try{ const d=await compressImage(f); onAdd(d); }catch(err){ toast('Không đọc được ảnh.','bad'); } e.target.value=''; }}/>
    <button class="btn btn-sm" type="button" onClick=${()=>ref.current.click()}><${Icon} n="cam"/>${label}</button></span>`;
}
function PhotoView({src, onClose}){ return html`<${Modal} title="Ảnh bằng chứng" onClose=${onClose} wide><img src=${src} style="width:100%;border-radius:6px" alt="Ảnh bằng chứng"/><//>`; }

/* ---------- Chế độ giao diện: Tự động / Điện thoại / Máy tính ---------- */
const VIEW_KEY='smed.view.v1';
const View = { pref:'auto', fns:new Set(), _last:null,
  init(){ try{ this.pref=localStorage.getItem(VIEW_KEY)||'auto'; }catch(e){} this.apply(); window.addEventListener('resize',()=>{ if(this.mode!==this._last) this.apply(); }); },
  get mode(){ return this.pref==='auto' ? (window.innerWidth<900?'mobile':'desktop') : this.pref; },
  apply(){ this._last=this.mode; document.documentElement.dataset.ui=this.mode; this.fns.forEach(f=>f()); },
  set(p){ this.pref=p; try{ localStorage.setItem(VIEW_KEY,p); }catch(e){} this.apply(); window.scrollTo(0,0); } };
const isMobile = () => View.mode==='mobile';
function useView(){ const [,f]=useState(0); useEffect(()=>{ const g=()=>f(x=>x+1); View.fns.add(g); return ()=>View.fns.delete(g); },[]); return View.mode; }
function ViewPicker({compact}){
  useView();
  const opts=[{v:'auto',l:'Tự động',i:'swap'},{v:'mobile',l:'Điện thoại',i:'phone'},{v:'desktop',l:'Máy tính',i:'monitor'}];
  if(compact) return html`<select class="inp sm" aria-label="Giao diện" title="Giao diện" style="width:auto;min-height:34px;font-weight:600" value=${View.pref} onChange=${e=>View.set(e.target.value)}>${opts.map(o=>html`<option value=${o.v}>${o.l}</option>`)}</select>`;
  return html`<div class="seg" role="group" aria-label="Giao diện">${opts.map(o=>html`<button type="button" class=${View.pref===o.v?'on':''} onClick=${()=>View.set(o.v)} style="display:inline-flex;gap:6px;align-items:center"><${Icon} n=${o.i} s=15/>${o.l}</button>`)}</div>`;
}

/* ===================== CHANGEOVER: danh sách, kế hoạch, chi tiết ===================== */
function CoList(){
  const [q,setQ]=useState(()=>{ const s=sessionStorage.getItem('smed.q')||''; sessionStorage.removeItem('smed.q'); return s; });
  const [tab,setTab]=useState('active');
  const [line,setLine]=useState(''); const [date,setDate]=useState('');
  const all=vals(Store.data.changeovers).filter(c=>inScope(c.lineId));
  const groups={active:all.filter(c=>ACTIVE_STATUSES.includes(c.status)), draft:all.filter(c=>c.status==='Draft'), closed:all.filter(c=>c.status==='Closed'), cancelled:all.filter(c=>c.status==='Cancelled'), all};
  const qq=q.trim().toLowerCase();
  const list=groups[tab].filter(c=>{
    if(line && c.lineId!==line) return false;
    if(date && todayStr(c.plannedStart||c.createdAt)!==date) return false;
    if(!qq) return true;
    return [c.id, modelLabel(c.modelA), modelLabel(c.modelB), lineName(c.lineId), userName(c.owner), STATUS[c.status]?.l, c.orderRef].join(' ').toLowerCase().includes(qq);
  }).sort((a,b)=>(b.plannedStart||0)-(a.plannedStart||0));
  return html`<div class="row-sb"><h1>Changeover</h1>${can('co.create')?html`<button class="btn btn-primary" onClick=${()=>go('new')}><${Icon} n="plus"/>Tạo kế hoạch</button>`:''}</div>
    <div class="row"><input class="inp" id="col-q" style="max-width:340px" placeholder="Tìm theo ID, model, chuyền, owner, trạng thái…" value=${q} onInput=${e=>setQ(e.target.value)}/>
      <select class="inp" id="col-line" style="max-width:200px" value=${line} onChange=${e=>setLine(e.target.value)}><option value="">Mọi chuyền</option>${(Store.config.lines||[]).map(l=>html`<option value=${l.id}>${l.name}</option>`)}</select>
      <input class="inp" id="col-date" type="date" style="max-width:180px" value=${date} onInput=${e=>setDate(e.target.value)} aria-label="Lọc theo ngày"/></div>
    <${Tabs} value=${tab} onChange=${setTab} tabs=${[{v:'active',l:'Đang mở',n:groups.active.length},{v:'draft',l:'Nháp',n:groups.draft.length},{v:'closed',l:'Đã đóng',n:groups.closed.length},{v:'cancelled',l:'Đã hủy',n:groups.cancelled.length},{v:'all',l:'Tất cả',n:all.length}]}/>
    <${CoTable} list=${list}/>`;
}

/* ---------- 4.2 Tạo kế hoạch ---------- */
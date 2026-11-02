/* ===================== DASHBOARD (4.1) ===================== */
const FILTER_KEY='smed.filter.v1';
function useFilter(){
  const def={from:todayStr(Date.now()-30*86400000), to:todayStr(), line:'', shift:'', customer:'', model:'', status:'', demo:'all'};
  const [f,setF]=useState(()=>{ try{ return {...def, ...JSON.parse(localStorage.getItem(FILTER_KEY)||'{}')}; }catch(e){ return def; } });
  const set=v=>{ setF(v); try{ localStorage.setItem(FILTER_KEY, JSON.stringify(v)); }catch(e){} };
  return [f,set];
}
function applyFilter(list, f){
  const a=dayStart(f.from||'2000-01-01'), b=dayStart(f.to||'2100-01-01')+86400000;
  return list.filter(c=>{
    const t=c.events?.lineStopAt||c.plannedStart||c.createdAt;
    if(t<a||t>=b) return false;
    if(f.line && c.lineId!==f.line) return false;
    if(f.shift && c.shiftId!==f.shift) return false;
    if(f.model && c.modelA!==f.model && c.modelB!==f.model) return false;
    if(f.customer){ const m=modelById(c.modelB); if(!m || m.customer!==f.customer) return false; }
    if(f.status && c.status!==f.status) return false;
    if(f.demo==='real' && c.isDemo) return false;
    if(f.demo==='demo' && !c.isDemo) return false;
    return inScope(c.lineId);
  });
}
function FilterBar({f, setF}){
  const cfg=Store.config; const models=vals(Store.data.models); const customers=[...new Set(models.map(m=>m.customer).filter(Boolean))];
  const S=(k,v)=>setF({...f,[k]:v});
  const [open,setOpen]=useState(false);
  if(isMobile() && !open){ const n=['line','shift','customer','model','status','building'].filter(k=>f[k]).length+(f.demo!=='all'?1:0);
    return html`<button class="btn" style="justify-content:space-between;width:100%" onClick=${()=>setOpen(true)}><span><${Icon} n="search"/> Bộ lọc</span><span class="small muted">${f.from} → ${f.to}${n?' · '+n+' điều kiện':''}</span></button>`; }
  return html`<div class="card" style="padding:12px">${isMobile()?html`<div class="row-sb" style="margin-bottom:8px"><b>Bộ lọc</b><button class="btn btn-sm" onClick=${()=>setOpen(false)}>Đóng</button></div>`:''}<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">
    <${Field} label="Từ ngày"><input class="inp" id="f-from" type="date" value=${f.from} onInput=${e=>S('from',e.target.value)}/><//>
    <${Field} label="Đến ngày"><input class="inp" id="f-to" type="date" value=${f.to} onInput=${e=>S('to',e.target.value)}/><//>
    <${Field} label="Site"><select class="inp" disabled><option>${cfg.site?.name}</option></select><//>
    <${Field} label="Building"><select class="inp" id="f-bld" value=${f.building||''} onChange=${e=>setF({...f,building:e.target.value,line:''})}><option value="">Tất cả</option>${[...new Set((cfg.lines||[]).map(l=>l.building).filter(Boolean))].map(b=>html`<option>${b}</option>`)}</select><//>
    <${Field} label="Chuyền"><select class="inp" id="f-line" value=${f.line} onChange=${e=>S('line',e.target.value)}><option value="">Tất cả</option>${(cfg.lines||[]).filter(l=>inScope(l.id) && (!f.building||l.building===f.building)).map(l=>html`<option value=${l.id}>${l.name}</option>`)}</select><//>
    <${Field} label="Ca"><select class="inp" id="f-shift" value=${f.shift} onChange=${e=>S('shift',e.target.value)}><option value="">Tất cả</option>${(cfg.shifts||[]).map(s=>html`<option value=${s.id}>${s.name}</option>`)}</select><//>
    <${Field} label="Khách hàng"><select class="inp" id="f-cus" value=${f.customer} onChange=${e=>S('customer',e.target.value)}><option value="">Tất cả</option>${customers.map(c=>html`<option>${c}</option>`)}</select><//>
    <${Field} label="Model"><select class="inp" id="f-model" value=${f.model} onChange=${e=>S('model',e.target.value)}><option value="">Tất cả</option>${models.map(m=>html`<option value=${m.id}>${m.code}</option>`)}</select><//>
    <${Field} label="Trạng thái"><select class="inp" id="f-st" value=${f.status} onChange=${e=>S('status',e.target.value)}><option value="">Tất cả</option>${Object.entries(STATUS).map(([k,v])=>html`<option value=${k}>${v.l}</option>`)}</select><//>
    <${Field} label="Dữ liệu"><select class="inp" id="f-demo" value=${f.demo} onChange=${e=>S('demo',e.target.value)}><option value="all">Tất cả</option><option value="real">Chỉ dữ liệu thật</option><option value="demo">Chỉ demo</option></select><//>
  </div></div>`;
}
const withBuilding = (list,f) => f.building ? list.filter(c=>(Store.config.lines||[]).find(l=>l.id===c.lineId)?.building===f.building) : list;

function CoTable({list, compact}){
  const now=useNow(5000);
  if(!list.length) return html`<${Empty} title="Không có changeover phù hợp"><//>`;
  if(isMobile()) return html`<div class="col" style="gap:8px">${list.map(c=>{ const k=coKpi(c,now); const bad=k.met===false||(k.running&&k.varianceMs>0); return html`<button class="m-card" onClick=${()=>go('co-'+c.id)}>
      <div class="row-sb"><b style="font-family:var(--f-display);font-size:17px">${lineName(c.lineId)}</b><${Pill} status=${c.status}/></div>
      <div><b>${modelLabel(c.modelA)}</b> → <b>${modelLabel(c.modelB)}</b> <${Demo} on=${c.isDemo}/></div>
      <div class="row-sb small muted"><span>${fmtDT(c.plannedStart)} · ${shiftName(c.shiftId)}</span><span class="num" style=${bad?'color:var(--bad);font-weight:700':''}>${k.internalMs!=null?fmtMin(k.internalMs)+' / '+(c.targetMin??'—')+' phút':'Target '+(c.targetMin??'—')+' phút'}</span></div>
      <div class="tiny faint mono">${c.id}</div></button>`; })}</div>`;
  return html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Chuyền · Ca</th><th>Model A → B</th><th>Kế hoạch</th>${compact?'':html`<th>Owner</th>`}<th>Trạng thái</th><th class="r">Internal (phút)</th><th class="r">Target</th>${compact?'':html`<th class="r">First pair</th>`}</tr></thead>
  <tbody>${list.map(c=>{ const k=coKpi(c,now); return html`<tr class="click" onClick=${()=>go('co-'+c.id)}>
    <td class="mono small">${c.id} <${Demo} on=${c.isDemo}/></td><td>${lineName(c.lineId)}<div class="faint small">${shiftName(c.shiftId)}</div></td>
    <td><b>${modelLabel(c.modelA)}</b> → <b>${modelLabel(c.modelB)}</b></td><td class="num">${fmtDT(c.plannedStart)}</td>
    ${compact?'':html`<td>${userName(c.owner)}</td>`}<td><${Pill} status=${c.status}/></td>
    <td class="r num" style=${k.met===false||(k.running&&k.varianceMs>0)?'color:var(--bad);font-weight:700':''}>${fmtMin(k.internalMs)}</td><td class="r num">${c.targetMin??'—'}</td>
    ${compact?'':html`<td class="r">${k.firstPass==null?'—':k.firstPass?html`<span class="pill p-green">Pass</span>`:html`<span class="pill p-red">Fail</span>`}</td>`}</tr>`; })}</tbody></table></div>`;
}

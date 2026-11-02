function Dashboard(){
  const [f,setF]=useFilter(); const now=useNow(1000);
  const [drill,setDrill]=useState(null);
  const all=vals(Store.data.changeovers);
  const list=withBuilding(applyFilter(all,f),f);
  const agg=aggregateKpi(list);
  const live=all.filter(c=>ACTIVE_STATUSES.includes(c.status) && inScope(c.lineId)).sort((a,b)=>STATUS[b.status].ph-STATUS[a.status].ph || (a.plannedStart-b.plannedStart));
  const par=paretoDelay(list);
  const kz=vals(Store.data.kaizen);
  const kzOpen=kz.filter(k=>['Open','InProgress','Done'].includes(k.status)), kzOver=kzOpen.filter(k=>k.due && dayStart(k.due)+86400000<now), kzVer=kz.filter(k=>k.status==='Verified');
  const alerts=alertsForMe(computeAlerts(now));
  const valid=list.filter(kpiValid);
  const cards=[
    {l:'Tổng changeover', v:agg.total, u:'', d:`${valid.length} hợp lệ cho KPI`, list:list.filter(c=>c.status!=='Cancelled')},
    {l:'Internal time TB', v:agg.avgInternal!=null?fmtMin(agg.avgInternal):'—', u:'phút', d: agg.avgReduction!=null?`Giảm ${fmtPct(agg.avgReduction)} so baseline`:'Chưa có baseline', list:valid},
    {l:'Đạt target', v:agg.targetAch!=null?Math.round(agg.targetAch):'—', u:'%', d:'actual ≤ target / hợp lệ', list:valid, tone: agg.targetAch!=null&&agg.targetAch<80?'bad':'ok'},
    {l:'First pair pass', v:agg.fpRate!=null?Math.round(agg.fpRate):'—', u:'%', d:'đạt ngay lần thử 1', list:list.filter(c=>coKpi(c).firstPass!=null), tone: agg.fpRate!=null&&agg.fpRate<90?'bad':'ok'},
    {l:'Hoàn tất chuẩn bị', v:agg.prepAvg!=null?Math.round(agg.prepAvg):'—', u:'%', d:'task xong trước giờ dừng', list:list.filter(c=>c.events?.lineStopAt)},
  ];
  return html`
    <div class="row-sb"><div><div class="eyebrow">${Store.config.site?.name} · ${fmtD(now)}</div><h1>Tổng quan changeover</h1></div>
      ${can('co.create')?html`<button class="btn btn-primary" onClick=${()=>go('new')}><${Icon} n="plus"/>Tạo kế hoạch changeover</button>`:''}</div>
    <${FilterBar} f=${f} setF=${setF}/>
    <div class="grid kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">${cards.map(c=>html`<button class="kpi" onClick=${()=>setDrill({title:c.l, list:c.list})}>
      <span class="l">${c.l}</span><span class="v" style=${c.tone==='bad'?'color:var(--bad)':''}>${c.v}<small>${c.u}</small></span><span class="d faint">${c.d}</span></button>`)}</div>
    <div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)" id="dash-main">
      <div class="card"><div class="card-h"><h3>Trạng thái trực tiếp</h3><span class="small muted">${live.length} changeover đang mở</span></div>
        ${live.length?html`<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px">${live.map(c=>html`<${LiveTile} c=${c} now=${now}/>`)}</div>`:html`<${Empty} title="Không có changeover đang mở">Tạo kế hoạch để bắt đầu.<//>`}</div>
      <div class="card"><div class="card-h"><h3>Cảnh báo</h3><span class="small muted">${alerts.length}</span></div><${AlertList} alerts=${alerts} max=${7}/></div>
    </div>
    <div class="grid" style="grid-template-columns:minmax(0,3fr) minmax(0,2fr)" id="dash-sub">
      <div class="card"><div class="card-h"><h3>Pareto lý do chờ / trễ</h3><span class="small muted">phút · bấm cột để xem giao dịch</span></div>
        <${ParetoChart} data=${par} onBar=${d=>setDrill({title:`${d.code} – ${(Store.config.delayCodes||[]).find(x=>x.code===d.code)?.reason||''}`, list:list.filter(c=>d.cos.includes(c.id))})}/></div>
      <div class="card"><div class="card-h"><h3>Kaizen</h3><a href="#kaizen" class="small">Mở Kaizen →</a></div>
        <div class="grid g3" style="grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">
          <div class="note"><div class="eyebrow">Đang mở</div><b style="font-size:22px;font-family:var(--f-display)">${kzOpen.length}</b></div>
          <div class=${'note '+(kzOver.length?'bad':'')}><div class="eyebrow">Quá hạn</div><b style="font-size:22px;font-family:var(--f-display)">${kzOver.length}</b></div>
          <div class="note ok"><div class="eyebrow">Đã xác minh</div><b style="font-size:22px;font-family:var(--f-display)">${kzVer.length}</b></div></div>
        <div class="col" style="gap:6px">${kzOpen.slice().sort((a,b)=>(a.due||'9')>(b.due||'9')?1:-1).slice(0,5).map(k=>html`<button class="alert" onClick=${()=>go('kz-'+k.id)}><span class="grow"><b class="small">${k.title}</b><br/><span class="tiny muted">${userName(k.owner)} · hạn ${k.due||'—'}</span></span><span class=${'pill '+KZ_STATUS[k.status].c}>${KZ_STATUS[k.status].l}</span></button>`)}</div>
      </div>
    </div>
    ${drill?html`<${Modal} wide title=${drill.title+` (${drill.list.length})`} onClose=${()=>setDrill(null)}><${CoTable} list=${drill.list}/><//>`:''}
    <style>@media (max-width:1000px){#dash-main,#dash-sub{grid-template-columns:minmax(0,1fr)!important}}</style>`;
}
function LiveTile({c, now}){
  const k=coKpi(c,now); const ph=STATUS[c.status].ph;
  let tone='', pct=null, clock='—', sub='';
  if(k.running){ pct=k.targetMs?k.internalMs/k.targetMs*100:null; const ac=alertCfg(c.lineId); tone = pct==null?'':pct>=(ac.overTargetPct||100)?'bad':pct>=(ac.warnTargetPct||80)?'warn':'ok'; clock=fmtClock(k.internalMs); sub=`/ ${c.targetMin} phút target`; }
  else if(['Planned','Preparing','Ready'].includes(c.status)){ const left=c.plannedStart-now; clock = left>0?'T-'+fmtClock(left):'Quá '+fmtClock(-left); tone = k.critOpen && left<alertCfg(c.lineId).prepWarnMin*60000 ? 'warn':''; sub=`chuẩn bị ${k.prepDoneNow!=null?Math.round(k.prepDoneNow):0}% · ${k.critOpen} critical mở`; pct=k.prepDoneNow; }
  else if(['Released','StableRun'].includes(c.status)){ clock=fmtClock(k.rampMs); sub='ramp-up'; tone='ok'; }
  if(c.status==='Rework'||c.escalated) tone='bad';
  return html`<div class=${'live-tile '+tone} onClick=${()=>go('co-'+c.id)} role="button" tabindex="0" onKeyDown=${e=>{ if(e.key==='Enter') go('co-'+c.id); }}>
    <div class="row-sb"><b style="font-family:var(--f-display);font-size:18px">${lineName(c.lineId)}</b><${Pill} status=${c.status}/></div>
    <div class="small"><b>${modelLabel(c.modelA)}</b> → <b>${modelLabel(c.modelB)}</b> <${Demo} on=${c.isDemo}/></div>
    <div class="row-sb"><span class="clock">${clock}</span><span class="tiny muted">${PHASES[ph]||''}</span></div>
    ${pct!=null?html`<div class=${'bar '+(tone==='bad'?'bad':tone==='warn'?'warn':'')}><i style=${`width:${Math.min(100,pct)}%`}></i></div>`:''}
    <div class="tiny muted">${sub} · ${userName(c.owner)}</div></div>`;
}
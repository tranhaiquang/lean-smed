/* ===================== KPI ENGINE (mục 7) ===================== */
function coKpi(co, now=Date.now()){
  const cfg=Store.config||{}; const ev=co.events||{};
  const endKey = cfg.kpi?.endEvent || 'firstPairApproved';
  const start = ev.lineStopAt || null;
  const endEv = endKey==='release' ? ev.releasedAt : ev.firstPairApprovedAt;
  const running = start && !endEv && ['InChangeover','AwaitingQuality','Rework'].includes(co.status);
  const internalMs = start ? ((endEv || (running?now:null)) ? (endEv||now) - start : null) : null;
  const acts = vals(co.activities);
  const internalActs = acts.filter(a=>a.type!=='External' && a.type!=='Rampup');
  const iv = a => [a.startAt, a.endAt || (a.startAt?now:null)];
  const downtimeMs = unionMs(acts.filter(a=>a.downtime).map(iv));
  const laborMs = sum(internalActs.map(a=>{const [s,e]=iv(a); return s&&e?e-s:0;}));
  const unionInternal = unionMs(internalActs.map(iv));
  const waits = acts.filter(a=>a.type==='Waiting' || a.delayCode);
  const waitByCode = {};
  const codes = [...new Set(waits.map(a=>a.delayCode||'OTH01'))];
  for(const c of codes){ waitByCode[c] = unionMs(waits.filter(a=>(a.delayCode||'OTH01')===c).map(a=>{ if(a.type==='Waiting') return iv(a); const [s,e]=iv(a); const over=(e-s)-(a.stdMin||0)*60000; return over>0?[e-over,e]:null; })); }
  const waitingMs = unionMs(acts.filter(a=>a.type==='Waiting').map(iv));
  const targetMs = co.targetMin!=null ? co.targetMin*60000 : null;
  const baselineMs = co.baselineMin!=null ? co.baselineMin*60000 : null;
  // Chuẩn bị
  const tasks = vals(co.checklist);
  const req = tasks.filter(t=>!(t.status==='NA' && t.naApprovedBy));
  const cut = start || now;
  const doneBefore = t => t.status==='Done' && t.completedAt && t.completedAt<=cut;
  const crit = req.filter(t=>t.critical), non=req.filter(t=>!t.critical);
  const pct = (a,b) => b ? a/b*100 : null;
  const trials = vals(co.trials).sort(by('seq'));
  const decided = trials.filter(t=>t.decision);
  const firstPass = decided.length ? decided[0].decision==='Pass' : null;
  const rampMs = ev.releasedAt && ev.stableAt ? ev.stableAt-ev.releasedAt : (ev.releasedAt && co.status==='Released' ? now-ev.releasedAt : null);
  const ramp = vals(co.rampup).sort(by('at'));
  const rampLoss = sum(ramp.map(r=>Math.max(0,(+r.target||0)-(+r.actual||0))));
  const rampDefects = sum(ramp.map(r=>+r.defects||0));
  return {
    start, end:endEv||null, running, internalMs, downtimeMs, laborMs, unionInternal, parallelSavedMs: Math.max(0,laborMs-unionInternal), waitingMs, waitByCode,
    targetMs, baselineMs, varianceMs: internalMs!=null&&targetMs!=null ? internalMs-targetMs : null,
    savingMs: internalMs!=null&&baselineMs!=null ? baselineMs-internalMs : null,
    reductionPct: internalMs!=null&&baselineMs ? (baselineMs-internalMs)/baselineMs*100 : null,
    prepPct: pct(req.filter(doneBefore).length, req.length), prepCritPct: pct(crit.filter(doneBefore).length, crit.length), prepNonPct: pct(non.filter(doneBefore).length, non.length),
    prepDoneNow: pct(req.filter(t=>t.status==='Done').length, req.length),
    tasksTotal:req.length, critOpen: crit.filter(t=>t.status!=='Done').length, blocked: tasks.filter(t=>t.status==='Blocked').length,
    firstPass, trialsCount:trials.length, rampMs, rampLoss, rampDefects,
    met: internalMs!=null && targetMs!=null && !running ? internalMs <= targetMs*(1+(cfg.kpi?.targetTolerancePct||0)/100) : null,
  };
}
const kpiValid = co => co.status!=='Cancelled' && !co.excludeKpi?.approvedBy && !!co.events?.lineStopAt && !!(co.events?.firstPairApprovedAt || co.events?.releasedAt);
function aggregateKpi(list){
  const valid = list.filter(kpiValid);
  const ks = valid.map(c=>({c, k:coKpi(c)}));
  const withT = ks.filter(x=>x.k.met!=null);
  const qa = list.map(c=>coKpi(c)).filter(k=>k.firstPass!=null);
  const prep = list.filter(c=>c.events?.lineStopAt).map(c=>coKpi(c)).filter(k=>k.prepPct!=null);
  const avg = a => a.length ? sum(a)/a.length : null;
  return {
    total: list.filter(c=>c.status!=='Cancelled').length, valid: valid.length,
    avgInternal: avg(ks.map(x=>x.k.internalMs)),
    targetAch: withT.length ? withT.filter(x=>x.k.met).length/withT.length*100 : null,
    fpRate: qa.length ? qa.filter(k=>k.firstPass).length/qa.length*100 : null,
    prepAvg: avg(prep.map(k=>k.prepPct)),
    avgSaving: avg(ks.filter(x=>x.k.savingMs!=null).map(x=>x.k.savingMs)),
    avgReduction: avg(ks.filter(x=>x.k.reductionPct!=null).map(x=>x.k.reductionPct)),
    avgRamp: avg(list.filter(c=>c.events?.stableAt).map(c=>coKpi(c).rampMs)),
    totalDowntime: sum(ks.map(x=>x.k.downtimeMs)),
  };
}
function paretoDelay(list){
  const m={};
  for(const c of list){ if(c.status==='Cancelled') continue; const k=coKpi(c); for(const [code,ms] of Object.entries(k.waitByCode)){ if(!ms) continue; m[code]=m[code]||{code,ms:0,count:0,cos:new Set()}; m[code].ms+=ms; m[code].count++; m[code].cos.add(c.id); } }
  const arr=Object.values(m).sort((a,b)=>b.ms-a.ms); const tot=sum(arr.map(a=>a.ms)); let acc=0;
  return arr.map(a=>{acc+=a.ms; return {...a, cos:[...a.cos], pct:tot?a.ms/tot*100:0, cum:tot?acc/tot*100:0};});
}
function stableCheck(co){
  const sc=stableCfg(co.lineId); const r=vals(co.rampup).sort(by('at'));
  const n=+sc.consecutive||2; if(r.length<n) return {met:false, sc, last:r.slice(-n)};
  const last=r.slice(-n);
  const ok = last.every(x=> (+x.target>0) && (+x.actual >= +x.target*(+sc.minOutputPct||0)/100) && ((+x.defects||0) <= (+sc.maxDefects||0)));
  return {met:ok, sc, last};
}

/* ===================== MODEL / STANDARD LOOKUPS ===================== */
const modelById = id => Store.data.models[id];
const modelLabel = id => { const m=modelById(id); return m ? m.code : (id||'—'); };
function effectiveRev(model, at=Date.now()){
  if(!model) return null;
  const revs = vals(model.revisions).filter(r=>r.status==='Approved' || r.status==='Superseded').filter(r=>!r.effectiveFrom || dayStart(r.effectiveFrom)<=at);
  revs.sort((a,b)=>(dayStart(b.effectiveFrom||'2000-01-01')-dayStart(a.effectiveFrom||'2000-01-01')) || (String(b.rev)>String(a.rev)?1:-1));
  return revs[0] || null;
}
const revOf = (modelId, revKey) => { const m=modelById(modelId); return m && revKey ? m.revisions?.[revKey] : null; };
function findStandard(lineId, modelA, modelB, at=Date.now()){
  const list = (Store.config?.standards||[]).filter(s=>s.status==='Approved' && (!s.effectiveFrom || dayStart(s.effectiveFrom)<=at) && (!s.effectiveTo || dayStart(s.effectiveTo)>at));
  const ok = s => (s.lineId==='*'||s.lineId===lineId) && (s.modelA==='*'||s.modelA===modelA) && (s.modelB==='*'||s.modelB===modelB);
  const score = s => (s.lineId!=='*'?4:0)+(s.modelB!=='*'?2:0)+(s.modelA!=='*'?1:0);
  const c = list.filter(ok).sort((a,b)=>score(b)-score(a) || dayStart(b.effectiveFrom||'2000-01-01')-dayStart(a.effectiveFrom||'2000-01-01'));
  return c[0]||null;
}
function effectiveSop(sop, at=Date.now()){
  if(!sop) return null;
  const r = vals(sop.revisions).filter(r=>r.status==='Approved' || r.status==='Superseded').filter(r=>!r.effectiveFrom || dayStart(r.effectiveFrom)<=at);
  r.sort((a,b)=>dayStart(b.effectiveFrom||'2000-01-01')-dayStart(a.effectiveFrom||'2000-01-01'));
  return r[0]||null;
}
function findSopFor(modelBId){
  const sops = vals(Store.data.sops).filter(s=>s.status!=='Archived');
  return sops.find(s=>(s.models||[]).includes(modelBId) && effectiveSop(s)) || sops.find(s=>(s.models||[]).includes('*') && effectiveSop(s)) || null;
}

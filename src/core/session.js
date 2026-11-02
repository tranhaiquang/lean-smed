/* ===================== PHIÊN ĐĂNG NHẬP & PHÂN QUYỀN ===================== */
const SESSION_KEY = window.SMED_SEED ? 'smed.session.seed.v1' : 'smed.session.v1';
const Session = {
  userId:null, at:0,
  load(){ try{ const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'null'); if(s){ this.userId=s.userId; this.at=s.at; } }catch(e){} },
  save(){ try{ localStorage.setItem(SESSION_KEY, JSON.stringify({userId:this.userId, at:this.at})); }catch(e){} },
  login(id){ this.userId=id; this.at=Date.now(); this.save(); Store.emit(); },
  logout(){ this.userId=null; this.save(); Store.emit(); },
  get user(){
    const cfg=Store.config; if(!cfg||!this.userId) return null;
    const u=(cfg.users||[]).find(x=>x.id===this.userId && x.active!==false);
    if(!u) return null;
    if(Date.now()-this.at > (cfg.sessionHours||10)*3600000) return null;
    return u;
  }
};
const me = () => Session.user;
const userName = id => { const u=(Store.config?.users||[]).find(x=>x.id===id); return u ? u.name : (id||'—'); };
const can = (perm, u=me()) => {
  if(!u) return false;
  if(perm==='standard.approve' && u.role==='ie' && Store.config?.ideDelegateStandard) return true;
  return rolesFor(perm).includes(u.role);
};
const inScope = (lineId, u=me()) => !!u && (!lineId || (u.lines||['*']).includes('*') || (u.lines||[]).includes(lineId));
const canOn = (perm, co, u=me()) => can(perm,u) && inScope(co?.lineId,u) && !Store.readOnly;
const lineName = id => (Store.config?.lines||[]).find(l=>l.id===id)?.name || id || '—';
const shiftName = id => (Store.config?.shifts||[]).find(s=>s.id===id)?.name || id || '—';
const alertCfg = lineId => ({...(Store.config?.alerts?.default||{}), ...((Store.config?.alerts?.byLine||{})[lineId]||{})});
const stableCfg = lineId => ({...(Store.config?.stableCriteria?.default||{}), ...((Store.config?.stableCriteria?.byLine||{})[lineId]||{})});

/* ---------- Audit ---------- */
function auditEntry(action, entity, {before, after, reason, field}={}){
  const u=me();
  return {id:uid('AU'), at:Date.now(), by:u?.id||'system', byName:u?.name||'system', role:u?.role||'', action, entity, field:field||null,
    before: before===undefined?null:before, after: after===undefined?null:after, reason: reason||null};
}
/** Audit cho dữ liệu không thuộc changeover: gom theo tháng, ghi theo khóa (merge) để nhiều người ghi không mất bản ghi. */
function logGlobal(action, entity, extra){
  const e=auditEntry(action, entity, extra);
  const d=new Date(); const id=`${d.getFullYear()}${pad(d.getMonth()+1)}`;
  Store.update('auditlog', id, {month:id, entries:{[e.id]:e}}, {createIfMissing:true});
  return e;
}

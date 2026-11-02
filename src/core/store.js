/* ===================== STORE: cloud (db capability) / local ===================== */
const COLLS = ['changeovers','models','sops','kaizen','auditlog'];
const LOCAL_KEY = window.SMED_SEED ? 'smed.local.seed.v1' : 'smed.local.v1', PENDING_KEY='smed.pending.v1';
const Store = {
  mode:'loading', db:null, ready:false, readOnly:false,
  raw:{config:undefined, changeovers:{}, models:{}, sops:{}, kaizen:{}, auditlog:{}},
  loaded:new Set(), pending:[], fns:new Set(), chains:{}, _view:null,
  on(f){ this.fns.add(f); return ()=>this.fns.delete(f); },
  emit(){ this._view=null; this.fns.forEach(f=>f()); },
  /** Dữ liệu hiển thị = snapshot server + các thao tác chờ đồng bộ (offline queue). */
  get data(){
    if(this._view) return this._view;
    let v = this.raw;
    if(this.pending.length){
      v = {...this.raw}; for(const c of COLLS) v[c]={...this.raw[c]};
      for(const op of this.pending){
        if(op.coll==='smed') { v.config = op.kind==='set' ? clone(op.data) : deepMerge(v.config||{}, op.data); continue; }
        if(op.kind==='delete') { delete v[op.coll][op.id]; continue; }
        v[op.coll][op.id] = op.kind==='set' ? clone(op.data) : deepMerge(v[op.coll][op.id]||{}, op.data);
      }
    }
    this._view=v; return v;
  },
  get config(){ return this.data.config; },
  async init(){
    let db=null;
    try{ if(window.claude && typeof window.claude.use==='function') db = await window.claude.use('db'); }catch(e){ db=null; }
    if(!db && window.SMED_DB) db = window.SMED_DB;
    if(db){ this.db=db; this.mode='cloud'; this.startCloud(); }
    else { this.mode='local'; this.startLocal(); }
  },
  startCloud(){
    try{ this.pending = JSON.parse(localStorage.getItem(PENDING_KEY)||'[]'); }catch(e){ this.pending=[]; }
    const mark = k => { this.loaded.add(k); if(this.loaded.size>=COLLS.length+1) this.ready=true; this.emit(); };
    this.db.doc('smed/config').onSnapshot(s=>{ this.raw.config = s.exists ? s.data() : null; mark('config'); }, e=>{ console.warn('config sub',e); if(!this.loaded.has('config')){ this.raw.config=null; mark('config'); } });
    for(const c of COLLS){
      this.db.collection(c).onSnapshot(snap=>{ const m={}; snap.docs.forEach(d=>{ m[d.id]=d.data(); }); this.raw[c]=m; mark(c); }, e=>{ console.warn('sub',c,e); mark(c); });
    }
    setInterval(()=>this.flush(), 15000);
    window.addEventListener('online', ()=>this.flush());
  },
  startLocal(){
    const load = () => { try{ const j=JSON.parse(localStorage.getItem(LOCAL_KEY)||'null'); if(j){ this.raw={config:null, changeovers:{}, models:{}, sops:{}, kaizen:{}, auditlog:{}, ...j}; } else this.raw.config=null; }catch(e){ this.raw.config=null; } };
    load();
    const seed=window.SMED_SEED;
    if(seed && seed.data){
      this.seedInfo={at:seed.exportedAt, n:Object.keys(seed.data.changeovers||{}).length};
      if(!this.raw.config){ this.applySeed(); }
      else if((this.raw.seedAt||0) < seed.exportedAt) this.seedNewer=true;
    }
    this.ready=true; this.emit();
    window.addEventListener('storage', e=>{ if(e.key===LOCAL_KEY){ load(); this.emit(); } });
  },
  applySeed(){
    const seed=window.SMED_SEED; if(!seed) return;
    this.raw={config:null, changeovers:{}, models:{}, sops:{}, kaizen:{}, auditlog:{}, ...clone(seed.data), seedAt:seed.exportedAt};
    this.seedNewer=false; this.saveLocal(); this.emit();
  },
  saveLocal(){
    try{ localStorage.setItem(LOCAL_KEY, JSON.stringify(this.raw)); return true; }
    catch(e){ toast('Không lưu được vào bộ nhớ thiết bị (có thể đã đầy). Hãy xuất sao lưu JSON và xóa bớt ảnh.', 'bad'); return false; }
  },
  ref(coll,id){ return coll==='smed' ? this.db.doc('smed/config') : this.db.collection(coll).doc(id); },
  async write(op){
    // op: {coll,id,kind:'set'|'update'|'delete',data}
    if(this.mode==='local'){
      if(op.coll==='smed'){ this.raw.config = op.kind==='set'?clone(op.data):deepMerge(this.raw.config||{},op.data); }
      else if(op.kind==='delete'){ const m={...this.raw[op.coll]}; delete m[op.id]; this.raw[op.coll]=m; }
      else { this.raw[op.coll] = {...this.raw[op.coll], [op.id]: op.kind==='set'?clone(op.data):deepMerge(this.raw[op.coll][op.id]||{},op.data)}; }
      this.saveLocal(); this.emit(); return true;
    }
    const key = op.coll+'/'+(op.id||'config');
    const run = async () => {
      const ref = this.ref(op.coll, op.id);
      const exec = () => op.kind==='set' ? ref.set(op.data) : op.kind==='delete' ? ref.delete() : ref.update(op.data);
      try{ await exec(); return true; }
      catch(e){
        const code = e && e.code;
        if(code==='unavailable'){ await new Promise(r=>setTimeout(r, 400+Math.random()*800)); try{ await exec(); return true; }catch(e2){ return this.enqueue(op, e2); } }
        if(code==='resource_exhausted') return this.enqueue(op, e);
        if(code==='invalid_argument' && op.kind==='update'){
          // tài liệu chưa tồn tại → tạo mới bằng set (dùng cho auditlog theo tháng)
          if(op.createIfMissing){ try{ await ref.set(op.data); return true; }catch(e3){} }
          toast('Không ghi được: bạn không có quyền ghi dữ liệu dùng chung, hoặc bản ghi không còn tồn tại.', 'bad'); this.readOnly = true; this.emit(); return false;
        }
        if(code==='invalid_argument'){ toast('Không ghi được: tài khoản claude.ai của bạn chỉ có quyền xem artifact này.', 'bad'); this.readOnly=true; this.emit(); return false; }
        if(code==='quota_exceeded'){ toast('Cơ sở dữ liệu đã đầy: '+(e.message||'')+'. Hãy xuất sao lưu và xóa dữ liệu cũ.', 'bad'); return false; }
        return this.enqueue(op, e);
      }
    };
    const prev = this.chains[key] || Promise.resolve();
    const p = prev.then(run, run); this.chains[key]=p; return p;
  },
  enqueue(op, err){
    this.pending.push(op); this.persistPending(); this.emit();
    toast('Mất kết nối – thao tác được lưu tạm trên thiết bị và sẽ tự đồng bộ.', '');
    return true;
  },
  persistPending(){ try{ localStorage.setItem(PENDING_KEY, JSON.stringify(this.pending)); }catch(e){} },
  async flush(){
    if(this.mode!=='cloud' || !this.pending.length || this._flushing) return;
    this._flushing=true;
    try{
      while(this.pending.length){
        const op=this.pending[0]; const ref=this.ref(op.coll,op.id);
        try{ if(op.kind==='set') await ref.set(op.data); else if(op.kind==='delete') await ref.delete(); else { try{ await ref.update(op.data); }catch(e){ if(e.code==='invalid_argument' && op.createIfMissing) await ref.set(op.data); else throw e; } } }
        catch(e){ if(e.code==='invalid_argument'){ /* xung đột/không hợp lệ: bỏ thao tác, ghi nhận */ console.warn('drop pending',op,e); } else break; }
        this.pending.shift(); this.persistPending();
      }
    } finally { this._flushing=false; this.emit(); }
  },
  set(coll,id,data){ return this.write({coll,id,kind:'set',data}); },
  update(coll,id,data,extra={}){ return this.write({coll,id,kind:'update',data,...extra}); },
  remove(coll,id){ return this.write({coll,id,kind:'delete'}); },
  setConfig(data){ return this.write({coll:'smed',kind:'set',data}); },
  updateConfig(data){ return this.write({coll:'smed',kind:'update',data}); },
};

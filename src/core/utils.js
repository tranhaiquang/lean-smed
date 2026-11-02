/* ---------- Tiện ích ---------- */
const uid = (p='') => p + Date.now().toString(36).slice(-5).toUpperCase() + Math.random().toString(36).slice(2,6).toUpperCase();
const clone = o => o==null ? o : JSON.parse(JSON.stringify(o));
const isObj = v => v && typeof v==='object' && !Array.isArray(v);
function deepMerge(base, patch){
  if(!isObj(base) || !isObj(patch)) return clone(patch);
  const out = {...base};
  for(const k of Object.keys(patch)){
    const pv = patch[k];
    out[k] = (isObj(pv) && isObj(base[k])) ? deepMerge(base[k], pv) : clone(pv);
  }
  return out;
}
const vals = o => o ? Object.values(o).filter(x=>x && !x.deleted) : [];
const pad = n => String(n).padStart(2,'0');
const fmtDT = t => { if(!t) return '—'; const d=new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtDTs = t => { if(!t) return '—'; const d=new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const fmtD = t => { if(!t) return '—'; const d=new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`; };
const fmtTime = t => { if(!t) return '—'; const d=new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const mins = ms => ms==null||isNaN(ms) ? null : ms/60000;
const fmtMin = (ms, d=1) => ms==null||isNaN(ms) ? '—' : (ms/60000).toFixed(d);
const fmtClock = ms => { if(ms==null||isNaN(ms)) return '--:--'; const neg=ms<0; ms=Math.abs(ms); const s=Math.floor(ms/1000); const h=Math.floor(s/3600), m=Math.floor(s%3600/60), ss=s%60; return (neg?'-':'')+(h?h+':'+pad(m):pad(m))+':'+pad(ss); };
const fmtPct = v => v==null||isNaN(v) ? '—' : (Math.round(v*10)/10)+'%';
const toLocalInput = t => { if(!t) return ''; const d=new Date(t); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fromLocalInput = s => s ? new Date(s).getTime() : null;
const todayStr = (t=Date.now()) => { const d=new Date(t); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const dayStart = s => new Date(s+'T00:00:00').getTime();
const sum = a => a.reduce((x,y)=>x+(+y||0),0);
const by = k => (a,b) => (a[k]>b[k]?1:a[k]<b[k]?-1:0);

/** Hợp các khoảng thời gian – không cộng trùng thời gian song song (KPI mục 7). */
function unionMs(intervals){
  const a = intervals.filter(i=>i && i[0]!=null && i[1]!=null && i[1]>i[0]).map(i=>[i[0],i[1]]).sort((x,y)=>x[0]-y[0]);
  let tot=0, cs=null, ce=null;
  for(const [s,e] of a){
    if(cs===null){cs=s;ce=e;}
    else if(s<=ce){ ce=Math.max(ce,e); }
    else { tot+=ce-cs; cs=s; ce=e; }
  }
  if(cs!==null) tot+=ce-cs;
  return tot;
}
function shiftWindowContains(shift, t){
  if(!shift||!t) return false;
  const d=new Date(t); const m=d.getHours()*60+d.getMinutes();
  const [sh,sm]=shift.start.split(':').map(Number), [eh,em]=shift.end.split(':').map(Number);
  const s=sh*60+sm, e=eh*60+em;
  return s<e ? (m>=s && m<e) : (m>=s || m<e);
}
async function hashPin(userId, pin){
  const txt = 'smed|'+userId+'|'+pin;
  try{
    if(crypto?.subtle){ const buf=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return 'sha256:'+[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
  }catch(e){}
  let h=2166136261; for(let i=0;i<txt.length;i++){h^=txt.charCodeAt(i);h=Math.imul(h,16777619);} return 'fnv:'+(h>>>0).toString(16);
}
function compressImage(file, max=420, q=0.6){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onload=()=>{ const img=new Image(); img.onload=()=>{ const k=Math.min(1,max/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k); c.getContext('2d').drawImage(img,0,0,c.width,c.height); res(c.toDataURL('image/jpeg',q)); }; img.onerror=rej; img.src=fr.result; };
    fr.onerror=rej; fr.readAsDataURL(file);
  });
}

/* ---------- Toast ---------- */
const Toasts = {list:[], fns:new Set(), push(msg, kind=''){ const id=Math.random(); this.list=[...this.list,{id,msg,kind}]; this.fns.forEach(f=>f()); setTimeout(()=>{this.list=this.list.filter(t=>t.id!==id); this.fns.forEach(f=>f());}, kind==='bad'?6000:3200); }};
const toast = (m,k) => Toasts.push(m,k);

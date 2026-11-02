/* ===================== ĐA NGÔN NGỮ: Tiếng Việt / English / 한국어 =====================
   Giao diện được viết bằng tiếng Việt; lớp này dịch văn bản hiển thị (text, placeholder, title, aria-label)
   theo từ điển I18N_ROWS. Dữ liệu người dùng nhập (tên, ghi chú, checklist tự tạo…) giữ nguyên. */
const LANGS = {vi:{l:'Tiếng Việt', s:'VI'}, en:{l:'English', s:'EN'}, ko:{l:'한국어', s:'KO'}};
const LANG_KEY='smed.lang.v1';
const I18N = {
  lang:'vi', maps:{}, pats:{}, cache:{},
  init(){
    for(const [i,code] of [[1,'en'],[2,'ko']]){
      const m=new Map(), p=[];
      for(const r of I18N_ROWS){
        if(!r[i]) continue;
        if(/\{\d\}/.test(r[0])){
          const re=new RegExp('^'+r[0].replace(/[.*+?^$()|[\]\\]/g,'\\$&').replace(/\{(\d)\}/g,'([\\s\\S]*?)')+'$');
          const order=[...r[0].matchAll(/\{(\d)\}/g)].map(x=>+x[1]);
          p.push({re, out:r[i], order});
        } else m.set(r[0], r[i]);
      }
      p.sort((a,b)=>b.re.source.length-a.re.source.length);
      this.maps[code]=m; this.pats[code]=p; this.cache[code]=new Map();
    }
    let l='vi'; try{ l=localStorage.getItem(LANG_KEY)||'vi'; }catch(e){}
    this.lang = LANGS[l] ? l : 'vi';
    document.documentElement.lang=this.lang;
  },
  core(s){
    const L=this.lang, m=this.maps[L];
    if(m.has(s)) return m.get(s);
    for(const p of this.pats[L]){
      const g=s.match(p.re); if(!g) continue;
      let out=p.out; p.order.forEach((n,idx)=>{ out=out.split('{'+n+'}').join(this.tr(g[idx+1])); });
      return out;
    }
    for(const sep of [' – ',' | ']){ if(s.includes(sep)){ const parts=s.split(sep); const t=parts.map(x=>this.tr(x)); if(t.some((x,i)=>x!==parts[i])) return t.join(sep); } }
    if(s.includes(' · ')) { const parts=s.split(' · '); if(parts.length>1){ const t=parts.map(x=>this.tr(x)); if(t.some((x,i)=>x!==parts[i])) return t.join(' · '); } }
    const ci=s.indexOf(': ');
    if(ci>0){ const a=s.slice(0,ci), b=s.slice(ci+2); if(m.has(a)||m.has(a+':')) return (m.get(a)||m.get(a+':').replace(/:$/,''))+': '+this.tr(b); }
    // tiền tố đã biết + phần còn lại không có chữ tiếng Việt (vd. "Đã lưu nháp CO-…")
    const sp=s.lastIndexOf(' ');
    for(let k=sp; k>0; k=s.lastIndexOf(' ',k-1)){
      const a=s.slice(0,k), rest=s.slice(k);
      if(m.has(a) && !/[À-ỹđĐ]/.test(rest)) return m.get(a)+rest;
    }
    if(s.startsWith('· ')) { const t=this.tr(s.slice(2)); if(t!==s.slice(2)) return '· '+t; }
    if(s.startsWith('→ ')) { const t=this.tr(s.slice(2)); if(t!==s.slice(2)) return '→ '+t; }
    return s;
  },
  tr(s){
    if(this.lang==='vi' || s==null) return s;
    s=String(s); if(!/[À-ỹđĐ]/.test(s) && !this.maps[this.lang].has(s.trim())) return s;
    const c=this.cache[this.lang]; if(c.has(s)) return c.get(s);
    const mm=s.match(/^(\s*)([\s\S]*?)(\s*)$/); const core=mm[2];
    const out = core ? mm[1]+this.core(core)+mm[3] : s;
    if(c.size>20000) c.clear(); c.set(s,out); return out;
  },
  /* ---- áp vào DOM ---- */
  ATTRS:['placeholder','title','aria-label'],
  node(n){
    if(n.nodeType===3){
      const cur=n.data; if(n.__tr===cur) return;
      n.__vi=cur; const t=this.tr(cur); n.__tr=t; if(t!==cur) n.data=t; return;
    }
    if(n.nodeType!==1) return;
    const tag=n.tagName; if(tag==='SCRIPT'||tag==='STYLE'||n.hasAttribute('data-notr')) return;
    for(const a of this.ATTRS) if(n.hasAttribute(a)) this.attr(n,a);
    if(tag==='TEXTAREA') return;
    for(let c=n.firstChild; c; c=c.nextSibling) this.node(c);
  },
  attr(n,a){
    const cur=n.getAttribute(a); const k='__tr_'+a; if(n[k]===cur) return;
    n['__vi_'+a]=cur; const t=this.tr(cur); n[k]=t; if(t!==cur) n.setAttribute(a,t);
  },
  retranslate(root=document.body){
    const walk=n=>{
      if(n.nodeType===3){ if(n.__vi!=null){ const t=this.tr(n.__vi); n.__tr=t; n.data=t; } else this.node(n); return; }
      if(n.nodeType!==1) return;
      const tag=n.tagName; if(tag==='SCRIPT'||tag==='STYLE'||n.hasAttribute('data-notr')) return;
      for(const a of this.ATTRS){ if(!n.hasAttribute(a)) continue; const o=n['__vi_'+a]; if(o!=null){ const t=this.tr(o); n['__tr_'+a]=t; n.setAttribute(a,t); } else this.attr(n,a); }
      if(tag==='TEXTAREA') return;
      for(let c=n.firstChild; c; c=c.nextSibling) walk(c);
    };
    walk(root);
  },
  observe(){
    const mo=new MutationObserver(recs=>{
      if(this.lang==='vi') return;
      for(const r of recs){
        if(r.type==='characterData'){ if(!r.target.parentElement?.closest('textarea')) this.node(r.target); }
        else if(r.type==='attributes') this.attr(r.target, r.attributeName);
        else r.addedNodes.forEach(x=>this.node(x));
      }
    });
    mo.observe(document.body,{subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:this.ATTRS});
  },
  set(l){
    if(!LANGS[l]) return; this.lang=l; document.documentElement.lang=l;
    try{ localStorage.setItem(LANG_KEY,l); }catch(e){}
    this.retranslate();
  },
};
const tr = s => I18N.tr(s);
I18N.init();

function LangPicker({dark}){
  const [l,setL]=useState(I18N.lang);
  return html`<select class="inp sm" data-notr="1" aria-label="Language" value=${l} style=${'width:auto;min-height:34px;font-weight:600'+(dark?';background:transparent;color:#fff;border-color:rgba(255,255,255,.25)':'')}
    onChange=${e=>{ const v=e.target.value; setL(v); I18N.set(v); }}>
    ${Object.entries(LANGS).map(([k,v])=>html`<option value=${k} style="color:#14202c">${v.s} · ${v.l}</option>`)}</select>`;
}
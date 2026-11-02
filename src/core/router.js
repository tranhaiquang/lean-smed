/* ---------- Router (hash) ---------- */
function useRoute(){
  const get=()=> (location.hash||'').replace(/^#/,'') || 'dashboard';
  const [r,setR]=useState(get());
  useEffect(()=>{ const f=()=>{ setR(get()); window.scrollTo(0,0); }; window.addEventListener('hashchange',f); return ()=>window.removeEventListener('hashchange',f); },[]);
  return r;
}
const go = r => { if(location.hash.replace('#','')===r) return; location.hash = r; };

/* ---------- Xuất file ---------- */
const IN_ARTIFACT = !!(window.claude && typeof window.claude.use==='function');
async function saveFile(filename, data){
  if(IN_ARTIFACT){
    try{ const dl=await window.claude.use('downloads'); if(dl){ await dl.save({filename, data}); toast('Đã lưu '+filename,'ok'); return true; } }
    catch(e){ if(e?.code==='declined') return false; if(e?.code!=='unavailable'){ toast('Không lưu được file: '+(e?.message||e?.code),'bad'); return false; } }
  }
  try{ const blob = data instanceof Blob ? data : new Blob([data]); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},1500); return true; }
  catch(e){ toast('Thiết bị không cho phép tải file.','bad'); return false; }
}
let _xlsxP=null;
function loadXLSX(){ if(window.XLSX) return Promise.resolve(window.XLSX); if(_xlsxP) return _xlsxP; _xlsxP=new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=()=>res(window.XLSX); s.onerror=()=>{_xlsxP=null; rej(new Error('xlsx'));}; document.head.appendChild(s); }); return _xlsxP; }
function toCsv(rows){ if(!rows.length) return ''; const keys=Object.keys(rows[0]); const esc=v=>{ v=v==null?'':String(v); return /[",\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }; return '﻿'+[keys.join(','), ...rows.map(r=>keys.map(k=>esc(r[k])).join(','))].join('\n'); }
async function exportWorkbook(sheets, base){
  if(!can('export')) return toast('Bạn không có quyền xuất dữ liệu.','bad');
  try{
    const X=await loadXLSX(); const wb=X.utils.book_new();
    for(const [name, rows0] of Object.entries(sheets)){ const rows=rows0.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[tr(k), typeof v==='string'?tr(v):v]))); const ws=X.utils.json_to_sheet(rows.length?rows:[{[tr('(trống)')]:''}]); X.utils.book_append_sheet(wb, ws, tr(name).replace(/[\\/?*\[\]:]/g,' ').slice(0,31)); }
    const buf=X.write(wb,{bookType:'xlsx',type:'array'});
    await saveFile(base+'.xlsx', new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  }catch(e){
    console.warn(e); toast('Không tải được thư viện Excel – xuất CSV thay thế.','');
    const first=Object.entries(sheets)[0]; await saveFile(base+'.csv', toCsv(first[1].map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[tr(k), typeof v==='string'?tr(v):v])))));
  }
  logGlobal('export', base, {after:Object.keys(sheets).join(', ')});
}

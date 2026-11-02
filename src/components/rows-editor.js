/* ===================== EDITOR BẢNG DÙNG CHUNG ===================== */
function RowsEditor({cols, rows, onChange, readOnly, addLabel='Thêm dòng', newRow, pasteHint}){
  const set=(i,k,v)=>{ const n=rows.map((r,j)=>j===i?{...r,[k]:v}:r); onChange(n); };
  const [paste,setPaste]=useState(false); const [txt,setTxt]=useState('');
  const doPaste=()=>{ const lines=txt.split(/\r?\n/).filter(l=>l.trim()); const add=lines.map(l=>{ const c=l.split('\t'); const o=newRow?newRow(rows.length):{}; cols.forEach((col,i)=>{ if(c[i]!==undefined && c[i]!=='') o[col.k]= col.type==='csv' ? c[i].split(',').map(x=>x.trim()).filter(Boolean) : col.type==='number' ? +c[i] : col.type==='check' ? /^(1|x|có|yes|true)$/i.test(c[i].trim()) : c[i].trim(); }); return o; }); onChange([...rows,...add]); setTxt(''); setPaste(false); toast(`Đã thêm ${add.length} dòng`,'ok'); };
  return html`<div class="col" style="gap:8px"><div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map(c=>html`<th style=${c.w?`min-width:${c.w}px`:''}>${c.l}</th>`)}${readOnly?'':html`<th></th>`}</tr></thead><tbody>
    ${rows.map((r,i)=>html`<tr>${cols.map(c=>html`<td>${readOnly ? (c.type==='check'?(r[c.k]?'✓':''):c.type==='csv'?(r[c.k]||[]).join(', '):c.type==='select'?(c.options.find(o=>o.v===r[c.k])?.l||r[c.k]||''):(r[c.k]??''))
      : c.type==='check' ? html`<input type="checkbox" checked=${!!r[c.k]} onChange=${e=>set(i,c.k,e.target.checked)} aria-label=${c.l}/>`
      : c.type==='csv' ? html`<input class="inp sm" value=${(r[c.k]||[]).join(',')} onInput=${e=>set(i,c.k,e.target.value.split(',').map(x=>x.trim()).filter(Boolean))} aria-label=${c.l}/>`
      : c.type==='select' ? html`<select class="inp sm" value=${r[c.k]??''} onChange=${e=>set(i,c.k,e.target.value)}>${c.empty!==false?html`<option value="">—</option>`:''}${c.options.map(o=>html`<option value=${o.v}>${o.l}</option>`)}</select>`
      : html`<input class="inp sm" type=${c.type||'text'} value=${r[c.k]??''} onInput=${e=>set(i,c.k,c.type==='number'?(e.target.value===''?'':+e.target.value):e.target.value)} aria-label=${c.l}/>`}</td>`)}
      ${readOnly?'':html`<td><button class="btn btn-sm btn-ghost" onClick=${()=>onChange(rows.filter((_,j)=>j!==i))} aria-label="Xóa dòng"><${Icon} n="x"/></button></td>`}</tr>`)}
    ${!rows.length?html`<tr><td colspan=${cols.length+1} class="muted small">Chưa có dữ liệu.</td></tr>`:''}</tbody></table></div>
    ${readOnly?'':html`<div class="row"><button class="btn btn-sm" onClick=${()=>onChange([...rows, newRow?newRow(rows.length):{}])}><${Icon} n="plus"/>${addLabel}</button><button class="btn btn-sm btn-ghost" onClick=${()=>setPaste(!paste)}>Dán từ Excel</button></div>
      ${paste?html`<div class="col" style="gap:6px"><div class="small muted">Copy các cột theo thứ tự: ${cols.map(c=>c.l).join(' | ')} ${pasteHint||''}</div><textarea class="inp" style="min-height:120px;font-family:var(--f-mono);font-size:12px" value=${txt} onInput=${e=>setTxt(e.target.value)}></textarea><div><button class="btn btn-sm btn-primary" onClick=${doPaste}>Thêm các dòng</button></div></div>`:''}`}
  </div>`;
}

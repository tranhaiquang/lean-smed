/* ===================== PREPARATION BOARD (menu Preparation) ===================== */
function PrepBoard(){
  const u=me(); const [cat,setCat]=useState('all'); const [mine,setMine]=useState(!['prod','lean','admin','mgmt'].includes(u.role));
  const cos=vals(Store.data.changeovers).filter(c=>['Planned','Preparing','Ready'].includes(c.status) && inScope(c.lineId)).sort(by('plannedStart'));
  const [pv,setPv]=useState(null);
  const catMap={all:null, Material:['Material'], Machine:['Machine','Tooling'], People:['People','Layout'], Documents:['Documents','Quality']};
  return html`<div class="col"><div class="row-sb"><h1>Chuẩn bị ngoài chuyền</h1><label class="chk"><input type="checkbox" checked=${mine} onChange=${e=>setMine(e.target.checked)}/> Chỉ việc của tôi</label></div>
    <${Tabs} value=${cat} onChange=${setCat} tabs=${[{v:'all',l:'Tất cả'},{v:'Material',l:'Material kit'},{v:'Machine',l:'Machine/tooling'},{v:'People',l:'People & layout'},{v:'Documents',l:'Documents & QA'}]}/>
    ${!cos.length?html`<${Empty} title="Không có changeover đang chuẩn bị"><//>`:''}
    ${cos.map(c=>{ const ts=vals(c.checklist).filter(t=>(!catMap[cat]||catMap[cat].includes(t.cat)) && (!mine || t.ownerUser===u.id || t.ownerRole===u.role)).sort(by('order')); if(!ts.length) return null; const left=c.plannedStart-Date.now();
      return html`<div class="col" style="gap:8px"><div class="row-sb"><div><a href=${'#co-'+c.id}><b>${lineName(c.lineId)} · ${modelLabel(c.modelA)} → ${modelLabel(c.modelB)}</b></a> <${Pill} status=${c.status}/> <${Demo} on=${c.isDemo}/></div><span class=${'small '+(left<0?'t-int':'muted')}>Dừng chuyền ${fmtDT(c.plannedStart)} · ${left>0?'còn '+fmtClock(left):'quá giờ'}</span></div>
        ${ts.map(t=>html`<${TaskCard} co=${c} t=${t} onPhoto=${setPv}/>`)}</div>`; })}
    ${pv?html`<${PhotoView} src=${pv} onClose=${()=>setPv(null)}/>`:''}</div>`;
}

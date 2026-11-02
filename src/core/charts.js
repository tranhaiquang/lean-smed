/* ---------- Biểu đồ SVG ---------- */
function ParetoChart({data, onBar, height=240}){
  if(!data.length) return html`<${Empty} title="Chưa có dữ liệu chờ/trễ">Khi bấm giờ khoảng chờ có delay code, Pareto sẽ hiện ở đây.<//>`;
  const W=640,H=height,pl=44,pr=40,pt=26,pb=46; const max=Math.max(...data.map(d=>d.ms))/60000; const nice=Math.max(5,Math.ceil(max/5)*5);
  const bw=(W-pl-pr)/data.length; const y=v=>pt+(H-pt-pb)*(1-v/nice); const yc=p=>pt+(H-pt-pb)*(1-p/100);
  const ticks=[0,nice/2,nice];
  return html`<svg class="chart" viewBox=${`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ Pareto lý do chờ">
    ${ticks.map(t=>html`<line class="gridl" x1=${pl} x2=${W-pr} y1=${y(t)} y2=${y(t)}/><text x=${pl-6} y=${y(t)+4} text-anchor="end">${t}</text>`)}
    <text x=${pl-6} y=${pt-14} text-anchor="end" style="font-size:10px">phút</text>
    ${[0,50,80,100].map(p=>html`<text x=${W-pr+6} y=${yc(p)+4}>${p}%</text>`)}
    <line x1=${pl} x2=${W-pr} y1=${yc(80)} y2=${yc(80)} stroke="var(--ink-3)" stroke-dasharray="3 3"/>
    ${data.map((d,i)=>html`<g style="cursor:pointer" onClick=${()=>onBar&&onBar(d)}>
      <rect x=${pl+i*bw+bw*.15} y=${y(d.ms/60000)} width=${bw*.7} height=${Math.max(1,H-pb-y(d.ms/60000))} rx="2" fill=${i<3?'var(--bad)':'var(--ink-3)'}><title>${d.code}: ${fmtMin(d.ms)} phút · ${d.count} lần</title></rect>
      <text x=${pl+i*bw+bw/2} y=${y(d.ms/60000)-4} text-anchor="middle" style="font-weight:600;fill:var(--ink)">${fmtMin(d.ms,0)}</text>
      <text x=${pl+i*bw+bw/2} y=${H-pb+15} text-anchor="middle" style="font-weight:600">${d.code}</text>
      <text x=${pl+i*bw+bw/2} y=${H-pb+29} text-anchor="middle" style="font-size:10px">${d.count} lần</text></g>`)}
    <polyline fill="none" stroke="var(--accent)" stroke-width="2.5" points=${data.map((d,i)=>`${pl+i*bw+bw/2},${yc(d.cum)}`).join(' ')}/>
    ${data.map((d,i)=>html`<circle cx=${pl+i*bw+bw/2} cy=${yc(d.cum)} r="3.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="1.5"/>`)}
  </svg>`;
}
function Gantt({co, now=Date.now()}){
  const acts=vals(co.activities).filter(a=>a.startAt).sort(by('startAt'));
  if(!acts.length) return html`<${Empty} title="Chưa có hoạt động nào được bấm giờ"><//>`;
  const t0=Math.min(...acts.map(a=>a.startAt), co.events?.lineStopAt||Infinity);
  const t1=Math.max(...acts.map(a=>a.endAt||now), co.events?.releasedAt||0, co.events?.firstPairApprovedAt||0);
  const W=760, rowH=22, pl=230, pr=16, top=30; const H=top+acts.length*rowH+52; const span=Math.max(60000,t1-t0);
  const x=t=>pl+(W-pl-pr)*((t-t0)/span); const step = span>7200000?1800000:span>3600000?900000:span>1200000?300000:60000;
  const ticks=[]; for(let t=0;t<=span;t+=step) ticks.push(t);
  const trunc=s=>{ s=tr(s); return s.length>32?s.slice(0,31)+'…':s; };
  const ev=co.events||{};
  const marks=[[ev.lineStopAt,'Dừng chuyền'],[ev.firstPairApprovedAt,'QA Pass'],[ev.releasedAt,'Release']].filter(m=>m[0]);
  return html`<div class="tbl-wrap" style="border:0"><svg class="chart" viewBox=${`0 0 ${W} ${H}`} style="min-width:620px" role="img" aria-label="Biểu đồ thời gian hoạt động">
    ${ticks.map(t=>html`<line class="gridl" x1=${x(t0+t)} x2=${x(t0+t)} y1=${top-6} y2=${H-30}/><text x=${x(t0+t)} y=${top-10} text-anchor="middle">${Math.round(t/60000)}′</text>`)}
    ${acts.map((a,i)=>html`<g>
      <text x=${pl-8} y=${top+i*rowH+15} text-anchor="end" style="fill:var(--ink)">${trunc(a.name)}</text>
      <rect x=${x(a.startAt)} y=${top+i*rowH+4} width=${Math.max(2,x(a.endAt||now)-x(a.startAt))} height=${rowH-8} rx="3" fill=${ACT_TYPES[a.type]?.col||'var(--ink-3)'} opacity=${a.endAt?0.9:0.55}><title>${a.name}: ${fmtMin((a.endAt||now)-a.startAt)} phút${a.delayCode?' · '+a.delayCode:''}</title></rect></g>`)}
    ${marks.map(([t,l],i)=>html`<line x1=${x(t)} x2=${x(t)} y1=${top-4} y2=${H-14-i*13} stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 3"/><text x=${x(t)>W-110?x(t)-4:x(t)+4} y=${H-6-i*13} text-anchor=${x(t)>W-110?'end':'start'} style="fill:var(--ink);font-weight:600">${l}</text>`)}
  </svg></div>`;
}
function TrendChart({points, height=220}){
  if(!points.length) return html`<${Empty} title="Chưa có changeover hoàn tất trong khoảng lọc"><//>`;
  const W=640,H=height,pl=40,pr=12,pt=12,pb=34; const maxV=Math.max(...points.map(p=>Math.max(p.y||0,p.t||0)))*1.1||10;
  const x=i=>pl+(W-pl-pr)*(points.length===1?0.5:i/(points.length-1)); const y=v=>pt+(H-pt-pb)*(1-v/maxV);
  const ticks=[0,Math.round(maxV/2),Math.round(maxV)];
  return html`<svg class="chart" viewBox=${`0 0 ${W} ${H}`} role="img" aria-label="Xu hướng internal time">
    ${ticks.map(t=>html`<line class="gridl" x1=${pl} x2=${W-pr} y1=${y(t)} y2=${y(t)}/><text x=${pl-6} y=${y(t)+4} text-anchor="end">${t}</text>`)}
    <polyline fill="none" stroke="var(--ink-3)" stroke-dasharray="5 4" stroke-width="1.5" points=${points.map((p,i)=>`${x(i)},${y(p.t||0)}`).join(' ')}/>
    <polyline fill="none" stroke="var(--info)" stroke-width="2.5" points=${points.map((p,i)=>`${x(i)},${y(p.y)}`).join(' ')}/>
    ${points.map((p,i)=>html`<circle cx=${x(i)} cy=${y(p.y)} r="4.5" fill=${p.y<=p.t?'var(--ok)':'var(--bad)'} stroke="var(--surface)" stroke-width="1.5"><title>${p.label}: ${p.y.toFixed(1)} / target ${p.t}</title></circle>`)}
    ${points.map((p,i)=> (points.length<=12 || i%Math.ceil(points.length/10)===0) ? html`<text x=${x(i)} y=${H-pb+16} text-anchor="middle" style="font-size:10px">${p.short}</text>`:'')}
  </svg>`;
}
function HBars({rows, unit='phút'}){
  if(!rows.length) return html`<${Empty} title="Chưa có dữ liệu"><//>`;
  const max=Math.max(...rows.map(r=>Math.max(r.v,r.t||0)))||1;
  return html`<div class="col" style="gap:8px">${rows.map(r=>html`<div>
    <div class="row-sb small"><span style="font-weight:600">${r.l}</span><span class="num muted">${r.v.toFixed(1)} ${unit}${r.t?` · target ${r.t}`:''} · n=${r.n}</span></div>
    <div style="position:relative;height:10px;background:var(--surface-2);border-radius:5px;overflow:hidden"><i style=${`position:absolute;inset:0 auto 0 0;width:${r.v/max*100}%;background:${r.t&&r.v>r.t?'var(--bad)':'var(--ok)'}`}></i>
    ${r.t?html`<i style=${`position:absolute;top:0;bottom:0;left:${r.t/max*100}%;width:2px;background:var(--ink)`}></i>`:''}</div></div>`)}</div>`;
}
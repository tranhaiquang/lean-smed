/* ===================== SO SÁNH A/B ===================== */
const CMP_FIELDS = [['machineType','Loại máy'],['needle','Kim'],['thread','Chỉ'],['spi','SPI'],['stitchType','Kiểu mũi'],['tooling','Tooling/cữ gá']];
function compareRevs(revA, revB){
  const rows=[];
  const opsA = (revA?.ops||[]), opsB=(revB?.ops||[]);
  const keyOf = o => (o.opCode||o.op||'').trim().toLowerCase();
  const mapA = new Map(opsA.map(o=>[keyOf(o),o]));
  const seen = new Set();
  for(const b of opsB){
    const k=keyOf(b); seen.add(k); const a=mapA.get(k);
    if(!a){ rows.push({key:'op:'+k+':add', op:b.op, seq:b.seq, field:'Công đoạn', a:'(không có)', b:'Thêm mới – '+(b.machineType||''), status:'Change required'}); continue; }
    for(const [f,l] of CMP_FIELDS){
      const va=(a[f]??'').toString().trim(), vb=(b[f]??'').toString().trim();
      const status = (!va || !vb) ? (va===vb ? 'No change' : 'Verify') : (va===vb ? 'No change' : 'Change required');
      if(!va && !vb) continue;
      rows.push({key:'op:'+k+':'+f, op:b.op, seq:b.seq, field:l, a:va||'—', b:vb||'—', status});
    }
  }
  for(const a of opsA){ const k=keyOf(a); if(!seen.has(k)) rows.push({key:'op:'+k+':rm', op:a.op, seq:a.seq, field:'Công đoạn', a:a.op+' – '+(a.machineType||''), b:'(bỏ)', status:'Change required'}); }
  const la=revA?.layout||{}, lb=revB?.layout||{};
  if(la.workers!=null || lb.workers!=null){ const st = la.workers==null||lb.workers==null ? 'Verify' : (+la.workers===+lb.workers?'No change':'Change required'); rows.push({key:'layout:workers', op:'Layout', seq:999, field:'Số người', a:la.workers??'—', b:lb.workers??'—', status:st}); }
  if(la.version || lb.version){ rows.push({key:'layout:version', op:'Layout', seq:999, field:'Layout version', a:la.version||'—', b:lb.version||'—', status: (!la.version||!lb.version)?'Verify':(la.version===lb.version?'No change':'Change required')}); }
  const qa = new Set((revA?.qcPoints||[]).map(q=>q.name)), qb=(revB?.qcPoints||[]);
  qb.filter(q=>!qa.has(q.name)).forEach(q=>rows.push({key:'qc:'+q.name, op:'Quality checkpoint', seq:1000, field:'Điểm kiểm tra mới', a:'—', b:q.name+(q.spec?' ('+q.spec+')':''), status:'Change required'}));
  if(!revA || !revB) rows.unshift({key:'rev:missing', op:'Dữ liệu', seq:0, field:'Revision', a:revA?revA.rev:'thiếu', b:revB?revB.rev:'thiếu', status:'Verify'});
  return rows.sort((x,y)=>(x.seq||0)-(y.seq||0));
}

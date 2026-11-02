/* ===================== ALERTS (mục 8) ===================== */
function computeAlerts(now=Date.now()){
  const out=[]; const d=Store.data; const cfg=Store.config; if(!cfg) return out;
  const u=me();
  for(const co of vals(d.changeovers)){
    if(!ACTIVE_STATUSES.includes(co.status)) continue;
    if(u && !inScope(co.lineId,u)) continue;
    const ac=alertCfg(co.lineId); const k=coKpi(co,now);
    const label = `${co.id} · ${lineName(co.lineId)}`;
    if(['Planned','Preparing','Ready'].includes(co.status) && co.plannedStart){
      const left = co.plannedStart-now;
      const crit = vals(co.checklist).filter(t=>t.critical && t.status!=='Done' && !(t.status==='NA'&&t.naApprovedBy));
      if(crit.length && !co.exception?.approvedBy && left < (ac.prepWarnMin||30)*60000)
        out.push({sev: left<0?'bad':'warn', type:'prep', co:co.id, roles:['leader','material','tech','prod'], title:`${crit.length} hạng mục critical chưa xong`, sub:`${label} · ${left<0?'đã quá giờ dừng':'còn '+Math.round(left/60000)+' phút tới giờ dừng'}`});
    }
    for(const t of vals(co.checklist)){
      if(t.status==='Blocked') out.push({sev:'bad', type:'blocked', co:co.id, task:t.id, roles:['prod','leader',t.ownerRole], title:`Chuẩn bị bị chặn: ${t.desc}`, sub:`${label} · ${t.blockReason||'chưa ghi lý do'} → escalate Production Manager`});
      else if(t.dueAt && t.dueAt<now && !['Done','NA'].includes(t.status) && ['Planned','Preparing','Ready'].includes(co.status)) out.push({sev:'warn', type:'overdue', co:co.id, task:t.id, roles:[t.ownerRole,'leader'], title:`Tác vụ quá hạn: ${t.desc}`, sub:`${label} · hạn ${fmtDT(t.dueAt)} · ${ROLES[t.ownerRole]||''}`});
    }
    if(k.running && k.targetMs){
      const r = k.internalMs/k.targetMs*100;
      if(r>= (ac.overTargetPct||100)) out.push({sev:'bad', type:'over', co:co.id, roles:['leader','prod','lean'], title:`Vượt target: ${fmtMin(k.internalMs,0)}/${co.targetMin} phút`, sub:`${label} · cần gắn reason code và mở review`});
      else if(r>=(ac.warnTargetPct||80)) out.push({sev:'warn', type:'near', co:co.id, roles:['leader','prod'], title:`Sắp chạm target (${Math.round(r)}%)`, sub:label});
    }
    if(co.status==='AwaitingQuality'){
      const tr=vals(co.trials).sort(by('seq')).pop();
      if(tr && !tr.decision && now-tr.sentAt > (ac.qaWaitMin||15)*60000) out.push({sev:'bad', type:'qa', co:co.id, roles:['qa','prod'], title:`Chờ QA ${Math.round((now-tr.sentAt)/60000)} phút (lần thử ${tr.seq})`, sub:`${label} · cảnh báo ưu tiên`});
      if(co.events?.firstPairApprovedAt && !co.events?.releasedAt) out.push({sev:'info', type:'release', co:co.id, roles:['prod','qa'], title:'QA đã Pass – chờ release sản xuất', sub:label});
    }
    if(co.status==='Rework') out.push({sev:'bad', type:'fail', co:co.id, roles:['qa','tech','prod','leader'], title:`First Pair không đạt – cần sửa và thử lại`, sub:`${label} · lần thử ${k.trialsCount}`});
    if(co.escalated && !['Released','StableRun','Closed'].includes(co.status)) out.push({sev:'bad', type:'esc', co:co.id, roles:['qa','prod','tech'], title:'Escalation: lỗi lặp lại / vượt số lần thử', sub:label});
    if(co.status==='Released'){ const s=stableCheck(co); if(s.met) out.push({sev:'info', type:'stable', co:co.id, roles:['ie','prod'], title:'Đạt tiêu chí ổn định – chờ xác nhận Stable Run', sub:label}); }
  }
  for(const kz of vals(d.kaizen)){
    if(['Verified','Cancelled'].includes(kz.status)) continue;
    if(kz.due && dayStart(kz.due)+86400000 < now) out.push({sev:'warn', type:'kaizen', kz:kz.id, roles:['lean'], users:[kz.owner], title:`Kaizen quá hạn: ${kz.title}`, sub:`${kz.id} · ${userName(kz.owner)} · hạn ${kz.due}`});
  }
  for(const s of vals(d.sops)){
    const r=effectiveSop(s); if(!r?.reviewDate) continue;
    const left=dayStart(r.reviewDate)-now; const days=(alertCfg().sopReviewDays||14);
    if(left < days*86400000) out.push({sev:left<0?'bad':'warn', type:'sop', sop:s.id, roles:['lean','ie'], title:`SOP ${left<0?'đã quá':'sắp tới'} hạn review: ${s.code}`, sub:`${s.name} · rev ${r.rev} · ${r.reviewDate}`});
  }
  const rank={bad:0,warn:1,info:2};
  return out.sort((a,b)=>rank[a.sev]-rank[b.sev]);
}
const alertsForMe = (list) => { const u=me(); if(!u) return []; if(['admin','mgmt','lean','prod'].includes(u.role)) return list; return list.filter(a=>(a.roles||[]).includes(u.role) || (a.users||[]).includes(u.id)); };
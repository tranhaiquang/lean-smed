function PlanForm({co, onDone}){
  const cfg=Store.config; const u=me();
  const firstLine=(cfg.lines||[]).find(l=>l.status!=='Inactive' && inScope(l.id));
  const nextHour=Math.ceil(Date.now()/3600000)*3600000+3600000;
  const [f,setF]=useState(()=> co ? {lineId:co.lineId, shiftId:co.shiftId, modelA:co.modelA||'', modelB:co.modelB||'', reSetup:!!co.reSetup, plannedStart:toLocalInput(co.plannedStart), owner:co.owner, orderRef:co.orderRef||'', qty:co.qty||'', assigned:{...(co.assigned||{})}, notes:co.notes||'', risk:co.risk||'', ov:!!co.targetOverride, ovMin:co.targetOverride?.to??'', ovReason:co.targetOverride?.reason||''}
    : {lineId:firstLine?.id||'', shiftId:'', modelA:'', modelB:'', reSetup:false, plannedStart:toLocalInput(nextHour), owner:u.id, orderRef:'', qty:'', assigned:{leader:u.role==='leader'?u.id:''}, notes:'', risk:'', ov:false, ovMin:'', ovReason:''});
  const S=(k,v)=>setF(p=>({...p,[k]:v}));
  const ps=fromLocalInput(f.plannedStart);
  useEffect(()=>{ if(!f.shiftId && ps){ const sh=(cfg.shifts||[]).find(s=>shiftWindowContains(s,ps)); if(sh) S('shiftId',sh.id); } },[f.plannedStart]);
  const std=findStandard(f.lineId, f.modelA, f.modelB, ps||Date.now());
  const target = f.ov && f.ovMin!=='' ? +f.ovMin : std?.targetMin ?? null;
  const models=vals(Store.data.models).filter(m=>m.status!=='Inactive');
  const sh=(cfg.shifts||[]).find(s=>s.id===f.shiftId);
  const errs={
    modelB: !f.modelB?'Bắt buộc':'' , same: f.modelA && f.modelA===f.modelB && !f.reSetup ? 'Model A và B trùng nhau – chỉ cho phép khi là re-setup' : '',
    shift: ps && sh && !shiftWindowContains(sh,ps) ? `Giờ bắt đầu nằm ngoài ${sh.name} (${sh.start}–${sh.end})` : '',
    ov: f.ov && (!f.ovReason.trim() || f.ovMin==='') ? 'Ghi đè cần giá trị và lý do' : '',
  };
  const build = () => {
    const base = co ? clone(co) : {};
    const d = {...base, siteId:cfg.site?.id, lineId:f.lineId, shiftId:f.shiftId, modelA:f.modelA||null, modelB:f.modelB||null, reSetup:f.reSetup, plannedStart:ps, owner:f.owner, orderRef:f.orderRef, qty:f.qty===''?null:+f.qty,
      assigned:f.assigned, notes:f.notes, risk:f.risk, targetMin:target, baselineMin:std?.baselineMin??null, standardRef: std?{id:std.id, rev:std.rev}:null,
      targetOverride: f.ov ? {from:std?.targetMin??null, to:+f.ovMin, reason:f.ovReason, by:can('target.override')?u.id:null, at:Date.now()} : null};
    return d;
  };
  const save = async (confirm) => {
    if(!can('co.create') && !co) return toast('Bạn không có quyền tạo kế hoạch.','bad');
    if(!f.lineId) return toast('Chọn chuyền.','bad');
    if(!inScope(f.lineId)) return toast('Chuyền ngoài phạm vi phân quyền.','bad');
    if(f.ov && !can('target.override')) return toast('Bạn không có quyền ghi đè target (Production/Lean/IE).','bad');
    let d=build();
    if(!co){
      d = {...d, id:newCoId(f.lineId, ps||Date.now()), status:'Draft', statusAt:Date.now(), createdBy:u.id, createdAt:Date.now(), events:{}, activities:{}, trials:{}, rampup:{}, approvals:{}, attachments:{}, comparison:{rows:{}}, isDemo:false};
      Object.assign(d, buildChecklist(d));
      const e=auditEntry('create', d.id, {after:'Draft'}); d.audit={[e.id]:e};
      await Store.set('changeovers', d.id, d);
    } else {
      if(!['Draft','Planned'].includes(co.status)) return toast('Chỉ sửa kế hoạch ở trạng thái Nháp / Đã lập kế hoạch.','bad');
      if(co.status==='Planned' && !can('co.plan')) return toast('Kế hoạch đã xác nhận – chỉ Production Manager được sửa.','bad');
      const changed={}; for(const k of ['lineId','shiftId','modelA','modelB','plannedStart','owner','targetMin']) if(co[k]!==d[k]) changed[k]=[co[k],d[k]];
      const patch={...d}; delete patch.audit; delete patch.checklist; delete patch.activities; delete patch.trials; delete patch.approvals;
      if(co.plannedStart!==d.plannedStart){ const cl={}; vals(co.checklist).forEach(t=>{ if(t.dueOffsetMin!=null) cl[t.id]={dueAt:d.plannedStart-(t.dueOffsetMin)*60000}; }); patch.checklist=cl; }
      if(co.modelA!==d.modelA || co.modelB!==d.modelB){ if(co.status==='Planned') Object.assign(patch, buildComparison(d)); }
      await coPatch(co, patch, 'plan.edit', {before:Object.fromEntries(Object.entries(changed).map(([k,v])=>[k,v[0]])), after:Object.fromEntries(Object.entries(changed).map(([k,v])=>[k,v[1]]))});
    }
    toast(co?'Đã cập nhật kế hoạch':'Đã lưu nháp '+d.id,'ok');
    if(confirm){ const ok=await transition(coById(d.id)||d, 'Planned'); if(!ok){ go('co-'+d.id); onDone&&onDone(); return; } }
    if(onDone) onDone(); else go('co-'+d.id);
  };
  const preview = gateCheck({...build(), checklist:{x:1}}, 'Planned');
  const roleCount = r => (cfg.users||[]).filter(u=>u.active!==false && u.role===r && ((u.lines||['*']).includes('*') || (u.lines||[]).includes(f.lineId))).length;
  const missingRoles = ['leader','ie','tech','qa','material'].filter(r=>!roleCount(r));
  const roleSel = r => html`<${Field} label=${ROLES[r]} req hint=${roleCount(r)?'':html`<span style="color:var(--warn)">Chưa có ${ROLES[r]} cho chuyền này – thêm ở Cài đặt → Người dùng</span>`}><${UserSel} value=${f.assigned[r]} role=${r} lineId=${f.lineId} onChange=${v=>S('assigned',{...f.assigned,[r]:v})}/><//>`;
  return html`<div class="col">
    ${!co?html`<div class="row"><button class="btn btn-ghost btn-sm" onClick=${()=>history.back()}><${Icon} n="back"/>Quay lại</button></div><h1>Tạo kế hoạch changeover</h1>`:''}
    <div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)" id="plan-grid">
      <div class="col">
        <div class="card"><div class="card-h"><h3>Chuyền & thời gian</h3>${co?html`<span class="mono small">${co.id}</span>`:html`<span class="small muted">ID tự sinh khi lưu, không sửa được</span>`}</div>
          <div class="grid g3" style="gap:10px">
            <${Field} label="Site" req><select class="inp" disabled><option>${cfg.site?.name}</option></select><//>
            <${Field} label="Chuyền" req><select class="inp" id="pf-line" value=${f.lineId} onChange=${e=>S('lineId',e.target.value)}>${(cfg.lines||[]).filter(l=>l.status!=='Inactive' && inScope(l.id)).map(l=>html`<option value=${l.id}>${l.name}${l.building?' · '+l.building:''}</option>`)}</select><//>
            <${Field} label="Ca" req err=${errs.shift}><select class="inp" id="pf-shift" value=${f.shiftId} onChange=${e=>S('shiftId',e.target.value)}><option value="">— chọn —</option>${(cfg.shifts||[]).filter(s=>{ const l=(cfg.lines||[]).find(x=>x.id===f.lineId); return !l?.shifts?.length || l.shifts.includes(s.id); }).map(s=>html`<option value=${s.id}>${s.name} (${s.start}–${s.end})</option>`)}</select><//>
            <${Field} label="Ngày/giờ dừng chuyền dự kiến" req><input class="inp" id="pf-start" type="datetime-local" value=${f.plannedStart} onInput=${e=>S('plannedStart',e.target.value)}/><//>
            <${Field} label="Đơn hàng liên quan" hint="Nhập tay hoặc mã ERP"><input class="inp" id="pf-order" value=${f.orderRef} onInput=${e=>S('orderRef',e.target.value)}/><//>
            <${Field} label="Số lượng (đôi)"><input class="inp" id="pf-qty" type="number" min="0" value=${f.qty} onInput=${e=>S('qty',e.target.value)}/><//>
          </div></div>
        <div class="card"><div class="card-h"><h3>Model</h3><a class="small" href="#models">Model Library →</a></div>
          <div class="grid g2" style="gap:10px">
            <${Field} label="Model A (đang chạy)" req><select class="inp" id="pf-a" value=${f.modelA} onChange=${e=>S('modelA',e.target.value)}><option value="">— chọn —</option>${models.map(m=>html`<option value=${m.id}>${m.code} · ${m.name}${m.isDemo?' [DEMO]':''}</option>`)}</select><//>
            <${Field} label="Model B (chuyển sang)" req err=${errs.same}><select class="inp" id="pf-b" value=${f.modelB} onChange=${e=>S('modelB',e.target.value)}><option value="">— chọn —</option>${models.map(m=>html`<option value=${m.id}>${m.code} · ${m.name}${m.isDemo?' [DEMO]':''}</option>`)}</select><//>
          </div>
          <label class="chk" style="margin-top:8px"><input type="checkbox" id="pf-re" checked=${f.reSetup} onChange=${e=>S('reSetup',e.target.checked)}/> Re-setup cùng model (định nghĩa riêng)</label>
          ${f.modelB && !effectiveRev(modelById(f.modelB), ps||Date.now())?html`<div class="note warn small" style="margin-top:8px">Model B chưa có revision routing được duyệt tại ngày thực hiện – so sánh A/B sẽ ở trạng thái Verify.</div>`:''}
        </div>
        <div class="card"><div class="card-h"><h3>Phân công</h3></div>
          ${missingRoles.length?html`<div class="note warn small" style="margin-bottom:10px">Danh sách chọn chỉ hiện người dùng đúng vai trò và có quyền trên chuyền đã chọn. Hệ thống chưa có: <b>${missingRoles.map(r=>ROLES[r]).join(', ')}</b>. ${can('config.system')?html`<a href="#admin">Thêm người dùng trong Cài đặt → Người dùng</a> (có thể dán danh sách từ Excel).`:'Nhờ System Admin thêm tài khoản.'} Có thể lưu nháp trước rồi phân công sau.</div>`:''}
          <div class="grid g3" style="gap:10px">
            <${Field} label="Changeover owner" req><${UserSel} value=${f.owner} lineId=${f.lineId} onChange=${v=>S('owner',v)}/><//>
            ${['leader','ie','tech','qa','material'].map(roleSel)}
          </div></div>
        <div class="card"><div class="card-h"><h3>Checklist chuẩn bị (được tạo khi lưu)</h3><a class="small" href="#admin">Cài đặt → Checklist mẫu</a></div>
          ${cfg.checklistTemplate && cfg.checklistTemplate.length?
            html`<div class="tbl-wrap"><table class="tbl">
              <thead><tr><th>STT</th><th>Mã</th><th>Danh mục</th><th>Mô tả</th><th>Tiêu chí</th><th>Người làm</th><th>Hạn chót</th><th>Tiến độ</th><th>Critical</th></tr></thead>
              <tbody>
              ${cfg.checklistTemplate.map((t,i)=>{
                const slot=ROLE_SLOT[t.ownerRole]||'leader';
                const ownerUser=f.assigned?.[slot]||'';
                const dueAt=f.plannedStart?fmtDT(f.plannedStart-(t.dueOffsetMin||0)*60000):'—';
                return html`<tr>
                  <td class="mono small">${String(i+1).padStart(2,'0')}</td>
                  <td class="mono">${t.id}</td>
                  <td>${CAT_VN[t.cat]||t.cat}</td>
                  <td>${t.desc}</td>
                  <td class="small muted">${t.acceptance||'—'}</td>
                  <td>${ownerUser||'—'}</td>
                  <td class="small">${dueAt}</td>
                  <td><span class="pill p-grey">Chờ làm</span></td>
                  ${t.critical?html`<td class="pill p-red">Critical</td>`:html`<td class="pill p-grey">Normal</td>`}
                </tr>`;
              })}
              </tbody>
            </table></div>`:html`<div class="note faint small">Chưa có mẫu checklist tại Cài đặt → Checklist mẫu.</div>`}
        </div>
      </div>
      <div class="col">
          <${Field} label="Ghi chú"><textarea class="inp" id="pf-notes" value=${f.notes} onInput=${e=>S('notes',e.target.value)}></textarea><//>
          <${Field} label="Rủi ro đặc biệt"><textarea class="inp" id="pf-risk" value=${f.risk} onInput=${e=>S('risk',e.target.value)} placeholder="VD: vật liệu mới, công nhân mới, máy mượn chuyền khác…"></textarea><//></div></div>
      </div>
      <div class="col">
        <div class="card"><div class="eyebrow">Target internal time</div>
          <div style="font-family:var(--f-display);font-size:44px;font-weight:600;line-height:1.1" class="num">${target??'—'}<small style="font-size:18px" class="muted"> phút</small></div>
          <div class="small muted">${std?html`Theo standard <span class="mono">${std.id}</span> rev ${std.rev} · baseline ${std.baselineMin??'—'} phút${std.note?html`<br/><span class="faint">${std.note}</span>`:''}`:'Chưa có standard được duyệt cho tổ hợp này'}</div>
          <div class="sep" style="margin:10px 0"></div>
          <label class="chk"><input type="checkbox" id="pf-ov" checked=${f.ov} disabled=${!can('target.override')} onChange=${e=>S('ov',e.target.checked)}/> Ghi đè target ${!can('target.override')?html`<span class="faint small">(cần quyền Production/Lean/IE)</span>`:''}</label>
          ${f.ov?html`<div class="col" style="margin-top:8px;gap:8px"><${Field} label="Target mới (phút)" req><input class="inp" id="pf-ovmin" type="number" min="1" value=${f.ovMin} onInput=${e=>S('ovMin',e.target.value)}/><//><${Field} label="Lý do ghi đè" req err=${errs.ov}><textarea class="inp" id="pf-ovr" value=${f.ovReason} onInput=${e=>S('ovReason',e.target.value)}></textarea><//></div>`:''}
        </div>
        <div class="card"><h4 style="margin-bottom:8px">Điều kiện chuyển sang Planned</h4><${Gate} items=${preview}/></div>
        <div class="col" style="gap:8px">
          <button class="btn btn-primary btn-xl" id="pf-confirm" onClick=${()=>save(true)} disabled=${!can('co.plan')} title=${can('co.plan')?'':'Chỉ Production Manager xác nhận kế hoạch'}>Lưu & xác nhận kế hoạch</button>
          <button class="btn" id="pf-draft" onClick=${()=>save(false)}>${co?'Lưu thay đổi':'Lưu nháp'}</button>
        </div>
      </div>
    </div>
    <style>@media (max-width:1000px){#plan-grid{grid-template-columns:minmax(0,1fr)!important}}</style></div>`;
}

/* ---------- 4.3 Trang chi tiết ---------- */
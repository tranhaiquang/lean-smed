/* ===================== 4.10 KAIZEN & AI COACH ===================== */
const SMED_TACTICS = {
  MAT01:['Kit vật tư model B trên xe kit có mã màu, kiểm đếm xong trước T-60 phút','Kanban phụ liệu theo kế hoạch changeover, Material Handler xác nhận bằng ảnh','Chuyển "kiểm tra vật tư" thành external work trong checklist'],
  TLS01:['Shadow board cữ gá/folder/chân vịt theo mã model, vị trí cố định cạnh chuyền','Tooling cart chuẩn bị sẵn trước giờ dừng (external)','Mã màu tooling theo nhóm model để giảm tìm kiếm'],
  TEC01:['Lịch kỹ thuật viên gắn với kế hoạch changeover, nhắc T-30','Đào tạo Line Leader tự thay tooling đơn giản (tách việc khỏi kỹ thuật)','Làm song song: 2 kỹ thuật viên chia cụm máy'],
  MAC01:['Bảo trì phòng ngừa máy model B trước 1 ca','Máy dự phòng đã cài đặt sẵn cho công đoạn tắc nghẽn','Checklist kiểm tra máy external (dầu, kim, ổ chao)'],
  QA01:['QA trực first pair theo lịch changeover','Tiêu chuẩn hình ảnh tại chuyền giúp kiểm tra nhanh','Ủy quyền kiểm tra inline cho QA chuyền theo SOP'],
  DOC01:['Tech pack & mẫu chuẩn đúng revision có tại chuyền trước T-60','Bảng hướng dẫn trực quan cho công đoạn thay đổi','Kiểm soát revision tài liệu trong Model Library'],
  HR01:['Skill matrix theo công đoạn, phân công trước ca','Đào tạo đa năng cho công đoạn khó','Bố trí người hỗ trợ changeover (flying team)'],
  LAY01:['Layout module, vạch sàn vị trí máy theo nhóm model','Máy có bánh xe khóa & quick-connect điện/khí','Mô phỏng layout trước, di chuyển máy không ảnh hưởng (external)'],
  SET01:['Setting sheet thông số chuẩn theo model (SPI, lực nén, nhiệt độ)','Cữ chặn cố định / chốt định vị – loại bỏ điều chỉnh','Kẹp nhanh, vít một vòng thay bulông'],
  TRI01:['Phân tích lỗi thử mẫu lặp lại, áp dụng poka-yoke','Kiểm tra bán thành phẩm trước khi may first pair','Chuẩn hóa thông số đã chứng minh đạt vào setting sheet'],
  OTH01:['Phân loại lại ghi chú OTH01 thành delay code cụ thể','Review ghi chú với Line Leader để tìm nguyên nhân gốc'],
};
const FISH = [['man','Con người'],['machine','Máy'],['method','Phương pháp'],['material','Vật liệu'],['measure','Đo lường'],['env','Môi trường']];

function KaizenPage(){
  const [st,setSt]=useState('open');
  const all=vals(Store.data.kaizen); const now=Date.now();
  const groups={open:all.filter(k=>['Open','InProgress'].includes(k.status)), verify:all.filter(k=>k.status==='Done'), over:all.filter(k=>!['Verified','Cancelled'].includes(k.status)&&k.due&&dayStart(k.due)+86400000<now), ai:all.filter(k=>k.source==='ai' && !['Verified','Rejected'].includes(k.aiStatus)), done:all.filter(k=>['Verified','Cancelled'].includes(k.status)), all};
  const create=async()=>{ if(!can('kaizen.create')) return toast('Bạn không có quyền tạo Kaizen.','bad'); const r=await ask({title:'Tạo Kaizen', fields:[{k:'title',label:'Tiêu đề',required:true},{k:'problem',label:'Problem statement (ở đâu, khi nào, tần suất, phút/lỗi)',type:'textarea',required:true},{k:'code',label:'Delay code liên quan',type:'select',options:(Store.config.delayCodes||[]).map(d=>({v:d.code,l:d.code+' – '+d.reason}))},{k:'line',label:'Chuyền',type:'select',options:(Store.config.lines||[]).map(l=>({v:l.id,l:l.name}))}]}); if(!r) return;
    const id='KZ-'+uid(); await Store.set('kaizen',id,{id, title:r.title, problem:r.problem, delayCode:r.code||null, lineId:r.line||null, owner:me().id, status:'Open', source:'manual', createdAt:Date.now(), createdBy:me().id, rootCause:{why:['','','','',''], fishbone:{}}, history:{}});
    logGlobal('kaizen.create', id, {after:r.title}); go('kz-'+id); };
  return html`<div class="col"><div class="row-sb"><h1>Kaizen & AI Coach</h1>${can('kaizen.create')?html`<button class="btn btn-primary" onClick=${create}><${Icon} n="plus"/>Tạo Kaizen</button>`:''}</div>
    <${AiCoach}/>
    <${Tabs} value=${st} onChange=${setSt} tabs=${[{v:'open',l:'Đang mở',n:groups.open.length},{v:'verify',l:'Chờ xác minh',n:groups.verify.length},{v:'over',l:'Quá hạn',n:groups.over.length},{v:'ai',l:'Đề xuất AI',n:groups.ai.length},{v:'done',l:'Đã đóng',n:groups.done.length},{v:'all',l:'Tất cả',n:all.length}]}/>
    ${groups[st].length?html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Tiêu đề</th><th>Code</th><th>Chuyền</th><th>Owner</th><th>Hạn</th><th class="r">Kỳ vọng′/CO</th><th class="r">Tiết kiệm đã xác minh′</th><th>Trạng thái</th></tr></thead><tbody>
      ${groups[st].sort((a,b)=>(a.due||'9')>(b.due||'9')?1:-1).map(k=>{ const over=!['Verified','Cancelled'].includes(k.status)&&k.due&&dayStart(k.due)+86400000<now; return html`<tr class="click" onClick=${()=>go('kz-'+k.id)}><td class="mono small">${k.id} <${Demo} on=${k.isDemo}/></td><td><b>${k.title}</b>${k.source==='ai'?html` <span class="tag">AI · ${k.aiStatus}</span>`:''}</td><td class="mono">${k.delayCode||''}</td><td>${lineName(k.lineId)}</td><td>${userName(k.owner)}</td><td class=${over?'t-int':''}>${k.due||'—'}</td><td class="r num">${k.expectedMin??'—'}</td><td class="r num">${k.status==='Verified'&&k.baselineMin!=null&&k.postMin!=null?(k.baselineMin-k.postMin).toFixed(1):'—'}</td><td><span class=${'pill '+KZ_STATUS[k.status].c}>${KZ_STATUS[k.status].l}</span></td></tr>`; })}</tbody></table></div>`:html`<${Empty} title="Không có Kaizen trong nhóm này"><//>`}</div>`;
}
function AiCoach(){
  const [days,setDays]=useState(90); const [ai,setAi]=useState(null); const [busy,setBusy]=useState(false); const [sampleOk,setSampleOk]=useState(null);
  useEffect(()=>{ if(IN_ARTIFACT) window.claude.use('sample').then(s=>setSampleOk(!!s)).catch(()=>setSampleOk(false)); else setSampleOk(false); },[]);
  const list=vals(Store.data.changeovers).filter(c=>(c.events?.lineStopAt||0)>Date.now()-days*86400000 && inScope(c.lineId));
  const par=paretoDelay(list).slice(0,4); const agg=aggregateKpi(list);
  const existing=new Set(vals(Store.data.kaizen).filter(k=>!['Verified','Cancelled'].includes(k.status)).map(k=>k.delayCode));
  const suggest=async(p)=>{ if(!can('kaizen.create')) return toast('Không có quyền tạo Kaizen.','bad'); const d=(Store.config.delayCodes||[]).find(x=>x.code===p.code); const id='KZ-'+uid();
    await Store.set('kaizen',id,{id, title:`[AI] Giảm ${d?.reason||p.code}`, problem:`${days} ngày gần nhất: ${p.code} gây ${fmtMin(p.ms)} phút chờ qua ${p.count} changeover (${Math.round(p.pct)}% tổng thời gian chờ).`, evidence:`Pareto delay ${days} ngày; changeover: ${p.cos.slice(0,8).join(', ')}`, countermeasure:(SMED_TACTICS[p.code]||[]).map(x=>'• '+x).join('\n'), delayCode:p.code, linkedCo:p.cos.slice(0,20), expectedMin:+(p.ms/60000/Math.max(1,p.count)*0.5).toFixed(1), baselineMin:+(p.ms/60000/Math.max(1,p.count)).toFixed(1), owner:me().id, status:'Open', source:'ai', aiStatus:'Suggested', createdAt:Date.now(), createdBy:me().id, rootCause:{why:['','','','',''], fishbone:{}}, history:{}});
    logGlobal('ai.suggest', id, {after:p.code}); toast('Đã tạo đề xuất AI – cần người có thẩm quyền review & duyệt','ok'); go('kz-'+id); };
  const deep=async()=>{ setBusy(true); setAi({text:''});
    try{ const sample=await window.claude.use('sample'); if(!sample) throw {code:'not_granted'};
      const data={khoang_ngay:days, so_changeover:agg.total, internal_tb_phut:agg.avgInternal?+(agg.avgInternal/60000).toFixed(1):null, dat_target_pct:agg.targetAch, first_pair_pct:agg.fpRate, chuan_bi_pct:agg.prepAvg,
        pareto:paretoDelay(list).map(p=>({code:p.code, ly_do:(Store.config.delayCodes||[]).find(x=>x.code===p.code)?.reason, phut:+(p.ms/60000).toFixed(1), so_lan:p.count, pct:+p.pct.toFixed(1)})),
        hoat_dong_vuot_chuan: list.flatMap(c=>vals(c.activities).filter(a=>a.stdMin && a.endAt && a.endAt-a.startAt>a.stdMin*60000).map(a=>({ten:a.name, chuan:a.stdMin, thuc_te:+((a.endAt-a.startAt)/60000).toFixed(1)}))).slice(0,30)};
      const prompt=`Bạn là chuyên gia Lean/SMED cho chuyền may giày. Dữ liệu changeover thực tế (JSON):\n${JSON.stringify(data)}\n\nHãy viết bằng ${({vi:'tiếng Việt',en:'English',ko:'tiếng Hàn (한국어)'})[I18N.lang]}, ngắn gọn, dạng gạch đầu dòng:\n1) 3 vấn đề lớn nhất theo dữ liệu (nêu số phút).\n2) Với mỗi vấn đề: hoạt động nào có thể chuyển internal → external, đơn giản hóa internal, làm song song, hoặc loại bỏ điều chỉnh; đề xuất countermeasure cụ thể, kiểm chứng được.\n3) Ước tính phút tiết kiệm/changeover (ghi rõ là ước tính).\nKhông đề xuất thay đổi thông số máy, routing, tech pack hay tiêu chuẩn chất lượng – các thay đổi đó phải do IE/QA phê duyệt.`;
      const r=await sample(prompt,{modelTier:'default', onText:({text})=>setAi({text})}); setAi({text:r.text});
    }catch(e){ setAi({text:'', err: e?.code==='not_granted'?'Phân tích AI chưa được cho phép trong lần xem này.':e?.code==='rate_limited'?'Đang bị giới hạn tần suất, thử lại sau ít phút.':'Không gọi được AI: '+(e?.message||e?.code||'lỗi')}); }
    setBusy(false); };
  return html`<div class="card"><div class="card-h"><div class="row"><span style="color:var(--accent)"><${Icon} n="sparkle"/></span><h3>AI Coach</h3><span class="small muted">phân tích & đề xuất – người có thẩm quyền phải duyệt</span></div><${Seg} value=${days} onChange=${setDays} options=${[{v:30,l:'30 ngày'},{v:90,l:'90 ngày'},{v:365,l:'1 năm'}]}/></div>
    ${par.length?html`<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px">${par.map(p=>html`<div class="note" style="background:var(--surface-2)"><div class="row-sb"><b class="mono">${p.code}</b><span class="small">${fmtMin(p.ms,0)}′ · ${p.count} lần · ${Math.round(p.pct)}%</span></div>
      <div class="small muted">${(Store.config.delayCodes||[]).find(x=>x.code===p.code)?.reason}</div>
      <ul style="margin:6px 0 8px;padding-left:18px" class="small">${(SMED_TACTICS[p.code]||[]).slice(0,2).map(t=>html`<li>${t}</li>`)}</ul>
      ${existing.has(p.code)?html`<span class="tiny muted">Đã có Kaizen đang mở cho code này</span>`:can('kaizen.create')?html`<button class="btn btn-sm" onClick=${()=>suggest(p)}>Tạo đề xuất Kaizen</button>`:''}</div>`)}</div>`
      :html`<div class="muted small">Chưa đủ dữ liệu chờ/trễ trong khoảng này để phân tích.</div>`}
    ${sampleOk && par.length?html`<div style="margin-top:12px"><button class="btn" disabled=${busy} onClick=${deep}><${Icon} n="sparkle"/>${busy?'Đang phân tích…':'Phân tích sâu bằng Claude'}</button></div>`:''}
    ${ai?.err?html`<div class="note warn small" style="margin-top:8px">${ai.err}</div>`:''}
    ${ai?.text?html`<div class="note small" style="margin-top:8px;white-space:pre-wrap">${ai.text}</div><div class="tiny faint">Đề xuất AI chỉ mang tính tham khảo. Tạo Kaizen và để Lean/IE review, duyệt trước khi thực hiện.</div>`:''}
  </div>`;
}
function KaizenDetail({id}){
  const k=Store.data.kaizen[id];
  const [f,setF]=useState(()=>k?clone(k):null);
  useEffect(()=>{ if(k) setF(clone(k)); },[id, k?.status, k?.aiStatus]);
  if(!k||!f) return html`<${Empty} title="Không tìm thấy Kaizen"><a href="#kaizen">Về Kaizen</a><//>`;
  const u=me(); const editable=!['Verified','Cancelled'].includes(k.status) && (can('kaizen.create') || k.owner===u.id);
  const S=(p)=>setF({...f,...p});
  const hist=(action,note)=>{ const e=auditEntry(action,k.id,{reason:note}); return {history:{[e.id]:e}}; };
  const fields=['title','problem','evidence','countermeasure','owner','due','expectedMin','lineId','delayCode','baselineMin','postMin','postSamples','verifyNote'];
  const save=async(extra={},action='kaizen.edit',note)=>{ const p={}; fields.forEach(x=>{ if(f[x]!==undefined) p[x]=f[x]; }); p.rootCause=f.rootCause; await Store.update('kaizen',k.id,{...p,...extra,updatedAt:Date.now(),...hist(action,note)}); toast('Đã lưu','ok'); };
  const setStatus=async st=>{
    if(st==='Verified'){
      if(!can('kaizen.verify')) return toast('Chỉ IE/Lean xác minh Kaizen.','bad');
      if(f.baselineMin==null||f.baselineMin===''||f.postMin==null||f.postMin===''||!(+f.postSamples>0)) return toast('Đóng Kaizen cần baseline, kết quả đo sau cải tiến và số lần lặp.','bad');
      return save({status:'Verified', verifiedBy:u.id, verifiedAt:Date.now(), ...(k.source==='ai'?{aiStatus:'Verified'}:{})},'kaizen.verify');
    }
    if(st==='Done' && !f.countermeasure?.trim()) return toast('Cần countermeasure trước khi hoàn thành.','bad');
    if(st==='InProgress' && (!f.owner||!f.due)) return toast('Cần owner và hạn.','bad');
    if(k.source==='ai' && st==='InProgress' && k.aiStatus!=='Approved') return toast('Đề xuất AI phải được duyệt trước khi thực hiện.','bad');
    if(st==='Cancelled'){ const r=await ask({title:'Hủy Kaizen', fields:[{k:'r',label:'Lý do',required:true}]}); if(!r) return; return save({status:'Cancelled', cancelReason:r.r},'kaizen.cancel',r.r); }
    save({status:st, ...(st==='Done'?{doneAt:Date.now()}:{})},'kaizen.status');
  };
  const aiStep=async(to)=>{ if(to==='Reviewed' && !can('ai.review')) return toast('Chỉ Lean/IE review đề xuất AI.','bad'); if(['Approved','Rejected'].includes(to) && !can('ai.approve')) return toast('Chỉ Lean Manager duyệt đề xuất AI.','bad');
    const r= to==='Rejected' ? await ask({title:'Từ chối đề xuất',fields:[{k:'r',label:'Lý do',required:true}]}) : {r:''}; if(!r) return;
    await Store.update('kaizen',k.id,{aiStatus:to, ['ai'+to+'By']:u.id, ['ai'+to+'At']:Date.now(), ...(to==='Rejected'?{status:'Cancelled', cancelReason:'AI rejected: '+r.r}:{}), ...hist('ai.'+to.toLowerCase(), r.r)}); };
  const calcPost=()=>{ if(!f.delayCode) return toast('Kaizen chưa gắn delay code.','bad'); const since=k.doneAt||k.createdAt; const cos=vals(Store.data.changeovers).filter(c=>c.status==='Closed' && (c.events?.lineStopAt||0)>since && (!f.lineId||c.lineId===f.lineId) && !c.isDemo===!k.isDemo);
    if(!cos.length) return toast('Chưa có changeover đóng sau ngày cải tiến để đo.','bad');
    const v=cos.map(c=>(coKpi(c).waitByCode[f.delayCode]||0)/60000); S({postMin:+(sum(v)/v.length).toFixed(1), postSamples:cos.length, verifyNote:`Trung bình ${f.delayCode} trên ${cos.length} changeover sau ${fmtD(since)}: ${cos.map(c=>c.id).join(', ')}`}); };
  const why=f.rootCause?.why||['','','','',''];
  const T=(k_,label,rows=3)=>html`<${Field} label=${label}><textarea class="inp" style=${`min-height:${rows*24}px`} disabled=${!editable} value=${f[k_]||''} onInput=${e=>S({[k_]:e.target.value})}></textarea><//>`;
  return html`<div class="col"><div class="row"><button class="btn btn-ghost btn-sm" onClick=${()=>go('kaizen')}><${Icon} n="back"/>Kaizen</button></div>
    <div class="row-sb"><div><div class="row"><span class="mono muted">${k.id}</span><span class=${'pill '+KZ_STATUS[k.status].c}>${KZ_STATUS[k.status].l}</span>${k.source==='ai'?html`<span class="pill p-violet">AI: ${k.aiStatus}</span>`:''}<${Demo} on=${k.isDemo}/></div>
      ${editable?html`<input class="inp" style="font-family:var(--f-display);font-size:24px;font-weight:600;margin-top:6px" value=${f.title} onInput=${e=>S({title:e.target.value})} aria-label="Tiêu đề"/>`:html`<h1>${k.title}</h1>`}</div>
      <div class="row">${editable?html`<button class="btn" onClick=${()=>save()}>Lưu</button>`:''}
        ${k.source==='ai'&&k.aiStatus==='Suggested'?html`<button class="btn" onClick=${()=>aiStep('Reviewed')}>Đánh dấu đã review</button>`:''}
        ${k.source==='ai'&&['Suggested','Reviewed'].includes(k.aiStatus)?html`<button class="btn btn-ok" onClick=${()=>aiStep('Approved')}>Duyệt</button><button class="btn btn-bad" onClick=${()=>aiStep('Rejected')}>Từ chối</button>`:''}
        ${k.status==='Open'?html`<button class="btn btn-primary" onClick=${()=>setStatus('InProgress')}>Bắt đầu thực hiện</button>`:''}
        ${k.status==='InProgress'?html`<button class="btn btn-primary" onClick=${()=>setStatus('Done')}>Hoàn thành – chờ xác minh</button>`:''}
        ${k.status==='Done'?html`<button class="btn btn-ok" onClick=${()=>setStatus('Verified')}>Xác minh & đóng</button>`:''}
        ${editable?html`<button class="btn btn-ghost" style="color:var(--bad)" onClick=${()=>setStatus('Cancelled')}>Hủy</button>`:''}</div></div>
    <div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)" id="kz-grid">
      <div class="col">
        <div class="card col">${T('problem','Problem statement – ở đâu, khi nào, tần suất, thời gian/lỗi')}${T('evidence','Evidence – time study, ảnh, Pareto, lịch sử changeover',2)}
          ${(k.linkedCo||[]).length?html`<div class="small">Changeover liên quan: ${(k.linkedCo||[]).map(c=>html`<a href=${'#co-'+c} class="mono" style="margin-right:6px">${c}</a>`)}</div>`:''}</div>
        <div class="card"><h3 style="margin-bottom:8px">Root cause – 5 Why</h3><div class="col" style="gap:6px">${why.map((w,i)=>html`<div class="row" style="flex-wrap:nowrap"><span class="mono small faint" style="width:54px">Why ${i+1}</span><input class="inp sm grow" disabled=${!editable} value=${w} onInput=${e=>{ const n=[...why]; n[i]=e.target.value; S({rootCause:{...f.rootCause, why:n}}); }}/></div>`)}</div>
          <details class="box" style="margin-top:10px"><summary>Fishbone (6M)</summary><div class="grid g2" style="gap:8px">${FISH.map(([fk,l])=>html`<${Field} label=${l}><input class="inp sm" disabled=${!editable} value=${f.rootCause?.fishbone?.[fk]||''} onInput=${e=>S({rootCause:{...f.rootCause, fishbone:{...(f.rootCause?.fishbone||{}),[fk]:e.target.value}}})}/><//>`)}</div></details>
          <label class="chk" style="margin-top:8px"><input type="checkbox" disabled=${!editable} checked=${!!f.rootCause?.verified} onChange=${e=>S({rootCause:{...f.rootCause, verified:e.target.checked}})}/> Nguyên nhân đã được xác minh tại Gemba</label></div>
        <div class="card">${T('countermeasure','Countermeasure – hành động cụ thể, kiểm chứng được',4)}</div>
      </div>
      <div class="col">
        <div class="card col" style="gap:10px">
          <${Field} label="Owner"><${UserSel} value=${f.owner} onChange=${v=>S({owner:v})}/><//>
          <${Field} label="Hạn"><input class="inp" type="date" disabled=${!editable} value=${f.due||''} onInput=${e=>S({due:e.target.value})}/><//>
          <${Field} label="Chuyền"><select class="inp" disabled=${!editable} value=${f.lineId||''} onChange=${e=>S({lineId:e.target.value||null})}><option value="">—</option>${(Store.config.lines||[]).map(l=>html`<option value=${l.id}>${l.name}</option>`)}</select><//>
          <${Field} label="Delay code"><select class="inp" disabled=${!editable} value=${f.delayCode||''} onChange=${e=>S({delayCode:e.target.value||null})}><option value="">—</option>${(Store.config.delayCodes||[]).map(d=>html`<option value=${d.code}>${d.code} – ${d.reason}</option>`)}</select><//>
          <${Field} label="Expected benefit (phút tiết kiệm/changeover)"><input class="inp" type="number" step="0.1" disabled=${!editable} value=${f.expectedMin??''} onInput=${e=>S({expectedMin:e.target.value===''?null:+e.target.value})}/><//>
        </div>
        <div class="card col" style="gap:10px"><h3>Verification</h3>
          <div class="grid g2" style="gap:8px;grid-template-columns:1fr 1fr">
            <${Field} label="Baseline loss (phút/CO)"><input class="inp" type="number" step="0.1" disabled=${!editable} value=${f.baselineMin??''} onInput=${e=>S({baselineMin:e.target.value===''?null:+e.target.value})}/><//>
            <${Field} label="Sau cải tiến (phút/CO)"><input class="inp" type="number" step="0.1" disabled=${!editable} value=${f.postMin??''} onInput=${e=>S({postMin:e.target.value===''?null:+e.target.value})}/><//>
            <${Field} label="Số lần lặp đo"><input class="inp" type="number" min="0" disabled=${!editable} value=${f.postSamples??''} onInput=${e=>S({postSamples:e.target.value===''?null:+e.target.value})}/><//>
            <div class="note" style="align-self:end"><div class="eyebrow">Verified saving</div><b class="num" style="font-size:20px">${f.baselineMin!=null&&f.postMin!=null&&f.baselineMin!==''&&f.postMin!==''?(f.baselineMin-f.postMin).toFixed(1):'—'}′</b></div></div>
          ${editable?html`<button class="btn btn-sm" onClick=${calcPost}>Tính từ dữ liệu changeover sau cải tiến</button>`:''}
          ${T('verifyNote','Ghi chú xác minh',2)}
          ${k.verifiedBy?html`<div class="note ok small">Xác minh bởi ${userName(k.verifiedBy)} · ${fmtDT(k.verifiedAt)}</div>`:''}</div>
        <div class="card"><h4 style="margin-bottom:6px">Lịch sử</h4><div class="col" style="gap:4px">${vals(k.history).sort((a,b)=>b.at-a.at).map(h=>html`<div class="tiny"><span class="faint">${fmtDT(h.at)}</span> · ${h.byName} · <span class="mono">${h.action}</span>${h.reason?' · '+h.reason:''}</div>`)}</div></div>
      </div></div>
    <style>@media (max-width:1000px){#kz-grid{grid-template-columns:minmax(0,1fr)!important}}</style></div>`;
}
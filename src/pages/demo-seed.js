/* ===================== DỮ LIỆU DEMO (gắn nhãn isDemo) ===================== */
async function seedDemo(cfg){
  const now=Date.now(); const MIN=60000;
  let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; };
  const pinH = id => hashPin(id,'1234');
  const demoUsers=[['U-D-PROD','Trần Văn Hùng','prod','PM01'],['U-D-LEAN','Nguyễn Thị Mai','lean','LN01'],['U-D-LL1','Lê Văn Tâm','leader','LL01',['L01']],['U-D-LL2','Phạm Thị Hoa','leader','LL02',['L02']],['U-D-IE','Võ Minh Khoa','ie','IE01'],['U-D-TECH','Đặng Quốc Bảo','tech','TE01'],['U-D-QA','Huỳnh Thị Lan','qa','QA01'],['U-D-MAT','Bùi Văn Lộc','material','MH01'],['U-D-OP','Ngô Thị Thu','operator','OP01',['L01']],['U-D-MGT','Lý Quang Vinh','mgmt','GM01']];
  for(const [id,name,role,code,lines] of demoUsers){ if(!(cfg.users||[]).some(u=>u.id===id)) cfg.users.push({id,name,role,code,lines:lines||['*'],active:true,pinHash:await pinH(id),isDemo:true,createdAt:now}); }
  const U=Object.fromEntries(demoUsers.map(u=>[u[2]+(u[4]?u[4][0]:''),u[0]]));
  const lineIds=(cfg.lines||[]).map(l=>l.id); const L1=lineIds[0]||'L01', L2=lineIds[1]||L1;
  const leaderOf = l => l===L1?'U-D-LL1':'U-D-LL2';
  // Models
  const mk=(code,name,customer,article,ops,qc,workers)=>{ const id='M-DEMO-'+code; const rk='RDEMOA'; return {id, code, name, customer, article, status:'Active', isDemo:true, createdAt:now-120*86400000, revisions:{[rk]:{key:rk, rev:'A', status:'Approved', effectiveFrom:todayStr(now-120*86400000), approvedBy:'U-D-IE', approvedAt:now-120*86400000, ops, qcPoints:qc, layout:{version:'LAY-'+code+'-1', workers}, createdAt:now-121*86400000}}}; };
  const op=(seq,opCode,o,machineType,needle,thread,spi,stitchType,tooling)=>({seq,opCode,op:o,machineType,needle,thread,spi,stitchType,tooling});
  const qcp=(id,name,spec,method,critical)=>({id,name,spec,method,critical});
  const mA=mk('RUN-210','Giày chạy bộ Aero','Khách hàng A','AR-210-BLK',[op(10,'C01','May ghép thân trước','1 kim trụ','DPx17 #16','Polyester 40/3 đen','10','301','Chân vịt lăn 3mm'),op(20,'C02','May viền cổ giày','2 kim trụ','DPx17 #16','Polyester 40/3 đen','11','301','Folder viền 18mm'),op(30,'C03','May lót gót','1 kim trụ','DPx17 #14','Nylon 60/3','10','301','Cữ gót G-210'),op(40,'C04','Zigzag mũi','Zigzag trụ','DPx5 #14','Polyester 40/3 đen','8','304','Chân vịt zigzag'),op(50,'C05','May logo','Máy lập trình','DPx17 #14','Polyester 60/3 trắng','12','301','Khuôn logo RUN-210')],[qcp('Q1','Mật độ mũi','10±1 SPI','Đếm trên 1 inch',true),qcp('Q2','Đối xứng trái/phải','≤ 1 mm','Thước đối chiếu',true),qcp('Q3','Đường viền cổ','Đều, không sổ','Quan sát',false)],22);
  const mB=mk('CAS-330','Sneaker Urban','Khách hàng B','UR-330-WHT',[op(10,'C01','May ghép thân trước','1 kim trụ','DPx17 #18','Polyester 30/3 trắng','8','301','Chân vịt lăn 4mm'),op(20,'C02','May viền cổ giày','2 kim trụ','DPx17 #16','Polyester 40/3 trắng','11','301','Folder viền 22mm'),op(30,'C03','May lót gót','1 kim trụ','DPx17 #14','Nylon 60/3','10','301','Cữ gót G-330'),op(40,'C04','Zigzag mũi','Zigzag trụ','DPx5 #14','Polyester 40/3 trắng','8','304','Chân vịt zigzag'),op(60,'C06','May đắp hậu','1 kim cánh tay','DPx17 #16','Polyester 40/3 trắng','9','301','Cữ đắp hậu H-330')],[qcp('Q1','Mật độ mũi','8±1 SPI','Đếm trên 1 inch',true),qcp('Q2','Đối xứng trái/phải','≤ 1 mm','Thước đối chiếu',true),qcp('Q4','Màu chỉ đúng tech pack','Trắng W-01','So mẫu màu',true),qcp('Q5','Vị trí đắp hậu','±1.5 mm','Dưỡng H-330',false)],24);
  const mC=mk('BOOT-120','Boot Trail','Khách hàng A','BT-120-BRN',[op(10,'C01','May ghép thân trước','1 kim trụ','DPx17 #20','Nylon 40/3 nâu','7','301','Chân vịt lăn 5mm'),op(20,'C02','May viền cổ giày','2 kim trụ','DPx17 #18','Nylon 40/3 nâu','9','301','Folder viền 25mm'),op(30,'C03','May lót gót','1 kim trụ','DPx17 #16','Nylon 60/3','9','301','Cữ gót G-120'),op(70,'C07','May lưỡi gà đệm','1 kim trụ','DPx17 #18','Nylon 40/3 nâu','8','301','')],[qcp('Q1','Mật độ mũi','7±1 SPI','Đếm trên 1 inch',true),qcp('Q2','Đối xứng trái/phải','≤ 1 mm','Thước đối chiếu',true)],26);
  const models=[mA,mB,mC];
  // SOP
  const sop={id:'SOP-DEMO-01', code:'SOP-CO-STITCH-01', name:'Changeover chuyền may – chuẩn chung', lineType:'Chuyền may mũ giày', models:['*'], owner:'U-D-LEAN', status:'Active', isDemo:true, createdAt:now-90*86400000,
    revisions:{RDEMO1:{key:'RDEMO1', rev:'1', status:'Approved', effectiveFrom:todayStr(now-90*86400000), reviewDate:todayStr(now+10*86400000), approver:'U-D-LEAN', approvedAt:now-90*86400000, createdAt:now-91*86400000,
      tools:'Xe kit model B (vị trí K1) · Shadow board tooling cạnh chuyền · Setting sheet theo model',
      steps:[{seq:1,text:'Chuẩn bị kit vật tư model B',type:'External',stdMin:20,tooling:'Xe kit K1'},{seq:2,text:'Chuẩn bị tooling trên tooling cart',type:'External',stdMin:15,tooling:'Shadow board'},{seq:3,text:'Dọn bán thành phẩm & vật tư model A',type:'Internal',stdMin:6},{seq:4,text:'Thay kim, chỉ theo spec model B',type:'Internal',stdMin:8},{seq:5,text:'Thay cữ gá / folder / chân vịt',type:'Internal',stdMin:10},{seq:6,text:'Chỉnh thông số máy theo setting sheet',type:'Internal',stdMin:8},{seq:7,text:'Bố trí lại layout & vị trí vật tư',type:'Internal',stdMin:8},{seq:8,text:'Hướng dẫn thao tác model B',type:'Internal',stdMin:8},{seq:9,text:'May mẫu đầu (first pair)',type:'Internal',stdMin:10,quality:'Kiểm 100% điểm critical'}]}}};
  cfg.standards = [...(cfg.standards||[]), {id:'STD-DEMO-01',rev:1,lineId:'*',modelA:'*',modelB:mB.id,targetMin:55,baselineMin:85,effectiveFrom:todayStr(now-120*86400000),status:'Approved',approvedBy:'U-D-LEAN',approvedAt:now-100*86400000,note:'DEMO – time study 5 lần',isDemo:true}];
  await Store.setConfig(cfg); Store.raw.config = clone(cfg); Store.emit();
  for(const m of models) await Store.set('models',m.id,m);
  await Store.set('sops',sop.id,sop);
  // Changeovers
  const steps=sop.revisions.RDEMO1.steps;
  const mkCo=(o)=>{
    const {line, a, b, start, stage, fail, waitCode, waitMin, slow} = o;
    const id=`CO-DEMO-${o.n}`; const leader=leaderOf(line);
    const assigned={leader, ie:'U-D-IE', tech:'U-D-TECH', qa:'U-D-QA', material:'U-D-MAT'};
    const co={id, isDemo:true, siteId:cfg.site.id, lineId:line, shiftId: new Date(start).getHours()<14?'S1':'S2', modelA:a.id, modelB:b.id, reSetup:false, plannedStart:start, owner:'U-D-PROD', orderRef:'PO-DEMO-'+(4400+o.n), qty:1200, assigned, notes:'', risk:'',
      targetMin: b.id===mB.id?55:60, baselineMin: b.id===mB.id?85:90, standardRef:{id:b.id===mB.id?'STD-DEMO-01':'STD-001', rev:1}, targetOverride:null,
      status:'Planned', createdBy:'U-D-PROD', createdAt:start-2*86400000, events:{plannedAt:start-2*86400000}, activities:{}, trials:{}, rampup:{}, approvals:{}, attachments:{}, audit:{}, comparison:{rows:{}}};
    Object.assign(co, buildChecklist(co));
    const cmp=compareRevs(a.revisions.RDEMOA, b.revisions.RDEMOA); const rows={}; cmp.forEach(r=>{ rows[r.key.replace(/[^A-Za-z0-9_:\-]/g,'_')]={...r, confirmedBy: stage==='prep'?null:'U-D-IE', confirmedAt: stage==='prep'?null:start-40*MIN}; });
    co.comparison={generatedAt:start-2*86400000, rows}; co.refs={modelA:{id:a.id, rev:'A', revKey:'RDEMOA'}, modelB:{id:b.id, rev:'A', revKey:'RDEMOA'}, sop:{id:sop.id, rev:'1', revKey:'RDEMO1'}};
    const ap=(at,by,action)=>{ const i=uid('AP'); co.approvals[i]={id:i, at, by, byName:userName(by)||by, role:'', action, note:''}; };
    ap(start-2*86400000,'U-D-PROD','→ Đã lập kế hoạch');
    if(stage==='prep'){ co.status='Preparing'; co.events.prepStartAt=now-40*MIN; const ts=Object.values(co.checklist); ts.slice(0,4).forEach((t,i)=>{ t.status='Done'; t.completedAt=now-(30-i*5)*MIN; t.completedBy=t.ownerUser; t.evidence='Đã kiểm – mã '+(1000+i); }); ts[4].status='InProgress'; ts[5].status='Blocked'; ts[5].blockReason='Tech pack rev mới chưa in tại chuyền'; ts[5].blockCode='DOC01'; ts[5].blockedAt=now-10*MIN; return co; }
    // checklist done before stop
    Object.values(co.checklist).forEach((t,i)=>{ t.status='Done'; t.completedAt= (o.lateTask && i===2) ? start+10*MIN : start-(60-i*4)*MIN; t.completedBy=t.ownerUser; t.evidence='OK – kiểm theo tiêu chí'; t.verifiedBy=leader; t.verifiedAt=t.completedAt+2*MIN; });
    co.events.prepStartAt=start-90*MIN; co.events.readyAt=start-5*MIN; co.events.lineStopAt=start; ap(start-5*MIN,leader,'→ Sẵn sàng đổi'); ap(start,leader,'→ Đang changeover');
    // external
    const ext=(name,s,e)=>{ const i=uid('ACT'); co.activities[i]={id:i, name, type:'External', stdMin:20, startAt:s, endAt:e, startBy:'U-D-MAT', team:'Material', downtime:false}; };
    ext(steps[0].text, start-70*MIN, start-48*MIN); ext(steps[1].text, start-45*MIN, start-28*MIN);
    let t=start; const f=slow||1; const act=(st,s,dur,extra={})=>{ const i=uid('ACT'); const e=s+dur*MIN; co.activities[i]={id:i, libId:'SOP'+st.seq, name:st.text, type:'Internal', stdMin:st.stdMin, startAt:s, endAt:e, startBy:leader, team:'Line', downtime:true, group:extra.group||'', delayCode:extra.code||null}; return e; };
    const s3=act(steps[2],t,6*f*(0.9+rnd()*0.3),{group:'P1'});
    const s4=act(steps[3],t+2*MIN,9*f*(0.9+rnd()*0.3),{group:'P1'});
    let s5=act(steps[4],s3,11*f*(0.9+rnd()*0.4));
    if(waitCode){ const i=uid('ACT'); const ws=s5-4*MIN; co.activities[i]={id:i, name:'Chờ: '+((cfg.delayCodes||[]).find(d=>d.code===waitCode)?.reason||waitCode), type:'Waiting', startAt:ws, endAt:ws+waitMin*MIN, startBy:leader, team:'Line', downtime:true, delayCode:waitCode}; s5=Math.max(s5, ws+waitMin*MIN); }
    const s6=act(steps[5],Math.max(s4,s5)-3*MIN,9*f*(0.9+rnd()*0.3),{code: slow>1.15?'SET01':null});
    const s7=act(steps[6],s5,8*f*(0.9+rnd()*0.3),{group:'P2'});
    const s8=act(steps[7],s7-3*MIN,8*(0.9+rnd()*0.2),{group:'P2'});
    let tEnd=act(steps[8],Math.max(s6,s8),10*(0.9+rnd()*0.3));
    if(stage==='exec'){ // đang chạy: dừng ở giữa
      Object.values(co.activities).forEach(x=>{ if(x.startAt>now){ delete co.activities[x.id]; } else if(x.endAt>now){ x.endAt=null; } });
      co.status='InChangeover'; return co; }
    const trial=(seq,sent,dec,decAt,defs)=>{ const tid='TR'+seq; const qa=uid('ACT'); co.trials[tid]={id:tid, seq, sentAt:sent, sentBy:leader, checks:{Q1:dec==='Pass'?'OK':'NG',Q2:'OK',Q4:'OK'}, defects:defs||{}, corrections:{}, decision:dec, decidedBy:dec?'U-D-QA':null, decidedAt:decAt, note:'', qaActId:qa};
      co.activities[qa]={id:qa, name:`QA kiểm tra mẫu lần ${seq}`, type:'Quality', startAt:sent, endAt:decAt, startBy:leader, team:'QA', downtime:true, auto:true}; };
    co.events.firstTrialAt=tEnd;
    if(fail){ const d1=tEnd+7*MIN; const df={DF1:{id:'DF1',code:'D02',severity:'Major',location:'Thân trước',qty:1,note:'SPI 10 thay vì 8'}}; trial(1,tEnd,'Fail',d1,df); co.trials.TR1.corrections={CR1:{id:'CR1',action:'Chỉnh SPI máy C01 về 8 theo setting sheet',by:'U-D-TECH',at:d1+2*MIN}};
      const i=uid('ACT'); co.activities[i]={id:i, name:'Sửa thông số sau thử mẫu lỗi', type:'Internal', stdMin:null, startAt:d1, endAt:d1+6*MIN, startBy:'U-D-TECH', team:'Tech', downtime:true, delayCode:'TRI01'}; tEnd=d1+6*MIN; }
    const seq=fail?2:1; const qaWait = waitCode==='QA01'? waitMin : 5+rnd()*4;
    if(stage==='qa'){ trial(seq,tEnd,null,null); co.activities[co.trials['TR'+seq].qaActId].endAt=null; co.status='AwaitingQuality'; return co; }
    const pass=tEnd+qaWait*MIN; trial(seq,tEnd,'Pass',pass); co.events.firstPairApprovedAt=pass; ap(pass,'U-D-QA','QA Pass lần '+seq);
    const rel=pass+3*MIN; co.events.releasedAt=rel; co.status='Released'; ap(rel,'U-D-PROD','→ Đã release');
    const n=stage==='ramp'?Math.max(1,Math.floor((now-rel)/(30*MIN))):3+(rnd()<0.3?1:0);
    const targets=[60,60,60,60];
    for(let k=0;k<n && rel+(k+1)*30*MIN<=now;k++){ const i=uid('RU'); const at=rel+(k+1)*30*MIN; const pct= k===0?0.62+rnd()*0.15 : k===1?0.85+rnd()*0.1 : 0.93+rnd()*0.08; co.rampup[i]={id:i, at, target:targets[k]||60, actual:Math.round((targets[k]||60)*pct), defects:k===0?1:0, rework:k===0?2:0, by:leader}; }
    co.events.firstGoodAt=rel+8*MIN;
    if(stage==='ramp') return co;
    const st=Object.values(co.rampup).sort((x,y)=>x.at-y.at); co.events.stableAt=st[st.length-1]?.at||rel+90*MIN; co.status='StableRun'; ap(co.events.stableAt,'U-D-IE','→ Chạy ổn định');
    if(stage==='stable') return co;
    co.status='Closed'; co.events.closedAt=co.events.stableAt+40*MIN; co.review={summary:'Changeover hoàn tất theo SOP.'+(waitCode?` Mất thời gian do ${waitCode}.`:''), lessons: waitCode?'Đưa kiểm tra vào checklist external.':'', overReason: '', overCode: waitCode||'', closedBy:'U-D-LEAN', closedAt:co.events.closedAt};
    const k=coKpi(co); if(k.met===false){ co.review.overCode=waitCode||'SET01'; co.review.overReason='Vượt target do '+(waitCode||'điều chỉnh máy'); }
    co.review.kpiSnapshot=snapshotKpi(co); ap(co.events.closedAt,'U-D-LEAN','→ Đã đóng');
    return co;
  };
  const day=86400000; const at=(d,h,m=0)=>{ const x=new Date(now-d*day); x.setHours(h,m,0,0); return x.getTime(); };
  const plan=[
    {n:'01',line:L1,a:mA,b:mB,start:at(26,9),stage:'closed',waitCode:'TLS01',waitMin:12,slow:1.25},
    {n:'02',line:L2,a:mC,b:mA,start:at(24,15),stage:'closed',waitCode:'MAT01',waitMin:9,slow:1.1},
    {n:'03',line:L1,a:mB,b:mC,start:at(21,10),stage:'closed',fail:true,slow:1.15,waitCode:'QA01',waitMin:14},
    {n:'04',line:L2,a:mA,b:mB,start:at(18,9),stage:'closed',waitCode:'TLS01',waitMin:8,slow:1.05},
    {n:'05',line:L1,a:mC,b:mB,start:at(15,16),stage:'closed',slow:0.95,lateTask:true},
    {n:'06',line:L2,a:mB,b:mA,start:at(12,9),stage:'closed',waitCode:'TEC01',waitMin:7},
    {n:'07',line:L1,a:mA,b:mC,start:at(9,10),stage:'closed',waitCode:'TLS01',waitMin:6,slow:0.9},
    {n:'08',line:L2,a:mC,b:mB,start:at(6,15),stage:'closed',fail:true,waitCode:'SET01',waitMin:5},
    {n:'09',line:L1,a:mB,b:mA,start:at(3,9),stage:'closed',slow:0.85},
    {n:'10',line:L2,a:mA,b:mC,start:at(1,10),stage:'stable',waitCode:'MAT01',waitMin:4},
    {n:'11',line:L1,a:mC,b:mB,start:now-28*MIN,stage:'exec',waitCode:'TLS01',waitMin:6},
    {n:'12',line:L2,a:mB,b:mC,start:now+50*MIN,stage:'prep'},
  ];
  for(const p of plan){ const co=mkCo(p); const e=auditEntry('demo.create', co.id, {after:co.status}); co.audit={[e.id]:e}; co.statusAt=now; await Store.set('changeovers',co.id,co); }
  const kz=[{id:'KZ-DEMO-01', title:'Shadow board tooling cho chuyền 01', problem:'TLS01 (không tìm thấy cữ gá) xuất hiện 4/9 changeover gần nhất, trung bình 8 phút/lần.', evidence:'Pareto 30 ngày; CO-DEMO-01, 04, 07', countermeasure:'• Làm shadow board theo mã model\n• Tooling cart chuẩn bị T-30', delayCode:'TLS01', lineId:L1, owner:'U-D-IE', due:todayStr(now-2*day), expectedMin:6, baselineMin:8.7, status:'InProgress', source:'manual', isDemo:true, createdAt:now-20*day, createdBy:'U-D-LEAN', rootCause:{why:['Không tìm thấy cữ gá','Cữ gá để lẫn trong tủ chung','Không có vị trí cố định theo model','Chưa có chuẩn 5S cho tooling','Chưa giao owner tooling'], fishbone:{method:'Không có checklist tooling external'}, verified:true}, history:{}},
    {id:'KZ-DEMO-02', title:'[AI] Giảm chờ QA kiểm tra mẫu', problem:'QA01 gây 14 phút chờ trong CO-DEMO-03.', evidence:'Pareto 30 ngày', countermeasure:'• QA trực first pair theo lịch changeover\n• Tiêu chuẩn hình ảnh tại chuyền', delayCode:'QA01', owner:'U-D-QA', due:todayStr(now+7*day), expectedMin:8, baselineMin:14, status:'Open', source:'ai', aiStatus:'Suggested', isDemo:true, createdAt:now-3*day, createdBy:'U-D-LEAN', rootCause:{why:['','','','',''], fishbone:{}}, history:{}}];
  for(const k of kz) await Store.set('kaizen',k.id,k);
}
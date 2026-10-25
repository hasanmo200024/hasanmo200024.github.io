// ═══ 07-daily — يومي: المهام والمناسبات والصحة والتذكيرات ═══
// ══ DAILY: TASKS ══
function openTaskModal(){
  document.getElementById('TASK-NAME').value='';
  document.getElementById('TASK-TIME').value='';
  document.getElementById('M-TASK').classList.add('on');
}
function svTask(){
  const name=document.getElementById('TASK-NAME').value.trim();
  if(!name){toast('❌ اكتب اسم المهمة');return;}
  const time=document.getElementById('TASK-TIME').value.trim();
  const task={id:newId(),title:name,time,date:localISO(new Date()),done:false};
  if(!DS.tasks)DS.tasks=[];
  DS.tasks.push(task);
  sv();closeM();rTasks();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('tasks').doc(String(task.id)).set(task).catch(e=>{});
  toast('✅ تم إضافة المهمة');
}
function toggleTaskDone(id){
  const t=(DS.tasks||[]).find(x=>x.id===id);
  if(!t)return;
  t.done=!t.done;
  sv();rTasks();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('tasks').doc(String(id)).set({done:t.done},{merge:true}).catch(e=>{});
}
function delTask(id){
  DS.tasks=(DS.tasks||[]).filter(t=>t.id!==id);
  sv();rTasks();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('tasks').doc(String(id)).delete().catch(e=>{});
  toast('🗑 تم حذف المهمة');
}
function rTasks(){
  const today=localISO(new Date());
  const tasks=(DS.tasks||[]).filter(t=>t.date===today);
  const listEl=document.getElementById('TASKS-LIST');
  const emptyEl=document.getElementById('TASKS-EMPTY');
  const done=tasks.filter(t=>t.done).length;
  const pct=tasks.length?Math.round(done/tasks.length*100):0;
  const prog=document.getElementById('TASKS-PROGRESS');if(prog)prog.textContent=done+'/'+tasks.length;
  const pctEl=document.getElementById('TASKS-PCT');if(pctEl)pctEl.textContent=pct+'%';
  const ring=document.getElementById('TASKS-RING');
  if(ring)ring.style.background=`conic-gradient(var(--warn) 0% ${pct}%, var(--warn-bg) ${pct}% 100%)`;
  const homeS=document.getElementById('HOME-TASKS-S');
  if(homeS)homeS.textContent=tasks.length?`${tasks.length-done} مهمة باقية من ${tasks.length}`:'مفيش مهام النهاردة';
  checkTaskRollover();
  if(!tasks.length){if(listEl)listEl.innerHTML='';if(emptyEl)emptyEl.style.display='block';return;}
  if(emptyEl)emptyEl.style.display='none';
  if(listEl){
    listEl.innerHTML=tasks.map(t=>`<div style="display:flex;align-items:center;gap:.6rem;padding:.5rem 0;border-bottom:1px solid var(--bd)">
      <div onclick="toggleTaskDone(${t.id})" style="width:20px;height:20px;border-radius:7px;border:2px solid var(--bd2);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;cursor:pointer;${t.done?'background:var(--pr);border-color:var(--pr)':''}">${t.done?'✓':''}</div>
      <div style="flex:1;font-size:12.5px;font-weight:700;${t.done?'color:var(--mu);text-decoration:line-through':'color:var(--tx)'}">${escHtml(t.title)}</div>
      ${t.time?`<div style="font-size:10.5px;color:var(--mu);font-weight:700">${t.time}</div>`:''}
      <div onclick="delTask(${t.id})" style="font-size:13px;color:var(--mu);cursor:pointer;padding:0 .2rem">✕</div>
    </div>`).join('');
  }
}
function checkTaskRollover(){
  const today=localISO(new Date());
  const overdue=(DS.tasks||[]).filter(t=>t.date<today && !t.done);
  const banner=document.getElementById('TASK-ROLLOVER-BANNER');
  if(!banner)return;
  if(overdue.length>0){
    banner.style.display='flex';
    const c=document.getElementById('TASK-ROLLOVER-COUNT');if(c)c.textContent=overdue.length;
  } else {
    banner.style.display='none';
  }
}
function rolloverTasks(){
  const today=localISO(new Date());
  (DS.tasks||[]).forEach(t=>{
    if(t.date<today && !t.done){
      t.date=today;
      if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('tasks').doc(String(t.id)).set({date:today},{merge:true}).catch(e=>{});
    }
  });
  sv();rTasks();
  toast('🔁 تم ترحيل المهام لليوم');
}
function viewTaskReportForDate(){
  const d=document.getElementById('TASK-RPT-DATE').value;
  if(!d){toast('❌ اختار تاريخ');return;}
  const dayTasks=(DS.tasks||[]).filter(t=>t.date===d);
  const done=dayTasks.filter(t=>t.done).length;
  const pct=dayTasks.length?Math.round(done/dayTasks.length*100):0;
  document.getElementById('TASK-RPT-RESULT').innerHTML=`
    <div style="text-align:center;margin:.8rem 0">
      <div style="font-size:28px;font-weight:800;color:var(--warn)">${pct}%</div>
      <div style="font-size:11px;color:var(--mu)">نسبة الإنجاز — ${done} من ${dayTasks.length} مهمة</div>
    </div>
    ${dayTasks.map(t=>`<div style="display:flex;justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--bd);font-size:11.5px">
      <span style="${t.done?'text-decoration:line-through;color:var(--mu)':'color:var(--tx)'}">${t.done?'✅':'⬜'} ${escHtml(t.title)}</span>
    </div>`).join('')||'<div style="text-align:center;color:var(--mu);font-size:11px;padding:.5rem">مفيش مهام مسجلة في اليوم ده</div>'}
  `;
}

// ══ DAILY: OCCASIONS ══
let _occRecur=false;
function openOccModal(){
  document.getElementById('OCC-NAME').value='';
  document.getElementById('OCC-DATE').value='';
  _occRecur=false;
  document.getElementById('TG-OCC-REC').className='tog';
  document.getElementById('OCC-REC-S').textContent='غير مفعّل';
  document.getElementById('M-OCC').classList.add('on');
}
function toggleOccRecur(){
  _occRecur=!_occRecur;
  document.getElementById('TG-OCC-REC').className='tog'+(_occRecur?' on':'');
  document.getElementById('OCC-REC-S').textContent=_occRecur?'مفعّل ✅':'غير مفعّل';
}
function svOccasion(){
  const name=document.getElementById('OCC-NAME').value.trim();
  const date=document.getElementById('OCC-DATE').value;
  if(!name){toast('❌ اكتب عنوان المناسبة');return;}
  if(!date){toast('❌ حدد التاريخ');return;}
  const occ={id:newId(),title:name,date,recurring:_occRecur};
  if(!DS.occasions)DS.occasions=[];
  DS.occasions.push(occ);
  DS.occasions.sort((a,b)=>a.date<b.date?-1:1);
  sv();closeM();rOccasions();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('occasions').doc(String(occ.id)).set(occ).catch(e=>{});
  toast('✅ تم إضافة المناسبة');
}
function delOccasion(id){
  if(!confirm('حذف المناسبة دي؟'))return;
  DS.occasions=(DS.occasions||[]).filter(o=>o.id!==id);
  sv();rOccasions();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('occasions').doc(String(id)).delete().catch(e=>{});
  toast('🗑 تم الحذف');
}
function rOccasions(){
  const occs=DS.occasions||[];
  const listEl=document.getElementById('OCC-LIST');
  const emptyEl=document.getElementById('OCC-EMPTY');
  if(!occs.length){if(listEl)listEl.innerHTML='';if(emptyEl)emptyEl.style.display='block';return;}
  if(emptyEl)emptyEl.style.display='none';
  if(listEl){
    listEl.innerHTML=occs.map(o=>{
      const dt=new Date(o.date).toLocaleDateString('ar-EG',{day:'numeric',month:'long'});
      return `<div class="note-card" onclick="delOccasion(${o.id})">
        <div class="note-dot" style="background:var(--warn)"></div>
        <div class="note-body"><div class="note-t">${escHtml(o.title)}</div>${o.recurring?'<div class="note-s">🔁 تتكرر سنويًا</div>':''}</div>
        <div class="note-meta">${dt}</div>
        <div class="del-x">✕</div>
      </div>`;
    }).join('');
  }
}

function openMedModal(){document.getElementById('MED-NAME').value='';document.getElementById('MED-DOSE').value='';document.getElementById('MED-TIME').value='';document.getElementById('M-MED').classList.add('on');}
function svMed(){
  const name=document.getElementById('MED-NAME').value.trim();
  const dose=document.getElementById('MED-DOSE').value.trim();
  const time=document.getElementById('MED-TIME').value;
  if(!name){toast('❌ اكتب اسم الدواء');return;}
  const m={id:newId(),name,dose,time};
  if(!DS.medications)DS.medications=[];
  DS.medications.push(m);
  sv();closeM();rMeds();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('medications').doc(String(m.id)).set(m).catch(e=>{});
  toast('✅ تم الحفظ');
}
function delMed(id){
  DS.medications=(DS.medications||[]).filter(m=>m.id!==id);sv();rMeds();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('medications').doc(String(id)).delete().catch(e=>{});
  toast('🗑 تم الحذف');
}
function rMeds(){
  const meds=DS.medications||[];
  const l=document.getElementById('MEDS-LIST'),e=document.getElementById('MEDS-EMPTY');
  if(!l)return;
  if(!meds.length){l.innerHTML='';if(e)e.style.display='block';return;}
  if(e)e.style.display='none';
  l.innerHTML=meds.map(m=>`<div class="note-card" onclick="delMed(${m.id})">
    <div class="note-dot" style="background:#0891b2"></div>
    <div class="note-body"><div class="note-t">${escHtml(m.name)}</div><div class="note-s">${escHtml(m.dose||'')}</div></div>
    ${m.time?`<div class="note-meta">${m.time}</div>`:''}
    <div class="del-x">✕</div>
  </div>`).join('');
}
function openDoctorModal(){document.getElementById('DOCTOR-NAME').value='';document.getElementById('DOCTOR-DATE').value='';document.getElementById('DOCTOR-TIME').value='';document.getElementById('M-DOCTOR').classList.add('on');}
function svDoctor(){
  const name=document.getElementById('DOCTOR-NAME').value.trim();
  const date=document.getElementById('DOCTOR-DATE').value;
  const time=document.getElementById('DOCTOR-TIME').value;
  if(!name){toast('❌ اكتب اسم الطبيب');return;}
  if(!date){toast('❌ حدد التاريخ');return;}
  const a={id:newId(),name,date,time};
  if(!DS.doctorAppointments)DS.doctorAppointments=[];
  DS.doctorAppointments.push(a);
  DS.doctorAppointments.sort((x,y)=>x.date<y.date?-1:1);
  sv();closeM();rDoctors();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('doctorAppointments').doc(String(a.id)).set(a).catch(e=>{});
  toast('✅ تم الحفظ');
}
function delDoctor(id){
  DS.doctorAppointments=(DS.doctorAppointments||[]).filter(a=>a.id!==id);sv();rDoctors();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('doctorAppointments').doc(String(id)).delete().catch(e=>{});
  toast('🗑 تم الحذف');
}
function rDoctors(){
  const items=DS.doctorAppointments||[];
  const l=document.getElementById('DOCTOR-LIST'),e=document.getElementById('DOCTOR-EMPTY');
  if(!l)return;
  if(!items.length){l.innerHTML='';if(e)e.style.display='block';return;}
  if(e)e.style.display='none';
  l.innerHTML=items.map(a=>{
    const dt=new Date(a.date).toLocaleDateString('ar-EG',{day:'numeric',month:'long'});
    return `<div class="note-card" onclick="delDoctor(${a.id})">
      <div class="note-dot" style="background:#0891b2"></div>
      <div class="note-body"><div class="note-t">${escHtml(a.name)}</div></div>
      <div class="note-meta">${dt}${a.time?' '+a.time:''}</div>
      <div class="del-x">✕</div>
    </div>`;
  }).join('');
}
function openApptModal(){document.getElementById('APPT-NAME').value='';document.getElementById('APPT-DATE').value='';document.getElementById('APPT-TIME').value='';document.getElementById('M-APPT').classList.add('on');}
function svAppt(){
  const name=document.getElementById('APPT-NAME').value.trim();
  const date=document.getElementById('APPT-DATE').value;
  const time=document.getElementById('APPT-TIME').value;
  if(!name){toast('❌ اكتب عنوان الموعد');return;}
  if(!date){toast('❌ حدد التاريخ');return;}
  const a={id:newId(),name,date,time};
  if(!DS.appointments)DS.appointments=[];
  DS.appointments.push(a);
  DS.appointments.sort((x,y)=>x.date<y.date?-1:1);
  sv();closeM();rAppts();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('appointments').doc(String(a.id)).set(a).catch(e=>{});
  toast('✅ تم الحفظ');
}
function delAppt(id){
  DS.appointments=(DS.appointments||[]).filter(a=>a.id!==id);sv();rAppts();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('appointments').doc(String(id)).delete().catch(e=>{});
  toast('🗑 تم الحذف');
}
function rAppts(){
  const items=DS.appointments||[];
  const l=document.getElementById('APPTS-LIST'),e=document.getElementById('APPTS-EMPTY');
  if(!l)return;
  if(!items.length){l.innerHTML='';if(e)e.style.display='block';return;}
  if(e)e.style.display='none';
  l.innerHTML=items.map(a=>{
    const dt=new Date(a.date).toLocaleDateString('ar-EG',{day:'numeric',month:'long'});
    return `<div class="note-card" onclick="delAppt(${a.id})">
      <div class="note-dot" style="background:var(--pu)"></div>
      <div class="note-body"><div class="note-t">${escHtml(a.name)}</div></div>
      <div class="note-meta">${dt}${a.time?' '+a.time:''}</div>
      <div class="del-x">✕</div>
    </div>`;
  }).join('');
}

// ── يومي: تبويبات (مهام | مناسبات | صحتي) ──
let _dSeg='tasks';
function setDailySeg(k){
  _dSeg=k;
  ['tasks','occ','health'].forEach((x,i)=>{const p=document.getElementById('DP-'+x);if(p)p.style.display=x===k?'block':'none';const b=document.querySelectorAll('#DSEG button')[i];if(b)b.classList.toggle('on',x===k);});
}
function dailyAdd(){if(_dSeg==='occ')openOccModal();else if(_dSeg==='health')openMedModal();else openTaskModal();}
setDailySeg('tasks');
// ══ DAILY REMINDERS (occasions اليوم/بكرة) ══
function checkOccasionReminders(){
  const occs=DS.occasions||[];
  if(!occs.length)return;
  const today=new Date();const todayStr=localISO(today);
  const lastCheck=localStorage.getItem('occ_notified_'+todayStr);
  if(lastCheck)return;
  occs.forEach(o=>{
    let od=o.date;
    if(o.recurring){od=today.getFullYear()+od.slice(4);}
    if(od===todayStr)notifyUser('🎉 مناسبة النهاردة: '+o.title);
  });
  localStorage.setItem('occ_notified_'+todayStr,'1');
}

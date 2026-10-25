// ═══ 02-support — الدعم: المساعدة والمحادثات، إشعارات الجهاز، إصدار التطبيق والتحديث الإجباري، الدليل ═══
// ══ أريد مساعدة ══
function openHelpCenter(){
  document.getElementById('HELP-NAME').value=DS.name||'';
  document.getElementById('HELP-PHONE').value=DS.phone||'';
  document.getElementById('HELP-WA').value=DS.helpWa||'';
  document.getElementById('HELP-Q').value='';
  document.getElementById('M-HELP').classList.add('on');
}
function sendHelpTicket(){
  const name=document.getElementById('HELP-NAME').value.trim();
  const phone=document.getElementById('HELP-PHONE').value.trim();
  const wa=document.getElementById('HELP-WA').value.trim();
  const type=document.getElementById('HELP-TYPE').value;
  const msg=document.getElementById('HELP-Q').value.trim();
  if(!name){toast('❌ اكتب اسمك');return;}
  if(!phone){toast('❌ اكتب رقم الهاتف');return;}
  if(!msg){toast('❌ اكتب استفسارك');return;}
  if(!FB_READY){toast('❌ تعذر الإرسال حاليًا');return;}
  DS.helpWa=wa;sv();
  const t={uid:DS.uid||null,name,phone,whatsapp:wa,type,message:msg,status:'open',replies:[],created:new Date().toISOString(),version:APP_VERSION};
  const p=db.collection('support_tickets').add(t);
  if(!navigator.onLine){closeM();toast('📨 تم حفظ طلبك وهيتبعت أول ما الاتصال يرجع');}
  else p.then(()=>{closeM();toast('✅ تم إرسال طلبك — هنتواصل معاك قريبًا');loadMySupport();}).catch(()=>toast('❌ تعذر الإرسال، جرّب تاني'));
}
let _adminTickets=[];
function tStatus(t){return (t.status==='closed'||t.status==='resolved')?'closed':'open';}
function loadSupportTickets(){
  const el=document.getElementById('HELP-TICKETS-LIST');if(!el||!FB_READY)return;
  db.collection('support_tickets').orderBy('created','desc').limit(100).get().then(snap=>{
    _adminTickets=[];snap.forEach(d=>_adminTickets.push({id:d.id,...d.data()}));
    renderAdminTickets();
  }).catch(()=>{el.innerHTML='<div style="text-align:center;padding:1rem;color:var(--ng);font-size:12px">تعذر تحميل الطلبات</div>';});
}
function adminTicketCard(t){
  const closed=tStatus(t)==='closed';
  const reps=t.replies||[];
  const d=new Date(t.created);const dt=isNaN(d)?'':d.toLocaleDateString('ar-EG',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
  let digits=String(t.whatsapp||'').replace(/\D/g,'');if(digits.startsWith('0'))digits='2'+digits;
  return `<div class="act-card" style="${closed?'opacity:.7':''}">
    <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--mu);font-weight:700"><span>${closed?'⚪ مغلقة':'🟢 مفتوحة'} • ${escHtml(t.type)}</span><span>${dt}</span></div>
    <div style="font-size:13px;font-weight:800;color:var(--tx);margin:.4rem 0 .2rem">${escHtml(t.name)}</div>
    <div style="font-size:11.5px;color:var(--tx2);line-height:1.8;white-space:pre-wrap">${escHtml(t.message)}</div>
    <div style="font-size:10px;color:var(--mu);margin-top:.3rem">💬 ${reps.length} ردود</div>
    <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.6rem">
      <button class="btn btn-p btn-sm" onclick="openThread(${jsArg(t.id)},true)" style="width:auto">💬 المحادثة والرد</button>
      <a class="btn btn-s btn-sm" href="tel:${escHtml(t.phone)}" style="width:auto;text-decoration:none">📞</a>
      ${digits?`<a class="btn btn-s btn-sm" href="https://wa.me/${digits}" target="_blank" style="width:auto;text-decoration:none">واتساب</a>`:''}
      <button class="btn btn-s btn-sm" onclick="toggleTicketStatus(${jsArg(t.id)})" style="width:auto">${closed?'🔓 فتح':'🔒 قفل'}</button>
      <button class="btn btn-ng btn-sm" onclick="deleteTicket(${jsArg(t.id)})" style="width:auto">🗑</button>
    </div>
  </div>`;
}
function renderAdminTickets(){
  const el=document.getElementById('HELP-TICKETS-LIST');if(!el)return;
  const open=_adminTickets.filter(t=>tStatus(t)==='open'),closed=_adminTickets.filter(t=>tStatus(t)==='closed');
  const waiting=open.filter(t=>{const r=t.replies||[];return !r.length||r[r.length-1].from!=='admin';}).length;
  const c=document.getElementById('HELP-TICKETS-CT');if(c)c.textContent=waiting?waiting+' بانتظار الرد':'';
  if(!_adminTickets.length){el.innerHTML='<div style="text-align:center;padding:1rem;color:var(--mu);font-size:12px">مفيش طلبات مساعدة</div>';return;}
  el.innerHTML=`<div class="note-grp-t">🟢 مفتوحة (${open.length})</div>`+(open.map(adminTicketCard).join('')||'<div style="text-align:center;color:var(--mu);font-size:11px;padding:.5rem">لا يوجد</div>')
    +`<details style="margin-top:.5rem"><summary class="note-grp-t" style="cursor:pointer">⚪ مغلقة (${closed.length})</summary>${closed.map(adminTicketCard).join('')}</details>`;
}
function toggleTicketStatus(id){
  const t=_adminTickets.find(x=>x.id===id);if(!t)return;
  const ns=tStatus(t)==='closed'?'open':'closed';t.status=ns;renderAdminTickets();
  db.collection('support_tickets').doc(id).set({status:ns},{merge:true}).catch(()=>toast('❌ فشل التحديث'));
}
function deleteTicket(id){
  if(!confirm('حذف الطلب ده؟'))return;
  _adminTickets=_adminTickets.filter(x=>x.id!==id);renderAdminTickets();
  db.collection('support_tickets').doc(id).delete().catch(()=>toast('❌ فشل الحذف'));
}

// ══ الدعم داخل البروفايل + المحادثات ══
let _thread={id:null,admin:false,data:null};
function allMsgs(t){const a=[{from:'user',text:t.message,ts:t.created}];(t.replies||[]).forEach(r=>a.push(r));return a;}
function loadMySupport(){
  if(!FB_READY||!DS.uid)return;
  db.collection('support_tickets').where('uid','==',DS.uid).get().then(snap=>{
    const items=[];snap.forEach(d=>items.push({id:d.id,...d.data()}));
    items.sort((a,b)=>(b.created||'')<(a.created||'')?-1:1);
    DS._tickets=items;renderMySupport();checkNewReplies(items);
  }).catch(()=>{});
}
function supRow(t){
  const closed=tStatus(t)==='closed';
  const reps=t.replies||[];const last=reps.length?reps[reps.length-1]:null;
  const seen=(DS.supSeen||{})[t.id]||0;
  const unread=reps.length>seen&&last&&last.from==='admin';
  const d=new Date(t.created);const dt=isNaN(d)?'':d.toLocaleDateString('ar-EG',{day:'numeric',month:'short'});
  return `<div class="note-card" onclick="openThread(${jsArg(t.id)},false)" style="align-items:flex-start">
    <div class="note-dot" style="background:${closed?'var(--mu)':'var(--ok)'};margin-top:5px"></div>
    <div class="note-body"><div class="note-t">${escHtml(t.type||'استفسار')} ${unread?'<span style="color:var(--ng);font-size:10px">🔴 رد جديد</span>':''}</div>
    <div class="note-s">${escHtml(String(last?last.text:t.message).slice(0,70))}</div>
    <div style="font-size:9.5px;color:var(--mu);font-weight:700;margin-top:3px">💬 ${reps.length} ردود • ${dt}</div></div>
  </div>`;
}
function renderMySupport(){
  const items=DS._tickets||[];
  const open=items.filter(t=>tStatus(t)==='open'),closed=items.filter(t=>tStatus(t)==='closed');
  const set=(id,h)=>{const e=document.getElementById(id);if(e)e.innerHTML=h;};
  const none='<div style="text-align:center;color:var(--mu);font-size:11px;padding:.4rem">لا يوجد</div>';
  set('SUP-OPEN',open.map(supRow).join('')||none);set('SUP-CLOSED',closed.map(supRow).join('')||none);
  const on=document.getElementById('SUP-OPEN-N');if(on)on.textContent=open.length;
  const cn=document.getElementById('SUP-CLOSED-N');if(cn)cn.textContent=closed.length;
  const unread=items.filter(t=>{const r=t.replies||[];return r.length>((DS.supSeen||{})[t.id]||0)&&r[r.length-1].from==='admin';}).length;
  const b=document.getElementById('SUP-COUNT');if(b)b.textContent=unread?unread+' رد جديد':'';
}
function checkNewReplies(items){
  if(!DS.supNotified)DS.supNotified={};
  let ch=false;
  items.forEach(t=>{
    const reps=t.replies||[];const last=reps[reps.length-1];
    if(last&&last.from==='admin'&&reps.length>(DS.supNotified[t.id]||0)){
      DS.supNotified[t.id]=reps.length;ch=true;
      notifyUser('💬 رد جديد من الدعم على «'+(t.type||'استفسارك')+'»');
    }
  });
  if(ch)sv();
}
function openThread(id,adm){
  const t=(adm?_adminTickets:(DS._tickets||[])).find(x=>x.id===id);if(!t)return;
  _thread={id,admin:!!adm,data:t};
  if(!adm){DS.supSeen=DS.supSeen||{};DS.supSeen[id]=(t.replies||[]).length;sv();renderMySupport();}
  document.getElementById('THREAD-REPLY').value='';
  renderThread();
  document.getElementById('M-THREAD').classList.add('on');
}
function renderThread(){
  const t=_thread.data;if(!t)return;
  const closed=tStatus(t)==='closed';
  document.getElementById('THREAD-TITLE').textContent='💬 '+(t.type||'محادثة')+(_thread.admin?' — '+(t.name||''):'');
  const msgs=allMsgs(t).map(m=>{
    const mine=_thread.admin?m.from==='admin':m.from==='user';
    const d=new Date(m.ts);const dt=isNaN(d)?'':d.toLocaleDateString('ar-EG',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
    return `<div style="display:flex;justify-content:${mine?'flex-start':'flex-end'};margin-bottom:.5rem"><div style="max-width:84%;background:${mine?'var(--pr-lt)':'var(--sf2)'};border:1px solid var(--bd);border-radius:12px;padding:.5rem .7rem"><div style="font-size:9.5px;color:var(--mu);font-weight:700;margin-bottom:2px">${m.from==='admin'?'🛡 الدعم':'👤 '+escHtml(t.name||'المستخدم')} • ${dt}</div><div style="font-size:12px;color:var(--tx);line-height:1.8;white-space:pre-wrap">${escHtml(m.text)}</div></div></div>`;
  }).join('');
  const closedNote=(closed&&!_thread.admin)?'<div style="text-align:center;font-size:11px;color:var(--mu);padding:.4rem">🔒 المحادثة مغلقة من الدعم</div>':'';
  const body=document.getElementById('THREAD-BODY');body.innerHTML=msgs+closedNote;body.scrollTop=body.scrollHeight;
  document.getElementById('THREAD-REPLY-WRAP').style.display=(closed&&!_thread.admin)?'none':'block';
  document.getElementById('THREAD-ADMIN-ACTS').style.display=_thread.admin?'block':'none';
  document.getElementById('THREAD-TOGGLE').textContent=closed?'🔓 إعادة فتح المحادثة':'🔒 إغلاق المحادثة';
}
function sendThreadReply(){
  const txt=document.getElementById('THREAD-REPLY').value.trim();
  const t=_thread.data;if(!txt||!t)return;
  const obj={from:_thread.admin?'admin':'user',text:txt,ts:new Date().toISOString()};
  t.replies=(t.replies||[]).concat([obj]);
  document.getElementById('THREAD-REPLY').value='';
  if(!_thread.admin){DS.supSeen=DS.supSeen||{};DS.supSeen[t.id]=t.replies.length;sv();renderMySupport();}
  else renderAdminTickets();
  renderThread();
  db.collection('support_tickets').doc(t.id).update({replies:firebase.firestore.FieldValue.arrayUnion(obj),updatedAt:obj.ts}).catch(()=>toast('❌ تعذر إرسال الرد'));
  toast('✅ تم إرسال الرد');
}
function toggleThreadStatus(){
  const t=_thread.data;if(!t||!_thread.admin)return;
  toggleTicketStatus(t.id);renderThread();
}

// ══ إشعارات الجهاز (شريط الإشعارات) ══
function systemNotify(title,body){
  try{
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    if(document.visibilityState==='visible')return;
    const ic=document.querySelector('link[rel="icon"]'),u=ic?ic.href:undefined;
    const opts={body,dir:'rtl',lang:'ar',icon:u,badge:u,tag:'qistas-'+Date.now(),renotify:true,vibrate:[200,100,200],silent:false,data:{url:location.href}};
    if('serviceWorker' in navigator){navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,opts)).catch(()=>{try{new Notification(title,opts);}catch(e){}});}
    else new Notification(title,opts);
  }catch(e){}
}
function updateNotifPermUI(){
  const el=document.getElementById('NOTIF-PERM-S');if(!el)return;
  el.textContent=!('Notification' in window)?'غير مدعومة على هذا الجهاز':Notification.permission==='granted'?'مفعّلة ✅':Notification.permission==='denied'?'محظورة من إعدادات المتصفح':'اضغط للتفعيل';
}
function enableSystemNotifications(){
  if(!('Notification' in window)){toast('❌ جهازك لا يدعم إشعارات النظام');return;}
  Notification.requestPermission().then(p=>{updateNotifPermUI();toast(p==='granted'?'✅ تم تفعيل إشعارات الجهاز':'❌ لم يتم السماح بالإشعارات');});
}
setInterval(()=>{if(FB_READY&&DS.loggedIn)checkForUpdates();},120000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&FB_READY&&DS.loggedIn)checkForUpdates();});

// ══ إصدار التطبيق والتحديث الإلزامي ══
function cmpVer(a,b){const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(let i=0;i<3;i++){const d=(x[i]||0)-(y[i]||0);if(d)return d<0?-1:1;}return 0;}
function enforceMinVersion(cfg){
  const vi=document.getElementById('VER-INFO');
  if(vi)vi.textContent='v'+APP_VERSION+(cfg.version&&cmpVer(APP_VERSION,cfg.version)<0?' (متاح v'+cfg.version+')':'');
  window._tourMarker=cfg.minVersion?(cfg.minVersion+(cfg.forcedAt?'|'+cfg.forcedAt:'')):'';
  if(cfg.minVersion&&cmpVer(APP_VERSION,cfg.minVersion)>=0)tourAfterForced(window._tourMarker);
  if(cfg.minVersion&&cmpVer(APP_VERSION,cfg.minVersion)<0&&!window._fuBypass){
    const o=document.getElementById('FORCE-UPDATE');
    if(o){document.getElementById('FU-CUR').textContent='v'+APP_VERSION;document.getElementById('FU-NEW').textContent='v'+cfg.minVersion;o.style.display='flex';}
  }
}
function fuAdminEscape(){
  window._fuBypass=true;
  const o=document.getElementById('FORCE-UPDATE');if(o)o.style.display='none';
  adminFromLock();
}
function checkForcedUpdate(){if(!FB_READY)return;db.collection('config').doc('app').get().then(d=>{if(d.exists)enforceMinVersion(d.data());}).catch(()=>{});}
async function forceRefreshApp(){
  try{
    if('serviceWorker' in navigator){const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}
    if(window.caches){const ks=await caches.keys();for(const k of ks)await caches.delete(k);}
  }catch(e){}
  location.reload();
}

// ══ دليل الاستخدام ══
function maybeShowGuide(){
  const m=document.getElementById('SCR-main');
  if(DS.loggedIn&&DS.tourKey===undefined&&!DS.guideSeen&&!DS.guideVer&&m&&m.classList.contains('on'))startTour();
}

function qInit(){
  initMicButtons();updateNotifPermUI();renderNotifPrefs();
  {const fi=document.getElementById('FU-LOGO-IMG'),ic=document.querySelector('link[rel="icon"]');if(fi&&ic)fi.src=ic.href;}
  document.querySelectorAll('.app-ver').forEach(e=>e.textContent=APP_VERSION);
  const vi=document.getElementById('VER-INFO');if(vi)vi.textContent='v'+APP_VERSION;
  setTimeout(checkForcedUpdate,1500);
  setTimeout(maybeShowGuide,3500);setTimeout(checkForcedUpdate,2500);setTimeout(flushTrashQueue,3000);setTimeout(rHomeNew,1500);setInterval(function(){try{if(window._curTab==="home"||!window._curTab)rHomeNew();}catch(e){}},60000);setTimeout(maybeBackupReminder,20000);setTimeout(purgeExpiredTrash,12000);setTimeout(runReminderChecks,4000);setTimeout(maybeAskNotifPermission,9000);updateNotifBadge();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',qInit);else qInit();

function toggleTxFilters(){
  const el=document.getElementById('TX-CHIPS');
  if(!el)return;
  el.style.display=el.style.display==='none'?'flex':'none';
}

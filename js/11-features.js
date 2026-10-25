// ═══ 11-features — ميزات إضافية: البروفايل، النغمات، الجولة، السلة، المزامنة بالرقم، المصادقة، النسخ الاحتياطي، الرئيسية ═══
// ══ Remove trial/subscription UI ══
function updSubStatus(){
  // Silent - no trial bar needed
}
function updSubBar(){
  const bar = document.getElementById('SUB-BAR');
  if(bar) bar.style.display = 'none';
}


// ══ صورة البروفايل ══
function changeAvatar(){const i=document.getElementById('PROF-AV-INPUT');if(i)i.click();}
function handleProfileImage(ev){
  const f=ev.target.files[0];if(!f)return;
  if(!f.type.startsWith('image/')){toast('❌ اختار ملف صورة');return;}
  const r=new FileReader();
  r.onload=e=>{const img=new Image();img.onload=()=>{
    const S=256,c=document.createElement('canvas');c.width=S;c.height=S;const x=c.getContext('2d');
    const m=Math.min(img.width,img.height);x.drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,S,S);
    DS.avatar=c.toDataURL('image/jpeg',0.8);sv();updProf();
    if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).set({avatar:DS.avatar},{merge:true}).catch(()=>{});
    toast('✅ تم تحديث صورة البروفايل');
  };img.src=e.target.result;};
  r.readAsDataURL(f);ev.target.value='';
}
function removeProfileImage(){
  DS.avatar=null;sv();updProf();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).set({avatar:firebase.firestore.FieldValue.delete()},{merge:true}).catch(()=>{});
  toast('🗑 تم إزالة الصورة');
}
function applyAvatarPhoto(){
  ['PROF-AV-BIG','PAV'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    if(DS.avatar){el.style.backgroundImage='url('+DS.avatar+')';el.style.backgroundSize='cover';el.style.backgroundPosition='center';el.style.color='transparent';}
    else{el.style.backgroundImage='';el.style.color='';}
  });
  const t=document.getElementById('PROF-AV-TXT');if(t)t.style.display=DS.avatar?'none':'';
  const d=document.getElementById('PROF-AV-DEL');if(d)d.style.display=DS.avatar?'block':'none';
}
const _updProfBase=updProf;
updProf=function(){_updProfBase();applyAvatarPhoto();};

// ══ إحصائيات النشاط ══
function trackLogin(){
  if(!FB_READY||!DS.uid)return;
  try{db.collection('users').doc(DS.uid).set({loginCount:firebase.firestore.FieldValue.increment(1),lastLogin:new Date().toISOString(),lastActive:new Date().toISOString()},{merge:true}).catch(()=>{});}catch(e){}
}
function fmtAgo(iso){
  if(!iso)return 'لم يدخل';
  const m=Math.floor((Date.now()-new Date(iso).getTime())/60000);
  if(m<1)return 'الآن';if(m<60)return 'من '+m+' د';
  const h=Math.floor(m/60);if(h<24)return 'من '+h+' س';
  return 'من '+Math.floor(h/24)+' يوم';
}
function lastSeenTxt(u){return '🕐 '+fmtAgo(u.lastActive||u.lastLogin);}

// ══ إعدادات الإشعارات والنغمات ══
const TONES={ding:'🔔 دينج',bell:'🛎 جرس',soft:'🎵 هادئة',alert:'🚨 تنبيه'};
function playNotifTone(name){
  const np=DS.notifPrefs||{};const t=name||np.tone||'ding';
  try{
    if(t==='custom'&&np.customTone){const a=new Audio(np.customTone);a.play().catch(()=>{});return;}
    const c=getAC();if(!c)return;
    const seq=({ding:[[880,0,.18]],bell:[[1046,0,.15],[1318,.16,.25]],soft:[[523,0,.25],[659,.2,.3]],alert:[[740,0,.12],[740,.18,.12],[740,.36,.12]]})[t]||[[880,0,.18]];
    const run=()=>seq.forEach(([f,at,d])=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;o.connect(g);g.connect(c.destination);const st=c.currentTime+at;
      g.gain.setValueAtTime(.0001,st);g.gain.exponentialRampToValueAtTime(.3,st+.02);g.gain.exponentialRampToValueAtTime(.0001,st+d);o.start(st);o.stop(st+d+.05);});
    if(c.state==='suspended')c.resume().then(run).catch(()=>{});else run();
  }catch(e){}
}
function renderNotifPrefs(){
  const el=document.getElementById('NOTIF-PREFS');if(!el)return;
  const np=DS.notifPrefs||{};
  const row=(k,ic,t,sub)=>`<div class="sr" onclick="toggleNotifPref('${k}')" style="padding-left:0;padding-right:0"><div class="si si-p">${ic}</div><div class="st"><div class="st-t">${t}</div><div class="st-s">${sub}</div></div><button class="tog${np[k]!==false?' on':''}"></button></div>`;
  const tone=np.tone||'ding';
  el.innerHTML=
    row('inApp','📲','إشعارات داخل التطبيق','تظهر كرسالة صغيرة أثناء استخدامك')+
    row('system','🔔','إشعارات خارج التطبيق','تظهر في شريط إشعارات الجهاز لما التطبيق في الخلفية')+
    row('sound','🔊','صوت التنبيه','يشتغل وقت وصول إشعار والتطبيق مفتوح')+
    `<div style="font-size:11px;color:var(--mu);font-weight:700;margin:.7rem 0 .4rem">🎵 نغمة التنبيه</div>
    <div style="display:flex;flex-wrap:wrap;gap:.4rem">`+
    Object.keys(TONES).map(k=>`<div class="cat-chip${tone===k?' sel':''}" onclick="selectTone('${k}')">${TONES[k]} ▶</div>`).join('')+
    (np.customTone?`<div class="cat-chip${tone==='custom'?' sel':''}" onclick="selectTone('custom')">📁 نغمتي ▶</div>`:'')+
    `<div class="cat-chip add-chip" onclick="document.getElementById('NP-TONE-FILE').click()">➕ إضافة نغمة من جهازك</div></div>
    <input type="file" accept="audio/*" id="NP-TONE-FILE" style="display:none" onchange="handleToneFile(event)">
    <div style="font-size:10px;color:var(--mu);margin-top:.7rem;line-height:1.7">ملحوظة: التنبيهات بتوصلك والتطبيق مفتوح أو في الخلفية. لو مقفول تمامًا بتظهر أول ما تفتحه. صوت إشعارات الجهاز هو نغمة النظام.</div>`;
}
function toggleNotifPref(k){
  const np=DS.notifPrefs=DS.notifPrefs||{};
  np[k]=np[k]===false;
  if(k==='system'&&np.system&&'Notification' in window&&Notification.permission==='default')enableSystemNotifications();
  sv();renderNotifPrefs();
}
function selectTone(t){const np=DS.notifPrefs=DS.notifPrefs||{};np.tone=t;sv();playNotifTone(t);renderNotifPrefs();}
function handleToneFile(ev){
  const f=ev.target.files[0];if(!f)return;
  if(!f.type.startsWith('audio/')){toast('❌ اختار ملف صوتي');return;}
  if(f.size>500*1024){toast('❌ الملف كبير — الحد الأقصى 500 ك.ب');return;}
  const r=new FileReader();
  r.onload=e=>{const np=DS.notifPrefs=DS.notifPrefs||{};np.customTone=e.target.result;np.tone='custom';sv();renderNotifPrefs();playNotifTone('custom');toast('✅ تم إضافة النغمة');};
  r.readAsDataURL(f);ev.target.value='';
}

// ══ دخول المدير السري من شاشة التحديث الإلزامي ══
let _fuTaps=0,_fuT=null;
function fuLogoTap(){
  _fuTaps++;clearTimeout(_fuT);_fuT=setTimeout(()=>{_fuTaps=0;},2500);
  if(_fuTaps>=5){_fuTaps=0;fuAdminEscape();}
}

// ══ دعوة صديق ══
function inviteFriend(){
  const url=location.origin+location.pathname.replace(/index\.html$/,'');
  const text='أنا بستخدم تطبيق قسطاس 🌿 لإدارة حساباتي ومصروفاتي ومهامي في مكان واحد. جرّبه من هنا:\n'+url;
  window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');
}

// ══ جولة تعريفية: نشاور على كل قسم ══
const TOUR_STEPS=[
  {sel:'#TB-home .hero2',t:'➕ إضافة مصروف',d:'اكتب المبلغ هنا واضغط إضافة، ويفتح لك نموذج المصروف جاهز.'},
  {sel:'#NV-expenses',t:'💰 المصروفات',d:'سجّل مصروفاتك، وحدد ميزانيتك، وتابع تنبيهات تجاوزها.'},
  {sel:'#NV-daily',t:'✅ المهام (يومي)',d:'مهامك ومناسباتك، وصحتك (الأدوية ومواعيد الدكتور)، ومواعيدك.'},
  {sel:'#NV-notes',t:'📝 الملاحظات',d:'ملاحظات سريعة بموضوع وتنبيه اختياري.'},
  {sel:'#NV-more',t:'🗂️ المزيد',d:'كل أقسامك في 3 مجموعات: فلوسي، يومي، معلومات. وهنا كمان الإعدادات.'},
  {sel:'#TB-home .hdr button.ic',t:'🔔 الإشعارات',d:'العداد الأحمر بيوريك عدد الإشعارات الجديدة.'},
  {sel:'#NV-home',t:'🏠 الرئيسية',d:'من أي مكان ترجع للشاشة الرئيسية.'}
];
let _tourI=-1;
function startTour(){
  try{showScr('SCR-main');goTab('home');}catch(e){}
  tourClear();_tourI=-1;setTimeout(tourNext,250);
}
function tourClear(){['TOUR-BLOCK','TOUR-HL','TOUR-TIP'].forEach(id=>{const e=document.getElementById(id);if(e)e.remove();});}
function tourEnd(){tourClear();DS.tourKey=window._tourMarker||'';sv();}
function tourNext(){
  let el=null;
  _tourI++;
  while(_tourI<TOUR_STEPS.length){
    const e=document.querySelector(TOUR_STEPS[_tourI].sel);
    if(e&&e.offsetWidth>0){el=e;break;}
    _tourI++;
  }
  if(!el){tourEnd();toast('🎉 خلصت الجولة — استمتع بقسطاس');return;}
  try{el.scrollIntoView({block:'center'});}catch(e){}
  setTimeout(()=>tourShow(el),120);
}
function tourShow(el){
  tourClear();
  const st=TOUR_STEPS[_tourI];const r=el.getBoundingClientRect();
  const blk=document.createElement('div');blk.id='TOUR-BLOCK';blk.style.cssText='position:fixed;inset:0;z-index:10001';
  const hl=document.createElement('div');hl.id='TOUR-HL';
  hl.style.cssText='position:fixed;z-index:10002;pointer-events:none;border-radius:16px;border:2px solid #cda43e;box-shadow:0 0 0 9999px rgba(0,0,0,.66);left:'+(r.left-4)+'px;top:'+(r.top-4)+'px;width:'+(r.width+8)+'px;height:'+(r.height+8)+'px';
  const below=r.bottom+190<window.innerHeight;
  const tip=document.createElement('div');tip.id='TOUR-TIP';
  tip.style.cssText='position:fixed;z-index:10003;left:5%;width:90%;background:var(--sf);color:var(--tx);border-radius:16px;padding:.9rem 1rem;box-shadow:0 8px 30px rgba(0,0,0,.4);'+(below?'top:'+(r.bottom+14)+'px':'bottom:'+(window.innerHeight-r.top+14)+'px');
  const last=_tourI>=TOUR_STEPS.length-1;
  tip.innerHTML='<div style="font-size:14px;font-weight:800;margin-bottom:.3rem">'+st.t+'</div><div style="font-size:12px;color:var(--tx2);line-height:1.8;margin-bottom:.7rem">'+st.d+'</div><div style="display:flex;gap:.5rem;align-items:center"><button class="btn btn-s btn-sm" onclick="tourEnd()" style="width:auto">تخطي</button><span style="flex:1;text-align:center;font-size:10px;color:var(--mu)">'+(_tourI+1)+' / '+TOUR_STEPS.length+'</span><button class="btn btn-p btn-sm" onclick="tourNext()" style="width:auto">'+(last?'تم ✓':'التالي ›')+'</button></div>';
  document.body.appendChild(blk);document.body.appendChild(hl);document.body.appendChild(tip);
}

(function init(){
  if(window.matchMedia?.('(prefers-color-scheme: dark)').matches)DS.dark=true;
  setTimeout(()=>{const l=document.getElementById('LOAD');if(l){l.classList.add('hide');setTimeout(()=>l.style.display='none',500);}},1800);
  ld();
  if(isAppLocked()){
    setTimeout(()=>{showScr('SCR-app-locked');renderLockCountdown();recheckAppLock(true);},100);
    return;
  }
  if(DS.loggedIn){
    showScr('SCR-main');applyDark();rAll();rNotes();rExpenses();rTasks();rOccasions();rArticles();rSavings();rVaults();applyVaultVisibility();checkOccasionReminders();updateNotifBadge();updateConnectionStatus();updProf();updSubStatus();updSubBar();
    checkForUpdates();if(FB_READY)syncFromCloud();
    
    // Restore session settings
    if(DS.sessionMinutes){ _sessionMinutes=DS.sessionMinutes; const sel=document.getElementById('AUTO-LOGOUT-SEL'); if(sel)sel.value=_sessionMinutes; }
    if(DS.pinEnabled){ _pinEnabled=true; _pinCode=DS.pinCode||''; const tog=document.getElementById('TG-PIN'); if(tog)tog.classList.add('on'); const stat=document.getElementById('PIN-STATUS'); if(stat)stat.textContent='مفعّل ✅'; }
    if(DS.bioEnabled && DS.bioCredId){ _bioEnabled=true; const tog=document.getElementById('TG-BIO'); if(tog)tog.classList.add('on'); const stat=document.getElementById('BIO-STATUS'); if(stat)stat.textContent='مفعّل ✅'; const bioBtn=document.getElementById('BIO-BTN'); if(bioBtn)bioBtn.style.display='block'; }
    resetAutoLogout();
    return;
  }
  applyDark();setTimeout(()=>{showScr('SCR-auth');updateAuthQuickAccess();renderPwLockUI();},100);
})();

// ══ صوت وتنبيهات (مُحسَّن) ══
let _AC=null,_audioOK=false;
function getAC(){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;if(!_AC)_AC=new A();return _AC;}
function unlockAudio(){const c=getAC();if(!c)return;if(c.state==='suspended')c.resume().catch(()=>{});if(!_audioOK){try{const s=c.createBufferSource();s.buffer=c.createBuffer(1,1,22050);s.connect(c.destination);s.start(0);_audioOK=true;}catch(e){}}}
['pointerdown','touchend','keydown','click'].forEach(ev=>document.addEventListener(ev,unlockAudio,{passive:true}));
function runReminderChecks(){try{if(!DS.loggedIn)return;if(typeof checkNoteReminders==='function')checkNoteReminders();if(typeof checkOccasionReminders==='function')checkOccasionReminders();updateNotifBadge();}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')runReminderChecks();});
function maybeAskNotifPermission(){
  try{
    if(!DS.loggedIn||!('Notification' in window)||Notification.permission!=='default')return;
    if((DS.notifPrefs||{}).system===false)return;
    if(DS.notifAskedAt&&Date.now()-DS.notifAskedAt<6048e5)return;
    if(document.getElementById('TOUR-TIP')||document.getElementById('NOTIF-ASK'))return;
    const b=document.createElement('div');b.id='NOTIF-ASK';b.setAttribute('role','alert');
    b.style.cssText='position:fixed;left:3%;right:3%;bottom:76px;z-index:9998;background:var(--sf,#fff);color:var(--tx,#1e1833);border:1px solid var(--bd,#ddd);border-radius:14px;padding:.8rem;box-shadow:0 6px 24px rgba(0,0,0,.25);display:flex;gap:.6rem;align-items:center';
    b.innerHTML='<div style="flex:1;font-size:12px;font-weight:700;line-height:1.7">🔔 فعّل الإشعارات عشان توصلك تنبيهات الملاحظات والمناسبات</div><button type="button" class="btn btn-p btn-sm" style="width:auto">تفعيل</button><button type="button" class="btn btn-s btn-sm" style="width:auto">لاحقًا</button>';
    const [y,n]=b.querySelectorAll('button');
    y.onclick=()=>{unlockAudio();enableSystemNotifications();DS.notifAskedAt=Date.now();sv();b.remove();};
    n.onclick=()=>{DS.notifAskedAt=Date.now();sv();b.remove();};
    document.body.appendChild(b);
  }catch(e){}
}

// ══ التلميح، الجولة، السلة (تعمل أوفلاين)، المزامنة بالرقم، المصادقة ══
const withTO=(p,ms)=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms))]);
function showPwHint(d){
  try{
    if(!d||!d.hint||!d.hintQ)return;
    const p=document.getElementById('LOGIN-PASS');if(!p)return;const host=p.closest('.fl')||p.parentNode;
    const old=document.getElementById('LG-HINT');if(old)old.remove();
    const el=document.createElement('div');el.id='LG-HINT';el.setAttribute('role','status');
    el.style.cssText='margin-top:.5rem;padding:.55rem .7rem;border-radius:10px;background:var(--warn-bg,#fbf0dc);font-size:12px;line-height:1.8';
    const q=document.createElement('div');q.style.fontWeight='700';q.textContent='💡 '+d.hintQ;el.appendChild(q);
    const b=document.createElement('button');b.type='button';b.className='btn btn-s btn-sm';b.style.cssText='width:auto;margin-top:.3rem';b.textContent='👁️ اعرض إجابتي';
    const an=document.createElement('div');an.style.cssText='display:none;margin-top:.3rem';an.textContent=d.hint;
    b.onclick=()=>{an.style.display='block';b.remove();};el.appendChild(b);el.appendChild(an);host.appendChild(el);
  }catch(e){}
}
function tourAfterForced(marker,tries){
  try{
    tries=tries||0;
    if(!DS.loggedIn)return;
    if(DS.tourKey===undefined&&!DS.guideSeen&&!DS.guideVer)return;   // مستخدم جديد: الجولة الأولى هي اللي بتسجّل العلامة
    if(DS.tourKey===marker)return;
    const m=document.getElementById('SCR-main');
    if(!m||!m.classList.contains('on')||document.getElementById('TOUR-TIP')){if(tries<8)setTimeout(()=>tourAfterForced(marker,tries+1),4000);return;}
    DS.tourKey=marker;sv();setTimeout(startTour,1200);
  }catch(e){}
}
const TRASH_DAYS=30,TQ_KEY='qistas_tq';
const TRASH_GROUPS=[
  {k:'expenses',n:'💸 المصروفات',c:['expenses']},{k:'recurring',n:'🔁 المصروفات الثابتة',c:['recurringExpenses']},
  {k:'tasks',n:'✅ المهام',c:['tasks']},{k:'notes',n:'📝 الملاحظات',c:['notes']},{k:'articles',n:'📰 المقالات',c:['articles']},
  {k:'occasions',n:'🎉 المناسبات',c:['occasions']},{k:'contacts',n:'👥 جهات الاتصال',c:['contacts']},
  {k:'savings',n:'🐷 الادخار والخزائن',c:['savings','savingsVaults']},{k:'health',n:'💊 الأدوية والمواعيد',c:['medications','doctorAppointments','appointments']}
];
function trashQ(){try{return JSON.parse(localStorage.getItem(TQ_KEY)||'[]');}catch(e){return [];}}
function setTrashQ(q){localStorage.setItem(TQ_KEY,JSON.stringify(q));}
function myQ(){return trashQ().filter(b=>b.uid===DS.uid);}
function trashOverlay(html){
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem';
  ov.innerHTML='<div role="dialog" aria-modal="true" style="background:var(--sf,#fff);color:var(--tx,#1e1833);border-radius:16px;padding:1.1rem;width:100%;max-width:380px;max-height:86vh;overflow:auto">'+html+'</div>';
  document.body.appendChild(ov);return ov;
}
function askSecret(msg){
  return new Promise(res=>{
    const ov=trashOverlay('<div style="font-weight:800;font-size:14px;margin-bottom:.7rem;text-align:center"></div><input type="password" class="inp" autocomplete="current-password" aria-label="كلمة المرور" style="text-align:center"><div style="display:flex;gap:.6rem;margin-top:.9rem"><button type="button" class="btn btn-p _ok" style="flex:1">تأكيد</button><button type="button" class="btn btn-s _no" style="flex:1">إلغاء</button></div>');
    ov.querySelector('[role=dialog]>div').textContent=msg;const inp=ov.querySelector('input');inp.focus();
    const done=v=>{ov.remove();res(v);};
    ov.querySelector('._ok').onclick=()=>done(inp.value);ov.querySelector('._no').onclick=()=>done(null);
    inp.onkeydown=e=>{if(e.key==='Enter')done(inp.value);};
  });
}
async function trashAuth(msg){
  const p=await askSecret(msg);if(p===null)return false;
  if(!DS.passHash||hashPass(p)!==DS.passHash){toast('❌ كلمة المرور غير صحيحة');return false;}
  return p;
}
function openClearData(){
  const rows=TRASH_GROUPS.map(g=>({g,n:g.c.reduce((s,c)=>s+(DS[c]||[]).length,0)})).filter(r=>r.n>0);
  if(!rows.length){toast('ℹ️ مفيش بيانات لمسحها');return;}
  const ov=trashOverlay('<div style="font-weight:800;font-size:15px;margin-bottom:.3rem">🧹 مسح بيانات التطبيق</div><div style="font-size:11.5px;color:var(--tx2,#5e577a);line-height:1.8;margin-bottom:.7rem">اختر البيانات اللي هتتنقل لسلة المهملات. لو مفيش نت بتتحفظ مؤقتًا وتتنقل أول ما النت يرجع. بتفضل 30 يوم وتقدر ترجعها من الإعدادات، وبعدها بتتحذف نهائيًا.</div><div class="_l"></div><div style="display:flex;gap:.6rem;margin-top:.9rem"><button type="button" class="btn btn-ng _ok" style="flex:1">نقل للسلة</button><button type="button" class="btn btn-s _no" style="flex:1">إلغاء</button></div>');
  const box=ov.querySelector('._l'),cbs=rows.map(r=>{
    const lb=document.createElement('label');lb.style.cssText='display:flex;align-items:center;gap:.5rem;padding:.45rem 0;font-size:13px;font-weight:700';
    const cb=document.createElement('input');cb.type='checkbox';cb.checked=true;lb.appendChild(cb);
    const sp=document.createElement('span');sp.textContent=r.g.n+' ('+r.n+')';lb.appendChild(sp);box.appendChild(lb);return cb;
  });
  ov.querySelector('._no').onclick=()=>ov.remove();
  ov.querySelector('._ok').onclick=async()=>{
    const sel=rows.filter((r,i)=>cbs[i].checked).map(r=>r.g);
    if(!sel.length){toast('اختر قسم واحد على الأقل');return;}
    ov.remove();
    if(await trashAuth('أدخل كلمة المرور لتأكيد النقل'))moveToTrash(sel);
  };
}
function moveToTrash(groups){
  const now=new Date(),b={id:'tb'+Date.now(),uid:DS.uid,at:now.toISOString(),exp:now.getTime()+TRASH_DAYS*864e5,items:{},groups:{}};
  groups.forEach(g=>g.c.forEach(c=>{const arr=DS[c]||[];if(arr.length){b.items[c]=JSON.parse(JSON.stringify(arr));b.groups[g.k]=(b.groups[g.k]||0)+arr.length;}}));
  try{setTrashQ(trashQ().concat([b]));}catch(e){toast('❌ مفيش مساحة كفاية للنقل — اتصل بالإنترنت وجرّب تاني');return;}
  Object.keys(b.items).forEach(c=>{DS[c]=[];});
  sv();svFlush();
  if(navigator.onLine&&FB_READY){
    toast('⏳ جاري النقل لسلة المهملات...');
    flushTrashQueue().then(ok=>{toast(ok?'✅ اتنقلت لسلة المهملات':'📥 اتحفظت مؤقتًا وهتتنقل لما النت يثبت');setTimeout(()=>location.reload(),900);});
  }else{toast('📥 اتحفظت مؤقتًا وهتتنقل لسلة المهملات أول ما النت يرجع');setTimeout(()=>location.reload(),1200);}
}
let _tqBusy=false;
async function flushTrashQueue(){
  const mine=myQ();
  if(!mine.length)return true;
  if(_tqBusy||!(FB_READY&&DS.uid&&navigator.onLine))return false;
  _tqBusy=true;
  try{
    const ref=db.collection('users').doc(DS.uid),T=ref.collection('trash');
    for(const b of mine){
      const jobs=[];
      for(const c of Object.keys(b.items)){
        const arr=b.items[c],g=(TRASH_GROUPS.find(x=>x.c.indexOf(c)>-1)||{}).k||c;let chunk=[],size=0,part=0;
        const flush=()=>{if(!chunk.length)return;jobs.push(T.doc(b.id+'_'+c+'_'+(part++)).set({batch:b.id,group:g,coll:c,items:chunk,count:chunk.length,deletedAt:b.at,expireAt:firebase.firestore.Timestamp.fromDate(new Date(b.exp))}));chunk=[];size=0;};
        for(const it of arr){const s=JSON.stringify(it).length;if(size+s>600000)flush();chunk.push(it);size+=s;}
        flush();
      }
      await withTO(Promise.all(jobs),20000);
      for(const c of Object.keys(b.items)){const arr=b.items[c];for(let i=0;i<arr.length;i+=450){const w=db.batch();arr.slice(i,i+450).forEach(it=>w.delete(ref.collection(c).doc(String(it.id))));await withTO(w.commit(),20000);}}
      setTrashQ(trashQ().filter(x=>x.id!==b.id));
    }
    return true;
  }catch(e){return false;}finally{_tqBusy=false;}
}
async function openTrash(){
  if(!await trashAuth('أدخل كلمة المرور لفتح سلة المهملات'))return;
  const now=Date.now(),bt={};let cloudOk=false;
  if(FB_READY&&DS.uid&&navigator.onLine){
    try{
      const snap=await withTO(db.collection('users').doc(DS.uid).collection('trash').get(),8000);
      snap.forEach(d=>{const x=d.data();x._id=d.id;const e=x.expireAt&&x.expireAt.toMillis?x.expireAt.toMillis():new Date(x.deletedAt).getTime()+TRASH_DAYS*864e5;if(e<=now)return;(bt[x.batch]=bt[x.batch]||{id:x.batch,at:x.deletedAt,exp:e,docs:[]}).docs.push(x);});
      cloudOk=true;
    }catch(e){}
  }
  const queued=myQ().filter(b=>b.exp>now).map(b=>({id:b.id,at:b.at,exp:b.exp,q:b}));
  const list=queued.concat(Object.values(bt).sort((x,y)=>y.exp-x.exp));
  const ov=trashOverlay('<div style="font-weight:800;font-size:15px;margin-bottom:.3rem">🗑️ سلة المهملات</div><div style="font-size:11.5px;color:var(--tx2,#5e577a);line-height:1.8;margin-bottom:.7rem">بتتحذف نهائيًا بعد '+TRASH_DAYS+' يوم من المسح.'+(cloudOk?'':' (مفيش اتصال، ظاهر بس اللي اتحفظ على الجهاز)')+'</div><div class="_l"></div><button type="button" class="btn btn-s _no" style="width:100%;margin-top:.6rem">إغلاق</button>');
  ov.querySelector('._no').onclick=()=>ov.remove();
  const box=ov.querySelector('._l');
  if(!list.length){const e=document.createElement('div');e.style.cssText='text-align:center;padding:1.2rem;font-size:12.5px;color:var(--mu,#8a83a3)';e.textContent='السلة فاضية';box.appendChild(e);return;}
  list.forEach(b=>{
    const gs={};
    if(b.q)Object.assign(gs,b.q.groups);else b.docs.forEach(d=>{gs[d.group]=(gs[d.group]||0)+(d.count||0);});
    const names=Object.keys(gs).map(k=>{const g=TRASH_GROUPS.find(x=>x.k===k);return (g?g.n:k)+' ('+gs[k]+')';}).join('، ');
    const card=document.createElement('div');card.style.cssText='border:1px solid var(--bd,#e3dcf2);border-radius:12px;padding:.7rem;margin-bottom:.6rem';
    const t=document.createElement('div');t.style.cssText='font-size:12.5px;font-weight:700;line-height:1.8';t.textContent=names;card.appendChild(t);
    const s=document.createElement('div');s.style.cssText='font-size:11px;color:var(--mu,#8a83a3);margin:.2rem 0 .5rem';
    s.textContent=(b.q?'⏳ في انتظار النت — ':'')+'اتمسحت '+new Date(b.at).toLocaleDateString('ar-EG')+' — باقي '+Math.max(1,Math.ceil((b.exp-now)/864e5))+' يوم';card.appendChild(s);
    const row=document.createElement('div');row.style.cssText='display:flex;gap:.5rem';
    const r=document.createElement('button');r.type='button';r.className='btn btn-p btn-sm';r.textContent='↩️ استرجاع';
    r.onclick=()=>{ov.remove();if(b.q)restoreQueued(b.q);else restoreBatch(b);};row.appendChild(r);
    if(!b.q){const x=document.createElement('button');x.type='button';x.className='btn btn-ng btn-sm';x.textContent='حذف نهائي';x.onclick=async()=>{if(!confirm('حذف نهائي؟ مش هتقدر ترجعها.'))return;ov.remove();await deleteBatch(b);};row.appendChild(x);}
    card.appendChild(row);box.appendChild(card);
  });
}
async function uploadItems(c,items){
  const ref=db.collection('users').doc(DS.uid);
  for(let i=0;i<items.length;i+=450){const w=db.batch();items.slice(i,i+450).forEach(it=>w.set(ref.collection(c).doc(String(it.id)),JSON.parse(JSON.stringify(it))));await withTO(w.commit(),20000);}
}
function restoreQueued(b){
  Object.keys(b.items).forEach(c=>{const have=new Set((DS[c]||[]).map(x=>String(x.id)));DS[c]=(DS[c]||[]).concat(b.items[c].filter(it=>!have.has(String(it.id))));});
  try{setTrashQ(trashQ().filter(x=>x.id!==b.id));}catch(e){}
  sv();svFlush();
  if(FB_READY&&DS.uid&&navigator.onLine)Object.keys(b.items).forEach(c=>uploadItems(c,b.items[c]).catch(()=>{}));
  toast('✅ تم الاسترجاع');setTimeout(()=>location.reload(),900);
}
async function restoreBatch(b){
  if(!(FB_READY&&DS.uid&&navigator.onLine)){toast('❌ محتاج اتصال بالإنترنت للاسترجاع');return;}
  toast('⏳ جاري الاسترجاع...');
  try{
    const ref=db.collection('users').doc(DS.uid);
    for(const d of b.docs){
      const items=d.items||[];
      await uploadItems(d.coll,items);
      const have=new Set((DS[d.coll]||[]).map(x=>String(x.id)));
      DS[d.coll]=(DS[d.coll]||[]).concat(items.filter(it=>!have.has(String(it.id))));
    }
    sv();svFlush();
    for(const d of b.docs)await ref.collection('trash').doc(d._id).delete();
    toast('✅ تم الاسترجاع');setTimeout(()=>location.reload(),900);
  }catch(e){toast('❌ تعذر الاسترجاع — جرّب تاني');}
}
async function deleteBatch(b){
  try{for(const d of b.docs)await db.collection('users').doc(DS.uid).collection('trash').doc(d._id).delete();toast('🗑️ اتحذفت نهائيًا');}catch(e){toast('❌ تعذر الحذف');}
}
function purgeExpiredTrash(){
  try{
    const now=Date.now(),q=trashQ(),keep=q.filter(b=>b.exp>now);
    if(keep.length!==q.length)setTrashQ(keep);
    if(!(FB_READY&&DS.loggedIn&&DS.uid&&navigator.onLine))return;
    db.collection('users').doc(DS.uid).collection('trash').where('expireAt','<=',firebase.firestore.Timestamp.now()).get().then(s=>{s.forEach(d=>d.ref.delete().catch(()=>{}));}).catch(()=>{});
  }catch(e){}
}
window.addEventListener('online',()=>{flushTrashQueue().then(()=>{purgeExpiredTrash();if(DS.loggedIn)syncFromCloud();});});
// ── مزامنة بالرقم: رجوع كل البيانات على أي جهاز ──
function syncFromCloud(){
  if(!FB_READY||!DS.uid)return;
  if(myQ().length){flushTrashQueue().then(()=>{if(!myQ().length)syncFromCloudCore();});return;}
  syncFromCloudCore();
}
const EXTRA_COLLS=['savingsVaults','medications','doctorAppointments','appointments'];
function syncExtraColls(){
  if(!FB_READY||!DS.uid)return;
  EXTRA_COLLS.forEach(c=>{
    db.collection('users').doc(DS.uid).collection(c).get().then(snap=>{
      if(!snap.empty){DS[c]=[];snap.forEach(d=>DS[c].push({id:isNaN(d.id)?d.id:Number(d.id),...d.data()}));sv();try{rAll();}catch(e){}}
      else backfillColl(c);
    }).catch(()=>{});
  });
}
async function backfillColl(c){
  try{
    const arr=DS[c]||[];if(!arr.length||!FB_READY||!DS.uid)return;
    const t=await withTO(db.collection('users').doc(DS.uid).collection('trash').where('coll','==',c).limit(1).get(),8000);
    if(!t.empty)return;
    await uploadItems(c,arr);
  }catch(e){}
}
// ── المصادقة (مرحلة 1: بتتم بصمت ومش بتمنع الدخول لو فشلت) ──
function authEmail(phone){return String(phone).replace(/\D/g,'')+'@qistas.app';}
async function ensureFbAuth(phone,pass){
  try{
    if(!window.firebase||!firebase.auth)return false;
    const au=firebase.auth(),em=authEmail(phone);
    try{await au.signInWithEmailAndPassword(em,pass);return true;}
    catch(e){
      if(e&&(e.code==='auth/user-not-found'||e.code==='auth/invalid-credential'||e.code==='auth/invalid-login-credentials')){
        try{await au.createUserWithEmailAndPassword(em,pass);return true;}catch(e2){return false;}
      }
      return false;
    }
  }catch(e){return false;}
}
async function authAfterLogin(uid,phone,pass,data){
  try{
    const ok=await Promise.race([ensureFbAuth(phone,pass),new Promise(r=>setTimeout(()=>r(false),6000))]);
    DS.authOk=!!ok;if(ok){try{checkIfAdmin();}catch(e){}}
    if(ok&&!(data&&data.authMigrated))db.collection('users').doc(uid).set({authMigrated:true},{merge:true}).catch(()=>{});
  }catch(e){}
}
function authUpdatePassword(p){try{const u=window.firebase&&firebase.auth&&firebase.auth().currentUser;if(u)u.updatePassword(p).catch(()=>{});}catch(e){}}
async function openHintEditor(){
  const pw=await trashAuth('أدخل كلمة المرور لتعديل سؤال التذكير');if(!pw)return;
  const ov=trashOverlay('<div style="font-weight:800;font-size:15px;margin-bottom:.6rem">💡 سؤال تذكير كلمة المرور</div><input class="inp _q" maxlength="60" placeholder="سؤالك أنت (مثال: اسم أول مدرسة؟)"><input class="inp _a" maxlength="80" placeholder="إجابتك" style="margin-top:.4rem"><div style="font-size:10.5px;color:var(--mu,#8a83a3);margin-top:.4rem;line-height:1.7">متكتبش كلمة المرور نفسها. أي حد يعرف رقمك ممكن يشوف السؤال بعد محاولة دخول غلط. سيبهم فاضيين لو عايز تمسحهم.</div><div style="display:flex;gap:.6rem;margin-top:.8rem"><button type="button" class="btn btn-p _ok" style="flex:1">حفظ</button><button type="button" class="btn btn-s _no" style="flex:1">إلغاء</button></div>');
  const q=ov.querySelector('._q'),an=ov.querySelector('._a');q.value=DS.hintQ||'';an.value=DS.hint||'';
  ov.querySelector('._no').onclick=()=>ov.remove();
  ov.querySelector('._ok').onclick=()=>{
    const hq=q.value.trim().slice(0,60),hn=an.value.trim().slice(0,80);
    if(!!hq!==!!hn){toast('❌ اكتب السؤال وإجابته مع بعض');return;}
    if(hn&&(hn.toLowerCase().indexOf(pw.toLowerCase())>-1||hq.toLowerCase().indexOf(pw.toLowerCase())>-1)){toast('❌ السؤال والإجابة لازم ميحتويوش كلمة المرور');return;}
    DS.hintQ=hq;DS.hint=hn;sv();
    if(FB_READY&&DS.uid){const up=hn?{hintQ:hq,hint:hn}:{hintQ:firebase.firestore.FieldValue.delete(),hint:firebase.firestore.FieldValue.delete()};db.collection('users').doc(DS.uid).set(up,{merge:true}).catch(()=>{});const hr=db.collection('hints').doc(DS.uid);(hn?hr.set({hintQ:hq,hint:hn}):hr.delete()).catch(()=>{});}
    ov.remove();toast('✅ تم الحفظ');
  };
}
async function showHintFor(uid,data){
  try{
    if(data&&data.hint&&data.hintQ){showPwHint(data);return;}
    const hd=await withTO(db.collection('hints').doc(uid).get(),6000);
    if(hd.exists)showPwHint(hd.data());
  }catch(e){}
}
function needRelogin(){
  if(window._nrl)return;window._nrl=1;
  try{const t=document.getElementById('STXT');if(t)t.textContent='سجّل دخول من جديد';}catch(e){}
  toast('🔐 اتفعّلت حماية حسابك — سجّل خروج وادخل تاني بكلمة المرور');
}
// ══ نسخة احتياطية: تصدير / استعادة ══
const BACKUP_COLLS=['contacts','notes','articles','savings','recurringExpenses','expenses','tasks','occasions','savingsVaults','medications','doctorAppointments','appointments'];
async function exportBackup(){
  if(!await trashAuth('أدخل كلمة المرور لتصدير نسخة احتياطية'))return;
  const data={};let n=0;
  BACKUP_COLLS.forEach(c=>{const a=DS[c]||[];if(a.length){data[c]=a;n+=a.length;}});
  if(!n){toast('ℹ️ مفيش بيانات للتصدير');return;}
  const out={app:'qistas',v:APP_VERSION,at:new Date().toISOString(),phone:DS.phone||'',data};
  const url=URL.createObjectURL(new Blob([JSON.stringify(out)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='qistas-backup-'+localISO(new Date())+'.json';
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);
  DS.lastBackup=Date.now();sv();toast('✅ اتصدّرت نسخة ('+n+' عنصر) — احتفظ بالملف في مكان آمن');
}
function importBackup(){
  const inp=document.createElement('input');inp.type='file';inp.accept='application/json,.json';
  inp.onchange=async()=>{
    const f=inp.files&&inp.files[0];if(!f)return;
    if(f.size>8e6){toast('❌ الملف كبير جدًا');return;}
    let o;try{o=JSON.parse(await f.text());}catch(e){toast('❌ الملف مش نسخة قسطاس صالحة');return;}
    if(!o||o.app!=='qistas'||!o.data||typeof o.data!=='object'){toast('❌ الملف مش نسخة قسطاس صالحة');return;}
    const cnt=BACKUP_COLLS.reduce((s,c)=>s+(Array.isArray(o.data[c])?o.data[c].length:0),0);
    if(!cnt){toast('ℹ️ النسخة فاضية');return;}
    const same=!o.phone||String(o.phone).replace(/\D/g,'')===String(DS.phone||'').replace(/\D/g,'');
    if(!confirm((same?'':'⚠️ النسخة دي لرقم تاني ('+o.phone+').\n')+'هتتضاف '+cnt+' عنصر لبياناتك (اللي ليه نفس المعرّف مش هيتكرر). تكمل؟'))return;
    if(!await trashAuth('أدخل كلمة المرور لتأكيد الاستعادة'))return;
    let added=0;
    for(const c of BACKUP_COLLS){
      const src=o.data[c];if(!Array.isArray(src))continue;
      const have=new Set((DS[c]||[]).map(x=>String(x.id))),fresh=[];
      src.forEach(it=>{if(!it||typeof it!=='object')return;const x=JSON.parse(JSON.stringify(it));if(x.id==null)x.id=newId();if(have.has(String(x.id)))return;have.add(String(x.id));fresh.push(x);});
      if(!fresh.length)continue;
      DS[c]=(DS[c]||[]).concat(fresh);added+=fresh.length;
      if(FB_READY&&DS.uid)uploadItems(c,fresh).catch(()=>{});
    }
    sv();svFlush();toast('✅ اتستعاد '+added+' عنصر');setTimeout(()=>location.reload(),1200);
  };
  inp.click();
}
function maybeBackupReminder(){
  try{
    if(!DS.loggedIn||['BK-ASK','TOUR-TIP','NOTIF-ASK'].some(i=>document.getElementById(i)))return;
    const n=BACKUP_COLLS.reduce((s,c)=>s+(DS[c]||[]).length,0);if(n<10)return;
    const now=Date.now();
    if(DS.lastBackup&&now-DS.lastBackup<2592e6)return;
    if(DS.backupAskedAt&&now-DS.backupAskedAt<12096e5)return;
    const b=document.createElement('div');b.id='BK-ASK';b.setAttribute('role','alert');
    b.style.cssText='position:fixed;left:3%;right:3%;bottom:76px;z-index:9998;background:var(--sf,#fff);color:var(--tx,#1e1833);border:1px solid var(--bd,#ddd);border-radius:14px;padding:.8rem;box-shadow:0 6px 24px rgba(0,0,0,.25);display:flex;gap:.6rem;align-items:center';
    b.innerHTML='<div style="flex:1;font-size:12px;font-weight:700;line-height:1.7">💾 خد نسخة احتياطية من بياناتك على جهازك</div><button type="button" class="btn btn-p btn-sm" style="width:auto">نسخة الآن</button><button type="button" class="btn btn-s btn-sm" style="width:auto">لاحقًا</button>';
    const [y,l]=b.querySelectorAll('button');
    y.onclick=()=>{b.remove();exportBackup();};
    l.onclick=()=>{DS.backupAskedAt=Date.now();sv();b.remove();};
    document.body.appendChild(b);
  }catch(e){}
}
// ══ الرئيسية المبسّطة: النهاردة ══
function homeQuickAdd(){
  const inp=document.getElementById('HM-AMT');
  const raw=((inp&&inp.value)||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d.]/g,'');
  goTab('expenses');
  setTimeout(()=>{try{openExpModal();if(raw){const am=document.getElementById('EXP-AM');if(am){am.value=raw;_calcState['EXP-AM']=raw;}}if(inp)inp.value='';}catch(e){}},120);
}
function rHomeNew(){
  try{
    const now=new Date(),td=localISO(now),ym=localYM(now);
    const set=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t;};
    set('HM-DATE',now.toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long'}));
    let today=0,month=0;
    (DS.expenses||[]).forEach(e=>{const a=Number(e.amount!=null?e.amount:e.amt)||0,d=String(e.date||'');if(d===td)today+=a;if(d.slice(0,7)===ym)month+=a;});
    const f=n=>Number(n.toFixed(2)).toLocaleString('en-US')+' ج';
    set('HM-TODAY',f(today));
    const bud=Number(DS.expenseBudget&&DS.expenseBudget.monthly)||0,mv=document.getElementById('HM-MONTH');
    if(bud>0){set('HM-L2','المتبقي من الميزانية');set('HM-MONTH',f(Math.max(0,bud-month)));if(mv)mv.style.color=(bud-month)<0?'var(--ng)':'var(--ok)';}
    else{set('HM-L2','مصروف الشهر');set('HM-MONTH',f(month));if(mv)mv.style.color='';}
    const rows=[],day0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    (DS.tasks||[]).filter(t=>!t.done&&(!t.date||t.date===td)).slice(0,3).forEach(t=>rows.push({ic:'chk',cl:'t-p',t:t.title||'مهمة',s:t.time?'اليوم '+t.time:'اليوم',go:'daily',k:0}));
    (DS.occasions||[]).forEach(o=>{
      if(!o||!o.date)return;let d=new Date(o.date);if(isNaN(d))return;
      if(o.recurring){d=new Date(now.getFullYear(),d.getMonth(),d.getDate());if(d<day0)d=new Date(now.getFullYear()+1,d.getMonth(),d.getDate());}
      const df=Math.round((d-day0)/864e5);
      if(df>=0&&df<=14)rows.push({ic:'cal',cl:'t-v',t:o.title||'مناسبة',s:df===0?'النهاردة':df===1?'بكرة':'بعد '+df+' يوم',go:'daily',k:df});
    });
    const box=document.getElementById('HM-SOON');if(!box)return;box.innerHTML='';
    rows.sort((a,b)=>a.k-b.k).slice(0,4).forEach(r=>{
      const row=document.createElement('div');row.className='rw2';row.style.cursor='pointer';row.onclick=()=>goTab(r.go);
      row.innerHTML='<span class="nc-ic '+r.cl+'"><svg class="sv" aria-hidden="true"><use href="#'+r.ic+'"/></svg></span><span style="flex:1"><b></b><small></small></span>';
      row.querySelector('b').textContent=r.t;row.querySelector('small').textContent=r.s;box.appendChild(row);
    });
    if(!rows.length){const e=document.createElement('div');e.className='rw2 empty';e.textContent='مفيش حاجة جاية — يومك فاضي ✨';box.appendChild(e);}
  }catch(e){}
}
try{firebase.auth().onAuthStateChanged(function(){try{if(DS.loggedIn)setTimeout(checkIfAdmin,400);}catch(e){}});}catch(e){}
// ── سجل الأخطاء (للدعم) ──
function openDiag(){
  const list=(window.__diag&&__diag.get())||[];
  const ov=trashOverlay('<div style="font-weight:800;font-size:15px;margin-bottom:.4rem">سجل الأخطاء</div><div style="font-size:11.5px;color:var(--tx2);line-height:1.8;margin-bottom:.6rem">لو حصلت مشكلة، ابعت لنا نص السجل ده.</div><div class="_l" style="max-height:44vh;overflow:auto;font-size:12px;line-height:1.7"></div><div style="display:flex;gap:.5rem;margin-top:.8rem"><button type="button" class="btn btn-p _cp" style="flex:1">نسخ</button><button type="button" class="btn btn-ng _cl" style="flex:1">مسح</button><button type="button" class="btn btn-s _no" style="flex:1">إغلاق</button></div>');
  const box=ov.querySelector('._l');
  if(!list.length)box.textContent='لا توجد أخطاء مسجّلة ✅';
  else list.slice().reverse().forEach(e=>{const d=document.createElement('div');d.style.cssText='padding:.4rem 0;border-top:1px solid var(--bd)';d.textContent=new Date(e.t).toLocaleString('ar-EG')+' — '+e.m+(e.f?' ('+e.f+(e.l?':'+e.l:'')+')':'');box.appendChild(d);});
  ov.querySelector('._no').onclick=()=>ov.remove();
  ov.querySelector('._cl').onclick=()=>{__diag.clear();ov.remove();toast('تم مسح السجل');};
  ov.querySelector('._cp').onclick=()=>{const t=list.map(e=>new Date(e.t).toISOString()+' '+e.m+' '+(e.f||'')+':'+(e.l||0)).join('\n')+'\nv'+APP_VERSION;try{navigator.clipboard.writeText(t);toast('تم النسخ');}catch(x){toast('تعذّر النسخ');}};
}

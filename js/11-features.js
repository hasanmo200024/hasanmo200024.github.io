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
  {sel:'#NV-money',t:'💰 فلوسي',d:'المصروفات والدخل، معاملاتي، الادخار، الخزائن، وجمعيتك.'},
  {sel:'#NV-life',t:'✅ يومي',d:'المهام والمناسبات والصحة (الأدوية ومواعيد الدكتور).'},
  {sel:'#NV-info',t:'📚 معلومات',d:'ملاحظاتك السريعة ومقالاتك.'},
  {sel:'#NV-settings',t:'⚙️ الإعدادات',d:'حسابك وكودك، الإشعارات، النسخ الاحتياطي، ومواعيد الصلاة.'},
  {sel:'#TB-home .hdr button[onclick*="openNotifPanel"]',t:'🔔 الإشعارات',d:'العداد الأحمر بيوريك عدد الإشعارات الجديدة.'},
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
  setTimeout(hideSplash,Math.max(0,2700-(window.performance?performance.now():0)));
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
  {k:'expenses',n:'💸 المصروفات',c:['expenses']},{k:'income',n:'💵 الدخل',c:['incomes']},{k:'gameya',n:'🤝 الجمعيات',c:['gameyas']},{k:'recurring',n:'🔁 المصروفات الثابتة',c:['recurringExpenses']},
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
    const ov=trashOverlay('<div style="font-weight:800;font-size:14px;margin-bottom:.7rem;text-align:center"></div><div style="position:relative"><input type="password" class="inp" autocomplete="current-password" aria-label="كلمة المرور" style="text-align:center;padding-left:2.5rem"><span class="_eye" role="button" aria-label="إظهار كلمة المرور" style="position:absolute;left:.75rem;top:50%;transform:translateY(-50%);cursor:pointer;font-size:15px">👁</span></div><div style="display:flex;gap:.6rem;margin-top:.9rem"><button type="button" class="btn btn-p _ok" style="flex:1">تأكيد</button><button type="button" class="btn btn-s _no" style="flex:1">إلغاء</button></div>');
    ov.querySelector('[role=dialog]>div').textContent=msg;const inp=ov.querySelector('input');inp.focus();
    ov.querySelector('._eye').onclick=()=>{inp.type=inp.type==='password'?'text':'password';};
    const done=v=>{ov.remove();res(v);};
    ov.querySelector('._ok').onclick=()=>done(inp.value);ov.querySelector('._no').onclick=()=>done(null);
    inp.onkeydown=e=>{if(e.key==='Enter')done(inp.value);};
  });
}
async function verifyPassword(p){
  const cred=x=>(DS.codeAcct&&isCode(x))?codePass(x):x;const vs=[cred(p)];if(p.trim()!==p)vs.push(cred(p.trim()));
  if(DS.passHash&&vs.some(v=>hashPass(v)===DS.passHash))return true;
  try{if(navigator.onLine&&window.firebase&&firebase.auth&&(DS.aid||DS.phone)){await withTO(firebase.auth().signInWithEmailAndPassword(authEmail(DS.aid||DS.phone),vs[0]),10000);DS.passHash=hashPass(vs[0]);sv();return true;}}catch(e){}
  try{if(navigator.onLine&&FB_READY&&DS.uid){const d=await withTO(db.collection('users').doc(DS.uid).get(),8000);const ph=d.exists&&d.data().passHash;if(ph&&vs.some(v=>hashPass(v)===ph)){DS.passHash=ph;sv();return true;}}}catch(e){}
  return false;
}
async function trashAuth(msg){
  const p=await askSecret(msg);if(p===null)return false;
  if(!p){toast('❌ اكتب كلمة المرور');return false;}
  if(await verifyPassword(p))return p;
  toast(!navigator.onLine&&!DS.passHash?'🔌 محتاج اتصال بالإنترنت للتأكد من كلمة المرور':'❌ كلمة المرور غير صحيحة');
  return false;
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
      for(const c of Object.keys(b.items)){const arr=b.items[c];for(let i=0;i<arr.length;i+=240){const w=db.batch(),now=Date.now();arr.slice(i,i+240).forEach(it=>{w.delete(ref.collection(c).doc(String(it.id)));w.set(ref.collection('tombstones').doc(c+'_'+it.id),{c:c,id:String(it.id),at:now});});await withTO(w.commit(),20000);}}
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
async function clearTombs(coll,items){
  if(!FB_READY||!DS.uid)return;const ref=db.collection('users').doc(DS.uid);
  items.forEach(it=>{if(DS._tomb)delete DS._tomb[coll+'_'+it.id];});
  for(let i=0;i<items.length;i+=400){const b=db.batch();items.slice(i,i+400).forEach(it=>b.delete(ref.collection('tombstones').doc(coll+'_'+it.id)));try{await withTO(b.commit(),20000);}catch(e){}}
}
async function uploadItems(c,items){
  const ref=db.collection('users').doc(DS.uid);items.forEach(it=>{it.u=Date.now();});
  for(let i=0;i<items.length;i+=450){const w=db.batch();items.slice(i,i+450).forEach(it=>w.set(ref.collection(c).doc(String(it.id)),JSON.parse(JSON.stringify(it))));await withTO(w.commit(),20000);}
}
function restoreQueued(b){
  Object.keys(b.items).forEach(c=>{const have=new Set((DS[c]||[]).map(x=>String(x.id)));DS[c]=(DS[c]||[]).concat(b.items[c].filter(it=>!have.has(String(it.id))));});
  try{setTrashQ(trashQ().filter(x=>x.id!==b.id));}catch(e){}
  sv();svFlush();
  if(FB_READY&&DS.uid&&navigator.onLine)Object.keys(b.items).forEach(c=>uploadItems(c,b.items[c]).then(()=>clearTombs(c,b.items[c])).catch(()=>{}));
  toast('✅ تم الاسترجاع');setTimeout(()=>location.reload(),900);
}
async function restoreBatch(b){
  if(!(FB_READY&&DS.uid&&navigator.onLine)){toast('❌ محتاج اتصال بالإنترنت للاسترجاع');return;}
  toast('⏳ جاري الاسترجاع...');
  try{
    const ref=db.collection('users').doc(DS.uid);
    for(const d of b.docs){
      const items=d.items||[];
      await uploadItems(d.coll,items);await clearTombs(d.coll,items);
      const have=new Set((DS[d.coll]||[]).map(x=>String(x.id)));
      DS[d.coll]=(DS[d.coll]||[]).concat(items.filter(it=>!have.has(String(it.id))));
    }
    sv();svFlush();
    for(const d of b.docs)await ref.collection('trash').doc(d._id).delete();
    toast('✅ تم الاسترجاع');setTimeout(()=>location.reload(),900);
  }catch(e){toast('❌ تعذر الاسترجاع — جرّب تاني');}
}
async function deleteBatch(b){
  try{for(const d of b.docs)await cloudDel('trash',d._id);toast('🗑️ اتحذفت نهائيًا');}catch(e){toast('❌ تعذر الحذف');}
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
const BACKUP_COLLS=['gameyas','contacts','notes','articles','savings','recurringExpenses','expenses','incomes','tasks','occasions','savingsVaults','medications','doctorAppointments','appointments'];
async function exportBackup(){
  if(!await trashAuth('أدخل كلمة المرور لتصدير نسخة احتياطية'))return;
  const data={};let n=0;
  BACKUP_COLLS.forEach(c=>{const a=DS[c]||[];if(a.length){data[c]=a;n+=a.length;}});
  if(!n){toast('ℹ️ مفيش بيانات للتصدير');return;}
  const out={app:'qistas',v:APP_VERSION,at:new Date().toISOString(),phone:DS.phone||'',data,settings:{expenseCategories:DS.expenseCategories||[],expenseBudget:DS.expenseBudget||null}};
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
    if(o.settings){if(!(DS.expenseCategories||[]).length&&Array.isArray(o.settings.expenseCategories))DS.expenseCategories=o.settings.expenseCategories;if(!(DS.expenseBudget&&(DS.expenseBudget.monthly||DS.expenseBudget.daily))&&o.settings.expenseBudget)DS.expenseBudget=o.settings.expenseBudget;}
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
    try{(DS.gameyas||[]).forEach(g=>{const nx=gmNextInfo(g);if(nx.k<=7)rows.push({ic:'wal',cl:'t-p',t:g.name||'جمعية',s:nx.t,go:'gameya',k:Math.max(0,nx.k)});});}catch(e){}
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
  const sl=(DS._slog||[]).slice(-25).reverse();
  if(sl.length){const h2=document.createElement('div');h2.style.cssText='font-weight:800;margin-top:.7rem';h2.textContent='آخر تغييرات المزامنة';box.appendChild(h2);sl.forEach(e=>{const d=document.createElement('div');d.style.cssText='padding:.3rem 0;border-top:1px solid var(--bd)';d.textContent=new Date(e.t).toLocaleTimeString('ar-EG')+' — '+({add:'اتضاف من السحابة',drop:'اتشال (محذوف من جهاز تاني)',push:'اتبعت للسحابة',err:'⚠️ خطأ مزامنة'}[e.k]||e.k)+' · '+e.c+' #'+e.i;box.appendChild(d);});}
  ov.querySelector('._cl').onclick=()=>{__diag.clear();ov.remove();toast('تم مسح السجل');};
  ov.querySelector('._cp').onclick=()=>{const t=list.map(e=>new Date(e.t).toISOString()+' '+e.m+' '+(e.f||'')+':'+(e.l||0)).join('\n')+'\nv'+APP_VERSION;try{navigator.clipboard.writeText(t);toast('تم النسخ');}catch(x){toast('تعذّر النسخ');}};
}
// ── شاشة الافتتاح: شعار ← شعار + الشعار اللفظي ──
function hideSplash(){const l=document.getElementById('LOAD');if(l&&!l.classList.contains('hide')){l.classList.add('hide');setTimeout(()=>{l.style.display='none';},500);}}
function skipSplash(){hideSplash();}
// ── الدخول بكود (6 أرقام): الكود هو الحساب، والحساب مرتبط ببيانات المستخدم ──
const CODE_LEN=6,LAST_KEY='qistas_last';
const isCode=x=>new RegExp('^\\d{'+CODE_LEN+'}$').test(String(x));
function codePass(code){return 'Qs'+code+'!k';}
function newAccountCode(){const a=new Uint32Array(1);window.crypto.getRandomValues(a);const lo=Math.pow(10,CODE_LEN-1);return String(lo+a[0]%(9*lo));}
function lastAccount(){try{return JSON.parse(localStorage.getItem(LAST_KEY)||'null');}catch(e){return null;}}
function rememberAccount(){const t=window._lt;if(!t||!t.num)return;try{localStorage.setItem(LAST_KEY,JSON.stringify({cc:t.cc,num:t.num,name:DS.name||''}));}catch(e){}}
function applyLoginMode(){
  const a=lastAccount(),known=document.getElementById('LG-KNOWN'),row=document.getElementById('LG-PHONE-ROW');
  if(!document.getElementById('LOGIN-PASS'))return;
  if(a&&a.num){
    document.getElementById('PH-CC').value=a.cc||'+20';document.getElementById('PH-NUM').value=a.num;
    if(known){known.style.display='block';document.getElementById('LG-KNOWN-NAME').textContent=a.name||'';document.getElementById('LG-KNOWN-PH').textContent=(a.cc||'')+' •••• '+String(a.num).slice(-3);}
    if(row)row.style.display='none';
  }else{if(known)known.style.display='none';if(row)row.style.display='';}
}
function switchAccount(){try{localStorage.removeItem(LAST_KEY);}catch(e){}const n=document.getElementById('PH-NUM');if(n)n.value='';applyLoginMode();if(n)n.focus();}
function showLegacyLogin(on){
  const l=document.getElementById('LG-LEGACY'),c=document.getElementById('LG-CODE-BOX');
  if(l)l.style.display=on?'block':'none';if(c)c.style.display=on?'none':'block';
  if(on)applyLoginMode();
}
function loginBtn(){const l=document.getElementById('LG-LEGACY');if(l&&l.style.display!=='none')doLogin();else doLoginCode();}
function codeAuto(){const i=document.getElementById('LOGIN-CODE');if(i&&isCode(i.value))setTimeout(()=>{if(isCode(i.value))doLoginCode();},120);}
async function doLoginCode(){
  if(isAppLocked()){showScr('SCR-app-locked');renderLockCountdown();return;}
  if(getPwLockRemaining()>0){renderPwLockUI();return;}
  const inp=document.getElementById('LOGIN-CODE'),code=((inp&&inp.value)||'').replace(/\D/g,'');
  if(!isCode(code)){toast('❌ أدخل كود من '+CODE_LEN+' أرقام');return;}
  const uid='user_'+code,pw=codePass(code);window._lt=null;DS.lastTryUid='';
  svFlush();let signed=false;
  if(FB_READY&&navigator.onLine&&window.firebase&&firebase.auth){try{await withTO(firebase.auth().signInWithEmailAndPassword(authEmail(code),pw),12000);signed=true;}catch(e){signed=false;}}
  if(signed){
    let data={};try{const doc=await withTO(db.collection('users').doc(uid).get(),12000);if(doc.exists)data=doc.data();}catch(e){}
    if(data.blocked===true){toast('🚫 هذا الحساب محظور — تواصل مع الدعم');try{firebase.auth().signOut();}catch(e){}return;}
    switchOwner(uid);DS.uid=uid;DS.codeAcct=true;DS.aid=code;DS.myCode=code;DS.passHash=hashPass(pw);
    DS.name=data.name||DS.name||'المستخدم';DS.phone=data.phone||'';DS.business=data.business||'';DS.city=data.city||'';DS.email=data.email||'';DS.avColor=data.avColor||1;
    if(data.subscription)DS.subscription=data.subscription;
    if(inp)inp.value='';loginSuccess();return;
  }
  let saved=null;try{saved=JSON.parse(localStorage.getItem('hbt_v21')||'null');}catch(e){}
  if(saved&&saved.uid===uid&&saved.passHash===hashPass(pw)&&(!navigator.onLine||!FB_READY)){Object.assign(DS,saved);if(inp)inp.value='';loginSuccess();return;}
  if(!navigator.onLine)toast('🔌 مفيش اتصال — الكود ده مش محفوظ على الجهاز');else registerPwFail();
  if(inp)inp.value='';
}
function showCodeCard(code,done){
  const ov=trashOverlay('<div style="font-weight:800;font-size:16px;text-align:center;margin-bottom:.4rem">🔑 كود دخولك</div><div class="_code" dir="ltr" style="font-size:38px;font-weight:800;letter-spacing:.35em;text-align:center;color:var(--pr);margin:.6rem 0;user-select:all"></div><div style="font-size:12px;line-height:1.9;color:var(--tx2);text-align:center">ده الكود الوحيد اللي بتفتح بيه التطبيق من أي جهاز. <b>احفظه دلوقتي</b> (سكرين شوت أو ورقة)، ولو ضاع مش هنقدر نرجّعه.</div><div style="display:flex;gap:.6rem;margin-top:.9rem"><button type="button" class="btn btn-s _cp" style="flex:1">📋 نسخ</button><button type="button" class="btn btn-p _ok" style="flex:1">حفظته ✓</button></div>');
  ov.querySelector('._code').textContent=code;
  ov.querySelector('._cp').onclick=()=>{try{navigator.clipboard.writeText(code);toast('تم نسخ الكود');}catch(e){toast('اكتب الكود بإيدك');}};
  ov.querySelector('._ok').onclick=()=>{ov.remove();if(done)done();};
}
function showMyCode(){
  if(!DS.myCode){toast('حسابك بيدخل بالرقم وكلمة المرور (مفيش كود)');return;}
  const ov=trashOverlay('<div style="font-weight:800;font-size:15px;text-align:center;margin-bottom:.4rem">🔑 كود دخولك</div><div class="_code" dir="ltr" style="font-size:34px;font-weight:800;letter-spacing:.35em;text-align:center;color:var(--pr);margin:.6rem 0"></div><div style="font-size:11.5px;line-height:1.8;color:var(--tx2);text-align:center">اكتب الكود ده في شاشة الدخول لفتح حسابك من أي جهاز. متشاركوش مع حد.</div><div style="display:flex;gap:.6rem;margin-top:.9rem"><button type="button" class="btn btn-s _cp" style="flex:1">📋 نسخ</button><button type="button" class="btn btn-p _ok" style="flex:1">إغلاق</button></div>');
  ov.querySelector('._code').textContent=DS.myCode;
  ov.querySelector('._cp').onclick=()=>{try{navigator.clipboard.writeText(DS.myCode);toast('تم نسخ الكود');}catch(e){}};
  ov.querySelector('._ok').onclick=()=>ov.remove();
}
// ── خيارات الإعدادات: ترقية الحساب لكود + قفل التطبيق بنفس الكود ──
function updSecurityRows(){
  const g=id=>document.getElementById(id);
  const up=g('SR-UPGRADE'),mc=g('SR-MYCODE'),hn=g('SR-HINT'),ch=g('SR-CHPIN'),st=g('PIN-STATUS'),tg=g('TG-PIN');
  if(up)up.style.display=DS.codeAcct?'none':'';if(mc)mc.style.display=(DS.codeAcct&&DS.myCode)?'':'none';if(hn)hn.style.display=DS.codeAcct?'none':'';
  const on=!!DS.pinEnabled;if(ch)ch.style.display=on?'':'none';if(tg)tg.classList.toggle('on',on);
  if(st)st.textContent=on?'مفعّل ✅ — بيتطلب كل ما تفتح التطبيق':'غير مفعّل';
}
let _lgTaps=0,_lgTimer=null;
function secretLegacyTap(){
  _lgTaps++;clearTimeout(_lgTimer);_lgTimer=setTimeout(()=>{_lgTaps=0;},2000);
  if(_lgTaps>=5){_lgTaps=0;showLegacyLogin(true);toast('دخول الحسابات القديمة');}
}
async function upgradeToCode(){
  if(DS.codeAcct){toast('حسابك بيدخل بالكود بالفعل');return;}
  if(!(FB_READY&&navigator.onLine&&window.firebase&&firebase.auth)){toast('🔌 الترقية محتاجة اتصال بالإنترنت');return;}
  if(window._upgrading)return;
  const go=await new Promise(res=>{
    const ov=trashOverlay('<div style="font-weight:800;font-size:15px;margin-bottom:.5rem">⬆️ ترقية حسابك لكود 6 أرقام</div><div style="font-size:12.5px;line-height:1.9;color:var(--tx2)">هننقل <b>كل بياناتك</b> لحساب جديد بيدخل بكود من 6 أرقام. الحساب القديم (رقم + كلمة مرور) بيفضل محفوظ كنسخة احتياطية لكن مش هتدخل بيه تاني. هيظهر لك الكود مرة واحدة، <b>احفظه</b>.</div><div style="display:flex;gap:.6rem;margin-top:.9rem"><button type="button" class="btn btn-p _ok" style="flex:1">ترقية الآن</button><button type="button" class="btn btn-s _no" style="flex:1">لاحقًا</button></div>');
    ov.querySelector('._ok').onclick=()=>{ov.remove();res(true);};ov.querySelector('._no').onclick=()=>{ov.remove();res(false);};
  });
  if(!go)return;
  window._upgrading=true;let created=false;
  try{
    toast('⏳ جاري نقل حسابك...');
    if(DS.uid){for(const x of SYNC_COLLS)await withTO(mergeCollection(x[0]),30000);}
    let code=null;
    for(let i=0;i<10&&!code;i++){
      const c=newAccountCode();
      try{await withTO(firebase.auth().createUserWithEmailAndPassword(authEmail(c),codePass(c)),12000);code=c;created=true;}
      catch(e){if(e&&e.code==='auth/email-already-in-use')continue;throw e;}
    }
    if(!code)throw new Error('code');
    const uid='user_'+code,hashed=hashPass(codePass(code));
    await withTO(db.collection('users').doc(uid).set({name:DS.name||'المستخدم',phone:DS.phone||'',business:DS.business||'',city:DS.city||'',email:DS.email||'',avColor:DS.avColor||1,codeAcct:true,authMigrated:true,passHash:hashed,subscription:DS.subscription||{type:'unlimited',expiry:null},migratedFrom:DS.uid||'',created:new Date().toISOString(),version:APP_VERSION}),12000);
    DS.uid=uid;DS._owner=uid;DS._tomb={};DS.codeAcct=true;DS.aid=code;DS.myCode=code;DS.passHash=hashed;DS.authMigrated=true;sv();svFlush();
    window._syncBusy=false;
    for(const x of SYNC_COLLS){try{await withTO(mergeCollection(x[0]),30000);}catch(e){}}
    updSecurityRows();try{rAll();}catch(e){}
    showCodeCard(code,()=>toast('🎉 اتنقل حسابك — ادخل بالكود من دلوقتي'));
  }catch(e){
    if(created){try{await firebase.auth().currentUser.delete();}catch(x){}}
    toast('❌ تعذّرت الترقية — بياناتك زي ما هي، جرّب تاني');
  }finally{window._upgrading=false;}
}
function goDaily(seg){goTab('daily');try{setDailySeg(seg);}catch(e){}}
// ── سياسة القفل: 3 محاولات غلط ← استنى 5 دقايق ← محاولتين غلط كمان ← قفل نهائي لحد ما الأدمن يفكه ──
const LOCK_WARN_AT=3,LOCK_HARD_AFTER=2;let _pinLockT=null;
function deviceId(){let d=null;try{d=localStorage.getItem('qistas_dev');}catch(e){}if(!d){const a=new Uint8Array(12);window.crypto.getRandomValues(a);d=Array.from(a).map(x=>x.toString(16).padStart(2,'0')).join('');try{localStorage.setItem('qistas_dev',d);}catch(e){}}return d;}
function lockFail(){
  DS.pwFailCount=(DS.pwFailCount||0)+1;const stage=DS.pwLockStage||0;
  if(stage===0&&DS.pwFailCount>=LOCK_WARN_AT){DS.pwLockStage=1;DS.pwFailCount=0;DS.pwLockUntil=Date.now()+PW_LOCK_MINUTES[1]*60000;sv();return{state:'timed'};}
  if(stage>=1&&DS.pwFailCount>=LOCK_HARD_AFTER){DS.appLocked=true;DS.hardLock=true;DS.lockedAt=Date.now();DS.pwLockStage=2;DS.lockTicketAt=0;sv();svFlush();return{state:'hard'};}
  sv();return{state:'warn',left:(stage===0?LOCK_WARN_AT:LOCK_HARD_AFTER)-DS.pwFailCount};
}
function lockOutcomeUI(r,what){
  if(r.state==='hard'){showScr('SCR-app-locked');renderLockCountdown();return;}
  if(r.state==='timed'){toast('⛔ 3 محاولات غلط — استنى '+PW_LOCK_MINUTES[1]+' دقايق');renderPwLockUI();return;}
  toast('❌ '+what+' — باقي '+r.left+' محاولة'+((DS.pwLockStage||0)>=1?' قبل القفل النهائي':''));
}
function pinLockTick(){
  const sub=document.getElementById('LOCK-SUB');if(!sub)return;clearInterval(_pinLockT);
  const t=()=>{const r=getPwLockRemaining();if(r<=0){clearInterval(_pinLockT);sub.textContent='أدخل رقمك السري للمتابعة';return;}sub.textContent='⛔ استنى '+fmtRemain(r);};
  t();_pinLockT=setInterval(t,1000);
}
function updTicketBtn(){const b=document.getElementById('LOCK-TICKET-BTN');if(!b)return;const sent=DS.lockTicketAt&&Date.now()-DS.lockTicketAt<10*60000;b.textContent=sent?'✓ التذكرة اتبعتت — استنى رد الأدمن':'📨 إرسال تذكرة للأدمن';b.style.opacity=sent?'.7':'1';}
async function sendLockTicket(){
  if(DS.lockTicketAt&&Date.now()-DS.lockTicketAt<10*60000){toast('ℹ️ التذكرة اتبعتت — استنى رد الأدمن');return;}
  if(!(FB_READY&&navigator.onLine)){toast('🔌 محتاج اتصال بالإنترنت لإرسال التذكرة');return;}
  const t={uid:DS.uid||DS.lastTryUid||null,deviceId:deviceId(),name:DS.name||'',phone:DS.phone||'',whatsapp:DS.helpWa||'',type:'lock',message:'الجهاز اتقفل بعد محاولات دخول خاطئة. محتاج تصفير المحاولات أو رقم سري جديد.',status:'open',replies:[],created:new Date().toISOString(),version:APP_VERSION};
  try{await withTO(db.collection('support_tickets').add(t),12000);DS.lockTicketAt=Date.now();sv();updTicketBtn();toast('✅ اتبعتت التذكرة للأدمن');}
  catch(e){toast('❌ تعذّر الإرسال — جرّب تاني');}
}
// ── الرقم السري (6 أرقام): إجباري عند أول دخول، وتغييره من الإعدادات ──
function weakSecret(s){return /^(\d)\1{5}$/.test(s)||'0123456789'.indexOf(s)>-1||'9876543210'.indexOf(s)>-1||/^(\d{3})\1$/.test(s)||/^(\d{2})\1\1$/.test(s);}
function promptSetSecret(force,opts){
  if(window._secretOpen)return;window._secretOpen=true;opts=opts||{};
  const title=opts.title||(DS.mustChangeSecret?'🔑 اعمل رقم سري جديد':'🔐 اعمل رقم سري لحسابك');
  const ov=trashOverlay('<div style="font-weight:800;font-size:15px;margin-bottom:.4rem">'+title+'</div><div style="font-size:12px;color:var(--tx2);line-height:1.8;margin-bottom:.7rem">'+(force?'لازم تعمل رقم سري من 6 أرقام عشان تأمّن حسابك. هتدخله كل ما تفتح التطبيق.':'اختار رقم سري من 6 أرقام.')+'</div>'
    +(opts.current?'<div class="gm-f"><label>الرقم السري الحالي</label><input class="inp _c" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></div>':'')
    +'<div class="gm-f"><label>الرقم السري الجديد (6 أرقام)</label><input class="inp _a" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div><div class="gm-f"><label>أعد كتابته</label><input class="inp _b" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div><div class="_err" style="color:var(--ng);font-size:12px;min-height:1.2em;margin:.2rem 0"></div><div style="display:flex;gap:.6rem"><button type="button" class="btn btn-p _ok" style="flex:1">حفظ</button>'+(force?'':'<button type="button" class="btn btn-s _no" style="flex:1">إلغاء</button>')+'</div>');
  const $=s=>ov.querySelector(s),err=m=>{$('._err').textContent=m;},close=()=>{ov.remove();window._secretOpen=false;};
  if($('._no'))$('._no').onclick=close;
  $('._ok').onclick=()=>{
    if(opts.current){
      if(getPwLockRemaining()>0){err('⛔ استنى '+fmtRemain(getPwLockRemaining()));return;}
      if(!pinMatches($('._c').value)){const r=lockFail();if(r.state==='hard'){close();showScr('SCR-app-locked');renderLockCountdown();return;}err(r.state==='timed'?'⛔ 3 محاولات غلط — استنى 5 دقايق':'❌ الرقم الحالي غلط — باقي '+r.left+' محاولة');return;}
      resetPwFail();
    }
    const a=$('._a').value,b=$('._b').value;
    if(!/^\d{6}$/.test(a)){err('❌ الرقم السري لازم 6 أرقام');return;}
    if(weakSecret(a)){err('❌ رقم سهل التخمين (متكرر أو متسلسل) — اختار رقم تاني');return;}
    if(a!==b){err('❌ الرقمين مش متطابقين');return;}
    DS.pinCode=pinStore(a);_pinCode=DS.pinCode;DS.pinEnabled=true;_pinEnabled=true;DS.pinLen=6;DS.mustChangeSecret=false;DS.pinOptOut=false;sv();close();updSecurityRows();toast('✅ اتفعّل الرقم السري');
  };
  setTimeout(()=>{const f=$('._c')||$('._a');if(f)f.focus();},100);
}
function ensureSecret(){if(window._secretOpen||!DS.loggedIn||!DS.uid)return;if(DS.mustChangeSecret||(!DS.pinEnabled&&!DS.pinOptOut))promptSetSecret(true);}
function changeSecret(){if(!DS.pinEnabled){promptSetSecret(false);return;}promptSetSecret(false,{current:true,title:'🔑 تغيير الرقم السري'});}
document.addEventListener('focusin',e=>{const t=e.target;if(t&&t.matches&&t.matches('#SCR-auth input,#SCR-force-pass input'))setTimeout(()=>{try{t.scrollIntoView({block:'center',behavior:'smooth'});}catch(x){}},300);});

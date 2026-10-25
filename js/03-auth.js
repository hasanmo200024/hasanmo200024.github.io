// ═══ 03-auth — الدخول والحساب: الشاشات، تسجيل الدخول، قفل المحاولات، البروفايل، دخول الأدمن السري، تحميل لوحة الأدمن، التحديثات ═══
// ══ SCREENS ══
function showScr(id){
  ['SCR-auth','SCR-main','SCR-det','SCR-admin','SCR-admin-login','SCR-app-locked','SCR-force-pass'].forEach(s=>{
    const e=document.getElementById(s);if(e)e.classList.toggle('on',s===id);
  });
}

// ══ AUTH — Phone + Password ══
function hashPass(pass){
  // Simple hash for password storage
  let h=0;
  for(let i=0;i<pass.length;i++){h=((h<<5)-h)+pass.charCodeAt(i);h|=0;}
  return 'hp_'+Math.abs(h).toString(36)+'_'+pass.length;
}

function showLogin(){
  document.getElementById('stp-login').style.display='block';
  document.getElementById('stp-register').style.display='none';
}
function showRegister(){
  document.getElementById('stp-login').style.display='none';
  document.getElementById('stp-register').style.display='block';
}
function togglePass(id){
  const inp=document.getElementById(id);
  const eye=document.getElementById('PASS-EYE');
  if(inp.type==='password'){inp.type='text';if(eye)eye.textContent='🙈';}
  else{inp.type='password';if(eye)eye.textContent='👁';}
}

// ══ PASSWORD BRUTE-FORCE LOCKOUT ══
// 3 محاولات خطأ → قفل 5 دقائق → 3 خطأ تاني → 10 دقائق → 3 خطأ تاني → 15 دقيقة → خطأ تاني بعد كدا → قفل نهائي
const PW_LOCK_MINUTES = {1:5, 2:10, 3:15};

const APP_LOCK_MINUTES=60;
function clearAppLock(){DS.appLocked=false;DS.lockedAt=0;DS.pwFailCount=0;DS.pwLockStage=0;DS.pwLockUntil=0;sv();}
function isAppLocked(){
  if(!DS.appLocked)return false;
  // القفل الدائم القديم (من غير وقت) أو المنتهي → يتفك تلقائيًا
  if(!DS.lockedAt||Date.now()-DS.lockedAt>=APP_LOCK_MINUTES*60000){clearAppLock();return false;}
  return true;
}

function getPwLockRemaining(){
  if(!DS.pwLockUntil) return 0;
  const diff = DS.pwLockUntil - Date.now();
  return diff > 0 ? diff : 0;
}

function registerPwFail(){
  if(isAppLocked()) return;
  try{const n=document.getElementById('PH-NUM'),c=document.getElementById('PH-CC');if(n&&c&&n.value){DS.lastTryUid='user_'+(c.value.trim()+n.value.trim()).replace(/\D/g,'');}}catch(e){}
  try{if(FB_READY&&DS.lastTryUid&&navigator.onLine)db.collection('users').doc(DS.lastTryUid).update({failedLogins:firebase.firestore.FieldValue.increment(1),lastFailedLogin:new Date().toISOString()}).catch(()=>{});}catch(e){}
  DS.pwFailCount = (DS.pwFailCount||0) + 1;
  if(DS.pwFailCount >= 3){
    const nextStage = (DS.pwLockStage||0) + 1;
    if(nextStage >= 4){
      // قفل نهائي بعد استنفاد كل المهل
      DS.appLocked = true;DS.lockedAt = Date.now();
      sv();
      showScr('SCR-app-locked');renderLockCountdown();
      return;
    }
    DS.pwLockStage = nextStage;
    DS.pwLockUntil = Date.now() + PW_LOCK_MINUTES[nextStage]*60000;
    DS.pwFailCount = 0;
    sv();
    toast('⛔ محاولات كتير خاطئة — انتظر '+PW_LOCK_MINUTES[nextStage]+' دقيقة');
    renderPwLockUI();
    return;
  }
  sv();
  toast('❌ كلمة المرور خاطئة ('+DS.pwFailCount+'/3)');
}

function resetPwFail(){
  DS.pwFailCount = 0;
  DS.pwLockUntil = 0;
  DS.pwLockStage = 0;
  sv();
}

let _lockTimer=null;
function renderLockCountdown(){
  clearInterval(_lockTimer);
  const el=document.getElementById('LOCK-COUNTDOWN');if(!el)return;
  const tick=()=>{
    const rem=(DS.lockedAt||0)+APP_LOCK_MINUTES*60000-Date.now();
    if(rem<=0){clearInterval(_lockTimer);clearAppLock();showScr('SCR-auth');toast('✅ انتهى القفل — تقدر تجرّب تدخل');return;}
    el.textContent=fmtRemain(rem);
  };
  tick();_lockTimer=setInterval(tick,1000);
}
function recheckAppLock(silent){
  if(!isAppLocked()){clearInterval(_lockTimer);showScr('SCR-auth');if(!silent)toast('✅ القفل اتفك');return;}
  if(!FB_READY||!DS.lastTryUid){if(!silent)toast('ℹ️ القفل لسه شغال — اضغط «أريد مساعدة»');return;}
  db.collection('users').doc(DS.lastTryUid).get().then(doc=>{
    const r=doc.exists&&doc.data().lockResetAt?new Date(doc.data().lockResetAt).getTime():0;
    if(r&&r>(DS.lockedAt||0)){clearInterval(_lockTimer);clearAppLock();showScr('SCR-auth');toast('✅ تم فك القفل من الإدارة');}
    else if(!silent)toast('ℹ️ القفل لسه شغال');
  }).catch(()=>{if(!silent)toast('❌ تعذر التحقق الآن');});
}
function adminFromLock(){
  const p=document.getElementById('ADMIN-PHONE'),w=document.getElementById('ADMIN-PASS');
  if(p)p.value='';if(w)w.value='';
  showScr('SCR-admin-login');
}
function unlockUserLogin(id){
  if(!FB_READY)return;
  db.collection('users').doc(id).set({lockResetAt:new Date().toISOString()},{merge:true})
    .then(()=>toast('🔓 تم فك قفل الدخول لهذا المستخدم'))
    .catch(()=>toast('❌ فشل التنفيذ'));
}
function fmtRemain(ms){
  const totalSec = Math.ceil(ms/1000);
  const m = Math.floor(totalSec/60);
  const s = totalSec%60;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

function renderPwLockUI(){
  if(_pwLockTimer){ clearInterval(_pwLockTimer); _pwLockTimer=null; }
  const msg = document.getElementById('PW-LOCK-MSG');
  const btn = document.getElementById('LOGIN-BTN');
  if(!msg || !btn) return;
  const tick = ()=>{
    const remain = getPwLockRemaining();
    if(remain <= 0){
      msg.style.display='none';
      btn.disabled=false; btn.style.opacity='1';
      if(_pwLockTimer){ clearInterval(_pwLockTimer); _pwLockTimer=null; }
      return;
    }
    msg.style.display='block';
    msg.textContent='⏳ محاولات كتير خاطئة — حاول تاني بعد '+fmtRemain(remain);
    btn.disabled=true; btn.style.opacity='.55';
  };
  tick();
  if(getPwLockRemaining()>0){ _pwLockTimer = setInterval(tick, 1000); }
}


function doLogin(){
  if(isAppLocked()){ showScr('SCR-app-locked');renderLockCountdown(); return; }
  if(getPwLockRemaining()>0){ renderPwLockUI(); return; }
  const cc=document.getElementById('PH-CC').value.trim();
  const num=document.getElementById('PH-NUM').value.trim();
  const pass=document.getElementById('LOGIN-PASS').value;
  if(num.length<10){toast('❌ أدخل رقم هاتف صحيح');return;}
  if(!pass){toast('❌ أدخل كلمة المرور');return;}
  const phone=cc+num;
  const uid='user_'+phone.replace(/\D/g,'');
  if(FB_READY)doLoginCloud(uid,phone,pass);else localLogin(uid,phone,pass);
}
async function doLoginCloud(uid,phone,pass){
  let signed=false;
  try{if(window.firebase&&firebase.auth){await withTO(firebase.auth().signInWithEmailAndPassword(authEmail(phone),pass),12000);signed=true;}}catch(e){signed=false;}
  let doc;
  try{doc=await withTO(db.collection('users').doc(uid).get(),12000);}
  catch(e){
    if(e&&e.code==='permission-denied'){await showHintFor(uid);registerPwFail();toast('❌ كلمة المرور غير صحيحة');return;}
    localLogin(uid,phone,pass);return;
  }
  try{
    if(!doc.exists){toast('❌ الرقم غير مسجل — أنشئ حساباً جديداً');return;}
    const data=doc.data();
    if(data.blocked===true){toast('🚫 هذا الحساب محظور — تواصل مع الدعم');return;}
    const hashed=hashPass(pass);
    const trusted=signed&&data.authMigrated===true;
    if(!trusted&&data.passHash!==hashed){await showHintFor(uid,data);registerPwFail();return;}
    DS.uid=uid;DS.phone=phone;DS.name=data.name||'المستخدم';
    DS.business=data.business||'';DS.city=data.city||'';
    DS.email=data.email||'';DS.avColor=data.avColor||1;
    if(data.subscription)DS.subscription=data.subscription;
    DS.passHash=hashed;
    if(signed){DS.authOk=true;if(data.authMigrated!==true){db.collection('users').doc(uid).set({authMigrated:true},{merge:true}).catch(()=>{});authUpdatePassword(pass);}}
    else await authAfterLogin(uid,phone,pass,data);
    if(data.mustChangePassword){
      sv();
      document.getElementById('FP-PASS').value='';
      document.getElementById('FP-PASS2').value='';
      showScr('SCR-force-pass');
      return;
    }
    loginSuccess();
  }catch(e){localLogin(uid,phone,pass);}
}

function submitForcePasswordChange(){
  const p1=document.getElementById('FP-PASS').value;
  const p2=document.getElementById('FP-PASS2').value;
  if(p1.length<8){toast('❌ كلمة المرور قصيرة — 8 أحرف على الأقل');return;}
  if(p1!==p2){toast('❌ كلمة المرور غير متطابقة');return;}
  const newHash=hashPass(p1);
  DS.passHash=newHash;authUpdatePassword(p1);
  if(FB_READY&&DS.uid){
    db.collection('users').doc(DS.uid).set({passHash:newHash,mustChangePassword:false},{merge:true})
      .then(()=>{toast('✅ تم تحديث كلمة المرور');loginSuccess();})
      .catch(()=>{toast('✅ تم تحديث كلمة المرور محليًا');loginSuccess();});
  } else {
    loginSuccess();
  }
}
function localLogin(uid,phone,pass){
  svFlush();const saved=localStorage.getItem('hbt_v21');
  if(saved){
    const d=JSON.parse(saved);
    if(d.uid===uid&&d.passHash===hashPass(pass)){
      Object.assign(DS,d);loginSuccess();
    } else {
      registerPwFail();
    }
  } else {
    toast('❌ الرقم غير مسجل — أنشئ حساباً جديداً');
  }
}

function doRegister(){
  const name=document.getElementById('REG-NAME').value.trim();
  const cc=document.getElementById('REG-CC').value.trim();
  const num=document.getElementById('REG-NUM').value.trim();
  const pass=document.getElementById('REG-PASS').value;
  const pass2=document.getElementById('REG-PASS2').value;
  const business=document.getElementById('REG-BUSINESS').value.trim();
  if(!name){toast('❌ أدخل اسمك');return;}
  if(num.length<10){toast('❌ أدخل رقم هاتف صحيح');return;}
  if(pass.length<8){toast('❌ كلمة المرور قصيرة — 8 أحرف على الأقل');return;}
  if(pass!==pass2){toast('❌ كلمة المرور غير متطابقة');return;}
  const hintQ=((document.getElementById('REG-HINTQ')||{}).value||'').trim().slice(0,60),hint=((document.getElementById('REG-HINT')||{}).value||'').trim().slice(0,80);
  if(!!hintQ!==!!hint){toast('❌ اكتب السؤال وإجابته مع بعض، أو سيبهم فاضيين');return;}
  if(hint&&(hint.toLowerCase().indexOf(pass.toLowerCase())>-1||hintQ.toLowerCase().indexOf(pass.toLowerCase())>-1)){toast('❌ السؤال والإجابة لازم ميحتويوش كلمة المرور نفسها');return;}
  const phone=cc+num;
  const uid='user_'+phone.replace(/\D/g,'');
  const hashed=hashPass(pass);
  // Check if user exists
  if(FB_READY){
    db.collection('users').doc(uid).get().then(doc=>{
      if(doc.exists){toast('❌ هذا الرقم مسجل بالفعل — سجّل الدخول');showLogin();return;}
      // Create new user
      const userData={name,phone,business,passHash:hashed,...(hint?{hintQ,hint}:{}),
        subscription:{type:'unlimited',expiry:null},
        created:new Date().toISOString(),version:APP_VERSION};
      db.collection('users').doc(uid).set(userData).then(async()=>{
        await authAfterLogin(uid,phone,pass,{});
        if(hint)db.collection('hints').doc(uid).set({hintQ,hint}).catch(()=>{});
        DS.uid=uid;DS.phone=phone;DS.name=name;DS.business=business;
        DS.passHash=hashed;DS.subscription=userData.subscription;
        toast('🎉 تم إنشاء الحساب بنجاح!');
        loginSuccess();
      });
    }).catch(e=>{
      // Local register
      DS.uid=uid;DS.phone=phone;DS.name=name;DS.business=business;DS.passHash=hashed;
      DS.subscription={type:'unlimited',expiry:null};
      loginSuccess();
    });
  } else {
    DS.uid=uid;DS.phone=phone;DS.name=name;DS.business=business;DS.passHash=hashed;
    DS.subscription={type:'unlimited',expiry:null};
    loginSuccess();
  }
}

function loginSuccess(){
  trackLogin();
  const isNew=!ld();if(isNew)DS.contacts=[];
  _lockContext='session';
  resetPwFail();
  DS.quickFailCount=0;
  // Use phone number as stable UID for sync
  if(!DS.uid&&DS.phone)DS.uid='user_'+DS.phone.replace(/\D/g,'');
  if(!DS.name)DS.name='المستخدم';
  DS.loggedIn=true;sv();
  applyDark();rNotes();rExpenses();rTasks();rOccasions();rArticles();rSavings();rVaults();applyVaultVisibility();checkOccasionReminders();updateNotifBadge();updateConnectionStatus();showScr('SCR-main');
  rAll();updProf();updSubStatus();updSubBar();
  checkForUpdates();
  if(FB_READY)syncFromCloud();
  toast('🎉 أهلاً وسهلاً!');
  resetAutoLogout();
  updateActivity();
  // Check if admin
  checkIfAdmin();
  // Save user to Firebase
  if(FB_READY&&DS.uid){
    db.collection('users').doc(DS.uid).set({
      name:DS.name,phone:DS.phone,
      subscription:DS.subscription,
      lastLogin:new Date().toISOString(),
      version:APP_VERSION
    },{merge:true}).catch(e=>{});
  }
}

function checkIfAdmin(){
  window.__adminOK=false;DS.isAdmin=false;
  
  (async()=>{
    try{
      if(!(FB_READY&&window.firebase&&firebase.auth))return;
      const u=firebase.auth().currentUser;if(!u||!u.email)return;
      const ad=await withTO(db.collection('admins').doc(u.email).get(),8000);
      if(ad.exists){window.__adminOK=true;DS.isAdmin=true;}
    }catch(e){}
  })();
}


function goBackFromAdmin(){
  showScr('SCR-main');
  goTab('settings');
}

function openAdminPanel(){ if(!window.__adminOK){toast('🔒 غير مصرح');return;} showScr('SCR-admin'); loadAdminData(); }

function doOut(){window.__adminOK=false;try{if(window.firebase&&firebase.auth)firebase.auth().signOut();}catch(e){}
  DS.loggedIn=false;sv();
  if(_autoLogoutTimer)clearTimeout(_autoLogoutTimer);
  showScr('SCR-auth');
  updateAuthQuickAccess();
  toast('👋 تم تسجيل الخروج');}

// ══ PROFILE ══
function updProf(){
  const nm=DS.name||'المستخدم';
  const ini=nm.trim().split(' ').map(w=>w[0]).slice(0,2).join('');
  const clr=AV_COLORS[DS.avColor||1];
  ['PAV','PROF-AV-TXT'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=ini;});
  ['PNM','PROF-HERO-NAME'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=nm;});
  ['PPH','PROF-HERO-PHONE'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=DS.phone||'';});
  const pa=document.getElementById('PAV');
  if(pa){pa.style.background=clr.bg;pa.style.color=clr.cl;}
  const pab=document.getElementById('PROF-AV-BIG');
  if(pab){pab.style.background=clr.bg;pab.style.color=clr.cl;}
  const pn=document.getElementById('PROF-NAME');if(pn)pn.value=DS.name||'';
  const pb=document.getElementById('PROF-BUSINESS');if(pb)pb.value=DS.business||'';
  const pc=document.getElementById('PROF-CITY');if(pc)pc.value=DS.city||'';
  const pe=document.getElementById('PROF-EMAIL');if(pe)pe.value=DS.email||'';
  const pnt=document.getElementById('PROF-NOTE');if(pnt)pnt.value=DS.note||'';
  selAvColor(DS.avColor||1,true);
}

function saveProfile(){
  DS.name=document.getElementById('PROF-NAME').value.trim()||DS.name;
  DS.business=document.getElementById('PROF-BUSINESS').value.trim();
  DS.city=document.getElementById('PROF-CITY').value.trim();
  DS.email=document.getElementById('PROF-EMAIL').value.trim();
  DS.note=document.getElementById('PROF-NOTE').value.trim();
  sv();updProf();
  if(FB_READY&&DS.uid){
    db.collection('users').doc(DS.uid).set({
      name:DS.name,business:DS.business,city:DS.city,email:DS.email,avColor:DS.avColor
    },{merge:true}).catch(e=>{});
  }
  toast('✅ تم حفظ البيانات');
  goTab('settings');
}

function selAvColor(n,silent=false){
  DS.avColor=n;
  for(let i=1;i<=6;i++){const e=document.getElementById('avc'+i);if(e)e.style.border=i===n?'2px solid var(--pr)':'2px solid transparent';}
  if(!silent){const clr=AV_COLORS[n];const pab=document.getElementById('PROF-AV-BIG');if(pab){pab.style.background=clr.bg;pab.style.color=clr.cl;}}
}

// ══ SUBSCRIPTION ══



// ══ SECRET ADMIN ACCESS (tap logo 5x) ══
let _tapCount=0,_tapTimer=null;
function secretAdminTap(){
  _tapCount++;
  clearTimeout(_tapTimer);
  _tapTimer=setTimeout(()=>{_tapCount=0;},2000);
  if(_tapCount>=10){
    _tapCount=0;
    document.getElementById('ADMIN-PHONE').value='';
    document.getElementById('ADMIN-PASS').value='';
    showScr('SCR-admin-login');
  }
}

// ══ ADMIN ══




let _adminUsers=[];

let _pkg='trial';


// ══ USER DETAIL (Admin) ══
let _udPkg='trial';
let _lastNewPass='';


// ══ تحميل لوحة الأدمن عند الحاجة ══
let _admP=null;
function loadAdminJs(){if(window.__adm)return Promise.resolve();return _admP||(_admP=new Promise((ok,no)=>{const s=document.createElement('script');s.src='admin.js?v='+APP_VERSION;s.onload=()=>{window.__adm=1;ok();};s.onerror=()=>{_admP=null;no(new Error('admin'));};document.head.appendChild(s);}));}
function _admStub(n){return function(...a){if(n!=='adminLogin'&&!window.__adminOK){toast('🔒 غير مصرح');return Promise.resolve();}return loadAdminJs().then(()=>{const f=window[n];if(f&&!f.__stub)return f(...a);}).catch(()=>toast('❌ تعذر تحميل لوحة الأدمن — تأكد من الاتصال'));};}
function adminLogin(...a){return _admStub("adminLogin")(...a);} adminLogin.__stub=true;
function loadAdminData(...a){return _admStub("loadAdminData")(...a);} loadAdminData.__stub=true;
function selPkg(...a){return _admStub("selPkg")(...a);} selPkg.__stub=true;
function genCode(...a){return _admStub("genCode")(...a);} genCode.__stub=true;
function copyCode(...a){return _admStub("copyCode")(...a);} copyCode.__stub=true;
function copyNewPass(...a){return _admStub("copyNewPass")(...a);} copyNewPass.__stub=true;
// ══ UPDATES ══
function sendUpdate(){
  const title=document.getElementById('UPD-TITLE').value.trim();
  const msg=document.getElementById('UPD-MSG').value.trim();
  const url=document.getElementById('UPD-URL').value.trim();
  if(!title||!msg){toast('❌ أدخل العنوان والرسالة');return;}
  if(FB_READY){
    db.collection('updates').add({title,msg,url,version:((document.getElementById('VER-NUM')||{}).value||'').trim()||APP_VERSION,date:new Date().toISOString()})
    .then(()=>{toast('📢 تم الإرسال للجميع ✅');document.getElementById('UPD-TITLE').value='';document.getElementById('UPD-MSG').value='';document.getElementById('UPD-URL').value='';const _v=document.getElementById('VER-NUM');if(_v)_v.value='';})
    .catch(e=>toast('❌ خطأ في الإرسال'));
  } else toast('📢 تم الإرسال (وضع تجريبي)');
}

function loadUpdatesLog(){
  const el=document.getElementById('UPDATES-LOG');
  if(!el)return;
  if(!FB_READY){
    el.innerHTML=renderUpdateItems([
      {id:'1',title:'إطلاق التطبيق v1.0',msg:'أول إصدار من تطبيق قسطاس مع نظام الديون والمزامنة السحابية',version:'2.0',date:'2025-03-01T10:00:00',url:''},
      {id:'2',title:'تحديث v2.1 — لوحة الأدمن',msg:'إضافة لوحة تحكم كاملة مع كودات التفعيل والإشعارات وسجل التحديثات',version:'2.1',date:'2025-03-15T14:30:00',url:''}
    ]);
    return;
  }
  db.collection('updates').orderBy('date','desc').limit(50).get()
  .then(snap=>{
    if(snap.empty){
      el.innerHTML='<div style="text-align:center;padding:1rem;color:var(--mu);font-size:12px">لا توجد تحديثات بعد</div>';
      return;
    }
    const updates=[];
    snap.forEach(d=>updates.push({id:d.id,...d.data()}));
    el.innerHTML=renderUpdateItems(updates);
  }).catch(e=>{
    el.innerHTML='<div style="color:var(--ng);font-size:11px;padding:.5rem">لا يوجد اتصال</div>';
  });
}

function renderUpdateItems(updates){
  const DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return updates.map((u,i)=>{
    const d=new Date(u.date);
    const day=DAYS[d.getDay()];
    const month=MONTHS[d.getMonth()];
    const dateStr=day+'، '+d.getDate()+' '+month+' '+d.getFullYear();
    const timeStr=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
    const badge=i===0?'🆕 أحدث':'📌';
    const ver=u.version?'v'+u.version:'';
    const link=u.url?'<a href="'+u.url+'" target="_blank" style="color:var(--pr);font-size:10px;text-decoration:none">🔗 رابط</a>':'';
    return '<div class="upd-log-item">'
      +'<div class="upd-log-title">'+badge+' '+(u.title||'تحديث')+(ver?'<span class="upd-log-badge">'+ver+'</span>':'')+'</div>'
      +'<div class="upd-log-msg">'+(u.msg||'—')+'</div>'
      +'<div class="upd-log-meta"><span>📅 '+dateStr+' — ⏰ '+timeStr+'</span>'+link+'</div>'
      +'</div>';
  }).join('');
}

function loadVersionInfo(){
  const l=document.getElementById('VER-LATEST');if(l)l.textContent='v'+APP_VERSION;
  if(!FB_READY)return;
  db.collection('config').doc('app').get().then(d=>{
    const c=d.exists?d.data():{};
    const p=document.getElementById('VER-PUB'),f=document.getElementById('VER-FORCED');
    if(p)p.textContent=c.version?'v'+c.version:'—';
    if(f)f.textContent=c.minVersion?'v'+c.minVersion:'لا يوجد';
  }).catch(()=>{});
}
function updateVersion(){
  if(!FB_READY){toast('❌ يحتاج اتصال');return;}
  db.collection('config').doc('app').set({version:APP_VERSION,updated:new Date().toISOString()},{merge:true})
    .then(()=>{toast('✅ تم نشر v'+APP_VERSION+' (اختياري)');loadVersionInfo();}).catch(()=>toast('❌ فشل الحفظ'));
}
function forceUpdateAll(){
  if(!FB_READY){toast('❌ يحتاج اتصال');return;}
  if(!confirm('هيتم إجبار كل المستخدمين اللي نسختهم أقل من v'+APP_VERSION+' على التحديث. اتأكدت إنك رفعت النسخة الجديدة؟'))return;
  db.collection('config').doc('app').set({version:APP_VERSION,minVersion:APP_VERSION,forcedAt:Date.now(),updated:new Date().toISOString()},{merge:true})
    .then(()=>{toast('⛔ تم فرض التحديث v'+APP_VERSION+' على الجميع');loadVersionInfo();}).catch(()=>toast('❌ فشل الحفظ'));
}
function clearForcedUpdate(){
  if(!FB_READY)return;
  db.collection('config').doc('app').set({minVersion:firebase.firestore.FieldValue.delete()},{merge:true})
    .then(()=>{toast('✅ تم إلغاء الإلزام');loadVersionInfo();}).catch(()=>toast('❌ فشل'));
}
function checkForUpdates(){
  if(!FB_READY)return;
  db.collection('updates').orderBy('date','desc').limit(1).get().then(snap=>{
    if(snap.empty)return;
    const id=snap.docs[0].id;const upd=snap.docs[0].data();
    if(id!==localStorage.getItem('last_upd')){
      if(id!==localStorage.getItem('last_upd_notified')){localStorage.setItem('last_upd_notified',id);notifyUser('📢 '+(upd.title||'تحديث جديد')+(upd.msg?' — '+upd.msg:''));}
      const b=document.getElementById('UPD-BANNER'),t=document.getElementById('UPD-TXT');
      if(b&&t){t.textContent=upd.title||'يوجد تحديث جديد!';b.classList.add('show');b.dataset.uid=id;b.dataset.url=upd.url||'';}
    }
  }).catch(e=>{});
  db.collection('config').doc('app').get().then(doc=>{
    if(doc.exists){enforceMinVersion(doc.data());}
  }).catch(e=>{});
}
function doUpdate(){
  const b=document.getElementById('UPD-BANNER');
  if(b){localStorage.setItem('last_upd',b.dataset.uid||'');const url=b.dataset.url;b.classList.remove('show');if(url)window.open(url,'_blank');else window.location.reload();}
}

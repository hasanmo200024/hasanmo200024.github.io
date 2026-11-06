// ═══ 10-session — التهيئة، الجلسة، القفل، PIN، البصمة، الدخول السريع ═══
// ══ INIT ══

// ══ SESSION & AUTO-LOGOUT ══
let _lastActivity = Date.now();
let _autoLogoutTimer = null;
let _sessionMinutes = 0; // 0 = disabled
let _pinCode = '';
let _pinInput = '';
let _pinEnabled = false;
let _bioEnabled = false;
let _lockContext = 'session'; // 'session' = قفل بعد خمول | 'authLogin' = دخول سريع من شاشة تسجيل الدخول
let _pwLockTimer = null;

function updateActivity(){
  _lastActivity = Date.now();
  if(DS.loggedIn) resetAutoLogout();
}

['click','touchstart','keydown','scroll'].forEach(e=>{
  document.addEventListener(e, updateActivity, {passive:true});
});

function saveSessionSettings(){
  const sel = document.getElementById('AUTO-LOGOUT-SEL');
  if(!sel) return;
  _sessionMinutes = parseInt(sel.value)||0;
  DS.sessionMinutes = _sessionMinutes;
  sv();
  resetAutoLogout();
  toast(_sessionMinutes > 0 ? `⏱ تسجيل خروج بعد ${_sessionMinutes} دقيقة` : '⏱ بدون تسجيل خروج تلقائي');
}

function resetAutoLogout(){
  if(_autoLogoutTimer) clearTimeout(_autoLogoutTimer);
  if(_sessionMinutes <= 0 || !DS.loggedIn) return;
  _autoLogoutTimer = setTimeout(()=>{
    if(DS.loggedIn){
      if(_pinEnabled || _bioEnabled){
        showLockScreen();
      } else {
        doOut();
        toast('⏱ تم تسجيل الخروج تلقائياً');
      }
    }
  }, _sessionMinutes * 60 * 1000);
}

// ══ قفل تلقائي بعد الخروج من التطبيق لأكتر من 10 ثواني ══
let _bgTime=null;
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){
    _bgTime=Date.now();
  } else if(document.visibilityState==='visible'){
    if(_bgTime && DS.loggedIn){
      const elapsed=Date.now()-_bgTime;
      if(elapsed>=10000){
        if(_pinEnabled || _bioEnabled){
          showLockScreen();
        } else {
          doOut();
          toast('🔒 خرجت من التطبيق أكتر من 10 ثواني — سجّل دخولك تاني');
        }
      } else if(FB_READY && DS.uid){
        syncFromCloud();
      }
    }
    _bgTime=null;
  }
});
setInterval(()=>{
  if(FB_READY && DS.uid && DS.loggedIn && document.visibilityState==='visible')syncFromCloud();
},120000);

// Update last activity display
setInterval(()=>{
  const el = document.getElementById('LAST-ACTIVITY');
  if(!el || !DS.loggedIn) return;
  const diff = Math.floor((Date.now() - _lastActivity) / 60000);
  el.textContent = diff <= 0 ? 'الآن' : `منذ ${diff} دقيقة`;
}, 30000);

// ══ LOCK SCREEN ══
function showLockScreen(){
  const lock = document.getElementById('LOCK-SCR');
  if(lock) lock.classList.add('show');
  _pinInput = '';
  updatePinDots();
  const txt = document.getElementById('LOCK-BACK-TXT');
  if(txt) txt.textContent = _lockContext==='authLogin' ? '← رجوع لتسجيل الدخول' : 'تسجيل الخروج';
  // Try biometric تلقائيًا فقط في حالة قفل الجلسة (auto-lock)
  if(_bioEnabled && _lockContext==='session') setTimeout(tryBiometric, 500);
}

function hideLockScreen(){
  const lock = document.getElementById('LOCK-SCR');
  if(lock) lock.classList.remove('show');
  resetAutoLogout();
  updateActivity();
}

function pinPress(val){
  if(val === 'bio'){ tryBiometric(); return; }
  if(val === 'del'){
    _pinInput = _pinInput.slice(0,-1);
    updatePinDots();
    return;
  }
  if(_pinInput.length >= 4) return;
  _pinInput += val;
  updatePinDots();
  if(_pinInput.length === 4){
    setTimeout(checkPin, 150);
  }
}

function updatePinDots(){
  for(let i=0; i<4; i++){
    const dot = document.getElementById('pd'+i);
    if(dot) dot.classList.toggle('filled', i < _pinInput.length);
  }
}

function checkPin(){
  if(pinMatches(_pinInput)){
    if(_lockContext==='authLogin'){
      quickUnlockSuccess();
    } else {
      hideLockScreen();
      toast('✅ تم فتح التطبيق');
    }
  } else {
    _pinInput = '';
    updatePinDots();
    if(_lockContext==='authLogin'){
      registerQuickFail();
      if((DS.quickFailCount||0) >= 3){ hideLockScreen(); return; }
    }
    const sub = document.getElementById('LOCK-SUB');
    if(sub){ sub.textContent='❌ رمز خاطئ، حاول مجدداً'; setTimeout(()=>{ if(sub) sub.textContent='أدخل رمز PIN للمتابعة'; },1500); }
  }
}

function lockScreenAction(){
  if(_lockContext==='authLogin'){
    // مجرد رجوع لشاشة تسجيل الدخول، مش تسجيل خروج فعلي
    hideLockScreen();
  } else {
    lockLogout();
  }
}

function lockLogout(){
  hideLockScreen();
  doOut();
}

// ══ PIN SETUP ══
function togglePIN(){
  const tog = document.getElementById('TG-PIN');
  const stat = document.getElementById('PIN-STATUS');
  if(_pinEnabled){
    _pinEnabled = false;
    _pinCode = '';
    DS.pinEnabled = false; DS.pinCode = '';
    if(tog) tog.classList.remove('on');
    if(stat) stat.textContent = 'غير مفعّل';
    sv(); toast('🔓 تم إلغاء رمز PIN');
  } else {
    setupPIN();
  }
}

async function setupPIN(){
  const pin = await askPin('أدخل رمز PIN المكون من 4 أرقام:');
  if(!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)){
    toast('❌ يجب أن يكون الرمز 4 أرقام');
    return;
  }
  const confirm = await askPin('أعد إدخال رمز PIN للتأكيد:');
  if(pin !== confirm){ toast('❌ الرمز غير متطابق'); return; }
  _pinCode = pinStore(pin); _pinEnabled = true; DS.pinEnabled = true; DS.pinCode = _pinCode;
  const tog = document.getElementById('TG-PIN');
  const stat = document.getElementById('PIN-STATUS');
  if(tog) tog.classList.add('on');
  if(stat) stat.textContent = 'مفعّل ✅';
  sv(); toast('✅ تم تفعيل رمز PIN');
}

// ══ BIOMETRIC ══
// ══ WebAuthn helpers ══
function bufToB64(buf){
  return btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
}
function b64ToBuf(b64){
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

async function toggleBiometric(){
  const tog = document.getElementById('TG-BIO');
  const stat = document.getElementById('BIO-STATUS');
  if(!window.PublicKeyCredential || !navigator.credentials){
    toast('❌ جهازك لا يدعم البصمة');
    return;
  }
  if(_bioEnabled){
    _bioEnabled = false;
    DS.bioEnabled = false;
    DS.bioCredId = null;
    if(tog) tog.classList.remove('on');
    if(stat) stat.textContent = 'غير مفعّل';
    sv(); toast('👆 تم إلغاء البصمة');
    return;
  }
  try{
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if(!available){ toast('❌ جهازك لا يدعم بصمة/Face ID'); return; }
    // تسجيل مفتاح حقيقي مربوط بالجهاز — هيطلب البصمة فعليًا هنا
    const cred = await navigator.credentials.create({
      publicKey:{
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp:{ name:'قسطاس' },
        user:{
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: DS.phone || 'user',
          displayName: DS.name || 'مستخدم'
        },
        pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
        authenticatorSelection:{ authenticatorAttachment:'platform', userVerification:'required' },
        timeout:60000
      }
    });
    if(!cred){ toast('❌ فشل تفعيل البصمة'); return; }
    DS.bioCredId = bufToB64(cred.rawId);
    _bioEnabled = true;
    DS.bioEnabled = true;
    if(tog) tog.classList.add('on');
    if(stat) stat.textContent = 'مفعّل ✅';
    const bioBtn = document.getElementById('BIO-BTN');
    if(bioBtn) bioBtn.style.display = 'block';
    sv(); toast('👆 تم تفعيل البصمة');
  } catch(e){
    toast('❌ تم إلغاء العملية');
  }
}

async function tryBiometric(){
  if(!window.PublicKeyCredential || !navigator.credentials){ toast('❌ جهازك لا يدعم البصمة'); return; }
  if(!DS.bioCredId){ toast('❌ فعّل البصمة أولاً من الإعدادات'); return; }
  try{
    const assertion = await navigator.credentials.get({
      publicKey:{
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials:[{ id: b64ToBuf(DS.bioCredId), type:'public-key' }],
        userVerification:'required',
        timeout:60000
      }
    });
    if(!assertion) return;
    // اتحقق فعليًا من البصمة (المتصفح مايرجعش نجاح غير لو التحقق الحيوي تم فعلاً)
    if(_lockContext==='authLogin'){
      quickUnlockSuccess();
    } else {
      hideLockScreen();
      toast('👆 تم فتح التطبيق بالبصمة');
    }
  } catch(e){
    // المستخدم ألغى العملية أو فشل التحقق
    if(_lockContext==='authLogin'){
      registerQuickFail();
    } else if(e && e.name !== 'NotAllowedError'){
      toast('❌ فشل التحقق من البصمة');
    }
  }
}

// ══ AUTH SCREEN QUICK ACCESS (بصمة/PIN بدل رقم الهاتف وكلمة المرور) ══
function authTryBio(){
  _lockContext = 'authLogin';
  tryBiometric();
}

function authShowPinPad(){
  _lockContext = 'authLogin';
  _pinCode = DS.pinCode || _pinCode;
  showLockScreen();
}

// ══ QUICK ACCESS (PIN/بصمة) BRUTE-FORCE GUARD ══
// 3 محاولات خطأ في PIN أو البصمة من شاشة تسجيل الدخول → تعطيل الدخول السريع وإجباره على كلمة المرور
function registerQuickFail(){
  DS.quickFailCount = (DS.quickFailCount||0) + 1;
  sv();
  if(DS.quickFailCount >= 3){
    updateAuthQuickAccess();
    toast('⛔ محاولات كتير خاطئة — سجّل الدخول برقم الهاتف وكلمة المرور');
  } else {
    toast('❌ خطأ ('+DS.quickFailCount+'/3)');
  }
}

function quickUnlockSuccess(){
  if(!DS.uid){ toast('❌ لا توجد بيانات محفوظة على الجهاز'); return; }
  _lockContext = 'session';
  DS.quickFailCount = 0;
  DS.loggedIn = true; sv();
  const lock = document.getElementById('LOCK-SCR'); if(lock) lock.classList.remove('show');
  applyDark(); rNotes(); rExpenses(); rTasks(); rOccasions(); rArticles(); rSavings(); rVaults(); applyVaultVisibility(); checkOccasionReminders(); updateNotifBadge(); updateConnectionStatus(); showScr('SCR-main');
  rAll(); updProf(); updSubStatus(); updSubBar();
  checkForUpdates();
  if(FB_READY) syncFromCloud();
  
  if(DS.sessionMinutes){ _sessionMinutes = DS.sessionMinutes; }
  resetAutoLogout();
  toast('✅ تم تسجيل الدخول');
}

// يظهر/يخفي أزرار الدخول السريع في شاشة تسجيل الدخول حسب الإعدادات المحفوظة
function updateAuthQuickAccess(){
  const wrap = document.getElementById('auth-quick');
  const bioBtn = document.getElementById('AUTH-BIO-BTN');
  const pinBtn = document.getElementById('AUTH-PIN-BTN');
  if(!wrap || !bioBtn || !pinBtn) return;
  const quickBlocked = (DS.quickFailCount||0) >= 3;
  const showBio = !quickBlocked && !!DS.uid && !!DS.bioEnabled && !!DS.bioCredId && !!window.PublicKeyCredential;
  const showPin = !quickBlocked && !!DS.uid && !!DS.pinEnabled;
  bioBtn.style.display = showBio ? 'block' : 'none';
  pinBtn.style.display = showPin ? 'block' : 'none';
  wrap.style.display = (showBio || showPin) ? 'block' : 'none';
  if(DS.pinEnabled){ _pinEnabled = true; _pinCode = DS.pinCode || ''; }
  if(DS.bioEnabled){ _bioEnabled = true; }
}

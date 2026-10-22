// admin.js — لوحة الأدمن (بتتحمّل عند الحاجة فقط)
function adminLoginLegacy(){
  const phone=document.getElementById('ADMIN-PHONE').value.trim();
  const pass=document.getElementById('ADMIN-PASS').value;
  const isDefault=(phone===ADMIN_DEFAULT_PHONE&&pass===ADMIN_PASSWORD);
  const enterPanel=(forceChange)=>{
    _adminMustChange=!!forceChange;
    openAdminPanel();
    if(forceChange){
      document.getElementById('M-ADMIN-FORCE').classList.add('on');
      toast('🔐 لازم تحدد رقم وكلمة مرور جديدين قبل ما تكمل');
    } else {
      toast('✅ مرحباً بك في لوحة التحكم');
    }
  };
  if(!FB_READY){toast('❌ لوحة التحكم تحتاج اتصال بالإنترنت');return;}
  db.collection('config').doc('admin').get().then(doc=>{
    if(doc.exists && doc.data().v2===true){
      const d=doc.data();
      if(d.phone===phone&&d.passHash===hashPass(pass)) enterPanel(d.mustChange===true);
      else toast('❌ رقم الهاتف أو كلمة السر خاطئة');
    } else {
      // لا توجد بيانات محدّثة بعد: البيانات الافتراضية تعمل مرة واحدة وتفرض التغيير
      if(isDefault) enterPanel(true);
      else if(doc.exists && doc.data().phone===phone && doc.data().passHash===hashPass(pass)) enterPanel(true);
      else toast('❌ رقم الهاتف أو كلمة السر خاطئة');
    }
  }).catch(e=>{
    toast('❌ تعذر التحقق الآن، جرّب تاني بعد ما الاتصال يتظبط');
  });
}

function forceAdminChange(){
  const phone=document.getElementById('AF-PHONE').value.trim();
  const pass=document.getElementById('AF-PASS').value;
  const pass2=document.getElementById('AF-PASS2').value;
  if(!phone){toast('❌ أدخل رقم الهاتف');return;}
  if(pass.length<8){toast('❌ كلمة المرور لازم 8 أحرف على الأقل');return;}
  if(phone===ADMIN_DEFAULT_PHONE){toast('❌ غيّر رقم الهاتف الافتراضي لرقمك الحقيقي');return;}
  if(pass===ADMIN_PASSWORD||pass==='1234'){toast('❌ ماينفعش تستخدم كلمة المرور المؤقتة');return;}
  if(pass!==pass2){toast('❌ كلمة المرور غير متطابقة');return;}
  db.collection('config').doc('admin').set({
    phone,passHash:hashPass(pass),mustChange:false,v2:true,updated:new Date().toISOString()
  }).then(()=>{
    _adminMustChange=false;
    localStorage.setItem('hbt_admin',JSON.stringify({phone,passHash:hashPass(pass)}));
    ['AF-PHONE','AF-PASS','AF-PASS2'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('M-ADMIN-FORCE').classList.remove('on');
    toast('✅ تم تعيين كلمة المرور الجديدة بنجاح');
  }).catch(e=>toast('❌ خطأ في الحفظ — تأكد من الاتصال'));
}

function changeAdminCreds(){
  const phone=document.getElementById('NEW-ADMIN-PHONE').value.trim();
  const pass=document.getElementById('NEW-ADMIN-PASS').value;
  const pass2=document.getElementById('NEW-ADMIN-PASS2').value;
  if(!phone){toast('❌ أدخل رقم الهاتف');return;}
  if(pass.length<8){toast('❌ كلمة المرور لازم 8 أحرف على الأقل');return;}
  if(pass==='1234'){toast('❌ ماينفعش تستخدم كلمة المرور المؤقتة');return;}
  if(pass!==pass2){toast('❌ كلمة المرور غير متطابقة');return;}
  if(FB_READY){
    db.collection('config').doc('admin').set({
      phone,passHash:hashPass(pass),mustChange:false,v2:true,updated:new Date().toISOString()
    }).then(()=>{
      // Save locally too
      localStorage.setItem('hbt_admin',JSON.stringify({phone,passHash:hashPass(pass)}));
      document.getElementById('NEW-ADMIN-PHONE').value='';
      document.getElementById('NEW-ADMIN-PASS').value='';
      document.getElementById('NEW-ADMIN-PASS2').value='';
      toast('✅ تم تحديث بيانات الأدمن بنجاح');
    }).catch(e=>toast('❌ خطأ في الحفظ'));
  } else {
    // Save locally only
    localStorage.setItem('hbt_admin',JSON.stringify({phone,passHash:hashPass(pass)}));
    document.getElementById('NEW-ADMIN-PHONE').value='';
    document.getElementById('NEW-ADMIN-PASS').value='';
    document.getElementById('NEW-ADMIN-PASS2').value='';
    toast('✅ تم تحديث بيانات الأدمن (محلياً)');
  }
}

function loadAdminData(){loadUpdatesLog();loadSupportTickets();loadVersionInfo();
  if(!FB_READY){
    renderAdminUsers([
      {id:'1',name:'أحمد محمد',phone:'+20 101 234 5678',subscription:{type:'trial'},lastLogin:'2025-03-20'},
      {id:'2',name:'سارة علي',phone:'+20 112 345 6789',subscription:{type:'month'},lastLogin:'2025-03-22'},
    ]);return;
  }
  db.collection('users').get().then(snap=>{
    const users=[];snap.forEach(d=>users.push({id:d.id,...d.data()}));
    renderAdminUsers(users);
  }).catch(e=>toast('❌ خطأ في تحميل المستخدمين'));
}

function renderAdminUsers(users){
  _adminUsers=users;
  const active=users.filter(u=>u.subscription?.type==='month'||u.subscription?.type==='year'||u.subscription?.type==='life').length;
  const trial=users.filter(u=>!u.subscription||u.subscription?.type==='trial').length;
  const e1=document.getElementById('AS-USERS');if(e1)e1.textContent=users.length;
  const e2=document.getElementById('AS-ACTIVE');if(e2)e2.textContent=active;
  const e3=document.getElementById('AS-TRIAL');if(e3)e3.textContent=trial;
  const _d1=Date.now()-864e5,_d7=Date.now()-7*864e5,_act=u=>u.lastActive?new Date(u.lastActive).getTime():0;
  if(e2)e2.textContent=users.filter(u=>_act(u)>_d1).length;
  if(e3)e3.textContent=users.filter(u=>_act(u)>_d7).length;
  const e4=document.getElementById('AS-LOGINS');if(e4)e4.textContent=users.reduce((a,u)=>a+(u.loginCount||0),0);
  const ct=document.getElementById('USERS-CT');if(ct)ct.textContent=users.length+' مستخدم';
  const icons={trial:'🆓',month:'📅',year:'🌟',life:'♾'};
  const names={trial:'تجريبي',month:'شهري',year:'سنوي',life:'مدى الحياة'};
  const cls={trial:'us-trial',month:'us-active',year:'us-active',life:'us-active'};
  const el=document.getElementById('USERS-LIST');
  el.innerHTML=users.map(u=>{
    const sub=u.subscription||{type:'trial'};
    const ini=(u.name||'؟').trim().split(' ').map(w=>w[0]).slice(0,2).join('');
    return `<div class="user-row" onclick="openUserDetail(${jsArg(u.id)})">
      ${u.avatar?`<img alt="" src="${u.avatar}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0">`:`<div class="av av-b" style="width:36px;height:36px;font-size:11px">${ini}</div>`}
      <div class="user-info">
        <div class="user-name">${escHtml(u.name||'مستخدم')}${u.blocked?' 🚫':''}</div>
        <div class="user-phone">${escHtml(u.phone||'—')} ${u.business?'• '+u.business:''}</div>
      </div>
      <span class="user-status us-active" style="font-size:9px">${lastSeenTxt(u)}</span>
    </div>`;
  }).join('');
}

function subLabel(type){return {trial:'🆓 تجريبي',month:'📅 شهري',year:'🌟 سنوي',life:'♾ مدى الحياة'}[type]||'🆓 تجريبي';}

function fmtJoined(iso){
  if(!iso)return'غير معروف';
  const d=new Date(iso);
  if(isNaN(d))return'غير معروف';
  return d.toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric'})+' — '+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
}

function selPkg(p,el){_pkg=p;document.querySelectorAll('.pkg-opt').forEach(e=>e.classList.remove('sel'));el.classList.add('sel');}

function genCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg=n=>Array.from({length:n},()=>chars[Math.floor(Math.random()*chars.length)]).join('');
  const code=`${seg(4)}-${seg(4)}-${seg(4)}`;
  const days={trial:7,month:30,year:365,life:0};
  const note=document.getElementById('CODE-NOTE').value.trim();
  const expiry=days[_pkg]>0?new Date(Date.now()+days[_pkg]*86400000).toLocaleDateString('ar-EG'):null;
  if(FB_READY){
    db.collection('activation_codes').add({code,pkg:_pkg,note,expiry,created:new Date().toISOString(),used:false})
    .then(()=>showCode(code,expiry)).catch(e=>toast('❌ خطأ في حفظ الكود'));
  } else showCode(code,expiry);
}

function showCode(code,exp){
  document.getElementById('CODE-DISPLAY').style.display='block';
  document.getElementById('CODE-VAL').textContent=code;
  document.getElementById('CODE-EXP').textContent=exp?'ينتهي في: '+exp:'لا ينتهي — مدى الحياة ♾';
  toast('✅ تم إنشاء كود التفعيل');
}

function copyCode(){
  const code=document.getElementById('CODE-VAL').textContent;
  if(navigator.clipboard){navigator.clipboard.writeText(code).then(()=>toast('📋 تم نسخ الكود'));}
  else{const t=document.createElement('textarea');t.value=code;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);toast('📋 تم نسخ الكود');}
}

function blockUser(id){if(FB_READY)db.collection('users').doc(id).update({blocked:true}).then(()=>{toast('🚫 تم حظر المستخدم');loadAdminData();closeM();});}

function unblockUser(id){if(FB_READY)db.collection('users').doc(id).update({blocked:false}).then(()=>{toast('🔓 تم فك الحظر');loadAdminData();closeM();});}

function openUserDetail(id){
  const u=_adminUsers.find(x=>x.id===id);
  if(!u)return;
  renderUserDetail(u);
  document.getElementById('M-UDET').classList.add('on');
  if(FB_READY){
    db.collection('users').doc(id).collection('contacts').get().then(snap=>{
      const cc=document.getElementById('UD-CCOUNT');
      if(cc)cc.textContent=snap.size;
    }).catch(e=>{});
  }
}

function renderUserDetail(u){
  const sub=u.subscription||{type:'trial'};
  const expTxt=sub.expiry?new Date(sub.expiry).toLocaleDateString('ar-EG'):(sub.type==='life'?'مدى الحياة ♾':'—');
  document.getElementById('UD-BODY').innerHTML=`
    <div class="act-card">
      ${u.avatar?`<img alt="" src="${u.avatar}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;margin-bottom:.4rem;display:block">`:''}<div style="font-size:14px;font-weight:800;color:var(--tx)">${escHtml(u.name||'مستخدم')}${u.blocked?' <span style="color:var(--ng);font-size:11px">🚫 محظور</span>':''}</div>
      <div style="font-size:12px;color:var(--mu);margin-top:2px">${escHtml(u.phone||'—')}${u.business?' • '+u.business:''}${u.city?' • '+u.city:''}</div>
      <div style="font-size:11.5px;color:var(--mu);margin-top:.6rem">📅 تاريخ الانضمام</div>
      <div style="font-size:13px;font-weight:700;color:var(--tx)">${fmtJoined(u.created)}</div>
      <div style="font-size:11.5px;color:var(--mu);margin-top:.6rem">👥 عدد جهات الاتصال المسجلة</div>
      <div style="font-size:13px;font-weight:700;color:var(--tx)" id="UD-CCOUNT">جاري التحميل...</div>
      <div style="font-size:11.5px;color:var(--mu);margin-top:.6rem">📊 النشاط</div>
      <div style="font-size:12.5px;font-weight:700;color:var(--tx);line-height:1.9">🔑 مرات الدخول: ${u.loginCount||0} • 📱 مرات فتح التطبيق: ${u.sessions||0}<br>🕐 آخر استخدام: ${u.lastActive?fmtJoined(u.lastActive):'—'}<br>⚠️ محاولات دخول خاطئة: ${u.failedLogins||0}${u.lastFailedLogin?' (آخرها '+fmtJoined(u.lastFailedLogin)+')':''}</div>
    </div>
    <div class="act-card">
      <div class="act-card-t">💳 تفعيل / تحديد مدة الاشتراك</div>
      <div class="pkg-grid">
        <div class="pkg-opt sel" id="ud-pkg-trial" onclick="selUdPkg('trial',this)">🆓 تجريبي</div>
        <div class="pkg-opt" id="ud-pkg-month" onclick="selUdPkg('month',this)">📅 شهري</div>
        <div class="pkg-opt" id="ud-pkg-year" onclick="selUdPkg('year',this)">🌟 سنوي</div>
        <div class="pkg-opt" id="ud-pkg-life" onclick="selUdPkg('life',this)">♾ مدى الحياة</div>
      </div>
      <div class="fl" id="ud-days-wrap" style="margin-bottom:.6rem">
        <div class="lb">عدد الأيام</div>
        <input class="inp" id="UD-DAYS" type="number" min="1" placeholder="مثال: 30">
      </div>
      <button class="btn btn-p" onclick="adminSetSubscription(${jsArg(u.id)})" style="background:linear-gradient(135deg,#7c3aed,#2563eb)">✅ تفعيل للمستخدم</button>
    </div>
    <div class="act-card">
      <div class="act-card-t">🏦 ميزات إضافية</div>
      <div class="sr" style="padding:0" onclick="toggleUserSavingsFeature(${jsArg(u.id)},${!u.features?.savingsEnabled})">
        <div class="si si-p">🏦</div>
        <div class="st"><div class="st-t">قسم "ادخار"</div><div class="st-s">${u.features?.savingsEnabled?'مفعّل لهذا المستخدم ✅':'غير مفعّل'}</div></div>
        <button class="tog${u.features?.savingsEnabled?' on':''}"></button>
      </div>
    </div>
    <div class="act-card">
      <div class="act-card-t">🔧 إجراءات</div>
      <div style="display:flex;gap:.5rem;margin-bottom:.5rem">
        ${u.blocked
          ?`<button class="btn btn-p" onclick="unblockUser(${jsArg(u.id)})" style="flex:1">🔓 فك الحظر</button>`
          :`<button class="btn btn-ng" onclick="blockUser(${jsArg(u.id)})" style="flex:1">🚫 حظر</button>`}
        <button class="btn btn-s" onclick="resetUserPassword(${jsArg(u.id)},${jsArg(u.name||'المستخدم')})" style="flex:1">🔑 كلمة مرور جديدة</button>
      </div>
      <button class="btn btn-s" onclick="unlockUserLogin(${jsArg(u.id)})" style="width:100%">🔓 فك قفل الدخول</button>
    </div>`;
  _udPkg='trial';
}

function toggleUserSavingsFeature(id,enable){
  if(!FB_READY)return;
  db.collection('users').doc(id).set({'features.savingsEnabled':enable},{merge:true}).then(()=>{
    const u=_adminUsers.find(x=>x.id===id);
    if(u){if(!u.features)u.features={};u.features.savingsEnabled=enable;renderUserDetail(u);}
    if(enable){
      db.collection('users').doc(id).set({pendingNotice:{msg:'🏦 تم تفعيل قسم "ادخار" لحسابك — جرّبه دلوقتي!',ts:Date.now()}},{merge:true}).catch(e=>{});
    }
    toast(enable?'✅ تم تفعيل قسم ادخار لهذا المستخدم':'تم إلغاء التفعيل');
    loadAdminData();
  }).catch(e=>{toast('❌ فشل التنفيذ: '+(e&&e.message?e.message:'خطأ غير معروف'));});
}

function selUdPkg(p,el){
  _udPkg=p;
  document.querySelectorAll('#UD-BODY .pkg-opt').forEach(e=>e.classList.remove('sel'));
  el.classList.add('sel');
  const w=document.getElementById('ud-days-wrap');
  if(w)w.style.display=p==='life'?'none':'block';
}

function adminSetSubscription(id){
  if(!FB_READY)return;
  let sub,noticeMsg;
  if(_udPkg==='life'){
    sub={type:'life',expiry:null};
    noticeMsg='🎉 تم تفعيل اشتراكك مدى الحياة ♾';
  } else {
    const days=parseInt(document.getElementById('UD-DAYS').value)||0;
    if(days<=0){toast('❌ حدد عدد أيام صحيح');return;}
    const exp=new Date(Date.now()+days*86400000).toISOString();
    sub={type:_udPkg,expiry:exp};
    noticeMsg=`🎉 تم تفعيل اشتراكك (${subLabel(_udPkg)}) لمدة ${days} يوم`;
  }
  const notice={msg:noticeMsg,ts:Date.now()};
  db.collection('users').doc(id).set({subscription:sub,pendingNotice:notice},{merge:true}).then(()=>{
    toast('✅ تم تفعيل الاشتراك — هيوصله تنبيه تلقائي');
    loadAdminData();closeM();
  });
}

function resetUserPassword(id,name){
  if(!FB_READY)return;
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const newPass=Array.from({length:10},()=>chars[Math.floor(Math.random()*chars.length)]).join('');
  const hash=hashPass(newPass);
  db.collection('users').doc(id).set({passHash:hash,mustChangePassword:true,authMigrated:false},{merge:true}).then(()=>{
    _lastNewPass=newPass;
    document.getElementById('NEWPASS-VAL').textContent=newPass;
    document.getElementById('M-NEWPASS').classList.add('on');
    loadAdminData();
  });
}

function copyNewPass(){
  if(navigator.clipboard){navigator.clipboard.writeText(_lastNewPass).then(()=>toast('📋 تم النسخ'));}
  else{const t=document.createElement('textarea');t.value=_lastNewPass;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);toast('📋 تم النسخ');}
}

async function adminLogin(){
  const phone=document.getElementById('ADMIN-PHONE').value.trim(),pass=document.getElementById('ADMIN-PASS').value;
  try{
    if(FB_READY&&window.firebase&&firebase.auth&&phone&&pass){
      const em=authEmail(phone);
      await withTO(firebase.auth().signInWithEmailAndPassword(em,pass),12000);
      const ad=await withTO(db.collection('admins').doc(em).get(),12000);
      if(ad.exists){_adminMustChange=false;openAdminPanel();toast('✅ مرحباً بك في لوحة التحكم');return;}
    }
  }catch(e){}
  adminLoginLegacy();
}

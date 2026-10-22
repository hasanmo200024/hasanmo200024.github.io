// ══ FIREBASE CONFIG ══
const FB_CONFIG = {
  apiKey: "AIzaSyDe90UPQOzg5wD9nkXNMrYEJi0Bh4KSnZg",
  authDomain: "phone-service-1.firebaseapp.com",
  projectId: "phone-service-1",
  storageBucket: "phone-service-1.firebasestorage.app",
  messagingSenderId: "476603633715",
  appId: "1:476603633715:web:df761729e081eb211f1346"
};
// كلمة مرور مؤقتة لمرة واحدة فقط (تُستخدم لو مفيش بيانات أدمن محفوظة).
// بعد أول دخول بها بيتم إجبار تغييرها فورًا. ⚠️ لازم تتغير قبل ما التطبيق ينتشر.
const ADMIN_DEFAULT_PHONE = "01000000000";
const ADMIN_PASSWORD = "1234";
let _adminMustChange = false;
const APP_VERSION = "1.6.0";
const AV_COLORS = {1:{bg:'#dbeafe',cl:'#1e40af'},2:{bg:'#d1fae5',cl:'#065f46'},3:{bg:'#fce7f3',cl:'#9d174d'},4:{bg:'#fef3c7',cl:'#92400e'},5:{bg:'#ede9fe',cl:'#4c1d95'},6:{bg:'#fee2e2',cl:'#991b1b'}};

let db=null,auth=null,FB_READY=false,confirmResult=null;
try{
  firebase.initializeApp(FB_CONFIG);
  db=firebase.firestore();
  auth=firebase.auth();
  FB_READY=true;
  // تفعيل العمل بدون إنترنت: البيانات تتخزن محليًا وتتزامن تلقائيًا لما النت يرجع
  db.enablePersistence({synchronizeTabs:true}).catch(e=>{
    console.warn('Offline persistence not enabled:',e.code);
  });
}catch(e){console.warn('Firebase not ready',e);}

// ══ حالة الاتصال بالإنترنت ══
function updateConnectionStatus(){
  const dot=document.getElementById('SDOT');const txt=document.getElementById('STXT');
  if(!navigator.onLine){
    if(dot)dot.style.background='#f59e0b';
    if(txt)txt.textContent='بدون إنترنت — هتتزامن تلقائيًا';
  } else {
    if(dot)dot.style.background='#4ade80';
    if(txt)txt.textContent='مزامن';
    if(FB_READY&&DS.uid)syncFromCloud();
  }
}
window.addEventListener('online',updateConnectionStatus);
window.addEventListener('offline',updateConnectionStatus);

// ══ CLOCK ══
const AD=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const AM=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
function p2(n){return String(n).padStart(2,'0')}
function toAr(n){return String(n).replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[d])}
function tick(){
  const now=new Date();
  const t=`${p2(now.getHours())}:${p2(now.getMinutes())}:${p2(now.getSeconds())}`;
  const d=`${AD[now.getDay()]}، ${toAr(now.getDate())} ${AM[now.getMonth()]} ${toAr(now.getFullYear())}`;
  ['SCLK','DSCLK','ADMIN-CLK'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=t});
  ['SDATE','DSDATE','ADMIN-DATE'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=d});
  const h=now.getHours();
  const g=h>=5&&h<12?'صباح الخير ☀':h>=12&&h<17?'مساء الخير 🌤':h>=17&&h<21?'مساء النور 🌅':'ليلة طيبة 🌙';
  const ge=document.getElementById('GREET');if(ge)ge.textContent=g;
  const geh=document.getElementById('GREET-HOME');if(geh)geh.textContent=g;
}
setInterval(tick,1000);tick();

// ══ STATE ══
let DS={
  loggedIn:false,dark:false,balH:false,filt:'all',
  curID:null,ttType:'in',ctType:'customer',
  phone:'',name:'',uid:'',business:'',city:'',email:'',note:'',avColor:1,
  subscription:{type:'unlimited',expiry:null},
  contacts:[],notes:[],expenses:[],tasks:[],occasions:[],notifications:[],
  expenseCategories:[
    {id:'c1',name:'مشتريات ومخزون',icon:'🛒'},
    {id:'c2',name:'فواتير وخدمات',icon:'⚡'},
    {id:'c3',name:'مواصلات',icon:'🚗'},
    {id:'c4',name:'أخرى',icon:'🗂'}
  ],
  navSections:['settings','dash','daily','help'],
  expenseBudget:{monthly:null,daily:null},
  articles:[],
  savings:[],
  recurringExpenses:[],
  savingsEnabled:false,
  savingsVaults:[],
  medications:[],
  doctorAppointments:[],
  appointments:[]
};
// ── helpers (تواريخ محلية، معرفات، حماية XSS، PIN) ──
function localISO(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function localYM(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
let _lastId=0;function newId(){let n=Date.now();if(n<=_lastId)n=_lastId+1;_lastId=n;return n;}
function jsArg(s){return "decodeURIComponent('"+encodeURIComponent(String(s==null?'':s)).replace(/'/g,'%27')+"')";}
function sha256(str){const m=new TextEncoder().encode(str),l=m.length,nb=((l+9+63)>>6)<<6,b=new Uint8Array(nb);b.set(m);b[l]=128;const dv=new DataView(b.buffer);dv.setUint32(nb-8,Math.floor(l*8/4294967296));dv.setUint32(nb-4,(l*8)>>>0);
const K=[],H=[];for(let n=2,c=0;c<64;n++){let p=true;for(let i=2;i*i<=n;i++)if(n%i===0){p=false;break;}if(p){if(c<8)H[c]=(Math.pow(n,.5)%1*4294967296)|0;K[c]=(Math.pow(n,1/3)%1*4294967296)|0;c++;}}
const w=new Int32Array(64),R=(x,k)=>(x>>>k)|(x<<(32-k));
for(let o=0;o<nb;o+=64){for(let i=0;i<16;i++)w[i]=dv.getUint32(o+i*4);
for(let i=16;i<64;i++){const a=w[i-15],d=w[i-2];w[i]=(w[i-16]+(R(a,7)^R(a,18)^(a>>>3))+w[i-7]+(R(d,17)^R(d,19)^(d>>>10)))|0;}
let[a,b2,c,d,e,f,g,h]=H;
for(let i=0;i<64;i++){const t1=(h+(R(e,6)^R(e,11)^R(e,25))+((e&f)^(~e&g))+K[i]+w[i])|0,t2=((R(a,2)^R(a,13)^R(a,22))+((a&b2)^(a&c)^(b2&c)))|0;h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b2;b2=a;a=(t1+t2)|0;}
const v=[a,b2,c,d,e,f,g,h];for(let i=0;i<8;i++)H[i]=(H[i]+v[i])|0;}
return H.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');}
function pinStore(pin){const s=Array.from(crypto.getRandomValues(new Uint8Array(8))).map(x=>x.toString(16).padStart(2,'0')).join('');return 'h1:'+s+':'+sha256(s+':'+pin);}
function pinMatches(inp){if(!_pinCode)return false;if(_pinCode.indexOf('h1:')===0){const p=_pinCode.split(':');return sha256(p[1]+':'+inp)===p[2];}
if(inp===_pinCode){_pinCode=pinStore(inp);DS.pinCode=_pinCode;sv();return true;}return false;}
function askPin(msg){return new Promise(res=>{const ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem';
ov.innerHTML='<div role="dialog" aria-modal="true" style="background:var(--sf,#fff);color:var(--tx,#221d16);border-radius:16px;padding:1.2rem;width:100%;max-width:320px;text-align:center"><div class="_m" style="font-weight:800;font-size:14px;margin-bottom:.8rem"></div><input type="password" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="رمز PIN" style="width:100%;text-align:center;font-size:22px;letter-spacing:.6rem;padding:.6rem;border:1px solid var(--bd,#ccc);border-radius:10px;background:transparent;color:inherit"><div style="display:flex;gap:.6rem;margin-top:.9rem"><button type="button" class="btn btn-p _ok" style="flex:1">تأكيد</button><button type="button" class="btn _no" style="flex:1">إلغاء</button></div></div>';
ov.querySelector('._m').textContent=msg;document.body.appendChild(ov);const inp=ov.querySelector('input');inp.focus();
const done=v=>{ov.remove();res(v);};ov.querySelector('._ok').onclick=()=>done(inp.value);ov.querySelector('._no').onclick=()=>done(null);inp.onkeydown=e=>{if(e.key==='Enter')done(inp.value);};});}
let _svT=null;function svWrite(){_svT=null;try{localStorage.setItem('hbt_v21',JSON.stringify(DS));}catch(e){}}
function svFlush(){if(_svT){clearTimeout(_svT);svWrite();}}
window.addEventListener('pagehide',svFlush);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')svFlush();});
function sv(){if(!_svT)_svT=setTimeout(svWrite,250);}
function ld(){try{const d=localStorage.getItem('hbt_v21');if(d){Object.assign(DS,JSON.parse(d));return true;}}catch(e){}return false;}

// ══ TOAST ══
let _tT=null;
function toast(m){const e=document.getElementById('TOAST');e.textContent=m;e.classList.add('on');if(_tT)clearTimeout(_tT);_tT=setTimeout(()=>e.classList.remove('on'),2800);}

// ══ HTML escape ══
function escHtml(t){return String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// ══ الكتابة بالصوت في كل خانة كتابة ══
const MIC_FIELDS=['NOTE-TITLE','NOTE-BODY','TASK-NAME','OCC-NAME','EXP-NOTE','TX-NT','CAT-NAME','SAV-NAME','ART-TITLE','MED-NAME','MED-DOSE','DOCTOR-NAME','APPT-NAME','RECUR-NAME','VAULT-NAME','HELP-NAME','HELP-Q','THREAD-REPLY','CT-N','CT-CO','CT-NT'];
let _micRec=null,_micBtn=null;
function stopMicUI(){if(_micBtn){_micBtn.style.background='';_micBtn.textContent='🎙️';}_micRec=null;_micBtn=null;}
function voiceInto(id,btn){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('❌ جهازك لا يدعم الكتابة بالصوت');return;}
  if(_micRec){const same=_micBtn===btn;try{_micRec.stop();}catch(e){}stopMicUI();if(same)return;}
  const el=document.getElementById(id);if(!el)return;
  const r=new SR();r.lang='ar-EG';r.continuous=false;r.interimResults=false;
  r.onresult=e=>{const t=e.results[0][0].transcript;el.value=(el.value?el.value+' ':'')+t;el.dispatchEvent(new Event('input',{bubbles:true}));};
  r.onerror=()=>{stopMicUI();toast('❌ تعذر التعرف على الصوت');};
  r.onend=()=>stopMicUI();
  try{r.start();_micRec=r;_micBtn=btn;btn.style.background='#fee2e2';btn.textContent='🔴';}catch(e){}
}
function initMicButtons(){
  MIC_FIELDS.forEach(id=>{
    const el=document.getElementById(id);
    if(!el||el.dataset.mic)return;
    const wrap=el.parentElement;wrap.style.position='relative';
    const isTa=el.tagName==='TEXTAREA';
    const b=document.createElement('span');b.textContent='🎙️';
    b.style.cssText='position:absolute;left:.5rem;'+(isTa?'top:1.8rem':'bottom:.4rem')+';width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;z-index:2';
    b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();voiceInto(id,b);};
    wrap.appendChild(b);el.style.paddingLeft='2.4rem';el.dataset.mic='1';
  });
}

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
  window._minVer=cfg.minVersion||'';
  if(cfg.minVersion&&cmpVer(APP_VERSION,cfg.minVersion)>=0)tourAfterForced(cfg.minVersion);
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
  setTimeout(maybeShowGuide,3500);setTimeout(checkForcedUpdate,2500);setTimeout(flushTrashQueue,3000);setTimeout(purgeExpiredTrash,12000);setTimeout(runReminderChecks,4000);setTimeout(maybeAskNotifPermission,9000);updateNotifBadge();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',qInit);else qInit();

function toggleTxFilters(){
  const el=document.getElementById('TX-CHIPS');
  if(!el)return;
  el.style.display=el.style.display==='none'?'flex':'none';
}

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
  applyDark();applyHomeLayout();applyNavSelection();rNotes();rExpenses();rTasks();rOccasions();rArticles();rSavings();rVaults();applyVaultVisibility();checkOccasionReminders();updateNotifBadge();updateConnectionStatus();showScr('SCR-main');
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
  // Check Firebase for admin config
  if(FB_READY){
    db.collection('config').doc('admin').get().then(doc=>{
      if(doc.exists){
        const data=doc.data();
        const isAdmin=data.phone===DS.phone;
        DS.isAdmin=isAdmin;
        showAdminRow(isAdmin);
      } else {
        // Check default admin password match
        const isAdmin=DS.phone==='+20 101 234 5678';
        DS.isAdmin=isAdmin;
        showAdminRow(isAdmin);
      }
    }).catch(e=>{});
  } else {
    // Local check - if phone matches saved admin
    const adminData=localStorage.getItem('hbt_admin');
    if(adminData){
      const ad=JSON.parse(adminData);
      const isAdmin=ad.phone===DS.phone;
      DS.isAdmin=isAdmin;
      showAdminRow(isAdmin);
    }
  }
}

function showAdminRow(show){
  const row=document.getElementById('ADMIN-SETTINGS-ROW');
  if(row)row.style.display=show?'block':'none';
}

function goBackFromAdmin(){
  showScr('SCR-main');
  goTab('settings');
}

function openAdminPanel(){
  showScr('SCR-admin');
  loadAdminData();
}

function doOut(){try{if(window.firebase&&firebase.auth)firebase.auth().signOut();}catch(e){}
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
  _tapTimer=setTimeout(()=>{_tapCount=0;},1500);
  if(_tapCount>=5){
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
function _admStub(n){return function(...a){return loadAdminJs().then(()=>{const f=window[n];if(f&&!f.__stub)return f(...a);}).catch(()=>toast('❌ تعذر تحميل لوحة الأدمن — تأكد من الاتصال'));};}
function adminLogin(...a){return _admStub("adminLogin")(...a);} adminLogin.__stub=true;
function forceAdminChange(...a){return _admStub("forceAdminChange")(...a);} forceAdminChange.__stub=true;
function changeAdminCreds(...a){return _admStub("changeAdminCreds")(...a);} changeAdminCreds.__stub=true;
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
  db.collection('config').doc('app').set({version:APP_VERSION,minVersion:APP_VERSION,updated:new Date().toISOString()},{merge:true})
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

// ══ FIREBASE SYNC ══
function syncFromCloudCore(){
  if(!FB_READY||!DS.uid)return;
  const dot=document.getElementById('SDOT'),txt=document.getElementById('STXT');
  if(dot)dot.style.background='#f59e0b';if(txt)txt.textContent='مزامنة...';
  // Sync user profile
  db.collection('users').doc(DS.uid).get().then(doc=>{
    if(doc.exists){
      const data=doc.data();
      if(data.blocked===true){
        toast('🚫 تم حظر حسابك من قبل الإدارة');
        doOut();
        return;
      }
      try{
        const nowMs=Date.now();
        if(!DS._law||nowMs-DS._law>300000){
          DS._law=nowMs;
          const up={lastActive:new Date().toISOString()};
          if(!sessionStorage.getItem('qs_counted')){sessionStorage.setItem('qs_counted','1');up.sessions=firebase.firestore.FieldValue.increment(1);}
          db.collection('users').doc(DS.uid).set(up,{merge:true}).catch(()=>{});
        }
      }catch(e){}
      if(data.avatar)DS.avatar=data.avatar;
      loadMySupport();
      if(data.name)DS.name=data.name;
      if(data.business)DS.business=data.business;
      if(data.city)DS.city=data.city;
      if(data.email)DS.email=data.email;
      if(data.avColor)DS.avColor=data.avColor;
      if(data.subscription)DS.subscription=data.subscription;
      if(data.expenseCategories)DS.expenseCategories=data.expenseCategories;
      if(data.navSections)DS.navSections=data.navSections;
      DS.savingsEnabled=!!(data.features&&data.features.savingsEnabled);
      applyVaultVisibility();
      if(data.expenseBudget)DS.expenseBudget=data.expenseBudget;
      if(data.pendingNotice&&data.pendingNotice.msg){
        notifyUser(data.pendingNotice.msg);
        db.collection('users').doc(DS.uid).set({pendingNotice:null},{merge:true}).catch(e=>{});
      }
      sv();updProf();updSubStatus();updSubBar();applyNavSelection();
    }
  }).catch(e=>{if(e&&e.code==='permission-denied')needRelogin();});
  // Sync contacts
  db.collection('users').doc(DS.uid).collection('contacts').get().then(snap=>{
    if(!snap.empty){
      DS.contacts=[];snap.forEach(d=>DS.contacts.push({id:d.id,...d.data()}));
      sv();rAll();
    } else backfillColl('contacts');
    if(dot)dot.style.background='#4ade80';if(txt)txt.textContent='مزامن';
    const s=document.getElementById('SYNC-S');if(s){const n=new Date();s.textContent=`آخر مزامنة: ${p2(n.getHours())}:${p2(n.getMinutes())}`;}
  }).catch(e=>{if(dot)dot.style.background='#ef4444';if(txt)txt.textContent='خطأ';});
  // Sync notes
  db.collection('users').doc(DS.uid).collection('notes').get().then(snap=>{
    if(!snap.empty){
      DS.notes=[];snap.forEach(d=>DS.notes.push({id:isNaN(d.id)?d.id:Number(d.id),...d.data()}));
      sv();rNotes();
    } else backfillColl('notes');
  }).catch(e=>{});
  // Sync articles
  db.collection('users').doc(DS.uid).collection('articles').get().then(snap=>{
    if(!snap.empty){
      DS.articles=[];snap.forEach(d=>DS.articles.push({id:Number(d.id),...d.data()}));
      sv();rArticles();
    } else backfillColl('articles');
  }).catch(e=>{});
  // Sync savings
  db.collection('users').doc(DS.uid).collection('savings').get().then(snap=>{
    if(!snap.empty){
      DS.savings=[];snap.forEach(d=>DS.savings.push({id:Number(d.id),...d.data()}));
      sv();rSavings();
    } else backfillColl('savings');
  }).catch(e=>{});
  // Sync recurring expenses
  db.collection('users').doc(DS.uid).collection('recurringExpenses').get().then(snap=>{
    if(!snap.empty){
      DS.recurringExpenses=[];snap.forEach(d=>DS.recurringExpenses.push({id:Number(d.id),...d.data()}));
      sv();rRecur();
    } else backfillColl('recurringExpenses');
  }).catch(e=>{});
  // Sync expenses
  db.collection('users').doc(DS.uid).collection('expenses').get().then(snap=>{
    if(!snap.empty){
      DS.expenses=[];snap.forEach(d=>DS.expenses.push({id:Number(d.id),...d.data()}));
      sv();rExpenses();
    } else backfillColl('expenses');
  }).catch(e=>{});
  // Sync tasks
  db.collection('users').doc(DS.uid).collection('tasks').get().then(snap=>{
    if(!snap.empty){
      DS.tasks=[];snap.forEach(d=>DS.tasks.push({id:Number(d.id),...d.data()}));
      sv();rTasks();
    } else backfillColl('tasks');
  }).catch(e=>{});
  syncExtraColls();
  // Sync occasions
  db.collection('users').doc(DS.uid).collection('occasions').get().then(snap=>{
    if(!snap.empty){
      DS.occasions=[];snap.forEach(d=>DS.occasions.push({id:Number(d.id),...d.data()}));
      sv();rOccasions();
    } else backfillColl('occasions');
  }).catch(e=>{});
}
function syncNow(){if(FB_READY)syncFromCloud();toast('🔄 جاري المزامنة...');}
function saveToCloud(contact){
  if(!FB_READY||!DS.uid)return;
  db.collection('users').doc(DS.uid).collection('contacts').doc(String(contact.id)).set(contact).catch(e=>{});
}
function deleteFromCloud(id){
  if(!FB_READY||!DS.uid)return;
  db.collection('users').doc(DS.uid).collection('contacts').doc(String(id)).delete().catch(e=>{});
}

// ══ NOTES ══
let _noteRemOn=false;
function openNoteModal(){
  document.getElementById('NOTE-TITLE').value='';
  document.getElementById('NOTE-TOPIC').value='شغل';
  document.getElementById('NOTE-BODY').value='';
  document.getElementById('NOTE-DATE').value=localISO(new Date());
  _noteRemOn=false;
  document.getElementById('TG-NOTE-REM').className='tog';
  document.getElementById('NOTE-REM-S').textContent='غير مفعّل';
  document.getElementById('note-rem-wrap').style.display='none';
  document.getElementById('NOTE-REM-AT').value='';
  document.getElementById('M-NOTE').classList.add('on');
}
function toggleNoteReminder(){
  _noteRemOn=!_noteRemOn;
  document.getElementById('TG-NOTE-REM').className='tog'+(_noteRemOn?' on':'');
  document.getElementById('NOTE-REM-S').textContent=_noteRemOn?'مفعّل ✅':'غير مفعّل';
  document.getElementById('note-rem-wrap').style.display=_noteRemOn?'block':'none';
}
function svNote(){
  const title=document.getElementById('NOTE-TITLE').value.trim();
  if(!title){toast('❌ اكتب عنوان الملاحظة');return;}
  const topic=document.getElementById('NOTE-TOPIC').value;
  const body=document.getElementById('NOTE-BODY').value.trim();
  const date=document.getElementById('NOTE-DATE').value||localISO(new Date());
  const remAt=_noteRemOn?document.getElementById('NOTE-REM-AT').value:'';
  if(_noteRemOn&&!remAt){toast('❌ حدد موعد التنبيه');return;}
  const note={id:newId(),title,topic,body,date,reminder:_noteRemOn,reminderAt:remAt?new Date(remAt).toISOString():null,notified:false};
  if(!DS.notes)DS.notes=[];
  DS.notes.unshift(note);
  sv();closeM();rNotes();
  if(FB_READY&&DS.uid){
    db.collection('users').doc(DS.uid).collection('notes').doc(String(note.id)).set(note).catch(e=>{});
  }
  toast('✅ تم حفظ الملاحظة');
}
function delNote(id){
  DS.notes=(DS.notes||[]).filter(n=>n.id!==id);
  sv();rNotes();
  if(FB_READY&&DS.uid){
    db.collection('users').doc(DS.uid).collection('notes').doc(String(id)).delete().catch(e=>{});
  }
  toast('🗑 تم حذف الملاحظة');
}
function rNotes(){
  const notes=DS.notes||[];
  const listEl=document.getElementById('NOTES-LIST');
  const emptyEl=document.getElementById('NOTES-EMPTY');
  const cnt=document.getElementById('HOME-NOTES-CNT');
  if(cnt)cnt.textContent=notes.length;
  if(!listEl)return;
  if(notes.length===0){
    listEl.innerHTML='';
    if(emptyEl)emptyEl.style.display='flex';
    return;
  }
  if(emptyEl)emptyEl.style.display='none';
  const groups={};
  notes.forEach(n=>{const t=n.topic||'أخرى';if(!groups[t])groups[t]=[];groups[t].push(n);});
  const topicIcons={'شغل':'📌','أفكار':'💡','شخصي':'👤','أخرى':'🗂'};
  let html='';
  Object.keys(groups).forEach(topic=>{
    html+=`<div class="note-grp-t">${topicIcons[topic]||'🗂'} ${escHtml(topic)}</div>`;
    groups[topic].forEach(n=>{
      const dt=n.date?new Date(n.date).toLocaleDateString('ar-EG',{day:'numeric',month:'short'}):'';
      html+=`<div class="note-card" onclick="delNoteConfirm(${n.id})">
        <div class="note-dot"></div>
        <div class="note-body">
          <div class="note-t">${escHtml(n.title)}</div>
          ${n.body?`<div class="note-s">${escHtml(n.body)}</div>`:''}
          ${n.reminder?`<span class="note-rem-badge">🔔 تنبيه مضبوط</span>`:''}
        </div>
        <div class="note-meta">${dt}</div>
        <div class="del-x">✕</div>
      </div>`;
    });
  });
  listEl.innerHTML=html;
}
function delNoteConfirm(id){
  if(confirm('حذف الملاحظة دي؟'))delNote(id);
}
function checkNoteReminders(){
  if(!DS.notes||!DS.notes.length)return;
  const now=Date.now();
  let changed=false;
  DS.notes.forEach(n=>{
    if(n.reminder&&!n.notified&&n.reminderAt&&new Date(n.reminderAt).getTime()<=now){
      notifyUser('🔔 تذكير: '+n.title);
      n.notified=true;changed=true;
      if(FB_READY&&DS.uid){
        db.collection('users').doc(DS.uid).collection('notes').doc(String(n.id)).set({notified:true},{merge:true}).catch(e=>{});
      }
    }
  });
  if(changed)sv();
}
// ══ NOTIFICATIONS CENTER ══
function notifyUser(msg){
  const np=DS.notifPrefs||{};
  if(np.inApp!==false)toast(msg);
  if(np.system!==false)systemNotify('قسطاس',msg);
  if(np.sound!==false)playNotifTone();
  if(!DS.notifications)DS.notifications=[];
  DS.notifications.unshift({id:Date.now()+Math.random(),msg,ts:Date.now(),read:false});
  if(DS.notifications.length>100)DS.notifications=DS.notifications.slice(0,100);
  sv();updateNotifBadge();
}
function updateNotifBadge(){
  const unread=(DS.notifications||[]).filter(n=>!n.read).length;
  try{if(navigator.setAppBadge){unread>0?navigator.setAppBadge(unread):navigator.clearAppBadge();}}catch(e){}
  const badge=document.getElementById('NOTIF-BADGE');
  if(badge){badge.style.display=unread>0?'flex':'none';badge.textContent=unread>9?'9+':unread;}
  const badgeNav=document.getElementById('NOTIF-BADGE-NAV');
  if(badgeNav){badgeNav.style.display=unread>0?'flex':'none';badgeNav.textContent=unread>9?'9+':unread;}
}
function openNotifPanel(){
  renderNotifList();
  document.getElementById('M-NOTIF').classList.add('on');
  (DS.notifications||[]).forEach(n=>n.read=true);
  sv();updateNotifBadge();
}
function renderNotifList(){
  const list=DS.notifications||[];
  const el=document.getElementById('NOTIF-LIST');
  if(!el)return;
  if(!list.length){
    el.innerHTML='<div class="soon-wrap" style="padding:2rem 1rem"><div class="soon-ic">🔔</div><div class="soon-t">مفيش إشعارات</div><div class="soon-s">هتظهر هنا تنبيهات الملاحظات والمناسبات وتفعيل الاشتراك</div></div>';
    return;
  }
  el.innerHTML=list.map(n=>{
    const d=new Date(n.ts);
    const dt=d.toLocaleDateString('ar-EG',{day:'numeric',month:'short'})+' — '+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
    return `<div class="note-card" style="cursor:default">
      <div class="note-dot" style="background:var(--pu)"></div>
      <div class="note-body"><div class="note-t">${escHtml(n.msg)}</div><div class="note-s">${dt}</div></div>
    </div>`;
  }).join('');
}

setInterval(checkNoteReminders,60000);

// ══ ARTICLES ══
let _editingArtId=null;
let _artImageData=null;
function openArticleModal(){
  _editingArtId=null;
  _artImageData=null;
  document.getElementById('ART-MODAL-TITLE').textContent='✍️ مقال جديد';
  document.getElementById('ART-TITLE').value='';
  document.getElementById('ART-BODY').value='';
  document.getElementById('ART-IMG-PREVIEW').style.display='none';
  document.getElementById('ART-IMG-INPUT').value='';
  document.getElementById('ART-DEL-BTN').style.display='none';
  document.getElementById('ART-PRINT-BTN').style.display='none';
  updateArtWordCount();
  document.getElementById('M-ARTICLE').classList.add('on');
}
function openArticleEdit(id){
  const a=(DS.articles||[]).find(x=>x.id===id);if(!a)return;
  _editingArtId=id;
  _artImageData=a.image||null;
  document.getElementById('ART-MODAL-TITLE').textContent='✏️ تعديل المقال';
  document.getElementById('ART-TITLE').value=a.title;
  document.getElementById('ART-BODY').value=a.body;
  document.getElementById('ART-IMG-INPUT').value='';
  if(_artImageData){
    document.getElementById('ART-IMG-TAG').src=_artImageData;
    document.getElementById('ART-IMG-PREVIEW').style.display='block';
  } else {
    document.getElementById('ART-IMG-PREVIEW').style.display='none';
  }
  document.getElementById('ART-DEL-BTN').style.display='block';
  document.getElementById('ART-PRINT-BTN').style.display='block';
  updateArtWordCount();
  document.getElementById('M-ARTICLE').classList.add('on');
}
function handleArticleImage(event){
  const file=event.target.files[0];
  if(!file)return;
  if(!file.type.startsWith('image/')){toast('❌ اختار ملف صورة');return;}
  const reader=new FileReader();
  reader.onload=(e)=>{
    const img=new Image();
    img.onload=()=>{
      const maxW=900;
      const scale=Math.min(1,maxW/img.width);
      const canvas=document.createElement('canvas');
      canvas.width=img.width*scale;canvas.height=img.height*scale;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      _artImageData=canvas.toDataURL('image/jpeg',0.75);
      document.getElementById('ART-IMG-TAG').src=_artImageData;
      document.getElementById('ART-IMG-PREVIEW').style.display='block';
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}
function removeArticleImage(){
  _artImageData=null;
  document.getElementById('ART-IMG-PREVIEW').style.display='none';
  document.getElementById('ART-IMG-INPUT').value='';
}
function printArticle(){
  if(!_editingArtId)return;
  const a=(DS.articles||[]).find(x=>x.id===_editingArtId);if(!a)return;
  const d=new Date(a.date);
  const dt=isNaN(d)?'':d.toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric'})+' — '+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
  const imgHtml=a.image?`<img alt="" src="${a.image}" style="width:100%;max-height:280px;object-fit:cover;border-radius:10px;margin-bottom:1rem">`:'';
  const body=`<p style="font-size:10.5px;color:#888;margin-bottom:1rem">تاريخ الكتابة: ${dt}</p>
    ${imgHtml}
    <div style="font-size:13.5px;line-height:2;white-space:pre-wrap">${(a.body||'').replace(/</g,'&lt;')}</div>`;
  printWithBranding(a.title,body);
}
function updateArtWordCount(){
  const t=document.getElementById('ART-BODY').value.trim();
  const wc=t?t.split(/\s+/).length:0;
  const el=document.getElementById('ART-WORDCOUNT');
  if(el)el.textContent=wc+' كلمة';
}

// ══ VOICE DICTATION (الكتابة بالصوت) ══
let _artRecognition=null;
let _artListening=false;
function toggleArtDictation(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('❌ جهازك/متصفحك لا يدعم الكتابة بالصوت');return;}
  const btn=document.getElementById('ART-MIC-BTN');
  if(_artListening){
    if(_artRecognition)_artRecognition.stop();
    _artListening=false;
    if(btn){btn.textContent='🎙️ الكتابة بالصوت';btn.style.color='var(--pr)';}
    return;
  }
  _artRecognition=new SR();
  _artRecognition.lang='ar-EG';
  _artRecognition.continuous=true;
  _artRecognition.interimResults=false;
  _artRecognition.onresult=(e)=>{
    let text='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      if(e.results[i].isFinal)text+=e.results[i][0].transcript;
    }
    if(text){
      const ta=document.getElementById('ART-BODY');
      ta.value=(ta.value?ta.value+' ':'')+text.trim();
      updateArtWordCount();
    }
  };
  _artRecognition.onerror=()=>{
    _artListening=false;
    if(btn){btn.textContent='🎙️ الكتابة بالصوت';btn.style.color='var(--pr)';}
    toast('❌ حصل خطأ في التعرف على الصوت');
  };
  _artRecognition.onend=()=>{
    if(_artListening){ try{_artRecognition.start();}catch(e){} } // استمرار الاستماع لو لسه مفعّل
  };
  try{
    _artRecognition.start();
    _artListening=true;
    if(btn){btn.textContent='🔴 جاري الاستماع... (دوس تاني للإيقاف)';btn.style.color='var(--ng)';}
  }catch(e){toast('❌ تعذر بدء الكتابة بالصوت');}
}
function svArticle(){
  const title=document.getElementById('ART-TITLE').value.trim();
  const body=document.getElementById('ART-BODY').value.trim();
  if(!title){toast('❌ اكتب عنوان للمقال');return;}
  if(!body){toast('❌ اكتب محتوى المقال');return;}
  if(_editingArtId){
    const a=(DS.articles||[]).find(x=>x.id===_editingArtId);
    if(a){a.title=title;a.body=body;a.image=_artImageData;a.date=new Date().toISOString();}
    if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('articles').doc(String(_editingArtId)).set(a).catch(e=>{});
  } else {
    const art={id:newId(),title,body,image:_artImageData,date:new Date().toISOString()};
    if(!DS.articles)DS.articles=[];
    DS.articles.unshift(art);
    if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('articles').doc(String(art.id)).set(art).catch(e=>{});
  }
  _editingArtId=null;
  sv();closeM();rArticles();
  toast('✅ تم حفظ المقال');
}
function deleteCurrentArticle(){
  if(!_editingArtId)return;
  if(!confirm('حذف المقال ده نهائيًا؟'))return;
  DS.articles=(DS.articles||[]).filter(a=>a.id!==_editingArtId);
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('articles').doc(String(_editingArtId)).delete().catch(e=>{});
  _editingArtId=null;
  sv();closeM();rArticles();
  toast('🗑 تم حذف المقال');
}
function rArticles(){
  const arts=DS.articles||[];
  const cnt=document.getElementById('HOME-ART-CNT');if(cnt)cnt.textContent=arts.length;
  const listEl=document.getElementById('ARTICLES-LIST');
  const emptyEl=document.getElementById('ARTICLES-EMPTY');
  if(!listEl)return;
  if(!arts.length){listEl.innerHTML='';if(emptyEl)emptyEl.style.display='flex';return;}
  if(emptyEl)emptyEl.style.display='none';
  listEl.innerHTML=arts.map(a=>{
    const d=new Date(a.date);
    const dt=isNaN(d)?'':d.toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric'})+' — '+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
    const wc=a.body?a.body.trim().split(/\s+/).length:0;
    const snippet=(a.body||'').slice(0,90)+((a.body||'').length>90?'...':'');
    return `<div class="note-card" onclick="openArticleEdit(${a.id})" style="align-items:flex-start">
      ${a.image?`<img alt="" src="${a.image}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0">`:'<div class="note-dot" style="background:#0369a1;margin-top:4px"></div>'}
      <div class="note-body">
        <div class="note-t" style="font-size:13.5px">${escHtml(a.title)}</div>
        <div class="note-s">${snippet}</div>
        <div style="font-size:9.5px;color:var(--mu);font-weight:700;margin-top:4px">${dt} • ${wc} كلمة</div>
      </div>
    </div>`;
  }).join('');
}

// ══ SAVINGS (حصالتي) ══
let _savMode='regular';
function selSavMode(m,el){
  _savMode=m;
  document.querySelectorAll('#M-SAVING .pkg-opt').forEach(e=>e.classList.remove('sel'));
  el.classList.add('sel');
}
function genSavingPlan(target,days,mode){
  const amounts=[];
  if(mode==='regular'){
    const base=Math.floor(target/days);
    for(let i=0;i<days;i++)amounts.push(base);
    amounts[days-1]+=target-amounts.reduce((a,b)=>a+b,0);
  } else {
    const weights=[];
    for(let i=0;i<days;i++)weights.push(0.4+Math.random()*1.2);
    const sumW=weights.reduce((a,b)=>a+b,0);
    for(let i=0;i<days;i++){
      let v=Math.round((weights[i]/sumW*target)/5)*5;
      if(v<5)v=5;
      amounts.push(v);
    }
    const diff=target-amounts.reduce((a,b)=>a+b,0);
    amounts[days-1]=Math.max(5,amounts[days-1]+diff);
  }
  return amounts;
}
function openSavingModal(){
  document.getElementById('SAV-NAME').value='';
  document.getElementById('SAV-DAYS').value='';
  _calcState['SAV-TARGET']='';
  document.getElementById('SAV-TARGET').value='';
  document.getElementById('SAV-CALC').innerHTML=calcBoxHTML('SAV-TARGET');
  _savMode='regular';
  document.querySelectorAll('#M-SAVING .pkg-opt').forEach(e=>e.classList.remove('sel'));
  document.getElementById('sav-mode-regular').classList.add('sel');
  document.getElementById('M-SAVING').classList.add('on');
}
function svSaving(){
  try{
    const name=document.getElementById('SAV-NAME').value.trim();
    const target=calcEval(_calcState['SAV-TARGET']??document.getElementById('SAV-TARGET').value);
    const days=parseInt(document.getElementById('SAV-DAYS').value);
    if(!name){toast('❌ اكتب اسم الحصالة');return;}
    if(!target||target<=0){toast('❌ أدخل مبلغاً مستهدفاً أكبر من صفر (اضغط على خانة المبلغ الأول)');return;}
    if(!days||days<=0){toast('❌ أدخل مدة صحيحة بالأيام');return;}
    const plan=genSavingPlan(target,days,_savMode);
    const sav={id:newId(),name,target,days,mode:_savMode,plan,startDate:localISO(new Date()),checkins:{},createdAt:new Date().toISOString()};
    if(!DS.savings)DS.savings=[];
    DS.savings.push(sav);
    sv();closeM();rSavings();
    if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('savings').doc(String(sav.id)).set(sav).catch(e=>{});
    toast('🐷 تم إنشاء الحصالة');
  }catch(err){
    toast('❌ حصل خطأ: '+(err&&err.message?err.message:'غير معروف'));
  }
}
function savDayIndex(sav){
  const start=new Date(sav.startDate);
  const now=new Date();
  const diff=Math.floor((now-start)/86400000);
  return Math.max(0,Math.min(sav.days-1,diff));
}
function savCollected(sav){
  return Object.keys(sav.checkins||{}).reduce((sum,k)=>{
    const idx=parseInt(k);
    return sum+((sav.plan||[])[idx]||0);
  },0);
}
function rSavings(){
  const savs=DS.savings||[];
  const active=savs.filter(s=>savCollected(s)<s.target);
  const cnt=document.getElementById('HOME-SAV-CNT');if(cnt)cnt.textContent=active.length;
  const totalCollected=savs.reduce((sum,s)=>sum+savCollected(s),0);
  const totalTarget=savs.reduce((sum,s)=>sum+s.target,0);
  const rc=document.getElementById('SAV-RPT-COLLECTED');if(rc)rc.textContent=fmt(totalCollected);
  const rt=document.getElementById('SAV-RPT-TARGET');if(rt)rt.textContent=fmt(totalTarget);
  const listEl=document.getElementById('SAVINGS-LIST');
  const emptyEl=document.getElementById('SAVINGS-EMPTY');
  if(!listEl)return;
  if(!savs.length){listEl.innerHTML='';if(emptyEl)emptyEl.style.display='flex';return;}
  if(emptyEl)emptyEl.style.display='none';
  listEl.innerHTML=savs.map(s=>{
    const collected=savCollected(s);
    const pct=Math.min(100,Math.round(collected/s.target*100));
    const dayIdx=savDayIndex(s);
    const todayAmt=(s.plan||[])[dayIdx]||0;
    const todayDone=!!s.checkins[dayIdx];
    const done=collected>=s.target;
    return `<div class="act-card" onclick="openSavingDetail(${s.id})" style="cursor:pointer">
      <div style="display:flex;align-items:center;gap:.8rem">
        <div style="width:56px;height:56px;border-radius:50%;flex-shrink:0;background:conic-gradient(#9d174d 0% ${pct}%, #fce7f3 ${pct}% 100%);display:flex;align-items:center;justify-content:center">
          <div style="width:42px;height:42px;background:var(--sf);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#9d174d">${pct}%</div>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:800;color:var(--tx)">🐷 ${escHtml(s.name)}${done?' ✅':''}</div>
          <div style="font-size:10.5px;color:var(--mu);margin-top:1px">${fmt(collected)} من ${fmt(s.target)} — ${s.mode==='regular'?'📏 منتظم':'🎲 غير منتظم'}</div>
          ${!done?`<div style="font-size:10.5px;color:${todayDone?'var(--ok)':'var(--warn)'};font-weight:700;margin-top:2px">${todayDone?'✅ اتحط النهاردة':'💰 مبلغ النهاردة: '+fmt(todayAmt)}</div>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
}
function openSavingDetail(id){
  const s=(DS.savings||[]).find(x=>x.id===id);if(!s)return;
  document.getElementById('SAVDET-TITLE').textContent='🐷 '+s.name;
  renderSavingDetailBody(s);
  document.getElementById('M-SAVING-DETAIL').classList.add('on');
}
function renderSavingDetailBody(s){
  const collected=savCollected(s);
  const pct=Math.min(100,Math.round(collected/s.target*100));
  const dayIdx=savDayIndex(s);
  const todayAmt=(s.plan||[])[dayIdx]||0;
  const todayDone=!!s.checkins[dayIdx];
  const remaining=Math.max(0,s.target-collected);
  const daysLeft=Math.max(0,s.days-dayIdx-1);
  document.getElementById('SAVDET-BODY').innerHTML=`
    <div style="display:flex;justify-content:center;margin-bottom:1rem">
      <div style="width:120px;height:120px;border-radius:50%;background:conic-gradient(#9d174d 0% ${pct}%, #fce7f3 ${pct}% 100%);display:flex;align-items:center;justify-content:center">
        <div style="width:94px;height:94px;background:var(--sf);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-size:22px;font-weight:800;color:#9d174d">${pct}%</div>
          <div style="font-size:9px;color:var(--mu);font-weight:700">مكتمل</div>
        </div>
      </div>
    </div>
    <div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.85rem">
      <div class="mcard" style="background:var(--sf2);border-radius:12px;padding:.7rem;text-align:center">
        <div style="font-size:10px;color:var(--mu);font-weight:700">جمعت</div>
        <div style="font-size:14px;font-weight:800;color:var(--ok)">${fmt(collected)}</div>
      </div>
      <div class="mcard" style="background:var(--sf2);border-radius:12px;padding:.7rem;text-align:center">
        <div style="font-size:10px;color:var(--mu);font-weight:700">متبقي</div>
        <div style="font-size:14px;font-weight:800;color:var(--ng)">${fmt(remaining)}</div>
      </div>
    </div>
    ${remaining>0?`
    <div class="act-card" style="margin-bottom:.7rem">
      <div class="act-card-t">📅 مبلغ النهاردة</div>
      <div style="font-size:22px;font-weight:800;color:#9d174d;margin-bottom:.6rem">${fmt(todayAmt)}</div>
      ${todayDone
        ?`<div style="text-align:center;color:var(--ok);font-weight:700;font-size:12px">✅ حطيت المبلغ النهاردة</div>`
        :`<button class="btn btn-p" onclick="checkinSaving(${s.id},${dayIdx})">✅ حطيت المبلغ في الحصالة</button>`}
      <div style="font-size:10.5px;color:var(--mu);margin-top:.6rem;text-align:center">باقي ${daysLeft} يوم على نهاية الحصالة</div>
    </div>`:`<div class="act-card" style="text-align:center;color:var(--ok);font-weight:800;margin-bottom:.7rem">🎉 مبروك! جمعت المبلغ المستهدف بالكامل</div>`}
    <button class="btn btn-ng" onclick="deleteSaving(${s.id})" style="width:100%">🗑 حذف الحصالة</button>
  `;
}
function checkinSaving(id,dayIdx){
  const s=(DS.savings||[]).find(x=>x.id===id);if(!s)return;
  const before=savCollected(s);
  const dayAmt=(s.plan||[])[dayIdx]||0;
  s.checkins[dayIdx]=true;
  sv();renderSavingDetailBody(s);rSavings();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('savings').doc(String(id)).set({checkins:s.checkins},{merge:true}).catch(e=>{});
  const collected=savCollected(s);
  if(s.linkedVaultId){
    const v=(DS.savingsVaults||[]).find(x=>x.id===s.linkedVaultId);
    if(v){
      const now=new Date();
      if(!v.tx)v.tx=[];
      v.tx.unshift({id:newId(),type:'deposit',amount:dayAmt,date:localISO(now),time:now.toTimeString().slice(0,5),note:'من حصالة: '+s.name});
      v.balance+=dayAmt;
      if(!v.history)v.history=[];
      v.history.push({date:localISO(now),balance:v.balance});
      sv();rVaults();
      if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('savingsVaults').doc(String(v.id)).set(v).catch(e=>{});
    }
  }
  if(collected>=s.target){
    notifyUser('🎉 مبروك! جمعت هدف حصالة "'+s.name+'" بالكامل');
    celebrateMilestone(100);
  } else {
    const beforePct=Math.floor(before/s.target*100);
    const afterPct=Math.floor(collected/s.target*100);
    const hit=[25,50,75].find(m=>beforePct<m&&afterPct>=m);
    if(hit){
      notifyUser('🎊 وصلت لـ '+hit+'% من هدف حصالة "'+s.name+'"! كمّل بنفس الروح');
      celebrateMilestone(hit);
    } else {
      toast('✅ تم تسجيل مبلغ النهاردة');
    }
  }
}
function celebrateMilestone(pct){
  const el=document.createElement('div');
  el.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:200;pointer-events:none';
  el.innerHTML=`<div style="font-size:70px;animation:milestonePop .9s ease">${pct>=100?'🏆':'🎉'}</div>`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1000);
}
function deleteSaving(id){
  if(!confirm('حذف الحصالة دي نهائيًا؟'))return;
  DS.savings=(DS.savings||[]).filter(s=>s.id!==id);
  sv();closeM();rSavings();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('savings').doc(String(id)).delete().catch(e=>{});
  toast('🗑 تم حذف الحصالة');
}
const CAT_PALETTE=['#c2542f','#b8790f','#146c43','#7c3aed','#0891b2','#be185d','#65a30d','#0f766e','#9333ea','#b45309'];
function catColorOf(name){
  const idx=(DS.expenseCategories||[]).findIndex(c=>c.name===name);
  return CAT_PALETTE[(idx>=0?idx:0)%CAT_PALETTE.length];
}
function catIconOf(name){
  const c=(DS.expenseCategories||[]).find(x=>x.name===name);
  return c?c.icon:'🗂';
}
let _selectedExpCat='';
function renderExpCatChips(){
  const wrap=document.getElementById('EXP-CAT-CHIPS');
  if(!wrap)return;
  const cats=DS.expenseCategories||[];
  if(!_selectedExpCat&&cats.length)_selectedExpCat=cats[0].name;
  wrap.innerHTML=cats.map(c=>`<div class="cat-chip${c.name===_selectedExpCat?' sel':''}" onclick="selectExpCat(${jsArg(c.name)})">
      <span>${c.icon}</span><span>${escHtml(c.name)}</span>
      <span class="cat-del" onclick="event.stopPropagation();delExpCategory('${c.id}')">✕</span>
    </div>`).join('')+`<div class="cat-chip add-chip" onclick="openAddCategory()">➕ تصنيف جديد</div>`;
}
function selectExpCat(name){_selectedExpCat=name;renderExpCatChips();}
function openAddCategory(){
  document.getElementById('CAT-ICON').value='';
  document.getElementById('CAT-NAME').value='';
  document.getElementById('M-CAT').classList.add('on');
}
function svExpCategory(){
  const icon=document.getElementById('CAT-ICON').value.trim()||'🏷';
  const name=document.getElementById('CAT-NAME').value.trim();
  if(!name){toast('❌ اكتب اسم التصنيف');return;}
  if(!DS.expenseCategories)DS.expenseCategories=[];
  if(DS.expenseCategories.some(c=>c.name===name)){toast('❌ التصنيف ده موجود بالفعل');return;}
  const cat={id:'c'+Date.now(),name,icon};
  DS.expenseCategories.push(cat);
  _selectedExpCat=name;
  sv();closeM();renderExpCatChips();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).set({expenseCategories:DS.expenseCategories},{merge:true}).catch(e=>{});
  toast('✅ تم إضافة التصنيف');
}
function delExpCategory(id){
  if((DS.expenseCategories||[]).length<=1){toast('❌ لازم يفضل تصنيف واحد على الأقل');return;}
  if(!confirm('حذف التصنيف ده؟ المصروفات المسجلة بيه هتفضل زي ما هي.'))return;
  const removed=DS.expenseCategories.find(c=>c.id===id);
  DS.expenseCategories=DS.expenseCategories.filter(c=>c.id!==id);
  if(removed&&_selectedExpCat===removed.name)_selectedExpCat=DS.expenseCategories[0]?.name||'';
  sv();renderExpCatChips();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).set({expenseCategories:DS.expenseCategories},{merge:true}).catch(e=>{});
}
function calcBoxHTML(id){
  return `
    <div class="calc-fnrow">
      <button class="cbtn fn" onclick="calcPress('${id}','C')">C</button>
      <button class="cbtn fn" onclick="calcPress('${id}','DEL')">⌫</button>
      <button class="cbtn fn" onclick="calcPress('${id}','%')">%</button>
    </div>
    <div class="calc-oprow">
      <button class="cbtn op" onclick="calcPress('${id}','÷')">÷</button>
      <button class="cbtn op" onclick="calcPress('${id}','×')">×</button>
      <button class="cbtn op" onclick="calcPress('${id}','−')">−</button>
      <button class="cbtn op" onclick="calcPress('${id}','+')">+</button>
    </div>
    <div class="calc-numgrid">
      <button class="cbtn" onclick="calcPress('${id}','7')">7</button>
      <button class="cbtn" onclick="calcPress('${id}','8')">8</button>
      <button class="cbtn" onclick="calcPress('${id}','9')">9</button>
      <button class="cbtn" onclick="calcPress('${id}','4')">4</button>
      <button class="cbtn" onclick="calcPress('${id}','5')">5</button>
      <button class="cbtn" onclick="calcPress('${id}','6')">6</button>
      <button class="cbtn" onclick="calcPress('${id}','1')">1</button>
      <button class="cbtn" onclick="calcPress('${id}','2')">2</button>
      <button class="cbtn" onclick="calcPress('${id}','3')">3</button>
      <button class="cbtn zero" onclick="calcPress('${id}','0')">0</button>
      <button class="cbtn" onclick="calcPress('${id}','.')">.</button>
    </div>
    <button class="cbtn eq-full" onclick="calcPress('${id}','=')">=</button>`;
}
function focusBudgetField(id){
  document.getElementById('BUDGET-CALC').innerHTML=calcBoxHTML(id);
  document.getElementById('BUDGET-CALC').style.display='block';
}
function toggleBudgetForm(){
  const f=document.getElementById('BUDGET-FORM');
  const isOpen=f.style.display==='block';
  f.style.display=isOpen?'none':'block';
  if(!isOpen){
    _calcState['BUDGET-MONTHLY']=DS.expenseBudget?.monthly?String(DS.expenseBudget.monthly):'';
    _calcState['BUDGET-DAILY']=DS.expenseBudget?.daily?String(DS.expenseBudget.daily):'';
    document.getElementById('BUDGET-MONTHLY').value=_calcState['BUDGET-MONTHLY'];
    document.getElementById('BUDGET-DAILY').value=_calcState['BUDGET-DAILY'];
    document.getElementById('BUDGET-CALC').style.display='none';
    document.getElementById('BUDGET-CALC').innerHTML='';
  }
}
function svBudget(){
  const m=calcEval(_calcState['BUDGET-MONTHLY']??document.getElementById('BUDGET-MONTHLY').value)||null;
  const d=calcEval(_calcState['BUDGET-DAILY']??document.getElementById('BUDGET-DAILY').value)||null;
  DS.expenseBudget={monthly:m,daily:d};
  sv();
  document.getElementById('BUDGET-FORM').style.display='none';
  rExpenses();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).set({expenseBudget:DS.expenseBudget},{merge:true}).catch(e=>{});
  toast('✅ تم حفظ الميزانية');
}
function checkBudgetAlert(kind,over){
  const ym=localYM(new Date());
  const today=localISO(new Date());
  const key=kind+'_'+(kind==='daily'?today:ym);
  if(!DS.budgetAlerts)DS.budgetAlerts={};
  if(over && !DS.budgetAlerts[key]){
    DS.budgetAlerts[key]=true;sv();
    const s=suggestExpenseCut();
    notifyUser('⚠️ تجاوزت ميزانية '+(kind==='daily'?'اليوم':'الشهر')+'!'+(s?' اقتراح: قلّل مصروفات "'+s+'" الشهر الجاي.':''));
  } else if(!over && DS.budgetAlerts[key]){
    delete DS.budgetAlerts[key];sv();
  }
}
function suggestExpenseCut(){
  const ym=localYM(new Date());
  const m=(DS.expenses||[]).filter(e=>(e.date||'').slice(0,7)===ym);
  if(!m.length)return null;
  const c={};m.forEach(e=>{c[e.category]=(c[e.category]||0)+e.amount;});
  return Object.keys(c).sort((a,b)=>c[b]-c[a])[0]||null;
}
function renderBudgetDisplay(monthSpent,todaySpent){
  const el=document.getElementById('BUDGET-DISPLAY');
  if(!el)return;
  const b=DS.expenseBudget||{};
  if(!b.monthly&&!b.daily){
    el.innerHTML='<div style="font-size:11.5px;color:var(--mu);text-align:center;padding:.4rem 0">مفيش ميزانية محددة — اضغط "تعديل" فوق عشان تحدد ميزانيتك</div>';
    return;
  }
  let html='';
  if(b.monthly){
    const pct=Math.min(100,Math.round(monthSpent/b.monthly*100));
    const remain=b.monthly-monthSpent;
    const over=remain<0;
    html+=`<div class="budget-row">
      <div class="budget-lb"><span>📅 الشهر</span><span style="color:${over?'var(--ng)':'var(--tx2)'}">${over?'تجاوزت بـ '+fmt(Math.abs(remain)):'متبقي '+fmt(remain)}</span></div>
      <div class="budget-bar-bg"><div class="budget-bar-fill" style="width:${pct}%;background:${over?'var(--ng)':'var(--pr)'}"></div></div>
    </div>`;
    checkBudgetAlert('monthly',over);
  }
  if(b.daily){
    const pct=Math.min(100,Math.round(todaySpent/b.daily*100));
    const remain=b.daily-todaySpent;
    const over=remain<0;
    html+=`<div class="budget-row">
      <div class="budget-lb"><span>☀️ اليوم</span><span style="color:${over?'var(--ng)':'var(--tx2)'}">${over?'تجاوزت بـ '+fmt(Math.abs(remain)):'متبقي '+fmt(remain)}</span></div>
      <div class="budget-bar-bg"><div class="budget-bar-fill" style="width:${pct}%;background:${over?'var(--ng)':'var(--warn)'}"></div></div>
    </div>`;
    checkBudgetAlert('daily',over);
  } else if(b.monthly){
    const now=new Date();
    const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
    const daysLeft=Math.max(1,daysInMonth-now.getDate()+1);
    const remain=b.monthly-monthSpent;
    const suggested=Math.max(0,remain/daysLeft);
    html+=`<div class="budget-row" style="background:var(--sf2);border-radius:10px;padding:.6rem .7rem">
      <div style="font-size:10.5px;color:var(--mu);font-weight:700;margin-bottom:2px">💡 مقترح تلقائيًا حسب الأيام المتبقية (${daysLeft} يوم)</div>
      <div style="font-size:14px;font-weight:800;color:var(--pr)">${fmt(suggested)} في اليوم</div>
    </div>`;
  }
  el.innerHTML=html;
  const ym=localYM(new Date());
  const unpaidRecur=(DS.recurringExpenses||[]).filter(r=>r.lastPaidMonth!==ym).reduce((s,r)=>s+r.amount,0);
  if(unpaidRecur>0){
    el.innerHTML+=`<div style="font-size:10.5px;color:var(--warn);font-weight:700;margin-top:.5rem;text-align:center">📌 عندك ${fmt(unpaidRecur)} مصروفات ثابتة لسه مستحقة الشهر ده ومش محسوبة في المصروف الفعلي لحد ما تدفعها</div>`;
  }
}
function openExpModal(){
  renderExpCatChips();
  document.getElementById('EXP-NOTE').value='';
  document.getElementById('EXP-DATE').value=localISO(new Date());
  _calcState['EXP-AM']='';document.getElementById('EXP-AM').value='';
  document.getElementById('M-EXP').classList.add('on');
}
function svExpense(){
  const amt=calcEval(_calcState['EXP-AM']??document.getElementById('EXP-AM').value);
  if(!amt||amt<=0){toast('❌ أدخل مبلغاً أكبر من صفر');return;}
  if(!_selectedExpCat){toast('❌ اختار تصنيف');return;}
  const note=document.getElementById('EXP-NOTE').value.trim();
  const date=document.getElementById('EXP-DATE').value||localISO(new Date());
  const time=new Date().toTimeString().slice(0,5);
  const exp={id:newId(),category:_selectedExpCat,note,date,time,amount:amt};
  if(!DS.expenses)DS.expenses=[];
  DS.expenses.unshift(exp);
  sv();closeM();rExpenses();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('expenses').doc(String(exp.id)).set(exp).catch(e=>{});
  toast('✅ تم تسجيل المصروف');
}
let _editingRecurId=null;
function openRecurModal(){
  _editingRecurId=null;
  document.getElementById('RECUR-MODAL-TITLE').textContent='📌 مصروف ثابت جديد';
  document.getElementById('RECUR-NAME').value='';
  document.getElementById('RECUR-DAY').value='';
  _calcState['RECUR-AMOUNT']='';
  document.getElementById('RECUR-AMOUNT').value='';
  document.getElementById('RECUR-CALC').innerHTML=calcBoxHTML('RECUR-AMOUNT');
  document.getElementById('RECUR-DEL-BTN').style.display='none';
  document.getElementById('M-RECUR').classList.add('on');
}
function openRecurEdit(id){
  const r=(DS.recurringExpenses||[]).find(x=>x.id===id);if(!r)return;
  _editingRecurId=id;
  document.getElementById('RECUR-MODAL-TITLE').textContent='✏️ تعديل مصروف ثابت';
  document.getElementById('RECUR-NAME').value=r.name;
  document.getElementById('RECUR-DAY').value=r.dueDay;
  _calcState['RECUR-AMOUNT']=String(r.amount);
  document.getElementById('RECUR-AMOUNT').value=String(r.amount);
  document.getElementById('RECUR-CALC').innerHTML=calcBoxHTML('RECUR-AMOUNT');
  document.getElementById('RECUR-DEL-BTN').style.display='block';
  document.getElementById('M-RECUR').classList.add('on');
}
function svRecur(){
  const name=document.getElementById('RECUR-NAME').value.trim();
  const amount=calcEval(_calcState['RECUR-AMOUNT']??document.getElementById('RECUR-AMOUNT').value);
  const day=parseInt(document.getElementById('RECUR-DAY').value);
  if(!name){toast('❌ اكتب اسم المصروف');return;}
  if(!amount||amount<=0){toast('❌ أدخل مبلغاً أكبر من صفر');return;}
  if(!day||day<1||day>31){toast('❌ أدخل يوم استحقاق صحيح (1-31)');return;}
  if(_editingRecurId){
    const r=(DS.recurringExpenses||[]).find(x=>x.id===_editingRecurId);
    if(r){r.name=name;r.amount=amount;r.dueDay=day;}
    if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('recurringExpenses').doc(String(_editingRecurId)).set(r).catch(e=>{});
  } else {
    const r={id:newId(),name,amount,dueDay:day,lastPaidMonth:null};
    if(!DS.recurringExpenses)DS.recurringExpenses=[];
    DS.recurringExpenses.push(r);
    if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('recurringExpenses').doc(String(r.id)).set(r).catch(e=>{});
  }
  _editingRecurId=null;
  sv();closeM();rRecur();
  toast('✅ تم الحفظ');
}
function deleteCurrentRecur(){
  if(!_editingRecurId)return;
  if(!confirm('حذف المصروف الثابت ده؟'))return;
  DS.recurringExpenses=(DS.recurringExpenses||[]).filter(r=>r.id!==_editingRecurId);
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('recurringExpenses').doc(String(_editingRecurId)).delete().catch(e=>{});
  _editingRecurId=null;
  sv();closeM();rRecur();
  toast('🗑 تم الحذف');
}
function markRecurPaid(id){
  const r=(DS.recurringExpenses||[]).find(x=>x.id===id);if(!r)return;
  const now=new Date();const ym=localYM(now);
  const exp={id:newId(),category:'مصروفات ثابتة',note:r.name,date:localISO(now),time:now.toTimeString().slice(0,5),amount:r.amount};
  if(!DS.expenses)DS.expenses=[];
  DS.expenses.unshift(exp);
  r.lastPaidMonth=ym;
  sv();rExpenses();
  if(FB_READY&&DS.uid){
    db.collection('users').doc(DS.uid).collection('expenses').doc(String(exp.id)).set(exp).catch(e=>{});
    db.collection('users').doc(DS.uid).collection('recurringExpenses').doc(String(id)).set({lastPaidMonth:ym},{merge:true}).catch(e=>{});
  }
  toast('✅ تم تسجيل الدفع');
}
function rRecur(){
  const recurs=DS.recurringExpenses||[];
  const now=new Date();const ym=localYM(now);const today=now.getDate();
  const listEl=document.getElementById('RECUR-LIST');
  const emptyEl=document.getElementById('RECUR-EMPTY');
  if(!listEl)return;
  let unpaidTotal=0;
  if(!recurs.length){listEl.innerHTML='';if(emptyEl)emptyEl.style.display='block';const t=document.getElementById('RECUR-UNPAID-TOTAL');if(t)t.textContent=fmt(0);return;}
  if(emptyEl)emptyEl.style.display='none';
  listEl.innerHTML=recurs.map(r=>{
    const paidThisMonth=r.lastPaidMonth===ym;
    if(!paidThisMonth)unpaidTotal+=r.amount;
    const overdue=!paidThisMonth&&today>r.dueDay;
    const statusHtml=paidThisMonth
      ?`<span style="font-size:9.5px;color:var(--ok);font-weight:700">✅ اتدفع الشهر ده</span>`
      :overdue?`<span style="font-size:9.5px;color:var(--ng);font-weight:700">⚠ متأخر — كان مستحق يوم ${r.dueDay}</span>`
      :`<span style="font-size:9.5px;color:var(--warn);font-weight:700">⏳ مستحق يوم ${r.dueDay}</span>`;
    return `<div style="display:flex;align-items:center;gap:.6rem;padding:.55rem 0;border-bottom:1px solid var(--bd)">
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;font-weight:700;color:var(--tx)">${escHtml(r.name)}</div>
        <div style="margin-top:2px">${statusHtml}</div>
      </div>
      <div style="font-size:12.5px;font-weight:800;color:var(--tx2);cursor:pointer" onclick="openRecurEdit(${r.id})">${fmt(r.amount)} ✏️</div>
      ${!paidThisMonth?`<button class="btn btn-p btn-sm" onclick="markRecurPaid(${r.id})" style="width:auto;padding:.35rem .6rem;font-size:10px">✅ تم الدفع</button>`:''}
    </div>`;
  }).join('');
  const t=document.getElementById('RECUR-UNPAID-TOTAL');if(t)t.textContent=fmt(unpaidTotal);
}
function delExpense(id){
  if(!confirm('حذف المصروف ده؟'))return;
  DS.expenses=(DS.expenses||[]).filter(x=>x.id!==id);
  sv();rExpenses();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('expenses').doc(String(id)).delete().catch(e=>{});
  toast('🗑 تم الحذف');
}
function rExpenses(){
  const exps=DS.expenses||[];
  const now=new Date();const ym=localYM(now);
  const thisMonth=exps.filter(e=>(e.date||'').slice(0,7)===ym);
  const total=thisMonth.reduce((s,e)=>s+e.amount,0);
  const totalEl=document.getElementById('EXP-TOTAL');if(totalEl)totalEl.textContent=fmt(total);
  const hc=document.getElementById('HOME-EXP-CNT');if(hc)hc.textContent=thisMonth.length;
  const ht=document.getElementById('HOME-EXP-TOTAL');if(ht)ht.textContent=fmt(total);
  const todayStr=localISO(now);
  const todaySpent=exps.filter(e=>e.date===todayStr).reduce((s,e)=>s+e.amount,0);
  renderBudgetDisplay(total,todaySpent);
  rRecur();
  // 6-month trend chart
  const chartWrap=document.getElementById('EXP-CHART-WRAP');
  if(chartWrap){
    const months=[];
    for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({ym:localYM(d),lb:d.toLocaleDateString('ar-EG',{month:'short'})});}
    const sums=months.map(m=>exps.filter(e=>(e.date||'').slice(0,7)===m.ym).reduce((s,e)=>s+e.amount,0));
    const maxV=Math.max(...sums,1);
    const w=300,h=90,stepX=(w-40)/(months.length-1);
    const pts=sums.map((v,i)=>{const x=20+i*stepX;const y=85-(v/maxV*70);return{x,y};});
    const line=pts.map(p=>`${p.x},${p.y}`).join(' ');
    const area=line+` ${pts[pts.length-1].x},85 ${pts[0].x},85`;
    document.getElementById('EXP-CHART-SVG').innerHTML=`
      <polygon points="${area}" fill="var(--ng)" opacity=".15"/>
      <polyline points="${line}" fill="none" stroke="var(--ng)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--ng)"/>`).join('')}`;
    document.getElementById('EXP-CHART-LBS').innerHTML=months.map(m=>`<span>${m.lb}</span>`).join('');
  }
  // category breakdown
  const catMap={};
  thisMonth.forEach(e=>{catMap[e.category]=(catMap[e.category]||0)+e.amount;});
  const catsWrap=document.getElementById('EXP-CATS-WRAP');
  const catsEl=document.getElementById('EXP-CATS');
  if(Object.keys(catMap).length&&catsWrap&&catsEl){
    catsWrap.style.display='block';
    const maxV=Math.max(...Object.values(catMap));
    catsEl.innerHTML=Object.keys(catMap).map(c=>{
      const v=catMap[c];const pct=maxV?Math.round(v/maxV*100):0;
      return `<div style="display:flex;align-items:center;gap:.6rem;padding:.4rem 0">
        <div style="font-size:15px">${catIconOf(c)}</div>
        <div style="flex:1"><div style="font-size:11.5px;font-weight:700;color:var(--tx)">${c}</div>
        <div style="background:var(--bd);border-radius:4px;height:5px;margin-top:4px;overflow:hidden"><div style="height:100%;border-radius:4px;width:${pct}%;background:${catColorOf(c)}"></div></div></div>
        <div style="font-size:11px;font-weight:800;color:var(--tx2)">${fmt(v)}</div>
      </div>`;
    }).join('');
  } else if(catsWrap){catsWrap.style.display='none';}
  // recent list
  const listEl=document.getElementById('EXP-LIST');
  const emptyEl=document.getElementById('EXP-EMPTY');
  if(!exps.length){if(listEl)listEl.innerHTML='';if(emptyEl)emptyEl.style.display='flex';return;}
  if(emptyEl)emptyEl.style.display='none';
  if(listEl){
    // حساب إجمالي مصروفات الشهر تراكميًا قبل/بعد كل مصروف (بالترتيب الزمني)
    const chronoExp=[...exps].filter(e=>(e.date||'').slice(0,7)===ym).sort((a,b)=>{
      const da=new Date(a.date+'T'+(a.time||'00:00'));
      const db=new Date(b.date+'T'+(b.time||'00:00'));
      return da-db||a.id-b.id;
    });
    let runningExp=0;const expBalMap={};
    chronoExp.forEach(e=>{
      const before=runningExp;runningExp+=e.amount;expBalMap[e.id]={before,after:runningExp};
    });
    listEl.innerHTML='<div class="act-card-t" style="margin:0 .1rem .5rem">🧾 آخر المصروفات</div>'+exps.slice(0,20).map(e=>{
      const dt=e.date?new Date(e.date).toLocaleDateString('ar-EG',{day:'numeric',month:'short'}):'';
      const bm=expBalMap[e.id];
      const cumLine=bm?`<div style="font-size:9.5px;color:var(--mu);margin-top:2px">إجمالي الشهر: ${fmt(bm.before)} ← ${fmt(bm.after)}</div>`:'';
      return `<div class="note-card" onclick="delExpense(${e.id})">
        <div class="note-dot" style="background:${catColorOf(e.category)}"></div>
        <div class="note-body">
          <div class="note-t">${escHtml(e.note||e.category)}</div>
          <div class="note-s">${escHtml(e.category)}</div>
          ${cumLine}
        </div>
        <div class="note-meta" style="color:var(--ng);font-weight:800">-${fmt(e.amount)}<br>${dt}${e.time?' '+e.time:''}</div>
        <div class="del-x">✕</div>
      </div>`;
    }).join('');
  }
}

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

// ══ NAVIGATION ══
const TABS=['home','dash','add','reports','settings','profile','expenses','daily','notes','articles','savings','vaults'];
function goTab(t){
  TABS.forEach(id=>{
    const e=document.getElementById('TB-'+id);if(e)e.style.display='none';
    const n=document.getElementById('NV-'+id);if(n)n.classList.remove('on');
  });
  const e=document.getElementById('TB-'+t);if(e){e.style.display='flex';e.style.flexDirection='column';}
  const n=document.getElementById('NV-'+t);if(n)n.classList.add('on');
  if(t==='dash')rAll();if(t==='home'){rSum();rNotes();rExpenses();rTasks();rArticles();rSavings();rVaults();}if(t==='reports')rRpt();if(t==='profile'){updProf();loadMySupport();}if(t==='notes')rNotes();if(t==='expenses')rExpenses();if(t==='daily'){rTasks();rOccasions();rMeds();rDoctors();rAppts();}if(t==='settings'){renderNavChoices();renderNotifPrefs();}if(t==='articles')rArticles();if(t==='savings')rSavings();if(t==='vaults')rVaults();
  if(t==='add'){const b=document.getElementById('PICK-CONTACT-BTN');if(b)b.style.display=('contacts' in navigator && 'ContactsManager' in window)?'block':'none';}
}
function goBack(){showScr('SCR-main');}
function goDet(id){DS.curID=id;showScr('SCR-det');rDet();}

// ══ RENDER ══
function fmt(n,sg=false){const a=Math.abs(n).toLocaleString('ar-EG',{minimumFractionDigits:0,maximumFractionDigits:2});return a+' ج';}
function ini(name){return name.trim().split(' ').map(w=>w[0]).slice(0,2).join('');}

function rAll(){rSum();rCL();}
function rSum(){
  const h=DS.balH;
  const ti=DS.contacts.reduce((a,c)=>a+(c.balance>0?c.balance:0),0);
  const to=Math.abs(DS.contacts.reduce((a,c)=>a+(c.balance<0?c.balance:0),0));
  const net=ti-to;
  document.getElementById('H-BAL').textContent=h?'••••••':fmt(net,true);
  const heroCard=document.getElementById('HERO-CARD');
  if(heroCard)heroCard.style.background=net>=0?'linear-gradient(135deg,#c2542f,#8a3a1f)':'linear-gradient(135deg,var(--pr),var(--pr-dk))';
  document.getElementById('H-SUB').textContent=net>=0?'✅ أخذت أكتر مما أعطيت':'⚠ أعطيت أكتر مما أخذت';
  document.getElementById('H-IN').textContent=h?'••••':fmt(ti);
  document.getElementById('H-OUT').textContent=h?'••••':fmt(to);
  document.getElementById('H-CNT').textContent=DS.contacts.length;
  const hc=document.getElementById('HOME-CNT');if(hc)hc.textContent=DS.contacts.length;
  const hn=document.getElementById('HOME-NET');
  if(hn){hn.textContent=h?'••••':fmt(net,true);hn.style.color=net>=0?'var(--ng)':'var(--ok)';}
  // Donut chart (أخذت أحمر — أعطيت أخضر)
  const donut=document.getElementById('TX-DONUT');
  if(donut){
    const totalAbs=ti+to;
    const pctIn=totalAbs?Math.round(ti/totalAbs*100):0;
    donut.style.background=`conic-gradient(var(--ng) 0% ${pctIn}%, var(--ok) ${pctIn}% 100%)`;
    const pctEl=document.getElementById('TX-DONUT-PCT');if(pctEl)pctEl.textContent=pctIn+'%';
    const inEl=document.getElementById('TX-DONUT-IN');if(inEl)inEl.textContent=h?'••••':fmt(ti);
    const outEl=document.getElementById('TX-DONUT-OUT');if(outEl)outEl.textContent=h?'••••':fmt(to);
  }
}
async function pickDeviceContact(){
  try{
    const contacts=await navigator.contacts.select(['name','tel'],{multiple:false});
    if(contacts&&contacts.length){
      const c=contacts[0];
      if(c.name&&c.name[0])document.getElementById('CT-N').value=c.name[0];
      if(c.tel&&c.tel[0])document.getElementById('CT-PH').value=c.tel[0].replace(/\s+/g,'');
      toast('✅ تم استدعاء البيانات');
    }
  }catch(e){toast('❌ تعذر الوصول لجهات الاتصال');}
}
function sortContacts(list){
  const mode=DS.sortMode||'debt-desc';
  if(mode==='name-asc')return list.sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  if(mode==='name-desc')return list.sort((a,b)=>b.name.localeCompare(a.name,'ar'));
  if(mode==='debt-asc')return list.sort((a,b)=>Math.abs(a.balance)-Math.abs(b.balance));
  return list.sort((a,b)=>Math.abs(b.balance)-Math.abs(a.balance));
}
function toggleSortMenu(){
  const m=document.getElementById('SORT-MENU');
  if(!m)return;
  m.style.display=m.style.display==='none'?'block':'none';
}
function applySort(mode){
  DS.sortMode=mode;
  sv();
  document.querySelectorAll('#SORT-MENU .sort-opt').forEach(e=>e.classList.remove('sel'));
  const el=document.getElementById('sort-'+mode);if(el)el.classList.add('sel');
  document.getElementById('SORT-MENU').style.display='none';
  rCL();
}
function rCL(){
  const q=(document.getElementById('SRCH')||{}).value?.trim().toLowerCase()||'';
  let list=DS.contacts.filter(c=>{
    if(q&&!c.name.toLowerCase().includes(q)&&!(c.phone||'').includes(q))return false;
    if(DS.filt==='customer')return c.type==='customer';
    if(DS.filt==='supplier')return c.type==='supplier';
    if(DS.filt==='pos')return c.balance>0;
    if(DS.filt==='neg')return c.balance<0;
    if(DS.filt==='zero')return c.balance===0;
    return true;
  });
  list=sortContacts(list);
  const el=document.getElementById('CL');
  const ct=document.getElementById('LST-CT');if(ct)ct.textContent=list.length+' جهة';
  if(!list.length){el.innerHTML='<div class="empty"><span class="empty-ic">🔍</span><div class="empty-t">لا توجد نتائج</div><div class="empty-s">أضف جهة جديدة من زرار ＋</div></div>';return;}
  el.innerHTML=list.map(c=>{
    const h=DS.balH;
    const clr=AV_COLORS[DS.avColor||1];
    const amc=c.balance>0?'an':c.balance<0?'ap':'az';
    const dir=c.balance>0?'↑ أخذت':c.balance<0?'↓ أعطيت':'⚖ تسوية';
    const tbc=c.type==='customer'?'tbg-c':'tbg-s';
    return `<div class="cc-row" onclick="goDet(${c.id})">
      <div class="av" style="background:${c.type==='supplier'?'#fee2e2':'#d1fae5'};color:${c.type==='supplier'?'#991b1b':'#065f46'}">${escHtml(ini(c.name))}</div>
      <div class="ci">
        <div class="cn">${escHtml(c.name)}</div>
        <div class="cm"><span class="tbg ${tbc}">${c.type==='customer'?'عميل':'مورد'}</span>${c.company?'• '+c.company:''} • ${(c.tx||[]).length} معاملة</div>
      </div>
      <div class="ca">
        <div class="${h?'ah':amc}">${h?'•••':fmt(c.balance,true)}</div>
        <div class="ad">${h?'':dir}</div>
      </div>
    </div>`;
  }).join('');
}
function setF(f,el){
  DS.filt=f;
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  const titles={all:'جميع جهات الاتصال',customer:'العملاء',supplier:'الموردون',pos:'ديون لي',neg:'ديون عليّ',zero:'حسابات مسواة'};
  const t=document.getElementById('LST-T');if(t)t.textContent=titles[f]||'';
  rCL();
}
function focusSrch(){const e=document.getElementById('SRCH');if(e)e.focus();}

function rDet(){
  const c=DS.contacts.find(x=>x.id==DS.curID);if(!c)return;
  document.getElementById('DT-T').textContent=c.name;
  document.getElementById('DT-S').textContent=c.phone||c.company||'';
  document.getElementById('BHN').textContent=c.type==='customer'?'عميل':'مورد';
  const h=DS.balH;
  document.getElementById('BHA').textContent=h?'••••••':fmt(c.balance,true);
  document.getElementById('BHT').textContent=c.balance>0?'✅ أخذت منه':c.balance<0?'⚠ أعطيت له':'⚖ تسوية';
  const bhCard=document.getElementById('BH-CARD');
  if(bhCard)bhCard.style.background=c.balance>0?'linear-gradient(135deg,#c2542f,#8a3a1f)':'linear-gradient(135deg,var(--pr),var(--pr-dk))';
  const sorted=[...(c.tx||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
  // حساب الرصيد قبل وبعد كل معاملة (بالترتيب الزمني الصحيح)
  const chrono=[...(c.tx||[])].sort((a,b)=>{
    const da=new Date(a.date+'T'+(a.time||'00:00'));
    const db=new Date(b.date+'T'+(b.time||'00:00'));
    return da-db||a.id-b.id;
  });
  let running=0;const balMap={};
  chrono.forEach(tx=>{
    const before=running;
    running+=txEffect(tx);
    balMap[tx.id]={before,after:running};
  });
  const el=document.getElementById('TX-LST');
  if(!sorted.length){el.innerHTML='<div class="empty"><span class="empty-ic">📋</span><div class="empty-t">لا توجد معاملات بعد</div><div class="empty-s">اضغط "+ إضافة"</div></div>';return;}
  let ld='';
  el.innerHTML=sorted.map(tx=>{
    let dh='';
    if(tx.date!==ld){ld=tx.date;const d=new Date(tx.date);dh=`<div class="tx-dg">📅 ${AD[d.getDay()]} ${d.getDate()} ${AM[d.getMonth()]} ${d.getFullYear()}</div>`;}
    const dirColor=tx.type==='in'?'var(--ng)':'var(--ok)';
    const arrow=tx.type==='in'?'↑':'↓';
    const lb=tx.type==='in'?'أخذت':'أعطيت';
    const bm=balMap[tx.id]||{before:0,after:0};
    return `${dh}<div class="tx-item" onclick="openTXEdit(${tx.id})" style="cursor:pointer">
      <div class="tx-ic" style="background:${tx.type==='in'?'var(--ng-bg)':'var(--ok-bg)'};color:${dirColor}">${arrow}</div>
      <div class="tx-b">
        <div class="tx-n">${escHtml(tx.note||'معاملة')}</div>
        <div class="tx-d">${tx.date}${tx.time?' — '+tx.time:''}</div>
        <div style="display:inline-flex;align-items:center;gap:3px;font-size:9px;color:var(--mu);font-weight:700;margin-top:3px;background:var(--sf2);border-radius:8px;padding:1px 6px">💰 الرصيد بعدها: ${fmt(bm.after)}</div>
      </div>
      <div style="text-align:left;flex-shrink:0">
        <div class="tx-a" style="color:${dirColor}">${fmt(tx.amount)}</div>
        <div class="tx-a-lb" style="color:${dirColor}">${lb}</div>
      </div>
    </div>`;
  }).join('');
}

function rRpt(){
  const ti=DS.contacts.reduce((a,c)=>a+(c.balance>0?c.balance:0),0);
  const to=Math.abs(DS.contacts.reduce((a,c)=>a+(c.balance<0?c.balance:0),0));
  const net=ti-to;const tt=DS.contacts.reduce((a,c)=>a+(c.tx||[]).length,0);
  document.getElementById('RPT-SG').innerHTML=`
    <div class="sc"><div class="sc-l">📥 أخذت</div><div class="sc-v" style="color:var(--ng)">${fmt(ti,true)}</div><div class="sc-s">${DS.contacts.filter(c=>c.type==='customer').length} عميل</div></div>
    <div class="sc"><div class="sc-l">📤 أعطيت</div><div class="sc-v" style="color:var(--ok)">${fmt(to,true)}</div><div class="sc-s">${DS.contacts.filter(c=>c.type==='supplier').length} مورد</div></div>
    <div class="sc"><div class="sc-l">📊 صافي الرصيد</div><div class="sc-v" style="color:${net>=0?'var(--ng)':'var(--ok)'}">${fmt(net,true)}</div><div class="sc-s">${net>=0?'لصالحك':'عليك'}</div></div>
    <div class="sc"><div class="sc-l">🔢 المعاملات</div><div class="sc-v">${tt}</div><div class="sc-s">${DS.contacts.length} جهة</div></div>`;
  const top=[...DS.contacts].sort((a,b)=>Math.abs(b.balance)-Math.abs(a.balance)).slice(0,5);
  document.getElementById('TOP-L').innerHTML=top.map(c=>{
    const amc=c.balance>0?'an':c.balance<0?'ap':'az';
    return `<div class="cc-row" onclick="goDet(${c.id})"><div class="av" style="background:${c.type==='supplier'?'#fee2e2':'#d1fae5'};color:${c.type==='supplier'?'#991b1b':'#065f46'}">${escHtml(ini(c.name))}</div><div class="ci"><div class="cn">${escHtml(c.name)}</div><div class="cm">${c.type==='customer'?'عميل':'مورد'}</div></div><div class="ca"><div class="${amc}">${fmt(c.balance,true)}</div></div></div>`;
  }).join('');
}

// ══ ACTIONS ══
let _ctType='customer';
function setCT(t){_ctType=t;document.getElementById('OC').className='ty-o'+(t==='customer'?' ok':'');document.getElementById('OS').className='ty-o'+(t==='supplier'?' ng':'');}
function svCT(){
  const name=document.getElementById('CT-N').value.trim();
  if(!name){toast('❌ أدخل الاسم');return;}
  const ph=document.getElementById('CT-PH').value.trim();
  const co=document.getElementById('CT-CO').value.trim();
  const nt=document.getElementById('CT-NT').value.trim();
  const contact={id:newId(),name,type:_ctType,phone:ph,company:co,note:nt,balance:0,tx:[]};
  DS.contacts.push(contact);
  ['CT-N','CT-PH','CT-CO','CT-NT'].forEach(id=>document.getElementById(id).value='');
  sv();saveToCloud(contact);toast('✅ تم حفظ '+name+' ☁');goTab('dash');
}
let _ttType='in';
function openTX(t){
  _ttType=t||'in';setTT(_ttType);
  _editingTxId=null;
  document.getElementById('TX-DEL-BTN').style.display='none';
  _calcState['TX-AM']='';
  document.getElementById('TX-AM').value='';
  document.getElementById('TX-NT').value='';
  document.getElementById('TX-DT').value=localISO(new Date());
  document.getElementById('M-TX').classList.add('on');
}
function setTT(t){
  _ttType=t;
  const ttl=document.getElementById('TX-MODAL-TITLE');
  if(ttl){
    ttl.textContent=t==='in'?'📥 تسجيل أخذت':'📤 تسجيل أعطيت';
    ttl.style.color=t==='in'?'var(--ng)':'var(--ok)';
  }
}

// ══ CALCULATOR (تظهر بس لما تدوس على خانة المبلغ) ══
const _calcState={};
function calcEval(e){
  const safe=(e||'').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
  if(!/^[0-9+\-*/. ]+$/.test(safe)||safe==='')return null;
  try{const r=Function('"use strict";return('+safe+')')();return Math.round(r*100)/100;}catch(err){return null;}
}
function calcPress(inputId,key){
  const inp=document.getElementById(inputId);
  let cur=_calcState[inputId]??'';
  if(key==='C'){cur='';}
  else if(key==='DEL'){cur=cur.slice(0,-1);}
  else if(key==='='){const v=calcEval(cur);if(v!==null)cur=String(v);}
  else if(key==='%'){const v=calcEval(cur);if(v!==null)cur=String(v/100);}
  else if(['+','−','×','÷'].includes(key)){
    if(cur==='')return;
    const last=cur.trim().slice(-1);
    if(['+','−','×','÷'].includes(last))cur=cur.slice(0,-1)+key;else cur+=key;
  } else {
    if(key==='.'){const parts=cur.split(/[+\-×÷]/);if(parts[parts.length-1].includes('.'))return;}
    cur+=key;
  }
  _calcState[inputId]=cur;
  inp.value=cur;
}
function txEffect(tx){return tx.type==='in'?tx.amount:-tx.amount;}
let _editingTxId=null;
function openTXEdit(id){
  const c=DS.contacts.find(x=>x.id==DS.curID);if(!c)return;
  const tx=(c.tx||[]).find(t=>t.id===id);if(!tx)return;
  _editingTxId=id;
  _ttType=tx.type;
  const ttl=document.getElementById('TX-MODAL-TITLE');
  if(ttl){ttl.textContent=tx.type==='in'?'✏️ تعديل معاملة أخذت':'✏️ تعديل معاملة أعطيت';ttl.style.color=tx.type==='in'?'var(--ng)':'var(--ok)';}
  document.getElementById('TX-NT').value=tx.note||'';
  document.getElementById('TX-DT').value=tx.date||localISO(new Date());
  _calcState['TX-AM']=String(tx.amount);
  document.getElementById('TX-AM').value=String(tx.amount);
  document.getElementById('TX-DEL-BTN').style.display='block';
  document.getElementById('M-TX').classList.add('on');
}
function deleteCurrentTX(){
  if(!_editingTxId)return;
  if(!confirm('حذف المعاملة دي؟'))return;
  const c=DS.contacts.find(x=>x.id==DS.curID);if(!c)return;
  const tx=(c.tx||[]).find(t=>t.id===_editingTxId);
  if(tx){c.balance-=txEffect(tx);c.tx=c.tx.filter(t=>t.id!==_editingTxId);}
  _editingTxId=null;
  closeM();sv();saveToCloud(c);rDet();rSum();toast('🗑 تم حذف المعاملة');
}
function svTX(){
  const raw=_calcState['TX-AM']??document.getElementById('TX-AM').value;
  const amt=calcEval(raw);
  if(!amt||amt<=0){toast('❌ أدخل مبلغاً أكبر من صفر');return;}
  const nt=document.getElementById('TX-NT').value.trim()||'معاملة';
  const dt=document.getElementById('TX-DT').value||localISO(new Date());
  const tm=new Date().toTimeString().slice(0,5);
  const c=DS.contacts.find(x=>x.id==DS.curID);if(!c)return;
  if(!c.tx)c.tx=[];
  if(_editingTxId){
    const tx=c.tx.find(t=>t.id===_editingTxId);
    if(tx){
      c.balance-=txEffect(tx);
      tx.type=_ttType;tx.amount=amt;tx.note=nt;tx.date=dt;tx.time=tm;
      c.balance+=txEffect(tx);
    }
    _editingTxId=null;
  } else {
    c.tx.push({id:newId(),type:_ttType,amount:amt,note:nt,date:dt,time:tm});
    c.balance+=_ttType==='in'?amt:-amt;
  }
  closeM();sv();saveToCloud(c);rDet();rSum();toast('✅ تم الحفظ والمزامنة ☁');
}
function delCT(){document.getElementById('M-DEL').classList.add('on');}
function cfDel(){const id=DS.curID;DS.contacts=DS.contacts.filter(c=>c.id!=id);sv();deleteFromCloud(id);closeM();goBack();rAll();toast('🗑 تم الحذف');}
function callCT(){const c=DS.contacts.find(x=>x.id==DS.curID);if(c?.phone){toast('📞 '+c.phone);setTimeout(()=>{window.location.href='tel:'+c.phone;},500);}else toast('لا يوجد رقم هاتف');}
function closeM(){
  document.querySelectorAll('.back').forEach(b=>b.classList.remove('on'));
  if(_artListening&&_artRecognition){_artListening=false;_artRecognition.stop();const btn=document.getElementById('ART-MIC-BTN');if(btn){btn.textContent='🎙️ الكتابة بالصوت';btn.style.color='var(--pr)';}}
}
document.querySelectorAll('.back').forEach(b=>b.addEventListener('click',e=>{if(e.target===b)closeM();}));

// ══ SETTINGS ACCORDION ══
function toggleSection(id){
  const body = document.getElementById(id);
  const hdr = document.getElementById(id+'-hdr');
  if(!body || !hdr) return;
  const willOpen = !body.classList.contains('open');
  body.classList.toggle('open', willOpen);
  hdr.classList.toggle('open', willOpen);
}

function togDrk(){DS.dark=!DS.dark;applyDark();sv();toast(DS.dark?'🌙 الوضع الليلي':'☀ الوضع النهاري');}
// ══ BOTTOM NAV CUSTOMIZATION ══
const NAV_OPTIONS=[
  {key:'expenses',icon:'💰',label:'مصروفاتي',action:"goTab('expenses')"},
  {key:'dash',icon:'🔄',label:'معاملاتي',action:"goTab('dash')"},
  {key:'daily',icon:'📅',label:'يومي',action:"goTab('daily')"},
  {key:'notes',icon:'📝',label:'ملاحظاتي',action:"goTab('notes')"},
  {key:'articles',icon:'📰',label:'مقالاتي',action:"goTab('articles')"},
  {key:'savings',icon:'🐷',label:'حصالتي',action:"goTab('savings')"},
  {key:'settings',icon:'⚙️',label:'الإعدادات',action:"goTab('settings')"},
  {key:'help',icon:'💬',label:'مساعدة',action:"openHelpCenter()"},
  {key:'notif',icon:'🔔',label:'الإشعارات',action:"openNotifPanel()"}
];
const NAV_DEFAULT=['settings','dash','daily','help'];
function renderNavChoices(){
  const el=document.getElementById('NAV-CHOICE-LIST');
  if(!el)return;
  const sel=DS.navSections||NAV_DEFAULT;
  el.innerHTML=NAV_OPTIONS.map(o=>{
    const on=sel.includes(o.key);
    return `<div class="sr" onclick="toggleNavChoice('${o.key}')">
      <div class="si si-p">${o.icon}</div>
      <div class="st"><div class="st-t">${o.label}</div></div>
      <button class="tog${on?' on':''}"></button>
    </div>`;
  }).join('');
}
function toggleNavChoice(key){
  let sel=DS.navSections||NAV_DEFAULT.slice();
  if(sel.includes(key)){
    sel=sel.filter(k=>k!==key);
  } else {
    if(sel.length>=4){toast('❌ اختار 4 بس — شيل واحد الأول');return;}
    sel=[...sel,key];
  }
  DS.navSections=sel;
  sv();renderNavChoices();renderBottomNav();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).set({navSections:sel},{merge:true}).catch(e=>{});
}
function renderBottomNav(){
  const sel=DS.navSections||NAV_DEFAULT;
  const slots=['NV-slot1','NV-slot2','NV-slot3','NV-slot4'];
  slots.forEach((slotId,i)=>{
    const btn=document.getElementById(slotId);
    if(!btn)return;
    const key=sel[i];
    const opt=NAV_OPTIONS.find(o=>o.key===key);
    if(!opt){btn.style.visibility='hidden';btn.innerHTML='';btn.onclick=null;return;}
    btn.style.visibility='visible';
    btn.onclick=new Function(opt.action);
    const badgeHtml=key==='notif'?`<span id="NOTIF-BADGE-NAV" style="display:none;position:absolute;top:2px;left:calc(50% - 2px);background:var(--ng);color:#fff;font-size:8px;font-weight:800;border-radius:8px;min-width:13px;height:13px;align-items:center;justify-content:center;padding:0 3px">0</span>`:'';
    btn.innerHTML=`<span class="ni-ic">${opt.icon}${badgeHtml}</span><span class="ni-lb">${opt.label}</span>`;
  });
  updateNotifBadge();
}
function applyNavSelection(){renderBottomNav();}

function setHomeLayout(mode){
  DS.homeLayout=mode;sv();
  applyHomeLayout();
  toast(mode==='grid'?'▦ شكل البطاقات':'☰ شكل القائمة');
}
function applyHomeLayout(){
  const wrap=document.getElementById('HOME-CARDS');
  const mode=DS.homeLayout||'list';
  if(wrap)wrap.classList.toggle('grid-mode',mode==='grid');
  const bl=document.getElementById('HL-LIST'),bg=document.getElementById('HL-GRID');
  if(bl)bl.className='btn btn-sm '+(mode==='list'?'btn-p':'btn-s');
  if(bg)bg.className='btn btn-sm '+(mode==='grid'?'btn-p':'btn-s');
}
function applyDark(){
  document.getElementById('APP').classList.toggle('dk',DS.dark);
  const t=document.getElementById('TG-DRK');if(t)t.classList.toggle('on',DS.dark);
  const s=document.getElementById('DRK-S');if(s)s.textContent=DS.dark?'مفعّل':'الوضع النهاري';
}
function togBal(){
  DS.balH=!DS.balH;
  const tb=document.getElementById('TG-BAL');if(tb)tb.classList.toggle('on',DS.balH);
  const bs=document.getElementById('BAL-S');if(bs)bs.textContent=DS.balH?'الأرصدة مخفية':'الأرصدة مرئية';
  const ey=document.getElementById('EYE');if(ey)ey.textContent=DS.balH?'🙈':'👁';
  sv();rAll();if(DS.curID)rDet();toast(DS.balH?'🔒 تم إخفاء الأرصدة':'👁 تم إظهار الأرصدة');
}
// ══ PRINT / PDF EXPORT WITH MANDATORY BRANDING ══
function printWithBranding(title, bodyHtml){
  const logoEl=document.querySelector('link[rel="icon"]');
  const logoUri=logoEl?logoEl.href:'';
  const w=window.open('','_blank');
  if(!w){toast('❌ فعّل النوافذ المنبثقة للطباعة');return;}
  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${escHtml(title)} — قسطاس</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:'Cairo',Tahoma,Arial,sans-serif;padding:2rem;color:#221d16;margin:0}
      .print-hdr{display:flex;align-items:center;gap:.9rem;border-bottom:3px solid #2f4a3d;padding-bottom:1rem;margin-bottom:1.5rem}
      .print-logo{width:56px;height:56px;border-radius:14px;flex-shrink:0}
      .print-appname{font-size:21px;font-weight:800;color:#2f4a3d}
      .print-dev{font-size:11.5px;color:#666;margin-top:2px}
      .print-title{font-size:16px;font-weight:700;color:#221d16;margin:0 0 1rem}
      .print-meta{font-size:10.5px;color:#888;margin-bottom:1.2rem}
      table{width:100%;border-collapse:collapse;margin-top:.5rem}
      td,th{border:1px solid #ddd;padding:.55rem .7rem;text-align:right;font-size:12px}
      th{background:#f0e9da;font-weight:700}
      .print-footer{margin-top:2.5rem;padding-top:1rem;border-top:1px solid #ddd;font-size:10px;color:#999;text-align:center}
      @media print{ body{padding:1rem} }
    </style>
    </head><body>
    <div class="print-hdr">
      ${logoUri?`<img alt="" class="print-logo" src="${logoUri}">`:''}
      <div><div class="print-appname">قسطاس</div><div class="print-dev">تطوير: المودة للبرمجيات</div></div>
    </div>
    <div class="print-title">${escHtml(title)}</div>
    <div class="print-meta">تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric'})} — ${new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})}</div>
    ${bodyHtml}
    <div class="print-footer">تم إنشاء هذا التقرير بواسطة تطبيق قسطاس — تطوير المودة للبرمجيات</div>
    </body></html>`);
  w.document.close();
  setTimeout(()=>{w.focus();w.print();},450);
}

function expCSV(){
  const rows=[['قسطاس — تطوير: المودة للبرمجيات'],[`تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`],[],['الاسم','النوع','الهاتف','الشركة','الرصيد','عدد المعاملات']];
  DS.contacts.forEach(c=>rows.push([c.name,c.type==='customer'?'عميل':'مورد',c.phone||'',c.company||'',c.balance,(c.tx||[]).length]));
  const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
  try{const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='qistas-report.csv';a.click();URL.revokeObjectURL(url);toast('📥 تم تنزيل التقرير');}catch(e){toast('تعذّر التنزيل');}
}
function printReportExp(){
  const exps=DS.expenses||[];
  const now=new Date();const ym=localYM(now);
  const thisMonth=exps.filter(e=>(e.date||'').slice(0,7)===ym);
  const total=thisMonth.reduce((s,e)=>s+e.amount,0);
  const catMap={};
  thisMonth.forEach(e=>{catMap[e.category]=(catMap[e.category]||0)+e.amount;});
  const catRows=Object.keys(catMap).map(c=>`<tr><td>${catIconOf(c)} ${c}</td><td>${fmt(catMap[c])}</td></tr>`).join('');
  const expRows=exps.slice(0,50).map(e=>`<tr><td>${e.date}${e.time?' '+e.time:''}</td><td>${escHtml(e.category)}</td><td>${escHtml(e.note||'—')}</td><td>${fmt(e.amount)}</td></tr>`).join('');
  const body=`
    <table><thead><tr><th>البند</th><th>القيمة</th></tr></thead><tbody>
      <tr><td>💰 إجمالي هذا الشهر</td><td>${fmt(total)}</td></tr>
    </tbody></table>
    <h3 style="margin-top:1.3rem;font-size:13px">حسب التصنيف</h3>
    <table><thead><tr><th>التصنيف</th><th>المبلغ</th></tr></thead><tbody>${catRows}</tbody></table>
    <h3 style="margin-top:1.3rem;font-size:13px">كل المصروفات</h3>
    <table><thead><tr><th>التاريخ والوقت</th><th>التصنيف</th><th>البيان</th><th>المبلغ</th></tr></thead><tbody>${expRows}</tbody></table>`;
  printWithBranding('تقرير المصروفات',body);
}
function printReportSavings(){
  const savs=DS.savings||[];
  const rows=savs.map(s=>{
    const collected=savCollected(s);
    const pct=Math.min(100,Math.round(collected/s.target*100));
    return `<tr><td>${escHtml(s.name)}</td><td>${s.mode==='regular'?'📏 منتظم':'🎲 غير منتظم'}</td><td>${fmt(s.target)}</td><td>${fmt(collected)}</td><td>${pct}%</td></tr>`;
  }).join('');
  const body=`<table><thead><tr><th>الحصالة</th><th>النوع</th><th>الهدف</th><th>تم جمعه</th><th>النسبة</th></tr></thead><tbody>${rows}</tbody></table>`;
  printWithBranding('تقرير حصالتي',body);
}
// ══ VAULTS (ادخار) — ميزة يتحكم فيها الأدمن لكل مستخدم ══
const VAULT_TYPES={bank:{icon:'🏦',label:'حساب بنكي'},certificate:{icon:'📜',label:'شهادة ادخار'},gold:{icon:'🥇',label:'ذهب'},cash:{icon:'💵',label:'نقدي'},other:{icon:'🗂',label:'أخرى'}};
const VAULT_PALETTE=['#3730a3','#0891b2','#b8790f','#146c43','#9333ea'];
function applyVaultVisibility(){
  const card=document.getElementById('HOME-VAULT-CARD');
  if(card)card.style.display=DS.savingsEnabled?'flex':'none';
}
function onVaultTypeChange(){
  const t=document.getElementById('VAULT-TYPE').value;
  document.getElementById('vault-maturity-wrap').style.display=t==='certificate'?'block':'none';
}
let _editingVaultId=null;
function openVaultModal(){
  _editingVaultId=null;
  document.getElementById('VAULT-MODAL-TITLE').textContent='🏦 وعاء ادخار جديد';
  document.getElementById('VAULT-NAME').value='';
  document.getElementById('VAULT-TYPE').value='bank';
  document.getElementById('VAULT-RATE').value='';
  document.getElementById('VAULT-MATURITY').value='';
  document.getElementById('vault-maturity-wrap').style.display='none';
  _calcState['VAULT-BALANCE']='';
  document.getElementById('VAULT-BALANCE').value='';
  document.getElementById('VAULT-CALC').innerHTML=calcBoxHTML('VAULT-BALANCE');
  document.getElementById('VAULT-DEL-BTN').style.display='none';
  document.getElementById('M-VAULT').classList.add('on');
}
function openVaultEdit(id){
  const v=(DS.savingsVaults||[]).find(x=>x.id===id);if(!v)return;
  _editingVaultId=id;
  document.getElementById('VAULT-MODAL-TITLE').textContent='✏️ تعديل الوعاء';
  document.getElementById('VAULT-NAME').value=v.name;
  document.getElementById('VAULT-TYPE').value=v.type;
  document.getElementById('VAULT-RATE').value=v.rate||'';
  document.getElementById('VAULT-MATURITY').value=v.maturityDate||'';
  document.getElementById('vault-maturity-wrap').style.display=v.type==='certificate'?'block':'none';
  _calcState['VAULT-BALANCE']=String(v.balance);
  document.getElementById('VAULT-BALANCE').value=String(v.balance);
  document.getElementById('VAULT-CALC').innerHTML=calcBoxHTML('VAULT-BALANCE');
  document.getElementById('VAULT-DEL-BTN').style.display='block';
  document.getElementById('M-VAULT').classList.add('on');
}
function svVault(){
  const name=document.getElementById('VAULT-NAME').value.trim();
  const type=document.getElementById('VAULT-TYPE').value;
  const balance=calcEval(_calcState['VAULT-BALANCE']??document.getElementById('VAULT-BALANCE').value)||0;
  const rate=parseFloat(document.getElementById('VAULT-RATE').value)||null;
  const maturityDate=type==='certificate'?(document.getElementById('VAULT-MATURITY').value||null):null;
  if(!name){toast('❌ اكتب اسم الوعاء');return;}
  if(_editingVaultId){
    const v=(DS.savingsVaults||[]).find(x=>x.id===_editingVaultId);
    if(v){v.name=name;v.type=type;v.balance=balance;v.rate=rate;v.maturityDate=maturityDate;}
    if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('savingsVaults').doc(String(_editingVaultId)).set(v).catch(e=>{});
  } else {
    const v={id:newId(),name,type,balance,rate,maturityDate,history:[{date:localISO(new Date()),balance}],tx:[]};
    if(!DS.savingsVaults)DS.savingsVaults=[];
    DS.savingsVaults.push(v);
    if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('savingsVaults').doc(String(v.id)).set(v).catch(e=>{});
  }
  _editingVaultId=null;
  sv();closeM();rVaults();
  toast('✅ تم الحفظ');
}
function deleteCurrentVault(){
  if(!_editingVaultId)return;
  if(!confirm('حذف وعاء الادخار ده نهائيًا؟'))return;
  DS.savingsVaults=(DS.savingsVaults||[]).filter(v=>v.id!==_editingVaultId);
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('savingsVaults').doc(String(_editingVaultId)).delete().catch(e=>{});
  _editingVaultId=null;
  sv();closeM();rVaults();
  toast('🗑 تم الحذف');
}
let _vaultTxType='deposit';
let _vaultTxTargetId=null;
function openVaultTx(id,type){
  _vaultTxTargetId=id;_vaultTxType=type;
  document.getElementById('VAULTTX-TITLE').textContent=type==='deposit'?'➕ إيداع':'➖ سحب';
  _calcState['VAULTTX-AMOUNT']='';
  document.getElementById('VAULTTX-AMOUNT').value='';
  document.getElementById('VAULTTX-CALC').innerHTML=calcBoxHTML('VAULTTX-AMOUNT');
  document.getElementById('M-VAULT-TX').classList.add('on');
}
function svVaultTx(){
  const v=(DS.savingsVaults||[]).find(x=>x.id===_vaultTxTargetId);if(!v)return;
  const amt=calcEval(_calcState['VAULTTX-AMOUNT']??document.getElementById('VAULTTX-AMOUNT').value);
  if(!amt||amt<=0){toast('❌ أدخل مبلغاً أكبر من صفر');return;}
  const now=new Date();
  if(!v.tx)v.tx=[];
  v.tx.unshift({id:newId(),type:_vaultTxType,amount:amt,date:localISO(now),time:now.toTimeString().slice(0,5)});
  v.balance=_vaultTxType==='deposit'?v.balance+amt:v.balance-amt;
  if(!v.history)v.history=[];
  v.history.push({date:localISO(now),balance:v.balance});
  sv();closeM();rVaults();openVaultDetail(v.id);
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('savingsVaults').doc(String(v.id)).set(v).catch(e=>{});
  toast('✅ تم التسجيل');
}
function openVaultDetail(id){
  const v=(DS.savingsVaults||[]).find(x=>x.id===id);if(!v)return;
  const t=VAULT_TYPES[v.type]||VAULT_TYPES.other;
  document.getElementById('VAULTDET-TITLE').textContent=t.icon+' '+v.name;
  const txRows=(v.tx||[]).slice(0,15).map(tx=>`<div style="display:flex;justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--bd);font-size:11.5px">
    <span style="color:${tx.type==='deposit'?'var(--ok)':'var(--ng)'};font-weight:700">${tx.type==='deposit'?'⬇️ إيداع':'⬆️ سحب'}</span>
    <span style="color:var(--mu)">${tx.date} ${tx.time||''}</span>
    <span style="font-weight:800;color:${tx.type==='deposit'?'var(--ok)':'var(--ng)'}">${fmt(tx.amount)}</span>
  </div>`).join('')||'<div style="text-align:center;color:var(--mu);font-size:11px;padding:.6rem">مفيش عمليات مسجّلة</div>';
  const maturityHtml=v.maturityDate?`<div style="font-size:11px;color:var(--warn);font-weight:700;margin-top:.5rem">📅 تاريخ الاستحقاق: ${new Date(v.maturityDate).toLocaleDateString('ar-EG')}</div>`:'';
  const rateHtml=v.rate?`<div style="font-size:11px;color:var(--tx2);margin-top:.3rem">📈 العائد السنوي: ${v.rate}% (متوقع تقريبًا ${fmt(v.balance*v.rate/100)} في السنة)</div>`:'';
  document.getElementById('VAULTDET-BODY').innerHTML=`
    <div class="act-card">
      <div style="text-align:center;font-size:24px;font-weight:800;color:#3730a3">${fmt(v.balance)}</div>
      <div style="text-align:center;font-size:11px;color:var(--mu);margin-top:2px">${t.label}</div>
      ${maturityHtml}${rateHtml}
      <div style="display:flex;gap:.5rem;margin-top:.8rem">
        <button class="btn btn-p btn-sm" onclick="openVaultTx(${v.id},'deposit')" style="flex:1">⬇️ إيداع</button>
        <button class="btn btn-s btn-sm" onclick="openVaultTx(${v.id},'withdraw')" style="flex:1">⬆️ سحب</button>
      </div>
    </div>
    <div class="act-card">
      <div class="act-card-t">🧾 آخر العمليات</div>
      ${txRows}
    </div>
    <div style="display:flex;gap:.5rem">
      <button class="btn btn-s" onclick="openVaultEdit(${v.id})" style="flex:1">✏️ تعديل الوعاء</button>
      <button class="btn btn-ng" onclick="_editingVaultId=${v.id};deleteCurrentVault();" style="flex:1">🗑 حذف</button>
    </div>`;
  document.getElementById('M-VAULT-DETAIL').classList.add('on');
}
function vaultTotal(){return (DS.savingsVaults||[]).reduce((s,v)=>s+v.balance,0);}
function rVaults(){
  const vaults=DS.savingsVaults||[];
  const total=vaultTotal();
  const totalEl=document.getElementById('VAULT-TOTAL');if(totalEl)totalEl.textContent=fmt(total);
  const homeTotal=document.getElementById('HOME-VAULT-TOTAL');if(homeTotal)homeTotal.textContent=fmt(total);
  // 6-month trend from history
  const chartLbs=document.getElementById('VAULT-CHART-LBS');
  const svg=document.getElementById('VAULT-CHART-SVG');
  if(svg){
    const now=new Date();const months=[];
    for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({ym:localYM(d),lb:d.toLocaleDateString('ar-EG',{month:'short'})});}
    const sums=months.map(m=>{
      let s=0;
      vaults.forEach(v=>{
        const entries=(v.history||[]).filter(h=>h.date.slice(0,7)<=m.ym);
        if(entries.length)s+=entries[entries.length-1].balance;
      });
      return s;
    });
    const maxV=Math.max(...sums,1);
    const stepX=(300-40)/(months.length-1);
    const pts=sums.map((v,i)=>{const x=20+i*stepX;const y=85-(v/maxV*70);return{x,y};});
    const line=pts.map(p=>`${p.x},${p.y}`).join(' ');
    const area=line+` ${pts[pts.length-1].x},85 ${pts[0].x},85`;
    svg.innerHTML=`<polygon points="${area}" fill="#3730a3" opacity=".15"/><polyline points="${line}" fill="none" stroke="#3730a3" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3" fill="#3730a3"/>`).join('')}`;
    if(chartLbs)chartLbs.innerHTML=months.map(m=>`<span>${m.lb}</span>`).join('');
  }
  // Distribution donut
  const distWrap=document.getElementById('VAULT-DIST-WRAP');
  const donut=document.getElementById('VAULT-DONUT');
  const legend=document.getElementById('VAULT-DIST-LEGEND');
  if(vaults.length&&total>0&&distWrap&&donut&&legend){
    distWrap.style.display='block';
    let acc=0;const stops=[];
    vaults.forEach((v,i)=>{
      const pct=v.balance/total*100;
      const color=VAULT_PALETTE[i%VAULT_PALETTE.length];
      stops.push(`${color} ${acc}% ${acc+pct}%`);
      acc+=pct;
    });
    donut.style.background=`conic-gradient(${stops.join(',')})`;
    legend.innerHTML=vaults.map((v,i)=>`<div style="display:flex;align-items:center;gap:.5rem">
      <div style="width:9px;height:9px;border-radius:50%;background:${VAULT_PALETTE[i%VAULT_PALETTE.length]}"></div>
      <div style="flex:1;font-size:10.5px;font-weight:700;color:var(--tx2)">${escHtml(v.name)}</div>
      <div style="font-size:10.5px;font-weight:800;color:var(--tx)">${fmt(v.balance)}</div>
    </div>`).join('');
  } else if(distWrap){distWrap.style.display='none';}
  // List
  const listEl=document.getElementById('VAULTS-LIST');
  const emptyEl=document.getElementById('VAULTS-EMPTY');
  if(!listEl)return;
  if(!vaults.length){listEl.innerHTML='';if(emptyEl)emptyEl.style.display='flex';return;}
  if(emptyEl)emptyEl.style.display='none';
  listEl.innerHTML=vaults.map(v=>{
    const t=VAULT_TYPES[v.type]||VAULT_TYPES.other;
    return `<div class="act-card" onclick="openVaultDetail(${v.id})" style="cursor:pointer;display:flex;align-items:center;gap:.7rem;padding:.85rem">
      <div style="font-size:22px">${t.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:800;color:var(--tx)">${escHtml(v.name)}</div>
        <div style="font-size:10.5px;color:var(--mu)">${t.label}${v.rate?' • '+v.rate+'% سنويًا':''}</div>
      </div>
      <div style="font-size:14px;font-weight:800;color:#3730a3">${fmt(v.balance)}</div>
    </div>`;
  }).join('');
}
function printReportVaults(){
  const vaults=DS.savingsVaults||[];
  const total=vaultTotal();
  const rows=vaults.map(v=>{
    const t=VAULT_TYPES[v.type]||VAULT_TYPES.other;
    return `<tr><td>${escHtml(v.name)}</td><td>${t.label}</td><td>${fmt(v.balance)}</td><td>${v.rate?v.rate+'%':'—'}</td></tr>`;
  }).join('');
  const body=`
    <table><thead><tr><th>البند</th><th>القيمة</th></tr></thead><tbody>
      <tr><td>💰 إجمالي المدخرات</td><td>${fmt(total)}</td></tr>
    </tbody></table>
    <h3 style="margin-top:1.3rem;font-size:13px">كل الأوعية</h3>
    <table><thead><tr><th>الاسم</th><th>النوع</th><th>الرصيد</th><th>العائد السنوي</th></tr></thead><tbody>${rows}</tbody></table>`;
  printWithBranding('تقرير ادخار',body);
}

function printReportTx(){
  const ti=DS.contacts.reduce((a,c)=>a+(c.balance>0?c.balance:0),0);
  const to=Math.abs(DS.contacts.reduce((a,c)=>a+(c.balance<0?c.balance:0),0));
  const net=ti-to;
  const rows=DS.contacts.map(c=>`<tr><td>${escHtml(c.name)}</td><td>${c.type==='customer'?'عميل':'مورد'}</td><td>${escHtml(c.phone||'—')}</td><td>${fmt(c.balance)}</td><td>${(c.tx||[]).length}</td></tr>`).join('');
  const body=`
    <table><thead><tr><th>البند</th><th>القيمة</th></tr></thead><tbody>
      <tr><td>📥 أخذت</td><td>${fmt(ti)}</td></tr>
      <tr><td>📤 أعطيت</td><td>${fmt(to)}</td></tr>
      <tr><td>📊 صافي الرصيد</td><td>${fmt(net)}</td></tr>
    </tbody></table>
    <table style="margin-top:1.5rem"><thead><tr><th>الاسم</th><th>النوع</th><th>الهاتف</th><th>الرصيد</th><th>عدد المعاملات</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
  printWithBranding('تقرير المعاملات',body);
}

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
  applyDark(); applyHomeLayout(); applyNavSelection(); rNotes(); rExpenses(); rTasks(); rOccasions(); rArticles(); rSavings(); rVaults(); applyVaultVisibility(); checkOccasionReminders(); updateNotifBadge(); updateConnectionStatus(); showScr('SCR-main');
  rAll(); updProf(); updSubStatus(); updSubBar();
  checkForUpdates();
  if(FB_READY) syncFromCloud();
  if(DS.isAdmin) showAdminRow(true);
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
  {sel:'#HOME-CARDS .nav-card:nth-child(1)',t:'💰 مصروفاتي',d:'سجّل مصروفاتك، وحدد ميزانيتك، وتابع تنبيهات تجاوزها.'},
  {sel:'#HOME-CARDS .nav-card:nth-child(2)',t:'🔄 معاملاتي',d:'دفتر حسابات العملاء والموردين: أخذت وأعطيت والرصيد بعد كل معاملة.'},
  {sel:'#HOME-CARDS .nav-card:nth-child(3)',t:'📅 يومي',d:'مهامك ومناسباتك، وصحتك (الأدوية ومواعيد الدكتور)، ومواعيدك.'},
  {sel:'#HOME-CARDS .nav-card:nth-child(4)',t:'📝 ملاحظاتي',d:'ملاحظات سريعة بموضوع وتنبيه اختياري.'},
  {sel:'#HOME-CARDS .nav-card:nth-child(5)',t:'📰 مقالاتي',d:'اكتب مواضيع طويلة بالكيبورد أو بالصوت 🎙️ وضيف صورة وصدّرها PDF.'},
  {sel:'#HOME-CARDS .nav-card:nth-child(6)',t:'🐷 حصالتي',d:'أهداف ادخار بمبلغ ومدة، وعلّم كل يوم وتحتفل بكل مرحلة.'},
  {sel:'#HOME-VAULT-CARD',t:'🏦 ادخار',d:'تابع أماكن حفظ فلوسك (بنك، شهادات، ذهب...).'},
  {sel:'#TB-home .hdr button.ic:nth-of-type(1)',t:'🔔 الإشعارات',d:'العداد الأحمر بيوريك عدد الإشعارات الجديدة.'},
  {sel:'#TB-home .hdr button.ic:nth-of-type(2)',t:'⚙️ الإعدادات',d:'الوضع الليلي، الأمان، النغمات، الدعم وتذاكرك، ودعوة صديق.'},
  {sel:'#NV-home',t:'🏠 الرئيسية',d:'من أي مكان ترجع للشاشة الرئيسية. وتقدر تغيّر باقي أزرار الشريط من الإعدادات.'}
];
let _tourI=-1;
function startTour(){
  try{showScr('SCR-main');goTab('home');}catch(e){}
  tourClear();_tourI=-1;setTimeout(tourNext,250);
}
function tourClear(){['TOUR-BLOCK','TOUR-HL','TOUR-TIP'].forEach(id=>{const e=document.getElementById(id);if(e)e.remove();});}
function tourEnd(){tourClear();DS.tourKey=window._minVer||'';sv();}
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
    showScr('SCR-main');applyDark();applyHomeLayout();applyNavSelection();rAll();rNotes();rExpenses();rTasks();rOccasions();rArticles();rSavings();rVaults();applyVaultVisibility();checkOccasionReminders();updateNotifBadge();updateConnectionStatus();updProf();updSubStatus();updSubBar();
    checkForUpdates();if(FB_READY)syncFromCloud();
    if(DS.isAdmin)showAdminRow(true);
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
    b.style.cssText='position:fixed;left:3%;right:3%;bottom:76px;z-index:9998;background:var(--sf,#fff);color:var(--tx,#221d16);border:1px solid var(--bd,#ddd);border-radius:14px;padding:.8rem;box-shadow:0 6px 24px rgba(0,0,0,.25);display:flex;gap:.6rem;align-items:center';
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
function tourAfterForced(v){
  try{
    if(!DS.loggedIn)return;
    if(DS.tourKey===undefined){if(DS.guideSeen||DS.guideVer){DS.tourKey=v;sv();}return;}
    if(DS.tourKey===v)return;
    const m=document.getElementById('SCR-main');
    if(!m||!m.classList.contains('on')||document.getElementById('TOUR-TIP'))return;
    DS.tourKey=v;sv();setTimeout(startTour,1200);
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
  ov.innerHTML='<div role="dialog" aria-modal="true" style="background:var(--sf,#fff);color:var(--tx,#221d16);border-radius:16px;padding:1.1rem;width:100%;max-width:380px;max-height:86vh;overflow:auto">'+html+'</div>';
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
  const ov=trashOverlay('<div style="font-weight:800;font-size:15px;margin-bottom:.3rem">🧹 مسح بيانات التطبيق</div><div style="font-size:11.5px;color:var(--tx2,#5c5548);line-height:1.8;margin-bottom:.7rem">اختر البيانات اللي هتتنقل لسلة المهملات. لو مفيش نت بتتحفظ مؤقتًا وتتنقل أول ما النت يرجع. بتفضل 30 يوم وتقدر ترجعها من الإعدادات، وبعدها بتتحذف نهائيًا.</div><div class="_l"></div><div style="display:flex;gap:.6rem;margin-top:.9rem"><button type="button" class="btn btn-ng _ok" style="flex:1">نقل للسلة</button><button type="button" class="btn btn-s _no" style="flex:1">إلغاء</button></div>');
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
  const ov=trashOverlay('<div style="font-weight:800;font-size:15px;margin-bottom:.3rem">🗑️ سلة المهملات</div><div style="font-size:11.5px;color:var(--tx2,#5c5548);line-height:1.8;margin-bottom:.7rem">بتتحذف نهائيًا بعد '+TRASH_DAYS+' يوم من المسح.'+(cloudOk?'':' (مفيش اتصال، ظاهر بس اللي اتحفظ على الجهاز)')+'</div><div class="_l"></div><button type="button" class="btn btn-s _no" style="width:100%;margin-top:.6rem">إغلاق</button>');
  ov.querySelector('._no').onclick=()=>ov.remove();
  const box=ov.querySelector('._l');
  if(!list.length){const e=document.createElement('div');e.style.cssText='text-align:center;padding:1.2rem;font-size:12.5px;color:var(--mu,#948c7a)';e.textContent='السلة فاضية';box.appendChild(e);return;}
  list.forEach(b=>{
    const gs={};
    if(b.q)Object.assign(gs,b.q.groups);else b.docs.forEach(d=>{gs[d.group]=(gs[d.group]||0)+(d.count||0);});
    const names=Object.keys(gs).map(k=>{const g=TRASH_GROUPS.find(x=>x.k===k);return (g?g.n:k)+' ('+gs[k]+')';}).join('، ');
    const card=document.createElement('div');card.style.cssText='border:1px solid var(--bd,#ece3d2);border-radius:12px;padding:.7rem;margin-bottom:.6rem';
    const t=document.createElement('div');t.style.cssText='font-size:12.5px;font-weight:700;line-height:1.8';t.textContent=names;card.appendChild(t);
    const s=document.createElement('div');s.style.cssText='font-size:11px;color:var(--mu,#948c7a);margin:.2rem 0 .5rem';
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
    DS.authOk=!!ok;
    if(ok&&!(data&&data.authMigrated))db.collection('users').doc(uid).set({authMigrated:true},{merge:true}).catch(()=>{});
  }catch(e){}
}
function authUpdatePassword(p){try{const u=window.firebase&&firebase.auth&&firebase.auth().currentUser;if(u)u.updatePassword(p).catch(()=>{});}catch(e){}}
async function openHintEditor(){
  const pw=await trashAuth('أدخل كلمة المرور لتعديل سؤال التذكير');if(!pw)return;
  const ov=trashOverlay('<div style="font-weight:800;font-size:15px;margin-bottom:.6rem">💡 سؤال تذكير كلمة المرور</div><input class="inp _q" maxlength="60" placeholder="سؤالك أنت (مثال: اسم أول مدرسة؟)"><input class="inp _a" maxlength="80" placeholder="إجابتك" style="margin-top:.4rem"><div style="font-size:10.5px;color:var(--mu,#948c7a);margin-top:.4rem;line-height:1.7">متكتبش كلمة المرور نفسها. أي حد يعرف رقمك ممكن يشوف السؤال بعد محاولة دخول غلط. سيبهم فاضيين لو عايز تمسحهم.</div><div style="display:flex;gap:.6rem;margin-top:.8rem"><button type="button" class="btn btn-p _ok" style="flex:1">حفظ</button><button type="button" class="btn btn-s _no" style="flex:1">إلغاء</button></div>');
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

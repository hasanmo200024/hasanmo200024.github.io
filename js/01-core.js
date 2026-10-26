// ═══ 01-core — الأساسيات: إعداد Firebase، حالة الاتصال، الساعة، الحالة العامة (DS)، toast، escHtml، الكتابة بالصوت ═══
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
const APP_VERSION = "2.2.0";
const AV_COLORS = {1:{bg:'#dbeafe',cl:'#1e40af'},2:{bg:'#d1fae5',cl:'#065f46'},3:{bg:'#fce7f3',cl:'#9d174d'},4:{bg:'#fef3c7',cl:'#92400e'},5:{bg:'#ede9fe',cl:'#4c1d95'},6:{bg:'#fee2e2',cl:'#991b1b'}};

let db=null,auth=null,FB_READY=false,confirmResult=null;
try{
  const APPCHECK_SITE_KEY='';   // مفتاح reCAPTCHA v3 من Firebase App Check (سيبه فاضي لحد ما تسجّله)
firebase.initializeApp(FB_CONFIG);
try{if(APPCHECK_SITE_KEY&&firebase.appCheck)firebase.appCheck().activate(APPCHECK_SITE_KEY,true);}catch(e){}
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
ov.innerHTML='<div role="dialog" aria-modal="true" style="background:var(--sf,#fff);color:var(--tx,#1e1833);border-radius:16px;padding:1.2rem;width:100%;max-width:320px;text-align:center"><div class="_m" style="font-weight:800;font-size:14px;margin-bottom:.8rem"></div><input type="password" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="رمز PIN" style="width:100%;text-align:center;font-size:22px;letter-spacing:.6rem;padding:.6rem;border:1px solid var(--bd,#ccc);border-radius:10px;background:transparent;color:inherit"><div style="display:flex;gap:.6rem;margin-top:.9rem"><button type="button" class="btn btn-p _ok" style="flex:1">تأكيد</button><button type="button" class="btn _no" style="flex:1">إلغاء</button></div></div>';
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

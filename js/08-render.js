// ═══ 08-render — التنقل، الرسم العام، العمليات، الآلة الحاسبة، الإعدادات، الطباعة ═══
// ══ NAVIGATION ══
const TABS=['home','more','dash','add','reports','settings','profile','expenses','daily','notes','articles','savings','vaults'];
function goTab(t){
  window._curTab=t;
  TABS.forEach(id=>{
    const e=document.getElementById('TB-'+id);if(e)e.style.display='none';
    const n=document.getElementById('NV-'+id);if(n)n.classList.remove('on');
  });
  const e=document.getElementById('TB-'+t);if(e){e.style.display='flex';e.style.flexDirection='column';}
  const n=document.getElementById('NV-'+t);if(n)n.classList.add('on');
  if(!document.querySelector('.bnav .ni.on')){const mo=document.getElementById('NV-more');if(mo)mo.classList.add('on');}
  if(t==='dash')rAll();if(t==='home'||t==='more'){rSum();rNotes();rExpenses();rTasks();rArticles();rSavings();rVaults();}if(t==='home')rHomeNew();if(t==='reports')rRpt();if(t==='profile'){updProf();loadMySupport();}if(t==='notes')rNotes();if(t==='expenses')rExpenses();if(t==='daily'){rTasks();rOccasions();rMeds();rDoctors();rAppts();}if(t==='settings'){renderNotifPrefs();}if(t==='articles')rArticles();if(t==='savings')rSavings();if(t==='vaults')rVaults();
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
      body{font-family:'Cairo',Tahoma,Arial,sans-serif;padding:2rem;color:#1e1833;margin:0}
      .print-hdr{display:flex;align-items:center;gap:.9rem;border-bottom:3px solid #5b3fa6;padding-bottom:1rem;margin-bottom:1.5rem}
      .print-logo{width:56px;height:56px;border-radius:14px;flex-shrink:0}
      .print-appname{font-size:21px;font-weight:800;color:#5b3fa6}
      .print-dev{font-size:11.5px;color:#666;margin-top:2px}
      .print-title{font-size:16px;font-weight:700;color:#1e1833;margin:0 0 1rem}
      .print-meta{font-size:10.5px;color:#888;margin-bottom:1.2rem}
      table{width:100%;border-collapse:collapse;margin-top:.5rem}
      td,th{border:1px solid #ddd;padding:.55rem .7rem;text-align:right;font-size:12px}
      th{background:#eee9f8;font-weight:700}
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

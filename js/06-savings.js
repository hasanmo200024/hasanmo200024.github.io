// ═══ 06-savings — الادخار (الأهداف) ═══
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

// ═══ 12-money — الدخل المتعدد + تطوير المصروفات (ملخص، فلاتر، تجميع بالأيام) ═══
const INC_SOURCES=['راتب','عمل حر','مكافأة','هدية','أخرى'];
let _incSrc='راتب',_expFilter='الكل';
const _digits=s=>String(s==null?'':s).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٬,،\s]/g,'').replace('٫','.');
function renderIncSources(){
  const box=document.getElementById('INC-SRC');if(!box)return;box.innerHTML='';
  INC_SOURCES.forEach(s=>{const b=document.createElement('button');b.type='button';b.className='fc'+(s===_incSrc?' on':'');b.textContent=s;b.onclick=()=>{_incSrc=s;renderIncSources();};box.appendChild(b);});
}
function openIncModal(){
  _incSrc='راتب';renderIncSources();
  document.getElementById('INC-AM').value='';document.getElementById('INC-NOTE').value='';
  document.getElementById('INC-DATE').value=localISO(new Date());
  document.getElementById('M-INC').classList.add('on');
  setTimeout(()=>{try{document.getElementById('INC-AM').focus();}catch(e){}},150);
}
function svIncome(){
  const amt=parseFloat(_digits(document.getElementById('INC-AM').value));
  if(!amt||amt<=0){toast('❌ أدخل مبلغاً أكبر من صفر');return;}
  const item={id:newId(),amount:amt,source:_incSrc,note:document.getElementById('INC-NOTE').value.trim(),date:document.getElementById('INC-DATE').value||localISO(new Date())};
  if(!DS.incomes)DS.incomes=[];
  DS.incomes.unshift(item);sv();closeM();rExpenses();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('incomes').doc(String(item.id)).set(item).catch(e=>{});
  toast('✅ تم تسجيل الدخل');
}
function delIncome(id){
  if(!confirm('حذف هذا الدخل؟'))return;
  DS.incomes=(DS.incomes||[]).filter(i=>i.id!==id);sv();rExpenses();
  if(FB_READY&&DS.uid)db.collection('users').doc(DS.uid).collection('incomes').doc(String(id)).delete().catch(e=>{});
}
function rExpenseExtras(){
  const exps=DS.expenses||[],now=new Date(),ym=localYM(now),td=localISO(now);
  const set=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t;};
  const month=exps.filter(e=>(e.date||'').slice(0,7)===ym),total=month.reduce((s,e)=>s+(Number(e.amount)||0),0);
  const incs=(DS.incomes||[]).filter(i=>(i.date||'').slice(0,7)===ym),inc=incs.reduce((s,i)=>s+(Number(i.amount)||0),0);
  const bud=Number(DS.expenseBudget&&DS.expenseBudget.monthly)||0;
  set('EXP-MONTH-LB',now.toLocaleDateString('ar-EG',{month:'long',year:'numeric'}));
  set('EXP-INC-TOTAL',fmt(inc));set('EXP-AVG',fmt(total/Math.max(1,now.getDate())));
  const rem=inc>0?inc-total:(bud>0?bud-total:null),re=document.getElementById('EXP-REMAIN');
  if(re){re.textContent=rem===null?'—':(rem<0?'−':'')+fmt(Math.abs(rem));re.className=rem!==null&&rem<0?'neg':'';}
  const bar=document.getElementById('EXP-HERO-BAR');
  if(bar){if(bud>0){bar.style.display='block';document.getElementById('EXP-HERO-FILL').style.width=Math.min(100,total/bud*100).toFixed(1)+'%';set('EXP-HERO-L1','من ميزانية '+fmt(bud));set('EXP-HERO-L2',total>bud?'تجاوزت بـ '+fmt(total-bud):'متبقي '+fmt(bud-total));}else bar.style.display='none';}
  // دخل الشهر
  const card=document.getElementById('INC-CARD'),il=document.getElementById('INC-LIST');
  if(card&&il){
    card.style.display=incs.length?'block':'none';il.innerHTML='';
    incs.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||b.id-a.id).forEach(i=>{
      const r=document.createElement('div');r.className='irow';
      r.innerHTML='<span class="tg tn-t"></span><span class="x" style="flex:1;min-width:0"><b style="display:block;font-size:14px"></b><small style="color:var(--tx2);font-size:11.5px"></small></span><span class="ia"></span><span class="del-x" role="button" aria-label="حذف">✕</span>';
      r.children[0].textContent=i.source||'دخل';r.querySelector('b').textContent=i.note||i.source||'دخل';
      r.querySelector('small').textContent=i.date?new Date(i.date).toLocaleDateString('ar-EG',{day:'numeric',month:'short'}):'';
      r.querySelector('.ia').textContent='+'+fmt(i.amount);r.querySelector('.del-x').onclick=()=>delIncome(i.id);il.appendChild(r);
    });
  }
  // فلاتر الفئات + قائمة مجمّعة بالأيام
  const listEl=document.getElementById('EXP-LIST'),fl=document.getElementById('EXP-FILTERS');
  if(!listEl)return;
  if(!exps.length){if(fl)fl.style.display='none';return;}
  const cats=['الكل'].concat([...new Set(month.map(e=>e.category))]);
  if(cats.indexOf(_expFilter)<0)_expFilter='الكل';
  if(fl){fl.style.display=cats.length>2?'flex':'none';fl.innerHTML='';cats.forEach(k=>{const b=document.createElement('button');b.type='button';b.className='fc'+(k===_expFilter?' on':'');b.textContent=k==='الكل'?k:catIconOf(k)+' '+k;b.onclick=()=>{_expFilter=k;rExpenseExtras();};fl.appendChild(b);});}
  const view=exps.filter(e=>_expFilter==='الكل'||e.category===_expFilter).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||(String(b.time||'')).localeCompare(String(a.time||''))||b.id-a.id).slice(0,80);
  const groups=[];view.forEach(e=>{let g=groups[groups.length-1];if(!g||g.d!==e.date){g={d:e.date,items:[],sum:0};groups.push(g);}g.items.push(e);g.sum+=Number(e.amount)||0;});
  const yd=localISO(new Date(Date.now()-864e5));
  const label=d=>d===td?'النهاردة':d===yd?'أمس':(d?new Date(d).toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long'}):'بدون تاريخ');
  listEl.innerHTML=groups.map(g=>'<div class="dgrp"><span>'+escHtml(label(g.d))+'</span><span>'+fmt(g.sum)+'</span></div>'+g.items.map(e=>{
    const col=catColorOf(e.category),tint=/^#[0-9a-fA-F]{6}$/.test(col)?col+'22':'var(--pr-lt)';
    return '<div class="erow" onclick="delExpense('+Number(e.id)+')"><span class="et" style="background:'+tint+'">'+escHtml(catIconOf(e.category))+'</span><span class="x" style="flex:1;min-width:0"><b>'+escHtml(e.note||e.category)+'</b><small>'+escHtml(e.category)+(e.time?' · '+escHtml(e.time):'')+'</small></span><span class="ea">'+fmt(e.amount)+'</span></div>';
  }).join('')).join('')||'<div class="n-none">مفيش مصروفات بالفئة دي</div>';
}
(function(){const o=rExpenses;rExpenses=function(){const r=o.apply(this,arguments);try{rExpenseExtras();}catch(e){}return r;};})();

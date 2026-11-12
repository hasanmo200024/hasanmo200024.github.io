// ═══ 14-gameya — جمعيتي: متابعة الجمعية كمشترك (قسطي، الأعضاء، دوري، التقدّم) ═══
// البيانات: {id,name,amount(قسطي),months,start('YYYY-MM'),dueDay,membersCount,members:[{id,name}],myTurn,organizer,notes,
//            pay:{شهر:{d,note}} أقساطي, mp:{عضو_شهر:true} سداد الأعضاء, mc:{شهر:عدد} (لو من غير أسماء), got:{d,amount,note}|null}
let _gmOpen=null,_gmSel=null;
const _gDay0=()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate());};
const _gFmt=d=>d.toLocaleDateString('ar-EG',{day:'numeric',month:'long'});
function _gStart(g){const p=String(g.start||'').split('-').map(Number);return{y:p[0]||new Date().getFullYear(),m:p[1]||1};}
function gmMonthLabel(g,i){const s=_gStart(g);return new Date(s.y,s.m-1+i,1).toLocaleDateString('ar-EG',{month:'long',year:'numeric'});}
function gmCur(g){const s=_gStart(g),n=new Date();return(n.getFullYear()-s.y)*12+(n.getMonth()+1-s.m);}
function gmDue(g,i){const s=_gStart(g),dim=new Date(s.y,s.m-1+i+1,0).getDate();return new Date(s.y,s.m-1+i,Math.min(g.dueDay||1,dim));}
function gmStatus(g,i){if(g.pay&&g.pay[i])return'paid';if(gmDue(g,i)<_gDay0())return'late';return i===gmCur(g)?'due':'future';}
function gmMembersPaid(g,i){if(g.members&&g.members.length){return g.members.filter(m=>g.mp&&g.mp[m.id+'_'+i]).length;}return Number(g.mc&&g.mc[i])||0;}
function gmStats(g){
  const N=g.months,pay=g.pay||{};let paid=0,late=0,next=-1;
  for(let i=0;i<N;i++){if(pay[i])paid++;else{if(next<0)next=i;if(gmDue(g,i)<_gDay0())late++;}}
  const pot=g.amount*g.membersCount,cur=gmCur(g),nextDue=next>=0?gmDue(g,next):null;
  const days=nextDue?Math.round((nextDue-_gDay0())/864e5):null;
  return{N,paid,late,next,nextDue,days,cur,pot,pct:N?Math.round(paid/N*100):0,paidAmt:paid*g.amount,remain:(N-paid)*g.amount,lateAmt:late*g.amount,got:g.got||null,turn:(g.myTurn||1)-1};
}
function gmNextInfo(g){
  const st=gmStats(g);
  if(st.next<0)return{t:'خلصت كل الأقساط ✅',c:'gok',k:9999};
  const d=st.days,n=st.next+1;
  if(d<0)return{t:'متأخر '+(-d)+' يوم — القسط '+n,c:'gtd late',k:d};
  if(d===0)return{t:'القسط '+n+' مستحق النهاردة',c:'gtd',k:0};
  return{t:'القسط '+n+' بعد '+d+' يوم ('+_gFmt(st.nextDue)+')',c:'gtd',k:d};
}
function gmFind(id){return(DS.gameyas||[]).find(x=>x.id===id);}
function gmSave(g){sv();cloudSet('gameyas',g.id,g).catch(e=>{});rGameya();}
function rGameya(){
  const list=document.getElementById('GM-LIST'),det=document.getElementById('GM-DETAIL'),emp=document.getElementById('GM-EMPTY');
  if(!list||!det)return;
  const gs=DS.gameyas||[],g=_gmOpen?gmFind(_gmOpen):null;
  if(_gmOpen&&!g)_gmOpen=null;
  if(g){list.style.display='none';if(emp)emp.style.display='none';det.style.display='block';gmDetail(g);return;}
  det.style.display='none';list.style.display='block';
  if(!gs.length){list.innerHTML='';if(emp)emp.style.display='flex';return;}
  if(emp)emp.style.display='none';
  list.innerHTML=gs.map(x=>{
    const st=gmStats(x),nx=gmNextInfo(x),id=Number(x.id);
    return '<div class="gcard" onclick="gmOpen('+id+')"><div class="g-top"><span class="gt tn-v">🤝</span><span class="x"><b>'+escHtml(x.name)+'</b><small>قسطي '+fmt(x.amount)+' · '+x.membersCount+' عضو · دوري: '+escHtml(gmMonthLabel(x,st.turn))+'</small></span><span class="gpct">'+st.pct+'%</span></div><div class="gbar"><i style="width:'+st.pct+'%"></i></div><div class="g-bot"><span class="'+nx.c+'">'+nx.t+'</span><span class="grem">سددت '+st.paid+' من '+st.N+'</span></div></div>';
  }).join('');
}
function gmOpen(id){_gmOpen=id;_gmSel=null;rGameya();}
function gmBack(){_gmOpen=null;rGameya();}
function gmSel(i){_gmSel=i;rGameya();}
function gmDetail(g){
  const st=gmStats(g),box=document.getElementById('GM-DETAIL'),id=Number(g.id),N=st.N;
  const sel=_gmSel!=null?_gmSel:Math.max(0,Math.min(st.cur,N-1));
  const stCls={paid:'tn-t',late:'tn-p',due:'tn-a',future:'tn-v'},stTxt={paid:'اتسدد ✓',late:'متأخر',due:'مستحق',future:'جاي'};
  let h='<div class="gm-top"><button type="button" class="gm-back" onclick="gmBack()">‹ الجمعيات</button><span class="gm-acts"><button type="button" onclick="openGmModal('+id+')" aria-label="تعديل">✏️</button><button type="button" onclick="gmDelete('+id+')" aria-label="حذف">🗑️</button></span></div>';
  h+='<div class="hero3"><div class="h3-top"><span>'+escHtml(g.name)+'</span><span>'+g.membersCount+' عضو</span></div><div class="h3-l">قسطي الشهري</div><div class="h3-v">'+fmt(g.amount)+'</div>'
   +'<div><div class="h3-bar"><i style="width:'+st.pct+'%"></i></div><div class="h3-bl"><span>سددت '+st.paid+' من '+N+' ('+st.pct+'%)</span><span>باقي '+fmt(st.remain)+'</span></div></div>'
   +'<div class="h3-st"><div><small>دفعت</small><b>'+fmt(st.paidAmt)+'</b></div><div><small>هقبض</small><b>'+fmt(st.pot)+'</b></div><div><small>متأخر</small><b class="'+(st.late?'neg':'')+'">'+(st.late?st.late+' قسط':'—')+'</b></div></div></div>';
  const nx=gmNextInfo(g);
  h+='<div class="act-card"><div class="act-card-t">القسط الجاي</div><div class="'+nx.c+'" style="font-weight:700;margin-bottom:.5rem">'+nx.t+'</div>'+(st.next>=0?'<button type="button" class="btn btn-p" onclick="gmPay('+id+','+st.next+')">✓ سددت القسط '+(st.next+1)+'</button>':'')+'</div>';
  const got=st.got;
  h+='<div class="act-card"><div class="act-card-t">🎁 دوري في القبض</div><div style="font-weight:800;font-size:15px">'+escHtml(gmMonthLabel(g,st.turn))+' <small style="color:var(--tx2);font-weight:600">(الشهر '+(st.turn+1)+')</small></div><div style="font-size:12.5px;color:var(--tx2);margin:.2rem 0 .5rem">المبلغ المتوقع '+fmt(st.pot)+(got?' · استلمت '+fmt(got.amount)+' بتاريخ '+escHtml(got.d||''):'')+'</div><button type="button" class="btn '+(got?'btn-s':'btn-p')+'" onclick="gmReceive('+id+')">'+(got?'تعديل الاستلام':'✓ استلمت المبلغ')+'</button></div>';
  h+='<div class="act-card"><div class="act-card-t">الأقساط الشهرية</div>';
  for(let i=0;i<N;i++){const s=gmStatus(g,i),p=g.pay&&g.pay[i],due=gmDue(g,i);
    h+='<div class="gm-row" onclick="gmPay('+id+','+i+')"><span class="gm-n">'+(i+1)+'</span><span class="x"><b>'+escHtml(gmMonthLabel(g,i))+(i===st.turn?' 🎁':'')+'</b><small>'+(p?'اتسدد '+escHtml(p.d||'')+(p.note?' · '+escHtml(p.note):''):'الاستحقاق '+_gFmt(due))+'</small></span><span class="gm-st '+stCls[s]+'">'+stTxt[s]+'</span></div>';}
  h+='</div>';
  const paidNow=gmMembersPaid(g,sel);
  h+='<div class="act-card"><div class="act-card-t">👥 الأعضاء ('+g.membersCount+')</div><div class="chips">';
  for(let i=0;i<N;i++)h+='<button type="button" class="fc'+(i===sel?' on':'')+'" onclick="gmSel('+i+')">'+(i+1)+'</button>';
  h+='</div><div style="font-size:12.5px;color:var(--tx2);margin:.3rem 0 .4rem">شهر '+escHtml(gmMonthLabel(g,sel))+': سدّد '+paidNow+' من '+g.membersCount+'</div><div class="gbar"><i style="width:'+Math.round(paidNow/Math.max(1,g.membersCount)*100)+'%"></i></div>';
  if(g.members&&g.members.length){g.members.forEach(m=>{const on=g.mp&&g.mp[m.id+'_'+sel];h+='<div class="gm-row" onclick="gmMember('+id+','+Number(m.id)+','+sel+')"><span class="x"><b>'+escHtml(m.name)+(((sel%g.members.length)===(m.id-1))?' 🎁':'')+'</b></span><span class="gm-st '+(on?'tn-t':'tn-v')+'">'+(on?'سدد ✓':'لسه')+'</span></div>';});}
  else h+='<div class="gm-step"><button type="button" onclick="gmStep('+id+','+sel+',-1)" aria-label="أقل">−</button><b>'+paidNow+'</b><button type="button" onclick="gmStep('+id+','+sel+',1)" aria-label="أكتر">+</button><small>عدد اللي سدّد</small></div>';
  h+='</div><div class="act-card"><div class="act-card-t">📝 ملاحظات</div><textarea class="inp" id="GM-NOTES" rows="3" placeholder="أي ملاحظات عن الجمعية...">'+escHtml(g.notes||'')+'</textarea>'+(g.organizer?'<div style="font-size:12px;color:var(--tx2);margin-top:.4rem">المنظّم: '+escHtml(g.organizer)+'</div>':'')+'</div>';
  box.innerHTML=h;
  const ta=document.getElementById('GM-NOTES');if(ta)ta.onchange=()=>{g.notes=ta.value.trim();gmSave(g);};
}
function gmMember(gid,mid,mi){const g=gmFind(gid);if(!g)return;g.mp=g.mp||{};const k=mid+'_'+mi;if(g.mp[k])delete g.mp[k];else g.mp[k]=true;gmSave(g);}
function gmStep(gid,mi,d){const g=gmFind(gid);if(!g)return;g.mc=g.mc||{};g.mc[mi]=Math.max(0,Math.min(g.membersCount,(Number(g.mc[mi])||0)+d));gmSave(g);}
function gmPay(gid,i){
  const g=gmFind(gid);if(!g)return;const p=g.pay&&g.pay[i];
  const ov=trashOverlay('<div style="font-weight:800;font-size:15px;margin-bottom:.2rem">القسط '+(i+1)+' — '+escHtml(gmMonthLabel(g,i))+'</div><div style="font-size:12px;color:var(--tx2);margin-bottom:.6rem">'+fmt(g.amount)+' · الاستحقاق '+_gFmt(gmDue(g,i))+'</div><div class="gm-f"><label>تاريخ السداد</label><input class="inp _d" type="date"></div><div class="gm-f"><label>ملاحظة (اختياري)</label><input class="inp _nt" maxlength="60" autocomplete="off"></div><div style="display:flex;gap:.6rem;margin-top:.6rem"><button type="button" class="btn btn-p _ok" style="flex:1">'+(p?'حفظ':'✓ تم السداد')+'</button>'+(p?'<button type="button" class="btn btn-ng _un" style="flex:1">إلغاء السداد</button>':'')+'<button type="button" class="btn btn-s _no" style="flex:1">إغلاق</button></div>');
  ov.querySelector('._d').value=(p&&p.d)||localISO(new Date());ov.querySelector('._nt').value=(p&&p.note)||'';
  ov.querySelector('._no').onclick=()=>ov.remove();
  ov.querySelector('._ok').onclick=()=>{g.pay=g.pay||{};g.pay[i]={d:ov.querySelector('._d').value||localISO(new Date()),note:ov.querySelector('._nt').value.trim()};ov.remove();gmSave(g);toast('✅ اتسجّل السداد');};
  const un=ov.querySelector('._un');if(un)un.onclick=()=>{if(!confirm('إلغاء تسجيل السداد؟'))return;delete g.pay[i];ov.remove();gmSave(g);};
}
function gmReceive(gid){
  const g=gmFind(gid);if(!g)return;const st=gmStats(g),got=g.got;
  const ov=trashOverlay('<div style="font-weight:800;font-size:15px;margin-bottom:.6rem">🎁 استلام الجمعية</div><div class="gm-f"><label>المبلغ اللي استلمته</label><input class="inp _a" inputmode="decimal"></div><div class="gm-f"><label>تاريخ الاستلام</label><input class="inp _d" type="date"></div><div class="gm-f"><label>ملاحظة (اختياري)</label><input class="inp _nt" maxlength="60" autocomplete="off"></div><div style="display:flex;gap:.6rem;margin-top:.6rem"><button type="button" class="btn btn-p _ok" style="flex:1">حفظ</button>'+(got?'<button type="button" class="btn btn-ng _un" style="flex:1">مسح</button>':'')+'<button type="button" class="btn btn-s _no" style="flex:1">إغلاق</button></div>');
  ov.querySelector('._a').value=String(got?got.amount:st.pot);ov.querySelector('._d').value=(got&&got.d)||localISO(new Date());ov.querySelector('._nt').value=(got&&got.note)||'';
  ov.querySelector('._no').onclick=()=>ov.remove();
  ov.querySelector('._ok').onclick=()=>{const a=parseFloat(_digits(ov.querySelector('._a').value));if(!a||a<=0){toast('❌ أدخل المبلغ');return;}g.got={amount:a,d:ov.querySelector('._d').value||localISO(new Date()),note:ov.querySelector('._nt').value.trim()};ov.remove();gmSave(g);toast('✅ اتسجّل الاستلام');};
  const un=ov.querySelector('._un');if(un)un.onclick=()=>{g.got=null;ov.remove();gmSave(g);};
}
function gmParseNames(t){const seen=new Set(),out=[];String(t||'').split(/[\n,،;]+/).forEach(x=>{x=x.trim().slice(0,30);if(x&&!seen.has(x)){seen.add(x);out.push(x);}});return out.slice(0,60);}
function openGmModal(editId){
  const g=editId?gmFind(editId):null;
  const ov=trashOverlay('<div style="font-weight:800;font-size:15px;margin-bottom:.6rem">🤝 '+(g?'تعديل الجمعية':'جمعية جديدة')+'</div><div class="gm-f"><label>اسم الجمعية</label><input class="inp _n" maxlength="40" placeholder="مثال: جمعية العيلة" autocomplete="off"></div><div class="gm-f"><label>قسطي الشهري (اللي بدفعه)</label><input class="inp _a" inputmode="decimal" placeholder="0" autocomplete="off"></div>'
   +(g?'':'<div class="gm-f"><label>عدد الأعضاء</label><input class="inp _c" inputmode="numeric" placeholder="مثال: 10" autocomplete="off"></div><div class="gm-f"><label>أسماء الأعضاء (اختياري — اسم في كل سطر)</label><textarea class="inp _m" rows="3" style="min-height:80px"></textarea></div><div class="gm-r"><div class="gm-f"><label>عدد الشهور</label><input class="inp _mo" inputmode="numeric" placeholder="= عدد الأعضاء" autocomplete="off"></div><div class="gm-f"><label>أول شهر</label><input class="inp _st" type="month"></div></div>')
   +'<div class="gm-r"><div class="gm-f"><label>يوم السداد (1-28)</label><input class="inp _d" inputmode="numeric" placeholder="5" autocomplete="off"></div><div class="gm-f"><label>دوري في القبض (رقم الشهر)</label><input class="inp _t" inputmode="numeric" placeholder="3" autocomplete="off"></div></div><div class="gm-f"><label>المنظّم / رقمه (اختياري)</label><input class="inp _o" maxlength="40" autocomplete="off"></div><div class="gm-f"><label>ملاحظات (اختياري)</label><textarea class="inp _nt" rows="2" style="min-height:56px"></textarea></div><div style="display:flex;gap:.6rem;margin-top:.6rem"><button type="button" class="btn btn-p _ok" style="flex:1">حفظ</button><button type="button" class="btn btn-s _no" style="flex:1">إلغاء</button></div>');
  const $=s=>ov.querySelector(s);
  if(g){$('._n').value=g.name||'';$('._a').value=String(g.amount);$('._d').value=String(g.dueDay||'');$('._t').value=String(g.myTurn||'');$('._o').value=g.organizer||'';$('._nt').value=g.notes||'';}
  else $('._st').value=localYM(new Date());
  $('._no').onclick=()=>ov.remove();
  $('._ok').onclick=()=>{
    const amt=parseFloat(_digits($('._a').value));if(!amt||amt<=0){toast('❌ أدخل قسطك الشهري');return;}
    const dueDay=Math.max(1,Math.min(28,parseInt(_digits($('._d').value))||1)),name=$('._n').value.trim()||'جمعية';
    if(g){const t=parseInt(_digits($('._t').value))||g.myTurn||1;if(t<1||t>g.months){toast('❌ دورك لازم يكون بين 1 و '+g.months);return;}
      g.name=name;g.amount=amt;g.dueDay=dueDay;g.myTurn=t;g.organizer=$('._o').value.trim();g.notes=$('._nt').value.trim();ov.remove();gmSave(g);return;}
    const names=gmParseNames($('._m').value);let count=names.length||parseInt(_digits($('._c').value))||0;
    if(count<2||count>60){toast('❌ عدد الأعضاء لازم يكون بين 2 و 60');return;}
    const months=parseInt(_digits($('._mo').value))||count;if(months<1||months>60){toast('❌ عدد الشهور لازم يكون بين 1 و 60');return;}
    const turn=parseInt(_digits($('._t').value))||1;if(turn<1||turn>months){toast('❌ دورك لازم يكون بين 1 و '+months);return;}
    const ng={id:newId(),name,amount:amt,months,start:$('._st').value||localYM(new Date()),dueDay,membersCount:count,members:names.map((n,i)=>({id:i+1,name:n})),myTurn:turn,organizer:$('._o').value.trim(),notes:$('._nt').value.trim(),pay:{},mp:{},mc:{},got:null,created:new Date().toISOString()};
    if(!DS.gameyas)DS.gameyas=[];DS.gameyas.unshift(ng);ov.remove();_gmOpen=ng.id;_gmSel=null;gmSave(ng);toast('✅ اتضافت الجمعية');
  };
}
function gmDelete(id){
  if(!confirm('حذف الجمعية وكل بياناتها؟'))return;
  DS.gameyas=(DS.gameyas||[]).filter(x=>x.id!==id);_gmOpen=null;sv();cloudDel('gameyas',id).catch(e=>{});rGameya();toast('🗑️ اتحذفت');
}

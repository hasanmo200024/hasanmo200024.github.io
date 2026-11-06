// ═══ 13-prayer — مواعيد الصلاة (حساب فلكي محلي بدون إنترنت) ═══
// الطريقة: الهيئة المصرية العامة للمساحة (الفجر 19.5° والعشاء 17.5°) — خوارزمية PrayTimes.
const PRAYER_CITIES=[['القاهرة',30.0444,31.2357],['الجيزة',30.0131,31.2089],['الإسكندرية',31.2001,29.9187],['بورسعيد',31.2653,32.3019],['السويس',29.9668,32.5498],['الإسماعيلية',30.5965,32.2715],['دمياط',31.4165,31.8133],['المنصورة',31.0409,31.3785],['طنطا',30.7865,31.0004],['الزقازيق',30.5877,31.5020],['بنها',30.4660,31.1848],['شبين الكوم',30.5972,30.9876],['دمنهور',31.0341,30.4682],['كفر الشيخ',31.1107,30.9388],['الفيوم',29.3084,30.8428],['بني سويف',29.0661,31.0994],['المنيا',28.1099,30.7503],['أسيوط',27.1783,31.1859],['سوهاج',26.5591,31.6948],['قنا',26.1551,32.7160],['الأقصر',25.6872,32.6396],['أسوان',24.0889,32.8998],['الغردقة',27.2579,33.8116],['شرم الشيخ',27.9158,34.3300],['مرسى مطروح',31.3543,27.2373],['العريش',31.1316,33.7984],['الخارجة',25.4390,30.5586]];
const PRAYER_AR={fajr:'الفجر',sunrise:'الشروق',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};
const _dr=d=>d*Math.PI/180,_rd=r=>r*180/Math.PI,_sin=d=>Math.sin(_dr(d)),_cos=d=>Math.cos(_dr(d)),_tan=d=>Math.tan(_dr(d));
const _asin=x=>_rd(Math.asin(x)),_acos=x=>_rd(Math.acos(x)),_atan2=(y,x)=>_rd(Math.atan2(y,x)),_acot=x=>_rd(Math.atan(1/x));
const _fixA=a=>a-360*Math.floor(a/360),_fixH=a=>a-24*Math.floor(a/24);
function _julian(y,m,d){if(m<=2){y-=1;m+=12;}const A=Math.floor(y/100),B=2-A+Math.floor(A/4);return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5;}
function _sunPos(jd){const D=jd-2451545.0,g=_fixA(357.529+0.98560028*D),q=_fixA(280.459+0.98564736*D),L=_fixA(q+1.915*_sin(g)+0.020*_sin(2*g)),e=23.439-0.00000036*D;const RA=_atan2(_cos(e)*_sin(L),_cos(L))/15;return{decl:_asin(_sin(e)*_sin(L)),eqt:q/15-_fixH(RA)};}
function prayerTimes(date,lat,lng,tz){
  const jd=_julian(date.getFullYear(),date.getMonth()+1,date.getDate())-lng/360;
  const midDay=t=>_fixH(12-_sunPos(jd+t).eqt);
  const angleT=(ang,t,ccw)=>{const decl=_sunPos(jd+t).decl,v=(-_sin(ang)-_sin(decl)*_sin(lat))/(_cos(decl)*_cos(lat)),h=_acos(Math.max(-1,Math.min(1,v)))/15,noon=midDay(t);return noon+(ccw?-h:h);};
  const asrT=(f,t)=>{const decl=_sunPos(jd+t).decl;return angleT(-_acot(f+_tan(Math.abs(lat-decl))),t,false);};
  const T={fajr:angleT(19.5,5/24,true),sunrise:angleT(0.833,6/24,true),dhuhr:midDay(12/24),asr:asrT(1,13/24),sunset:angleT(0.833,18/24,false),isha:angleT(17.5,18/24,false)};
  T.maghrib=T.sunset;const adj=tz-lng/15;Object.keys(T).forEach(k=>{T[k]+=adj;});return T;
}
function prayerCfg(){const p=DS.prayer||{};return{city:p.city||'القاهرة',lat:p.lat!=null?p.lat:30.0444,lng:p.lng!=null?p.lng:31.2357,hide:!!p.hide,adj:p.adj||{}};}
function prayerDay(date,cfg){const T=prayerTimes(date,cfg.lat,cfg.lng,-date.getTimezoneOffset()/60),o={};['fajr','sunrise','dhuhr','asr','maghrib','isha'].forEach(k=>{o[k]=T[k]+(Number((cfg.adj||{})[k])||0)/60;});return o;}
function prayerDate(date,h){const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());d.setMinutes(Math.round(h*60));return d;}
function nextPrayer(now,cfg){
  const day=prayerDay(now,cfg);
  for(const k of ['fajr','dhuhr','asr','maghrib','isha']){const t=prayerDate(now,day[k]);if(t>now)return{k:k,t:t};}
  const tm=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);return{k:'fajr',t:prayerDate(tm,prayerDay(tm,cfg).fajr),tomorrow:true};
}
function fmtPrayer(h){const m=Math.round((((h%24)+24)%24)*60),hh=Math.floor(m/60)%24,mm=m%60;return(hh%12||12)+':'+String(mm).padStart(2,'0')+' '+(hh>=12?'م':'ص');}
function rPrayer(){
  const card=document.getElementById('PR-CARD');if(!card)return;
  const cfg=prayerCfg();if(cfg.hide){card.style.display='none';return;}
  const now=new Date(),day=prayerDay(now,cfg),nx=nextPrayer(now,cfg);
  card.style.display='block';document.getElementById('PR-CITY').textContent=cfg.city+' ⌄';
  const m=Math.max(0,Math.round((nx.t-now)/60000)),hh=Math.floor(m/60),mm=m%60;
  document.getElementById('PR-NEXT-N').textContent=PRAYER_AR[nx.k];
  document.getElementById('PR-NEXT-T').textContent=fmtPrayer(nx.t.getHours()+nx.t.getMinutes()/60);
  document.getElementById('PR-NEXT-R').textContent='بعد '+(hh?hh+' س ':'')+mm+' د';
  const row=document.getElementById('PR-ROW');row.innerHTML='';
  ['fajr','sunrise','dhuhr','asr','maghrib','isha'].forEach(k=>{const c=document.createElement('div');c.className='pr-c'+(k===nx.k?' on':'')+(k==='sunrise'?' sr':'');c.innerHTML='<span></span><b></b>';c.firstChild.textContent=PRAYER_AR[k];c.lastChild.textContent=fmtPrayer(day[k]);row.appendChild(c);});
}
function openPrayerSettings(){
  const c=prayerCfg();
  const opts=PRAYER_CITIES.map(x=>'<option value="'+x[0]+'"'+(x[0]===c.city?' selected':'')+'>'+x[0]+'</option>').join('')+(c.city==='موقعي'?'<option value="موقعي" selected>موقعي الحالي</option>':'');
  const adj=['fajr','dhuhr','asr','maghrib','isha'].map(k=>'<label class="pr-adj"><span>'+PRAYER_AR[k]+'</span><input type="number" min="-30" max="30" step="1" data-k="'+k+'" value="'+(Number((c.adj||{})[k])||0)+'"></label>').join('');
  const ov=trashOverlay('<div style="font-weight:800;font-size:15px;margin-bottom:.6rem">🕌 مواعيد الصلاة</div><div class="lb" style="margin-bottom:.3rem">المدينة</div><select class="inp _c">'+opts+'</select><button type="button" class="btn btn-s _geo" style="margin-top:.5rem">📍 استخدم موقعي الحالي</button><label style="display:flex;gap:.5rem;align-items:center;margin:.8rem 0;font-size:13px;font-weight:700"><input type="checkbox" class="_show"> إظهار في الرئيسية</label><details style="margin-bottom:.6rem"><summary style="font-size:12.5px;cursor:pointer;color:var(--tx2)">تعديل الدقائق (اختياري)</summary><div class="_adj" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:.5rem">'+adj+'</div></details><div style="font-size:11px;color:var(--tx2);line-height:1.7;margin-bottom:.6rem">الحساب تقريبي بطريقة الهيئة المصرية للمساحة، وبيشتغل بدون إنترنت. لو فيه فرق دقيقة مع المسجد عندك، عدّل الدقائق.</div><div style="display:flex;gap:.6rem"><button type="button" class="btn btn-p _ok" style="flex:1">حفظ</button><button type="button" class="btn btn-s _no" style="flex:1">إلغاء</button></div>');
  ov.querySelector('._show').checked=!c.hide;ov.querySelector('._no').onclick=()=>ov.remove();
  ov.querySelector('._geo').onclick=()=>{
    if(!navigator.geolocation){toast('الموقع غير متاح على الجهاز');return;}
    navigator.geolocation.getCurrentPosition(pos=>{DS.prayer=Object.assign({},prayerCfg(),{city:'موقعي',lat:pos.coords.latitude,lng:pos.coords.longitude});sv();ov.remove();rPrayer();toast('✅ تم تحديد موقعك');},()=>toast('تعذّر تحديد الموقع — اختر مدينتك'),{timeout:10000,maximumAge:3600000});
  };
  ov.querySelector('._ok').onclick=()=>{
    const city=PRAYER_CITIES.find(x=>x[0]===ov.querySelector('._c').value),cur=prayerCfg(),adj={};
    ov.querySelectorAll('._adj input').forEach(i=>{adj[i.dataset.k]=Math.max(-30,Math.min(30,parseInt(i.value)||0));});
    DS.prayer={city:city?city[0]:cur.city,lat:city?city[1]:cur.lat,lng:city?city[2]:cur.lng,hide:!ov.querySelector('._show').checked,adj:adj};
    sv();ov.remove();rPrayer();toast('✅ تم الحفظ');
  };
}
(function(){const o=rHomeNew;rHomeNew=function(){const r=o.apply(this,arguments);try{rPrayer();}catch(e){}return r;};})();
setInterval(function(){try{if(!window._curTab||window._curTab==='home')rPrayer();}catch(e){}},30000);

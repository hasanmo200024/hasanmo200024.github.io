// ═══ 09-vaults — الخزائن ═══
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

// ── توزيع المدخرات ──
function rVaultBar(){
  const card=document.getElementById('VAULT-BAR-CARD'),box=document.getElementById('VAULT-BAR');if(!card||!box)return;
  const bal=v=>{const h=v.history||[];return Number(h.length?h[h.length-1].balance:v.balance)||0;};
  const vs=(DS.savingsVaults||[]).map(v=>({n:v.name||'خزنة',a:bal(v)})).filter(v=>v.a>0).sort((x,y)=>y.a-x.a);
  const tot=vs.reduce((s,v)=>s+v.a,0);
  if(!vs.length||!tot){card.style.display='none';return;}
  const col=['#5b3fa6','#0f6b62','#b4432a','#a02f7e','#8f5c08'];
  box.innerHTML='<div class="vb">'+vs.map((v,i)=>'<i style="width:'+(v.a/tot*100).toFixed(1)+'%;background:'+col[i%5]+'"></i>').join('')+'</div><div class="vl">'+vs.map((v,i)=>'<span><i style="background:'+col[i%5]+'"></i>'+escHtml(v.n)+' '+Math.round(v.a/tot*100)+'%</span>').join('')+'</div>';
  card.style.display='block';
}
(function(){const o=rVaults;rVaults=function(){const r=o.apply(this,arguments);try{rVaultBar();}catch(e){}return r;};})();

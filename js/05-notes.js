// ═══ 05-notes — الملاحظات، مركز الإشعارات، المقالات ═══
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
const NOTE_TINT={'شغل':'tn-p','شخصي':'tn-v','أفكار':'tn-t','أخرى':'tn-a'};
let _nQ='',_nT='الكل';
function rNotes(){
  const notes=DS.notes||[];
  const listEl=document.getElementById('NOTES-LIST'),emptyEl=document.getElementById('NOTES-EMPTY'),cnt=document.getElementById('HOME-NOTES-CNT'),tools=document.getElementById('NOTES-TOOLS');
  if(cnt)cnt.textContent=notes.length;
  if(!listEl)return;
  if(tools)tools.style.display=notes.length?'block':'none';
  if(!notes.length){listEl.innerHTML='';if(emptyEl)emptyEl.style.display='flex';return;}
  if(emptyEl)emptyEl.style.display='none';
  const topics=['الكل'].concat([...new Set(notes.map(n=>n.topic||'أخرى'))]);
  if(topics.indexOf(_nT)<0)_nT='الكل';
  const chips=document.getElementById('NOTES-CHIPS');
  if(chips){chips.innerHTML='';topics.forEach(t=>{const b=document.createElement('button');b.type='button';b.className='fc'+(t===_nT?' on':'');b.textContent=t;b.onclick=()=>{_nT=t;rNotes();};chips.appendChild(b);});}
  const q=_nQ.trim().toLowerCase();
  const view=notes.filter(n=>(_nT==='الكل'||(n.topic||'أخرى')===_nT)&&(!q||((n.title||'')+' '+(n.body||'')).toLowerCase().indexOf(q)>-1));
  if(!view.length){listEl.innerHTML='<div class="n-none">مفيش ملاحظات بالشكل ده</div>';return;}
  const cols=['',''];
  view.forEach((n,i)=>{
    const dt=n.date?new Date(n.date).toLocaleDateString('ar-EG',{day:'numeric',month:'short'}):'',t=n.topic||'أخرى';
    cols[i%2]+='<div class="nc" onclick="delNoteConfirm('+Number(n.id)+')"><span class="tg '+(NOTE_TINT[t]||'tn-k')+'">'+escHtml(t)+'</span><b>'+escHtml(n.title)+'</b>'+(n.body?'<p>'+escHtml(n.body)+'</p>':'')+'<small class="nd">'+(n.reminder?'<svg class="sv" aria-hidden="true"><use href="#bell"/></svg>':'')+dt+'</small></div>';
  });
  listEl.innerHTML='<div class="mas"><div>'+cols[0]+'</div><div>'+cols[1]+'</div></div>';
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
  const listEl=document.getElementById('ARTICLES-LIST'),emptyEl=document.getElementById('ARTICLES-EMPTY');
  if(!listEl)return;
  if(!arts.length){listEl.innerHTML='';if(emptyEl)emptyEl.style.display='flex';return;}
  if(emptyEl)emptyEl.style.display='none';
  const tints=['tn-v','tn-p','tn-t','tn-a','tn-k'];
  listEl.innerHTML='<div class="ar-list">'+arts.map((a,i)=>{
    const d=new Date(a.date),dt=isNaN(d)?'':d.toLocaleDateString('ar-EG',{day:'numeric',month:'long'});
    const wc=a.body?a.body.trim().split(/\s+/).length:0,mins=Math.max(1,Math.round(wc/180));
    const snippet=escHtml((a.body||'').slice(0,90)+((a.body||'').length>90?'…':''));
    const cover=a.image?'<img alt="" src="'+escHtml(a.image)+'" class="cv">':'<span class="cv '+tints[i%5]+'"><svg class="sv" aria-hidden="true"><use href="#art"/></svg></span>';
    return '<div class="ar" onclick="openArticleEdit('+Number(a.id)+')">'+cover+'<span class="x"><b>'+escHtml(a.title)+'</b><p>'+snippet+'</p><small>'+dt+' · '+mins+' د قراءة</small></span></div>';
  }).join('')+'</div>';
}

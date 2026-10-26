// ═══ 04-sync — المزامنة مع Firebase ═══
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
      
      DS.savingsEnabled=!!(data.features&&data.features.savingsEnabled);
      applyVaultVisibility();
      if(data.expenseBudget)DS.expenseBudget=data.expenseBudget;
      if(data.pendingNotice&&data.pendingNotice.msg){
        notifyUser(data.pendingNotice.msg);
        db.collection('users').doc(DS.uid).set({pendingNotice:null},{merge:true}).catch(e=>{});
      }
      sv();updProf();updSubStatus();updSubBar();}
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

// ═══ 04-sync — المزامنة: دمج ذكي (الأحدث يكسب) + علامات حذف ═══
// القاعدة: كل عنصر ليه توقيت تعديل u. الحذف بيسجّل علامة في tombstones عشان ميرجعش من جهاز قديم.
const SYNC_COLLS=[['contacts','rAll'],['notes','rNotes'],['articles','rArticles'],['savings','rSavings'],['recurringExpenses','rRecur'],['expenses','rExpenses'],['incomes','rExpenses'],['tasks','rTasks'],['occasions','rOccasions'],['savingsVaults','rVaults'],['medications','rAll'],['doctorAppointments','rAll'],['appointments','rAll']];
const SYNC_SET=new Set(SYNC_COLLS.map(x=>x[0]));
const TOMB_DAYS=60;
function _normId(id){return isNaN(id)?id:Number(id);}
function syncLog(kind,coll,id){try{const a=DS._slog||(DS._slog=[]);a.push({t:Date.now(),k:kind,c:coll,i:String(id)});if(a.length>60)a.splice(0,a.length-60);}catch(e){}}
function wipeLocalData(){SYNC_COLLS.forEach(x=>{DS[x[0]]=[];});DS._tomb={};DS._slog=[];DS.expenseBudget={monthly:null,daily:null};DS.avatar='';}
function switchOwner(uid){if(DS._owner&&DS._owner!==uid)wipeLocalData();DS._owner=uid;}
function cloudSet(coll,id,data,opts){
  if(!FB_READY||!DS.uid)return Promise.resolve();
  if(SYNC_SET.has(coll)&&data&&typeof data==='object'&&!opts){data.u=Date.now();sv();}
  return db.collection('users').doc(DS.uid).collection(coll).doc(String(id)).set(data,opts);
}
function cloudDel(coll,id){
  if(!SYNC_SET.has(coll))return(FB_READY&&DS.uid)?db.collection('users').doc(DS.uid).collection(coll).doc(String(id)).delete():Promise.resolve();
  const at=Date.now();(DS._tomb||(DS._tomb={}))[coll+'_'+id]=at;sv();
  if(!FB_READY||!DS.uid)return Promise.resolve();
  const ref=db.collection('users').doc(DS.uid),b=db.batch();
  b.delete(ref.collection(coll).doc(String(id)));b.set(ref.collection('tombstones').doc(coll+'_'+id),{c:coll,id:String(id),at});
  return b.commit();
}
async function mergeCollection(coll){
  const ref=db.collection('users').doc(DS.uid);
  const res=await Promise.all([ref.collection(coll).get(),ref.collection('tombstones').where('c','==',coll).get()]);
  const cloud=new Map(),tomb=new Map(),ltomb=DS._tomb||(DS._tomb={});
  res[0].forEach(d=>cloud.set(String(d.id),Object.assign({id:_normId(d.id)},d.data())));
  res[1].forEach(d=>{const x=d.data();tomb.set(String(x.id),Number(x.at)||0);});
  const local=new Map((DS[coll]||[]).map(i=>[String(i.id),i])),out=[],ops=[];
  new Set([...cloud.keys(),...local.keys()]).forEach(id=>{
    const c=cloud.get(id),l=local.get(id),lt=ltomb[coll+'_'+id]||0,ct=tomb.get(id)||0,ta=Math.max(lt,ct);
    const cu=c?Number(c.u)||0:0,lu=l?Number(l.u)||0:0;
    if(ta&&ta>=Math.max(cu,lu)){
      if(c)ops.push(b=>b.delete(ref.collection(coll).doc(id)));
      if(lt&&!ct)ops.push(b=>b.set(ref.collection('tombstones').doc(coll+'_'+id),{c:coll,id,at:lt}));
      if(l&&ct)syncLog('drop',coll,id);
    }else if(c&&!l){out.push(c);syncLog('add',coll,id);}
    else if(l&&!c){if(!l.u)l.u=Date.now();out.push(l);ops.push(b=>b.set(ref.collection(coll).doc(id),JSON.parse(JSON.stringify(l))));syncLog('push',coll,id);}
    else if(lu>cu){out.push(l);ops.push(b=>b.set(ref.collection(coll).doc(id),JSON.parse(JSON.stringify(l))));}
    else out.push(c);
  });
  DS[coll]=out;sv();
  for(let i=0;i<ops.length;i+=400){const b=db.batch();ops.slice(i,i+400).forEach(f=>f(b));try{await withTO(b.commit(),20000);}catch(e){}}
}
function pruneTombstones(){
  try{
    const cut=Date.now()-TOMB_DAYS*864e5,lt=DS._tomb||{};Object.keys(lt).forEach(k=>{if(lt[k]<cut)delete lt[k];});
    db.collection('users').doc(DS.uid).collection('tombstones').where('at','<',cut).get().then(s=>{s.forEach(d=>d.ref.delete().catch(()=>{}));}).catch(()=>{});
  }catch(e){}
}
function syncFromCloudCore(){
  if(!FB_READY||!DS.uid||window._syncBusy)return;
  window._syncBusy=true;switchOwner(DS.uid);
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
  (async()=>{
    let failed=false;
    for(const x of SYNC_COLLS){
      try{await withTO(mergeCollection(x[0]),30000);}catch(e){failed=true;continue;}
      try{if(typeof window[x[1]]==='function')window[x[1]]();}catch(e){}
    }
    try{pruneTombstones();}catch(e){}
    window._syncBusy=false;
    if(dot)dot.style.background=failed?'#ef4444':'#4ade80';if(txt)txt.textContent=failed?'خطأ':'مزامن';
    const s=document.getElementById('SYNC-S');if(s&&!failed){const n=new Date();s.textContent='آخر مزامنة: '+p2(n.getHours())+':'+p2(n.getMinutes());}
  })();
}
function syncNow(){if(FB_READY)syncFromCloud();toast('🔄 جاري المزامنة...');}
function saveToCloud(contact){cloudSet('contacts',contact.id,contact).catch(e=>{});}
function deleteFromCloud(id){cloudDel('contacts',id).catch(e=>{});}

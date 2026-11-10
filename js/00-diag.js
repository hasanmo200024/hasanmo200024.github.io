// ═══ 00-diag — سجل أخطاء التطبيق (بيتحمّل أول حاجة) ═══
(function(){
  var K='qistas_err',MAX=30;
  function load(){try{return JSON.parse(localStorage.getItem(K)||'[]');}catch(e){return [];}}
  function push(o){try{var a=load();a.push(o);if(a.length>MAX)a=a.slice(-MAX);localStorage.setItem(K,JSON.stringify(a));}catch(e){}}
  window.addEventListener('error',function(e){
    var t=e.target;
    if(t&&t!==window&&(t.src||t.href)){push({t:Date.now(),m:'تعذّر تحميل: '+(t.src||t.href).split('?')[0].split('/').slice(-2).join('/'),f:'',l:0});return;}
    push({t:Date.now(),m:String(e.message||e.type).slice(0,200),f:String(e.filename||'').split('?')[0].split('/').slice(-2).join('/'),l:e.lineno||0});
  },true);
  window.addEventListener('unhandledrejection',function(e){var r=e.reason;push({t:Date.now(),m:'promise: '+String((r&&r.message)||r).slice(0,200),f:'',l:0});});
  window.__diag={get:load,clear:function(){try{localStorage.removeItem(K);}catch(e){}}};
})();

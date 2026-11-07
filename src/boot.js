/* ===================== BOOT ===================== */
/* iOS Safari bỏ qua user-scalable=no trong viewport — chặn pinch/double-tap bằng JS */
document.addEventListener('gesturestart', e=>e.preventDefault());
document.addEventListener('gesturechange', e=>e.preventDefault());
document.addEventListener('touchmove', e=>{ if(e.scale!==1) e.preventDefault(); }, {passive:false});
let __lastTap=0;
document.addEventListener('touchend', e=>{ const n=Date.now(); if(n-__lastTap<=300) e.preventDefault(); __lastTap=n; }, {passive:false});
Session.load();
I18N.observe();
View.init();
render(html`<${App}/>`, document.getElementById('app'));
Store.init();
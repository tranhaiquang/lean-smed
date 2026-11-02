/* ===================== BOOT ===================== */
Session.load();
I18N.observe();
View.init();
render(html`<${App}/>`, document.getElementById('app'));
Store.init();
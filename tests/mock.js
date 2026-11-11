// Faux Firebase (Auth + Firestore) injecté à la place du SDK pour tester l'appli sans réseau.
module.exports=`
(function(){
  var store={revente_matches:{},revente_config:{abonnements:{a:{aR:{season:'2026-27',person:'Rachid',amount:270,ref:'9564',source:'billetterie',by:'Rachid'},aS:{season:'2026-27',person:'Sylvain',amount:270,ref:'',source:'manuel',by:'Rachid'}}},ventes:{v:{vlot239:{date:'2026-08-30',label:'Paris FC – Nice',price:32,fee:0,source:'billetterie',seller:'Sylvain',sellerSrc:'billetterie',reglement:'verse',by:'Rachid'},vlot1765:{date:'2026-09-12',label:'Paris FC – Lyon',price:130,fee:15.6,source:'billetterie',seller:'Sylvain',sellerSrc:'billetterie',reglement:'verse',by:'Rachid'},vlot3410:{date:'2026-09-19',label:'Paris FC – Strasbourg',price:50,fee:6,source:'billetterie',seller:'Sylvain',sellerSrc:'billetterie',reglement:'verse',by:'Rachid'},vlot4617:{date:'2026-10-18',label:'Paris FC – Rennes',price:60,fee:8.96,source:'billetterie',seller:'Rachid',sellerSrc:'billetterie',reglement:'verse',by:'Rachid'},vlot5378:{date:'2026-11-01',label:'Paris FC – Monaco',price:54,fee:0,source:'billetterie',seller:'Rachid',sellerSrc:'billetterie',reglement:'attente',by:'Rachid'}}}}};
  window.__log=[];window.__failSnap=false;
  function mk(e){return {email:e,reauthenticateWithCredential:function(c){if(c.p!=='bon'){var er=new Error('x');er.code='auth/invalid-credential';return Promise.reject(er);}return Promise.resolve();},updatePassword:function(p){window.__log.push(['updatePassword',p]);return Promise.resolve();}};}
  var user=(location.search.indexOf('restore')>=0)?mk('sylvain@parisfc-revente.fr'):null,listeners=[];
  function colRef(name){
    var c={
      doc:function(id){return {
        get:function(){var d=store[name][id];return Promise.resolve({exists:!!d,data:function(){return Object.assign({},d);}});},
        update:function(p,val){window.__log.push(['update',name,id,p]);if(typeof p==='string'){var k=p.split('.');if(val==='__DEL__')delete store[name][id][k[0]][k[1]];return Promise.resolve();}Object.assign(store[name][id],p);return Promise.resolve();},
        set:function(p,o){window.__log.push(['set',name,id,p]);var cur=store[name][id]=store[name][id]||{};Object.keys(p).forEach(function(k){if(k==='v'){cur.v=Object.assign(cur.v||{},p.v);}else if(k==='t'){cur.t=Object.assign(cur.t||{},p.t);}else if(k==='a'){cur.a=Object.assign(cur.a||{},p.a);}else cur[k]=p[k];});return Promise.resolve();},
        onSnapshot:function(){return function(){};},
        __id:id,__col:name};},
      limit:function(){return c;},
      orderBy:function(){return c;},
      get:function(){var ids=Object.keys(store[name]);
        var docs=ids.map(function(i){return {id:i,data:function(){return Object.assign({},store[name][i]);}};});
        docs.sort(function(a,b){return a.data().order-b.data().order;});
        return Promise.resolve({empty:!ids.length,docs:docs});},
      onSnapshot:function(a,b){if(window.__failSnap&&b)setTimeout(function(){b(new Error('boom'));},50);return function(){};}
    };return c;}
  window.firebase={apps:[],initializeApp:function(){this.apps.push(1);},
    auth:function(){return {
      get currentUser(){return user;},
      onAuthStateChanged:function(cb){setTimeout(function(){cb(user);},10);},
      signInWithEmailAndPassword:function(e,p){window.__log.push(['login',e]);
        if(p==='bon'){user=mk(e);return Promise.resolve();}
        var er=new Error('bad');er.code='auth/invalid-credential';return Promise.reject(er);},
      signOut:function(){user=null;return Promise.resolve();}};},
    firestore:function(){return {enablePersistence:function(){return Promise.resolve();},collection:colRef,
      batch:function(){var ops=[];return {set:function(r,d){ops.push([r,d]);},commit:function(){ops.forEach(function(o){store[o[0].__col][o[0].__id]=o[1];});window.__log.push(['batch',ops.length]);return Promise.resolve();}};}};}};
window.firebase.firestore.FieldValue={delete:function(){return '__DEL__';}};
window.firebase.auth.EmailAuthProvider={credential:function(e,p){return {e:e,p:p};}};
})();`;

// Envoie un e-mail quotidien (12h Paris) si des actions sont à faire. Même grille de prix que l'appli.
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const parisHour = Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',hour12:false}).format(new Date()));
if (process.env.FORCE !== 'true' && parisHour !== 12) { console.log('Pas 12h à Paris, on sort.'); process.exit(0); }

const num = v => { if (v==null||v==='') return null; const n=Number(String(v).replace(',','.')); return isFinite(n)?n:null; };
const N = v => Number(v)||0;
const eur = n => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n);
const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
const g = t => parts.find(x=>x.type===t).value;
const today = `${g('year')}-${g('month')}-${g('day')}`;
const D = s => { const p=s.split('-').map(Number); return Date.UTC(p[0],p[1]-1,p[2]); };
const jl = J => J===0?'jour J':'J-'+J;

function plan(m,J,cfg){
  let base=num(m.paid); if(base==null) base=num(cfg.basePrice); if(base==null) return null;
  let floorV=num(m.floor); if(floorV==null) floorV=Math.round(base*N(cfg.floorPct)/100);
  const openP=Math.round(base*(1+N(cfg.markup)/100));
  return Math.max(floorV, Math.round(J<=1?floorV : J<=3?openP*(1-N(cfg.drop3)/100) : J<=7?openP*(1-N(cfg.drop7)/100) : openP));
}


// Notification push (FCM) vers les appareils enregistrés dans revente_config/push
async function sendPush(db, title, body){
  try{
    const doc=(await db.doc('revente_config/push').get()).data()||{};
    const entries=Object.entries(doc.t||{}).filter(([,v])=>v&&v.token);
    if(!entries.length){ console.log('Push : aucun appareil enregistré.'); return; }
    const res=await admin.messaging().sendEachForMulticast({
      tokens:entries.map(([,v])=>v.token),
      data:{title,body,url:'https://crachdev.github.io/revente-pfc/'},
      webpush:{headers:{Urgency:'high',TTL:'43200'}}
    });
    const dead=[];
    res.responses.forEach((r,i)=>{ if(!r.success){ const c=(r.error&&r.error.code)||''; console.log('Push échec',entries[i][0],c); if(/registration-token-not-registered|invalid-registration-token|invalid-argument/.test(c)) dead.push(entries[i][0]); } });
    for(const k of dead){ await db.doc('revente_config/push').update({['t.'+k]:admin.firestore.FieldValue.delete()}); }
    console.log('Push envoyé',res.successCount+'/'+entries.length);
  }catch(e){ console.error('Push ignoré :',e.message||e); }
}
(async()=>{
  admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))});
  const db=admin.firestore();
  const cfg=(await db.doc('revente_config/main').get()).data()||{};
  const snap=await db.collection('revente_matches').get();
  const items=[];
  snap.forEach(d=>{
    const m={id:d.id,...d.data()}; if(!m.date) return;
    const J=Math.round((D(m.date)-D(today))/86400000); if(J<0) return;
    if(m.status==='vendue'||m.status==='gardee') return;
    const p=plan(m,J,cfg);
    if(m.status==='ouverte') items.push({pr:0,J,t:`<b>À poster</b> — ${m.opp} (${jl(J)}) : revente ouverte${p!=null?', mets la paire à '+eur(p):''}.`});
    else if(m.status==='enligne'){ const L=num(m.listed); if(p!=null&&L!=null&&p<L) items.push({pr:1,J,t:`<b>Baisser le prix</b> — ${m.opp} (${jl(J)}) : de ${eur(L)} à ${eur(p)}.`}); }
    else if(m.status==='attente'&&J<=N(cfg.watchFrom)) items.push({pr:2,J,t:`<b>Surveiller</b> — ${m.opp} (${jl(J)}) : revente pas encore vue.`});
  });
  items.sort((a,b)=>a.pr-b.pr||a.J-b.J);
  if(!items.length){
    console.log('Rien à signaler.');
    if(process.env.FORCE==='true') await sendPush(db,'Revente PFC','Test : les notifications push fonctionnent.');
    return;
  }
  const url='https://crachdev.github.io/revente-pfc/';
  const html=`<p>Revente Paris FC — à faire aujourd'hui :</p><ul>${items.map(i=>`<li>${i.t}</li>`).join('')}</ul><p><a href="${url}">Ouvrir le tableau de bord</a> · <a href="https://billetterie.parisfc.fr/fr/calendrier?filters%5Bstate%5D%5B0%5D=choice_secondary_market">Page des reventes</a></p>`;
  const to=process.env.MAIL_TO;
  const tr=nodemailer.createTransport({service:'gmail',auth:{user:to.split(',')[0].trim(),pass:process.env.GMAIL_APP_PASSWORD}});
  await tr.sendMail({from:`Revente PFC <${to.split(',')[0].trim()}>`,to,subject:`Revente PFC : ${items.length} action(s) à faire`,html});
  console.log('Envoyé',items.length);
  const strip=t=>t.replace(/<[^>]+>/g,'');
  await sendPush(db,`Revente PFC : ${items.length} action(s)`,items.slice(0,3).map(i=>strip(i.t)).join(' | ').slice(0,180));
})().catch(e=>{console.error(e);process.exit(1);});

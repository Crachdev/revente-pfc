// Sauvegarde hebdomadaire : exporte Firestore en JSON et l'envoie par e-mail (pièce jointe).
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const ser = v => {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(ser);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ser(x)]));
  return v;
};
(async () => {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  const db = admin.firestore();
  const out = { exportedAt: new Date().toISOString(), revente_matches: {}, revente_config: {} };
  for (const c of ['revente_matches', 'revente_config']) {
    const snap = await db.collection(c).get();
    snap.forEach(d => { out[c][d.id] = ser(d.data()); });
  }
  const nM = Object.keys(out.revente_matches).length, nC = Object.keys(out.revente_config).length;
  if (!nM) throw new Error('Aucun match trouvé : sauvegarde annulée');
  const day = new Date().toISOString().slice(0, 10);
  const to = process.env.MAIL_TO;
  const tr = nodemailer.createTransport({ service: 'gmail', auth: { user: to.split(',')[0].trim(), pass: process.env.GMAIL_APP_PASSWORD } });
  await tr.sendMail({
    from: `Revente PFC <${to.split(',')[0].trim()}>`, to,
    subject: `Revente PFC : sauvegarde du ${day}`,
    html: `<p>Sauvegarde hebdomadaire jointe (${nM} matchs, ${nC} documents de configuration).</p><p>Conserve ce fichier : il permet de tout restaurer en cas de problème.</p>`,
    attachments: [{ filename: `revente-pfc-sauvegarde-${day}.json`, content: JSON.stringify(out, null, 2), contentType: 'application/json' }]
  });
  console.log('Sauvegarde envoyée', nM, nC);
})().catch(e => { console.error(e); process.exit(1); });

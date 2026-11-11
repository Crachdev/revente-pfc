// Rappels de suivi (fonction pure, testée dans tests/app.test.js).
// Entrées : ventes, virements, matchs (tableaux d'objets), date du jour "YYYY-MM-DD", jour de semaine (1 = lundi).
const D = s => { const p = String(s).split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); };
const N = v => Number(String(v == null ? 0 : v).replace(',', '.')) || 0;
const r2 = n => Math.round(n * 100) / 100;
const eur = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);
const net = v => r2(N(v.price) - N(v.fee));
const closed = ['vendue', 'pretee', 'nonvendue', 'gardee'];

function suivi(ventes, transfers, matches, today, weekday, opt) {
  opt = Object.assign({ payDays: 10, closeDays: 14 }, opt || {});
  const out = [];
  const days = d => Math.round((D(today) - D(d)) / 86400000);
  // 1. Règlement du club en attente depuis trop longtemps
  ventes.forEach(v => {
    if (v.reglement === 'attente' && v.date && days(v.date) > opt.payDays)
      out.push({ pr: 3, t: `<b>Règlement du club</b> — en attente depuis ${days(v.date)} jours : ${v.label || 'vente'} (${eur(net(v))}). Vérifie « Mes reventes » sur la billetterie.` });
  });
  // 2. Match passé jamais clôturé
  matches.forEach(m => {
    if (!m.date || closed.indexOf(m.status) >= 0) return;
    const d = days(m.date);
    if (d > 0 && d <= opt.closeDays)
      out.push({ pr: 4, t: `<b>À clôturer</b> — ${m.opp} (il y a ${d} j) : indique s'il a été vendu, prêté, gardé ou non vendu.` });
  });
  // 3. Solde entre les deux personnes (chaque lundi seulement, pour ne pas répéter tous les jours)
  if (weekday === 1) {
    const names = {};
    ventes.forEach(v => { if (v.seller) names[v.seller] = 1; });
    transfers.forEach(t => { if (t.from) names[t.from] = 1; if (t.to) names[t.to] = 1; });
    const us = Object.keys(names);
    if (us.length === 2) {
      const enc = {}, tin = {}, tout = {};
      us.forEach(n => { enc[n] = 0; tin[n] = 0; tout[n] = 0; });
      ventes.forEach(v => { if (enc[v.seller] !== undefined) enc[v.seller] += net(v); });
      transfers.forEach(t => { if (tout[t.from] !== undefined) tout[t.from] += N(t.amount); if (tin[t.to] !== undefined) tin[t.to] += N(t.amount); });
      const fair = (enc[us[0]] + enc[us[1]]) / 2;
      const bal = us.map(n => ({ n, b: r2(enc[n] - tout[n] + tin[n] - fair) }));
      const debt = bal.find(x => x.b > 0.005), cred = bal.find(x => x.b < -0.005);
      if (debt && cred) out.push({ pr: 5, t: `<b>Virement entre vous</b> — ${debt.n} doit encore ${eur(debt.b)} à ${cred.n}.` });
    }
  }
  return out;
}
module.exports = { suivi };

// Rappels de suivi (fonction pure, testée dans tests/app.test.js).
// Un seul rappel : règlement du club en attente depuis trop longtemps.
// Volontairement PAS de rappel de dette entre personnes ni de clôture de match (décision de Rachid).
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
  return out;
}
module.exports = { suivi };

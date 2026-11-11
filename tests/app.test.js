// Tests de l'appli : node tests/app.test.js   (nécessite : npm i playwright && npx playwright install chromium)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), assert = require('assert');
const mock = require('./mock.js');
const root = path.resolve(__dirname, '..');
const results = [];
async function t(name, fn) { try { await fn(); results.push(['OK ', name]); } catch (e) { results.push(['KO ', name + ' : ' + e.message.split('\n')[0]]); process.exitCode = 1; } }

async function open(browser, failSnap) {
  const p = await browser.newPage({ viewport: { width: 400, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('file://')) return r.continue();
    if (u.includes('firebase-app-compat')) return r.fulfill({ body: mock + (failSnap ? '\nwindow.__failSnap=true;' : ''), contentType: 'application/javascript' });
    if (u.includes('gstatic.com/firebasejs') || u.includes('xlsx')) return r.fulfill({ body: '', contentType: 'application/javascript' });
    return r.fulfill({ body: '', contentType: 'text/css' });
  });
  await p.goto('file://' + path.join(root, 'index.html'));
  await p.selectOption('#usr', 'sylvain@parisfc-revente.fr');
  await p.fill('#pw', 'bon'); await p.click('#login-form button'); await p.waitForTimeout(500);
  p.errs = errs; return p;
}

(async () => {
  const browser = await chromium.launch();
  let p = await open(browser, false);

  await t('affiche les matchs à venir', async () => {
    assert.ok((await p.$$('details.fx')).length >= 10);
  });
  await t('bilan de saison : chiffres cohérents', async () => {
    await p.click('[data-act="tab"][data-v="fin"]'); await p.waitForTimeout(150);
    const txt = await p.$eval('#h-bil', e => e.parentElement.innerText);
    assert.ok(/295,44/.test(txt) && /147,72/.test(txt), txt);
  });
  await p.click('[data-act="view"]'); await p.waitForTimeout(150);
  await t('statistiques : base de prédiction affichée', async () => {
    const txt = await p.$eval('#h-stat', e => e.parentElement.innerText);
    assert.ok(/Ventes analysées\s*5/.test(txt) && /Estimation indicative/.test(txt) && /Peu de données/.test(txt), txt);
  });
  await t('totaux par saison', async () => {
    const txt = await p.$eval('section[aria-label="Par saison"]', e => e.innerText);
    assert.ok(/2026-27/.test(txt) && /295,44/.test(txt), txt);
  });
  await t('libellés : « (J9) » devient « (journée 9) »', async () => {
    const txt = await p.evaluate(() => { return document.body.textContent; });
    assert.ok(!/\(J\d+\)/.test(txt), 'reste un (Jn) : ' + (txt.match(/.{30}\(J\d+\).{10}/) || [''])[0]);
    assert.ok(/journée \d/.test(txt));
  });
  await t('une vente de juillet pour un match de novembre compte dans la saison du match', async () => {
    await p.click('details[data-key="addv"] summary').catch(() => {});
    const mid = await p.$eval('#v-match', e => [...e.options].filter(o => /Le Mans/.test(o.text)).map(o => o.value)[0]);
    await p.selectOption('#v-match', mid);
    await p.fill('#v-date', '2026-07-25'); await p.fill('#v-price', '100'); await p.fill('#v-fee', '10'); await p.selectOption('#v-seller', 'Rachid');
    await p.click('#vente-form button[type=submit]'); await p.waitForTimeout(400);
    const txt = await p.$eval('section[aria-label="Par saison"]', e => e.innerText);
    assert.ok(/2026-27\s+6/.test(txt) && !/2025-26/.test(txt), txt);
  });
  await p.click('[data-act="tab"][data-v="matchs"]'); await p.waitForTimeout(150);
  await t('bouton « Vendue » : validation puis vente enregistrée', async () => {
    await p.click('details.fx:not(.past) summary'); await p.waitForTimeout(100);
    await p.click('details.fx[open] [data-act="status"][data-v="enligne"]'); await p.waitForTimeout(250);
    await p.fill('details.fx[open] .qs input >> nth=0', '100');
    await p.fill('details.fx[open] .qs input >> nth=1', '120');
    await p.click('[data-act="qsold"]'); await p.waitForTimeout(150);
    assert.ok(/incohérente/.test(await p.$eval('#toast', e => e.textContent)));
    await p.fill('details.fx[open] .qs input >> nth=1', '10');
    await p.click('[data-act="qsold"]'); await p.waitForTimeout(300);
    assert.ok(/net 90/.test(await p.$eval('#toast', e => e.textContent)));
  });
  await t('restauration : fichier invalide refusé, valide prévisualisé puis écrit', async () => {
    await p.click('details[data-key="rst"] summary');
    fs.writeFileSync('/tmp/pfc-bad.json', '{"foo":1}');
    fs.writeFileSync('/tmp/pfc-good.json', JSON.stringify({ exportedAt: '2026-11-01T06:00:00Z', revente_matches: { m99: { opp: 'TestFC', date: '2027-01-01', order: 99, status: 'attente' } }, revente_config: { main: { basePrice: 40 } } }));
    await p.setInputFiles('#rst-file', '/tmp/pfc-bad.json'); await p.waitForTimeout(200);
    assert.ok(/pas une sauvegarde/.test(await p.$eval('details[data-key="rst"]', e => e.innerText)));
    await p.setInputFiles('#rst-file', '/tmp/pfc-good.json'); await p.waitForTimeout(200);
    assert.ok(/Aperçu/.test(await p.$eval('details[data-key="rst"]', e => e.innerText)));
    const before = await p.evaluate(() => window.__log.filter(x => x[0] === 'batch').length);
    await p.click('[data-act="rstgo"]'); await p.waitForTimeout(400);
    assert.strictEqual(await p.evaluate(() => window.__log.filter(x => x[0] === 'batch').length), before + 1);
  });
  await t('aucune erreur JavaScript', async () => { assert.deepStrictEqual(p.errs, []); });
  await p.close();

  p = await open(browser, true);
  await t('bandeau « synchronisation interrompue » si Firestore échoue', async () => {
    await p.waitForTimeout(500);
    assert.ok(/Synchronisation interrompue/.test(await p.$eval('[role=alert]', e => e.innerText)));
  });
  await p.close();

  await t('grille de prix identique dans l’appli et dans le script d’alerte', async () => {
    const re = /\{basePrice:null,markup:0,drop7:\d+,drop3:\d+,floorPct:\d+,watchFrom:\d+/;
    const a = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(re), b = fs.readFileSync(path.join(root, 'scripts/alerte.js'), 'utf8').match(re);
    assert.ok(a && b && a[0] === b[0], String(a && a[0]) + ' / ' + String(b && b[0]));
  });

  await browser.close();
  results.forEach(r => console.log(r.join('')));
  console.log(process.exitCode ? 'ÉCHEC' : 'TOUT PASSE');
})();

const test = require('node:test');
const assert = require('node:assert');
const { auditWebsite, calculateLeadScore } = require('../src/auditor/leadAuditor');

test('Lead Auditor Module', async (t) => {
  await t.test('debería diagnosticar correctamente un negocio sin sitio web', async () => {
    const res = await auditWebsite('');
    assert.strictEqual(res.hasWebsite, false);
    assert.strictEqual(res.status, 'NO_WEBSITE');
    assert.strictEqual(res.scoreBonus, 45);
  });

  await t.test('debería diagnosticar webs no seguras sin SSL (http)', async () => {
    const res = await auditWebsite('http://example.com');
    assert.strictEqual(res.hasWebsite, true);
    assert.strictEqual(res.status, 'NO_SSL');
    assert.strictEqual(res.scoreBonus, 25);
  });

  await t.test('debería calcular correctamente la puntuación de Lead Score ORO (>=75 pts)', () => {
    const business = {
      Nombre: 'Restaurante Can Joan',
      Telefono: '971123456',
      WhatsApp: 'https://wa.me/34971123456',
      Email: 'info@canjoan.es',
      Direccion: 'Calle Mayor 12'
    };
    const auditRes = { scoreBonus: 45, status: 'NO_WEBSITE' };
    const scoreData = calculateLeadScore(business, auditRes);
    
    // 10 base + 45 bonus + 20 WA + 5 email + 5 address + 5 asset = 90 pts (ORO ELITE)
    assert.strictEqual(scoreData.score >= 75, true);
    assert.strictEqual(scoreData.tier, 'oro');
  });

  await t.test('debería calcular correctamente la puntuación de Lead Score PLATA (55-74 pts)', () => {
    const business = {
      Nombre: 'Taller Paco',
      Telefono: '971000111',
      WhatsApp: '',
      Email: 'No disponible',
      Direccion: 'Dirección no detallada'
    };
    const auditRes = { scoreBonus: 35, status: 'PDF_MENU' };
    const scoreData = calculateLeadScore(business, auditRes);
    
    // 10 base + 35 bonus + 10 tel + 5 asset = 60 pts (PLATA)
    assert.strictEqual(scoreData.tier, 'plata');
  });
});

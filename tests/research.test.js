/**
 * Unit Tests for Lead Research Module
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { conductLeadResearch, getSectorKey, SECTOR_PHOTO_SETS, SECTOR_SERVICES } = require('../src/research/leadResearch');

describe('Lead Research Module', () => {

  it('debería clasificar correctamente los sectores temáticos', () => {
    assert.equal(getSectorKey('Servicio (restaurant)'), 'restaurantes');
    assert.equal(getSectorKey('Servicio (cafe)'), 'bares');
    assert.equal(getSectorKey('Taller (car_repair)'), 'talleres');
    assert.equal(getSectorKey('Tienda (hairdresser)'), 'peluquerias');
    assert.equal(getSectorKey('Tienda (bakery)'), 'panaderias');
    assert.equal(getSectorKey('Otro desconocido'), 'generica');
  });

  it('debería enriquecer un lead con fotos de alta resolución, servicios y testimonios', async () => {
    const dummyLead = {
      id: 'lead_taller_madrid',
      Nombre: 'Talleres Mecánicos García',
      Categoria: 'Taller (car_repair)',
      Municipio: 'Madrid',
      Telefono: '+34 912 000 111',
      score: 80,
      auditStatus: 'NO_WEBSITE'
    };

    const enriched = await conductLeadResearch(dummyLead);

    assert.ok(enriched.research);
    assert.equal(enriched.research.sectorKey, 'talleres');
    assert.ok(Array.isArray(enriched.research.curatedPhotos));
    assert.ok(enriched.research.curatedPhotos.length > 0);
    assert.ok(Array.isArray(enriched.research.services));
    assert.ok(enriched.research.services.length >= 3);
    assert.ok(Array.isArray(enriched.research.testimonials));
  });

});

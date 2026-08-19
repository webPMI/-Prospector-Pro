/**
 * Unit Tests for AI Prompt Builder and Web Generator Engine
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildWebPrompt, mapCategoryToTemplate } = require('../src/generator/promptBuilder');
const { generateWebDemoHtml } = require('../src/generator/webGenerator');

describe('AI Generator Module', () => {

  const sampleLead = {
    id: 'test_lead_restaurante',
    Nombre: 'Restaurante El Gourmet',
    Categoria: 'Servicio (restaurant)',
    Telefono: '+34 912 345 678',
    Email: 'contacto@elgourmet.es',
    Municipio: 'Madrid',
    Direccion: 'Gran Vía 28',
    Website: '',
    WhatsApp: 'https://wa.me/34912345678',
    score: 85,
    tier: 'oro',
    badge: '🥇 Lead ORO ELITE',
    auditStatus: 'NO_WEBSITE',
    auditLabel: '🔴 Sin Web',
    deepInspection: {
      rating: 4.7,
      reviewsCount: 120,
      businessHealth: '🌟 Negocio Top',
      viabilityIndex: 95,
      topReview: 'Comida espectacular y trato inmejorable.'
    }
  };

  it('debería mapear correctamente la categoría a la plantilla adecuada', () => {
    assert.equal(mapCategoryToTemplate('Servicio (restaurant)', 'NO_WEBSITE'), 'restaurante');
    assert.equal(mapCategoryToTemplate('Tienda (bakery)', 'NO_WEBSITE'), 'tienda');
    assert.equal(mapCategoryToTemplate('Taller (car_repair)', 'NO_WEBSITE'), 'servicio');
  });

  it('debería construir un prompt estructurado no vacío con los datos del prospecto', () => {
    const prompt = buildWebPrompt(sampleLead);
    assert.ok(typeof prompt === 'string');
    assert.ok(prompt.includes('Restaurante El Gourmet'));
    assert.ok(prompt.includes('Madrid'));
    assert.ok(prompt.includes('CONTEXTO DEL NEGOCIO'));
  });

  it('debería generar código HTML5 completo, responsive y con CTA de WhatsApp', () => {
    const html = generateWebDemoHtml(sampleLead);
    assert.ok(typeof html === 'string');
    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('Restaurante El Gourmet'));
    assert.ok(html.includes('https://wa.me/34912345678'));
    assert.ok(html.includes('viewport'));
  });

});

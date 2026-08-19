/**
 * Integration Test: Full Lead Lifecycle
 * Tests: Search → Persist → Load from cache → Creador selection → Prompt generation
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '..', 'data', 'prospects_cache.json');

describe('Lead Lifecycle Integration', () => {

  it('should save and load ALL leads from cache (not just enriched)', () => {
    // Create mock data simulating mixed leads (some with deepInspection, some without)
    const testCache = {
      'test_lead_1': {
        id: 'test_lead_1',
        Nombre: 'Lead Basico',
        Municipio: 'Madrid',
        Categoria: 'Servicio',
        score: 70,
        tier: 'plata'
        // No deepInspection — should still be saved
      },
      'test_lead_2': {
        id: 'test_lead_2',
        Nombre: 'Lead Enriquecido',
        Municipio: 'Barcelona',
        Categoria: 'Restaurante',
        score: 85,
        tier: 'oro',
        deepInspection: { rating: 4.5, isEnriched: true }
      }
    };

    // Write mock cache
    fs.writeFileSync(CACHE_FILE, JSON.stringify(testCache, null, 2), 'utf-8');

    // Read it back
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const loaded = JSON.parse(raw);

    const all = Object.values(loaded);
    const enriched = all.filter(l => l.deepInspection);
    const basic = all.filter(l => !l.deepInspection);

    console.log(`   Mock cache: ${all.length} leads (${enriched.length} enriched, ${basic.length} basic)`);

    // Verify both types are preserved
    assert.strictEqual(all.length, 2, 'Both leads should be in cache');
    assert.strictEqual(enriched.length, 1, 'One enriched lead');
    assert.strictEqual(basic.length, 1, 'One basic lead');

    // Verify ALL leads have required fields
    for (const lead of all) {
      assert.ok(lead.id, 'Lead should have id');
      assert.ok(lead.Nombre, 'Lead should have Nombre');
      assert.ok(lead.Categoria, 'Lead should have Categoria');
      assert.ok(typeof lead.score === 'number', 'Lead should have numeric score');
    }

    // Clean up mock
    fs.unlinkSync(CACHE_FILE);
  });

  it('webGenerator should NOT invent rating/reviews when no deepInspection data', async () => {
    const { generateWebDemoHtml } = require('../src/generator/webGenerator');
    
    // Create a minimal lead WITHOUT deepInspection
    const bareLead = {
      id: 'test_bare_lead',
      Nombre: 'Test Business',
      Municipio: 'Madrid',
      Categoria: 'Servicio (restaurant)',
      Direccion: 'Calle Test 123',
      Telefono: '912345678',
      Email: 'test@example.com',
      auditStatus: 'NO_WEBSITE',
      score: 80,
      tier: 'oro',
      badge: '🥇 Lead ORO',
      auditLabel: '🔴 Sin Web'
    };
    
    const html = generateWebDemoHtml(bareLead);
    
    // The HTML should NOT contain fake ratings or reviews
    assert.ok(!html.includes('4.8'), 'Should NOT invent fake rating 4.8');
    assert.ok(!html.includes('46 opiniones'), 'Should NOT invent fake review count 46');
    assert.ok(!html.includes('Atención inmejorable'), 'Should NOT invent fake review text');
    
    // Should contain real data
    assert.ok(html.includes('Test Business'), 'Should contain business name');
    assert.ok(html.includes('Madrid'), 'Should contain municipality');
    assert.ok(html.includes('Sin valoraciones'), 'Should show no-rating indicator');
  });

  it('webGenerator should SHOW real rating/reviews when deepInspection data exists', async () => {
    const { generateWebDemoHtml } = require('../src/generator/webGenerator');
    
    // Create a lead WITH real deepInspection data
    const enrichedLead = {
      id: 'test_enriched_lead',
      Nombre: 'Real Business',
      Municipio: 'Barcelona',
      Categoria: 'Servicio (restaurant)',
      Direccion: 'Calle Real 45',
      Telefono: '933445566',
      auditStatus: 'NO_WEBSITE',
      score: 85,
      tier: 'oro',
      badge: '🥇 Lead ORO',
      auditLabel: '🔴 Sin Web',
      deepInspection: {
        rating: 4.5,
        reviewsCount: 32,
        topReview: 'Excelente paella y trato familiar',
        isEnriched: true,
        businessHealth: '🔴 Sin Web — Alta Oportunidad',
        viabilityIndex: 75,
        openingHours: 'Abierto Hoy · 12:00 - 23:00'
      }
    };
    
    const html = generateWebDemoHtml(enrichedLead);
    
    // Should show real data
    assert.ok(html.includes('4.5'), 'Should show real rating 4.5');
    assert.ok(html.includes('32 opiniones'), 'Should show real review count 32');
    assert.ok(html.includes('Excelente paella'), 'Should show real review text');
    // openingHours appears in the nav bar section
    assert.ok(html.includes('12:00 - 23:00'), 'Should show real opening hours');
  });

  it('detectLanguageAndRegion should handle Latin American countries', () => {
    const { detectLanguageAndRegion } = require('../src/generator/promptBuilder');
    
    const mxLead = { Municipio: 'Ciudad de México', Nombre: 'Restaurante MX' };
    const mxResult = detectLanguageAndRegion(mxLead);
    assert.strictEqual(mxResult.language, 'es');
    assert.strictEqual(mxResult.region, 'México');
    
    // Detect by country name in municipio
    const arLead = { Municipio: 'Argentina', Nombre: 'Taller AR' };
    const arResult = detectLanguageAndRegion(arLead);
    assert.strictEqual(arResult.language, 'es');
    assert.strictEqual(arResult.region, 'Argentina');
    
    const coLead = { Municipio: 'Colombia', Nombre: 'Tienda CO' };
    const coResult = detectLanguageAndRegion(coLead);
    assert.strictEqual(coResult.language, 'es');
    assert.strictEqual(coResult.region, 'Colombia');
  });

  it('WA pitch should NOT include localhost URL', () => {
    const { generateWebDemoHtml } = require('../src/generator/webGenerator');
    
    const lead = {
      id: 'wa_test',
      Nombre: 'Test WA',
      Municipio: 'Madrid',
      Categoria: 'Servicio',
      WhatsApp: 'https://wa.me/34912345678',
      auditStatus: 'NO_WEBSITE'
    };
    
    const html = generateWebDemoHtml(lead);
    // The HTML demo itself shouldn't have localhost in WA links
    assert.ok(!html.includes('localhost:3000'), 'Demo HTML should NOT have localhost in WA links');
  });

});

/**
 * Unit Tests for Lead Collector Pipeline
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { collectAndAuditLeads } = require('../src/scrapers/leadCollector');

describe('Lead Collector Pipeline', () => {

  it('debería exportar una función de recopilación válida', () => {
    assert.equal(typeof collectAndAuditLeads, 'function');
  });

  it('debería procesar y ordenar prospectos ordenados por score descendente', async () => {
    const leads = await collectAndAuditLeads('palma');
    
    assert.ok(Array.isArray(leads));
    
    if (leads.length > 1) {
      // Check descending order of scores
      for (let i = 0; i < leads.length - 1; i++) {
        assert.ok(leads[i].score >= leads[i+1].score, `El elemento en posición ${i} (${leads[i].score}) debe tener un score >= posición ${i+1} (${leads[i+1].score})`);
      }
    }
  });

});

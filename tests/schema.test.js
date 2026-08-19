/**
 * Integration Test for Cloudflare D1 SQL Schema
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Database Schema Validation', () => {

  it('debería existir el archivo schema.sql con las sentencias necesarias', () => {
    const schemaPath = path.join(__dirname, '../schema.sql');
    assert.ok(fs.existsSync(schemaPath), 'El archivo schema.sql debe existir en la raíz');

    const content = fs.readFileSync(schemaPath, 'utf-8');
    assert.ok(content.includes('CREATE TABLE IF NOT EXISTS prospects'), 'Debe definir la tabla prospects');
    assert.ok(content.includes('score INTEGER'), 'Debe incluir la columna score');
    assert.ok(content.includes('tier TEXT'), 'Debe incluir la columna tier');
    assert.ok(content.includes('idx_prospects_score'), 'Debe incluir el índice por score');
  });

});

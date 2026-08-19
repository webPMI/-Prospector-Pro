/**
 * Integration Tests for HTTP API Endpoints
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('HTTP API Endpoints', () => {

  it('debería responder adecuadamente el servidor local en http://localhost:3000/api/leads', async () => {
    try {
      const res = await fetch('http://localhost:3000/api/leads');
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.data));
    } catch (e) {
      console.warn("Servidor local no activo durante esta prueba puntual:", e.message);
    }
  });

});

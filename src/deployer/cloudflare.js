/**
 * Cloudflare Pages & D1 Deployment Manager
 * ----------------------------------------
 * Manages static demo generation for Cloudflare Pages publishing and
 * SQL batch generator for Cloudflare D1 synchronization.
 */

const fs = require('fs');
const path = require('path');
const { generateWebDemoHtml } = require('../generator/webGenerator');

const DEMOS_OUTPUT_DIR = path.join(__dirname, '..', '..', 'public', 'demos');

/**
 * Ensures the demos directory exists for static export.
 */
function ensureDemosDir() {
  if (!fs.existsSync(DEMOS_OUTPUT_DIR)) {
    fs.mkdirSync(DEMOS_OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Exports a generated web demo to a static HTML file for direct serving
 * on Cloudflare Pages (e.g., /demos/:id.html).
 * @param {object} lead - Lead object
 * @returns {string} File path of the generated HTML
 */
function exportDemoToStaticFile(lead) {
  if (!lead || !lead.id) throw new Error("Lead inválido para exportación de demo.");
  ensureDemosDir();

  const html = generateWebDemoHtml(lead);
  const filePath = path.join(DEMOS_OUTPUT_DIR, `${lead.id}.html`);

  fs.writeFileSync(filePath, html, 'utf-8');
  return {
    filePath,
    publicUrl: `/demos/${lead.id}.html`
  };
}

/**
 * Generates SQL statements ready for Cloudflare D1 database insertion.
 * @param {Array<object>} leads - Array of lead objects
 * @returns {string} Formatted SQL statements
 */
function generateD1SyncSql(leads) {
  if (!Array.isArray(leads) || leads.length === 0) return '-- No leads to sync';

  const statements = leads.map(item => {
    const id = (item.id || `${item.Nombre}_${item.Municipio}`).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const name = (item.Nombre || '').replace(/'/g, "''");
    const category = (item.Categoria || '').replace(/'/g, "''");
    const phone = (item.Telefono || '').replace(/'/g, "''");
    const email = (item.Email || '').replace(/'/g, "''");
    const city = (item.Municipio || '').replace(/'/g, "''");
    const address = (item.Direccion || '').replace(/'/g, "''");
    const website = (item.Website || '').replace(/'/g, "''");
    const auditStatus = (item.auditStatus || '').replace(/'/g, "''");
    const auditLabel = (item.auditLabel || '').replace(/'/g, "''");
    const score = Number(item.score) || 0;
    const tier = (item.tier || 'bronce').replace(/'/g, "''");
    const whatsapp = (item.WhatsApp || '').replace(/'/g, "''");
    const googleMaps = (item.GoogleMaps || '').replace(/'/g, "''");
    const lat = parseFloat(item.Latitud) || 'NULL';
    const lon = parseFloat(item.Longitud) || 'NULL';

    return `INSERT INTO prospects (id, name, category, phone, email, city, address, website, status, audit_status, audit_label, score, tier, whatsapp, google_maps, lat, lon)
VALUES ('${id}', '${name}', '${category}', '${phone}', '${email}', '${city}', '${address}', '${website}', 'pendiente', '${auditStatus}', '${auditLabel}', ${score}, '${tier}', '${whatsapp}', '${googleMaps}', ${lat}, ${lon})
ON CONFLICT(id) DO UPDATE SET score = excluded.score, tier = excluded.tier;`;
  });

  return statements.join('\n');
}

module.exports = {
  exportDemoToStaticFile,
  generateD1SyncSql,
  DEMOS_OUTPUT_DIR
};

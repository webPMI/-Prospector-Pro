/**
 * Cloudflare D1 Client Adapter & Queries
 */

async function getAllProspectsD1(env, filters = {}) {
  // Check if D1 binding is present in Cloudflare Worker environment
  if (env && env.DB) {
    let sql = 'SELECT * FROM prospects WHERE 1=1';
    const params = [];

    if (filters.search) {
      sql += ' AND (name LIKE ? OR address LIKE ? OR phone LIKE ? OR city LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s, s);
    }

    if (filters.city) {
      sql += ' AND city = ?';
      params.push(filters.city);
    }

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY score DESC';

    const stmt = env.DB.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const { results } = await bound.all();
    return results;
  }
  return null;
}

async function upsertProspectsD1(env, prospectsList) {
  if (!env || !env.DB) return 0;

  const statements = prospectsList.map(item => {
    const id = `${item.Nombre}_${item.Municipio}`.toLowerCase().replace(/\s+/g, '_');
    return env.DB.prepare(`
      INSERT INTO prospects 
      (id, name, category, phone, email, city, address, website, status, audit_status, audit_label, score, tier, whatsapp, google_maps, lat, lon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        email = excluded.email,
        score = excluded.score,
        tier = excluded.tier
    `).bind(
      id,
      item.Nombre,
      item.Categoria,
      item.Telefono,
      item.Email,
      item.Municipio,
      item.Direccion,
      item.Website || '',
      item.auditStatus || '',
      item.auditLabel || '',
      item.score || 0,
      item.tier || 'bronce',
      item.WhatsApp || '',
      item.GoogleMaps || '',
      parseFloat(item.Latitud) || null,
      parseFloat(item.Longitud) || null
    );
  });

  // Execute batch in Cloudflare D1
  await env.DB.batch(statements);
  return prospectsList.length;
}

module.exports = {
  getAllProspectsD1,
  upsertProspectsD1
};

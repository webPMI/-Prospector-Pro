const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'negocios_mallorca_sin_web.json');
const raw = fs.readFileSync(jsonPath, 'utf-8');
const items = JSON.parse(raw);

let sqlContent = "";

for (const item of items) {
  const name = item.Nombre || item.name || 'Sin nombre';
  const city = item.Municipio || item.city || item.town || 'Mallorca';
  const id = `${name}_${city}`.toLowerCase().replace(/\s+/g, '_').replace(/['"]/g, '');

  const website = item.Website || item.website || '';
  const phone = item.Telefono || item.phone || 'No disponible';
  const email = item.Email || item.email || 'No disponible';
  const address = item.Direccion || item.address || '';
  const category = item.Categoria || item.category || 'General';

  let whatsappUrl = item.WhatsApp || '';
  if (!whatsappUrl && phone !== 'No disponible') {
    const digitos = phone.replace(/\D/g, '');
    if (digitos.length === 9) whatsappUrl = `https://wa.me/34${digitos}`;
  }

  // Calculate score fast
  let score = 85; // Default Oro for leads without web
  let tier = 'oro';
  let auditLabel = '🔴 Sin Web';
  let auditStatus = 'NO_WEBSITE';

  if (website) {
    score = 65;
    tier = 'plata';
    auditLabel = '🔒 No Segura';
    auditStatus = 'NO_SSL';
  }

  const escapeSQL = (str) => (str || '').replace(/'/g, "''");

  sqlContent += `INSERT OR REPLACE INTO prospects (id, name, category, phone, email, city, address, website, status, audit_status, audit_label, score, tier, whatsapp, google_maps, lat, lon) VALUES ('${escapeSQL(id)}', '${escapeSQL(name)}', '${escapeSQL(category)}', '${escapeSQL(phone)}', '${escapeSQL(email)}', '${escapeSQL(city)}', '${escapeSQL(address)}', '${escapeSQL(website)}', 'pendiente', '${auditStatus}', '${auditLabel}', ${score}, '${tier}', '${escapeSQL(whatsappUrl)}', '${escapeSQL(item.GoogleMaps || '')}', ${parseFloat(item.Latitud) || 'NULL'}, ${parseFloat(item.Longitud) || 'NULL'});\n`;
}

fs.writeFileSync(path.join(__dirname, 'seed.sql'), sqlContent, 'utf-8');
console.log(`✅ seed.sql generado con ${items.length} prospectos.`);

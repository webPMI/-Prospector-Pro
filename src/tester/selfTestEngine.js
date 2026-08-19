/**
 * Master Autonomous Self-Diagnostic & Performance Framework v5.4 (Golden Rule 8 Compliant)
 * 100% Real Live Google Maps & Places HTTP Requests. Includes Digital Menu Recognition Audit.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { auditWebsite, calculateLeadScore, isMenuOrPdfUrl } = require('../auditor/leadAuditor');
const { enrichProspectWithGoogleData, checkGoogleClosedStatus } = require('../auditor/placeDeepInspector');
const { collectAndAuditLeads, buildInternationalWhatsAppUrl } = require('../scrapers/leadCollector');
const { generateWebDemoHtml } = require('../generator/webGenerator');

async function runAutonomousSelfTest() {
  console.log('\n=============================================================');
  console.log('🚀 MASTER FRAMEWORK V5.4 (DIGITAL MENU ENGINE & LIVE MAPS)');
  console.log('=============================================================\n');

  const report = {
    timestamp: new Date().toISOString(),
    testsPassed: 0,
    testsFailed: 0,
    totalTests: 0,
    benchmarks: {},
    diagnostics: []
  };

  function assert(condition, description, category = 'General') {
    report.totalTests++;
    if (condition) {
      report.testsPassed++;
      report.diagnostics.push({ status: 'PASS', category, description });
      console.log(`  ✅ [PASS] ${category}: ${description}`);
    } else {
      report.testsFailed++;
      report.diagnostics.push({ status: 'FAIL', category, description });
      console.log(`  ❌ [FAIL] ${category}: ${description}`);
    }
  }

  // 1. PETICIÓN REAL AL SERVIDOR HTTP LOCAL (localhost:3000)
  console.log('🌐 1. Ejecutando Petición HTTP Real al Servidor Local (http://localhost:3000/api/leads)...');
  const t1Start = Date.now();
  await new Promise((resolve) => {
    http.get('http://localhost:3000/api/leads', (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          assert(res.statusCode === 200 && json.success === true, 'Petición HTTP a /api/leads responde con 200 OK y estructura JSON correcta', 'Servidor HTTP Real');
        } catch (e) {
          assert(false, `Respuesta JSON inválida: ${e.message}`, 'Servidor HTTP Real');
        }
        resolve();
      });
    }).on('error', (err) => {
      assert(false, `Servidor HTTP inalcanzable en puerto 3000: ${err.message}`, 'Servidor HTTP Real');
      resolve();
    });
  });
  report.benchmarks.httpServerLatencyMs = Date.now() - t1Start;

  // 2. PETICIÓN HTTP REAL A GOOGLE MAPS PLACE SEARCH ENGINE
  console.log('\nMAPS 2. Ejecutando Petición HTTP Real a Google Maps Place Engine...');
  const t2Start = Date.now();
  try {
    const realMapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Decathlon Palma");
    const res = await fetch(realMapsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });

    assert(res.ok && res.status === 200, 'Petición HTTP en vivo a la Ficha Oficial de Google Maps responde estado 200 OK', 'Google Maps Live HTTP');
  } catch (e) {
    assert(false, `Error en petición real a Google Maps: ${e.message}`, 'Google Maps Live HTTP');
  }
  report.benchmarks.googleMapsHttpLatencyMs = Date.now() - t2Start;

  // 3. RECONOCIMIENTO DE CARTAS DIGITALES / PLATAFORMAS QR / PDF
  console.log('\n📄 3. Evaluando Motor de Reconocimiento de Cartas Digitales y Menús QR...');
  assert(isMenuOrPdfUrl('https://restaurante.es/carta.pdf'), 'Detección de extensión de archivo PDF (.pdf)', 'Motor de Menús Digitales');
  assert(isMenuOrPdfUrl('https://qr.menu/restaurante-faro'), 'Detección de plataforma de menú QR (qr.menu)', 'Motor de Menús Digitales');
  assert(isMenuOrPdfUrl('https://drive.google.com/file/d/xyz'), 'Detección de menú alojado en Google Drive', 'Motor de Menús Digitales');
  assert(isMenuOrPdfUrl('https://restaurante.es/lacarta'), 'Detección de palabra clave /lacarta en la ruta URL', 'Motor de Menús Digitales');

  // 4. COMPROBACIÓN REAL EN VIVO DE NEGOCIOS CERRADOS EN GOOGLE MAPS
  console.log('\n⛔ 4. Ejecutando Petición Real de Comprobación de Estado Cerrado en Google Maps...');
  const t3Start = Date.now();
  try {
    const closedRes = await checkGoogleClosedStatus({ Nombre: "Hatsukokoro", Municipio: "Palma de Mallorca" });
    assert(typeof closedRes === 'object', 'Comprobación real contra Google Maps devuelve un objeto estructurado de estado de cierre', 'Google Maps Closed Check');
  } catch (e) {
    assert(false, `Error en comprobación real de estado cerrado: ${e.message}`, 'Google Maps Closed Check');
  }
  report.benchmarks.closedCheckLatencyMs = Date.now() - t3Start;

  // 5. GENERADOR DE DEMOS WEB IA Y ENDPOINT /demo/:id
  console.log('\n✨ 5. Evaluando Motor Generador de Demos Web IA (HTML5 / Mobile-First)...');
  const t6Start = Date.now();
  try {
    const sampleLead = { id: 'lead_test', Nombre: 'Taller Balear', Municipio: 'Palma', Categoria: 'Taller' };
    const htmlDemo = generateWebDemoHtml(sampleLead);
    assert(typeof htmlDemo === 'string' && htmlDemo.includes('<!DOCTYPE html>'), 'Generación válida de plantilla HTML5 responsive', 'AI Web Generator');
    assert(htmlDemo.includes(sampleLead.Nombre), 'Inyección correcta del Nombre Real del negocio en la plantilla', 'AI Web Generator');
  } catch (e) {
    assert(false, `Error en generador de demos web: ${e.message}`, 'AI Web Generator');
  }
  report.benchmarks.webGeneratorLatencyMs = Date.now() - t6Start;

  // SUMMARY & REPORT GENERATION
  const precision = Math.round((report.testsPassed / report.totalTests) * 100);
  report.accuracyPercentage = `${precision}%`;

  console.log('\n=============================================================');
  console.log(`📊 DIAGNÓSTICO INTEGRAL V5.4 COMPLETADO: ${report.testsPassed}/${report.totalTests} PASADOS (${report.accuracyPercentage})`);
  console.log('=============================================================\n');

  const reportDir = path.join(__dirname, '../../tests/reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, 'self_test_report.json'), JSON.stringify(report, null, 2));

  return report;
}

if (require.main === module) {
  runAutonomousSelfTest();
}

module.exports = {
  runAutonomousSelfTest
};

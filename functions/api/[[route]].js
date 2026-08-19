/**
 * Cloudflare Pages Functions Serverless API Handler
 * Connects to Cloudflare D1 Database (env.DB)
 */

import { collectAndAuditLeads } from '../../src/scrapers/leadCollector';
import { enrichProspectWithGoogleData } from '../../src/auditor/placeDeepInspector';
import { buildWebPrompt } from '../../src/generator/promptBuilder';
import { generateWebDemoHtml } from '../../src/generator/webGenerator';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=UTF-8'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // GET /api/leads - Fetch leads from Cloudflare D1
  if (request.method === 'GET' && url.pathname === '/api/leads') {
    try {
      if (env && env.DB) {
        const { results } = await env.DB.prepare('SELECT * FROM prospects ORDER BY score DESC').all();
        return new Response(JSON.stringify({ success: true, count: results.length, data: results }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify({ success: true, count: 0, data: [] }), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
  }

  // POST /api/search - Run Audit and store in Cloudflare D1
  if (request.method === 'POST' && url.pathname === '/api/search') {
    try {
      const body = await request.json().catch(() => ({}));
      const region = body.region || body.city || 'Madrid, España';
      const category = body.category || '';

      const leads = await collectAndAuditLeads(region, category, body);

      if (env && env.DB && leads.length > 0) {
        const statements = leads.map(item => {
          const id = (item.id || `${item.Nombre}_${item.Municipio}`).toLowerCase().replace(/[^a-z0-9_]/g, '_');
          return env.DB.prepare(`
            INSERT INTO prospects 
            (id, name, category, phone, email, city, address, website, status, audit_status, audit_label, score, tier, whatsapp, google_maps, lat, lon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              score = excluded.score,
              tier = excluded.tier
          `).bind(
            id, item.Nombre, item.Categoria, item.Telefono, item.Email, item.Municipio, item.Direccion,
            item.Website || '', item.auditStatus || '', item.auditLabel || '', item.score || 0, item.tier || 'bronce',
            item.WhatsApp || '', item.GoogleMaps || '', parseFloat(item.Latitud) || null, parseFloat(item.Longitud) || null
          );
        });

        await env.DB.batch(statements);
      }

      return new Response(JSON.stringify({ success: true, count: leads.length, data: leads }), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
  }

  // POST /api/prospect/enrich - Deep inspection
  if (request.method === 'POST' && url.pathname === '/api/prospect/enrich') {
    try {
      const body = await request.json().catch(() => ({}));
      let prospect = body.prospect || { id: body.id, Nombre: body.name || 'Negocio Local', Municipio: body.city || 'Madrid' };
      const enriched = await enrichProspectWithGoogleData(prospect);
      return new Response(JSON.stringify({ success: true, data: enriched }), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
  }

  // POST /api/generate-prompt - AI prompt generation
  if (request.method === 'POST' && url.pathname === '/api/generate-prompt') {
    try {
      const body = await request.json().catch(() => ({}));
      let prospect = body.prospect || { id: body.id, Nombre: body.name || 'Negocio Local' };
      if (!prospect.deepInspection) {
        prospect = await enrichProspectWithGoogleData(prospect);
      }
      const prompt = buildWebPrompt(prospect);
      return new Response(JSON.stringify({ success: true, prompt, prospectId: prospect.id, nombre: prospect.Nombre }), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
  }

  // POST /api/generate-demo - Web demo HTML generation
  if (request.method === 'POST' && url.pathname === '/api/generate-demo') {
    try {
      const body = await request.json().catch(() => ({}));
      let prospect = body.prospect || { id: body.id, Nombre: body.name || 'Negocio Local' };
      if (!prospect.deepInspection) {
        prospect = await enrichProspectWithGoogleData(prospect);
      }
      const prompt = buildWebPrompt(prospect);
      const html = generateWebDemoHtml(prospect);
      return new Response(JSON.stringify({ success: true, prompt, demoUrl: `/demo/${prospect.id}`, html, prospectId: prospect.id, nombre: prospect.Nombre }), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ error: 'Endpoint no encontrado' }), { status: 404, headers: corsHeaders });
}

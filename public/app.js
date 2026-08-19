/**
 * Frontend Controller for Lead Auditor & Scoring Dashboard
 * Includes Real-Time Terminal Progress Bar (0%-100%), Latency Timer Counter & Cancel Scan.
 */

let allLeads = [];
let filteredLeads = [];
let currentLeadIdInModal = null;
let currentSearchAbortController = null;
let scanTimerInterval = null;
let scanStartTime = 0;

const RECENT_SEARCHES_KEY = 'prospector_recent_searches_v2';

document.addEventListener('DOMContentLoaded', () => {
  fetchLeads();
  renderRecentSearches();

  // Verification Modal Elements
  const verifyModal = document.getElementById('verifyModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      verifyModal.style.display = 'none';
    });
  }

  // Demo Modal Elements
  const demoModal = document.getElementById('demoModal');
  const btnCloseDemoModal = document.getElementById('btnCloseDemoModal');

  if (btnCloseDemoModal) {
    btnCloseDemoModal.addEventListener('click', () => {
      demoModal.style.display = 'none';
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === verifyModal) verifyModal.style.display = 'none';
    if (e.target === demoModal) demoModal.style.display = 'none';
  });

  // Deep Inspection Trigger
  const btnTriggerDeepInspect = document.getElementById('btnTriggerDeepInspect');
  if (btnTriggerDeepInspect) {
    btnTriggerDeepInspect.addEventListener('click', () => {
      if (currentLeadIdInModal) performDeepInspection(currentLeadIdInModal);
    });
  }

  // Toggle Advanced Search Filters Panel
  const btnToggleSearchFilters = document.getElementById('btnToggleSearchFilters');
  const liveSearchFiltersPanel = document.getElementById('liveSearchFiltersPanel');
  if (btnToggleSearchFilters && liveSearchFiltersPanel) {
    btnToggleSearchFilters.addEventListener('click', () => {
      const isVisible = liveSearchFiltersPanel.style.display !== 'none';
      liveSearchFiltersPanel.style.display = isVisible ? 'none' : 'block';
    });
  }

  // Copy Terminal Logs Handler
  const btnCopyTerminalLogs = document.getElementById('btnCopyTerminalLogs');
  if (btnCopyTerminalLogs) {
    btnCopyTerminalLogs.addEventListener('click', () => {
      const liveTerminalLogs = document.getElementById('liveTerminalLogs');
      if (!liveTerminalLogs) return;

      const logsText = liveTerminalLogs.innerText || liveTerminalLogs.textContent;
      navigator.clipboard.writeText(logsText).then(() => {
        btnCopyTerminalLogs.innerHTML = '<i class="fa-solid fa-check" style="color: #4ade80;"></i> ¡Copiado!';
        setTimeout(() => {
          btnCopyTerminalLogs.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar Logs';
        }, 2000);
      }).catch(err => {
        console.error('Error al copiar logs:', err);
      });
    });
  }

  // CANCEL SCAN BUTTON HANDLERS (Top Form & Terminal Bar)
  const btnCancelLiveSearch = document.getElementById('btnCancelLiveSearch');
  const btnTerminalCancelScan = document.getElementById('btnTerminalCancelScan');
  const btnExecuteLiveSearch = document.getElementById('btnExecuteLiveSearch');
  const terminalStatusBadge = document.getElementById('terminalStatusBadge');

  function cancelScanProcess() {
    if (currentSearchAbortController) {
      currentSearchAbortController.abort();
      currentSearchAbortController = null;
    }
    stopScanTimer();
    updateProgressBar(100);
    appendLog(`⚠️ [${getTimestamp()}] Escaneo cancelado inmediatamente por el usuario.`);
    terminalStatusBadge.innerHTML = '🛑 Escaneo Cancelado';
    terminalStatusBadge.style.color = '#f87171';
    btnExecuteLiveSearch.disabled = false;
    if (btnCancelLiveSearch) btnCancelLiveSearch.style.display = 'none';
  }

  if (btnCancelLiveSearch) btnCancelLiveSearch.addEventListener('click', cancelScanProcess);
  if (btnTerminalCancelScan) btnTerminalCancelScan.addEventListener('click', cancelScanProcess);

  // Search Elements
  const liveQueryInput = document.getElementById('liveQueryInput');
  const liveCountrySelect = document.getElementById('liveCountrySelect');
  const liveCityInput = document.getElementById('liveCityInput');
  const liveLanguageSelect = document.getElementById('liveLanguageSelect');
  const liveCategorySelect = document.getElementById('liveCategorySelect');
  const liveTerminalCard = document.getElementById('liveTerminalCard');
  const liveTerminalLogs = document.getElementById('liveTerminalLogs');

  btnExecuteLiveSearch.addEventListener('click', async () => {
    const freeText = liveQueryInput.value.trim();
    const country = liveCountrySelect.value || '';
    const city = liveCityInput.value.trim();
    const language = liveLanguageSelect.value || 'es';
    const category = liveCategorySelect.value || '';

    const targetWeb = document.getElementById('searchTargetWebSelect').value;
    const targetContact = document.getElementById('searchTargetContactSelect').value;
    const targetTier = document.getElementById('searchTargetTierSelect').value;

    const searchTerms = [freeText, city, country, category ? `Sector ${category}` : ''].filter(Boolean);

    if (searchTerms.length === 0) {
      alert("⚠️ Por favor, introduce al menos una Ciudad, País, Palabra Clave o selecciona un Sector para escanear.");
      liveQueryInput.focus();
      return;
    }

    const displayQuery = [freeText, city, country].filter(Boolean).join(', ') || (category ? `Sector: ${category}` : 'Búsqueda Global');

    saveRecentSearch({ freeText, country, city, category, language, label: displayQuery });

    currentSearchAbortController = new AbortController();

    liveTerminalCard.style.display = 'block';
    liveTerminalLogs.innerHTML = '';
    terminalStatusBadge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Escaneando...';
    terminalStatusBadge.style.color = '#fde047';
    btnExecuteLiveSearch.disabled = true;
    if (btnCancelLiveSearch) btnCancelLiveSearch.style.display = 'inline-flex';

    startScanTimer();
    updateProgressBar(10);

    appendLog(`📡 [${getTimestamp()}] Iniciando petición HTTP POST /api/search`);
    appendLog(`🔎 [${getTimestamp()}] Parámetros enviadas: TextoLibre="${freeText || 'N/A'}" | Ciudad="${city || 'N/A'}" | País="${country || 'N/A'}" | Sector="${category || 'Todos'}" | Idioma="${language}"`);
    appendLog(`🌍 [${getTimestamp()}] Conectando con los servidores de Google Maps & OpenStreetMap para '${displayQuery.toUpperCase()}'...`);

    if (targetWeb !== 'all' || targetContact !== 'all' || targetTier !== 'all') {
      appendLog(`⚙️ [${getTimestamp()}] Filtros Activos: Web[${targetWeb}] Contacto[${targetContact}] Tier[${targetTier}]`);
    }

    updateProgressBar(35);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: displayQuery,
          freeText: freeText,
          city: city,
          country: country,
          language: language,
          category: category,
          targetWeb: targetWeb,
          targetContact: targetContact,
          targetTier: targetTier
        }),
        signal: currentSearchAbortController.signal
      });

      updateProgressBar(70);

      const json = await response.json();
      if (json.success) {
        allLeads = json.data || [];
        
        appendLog(`📥 [${getTimestamp()}] ¡Recibidos ${json.count} negocios comerciales auditados en vivo!`);
        
        updateProgressBar(88);

        const sampleItems = allLeads.slice(0, 8);
        if (sampleItems.length > 0) {
          sampleItems.forEach((lead, idx) => {
            setTimeout(() => {
              appendLog(`🔍 [${getTimestamp()}] Auditando "${lead.Nombre}" (${lead.Municipio}) -> ${lead.auditLabel} [Score: ${lead.score} pts]`);
            }, (idx + 1) * 150);
          });
        }

        setTimeout(() => {
          updateProgressBar(100);
          stopScanTimer();
          appendLog(`✅ [${getTimestamp()}] Escaneo finalizado en ${((Date.now() - scanStartTime)/1000).toFixed(1)}s. Mostrando prospectos en la tabla.`);
          terminalStatusBadge.innerHTML = '✔ Escaneo Completado';
          terminalStatusBadge.style.color = '#4ade80';
          btnExecuteLiveSearch.disabled = false;
          if (btnCancelLiveSearch) btnCancelLiveSearch.style.display = 'none';

          populateCityFilter();
          filterLeads();
        }, 1200);

      } else {
        stopScanTimer();
        updateProgressBar(100);
        appendLog(`❌ [${getTimestamp()}] Error: ${json.error || "Ocurrió un error inesperado"}`);
        terminalStatusBadge.innerHTML = '❌ Error de Escaneo';
        terminalStatusBadge.style.color = '#f87171';
        btnExecuteLiveSearch.disabled = false;
        if (btnCancelLiveSearch) btnCancelLiveSearch.style.display = 'none';
      }
    } catch (err) {
      stopScanTimer();
      updateProgressBar(100);
      if (err.name === 'AbortError') {
        return;
      }
      appendLog(`❌ [${getTimestamp()}] Error de conexión al servidor: ${err.message}`);
      terminalStatusBadge.innerHTML = '❌ Error de Conexión';
      terminalStatusBadge.style.color = '#f87171';
      btnExecuteLiveSearch.disabled = false;
      if (btnCancelLiveSearch) btnCancelLiveSearch.style.display = 'none';
    }
  });

  liveQueryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnExecuteLiveSearch.click();
  });
  liveCityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnExecuteLiveSearch.click();
  });

  document.getElementById('searchInput').addEventListener('input', filterLeads);
  document.getElementById('scoreFilter').addEventListener('change', filterLeads);
  document.getElementById('auditFilter').addEventListener('change', filterLeads);
  document.getElementById('cityFilter').addEventListener('change', filterLeads);
  document.getElementById('btnExportCSV').addEventListener('click', exportCSV);
});

function startScanTimer() {
  scanStartTime = Date.now();
  const timerChip = document.getElementById('terminalTimerCounter');
  
  if (scanTimerInterval) clearInterval(scanTimerInterval);
  
  scanTimerInterval = setInterval(() => {
    const elapsedSec = ((Date.now() - scanStartTime) / 1000).toFixed(1);
    if (timerChip) timerChip.textContent = `⏱️ ${elapsedSec}s`;
  }, 100);
}

function stopScanTimer() {
  if (scanTimerInterval) {
    clearInterval(scanTimerInterval);
    scanTimerInterval = null;
  }
}

function updateProgressBar(percentage) {
  const bar = document.getElementById('terminalProgressBar');
  const percentChip = document.getElementById('terminalProgressPercent');
  const clamped = Math.min(100, Math.max(0, percentage));

  if (bar) bar.style.width = `${clamped}%`;
  if (percentChip) percentChip.textContent = `📊 ${clamped}%`;
}

function getRecentSearches() {
  try {
    const data = localStorage.getItem(RECENT_SEARCHES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveRecentSearch(item) {
  let list = getRecentSearches();
  const itemLabel = item.label || 'Búsqueda';
  list = list.filter(s => (s.label || '').toLowerCase() !== itemLabel.toLowerCase());
  list.unshift(item);
  list = list.slice(0, 5);
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
  } catch (e) {}
  renderRecentSearches();
}

function renderRecentSearches() {
  const listContainer = document.getElementById('recentChipsList');
  if (!listContainer) return;

  const searches = getRecentSearches();
  if (searches.length === 0) {
    listContainer.innerHTML = `<span style="font-size: 0.78rem; color: var(--text-muted);">Realiza tu primera búsqueda para guardar tu historial.</span>`;
    return;
  }

  listContainer.innerHTML = '';
  searches.forEach(s => {
    const chip = document.createElement('button');
    chip.className = 'sector-chip';
    chip.innerHTML = `<i class="fa-solid fa-clock-rotate-left" style="color: #67e8f9;"></i> ${escapeHtml(s.label || 'Búsqueda')}`;
    
    chip.addEventListener('click', () => {
      document.getElementById('liveQueryInput').value = s.freeText || '';
      document.getElementById('liveCountrySelect').value = s.country || '';
      document.getElementById('liveCityInput').value = s.city || '';
      if (s.language) document.getElementById('liveLanguageSelect').value = s.language;
      document.getElementById('liveCategorySelect').value = s.category || '';
      document.getElementById('btnExecuteLiveSearch').click();
    });

    listContainer.appendChild(chip);
  });
}

function openVerificationModal(id) {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;

  currentLeadIdInModal = id;

  document.getElementById('modalBizName').textContent = lead.Nombre;
  document.getElementById('modalBizMeta').textContent = `${lead.Categoria} • ${lead.Municipio}`;

  const scoreBadge = document.getElementById('modalScoreBadge');
  scoreBadge.className = `lead-badge ${lead.tier === 'oro' ? 'badge-oro' : (lead.tier === 'plata' ? 'badge-plata' : 'badge-bronce')}`;
  scoreBadge.textContent = `${lead.badge} (${lead.score} pts)`;

  const auditBadge = document.getElementById('modalAuditBadge');
  const auditClass = lead.auditStatus === 'NO_WEBSITE' ? 'audit-noweb' : (lead.auditStatus === 'PDF_MENU' ? 'audit-pdf' : (lead.auditStatus === 'WEBSITE_DOWN' ? 'audit-down' : (lead.auditStatus === 'SOCIAL_ONLY' ? 'audit-noweb' : 'audit-nossl')));
  auditBadge.className = `audit-badge ${auditClass}`;
  auditBadge.textContent = lead.auditLabel;

  const btnGoogleMaps = document.getElementById('btnLinkGoogleMaps');
  const addressText = document.getElementById('modalAddressText');
  
  const officialMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.Nombre + ' ' + lead.Municipio + ' ' + (lead.Direccion !== 'Dirección no detallada' ? lead.Direccion : ''))}`;
  btnGoogleMaps.href = lead.GoogleMaps || officialMapsUrl;
  addressText.textContent = `📍 ${lead.Direccion || lead.Municipio}`;

  const btnWebsite = document.getElementById('btnLinkWebsite');
  const webUrlText = document.getElementById('modalWebUrlText');

  if (lead.Website && lead.Website !== 'No disponible') {
    let formattedWeb = lead.Website;
    if (!formattedWeb.startsWith('http')) formattedWeb = 'http://' + formattedWeb;
    btnWebsite.href = formattedWeb;
    btnWebsite.style.display = 'inline-flex';
    webUrlText.textContent = lead.auditStatus === 'PDF_MENU' ? `📄 Enlace a Carta PDF: ${lead.Website}` : (lead.auditStatus === 'SOCIAL_ONLY' ? `📲 Enlace a Perfil Social: ${lead.Website}` : `🌐 ${lead.Website}`);
  } else {
    btnWebsite.style.display = 'none';
    webUrlText.textContent = `🔴 Sin sitio web oficial registrado`;
  }

  const deepContent = document.getElementById('deepInspectionContent');
  if (lead.deepInspection) {
    renderDeepInspectionData(lead.deepInspection);
  } else {
    deepContent.innerHTML = `
      <button id="btnTriggerDeepInspect" class="btn btn-primary" onclick="performDeepInspection('${lead.id}')" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border: none; font-size: 0.85rem; width: 100%;">
        <i class="fa-solid fa-layer-group"></i> Cargar Análisis Profundo & Evaluación de Salud
      </button>
    `;
  }

  document.getElementById('verifyModal').style.display = 'flex';
}

async function performDeepInspection(id) {
  const deepContent = document.getElementById('deepInspectionContent');
  deepContent.innerHTML = `<div style="color: #fde047; font-weight: 600; font-size: 0.88rem;"><i class="fa-solid fa-spinner fa-spin"></i> Evaluando salud del negocio y viabilidad pre-contacto...</div>`;

  try {
    const res = await fetch('/api/prospect/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id })
    });

    const json = await res.json();
    if (json.success && json.data && json.data.deepInspection) {
      const lead = allLeads.find(l => l.id === id);
      if (lead) lead.deepInspection = json.data.deepInspection;

      renderDeepInspectionData(json.data.deepInspection);
    } else {
      deepContent.innerHTML = `<div style="color: #f87171;">No se pudieron extraer datos adicionales de Google Maps.</div>`;
    }
  } catch (err) {
    deepContent.innerHTML = `<div style="color: #f87171;">Error al conectar con la API: ${err.message}</div>`;
  }
}

function renderDeepInspectionData(data) {
  const deepContent = document.getElementById('deepInspectionContent');
  if (!deepContent) return;

  // Guard against missing data
  if (!data) {
    deepContent.innerHTML = '<div style="color: #f87171;">Error: no hay datos de análisis profundo.</div>';
    return;
  }

  const rating = data.rating;
  const reviewsCount = data.reviewsCount;
  const topReview = data.topReview;
  const photos = data.photos;
  const socialPresence = data.socialPresence || {};
  const instagram = socialPresence.instagram;
  const facebook = socialPresence.facebook;
  const competitors = data.competitorsNearbyWithWeb;
  const multiSiteGroup = data.isMultiSiteGroup;
  const multiSiteCount = data.multiSiteCount;

  // Build stars HTML only when rating is available
  const starsHtml = (rating !== null && rating !== undefined && !isNaN(rating))
    ? '⭐'.repeat(Math.round(rating))
    : '';

  // Show multi-site badge only when data is available
  const multiSiteBadge = (multiSiteGroup && multiSiteCount !== null)
    ? `<span style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); padding: 0.25rem 0.6rem; border-radius: 6px; font-weight: 700; font-size: 0.78rem;">🏬 Grupo Multi-Sede (${multiSiteCount} locales)</span>`
    : `<span style="background: rgba(59, 130, 246, 0.15); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.3); padding: 0.25rem 0.6rem; border-radius: 6px; font-weight: 600; font-size: 0.78rem;">🏪 Local Único Independiente</span>`;

  // Determine if real Google Places data is still pending
  const hasRealRating = rating !== null && rating !== undefined && !isNaN(rating);
  const hasRealReviews = reviewsCount !== null && reviewsCount !== undefined;
  const hasRealPhotos = photos !== null && Array.isArray(photos) && photos.length > 0;
  const hasRealSocial = instagram !== null || facebook !== null;
  const hasRealCompetitors = competitors !== null && competitors !== undefined;
  const hasRealReviewsText = topReview !== null && topReview !== undefined;

  const needsGooglePlaces = !hasRealRating || !hasRealReviews || !hasRealPhotos || !hasRealSocial || !hasRealCompetitors;

  // Photos gallery — only if we have real photos
  let photosGalleryHtml = '';
  if (hasRealPhotos) {
    photosGalleryHtml = `<div style="font-size: 0.8rem; font-weight: 700; color: #ffffff; margin-top: 0.25rem;">📷 Fotos Destacadas del Local:</div>
      <div style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.3rem;">
        ${photos.map(url => `<img src="${url}" style="width: 100px; height: 70px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15);" />`).join('')}
      </div>`;
  }

  // Social links — only if we have URLs
  let socialLinksHtml = '';
  if (hasRealSocial) {
    const instaBtn = instagram
      ? `<a href="${instagram}" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.75rem;"><i class="fa-brands fa-instagram" style="color: #e1306c;"></i> Instagram</a>`
      : '';
    const fbBtn = facebook
      ? `<a href="${facebook}" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.75rem;"><i class="fa-brands fa-facebook" style="color: #1877f2;"></i> Facebook</a>`
      : '';
    if (instaBtn || fbBtn) {
      socialLinksHtml = `<div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.2rem;">${instaBtn}${fbBtn}</div>`;
    }
  }

  // Pending data warning
  let pendingWarningHtml = '';
  if (needsGooglePlaces) {
    pendingWarningHtml = `
      <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.65rem 0.85rem; border-radius: 8px; font-size: 0.82rem; color: #fde047; margin-top: 0.5rem;">
        ⚠️ <b>Datos de Google Places pendientes:</b> Rating, reseñas, fotos y redes sociales requieren Google Places API configurada. Estos datos aparecerán aquí una vez configurada la API.
      </div>`;
  }

  // Competitors info — only if data available
  let competitorsHtml = '';
  if (hasRealCompetitors) {
    competitorsHtml = `
      <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.65rem 0.85rem; border-radius: 8px; font-size: 0.82rem; color: #fca5a5;">
        ⚔️ <b>Análisis Competitivo</b>: Hay <b>${competitors} competidores directos</b> a menos de 500m con web propia posicionada en Google.
      </div>`;
  }

  // Top review — only if available
  let topReviewHtml = '';
  if (hasRealReviewsText) {
    topReviewHtml = `
      <div style="font-size: 0.82rem; color: #cbd5e1; background: rgba(15, 23, 42, 0.5); padding: 0.65rem 0.85rem; border-radius: 8px; font-style: italic; border-left: 3px solid #f59e0b;">
        💬 "${escapeHtml(topReview)}"
      </div>`;
  }

  deepContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.5rem;">
      <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.75rem 0.9rem; border-radius: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="font-size: 0.85rem; font-weight: 800; color: #4ade80;"><i class="fa-solid fa-shield-halved"></i> Evaluación Pre-Contacto: ${data.businessHealth || 'No evaluado'}</span>
          <span style="font-size: 0.85rem; font-weight: 800; color: #fde047;">Viabilidad: ${data.viabilityIndex !== null && data.viabilityIndex !== undefined ? data.viabilityIndex + '%' : 'N/A'}</span>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          ${multiSiteBadge}
          <span style="background: rgba(16, 185, 129, 0.15); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.25rem 0.6rem; border-radius: 6px; font-weight: 600; font-size: 0.78rem;">🛡️ Marca Protegida</span>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.8); padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
        <div>
          <span style="font-size: 1.1rem; font-weight: 800; color: #fde047;">${starsHtml} ${hasRealRating ? rating : '—'}</span>
          <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.4rem;">(${hasRealReviews ? reviewsCount + ' opiniones en Google' : 'Opiniones no disponibles'})</span>
        </div>
        <span style="font-size: 0.78rem; font-weight: 600; color: #4ade80;">${data.openingHours || 'Horario no disponible'}</span>
      </div>

      ${competitorsHtml}
      ${topReviewHtml}
      ${socialLinksHtml}
      ${photosGalleryHtml}
      ${pendingWarningHtml}
    </div>
  `;
}

function appendLog(msg) {
  const liveTerminalLogs = document.getElementById('liveTerminalLogs');
  if (!liveTerminalLogs) return;

  const line = document.createElement('div');
  line.textContent = msg;
  liveTerminalLogs.appendChild(line);
  liveTerminalLogs.scrollTop = liveTerminalLogs.scrollHeight;
}

function getTimestamp() {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

async function fetchLeads() {
  try {
    const res = await fetch('/api/leads');
    const json = await res.json();
    allLeads = json.data || [];
    populateCityFilter();
    filterLeads();
  } catch (err) {
    console.error("Error al cargar leads desde API:", err);
  }
}

function populateCityFilter() {
  const cities = new Set();
  allLeads.forEach(l => {
    if (l.Municipio) cities.add(l.Municipio);
  });

  const citySel = document.getElementById('cityFilter');
  citySel.innerHTML = '<option value="">🏙️ Todos los Municipios / Ciudades</option>';
  [...cities].sort().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    citySel.appendChild(opt);
  });
}

function filterLeads() {
  const search = document.getElementById('searchInput').value.toLowerCase().trim();
  const scoreVal = document.getElementById('scoreFilter').value;
  const auditVal = document.getElementById('auditFilter').value;
  const cityVal = document.getElementById('cityFilter').value;

  filteredLeads = allLeads.filter(l => {
    const matchSearch = !search ||
      l.Nombre.toLowerCase().includes(search) ||
      l.Municipio.toLowerCase().includes(search) ||
      l.Telefono.includes(search);

    const matchScore = !scoreVal || l.tier === scoreVal;
    const matchAudit = !auditVal || l.auditStatus === auditVal;
    const matchCity = !cityVal || l.Municipio === cityVal;

    return matchSearch && matchScore && matchAudit && matchCity;
  });

  updateStats();
  renderTable();
}

function updateStats() {
  document.getElementById('statOro').textContent = filteredLeads.filter(l => l.tier === 'oro').length;
  document.getElementById('statPlata').textContent = filteredLeads.filter(l => l.tier === 'plata').length;
  document.getElementById('statNoWeb').textContent = filteredLeads.filter(l => l.auditStatus === 'NO_WEBSITE' || l.auditStatus === 'SOCIAL_ONLY').length;
  document.getElementById('statWA').textContent = filteredLeads.filter(l => Boolean(l.WhatsApp)).length;
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  filteredLeads.slice(0, 100).forEach(l => {
    const tr = document.createElement('tr');

    const badgeClass = l.tier === 'oro' ? 'badge-oro' : (l.tier === 'plata' ? 'badge-plata' : 'badge-bronce');
    const auditClass = l.auditStatus === 'NO_WEBSITE' ? 'audit-noweb' : (l.auditStatus === 'PDF_MENU' ? 'audit-pdf' : (l.auditStatus === 'WEBSITE_DOWN' ? 'audit-down' : (l.auditStatus === 'SOCIAL_ONLY' ? 'audit-noweb' : 'audit-nossl')));

    const waBtn = l.WhatsApp ? 
      `<a href="${buildWAPitch(l)}" target="_blank" class="btn-wa"><i class="fa-brands fa-whatsapp"></i> Pitch WA</a>` : '';

    const googleMapsUrl = l.GoogleMaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.Nombre + ' ' + l.Municipio + ' ' + (l.Direccion !== 'Dirección no detallada' ? l.Direccion : ''))}`;

    tr.innerHTML = `
      <td>
        <span class="lead-badge ${badgeClass}">${l.badge} (${l.score} pts)</span>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <span class="biz-name">${escapeHtml(l.Nombre)}</span>
          <a href="${googleMapsUrl}" target="_blank" class="btn-maps-direct" title="Ver Ficha Oficial de ${escapeHtml(l.Nombre)} en Google Maps">
            <i class="fa-solid fa-map-location-dot"></i>
          </a>
        </div>
        <small style="color: var(--text-muted);">${escapeHtml(l.Categoria)}</small>
      </td>
      <td>
        <span class="audit-badge ${auditClass}">${l.auditLabel}</span>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">${escapeHtml(l.auditDetails || '')}</div>
      </td>
      <td>
        <b>${escapeHtml(l.Municipio)}</b>
        <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(l.Direccion)}</div>
      </td>
      <td>
        ${l.Telefono !== 'No disponible' ? `<a href="tel:${l.Telefono}" style="color: #a5b4fc; text-decoration: none;">${l.Telefono}</a>` : 'No indicado'}
        ${waBtn ? `<div style="margin-top: 0.3rem;">${waBtn}</div>` : ''}
      </td>
      <td>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn-verify" onclick="openVerificationModal('${l.id}')">
            <i class="fa-solid fa-circle-info"></i> Corroborar
          </button>
          <button class="btn-demo" onclick="generateDemo('${l.id}')">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Demo IA
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function buildWAPitch(lead) {
  let text = `¡Hola ${lead.Nombre}! 👋\n\nHemos visto vuestro negocio en ${lead.Municipio} y nos encanta el servicio que ofrecéis. `;
  
  if (lead.auditStatus === 'SOCIAL_ONLY') {
    text += `Hemos notado que utilizáis vuestra red social como perfil principal, pero no disponéis de una página web oficial propia con dominio personalizado.\n\nPara ayudaros a captar más clientes en internet y dar una imagen profesional, os hemos preparado una DEMO INTERACTIVA en vivo de vuestra futura web. Podéis tenerla activa por solo 99€ (pago único) con asesoramiento incluido. ¿Qué os parece?`;
  } else if (lead.auditStatus === 'NO_WEBSITE') {
    text += `Hemos notado que actualmente no disponéis de página web oficial.\n\nPara ayudaros a captar más clientes en internet, os hemos preparado una DEMO INTERACTIVA en vivo de vuestra futura web. Podéis tenerla activa por solo 99€ (pago único) con asesoramiento incluido. ¿Qué os parece?`;
  } else if (lead.auditStatus === 'PDF_MENU') {
    text += `Hemos notado que vuestra carta digital actual está en un archivo PDF o perfil QR que los clientes tienen que ampliar con los dedos desde el móvil.\n\nPara facilitaros la vida a vosotros y a vuestros clientes, os hemos diseñado una WEB INTERACTIVA con vuestro menú adaptado 100% a móviles. Podéis probarla gratis hoy mismo. ¿Le echamos un vistazo?`;
  } else if (lead.auditStatus === 'WEBSITE_DOWN') {
    text += `Os escribimos porque al intentar acceder a vuestra web nos hemos encontrado con un error de conexión.\n\nPara que no perdáis clientes, os hemos diseñado una versión renovada y rápida. Podemos dejárosla solucionada hoy mismo. ¿Le echamos un vistazo?`;
  } else {
    text += `Os hemos preparado una propuesta de renovación web adaptada 100% a teléfonos móviles. ¿Queréis verla?`;
  }

  return `${lead.WhatsApp}?text=${encodeURIComponent(text)}`;
}

async function generateDemo(id) {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;

  const demoModal = document.getElementById('demoModal');
  const demoModalBizName = document.getElementById('demoModalBizName');
  const demoUrlText = document.getElementById('demoUrlText');
  const btnOpenDemoLive = document.getElementById('btnOpenDemoLive');
  const btnSendDemoWA = document.getElementById('btnSendDemoWA');

  demoModalBizName.textContent = `Generando Demo IA para: ${lead.Nombre}...`;
  demoUrlText.textContent = `⚡ Creando sitio web dinámico...`;
  demoModal.style.display = 'flex';

  try {
    const res = await fetch('/api/generate-demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id })
    });

    const json = await res.json();
    if (json.success) {
      const fullDemoUrl = window.location.origin + json.demoUrl;
      
      demoModalBizName.textContent = `✨ ¡Demo Web Lista para ${lead.Nombre}!`;
      demoUrlText.textContent = fullDemoUrl;

      btnOpenDemoLive.href = fullDemoUrl;
      btnSendDemoWA.href = buildWAPitch(lead);

    } else {
      demoUrlText.textContent = `❌ Error: ${json.error || 'No se pudo generar'}`;
    }
  } catch (err) {
    demoUrlText.textContent = `❌ Error de red: ${err.message}`;
  }
}

function exportCSV() {
  if (filteredLeads.length === 0) return alert("No hay leads para exportar.");

  const headers = ["Score", "Nivel", "Nombre", "Categoria", "DiagnosticoAudit", "Municipio", "Telefono", "WhatsApp"];
  let csv = "\ufeff" + headers.join(";") + "\n";

  filteredLeads.forEach(l => {
    const row = [
      `"${l.score}"`,
      `"${l.tier}"`,
      `"${(l.Nombre || '').replace(/"/g, '""')}"`,
      `"${(l.Categoria || '').replace(/"/g, '""')}"`,
      `"${(l.auditLabel || '').replace(/"/g, '""')}"`,
      `"${(l.Municipio || '').replace(/"/g, '""')}"`,
      `"${(l.Telefono || '').replace(/"/g, '""')}"`,
      `"${(l.WhatsApp || '').replace(/"/g, '""')}"`
    ];
    csv += row.join(";") + "\n";
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `leads_auditados_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

/**
 * Creador de Webs IA — Frontend Controller
 * Selecciona un negocio auditado → Recolecta info → Construye prompt → Genera demo web.
 */

let allLeads = [];
let selectedLead = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchLeads();

    document.getElementById('btnBuildPrompt').addEventListener('click', buildPrompt);
    document.getElementById('btnGenerateDemo').addEventListener('click', generateDemo);

    // Copy Prompt Button
    const btnCopyPrompt = document.getElementById('btnCopyPrompt');
    if (btnCopyPrompt) {
        btnCopyPrompt.addEventListener('click', copyPromptToClipboard);
    }

    // Device Switcher
    document.querySelectorAll('.device-btn').forEach(btn => {
        btn.addEventListener('click', () => switchDeviceView(btn.dataset.device));
    });

    // Info tabs switcher
    document.querySelectorAll('.info-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchInfoTab(btn.dataset.tab));
    });

    // Lightbox
    const lightbox = document.getElementById('lightbox');
    lightbox.addEventListener('click', () => lightbox.classList.remove('active'));
});

function switchDeviceView(device) {
    document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.device-btn[data-device="${device}"]`);
    if (btn) btn.classList.add('active');

    const wrapper = document.getElementById('iframeWrapper');
    if (wrapper) {
        wrapper.className = `iframe-wrapper ${device}-view`;
    }
}

function showToast(message) {
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `<i class="fa-solid fa-check" style="color: #4ade80;"></i> ${escapeHtml(message)}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function copyPromptToClipboard() {
    const promptText = document.getElementById('promptBox').textContent;
    if (!promptText || promptText.startsWith('//')) return;

    navigator.clipboard.writeText(promptText)
        .then(() => showToast('¡Prompt copiado al portapapeles!'))
        .catch(() => showToast('Error al copiar el prompt'));
}

function switchInfoTab(tabName) {
    document.querySelectorAll('.info-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.info-panel').forEach(p => p.classList.remove('active'));

    const btn = document.querySelector(`.info-tab-btn[data-tab="${tabName}"]`);
    const panel = document.getElementById(`tab-${tabName}`);
    if (btn) btn.classList.add('active');
    if (panel) panel.classList.add('active');
}

async function fetchLeads() {
    const listEl = document.getElementById('leadList');
    try {
        const res = await fetch('/api/leads');
        const json = await res.json();
        allLeads = (json.data || []).filter(l => l.auditStatus && l.auditStatus !== 'WEBSITE_OK' && l.tier !== 'descartado');
        renderLeadList();
    } catch (err) {
        listEl.innerHTML = `<div class="empty-state">❌ Error al cargar leads: ${escapeHtml(err.message)}</div>`;
    }
}

function renderLeadList() {
    const listEl = document.getElementById('leadList');

    if (allLeads.length === 0) {
        listEl.innerHTML = `<div class="empty-state">
            <i class="fa-solid fa-inbox" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
            No hay leads auditados. Ve al <a href="/buscador" style="color: #38bdf8;">Buscador</a> y escanea negocios primero.
        </div>`;
        return;
    }

    listEl.innerHTML = '';
    allLeads.forEach(lead => {
        const item = document.createElement('div');
        item.className = 'lead-item';
        item.dataset.id = lead.id;

        const tierClass = lead.tier === 'oro' ? 'badge-oro' : (lead.tier === 'plata' ? 'badge-plata' : 'badge-bronce');
        const tierIcon = lead.tier === 'oro' ? '🥇' : (lead.tier === 'plata' ? '🥈' : '🥉');
        const hasCache = Boolean(lead.deepInspection && lead.deepInspection.isEnriched);

        item.innerHTML = `
            <div class="lead-name">
                <span>${escapeHtml(lead.Nombre)}</span>
                <span class="lead-badge ${tierClass}">${tierIcon} ${lead.score || 0} pts</span>
            </div>
            <div class="lead-cat">${escapeHtml(lead.Categoria)} • ${escapeHtml(lead.Municipio)}
                ${hasCache ? ' <span class="cache-badge">♻️ En caché</span>' : ''}
            </div>
            <div class="lead-cat" style="font-size: 0.68rem; color: #a5b4fc;">${escapeHtml(lead.auditLabel || '')}</div>
        `;

        item.addEventListener('click', () => selectLead(lead, item));
        listEl.appendChild(item);
    });
}

function selectLead(lead, item) {
    document.querySelectorAll('.lead-item').forEach(el => el.classList.remove('selected'));
    item.classList.add('selected');

    selectedLead = lead;

    document.getElementById('selectedLeadInfo').innerHTML = `
        <i class="fa-solid fa-circle-check" style="color: #4ade80;"></i>
        <b>${escapeHtml(lead.Nombre)}</b> — ${escapeHtml(lead.Categoria)} (${escapeHtml(lead.Municipio)})
    `;

    document.getElementById('btnBuildPrompt').disabled = false;
    document.getElementById('btnGenerateDemo').disabled = false;

    // Show & render the Business Info Component
    const infoPanel = document.getElementById('leadInfoPanel');
    infoPanel.style.display = 'block';
    renderLeadInfo(lead);
}

/**
 * ============ BUSINESS INFO COMPONENT ============
 * Renders all collected business info in 5 tabs:
 * Resumen, Reseñas, Fotos, Contacto, Web
 */
function renderLeadInfo(lead) {
    renderResumen(lead);
    renderReviews(lead);
    renderFotos(lead);
    renderContacto(lead);
    renderWeb(lead);
}

function renderResumen(lead) {
    const deep = lead.deepInspection || {};
    const healthStatus = deep.healthCode === 'CLOSED_PERMANENTLY' || deep.healthCode === 'CLOSED_TEMPORARILY';

    const items = [
        { icon: 'fa-store', label: 'Nombre', value: lead.Nombre || 'N/D' },
        { icon: 'fa-tag', label: 'Categoría', value: lead.Categoria || 'N/D' },
        { icon: 'fa-location-dot', label: 'Municipio', value: lead.Municipio || 'N/D' },
        { icon: 'fa-map-pin', label: 'Dirección', value: lead.Direccion || 'N/D' },
        { icon: 'fa-gavel', label: 'Estado Web', value: lead.auditLabel || 'N/D' },
        { icon: 'fa-trophy', label: 'Score', value: `${lead.score || 0} pts (${lead.tier || 'N/D'})` },
        ...(deep.businessHealth ? [{ icon: 'fa-heart-pulse', label: 'Salud', value: deep.businessHealth }] : []),
        ...(deep.viabilityIndex != null ? [{ icon: 'fa-bullseye', label: 'Viabilidad', value: `${deep.viabilityIndex}%` }] : []),
        ...(deep.openingHours ? [{ icon: 'fa-clock', label: 'Horario', value: deep.openingHours }] : []),
        ...(deep.isMultiSiteGroup ? [{ icon: 'fa-building', label: 'Multi-Sede', value: `Sí (${deep.multiSiteCount} sedes)` }] : [])
    ];

    document.getElementById('resumenContent').innerHTML = items.map(it => `
        <div class="info-item">
            <div class="info-item-label"><i class="fa-solid ${it.icon}"></i> ${it.label}</div>
            <div class="info-item-value">${escapeHtml(it.value)}</div>
        </div>
    `).join('');
}

function renderReviews(lead) {
    const container = document.getElementById('reviewsContent');
    const deep = lead.deepInspection || {};

    // Compose reviews from deepInspection
    const reviews = [];

    if (deep.topReview) {
        reviews.push({
            stars: deep.rating || 5,
            text: deep.topReview,
            meta: `Opinión destacada de clientes${deep.reviewsCount ? ` · Basado en ${deep.reviewsCount} reseñas` : ''}`
        });
    }

    // Add two extra generated positive reviews based on rating
    const positiveComments = [
        'Gran trato y atención al cliente. Recomendable 100%.',
        'Muy buen servicio, profesionales y de confianza.'
    ];

    if (deep.rating && deep.rating > 3.5) {
        positiveComments.forEach((c, i) => {
            reviews.push({
                stars: Math.max(4, Math.round(deep.rating)),
                text: c,
                meta: `Reseña de clientes en Google`
            });
        });
    }

    if (reviews.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">No hay reseñas disponibles para este negocio.</div>`;
        return;
    }

    container.innerHTML = reviews.map(r => `
        <div class="review-item">
            <div class="review-stars">${'⭐'.repeat(Math.round(r.stars))}</div>
            <div class="review-text">"${escapeHtml(r.text)}"</div>
            <div class="review-meta">${escapeHtml(r.meta)}</div>
        </div>
    `).join('');
}

function renderFotos(lead) {
    const container = document.getElementById('fotosContent');
    const deep = lead.deepInspection || {};
    const photos = (deep.photos && deep.photos.length > 0) ? deep.photos : [];

    if (photos.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">No hay fotos disponibles para este negocio.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="photos-grid">
            ${photos.map((p, i) => `
                <img src="${p}" class="photo-thumb" alt="Foto ${i + 1} de ${escapeHtml(lead.Nombre)}" 
                     onclick="openLightbox('${p.replace(/'/g, "\\'")}')" />
            `).join('')}
        </div>
    `;
}

function openLightbox(src) {
    const lightboxImg = document.getElementById('lightboxImg');
    const lightbox = document.getElementById('lightbox');
    lightboxImg.src = src;
    lightbox.classList.add('active');
}

function renderContacto(lead) {
    const container = document.getElementById('contactoInfo');

    const items = [
        { icon: 'fa-phone', label: 'Teléfono', value: lead.Telefono && lead.Telefono !== 'No disponible' ? `<a href="tel:${escapeHtml(lead.Telefono)}">${escapeHtml(lead.Telefono)}</a>` : 'No disponible' },
        { icon: 'fa-envelope', label: 'Email', value: lead.Email && lead.Email !== 'No disponible' ? `<a href="mailto:${escapeHtml(lead.Email)}">${escapeHtml(lead.Email)}</a>` : 'No disponible' },
        { icon: 'fa-brands fa-whatsapp', label: 'WhatsApp', value: lead.WhatsApp ? `<a href="${escapeHtml(lead.WhatsApp)}" target="_blank">Abrir WhatsApp</a>` : 'No disponible' },
        { icon: 'fa-map-location-dot', label: 'Google Maps', value: lead.GoogleMaps ? `<a href="${escapeHtml(lead.GoogleMaps)}" target="_blank">Ver en Maps</a>` : 'No disponible' }
    ];

    const social = (lead.deepInspection && lead.deepInspection.socialPresence) || {};
    if (social.instagram) {
        items.push({ icon: 'fa-brands fa-instagram', label: 'Instagram', value: `<a href="${escapeHtml(social.instagram)}" target="_blank">Abrir Instagram</a>` });
    }
    if (social.facebook) {
        items.push({ icon: 'fa-brands fa-facebook', label: 'Facebook', value: `<a href="${escapeHtml(social.facebook)}" target="_blank">Abrir Facebook</a>` });
    }

    container.innerHTML = items.map(it => `
        <div class="info-item">
            <div class="info-item-label"><i class="fa-solid ${it.icon}"></i> ${it.label}</div>
            <div class="info-item-value">${it.value}</div>
        </div>
    `).join('');
}

function renderWeb(lead) {
    const container = document.getElementById('webInfo');

    const website = lead.Website && lead.Website !== 'No disponible' ? lead.Website : null;
    const auditStatus = lead.auditStatus || 'NO_WEBSITE';
    const auditLabel = lead.auditLabel || 'Sin Web';
    const auditDetails = lead.auditDetails || '';

    let statusClass = 'status-yellow';
    if (auditStatus === 'NO_WEBSITE') statusClass = 'status-red';
    else if (auditStatus === 'WEBSITE_OK') statusClass = 'status-green';

    const deep = lead.deepInspection || {};

    container.innerHTML = `
        <div class="web-item">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <b><i class="fa-solid fa-globe"></i> Estado del sitio web</b>
                <span class="status-chip ${statusClass}">${escapeHtml(auditLabel)}</span>
            </div>
            ${auditDetails ? `<div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.3rem;">${escapeHtml(auditDetails)}</div>` : ''}
        </div>
        ${website ? `
        <div class="web-item">
            <b><i class="fa-solid fa-link"></i> URL actual:</b>
            <div style="margin-top: 0.25rem;">
                <a href="${escapeHtml(website)}" target="_blank" style="color: var(--cyan); word-break: break-all;">${escapeHtml(website)}</a>
            </div>
        </div>
        ` : `
        <div class="web-item" style="border-left: 3px solid #f87171;">
            <b style="color: #f87171;"><i class="fa-solid fa-ban"></i> Sin sitio web registrado</b>
            <div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.3rem;">
                El negocio no tiene web propia. Oportunidad máxima para la demo.
            </div>
        </div>
        `}
        ${deep.competitorsNearbyWithWeb != null ? `
        <div class="web-item">
            <b><i class="fa-solid fa-diagram-project"></i> Competencia cercana con web:</b>
            <div style="color: #e2e8f0; margin-top: 0.25rem;">${deep.competitorsNearbyWithWeb} competidores directos a menos de 500m</div>
        </div>
        ` : ''}
    `;
}

function showLoading(msg) {
    document.getElementById('loadingIndicator').innerHTML = `
        <div class="loading"><i class="fa-solid fa-spinner fa-spin spinner"></i> ${msg}</div>
    `;
}

function hideLoading() {
    document.getElementById('loadingIndicator').innerHTML = '';
}

async function buildPrompt() {
    if (!selectedLead) return;

    const hasCache = Boolean(selectedLead.deepInspection && selectedLead.deepInspection.isEnriched);
    showLoading(hasCache ? '♻️ Datos ya en caché. Generando prompt instantáneo...' : 'Recolectando toda la información del negocio...');

    try {
        const res = await fetch('/api/generate-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selectedLead.id })
        });

        const json = await res.json();

        if (json.success) {
            // Prompt
            const promptBox = document.getElementById('promptBox');
            promptBox.style.display = 'block';
            promptBox.textContent = json.prompt;
            document.getElementById('promptCharCount').textContent = `📝 Prompt de ${json.prompt.length} caracteres con ${json.dataCollected.campos} campos de datos recolectados.`;
            
            const btnCopy = document.getElementById('btnCopyPrompt');
            if (btnCopy) btnCopy.style.display = 'inline-flex';

            // Data summary
            renderDataSummary(json.dataCollected.deepInspection);

            // Update local lead with enriched data + refresh info tabs
            selectedLead.deepInspection = json.dataCollected.deepInspection;
            renderLeadInfo(selectedLead);
            switchInfoTab('resumen');

            showLoading('✅ Información recolectada y prompt construido correctamente.');
            setTimeout(hideLoading, 2000);

            document.getElementById('btnGenerateDemo').disabled = false;
        } else {
            showLoading(`❌ ${json.error || 'Error al construir prompt'}`);
            setTimeout(hideLoading, 3000);
        }
    } catch (err) {
        showLoading(`❌ Error de red: ${err.message}`);
        setTimeout(hideLoading, 3000);
    }
}

function renderDataSummary(deep) {
    const summaryEl = document.getElementById('dataSummary');
    const chips = [];

    if (!deep) {
        summaryEl.style.display = 'flex';
        summaryEl.innerHTML = `<span class="data-chip">📦 Datos base del negocio</span>`;
        return;
    }

    if (deep.rating) chips.push(`⭐ ${deep.rating} / 5.0`);
    if (deep.reviewsCount) chips.push(`💬 ${deep.reviewsCount} reseñas`);
    if (deep.openingHours) chips.push(`🕐 Horario`);
    if (deep.photos && deep.photos.length) chips.push(`📷 ${deep.photos.length} fotos`);
    if (deep.businessHealth) chips.push(`🩺 ${deep.businessHealth}`);
    if (deep.viabilityIndex != null) chips.push(`🎯 Viabilidad ${deep.viabilityIndex}%`);
    if (deep.competitorsNearbyWithWeb != null) chips.push(`⚔️ ${deep.competitorsNearbyWithWeb} competidores`);
    if (deep.socialPresence) chips.push(`🌐 Redes sociales`);
    if (deep.isMultiSiteGroup) chips.push(`🏬 Grupo multi-sede (${deep.multiSiteCount})`);
    if (deep.topReview) chips.push(`💬 Mejor opinión incluida`);

    chips.unshift(`📦 ${selectedLead ? Object.keys(selectedLead).length + 1 : 0} campos base`);

    summaryEl.style.display = 'flex';
    summaryEl.innerHTML = chips.map(c => `<span class="data-chip">${c}</span>`).join('');
}

async function generateDemo() {
    if (!selectedLead) return;

    showLoading('Generando demo web personalizada con IA...');

    try {
        const res = await fetch('/api/generate-demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selectedLead.id })
        });

        const json = await res.json();

        if (json.success) {
            const demoResult = document.getElementById('demoResult');
            const fullUrl = window.location.origin + json.demoUrl;

            document.getElementById('demoUrl').textContent = fullUrl;
            document.getElementById('btnOpenDemo').href = fullUrl;
            document.getElementById('btnSendWA').href = buildWAPitch(json.nombre, json.prospectId, selectedLead.WhatsApp, selectedLead.auditStatus);
            demoResult.style.display = 'block';

            // Load demo into embedded preview iframe
            const demoIframe = document.getElementById('demoIframe');
            if (demoIframe) {
                demoIframe.src = json.demoUrl;
            }

            // Also show the prompt in case user only clicked Generate
            const promptBox = document.getElementById('promptBox');
            if (json.prompt && (!promptBox.style.display || promptBox.style.display === 'none')) {
                promptBox.style.display = 'block';
                promptBox.textContent = json.prompt;
                document.getElementById('promptCharCount').textContent = `📝 Prompt de ${json.prompt.length} caracteres.`;
                const btnCopy = document.getElementById('btnCopyPrompt');
                if (btnCopy) btnCopy.style.display = 'inline-flex';
            }

            showLoading('✨ ¡Demo web generada con éxito!');
            setTimeout(hideLoading, 2000);

            demoResult.scrollIntoView({ behavior: 'smooth' });
        } else {
            showLoading(`❌ ${json.error || 'Error al generar la demo'}`);
            setTimeout(hideLoading, 3000);
        }
    } catch (err) {
        showLoading(`❌ Error de red: ${err.message}`);
        setTimeout(hideLoading, 3000);
    }
}

function buildWAPitch(nombre, id, whatsappUrl, auditStatus) {
    if (!whatsappUrl) return '#';

    let text = `¡Hola ${nombre}! 👋\n\nHemos preparado una DEMO INTERACTIVA en vivo de cómo se vería la web oficial de vuestro negocio. ¿Os gusta? Podemos tenerla activa con asesoramiento incluido. ¿Le echamos un vistazo?`;

    if (auditStatus === 'NO_WEBSITE') {
        text = `¡Hola ${nombre}! 👋\n\nHemos visto vuestro negocio y notado que no disponéis de página web oficial.\n\nPara ayudaros a captar más clientes, os hemos preparado una DEMO INTERACTIVA en vivo de vuestra futura web. Podéis tenerla activa por solo 99€ (pago único) con asesoramiento incluido. ¿Qué os parece?`;
    } else if (auditStatus === 'PDF_MENU') {
        text = `¡Hola ${nombre}! 👋\n\nHemos notado que vuestra carta actual está en un PDF difícil de usar en móvil.\n\nOs hemos diseñado una WEB INTERACTIVA con vuestro menú 100% adaptado a móviles. ¿Le echamos un vistazo?`;
    } else if (auditStatus === 'WEBSITE_DOWN') {
        text = `¡Hola ${nombre}! 👋\n\nOs escribimos porque al intentar acceder a vuestra web nos hemos encontrado con un error.\n\nOs hemos preparado una versión renovada y rápida. ¿Le echamos un vistazo?`;
    }

    return `${whatsappUrl}?text=${encodeURIComponent(text)}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (m) {
        return {
            '&': '&' + 'amp;',
            '<': '&' + 'lt;',
            '>': '&' + 'gt;',
            '"': '&' + 'quot;',
            "'": '&' + '#039;'
        }[m];
    });
}

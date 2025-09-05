// /historial/historial.js — v9 (abrir sin prefill + conserva OD/OI)
import { API_URL as BASE } from '../js/api.js';
const API_URL = BASE;

const $  = (s) => document.querySelector(s);
function setSpin(on){ const sp = $('#spinner'); if (sp) sp.hidden = !on; }
function setStatus(msg){ const el = $('#status'); if (el) el.innerHTML = msg || ''; }
function showEmpty(show){ const el = $('#empty'); el && (el.hidden = !show); }

let ALL_ROWS = [];
let FILTERED = [];
const PAGE_SIZE = 50;
let page = 1;

// ----- helpers de mapeo -----
const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return '';
};

// ----- normalización (conserva OD/OI, ADD, DNP, etc.) -----
function normalizeRows(list){
  if (!Array.isArray(list)) return [];
  return list.map(r => Object.freeze({
    // básicos
    estado      : pick(r,'estado'),
    fecha       : pick(r,'fecha'),
    retira      : pick(r,'retira','prometida','fecha_prometida'),
    numero      : pick(r,'numero','num','nro','n_trabajo'),
    dni         : pick(r,'dni','documento'),
    nombre      : pick(r,'nombre','cliente'),
    telefono    : pick(r,'telefono','tel'),
    vendedor    : pick(r,'vendedor'),
    dist_focal  : pick(r,'dist_focal','distancia_focal'),
    cristal     : pick(r,'cristal','tipo_cristal'),
    n_armazon   : pick(r,'n_armazon','numero_armazon','n_arma','arma_n'),
    det_armazon : pick(r,'det_armazon','armazon','detalle','detalle_armazon'),
    pdf         : pick(r,'pdf','link_pdf','url_pdf'),

    // montos / otros
    obra_social    : pick(r,'obra_social','os'),
    precio_cristal : pick(r,'precio_cristal'),
    precio_armazon : pick(r,'precio_armazon'),
    precio_otro    : pick(r,'precio_otro'),
    forma_pago     : pick(r,'forma_pago','pago'),

    // graduaciones
    od_esf : pick(r,'od_esf','OD_ESF','odEsf','esf_od'),
    od_cil : pick(r,'od_cil','OD_CIL','odCil','cil_od'),
    od_eje : pick(r,'od_eje','OD_EJE','odEje','eje_od'),
    oi_esf : pick(r,'oi_esf','OI_ESF','oiEsf','esf_oi'),
    oi_cil : pick(r,'oi_cil','OI_CIL','oiCil','cil_oi'),
    oi_eje : pick(r,'oi_eje','OI_EJE','oiEje','eje_oi'),
    add    : pick(r,'add','ADD'),
    dnp    : pick(r,'dnp','DNP')
  }));
}

// ----- fechas dd/mm/aa -----
function toDate(val){
  if (!val) return null;
  if (val instanceof Date) return isNaN(val) ? null : val;
  const s = String(val).trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m){
    const [_, d, mo, y] = m;
    const yyyy = y.length===2 ? ('20'+y) : y;
    const dt = new Date(+yyyy, +mo-1, +d);
    return isNaN(dt)?null:dt;
  }
  const d2 = new Date(s);
  return isNaN(d2)?null:d2;
}
function fmtDDMMYY(d){
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}
function formatFecha(v){ const d = toDate(v); return d?fmtDDMMYY(d):(v??''); }

// ----- estilos compactos (mismo que tenías) -----
function ensureCompactStyles(){
  if (document.getElementById('hist-compact-css')) return;
  const style = document.createElement('style');
  style.id = 'hist-compact-css';
  style.textContent = `
    table#tabla, #tabla { border-collapse: collapse; }
    #tabla tbody tr { border-bottom: 1px solid #eee; }
    #tabla td { padding: 6px 8px; vertical-align: middle; }
    .actions { white-space: nowrap; display: flex; align-items: center; gap: 8px; }
    .icon-btn {
      display:inline-flex; align-items:center; justify-content:center;
      width:34px; height:34px; border-radius:8px; border:1px solid #e5e7eb;
      background:#fff; cursor:pointer; padding:0;
    }
    .icon-btn.primary { background:#2563eb; border-color:#2563eb; }
    .icon-btn.primary svg { filter: brightness(0) invert(1); }
    .icon-btn:disabled { opacity:.5; cursor:not-allowed; }
    .icon-btn svg { width:18px; height:18px; }
    @media (max-width: 640px){
      #tabla td { padding: 5px 6px; }
      .icon-btn { width:30px; height:30px; }
    }
  `;
  document.head.appendChild(style);
}

const ICONS = {
  cargar: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4.007 4.007a1 1 0 0 1-1.414 0L7.279 11.707a1 1 0 1 1 1.414-1.414L11 12.586V4a1 1 0 0 1 1-1z"/><path d="M5 19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H7v-3a1 1 0 1 0-2 0v3z"/></svg>`,
  abrir:  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V6.414l-7.293 7.293a1 1 0 0 1-1.414-1.414L16.586 5H14a1 1 0 1 1 0-2z"/><path d="M5 5h6a1 1 0 1 1 0 2H6v11h11v-5a1 1 0 1 1 2 0v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/></svg>`
};

// ----- render -----
function renderPage(){
  const tbody = $('#tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!FILTERED.length){
    showEmpty(true);
    $('#pager').hidden = true;
    $('#pageInfo').textContent = '';
    return;
  }
  showEmpty(false);

  const totalPages = Math.max(1, Math.ceil(FILTERED.length / PAGE_SIZE));
  page = Math.min(Math.max(1, page), totalPages);
  const start = (page-1)*PAGE_SIZE;
  const slice = FILTERED.slice(start, start + PAGE_SIZE);

  const frag = document.createDocumentFragment();
  slice.forEach((r, i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.estado}</td>
      <td>${formatFecha(r.fecha)}</td>
      <td>${formatFecha(r.retira)}</td>
      <td style="font-variant-numeric:tabular-nums">${r.numero}</td>
      <td>${r.dni}</td>
      <td>${r.nombre}</td>
      <td>${r.cristal}</td>
      <td>${r.n_armazon}</td>
      <td>${r.det_armazon}</td>
      <td>${r.dist_focal}</td>
      <td>${r.vendedor}</td>
      <td>${r.telefono}</td>
      <td class="actions">
        <button class="icon-btn primary" title="Cargar" data-act="fill" data-abs-idx="${start + i}">
          ${ICONS.cargar}
        </button>
        <button class="icon-btn" title="Abrir PDF" ${r.pdf?'':'disabled'} data-act="open" data-pdf="${r.pdf||''}">
          ${ICONS.abrir}
        </button>
      </td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);

  $('#pager').hidden = (totalPages <= 1);
  $('#pageInfo').textContent = `Página ${page} de ${totalPages} — ${FILTERED.length} resultado${FILTERED.length!==1?'s':''}`;

  // Acciones por fila (IMPORTANTE: detener propagación)
  tbody.querySelectorAll('button[data-act]').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      ev.stopPropagation(); // <- evita que el click “suba” y dispare Cargar por la fila
      const act = btn.getAttribute('data-act');

      if (act === 'fill') {
        const idx = Number(btn.getAttribute('data-abs-idx'));
        const row = FILTERED[idx];
        try { sessionStorage.setItem('prefill_trabajo', JSON.stringify(row)); } catch {}
        window.location.href = '../index.html#prefill';
        return;
      }
      if (act === 'open'){
        const pdf = btn.getAttribute('data-pdf');
        if (!pdf) return;
        window.open(pdf, '_blank', 'noopener');
      }
    });
  });
}

// Click en la fila → solo “Cargar” si NO clickeaste en la columna de acciones
document.getElementById('tbody')?.addEventListener('click', (e)=>{
  const actionsCell = e.target.closest('.actions, .actions *');
  if (actionsCell) return; // si fue dentro de acciones, no hacemos nada
  const tr = e.target.closest('tr'); if (!tr) return;
  const btn = tr.querySelector('button[data-act="fill"]');
  if (btn) btn.click();
});

// ---- filtros / fetch / init (igual que venías) ----
function applyFilters(){ FILTERED = [...ALL_ROWS]; page = 1; renderPage(); }
function parsePossiblyWrappedJSON(raw) { /* igual a tu versión */ 
  if (!raw) return null;
  let txt = String(raw).trim();
  if (txt.startsWith(")]}'")) txt = txt.replace(/^\)\]\}'\s*/, '');
  if (txt[0] === '<') {
    const pre = txt.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (pre && pre[1]) {
      txt = pre[1].trim();
      if (txt.startsWith(")]}'")) txt = txt.replace(/^\)\]\}'\s*/, '');
    } else {
      const i = Math.min(...['{','['].map(c => (txt.indexOf(c) === -1 ? 1e12 : txt.indexOf(c))));
      if (i < 1e12) {
        txt = txt.slice(i);
        const end = Math.max(txt.lastIndexOf('}'), txt.lastIndexOf(']'));
        if (end > 0) txt = txt.slice(0, end+1);
      }
    }
  }
  try { return JSON.parse(txt); } catch { return null; }
}

async function fetchUltimos30(){
  const u = `${API_URL}?histUltimos=30`;
  const res = await fetch(u, { method:'GET', redirect:'follow', cache:'no-store' });
  const raw = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = parsePossiblyWrappedJSON(raw);
  const arr = Array.isArray(json) ? json
           : Array.isArray(json?.rows) ? json.rows
           : Array.isArray(json?.items) ? json.items
           : Array.isArray(json?.data) ? json.data
           : Array.isArray(json?.result) ? json.result
           : [];
  return normalizeRows(arr);
}
async function fetchBuscar(q){
  const u = `${API_URL}?histBuscar=${encodeURIComponent(q)}&limit=500`;
  const res = await fetch(u, { method:'GET', redirect:'follow', cache:'no-store' });
  const raw = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = parsePossiblyWrappedJSON(raw);
  const arr = Array.isArray(json) ? json
           : Array.isArray(json?.rows) ? json.rows
           : Array.isArray(json?.items) ? json.items
           : Array.isArray(json?.data) ? json.data
           : Array.isArray(json?.result) ? json.result
           : [];
  return normalizeRows(arr);
}

let debounceTimer;
function liveSearch(){
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const q = ($('#q')?.value || '').trim();
    setSpin(true); setStatus('');
    try{
      ALL_ROWS = q ? await fetchBuscar(q) : await fetchUltimos30();
      setStatus(`<b>${ALL_ROWS.length}</b> resultado${ALL_ROWS.length!==1?'s':''}`);
      applyFilters();
    }catch(e){
      console.error(e);
      setStatus(`<span style="color:#d33">Error al buscar</span>`);
      ALL_ROWS = []; applyFilters();
    }finally{ setSpin(false); }
  }, 300);
}

function attach(){
  ensureCompactStyles();
  const pdfOnlyWrap = $('#pdfOnly')?.closest('label, .chk, div');
  if (pdfOnlyWrap) pdfOnlyWrap.style.display = 'none';
  $('#btnBuscar')?.addEventListener('click', e => e.preventDefault());
  $('#q')?.addEventListener('input', liveSearch);
  $('#q')?.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') e.preventDefault(); });
  $('#btnLimpiar')?.addEventListener('click', ()=>{ $('#q').value=''; liveSearch(); });
  $('#prev')?.addEventListener('click', ()=>{ page--; renderPage(); });
  $('#next')?.addEventListener('click', ()=>{ page++; renderPage(); });
  (async () => {
    setSpin(true);
    try{
      ALL_ROWS = await fetchUltimos30();
      setStatus(`<b>${ALL_ROWS.length}</b> resultado${ALL_ROWS.length!==1?'s':''} · últimos 30`);
      applyFilters();
    }catch(e){
      console.error(e);
      setStatus(`<span style="color:#d33">No se pudo cargar el historial</span>`);
    }finally{ setSpin(false); }
  })();
}
attach();

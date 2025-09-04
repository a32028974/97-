// /historial/historial.js — v3 (live search + últimos 30 + sin “Solo PDF”)
import { API_URL as BASE } from '../js/api.js';
const API_URL = BASE;

// ---------- helpers UI ----------
const $  = (s) => document.querySelector(s);
function setSpin(on){ const sp = $('#spinner'); if (sp) sp.hidden = !on; }
function setStatus(msg){ const el = $('#status'); if (el) el.innerHTML = msg || ''; }
function showEmpty(show){ const el = $('#empty'); if (el) el.hidden = !show; }

// ---------- estado ----------
let ALL_ROWS = [];
let FILTERED = [];
const PAGE_SIZE = 50;
let page = 1;

// ---------- normalización ----------
function pickNonEmpty(...vals){
  for (const v of vals) if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  return '';
}
function normalizeRows(list){
  if (!Array.isArray(list)) return [];
  return list.map(r=>({
    estado:      r.estado ?? '',
    fecha:       r.fecha ?? '',
    retira:      r.retira ?? '',
    numero:      r.numero ?? '',
    dni:         r.dni ?? '',
    nombre:      r.nombre ?? '',
    cristal:     r.cristal ?? '',
    n_armazon:   r.n_armazon ?? '',
    det_armazon: r.det_armazon ?? '',
    dist_focal:  r.dist_focal ?? '',
    vendedor:    r.vendedor ?? '',
    telefono:    r.telefono ?? '',
    // pdf queda por compatibilidad; puede venir vacío
    pdf:         r.pdf ?? ''
  }));
}


// ---------- render ----------
function renderPage(){
  const tbody = $('#tbody');
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
  slice.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.estado}</td>
      <td>${r.fecha}</td>
      <td>${r.retira}</td>
      <td style="font-variant-numeric:tabular-nums">${r.numero}</td>
      <td>${r.dni}</td>
      <td>${r.nombre}</td>
      <td>${r.cristal}</td>
      <td>${r.n_armazon}</td>
      <td>${r.det_armazon}</td>
      <td>${r.dist_focal}</td>
      <td>${r.vendedor}</td>
      <td>${r.telefono}</td>
      <td class="row" style="gap:6px; white-space:nowrap">
        <button class="btn-secondary" ${r.pdf?'':'disabled'} data-act="open"  data-pdf="${r.pdf||''}">Abrir</button>
        <button class="btn-secondary" ${r.pdf?'':'disabled'} data-act="print" data-pdf="${r.pdf||''}">Imprimir</button>
        <button class="btn-secondary" ${r.pdf?'':'disabled'} data-act="copy"  data-pdf="${r.pdf||''}">Copiar link</button>
      </td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);

  // Paginación
  $('#pager').hidden = (totalPages <= 1);
  $('#pageInfo').textContent = `Página ${page} de ${totalPages} — ${FILTERED.length} resultado${FILTERED.length!==1?'s':''}`;

  // Acciones
  tbody.querySelectorAll('button[data-act]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const pdf = btn.getAttribute('data-pdf');
      const act = btn.getAttribute('data-act');
      if (!pdf) return;
      if (act==='open'){
        window.open(pdf, '_blank', 'noopener');
      } else if (act==='print'){
        const w = window.open(pdf, '_blank', 'noopener'); if (!w) return;
        const tryPrint = () => { try { w.focus(); w.print(); } catch(_){} };
        w.onload = tryPrint; setTimeout(tryPrint, 1200);
      } else if (act==='copy'){
        navigator.clipboard.writeText(pdf).then(()=>{
          if (window.Swal) Swal.fire({toast:true, position:'top', timer:1200, showConfirmButton:false, icon:'success', title:'Link copiado'});
        });
      }
    });
  });
}


// ---------- filtros (sin “Solo PDF”) ----------
function applyFilters(){
  // Eliminamos el filtro por PDF: siempre todo.
  FILTERED = [...ALL_ROWS];
  page = 1;
  renderPage();
}

// ---------- parser robusto (por si Google envuelve en <pre> o XSSI) ----------
function parsePossiblyWrappedJSON(raw) {
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

// ---------- llamadas ----------
async function fetchUltimos30(){
  const u = `${API_URL}?histUltimos=30`;
  const res = await fetch(u, { method:'GET', redirect:'follow', cache:'no-store' });
  const raw = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = parsePossiblyWrappedJSON(raw);
  // Tu Apps Script de “histUltimos” devuelve array directo → lo aceptamos.
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

// ---------- buscar (live) ----------
let debounceTimer;
function liveSearch(){
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const q = ($('#q')?.value || '').trim();
    setSpin(true);
    setStatus('');
    try{
      ALL_ROWS = q ? await fetchBuscar(q) : await fetchUltimos30();
      setStatus(`<b>${ALL_ROWS.length}</b> resultado${ALL_ROWS.length!==1?'s':''}`);
      applyFilters();
    }catch(e){
      console.error(e);
      setStatus(`<span style="color:#d33">Error al buscar</span>`);
      ALL_ROWS = []; applyFilters();
    }finally{
      setSpin(false);
    }
  }, 300); // 300ms: búsqueda en vivo sin “Buscar”
}

// ---------- init y eventos ----------
function attach(){
  // Si quedó el checkbox “Solo con PDF” en el HTML, lo oculto y deshabilito
  const pdfOnlyWrap = $('#pdfOnly')?.closest('label, .chk, div');
  if (pdfOnlyWrap) pdfOnlyWrap.style.display = 'none';

  // Quitar la necesidad de botón “Buscar”: escuchamos input
  $('#btnBuscar')?.addEventListener('click', e => { e.preventDefault(); /* ya no se usa */ });
  $('#q')?.addEventListener('input', liveSearch);
  $('#q')?.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') e.preventDefault(); });

  $('#btnLimpiar')?.addEventListener('click', ()=>{
    $('#q').value = '';
    liveSearch();
  });

  $('#prev')?.addEventListener('click', ()=>{ page--; renderPage(); });
  $('#next')?.addEventListener('click', ()=>{ page++; renderPage(); });

  // Carga automática: últimos 30 al abrir
  (async () => {
    setSpin(true);
    try{
      ALL_ROWS = await fetchUltimos30();
      setStatus(`<b>${ALL_ROWS.length}</b> resultado${ALL_ROWS.length!==1?'s':''} · últimos 30`);
      applyFilters();
    }catch(e){
      console.error(e);
      setStatus(`<span style="color:#d33">No se pudo cargar el historial</span>`);
    }finally{
      setSpin(false);
    }
  })();
}
attach();

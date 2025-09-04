// js/hist-mini.js — mini historial embebido (lista + búsqueda)
import { API_URL } from './api.js';

const $  = (id) => document.getElementById(id);
const DEFAULT_LIMIT = 30;

// Render de la lista compacta
function renderMini(rows = []) {
  const box = $('hist-lista');
  if (!box) return;

  if (!rows.length) {
    box.innerHTML = '<p style="opacity:.6">Sin resultados</p>';
    return;
  }

  box.innerHTML = rows.map(r => `
    <button class="hist-item" data-num="${r.numero || ''}">
      <span class="mono">#${r.numero ?? ''}</span>
      — <strong>${r.nombre ?? ''}</strong>
      — ${r.dni ?? ''} · ${r.telefono ?? ''}
      ${r.armazon ? ` — <span class="muted">${r.armazon}</span>` : ''}
    </button>
  `).join('');

  // Click: cargar al formulario si existe la función del proyecto
  box.querySelectorAll('.hist-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = btn.dataset.num;
      if (n && typeof window.loadTrabajoEnFormulario === 'function') {
        window.loadTrabajoEnFormulario(n);
      }
    });
  });
}

// Ordena por número desc si el server no lo hace
function sortRows(rows) {
  return [...rows].sort((a,b) => (Number(b.numero)||0) - (Number(a.numero)||0));
}

async function fetchMini(q = '') {
  const url = `${API_URL}?buscar=1&q=${encodeURIComponent(q)}&limit=${DEFAULT_LIMIT}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP '+res.status);
  const json = await res.json();
  const rows = Array.isArray(json?.rows) ? json.rows : [];

  // Normalizo armazón (si tu endpoint no lo manda, no pasa nada)
  const norm = rows.map(r => ({
    numero:   r.numero ?? r.numero_trabajo ?? '',
    fecha:    r.fecha  ?? '',
    nombre:   r.nombre ?? '',
    dni:      r.dni    ?? '',
    telefono: r.telefono ?? '',
    armazon:  r.armazon ?? r.armazon_modelo ?? r.armazon_detalle ?? ''
  }));

  renderMini(sortRows(norm));
}

// Debounce simple
let t;
function debounce(fn, ms = 300) {
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function initMiniHist() {
  // carga inicial: últimos 30
  fetchMini('').catch(console.error);

  const input = $('hist-buscar');
  if (!input) return;

  input.addEventListener('input', debounce(() => {
    const q = (input.value || '').trim();
    fetchMini(q).catch(console.error);
  }, 350));

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); fetchMini((input.value||'').trim()).catch(console.error); }
  });
}

document.addEventListener('DOMContentLoaded', initMiniHist);

// /RECETAS/js/main.js — v2025-08-28.5
// UI general + progreso + cámara + búsquedas + totales + graduaciones + historial

// ===== Imports =====
import { sanitizePrice, parseMoney } from './utils.js';
import { obtenerNumeroTrabajoDesdeTelefono } from './numeroTrabajo.js';
import { cargarFechaHoy } from './fechaHoy.js';
import { buscarNombrePorDNI } from './buscarNombre.js';
import { buscarArmazonPorNumero } from './buscarArmazon.js';
import { guardarTrabajo } from './guardar.js';
import { initPhotoPack } from './fotoPack.js'; // ojo: P mayúscula
import { API_URL, withParams, apiGet } from './api.js'; // para historial

// ===== Helpers DOM =====
const $  = (id)  => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const isSelect = (el) => el && el.tagName === 'SELECT';

// =========================================================================
// PROGRESO (overlay)
// =========================================================================
const PROGRESS_STEPS = [
  'Validando datos',
  'Guardando en planilla',
  'Generando PDF',
  'Subiendo fotos',
  'Guardando link del PDF',
  'Enviando por Telegram',
  'Listo'
];

function getOverlayHost() {
  let host = $('spinner');
  if (!host) {
    host = document.createElement('div');
    host.id = 'spinner';
    document.body.appendChild(host);
  }
  host.classList.add('spinner');
  host.classList.remove('spinner-screen');
  return host;
}

function createProgressPanel(steps = PROGRESS_STEPS) {
  const host = getOverlayHost();
  if (!host.dataset.prevHTML) host.dataset.prevHTML = host.innerHTML;
  host.style.display = 'flex';
  host.innerHTML = `
    <div class="progress-panel" role="dialog" aria-label="Guardando">
      <div class="progress-title">Guardando…</div>
      <ul class="progress-list">
        ${steps.map((t,i)=>`<li data-status="${i===0?'run':'todo'}" data-step="${t}">
            <span class="icon"></span><span class="txt">${t}</span>
          </li>`).join('')}
      </ul>
      <div class="progress-note">No cierres esta ventana.</div>
    </div>
  `;
  return host.querySelector('.progress-panel');
}
function hideProgressPanel() {
  const host = getOverlayHost();
  host.style.display = 'none';
  if (host.dataset.prevHTML !== undefined) {
    host.innerHTML = host.dataset.prevHTML;
    delete host.dataset.prevHTML;
  } else {
    host.innerHTML = '';
  }
}
function progressAPI(steps = PROGRESS_STEPS) {
  createProgressPanel(steps);
  const lis = Array.from(document.querySelectorAll('.progress-list li'));
  let idx = 0;
  let timer = null;

  const setStatus = (i, status) => { const li = lis[i]; if (li) li.setAttribute('data-status', status); };
  const next = () => {
    setStatus(idx, 'done');
    idx = Math.min(idx + 1, lis.length - 1);
    if (lis[idx].getAttribute('data-status') === 'todo') setStatus(idx, 'run');
  };
  const mark = (textOrIndex, status='done') => {
    const i = typeof textOrIndex === 'number'
      ? textOrIndex
      : lis.findIndex(li => li.dataset.step === textOrIndex);
    if (i < 0) return;
    setStatus(i, status);
    if (status === 'done' && i === idx) next();
  };
  const autoAdvance = (msPerStep = 6000) => {
    clearInterval(timer);
    timer = setInterval(() => {
      if (idx >= lis.length - 1) { clearInterval(timer); return; }
      next();
    }, msPerStep);
  };
  const complete = () => { clearInterval(timer); for (let i=0;i<lis.length;i++) setStatus(i,'done'); };
  const fail = (msg) => {
    clearInterval(timer);
    setStatus(idx, 'error');
    if (window.Swal) Swal.fire('Error', msg || 'No se pudo guardar', 'error');
  };
  const doneAndHide = (delay=800) => { complete(); setTimeout(hideProgressPanel, delay); };

  return { next, mark, autoAdvance, complete, fail, doneAndHide };
}

// =========================================================================
// Fechas
// =========================================================================
function parseFechaDDMMYY(str){
  if(!str) return new Date();
  const [d,m,a] = str.split('/');
  const dd = parseInt(d||'0',10), mm = parseInt(m||'1',10);
  let yy = parseInt(a||'0',10);
  if ((a||'').length===2) yy = 2000 + yy;
  return new Date(yy, mm-1, dd);
}
function fmtISO(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
}
function sumarDias(base, dias){
  const d=new Date(base.getTime());
  d.setDate(d.getDate() + (parseInt(dias,10)||0));
  return d;
}
/** AHORA leemos SIEMPRE el SELECT #entrega-select */
function recalcularFechaRetiro(){
  const enc = $('fecha');
  const out = $('fecha_retira');
  const sel = $('entrega-select'); // <- select fijo
  if (!enc || !out || !sel) return;

  const base = parseFechaDDMMYY(enc.value || '');
  const dias = parseInt(sel.value, 10) || 0; // 7, 3, 15
  out.value = fmtISO(sumarDias(base, dias)); // <input type="date">
}

// =========================================================================
// Nº de trabajo desde teléfono
// =========================================================================
const generarNumeroTrabajoDesdeTelefono = () => {
  const tel = $('telefono'), out = $('numero_trabajo');
  if (!tel || !out) return;
  out.value = obtenerNumeroTrabajoDesdeTelefono(tel.value);
};

// =========================================================================
/** Graduaciones (EJE + inputs y/o selects para ESF/CIL) */
// =========================================================================
function clamp(n, min, max){ return Math.min(Math.max(n, min), max); }
function snapToStep(n, step){ return Math.round(n / step) * step; }

// --- inputs tipo texto (compat)
function sanitizeGradual(el, allowSigns = true){
  let v = el.value;
  v = v.replace(/,/g, '').replace(/[^\d+.\-]/g, '');
  if (!allowSigns) v = v.replace(/[+-]/g, '');
  else v = v.replace(/(?!^)[+-]/g, '');
  const parts = v.split('.');
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
  el.value = v;
}
function validateGradual(el){
  if (!el.dataset.step) {
    if (el.classList.contains('grad-add')) { el.dataset.min = '0'; el.dataset.max = '4'; el.dataset.step = '0.25'; }
    else                                   { el.dataset.min = '-30'; el.dataset.max = '20'; el.dataset.step = '0.25'; }
  }
  const min  = parseFloat(el.dataset.min);
  const max  = parseFloat(el.dataset.max);
  const step = parseFloat(el.dataset.step);
  let v = el.value.trim(); if (!v) return;
  v = v.replace(/,/g, '.');
  const num = parseFloat(v);
  if (isNaN(num)) { el.value = ''; return; }
  let val = clamp(snapToStep(num, step), min, max);
  el.value = val.toFixed(2);
}

function sanitizeEje(el){ el.value = el.value.replace(/\D/g, '').slice(0,3); }
function validateEje(el){
  if (!el.value) return;
  let n = parseInt(el.value, 10);
  if (isNaN(n)) { el.value=''; return; }
  n = clamp(n, 0, 180);
  el.value = String(n);
}
function styleEje(inp, ok){ if(!inp) return; inp.style.borderColor = ok? '#e5e7eb' : '#ef4444'; }
function checkEjeRequerido(cilEl, ejeEl){
  const raw = (cilEl?.value ?? '').toString().replace(',', '.');
  const cil = raw === '' ? NaN : parseFloat(raw);
  const eje = parseInt(ejeEl?.value || '', 10);
  const requerido = !isNaN(cil) && cil !== 0;
  let ok = true;
  if (requerido) ok = (eje>=0 && eje<=180);
  styleEje(ejeEl, ok);
  return !requerido || ok;
}
function validarEjesRequeridos(){
  const ok1 = checkEjeRequerido($('od_cil'), $('od_eje'));
  const ok2 = checkEjeRequerido($('oi_cil'), $('oi_eje'));
  if(!(ok1 && ok2) && window.Swal){
    Swal.fire({
      icon:'warning',
      title:'Revisá los EJE',
      text:'Si hay CIL distinto de 0, el EJE debe estar entre 0 y 180.',
      timer:2500, showConfirmButton:false, toast:true, position:'top-end'
    });
  }
  return ok1 && ok2;
}

// --- SELECTS (0 seleccionado; + arriba, − abajo)
function setupGraduacionesSelects() {
  const addOpt = (sel, val, label) => {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = label ?? val;
    sel.appendChild(o);
  };

  const fmt = (v, showSign) => {
    let txt = Math.abs(v) < 1e-9 ? '0.00' : v.toFixed(2);
    if (showSign && v > 0) txt = '+' + txt;
    return txt;
  };

  const fillCentered = (sel, maxAbs, step, showSign = false) => {
    if (!sel || sel.tagName !== 'SELECT') return;
    sel.innerHTML = '';
    for (let v = maxAbs; v >= step - 1e-9; v -= step) {
      const val = +v.toFixed(2);
      addOpt(sel, fmt(val, showSign), fmt(val, showSign));
    }
    addOpt(sel, '0.00', '0.00');
    for (let v = -step; v >= -maxAbs - 1e-9; v -= step) {
      const val = +v.toFixed(2);
      addOpt(sel, fmt(val, showSign), fmt(val, showSign));
    }
    sel.value = '0.00';
  };

  // ESF: ±30 (0.25) con signo
  fillCentered(document.getElementById('od_esf'), 30, 0.25, true);
  fillCentered(document.getElementById('oi_esf'), 30, 0.25, true);

  // CIL: ±8 (0.25) con signo
  fillCentered(document.getElementById('od_cil'), 8, 0.25, true);
  fillCentered(document.getElementById('oi_cil'), 8, 0.25, true);

  // validar EJE cuando cambia CIL
  [['od_cil','od_eje'], ['oi_cil','oi_eje']].forEach(([cilId, ejeId]) => {
    const cil = document.getElementById(cilId);
    const eje = document.getElementById(ejeId);
    if (cil && eje) cil.addEventListener('change', () => checkEjeRequerido(cil, eje));
  });
}

// --- inputs tipo "grad"
function setupGraduacionesInputs(){
  document.querySelectorAll('input.grad').forEach(el=>{
    const isAdd = el.classList.contains('grad-add');
    if (!el.dataset.step) {
      if (isAdd) { el.dataset.min = '0'; el.dataset.max = '4'; el.dataset.step = '0.25'; }
      else       { el.dataset.min = '-30'; el.dataset.max = '20'; el.dataset.step = '0.25'; }
    }
    el.addEventListener('input', ()=> sanitizeGradual(el, !isAdd));
    el.addEventListener('blur',  ()=> validateGradual(el));
    el.addEventListener('keydown', (e)=>{
      if (e.key === ',') e.preventDefault();
      if (isAdd && (e.key === '+' || e.key === '-')) e.preventDefault();
    });
  });
  ['od_eje','oi_eje'].forEach(id=>{
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', ()=>{
      sanitizeEje(el);
      checkEjeRequerido(id==='od_eje' ? $('od_cil') : 'oi_cil', el);
    });
    el.addEventListener('blur',  ()=> validateEje(el));
  });
  ['od_cil','oi_cil'].forEach(id=>{
    const cil = $(id);
    const eje = $(id==='od_cil' ? 'od_eje' : 'oi_eje');
    if (!cil || !eje) return;
    const h = ()=> checkEjeRequerido(cil, eje);
    cil.addEventListener('input', h);
    cil.addEventListener('blur',  h);
  });
}

// =========================================================================
// Reset graduaciones
// =========================================================================
function resetGraduaciones() {
  ['od_esf','oi_esf','od_cil','oi_cil'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const candidatos = ['0.00', '+0.00', '0'];
    let seteado = false;
    for (const v of candidatos) {
      if ([...sel.options].some(o => o.value === v)) {
        sel.value = v;
        seteado = true;
        break;
      }
    }
    if (!seteado) {
      const idx0 = [...sel.options].findIndex(o => /(^\+?0(\.0+)?$)/.test(o.value));
      sel.selectedIndex = idx0 >= 0 ? idx0 : 0;
    }
  });
  ['od_eje','oi_eje'].forEach(id => { const inp = document.getElementById(id); if (inp) inp.value = ''; });
}

// =========================================================================
// Dinero / Totales
// =========================================================================
// =========================================================================
// Dinero / Totales
// =========================================================================
function setupCalculos(){
  const pc  = $('precio_cristal');
  const pa  = $('precio_armazon');
  const po  = $('precio_otro');
  const os  = $('importe_obra_social'); // cobertura OS
  const se  = $('sena');
  const tot = $('total');
  const sal = $('saldo');

  function updateTotals(){
    const bruto    = parseMoney(pc?.value) + parseMoney(pa?.value) + parseMoney(po?.value);
    const senia    = parseMoney(se?.value);
    const descObra = parseMoney(os?.value);

    // TOTAL = BRUTO (sin descontar obra social)
    if (tot) tot.value = String(Math.max(0, bruto));

    // SALDO = BRUTO - SEÑA - OBRA SOCIAL
    const saldo = Math.max(0, bruto - senia - descObra);
    if (sal) sal.value = String(saldo);
  }

  window.__updateTotals = updateTotals;

  [pc, pa, po, os, se].forEach(el=>{
    if(!el) return;
    el.addEventListener('input', ()=>{ sanitizePrice(el); updateTotals(); });
    el.addEventListener('change', updateTotals);
  });

  updateTotals();
}


// =========================================================================
/** Historial */
// =========================================================================
function renderHistorial(items = []) {
  const host = $('historial');
  if (!host) return;
  if (!Array.isArray(items) || items.length === 0) {
    host.innerHTML = '<em class="muted">Sin resultados</em>';
    return;
  }
  host.innerHTML = items.map(it => {
    const n  = (it.numero || it.num || it.nro || it.n_trabajo || '').toString().trim();
    const nm = (it.nombre || it.cliente || '').toString().trim();
    const cr = (it.cristal || '').toString().trim();
    const ar = (it.armazon || it.detalle || '').toString().trim();
    return `<div>🧾 <strong>${n || '—'}</strong> — ${nm || 'SIN NOMBRE'} — <span>${cr || '—'}</span> — <span>${ar || '—'}</span></div>`;
  }).join('');
}
async function tryHist(paramsList){
  for (const p of paramsList){
    try {
      const url = withParams(API_URL, p);
      const data = await apiGet(url);
      if (Array.isArray(data)) return data;
    } catch {}
  }
  return [];
}
async function cargarUltimosTrabajos(limit = 15) {
  const data = await tryHist([
    { histUltimos: limit },
    { hist: 1, limit }
  ]);
  if (data.length) renderHistorial(data);
}
function initHistorialUI() {
  const q   = $('hist-q');
  const lim = $('hist-limit');
  const btn = $('hist-buscar');

  if (lim) lim.value = '15';
  cargarUltimosTrabajos(15);

  if (btn) {
    btn.addEventListener('click', async () => {
      const limit = parseInt(lim?.value || '100', 10) || 100;
      const query = (q?.value || '').trim();
      const data = await tryHist([
        { histBuscar: query, limit },
        { hist: 1, limit, q: query }
      ]);
      renderHistorial(data);
    });
  }

  if (q) {
    q.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); btn?.click(); }
    });
  }
}

// =========================================================================
// Impresión / Limpieza
// =========================================================================
// === Reemplazo de buildPrintArea en main.js ===
let __PRINT_LOCK = false;
function buildPrintArea(){
  if (__PRINT_LOCK) return;
  __PRINT_LOCK = true;
  try {
    if (typeof window.__buildPrintArea === 'function') {
      window.__buildPrintArea();   // esto ya dispara window.print() desde renderAndPrint()
    } else {
      console.warn('No existe window.__buildPrintArea');
    }
  } finally {
    setTimeout(() => { __PRINT_LOCK = false; }, 1200);
  }
}


// =========================================================================
// SOLO SE GUARDA CON CLICK: bloquear submit con Enter
// =========================================================================
function bloquearSubmitConEnter(form){
  if (!form) return;
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const t = e.target;
    const tag = (t?.tagName || '').toUpperCase();
    const type = (t?.type || '').toLowerCase();
    const esTextArea = tag === 'TEXTAREA';
    const enterPermitido = t?.dataset?.enterOk === '1';
    const esSubmitButton = (tag === 'BUTTON' && type === 'submit');
    if (!esTextArea && !enterPermitido && !esSubmitButton) {
      e.preventDefault();
    }
  });
}

// =========================================================================
/** INIT */
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Cámara + Galería
  initPhotoPack();

  // Fecha hoy y cálculo de retiro
  cargarFechaHoy();

  // Listeners para recalcular retiro (SELECT fijo + fecha)
  const entregaSel = $('entrega-select');
  if (entregaSel) entregaSel.addEventListener('change', recalcularFechaRetiro);
  const fechaEnc = $('fecha');
  if (fechaEnc) {
    fechaEnc.addEventListener('change', recalcularFechaRetiro);
    fechaEnc.addEventListener('blur',   recalcularFechaRetiro);
  }
  // primer cálculo
  recalcularFechaRetiro();

  // Graduaciones
  setupGraduacionesSelects();
  setupGraduacionesInputs();

  // Totales
  setupCalculos();

  // Historial
  initHistorialUI();

  // Teléfono → Nº de trabajo
  const tel = $('telefono');
  if(tel){
    tel.addEventListener('blur', generarNumeroTrabajoDesdeTelefono);
    tel.addEventListener('change', generarNumeroTrabajoDesdeTelefono);
    tel.addEventListener('input', ()=>{ tel.value = tel.value.replace(/[^0-9 +()-]/g,''); });
  }

  // DNI → buscar nombre/teléfono
  const dni=$('dni'), nombre=$('nombre'), telefono=$('telefono'), indi=$('dni-loading');
  if(dni){
    const doDNI = () => buscarNombrePorDNI(dni, nombre, telefono, indi);
    dni.addEventListener('blur', doDNI);
    dni.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); doDNI(); } });
    dni.addEventListener('input', ()=>{ dni.value = dni.value.replace(/\D/g,''); });
  }

  // Nº armazón → buscar detalle/precio (admite alfanumérico con guión)
  const nAr=$('numero_armazon'), detAr=$('armazon_detalle'), prAr=$('precio_armazon');
  if(nAr){
    const doAr = async () => {
      await buscarArmazonPorNumero(nAr, detAr, prAr);
      if (prAr) { prAr.dispatchEvent(new Event('input', { bubbles:true })); }
      if (typeof window.__updateTotals === 'function') window.__updateTotals();
    };
    nAr.addEventListener('blur', doAr);
    nAr.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); doAr(); } });
    nAr.addEventListener('input', ()=>{
      nAr.value = nAr.value
        .toUpperCase()
        .replace(/\s+/g, '')
        .replace(/[^A-Z0-9\-]/g, '');
    });
  }

  // DNP 12/34
  const dnp=$('dnp');
  if(dnp){
    const fmt=(v)=> v.replace(/\D/g,'').slice(0,4).replace(/^(\d{0,2})(\d{0,2}).*$/,(_,a,b)=> b?`${a}/${b}`:a);
    dnp.addEventListener('input', ()=> dnp.value = fmt(dnp.value));
  }

  // Botones
  const btnImp=$('btn-imprimir'); if(btnImp) btnImp.addEventListener('click', buildPrintArea);
  const btnClr=$('btn-limpiar'); if(btnClr) btnClr.addEventListener('click', limpiarFormulario);

  // Guardar
  const form=$('formulario');

  // Bloquear submit con Enter — solo click guarda
  bloquearSubmitConEnter(form);

  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if(!validarEjesRequeridos()) return;

      const progress = progressAPI(PROGRESS_STEPS);
      progress.autoAdvance(6000);

      try{
        await guardarTrabajo({ progress });
        progress.doneAndHide(800);
      } catch (err){
        console.error(err);
        progress.fail(err?.message || 'Error al guardar');
      }
    });
  }
});

export { generarNumeroTrabajoDesdeTelefono, recalcularFechaRetiro };

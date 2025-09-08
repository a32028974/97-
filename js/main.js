// /RECETAS/js/main.js — v2025-09-08
// UI general + cámara + búsquedas (DNI/Armazón) + flujo de foco + guardar + vendedor persistente

// ===== Imports (ajustados a tu proyecto) =====
import { sanitizePrice, parseMoney } from './utils.js';
import { obtenerNumeroTrabajoDesdeTelefono } from './numeroTrabajo.js';
import { cargarFechaHoy } from './fechaHoy.js';
import { buscarNombrePorDNI } from './buscarNombre.js';
import { buscarArmazonPorNumero } from './buscarArmazon.js';
import { guardarTrabajo } from './guardar.js';
import { initPhotoPack } from './fotoPack.js'; // Ojo: P mayúscula
import { API_URL, withParams, apiGet } from './api.js';

// ===== Helpers DOM / Utilidades =====
const $  = (id)  => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const isSelect = (el) => el && el.tagName === 'SELECT';

function debounce(fn, ms = 300) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function safeFocus(id) {
  const el = $(id);
  if (el && typeof el.focus === 'function') el.focus();
}

function moveCaretToEnd(el) {
  try {
    const v = el.value;
    el.value = '';
    el.value = v;
  } catch (_) {}
}

// ===== Recordar último Vendedor (localStorage) =====
function setupVendedorPersistente() {
  const vendedorInput = $("vendedor");
  if (!vendedorInput) return;

  const guardado = localStorage.getItem("ultimoVendedor");
  if (guardado) vendedorInput.value = guardado;

  vendedorInput.addEventListener("change", () => {
    localStorage.setItem("ultimoVendedor", (vendedorInput.value || '').toString().trim());
  });
}

// ===== Búsqueda por DNI (debounce + blur + Enter) =====
function setupBusquedaDNI() {
  const dniInput = $("dni");
  const apellidoNombre = $("apellidoNombre");

  if (!dniInput) return;

  const doBuscar = async () => {
    const raw = (dniInput.value || "").toString().trim();
    if (!raw) return;
    try {
      const maybe = buscarNombrePorDNI(raw);
      if (maybe && typeof maybe.then === 'function') await maybe;
    } catch (err) {
      console.warn("[DNI] Error en buscarNombrePorDNI:", err);
    }
    if (apellidoNombre) {
      safeFocus("apellidoNombre");
      moveCaretToEnd(apellidoNombre);
    }
  };

  // En vivo con debounce
  dniInput.addEventListener("input", debounce(doBuscar, 350));
  // Al salir del campo
  dniInput.addEventListener("blur", doBuscar);
  // Enter
  dniInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await doBuscar();
    }
  });
}

// ===== Flujo de foco: Apellido/Nombre → Celular (Enter) =====
function setupFlujoApellidoCelular() {
  const apellidoNombre = $("apellidoNombre");
  const celular = $("celular");
  if (!apellidoNombre || !celular) return;

  apellidoNombre.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      safeFocus("celular");
      moveCaretToEnd(celular);
    }
  });
}

// ===== Celular: generar número de trabajo si corresponde =====
function setupCelularGeneraTrabajo() {
  const celular = $("celular");
  if (!celular) return;

  celular.addEventListener("change", () => {
    try {
      obtenerNumeroTrabajoDesdeTelefono?.((celular.value || "").toString().trim());
    } catch (err) {
      console.warn("[Celular] Error en obtenerNumeroTrabajoDesdeTelefono:", err);
    }
  });
}

// ===== Buscar Armazón (change + Enter) =====
function setupBusquedaArmazon() {
  const armazonInput = $("nArmazon");
  if (!armazonInput) return;

  const run = () => {
    const n = (armazonInput.value || "").toString().trim();
    if (!n) return;
    try {
      buscarArmazonPorNumero(n);
    } catch (err) {
      console.warn("[Armazón] Error en buscarArmazonPorNumero:", err);
    }
  };

  armazonInput.addEventListener("change", run);
  armazonInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      run();
    }
  });
}

// ===== Guardar Trabajo (click) =====
function setupGuardar() {
  const btnGuardar = $("btn-guardar");
  if (!btnGuardar) return;
  btnGuardar.addEventListener("click", (e) => {
    e.preventDefault();
    try {
      guardarTrabajo();
    } catch (err) {
      console.error("[Guardar] Error en guardarTrabajo:", err);
    }
  });
}

// ===== Tabulación: Número de trabajo al final =====
function setupNumeroTrabajoUltimo() {
  const numeroTrabajo = $("numeroTrabajo");
  if (!numeroTrabajo) return;
  // Forzamos un tabindex alto para que quede último
  numeroTrabajo.setAttribute("tabindex", "999");

  // Defensa: si hay otros elementos con tabindex > 900, los bajamos a 800
  const others = $$("input, select, textarea, button").filter(el => el !== numeroTrabajo);
  for (const el of others) {
    if (!el.hasAttribute("tabindex")) continue;
    const t = parseInt(el.getAttribute("tabindex"), 10);
    if (!Number.isNaN(t) && t > 900) el.setAttribute("tabindex", "800");
  }
}

// ===== Autofocus inicial =====
function setupAutofocus() {
  // Arrancamos en DNI
  safeFocus("dni");
}

// ===== Inicialización principal =====
document.addEventListener("DOMContentLoaded", () => {
  try { cargarFechaHoy(); } catch (e) { console.warn("cargarFechaHoy()", e); }
  try { initPhotoPack(); } catch (e) { console.warn("initPhotoPack()", e); }

  setupVendedorPersistente();
  setupBusquedaDNI();
  setupFlujoApellidoCelular();
  setupCelularGeneraTrabajo();
  setupBusquedaArmazon();
  setupGuardar();
  setupNumeroTrabajoUltimo();
  setupAutofocus();
});
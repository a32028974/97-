// /RECETAS/js/main.js — v2025-09-06
// UI general + progreso + cámara + búsquedas + totales + graduaciones + historial + Orden Virtual

// ===== Imports =====
import { sanitizePrice, parseMoney } from './utils.js';
import { obtenerNumeroTrabajoDesdeTelefono } from './numeroTrabajo.js';
import { cargarFechaHoy } from './fechaHoy.js';
import { buscarNombrePorDNI } from './buscarNombre.js';
import { buscarArmazonPorNumero } from './buscarArmazon.js';
import { guardarTrabajo } from './guardar.js';
import { initPhotoPack } from './fotoPack.js';
import { API_URL, withParams, apiGet } from './api.js';

// =====================================================================
// === RECORDAR ÚLTIMO VENDEDOR (localStorage) ===
// =====================================================================
document.addEventListener("DOMContentLoaded", function () {
  const vendedorInput = document.getElementById("vendedor");
  
  if (vendedorInput) {
    // Si hay un vendedor guardado, lo rellenamos automáticamente
    const vendedorGuardado = localStorage.getItem("ultimoVendedor");
    if (vendedorGuardado) {
      vendedorInput.value = vendedorGuardado;
    }

    // Guardamos el último vendedor cada vez que cambia el valor
    vendedorInput.addEventListener("change", function () {
      localStorage.setItem("ultimoVendedor", vendedorInput.value);
    });
  }
});

// =====================================================================
// === Helpers DOM ===
// =====================================================================
const $  = (id)  => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const isSelect = (el) => el && el.tagName === 'SELECT';
const enc = (v) => encodeURIComponent((v ?? '').toString());

// =====================================================================
// === Historial → Cargar datos en formulario ===
// =====================================================================
const pick = (sel, v) => {
  const el = $(sel);
  if (!el) return;
  if (isSelect(el)) {
    const opt = Array.from(el.options).find(o => o.value === v);
    if (opt) el.value = v;
  } else {
    el.value = v ?? '';
  }
};

// =====================================================================
// === Inicialización de componentes principales ===
// =====================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Inicializamos fecha de hoy
  cargarFechaHoy();

  // Inicializamos cámara / fotos
  initPhotoPack();

  // Buscar nombre automáticamente al poner DNI
  const dniInput = $("dni");
  if (dniInput) {
    dniInput.addEventListener("change", () => {
      buscarNombrePorDNI(dniInput.value.trim());
    });
  }

  // Buscar armazón automáticamente
  const armazonInput = $("nArmazon");
  if (armazonInput) {
    armazonInput.addEventListener("change", () => {
      buscarArmazonPorNumero(armazonInput.value.trim());
    });
  }

  // Manejo del guardado de trabajos
  const btnGuardar = $("btn-guardar");
  if (btnGuardar) {
    btnGuardar.addEventListener("click", (e) => {
      e.preventDefault();
      guardarTrabajo();
    });
  }
});

// /RECETAS/js/guardar.js — v2025-09-05 (save + pdf/drive/telegram + return pdfUrl)
import { API_URL, PACK_URL, withParams, apiGet } from "./api.js";

/* ===== Helpers DOM/valores ===== */
const $ = (id) => document.getElementById(id);
const V = (id) => (document.getElementById(id)?.value ?? "").toString().trim();
const U = (v) => (v ?? "").toString().trim().toUpperCase();

/* ===== Networking helpers ===== */
async function postForm(url, bodyParams, { timeoutMs = 45000 } = {}) {
  const body = bodyParams instanceof URLSearchParams
    ? bodyParams
    : new URLSearchParams(bodyParams || {});
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort("timeout"), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
      signal: ctrl.signal
    });
    const txt = await res.text();
    let data = null; try { data = JSON.parse(txt); } catch {}
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}: ${txt.slice(0,200)}`);
    return data ?? txt;
  } catch (e) {
    const msg = (e?.name === "AbortError" || e?.message === "timeout")
      ? "Tiempo de espera agotado (no respondió el servidor)"
      : /Failed to fetch|TypeError|NetworkError/i.test(String(e?.message || e))
        ? "No se pudo conectar al servidor (revisá la URL / permisos del Web App de Apps Script)"
        : e?.message || "Error de red";
    throw new Error(msg);
  } finally {
    clearTimeout(to);
  }
}

/* ===== Otros helpers ===== */
function setNumeroTrabajo(n) {
  const vis = $("numero_trabajo");
  if (vis) vis.value = (n ?? "").toString().trim();
  const hid = $("numero_trabajo_hidden");
  if (hid) hid.value = (n ?? "").toString().trim();
}
function syncNumeroTrabajoHidden() {
  const vis = $("numero_trabajo");
  const hid = $("numero_trabajo_hidden");
  if (vis && hid) hid.value = vis.value.trim();
}

function entregaTxt() {
  const sel = document.getElementById("entrega-select");
  const v = sel?.value || "7";
  if (v === "3") return "URGENTE";
  if (v === "15") return "LABORATORIO";
  return "STOCK";
}
function entregaLabel() {
  const sel = document.getElementById("entrega-select");
  return sel?.options?.[sel.selectedIndex]?.text || entregaTxt();
}

function fotosBase64() {
  const a = Array.isArray(window.__FOTOS) ? window.__FOTOS : [];
  return a.map((d) => (d.split(",")[1] || "").trim()).filter(Boolean);
}

function resumenPack() {
  const money = (v) => (v ? `$ ${v}` : "");
  return {
    "Fecha": V("fecha"),
    "Retira (estimada)": V("fecha_retira"),
    "N° trabajo": V("numero_trabajo"),
    "DNI": V("dni"),
    "Cliente": V("nombre"),
    "Teléfono": V("telefono"),
    "DR (oculista)": V("dr"),
    "Cristal": `${V("cristal")} ${money(V("precio_cristal"))}`,
    "Obra social": `${V("obra_social")} ${money(V("importe_obra_social"))}`,
    "Armazón": `${V("numero_armazon")} ${V("armazon_detalle")} ${money(V("precio_armazon"))}`,
    "Otro": `${V("otro_concepto")} ${money(V("precio_otro"))}`,
    "Distancia focal": V("distancia_focal"),
    "OD": `ESF ${V("od_esf")}  |  CIL ${V("od_cil")}  |  EJE ${V("od_eje")}`,
    "OI": `ESF ${V("oi_esf")}  |  CIL ${V("oi_cil")}  |  EJE ${V("oi_eje")}`,
    "DNP (OD/OI)": V("dnp"),
    "ADD": V("add"),
    "TOTAL": money(V("total")),
    "SEÑA": money(V("sena")),
    "SALDO": money(V("saldo")),
    "Vendedor": V("vendedor"),
    "Forma de pago": V("forma_pago"),
    "Entrega": entregaLabel()
  };
}

/* ===== Flujo principal ===== */
export async function guardarTrabajo({ progress } = {}) {
  const spinner = $("spinner");
  const mark = (label, status = "done") => { try { progress?.mark?.(label, status); } catch {} };

  try {
    if (spinner) spinner.style.display = "block";

    // Sincronizar hidden (si existe)
    syncNumeroTrabajoHidden();

    // Validaciones mínimas
    mark("Validando datos", "run");
    const nroBase = V("numero_trabajo");
    if (!nroBase) throw new Error("Ingresá el número de trabajo");
    if (!V("dni")) throw new Error("Ingresá el DNI");
    if (!V("nombre")) throw new Error("Ingresá el nombre");
    mark("Validando datos", "done");

    // 1) Guardar en planilla (POST)
    mark("Guardando en planilla", "run");
    const formEl = $("formulario");
    if (!formEl) throw new Error("Formulario no encontrado");

    // Armado del body + ALIAS (armazón número vs detalle)
    const fd = new FormData(formEl);
    const body = new URLSearchParams(fd);

    const numAr = (fd.get("numero_armazon") || "").toString().trim();
    const detAr = (fd.get("armazon_detalle") || "").toString().trim();

    // Número de armazón — varios alias por compatibilidad con GAS
    body.set("numero_armazon", numAr);
    body.set("n_armazon", numAr);
    body.set("num_armazon", numAr);
    body.set("nro_armazon", numAr);
    body.set("armazon_numero", numAr);
    body.set("NUMERO ARMAZON", numAr); // algunos usan encabezados en mayúsculas

    // Detalle de armazón — muchos backends lo esperan como 'armazon'
    body.set("armazon", detAr);
    body.set("armazon_detalle", detAr);
    body.set("detalle_armazon", detAr);
    body.set("ARMAZON", detAr);

    // Por si el GAS usa otra clave para número de trabajo
    body.set("numero", fd.get("numero_trabajo") || "");

    const postJson = await postForm(API_URL, body);
    mark("Guardando en planilla", "done");

    // Número final (si el backend devolvió uno con sufijo)
    const numeroFinal = (postJson && postJson.numero_trabajo)
      ? String(postJson.numero_trabajo).trim()
      : nroBase;
    setNumeroTrabajo(numeroFinal);

    // 2) PACK (PDF + Drive + Telegram)
    mark("Generando PDF", "run");
    const payload = {
      numero_trabajo: numeroFinal,
      dni: V("dni"),
      nombre: U(V("nombre")),
      resumen: resumenPack(),
      imagenesBase64: fotosBase64()
    };

    const j = await postForm(
      PACK_URL,
      new URLSearchParams({ genPack: "1", payload: JSON.stringify(payload) }),
      { timeoutMs: 90000 } // darle tiempo si sube a Drive y manda Telegram
    );

    // Derivar campos comunes del pack
    const pdfUrl = j?.url || j?.pdf || j?.driveUrl || j?.publicUrl || "";
    const driveId = j?.driveId || j?.drive_id || "";
    const telegramMsgId = j?.telegramMsgId || j?.telegram_msg_id || "";

    mark("Generando PDF", "done");
    // Si considerás "Subiendo fotos" parte del pack, marcamos done
    mark("Subiendo fotos", "done");
    // Si el pack ya envía por Telegram, marcamos done
    mark("Enviando por Telegram", j?.ok ? "done" : "todo");

    // Guardar link del PDF (GET con query)
    if (pdfUrl) {
      mark("Guardando link del PDF", "run");
      try {
        const setUrl = withParams(API_URL, { setPdf: 1, numero: numeroFinal, url: pdfUrl });
        await apiGet(setUrl);
      } catch (e) {
        console.warn("No se pudo actualizar la columna PDF:", e?.message || e);
      }
      mark("Guardando link del PDF", "done");
    }

    // Dejarlo global por conveniencia
    window.__LAST_PDF_URL = pdfUrl || window.__LAST_PDF_URL || "";

    // Avisar al caller y que él decida imprimir / abrir / cerrar
    mark("Listo", "done");
    return { ok: true, numero_trabajo: numeroFinal, pdfUrl, driveId, telegramMsgId };

  } catch (err) {
    try { progress?.fail?.(err?.message || "Error al guardar"); } catch {}
    if (window.Swal) Swal.fire("Error", err?.message || "Error inesperado", "error");
    throw err;
  } finally {
    if (spinner) spinner.style.display = "none";
  }
}

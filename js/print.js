// /js/print.js — v2025-09-06v (A4 vertical + talón fijo 145/5/55mm, 130mm de alto, QR optimizado)
(function () {
  // ===== Tamaños (A4) =====
  const PAGE_W_MM = 210;      // ancho hoja
  const PAGE_H_MM = 297;      // alto hoja
  const LEFT_W_MM = 145;      // ficha principal
  const GUTTER_MM = 5;        // separación/guía de corte
  const RIGHT_W_MM = 55;      // talón
  const MAX_COL_H_MM = 130;   // altura máxima de cada bloque
  const BAR_W_MM = 55;        // ancho código de barras
  const BAR_H_MM = 8;         // alto código de barras

  // ===== Detección simple de móvil =====
  const UA = navigator.userAgent || '';
  const IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(UA);

  // Nudge suave sólo en móviles (para “subir” un poco sin cortar)
  const NUDGE_TOP_MM  = IS_MOBILE ? -6 : 0;
  const NUDGE_LEFT_MM = IS_MOBILE ?  0 : 0;

  // Colchón virtual por si hay nudge negativo
  const EXTRA_W_MM = Math.max(0, -NUDGE_LEFT_MM);
  const EXTRA_H_MM = Math.max(0, -NUDGE_TOP_MM);

  // ===== Helpers =====
  const $ = (id) => document.getElementById(id);

  const getSelText = (el) => {
    if (!el) return '';
    if (el.tagName === 'SELECT') {
      const o = el.options[el.selectedIndex];
      return (o?.textContent || o?.value || '').trim();
    }
    return (el.value || '').trim();
  };

  function normNumberLike(v) {
    if (v == null) return 0;
    const s = String(v).replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }
  function money(v) {
    const n = Math.max(0, normNumberLike(v));
    return '$ ' + n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
  }

  function parseDateLike(v) {
    if (!v) return null;
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const dd = +m[1], mm = +m[2], yyyy = m[3].length === 2 ? +('20' + m[3]) : +m[3];
      const d = new Date(yyyy, mm - 1, dd);
      return isNaN(d) ? null : d;
    }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    const d2 = new Date(s);
    return isNaN(d2) ? null : d2;
  }
  function ddmmyyyy(d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  // ===== Recolección de datos del form =====
  function collectForm() {
    const data = {
      numero: getSelText($('numero_trabajo')),
      fecha:  getSelText($('fecha')),
      entrega: getSelText($('entrega-select')),
      retira: (()=>{
        const d = parseDateLike(getSelText($('fecha_retira')));
        return d ? ddmmyyyy(d) : getSelText($('fecha_retira'));
      })(),
      dni: getSelText($('dni')),
      nombre: getSelText($('nombre')),
      tel: getSelText($('telefono')),

      cristal: getSelText($('cristal')),
      precio_cristal: money(getSelText($('precio_cristal'))),
      obra_social: getSelText($('obra_social')),
      desc_obra: money(getSelText($('importe_obra_social'))),

      od_esf: getSelText($('od_esf')),
      od_cil: getSelText($('od_cil')),
      od_eje: getSelText($('od_eje')),
      oi_esf: getSelText($('oi_esf')),
      oi_cil: getSelText($('oi_cil')),
      oi_eje: getSelText($('oi_eje')),
      dr: getSelText($('dr')),
      dnp: getSelText($('dnp')),
      add: getSelText($('add')),
      distancia: getSelText($('distancia_focal')),

      n_armazon: getSelText($('numero_armazon')),
      det_armazon: getSelText($('armazon_detalle')),
      precio_armazon: money(getSelText($('precio_armazon'))),

      otro_concepto: getSelText($('otro_concepto')),
      precio_otro: money(getSelText($('precio_otro'))),

      total: money(getSelText($('total'))),
      sena: money(getSelText($('sena'))),
      saldo: money(getSelText($('saldo'))),

      vendedor: getSelText($('vendedor')),
      forma_pago: getSelText($('forma_pago'))
    };
    return data;
  }

  // ===== Render principal (boleta + talón) =====
  function renderTicket(d) {
    const safe = (x) => (x || '').replace(/[<>]/g, s => ({'<':'&lt;','>':'&gt;'}[s]));
    const IMG_LOGO = 'logo.png';
    const BRAND = '#110747';

    return `
<div class="sheet" style="transform:translate(${NUDGE_LEFT_MM}mm, ${NUDGE_TOP_MM}mm)">
  <div class="canvas" style="display:grid;grid-template-columns:${LEFT_W_MM}mm ${GUTTER_MM}mm ${RIGHT_W_MM}mm;">
    <div class="left">
      <div class="hdr">
        <div class="brand">
          <div class="dot"></div>
          <div>
            <div class="title">Óptica Cristal</div>
            <div class="sub">San Miguel • Argentina</div>
          </div>
        </div>
        <div class="barwrap">
          <svg id="barcode"></svg>
        </div>
        <div class="nro">
          <div class="lbl">Nº trabajo</div>
          <div class="val mono">${safe(d.numero)}</div>
        </div>
      </div>

      <div class="grid2">
        <div class="kv"><div class="k">Fecha</div><div class="v">${safe(d.fecha)}</div></div>
        <div class="kv"><div class="k">Entrega</div><div class="v">${safe(d.entrega)}</div></div>
        <div class="kv"><div class="k">Retira</div><div class="v">${safe(d.retira)}</div></div>
        <div class="kv"><div class="k">DNI</div><div class="v">${safe(d.dni)}</div></div>
        <div class="kv" style="grid-column:1/-1"><div class="k">Cliente</div><div class="v">${safe(d.nombre)}</div></div>
        <div class="kv" style="grid-column:1/-1"><div class="k">Teléfono</div><div class="v">${safe(d.tel)}</div></div>
      </div>

      <div class="grades">
        <div class="box">
          <div class="box-t">Graduación</div>
          <table class="tbl">
            <thead><tr><th></th><th>ESF</th><th>CIL</th><th>EJE</th></tr></thead>
            <tbody>
              <tr><td>OD</td><td>${safe(d.od_esf)}</td><td>${safe(d.od_cil)}</td><td>${safe(d.od_eje)}</td></tr>
              <tr><td>OI</td><td>${safe(d.oi_esf)}</td><td>${safe(d.oi_cil)}</td><td>${safe(d.oi_eje)}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="box">
          <div class="box-t">Datos ópticos</div>
          <div class="kv"><div class="k">Distancia</div><div class="v">${safe(d.distancia)}</div></div>
          <div class="kv"><div class="k">DNP</div><div class="v">${safe(d.dnp)}</div></div>
          <div class="kv"><div class="k">ADD</div><div class="v">${safe(d.add)}</div></div>
          <div class="kv"><div class="k">Dr.</div><div class="v">${safe(d.dr)}</div></div>
        </div>
      </div>

      <div class="box">
        <div class="box-t">Productos</div>
        <div class="kv"><div class="k">Cristal</div><div class="v">${safe(d.cristal)} — <strong>${d.precio_cristal}</strong></div></div>
        <div class="kv"><div class="k">Obra soc.</div><div class="v">${safe(d.obra_social)} — ${d.desc_obra}</div></div>
        <div class="kv"><div class="k">Armazón</div><div class="v">#${safe(d.n_armazon)} • ${safe(d.det_armazon)} — <strong>${d.precio_armazon}</strong></div></div>
        <div class="kv"><div class="k">Otro</div><div class="v">${safe(d.otro_concepto)} — ${d.precio_otro}</div></div>
      </div>

      <div class="totals">
        <div class="kv"><div class="k">Vendedor</div><div class="v vendedor">${safe(d.vendedor)}</div></div>
        <div class="kv"><div class="k">Forma pago</div><div class="v">${safe(d.forma_pago)}</div></div>
        <div class="total-line"><div>Total</div><div class="big">${d.total}</div></div>
        <div class="kv"><div class="k">Seña</div><div class="v">${d.sena}</div></div>
        <div class="kv"><div class="k">Saldo</div><div class="v">${d.saldo}</div></div>
      </div>
    </div>

    <div class="cut"></div>

    <div class="right">
      <div class="r-head">
        <img class="r-logo" src="${IMG_LOGO}" alt="">
        <div>
          <div class="r-title">Óptica Cristal</div>
          <div class="r-sub">Comprobante de retiro</div>
        </div>
      </div>
      <div class="r-kv"><div class="rk">Nº</div><div class="rv mono">${safe(d.numero)}</div></div>
      <div class="r-kv"><div class="rk">Cliente</div><div class="rv">${safe(d.nombre)}</div></div>
      <div class="r-kv"><div class="rk">Retira</div><div class="rv">${safe(d.retira)}</div></div>
      <div class="r-kv"><div class="rk">Saldo</div><div class="rv">${d.saldo}</div></div>

      <div class="r-qr">
        <!-- si querés QR base64 ponelo acá -->
        <!-- <img src="data:image/png;base64,..." alt="QR" /> -->
      </div>
    </div>
  </div>
</div>`;
  }

  // ===== IFRAME (desktop) =====
  function printInIframe(htmlInner, numero) {
    const BRAND = '#110747';
    const css = `
    <style>
      @page { size: ${PAGE_W_MM + EXTRA_W_MM}mm ${PAGE_H_MM + EXTRA_H_MM}mm; margin: 0; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin:0; padding:0; background:#fff; color:#111; font: 9.5pt/1.3 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }

      .sheet {
        width: ${PAGE_W_MM + EXTRA_W_MM}mm;
        height:${PAGE_H_MM + EXTRA_H_MM}mm;
        position: fixed; inset: 0 0 auto 0;
        overflow: hidden;
      }
      .canvas {
        width:${PAGE_W_MM}mm; height:${PAGE_H_MM}mm;
        padding: 6mm 5mm 0; /* pequeño resguardo visual */
      }

      /* Grid fija en mm: 145 | 5 | 55 */
      .canvas {
        display: grid;
        grid-template-columns: ${LEFT_W_MM}mm ${GUTTER_MM}mm ${RIGHT_W_MM}mm;
        align-items: start;
        column-gap: 0;
      }

      .left, .right { max-height:${MAX_COL_H_MM}mm; overflow:hidden; }
      .left  { padding-right: 2mm; }
      .right { padding-left: 2mm; }

      .cut { width:${GUTTER_MM}mm; height:${MAX_COL_H_MM}mm; border-left: 1px dashed #cfd6e4; }

      /* Cabecera ficha */
      .hdr { display:grid; grid-template-columns: 1fr ${BAR_W_MM}mm 1fr; align-items: start; column-gap: 3mm; margin-bottom: 2mm; }
      .brand { display:flex; align-items:flex-start; gap:2mm; }
      .dot { width:3mm; height:3mm; background:${BRAND}; border-radius:50%; margin-top: 1mm; }
      .title { font-weight:800; color:${BRAND}; }
      .sub { color:#6b7280; font-size: 8.5pt; margin-top:.2mm; }
      .barwrap { width:${BAR_W_MM}mm; height:${BAR_H_MM}mm; display:flex; align-items:center; justify-content:center; }
      .barwrap svg { width:${BAR_W_MM}mm; height:${BAR_H_MM}mm; }
      .nro { justify-self:end; text-align:right; }
      .nro .lbl { font-size:8pt; color:#6b7280; }
      .nro .val { font-weight:800; }

      .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 1.8mm 3mm; }
      .kv { display:grid; grid-template-columns: 22mm 1fr; column-gap: 1.8mm; align-items: baseline; }
      .kv .k { color:#505a6b; font-size: 8.5pt; }
      .kv .v { font-weight:600; }

      .grades { display:grid; grid-template-columns: 1fr 1fr; gap: 2.2mm; margin: 2mm 0; }
      .box { border:1px solid #d8dbe0; border-radius: 1mm; overflow:hidden; }
      .box-t { background:#f2f4f7; padding: .8mm 1.6mm; font-weight:700; font-size:9pt; color:${BRAND}; }
      .tbl { width:100%; border-collapse: collapse; }
      .tbl th, .tbl td { border-top:1px solid #e5e7eb; padding: .8mm 1.2mm; text-align:center; font-size:9pt; }

      .totals { display:grid; grid-template-columns: 1fr 1fr; gap: 1mm 3mm; }
      .total-line { grid-column: 1 / -1; display:flex; justify-content: space-between; align-items:center; border-top:1px dashed #cfd6e4; padding-top:1.4mm; margin-top:.6mm; }
      .total-line .big { font-weight:800; }
      .vendedor { color:#505a6b; }

      /* Talón */
      .right { border-left: 0; }
      .r-head { display:grid; grid-template-columns: 7mm 1fr; column-gap: 2mm; align-items:center; margin-bottom: 1.2mm; }
      .r-logo { width:7mm; height:7mm; object-fit:contain; }
      .r-title { font-weight:800; color:${BRAND}; line-height:1.1; }
      .r-sub { color:#6b7280; font-size:8pt; line-height:1.1; margin-top:.2mm; }

      .r-kv { display:grid; grid-template-columns: 16mm 1fr; gap: 1.2mm; align-items:baseline; margin: .6mm 0; }
      .rk { color:#505a6b; font-size:8.5pt; }
      .rv { font-weight:700; }

      .r-qr { margin-top: 2mm; display:flex; justify-content:center; }
      .r-qr img { width:34mm; height:34mm; object-fit:contain; image-rendering:auto; }

      /* Colorear totales/acentos */
      .box-t, .title, .r-title { color:${BRAND}; }
    </style>`;

    const ifr = document.createElement('iframe');
    Object.assign(ifr.style, { position:'fixed', right:'0', bottom:'0', width:'0', height:'0', border:'0', visibility:'hidden' });
    document.body.appendChild(ifr);

    const doc = ifr.contentDocument || ifr.contentWindow.document;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8">${css}</head><body>${htmlInner}</body></html>`);
    doc.close();

    const w = ifr.contentWindow;

    const render = () => {
      try {
        const svg = doc.getElementById('barcode');
        if (w.JsBarcode && svg) {
          w.JsBarcode(svg, String(numero || ''), {
            format: 'CODE128',
            displayValue: false,
            margin: 0,
            height: 40
          });
        }
      } catch (_) {}

      const cleanup = () => { setTimeout(() => { try { document.body.removeChild(ifr); } catch {} }, 100); };
      w.addEventListener?.('afterprint', cleanup);
      setTimeout(() => { try { w.focus(); w.print(); } catch {} setTimeout(cleanup, 500); }, 60);
    };

    if (w.JsBarcode) {
      render();
    } else {
      const s = doc.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
      s.onload = render;
      s.onerror = render;
      doc.head.appendChild(s);
    }
  }

  // === NUEVO: impresión en ventana emergente (fix Chrome/Android) ===
  function printInPopup(htmlInner, numero) {
    const BRAND = '#110747';
    const css = `
    <style>
      @page { size: ${PAGE_W_MM + EXTRA_W_MM}mm ${PAGE_H_MM + EXTRA_H_MM}mm; margin: 0; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin:0; padding:0; background:#fff; color:#111; font: 9.5pt/1.3 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }

      .sheet {
        width: ${PAGE_W_MM + EXTRA_W_MM}mm;
        height:${PAGE_H_MM + EXTRA_H_MM}mm;
        position: fixed; inset: 0 0 auto 0;
        overflow: hidden;
      }
      .canvas {
        width:${PAGE_W_MM}mm; height:${PAGE_H_MM}mm;
        padding: 6mm 5mm 0; /* pequeño resguardo visual */
      }

      /* Grid fija en mm: 145 | 5 | 55 */
      .canvas {
        display: grid;
        grid-template-columns: ${LEFT_W_MM}mm ${GUTTER_MM}mm ${RIGHT_W_MM}mm;
        align-items: start;
        column-gap: 0;
      }

      .left, .right { max-height:${MAX_COL_H_MM}mm; overflow:hidden; }
      .left  { padding-right: 2mm; }
      .right { padding-left: 2mm; }

      .cut { width:${GUTTER_MM}mm; height:${MAX_COL_H_MM}mm; border-left: 1px dashed #cfd6e4; }

      /* Cabecera ficha */
      .hdr { display:grid; grid-template-columns: 1fr ${BAR_W_MM}mm 1fr; align-items: start; column-gap: 3mm; margin-bottom: 2mm; }
      .brand { display:flex; align-items:flex-start; gap:2mm; }
      .dot { width:3mm; height:3mm; background:${BRAND}; border-radius:50%; margin-top: 1mm; }
      .title { font-weight:800; color:${BRAND}; }
      .sub { color:#6b7280; font-size: 8.5pt; margin-top:.2mm; }
      .barwrap { width:${BAR_W_MM}mm; height:${BAR_H_MM}mm; display:flex; align-items:center; justify-content:center; }
      .barwrap svg { width:${BAR_W_MM}mm; height:${BAR_H_MM}mm; }
      .nro { justify-self:end; text-align:right; }
      .nro .lbl { font-size:8pt; color:#6b7280; }
      .nro .val { font-weight:800; }

      .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 1.8mm 3mm; }
      .kv { display:grid; grid-template-columns: 22mm 1fr; column-gap: 1.8mm; align-items: baseline; }
      .kv .k { color:#505a6b; font-size: 8.5pt; }
      .kv .v { font-weight:600; }

      .grades { display:grid; grid-template-columns: 1fr 1fr; gap: 2.2mm; margin: 2mm 0; }
      .box { border:1px solid #d8dbe0; border-radius: 1mm; overflow:hidden; }
      .box-t { background:#f2f4f7; padding: .8mm 1.6mm; font-weight:700; font-size:9pt; color:${BRAND}; }
      .tbl { width:100%; border-collapse: collapse; }
      .tbl th, .tbl td { border-top:1px solid #e5e7eb; padding: .8mm 1.2mm; text-align:center; font-size:9pt; }

      .totals { display:grid; grid-template-columns: 1fr 1fr; gap: 1mm 3mm; }
      .total-line { grid-column: 1 / -1; display:flex; justify-content: space-between; align-items:center; border-top:1px dashed #cfd6e4; padding-top:1.4mm; margin-top:.6mm; }
      .total-line .big { font-weight:800; }
      .vendedor { color:#505a6b; }

      /* Talón */
      .right { border-left: 0; }
      .r-head { display:grid; grid-template-columns: 7mm 1fr; column-gap: 2mm; align-items:center; margin-bottom: 1.2mm; }
      .r-logo { width:7mm; height:7mm; object-fit:contain; }
      .r-title { font-weight:800; color:${BRAND}; line-height:1.1; }
      .r-sub { color:#6b7280; font-size:8pt; line-height:1.1; margin-top:.2mm; }

      .r-kv { display:grid; grid-template-columns: 16mm 1fr; gap: 1.2mm; align-items:baseline; margin: .6mm 0; }
      .rk { color:#505a6b; font-size:8.5pt; }
      .rv { font-weight:700; }

      .r-qr { margin-top: 2mm; display:flex; justify-content:center; }
      .r-qr img { width:34mm; height:34mm; object-fit:contain; image-rendering:auto; }

      /* Colorear totales/acentos */
      .box-t, .title, .r-title { color:${BRAND}; }
    </style>`;

    const win = window.open('', '_blank');
    if (!win) { alert('Permití la ventana emergente para imprimir.'); return; }

    const doc = win.document;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8">${css}</head><body>${htmlInner}</body></html>`);
    doc.close();

    const render = () => {
      try {
        const svg = doc.getElementById('barcode');
        if (win.JsBarcode && svg) {
          win.JsBarcode(svg, String(numero || ''), {
            format: 'CODE128',
            displayValue: false,
            margin: 0,
            height: 40
          });
        }
      } catch (_) {}

      setTimeout(() => { try { win.focus(); win.print(); } catch {} }, 60);
      // No se cierra sola para evitar interferir con diálogos del SO.
    };

    if (win.JsBarcode) {
      render();
    } else {
      const s = doc.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
      s.onload = render;
      s.onerror = render;
      doc.head.appendChild(s);
    }
  }

  // ===== API pública =====
  window.__buildPrintArea = function () {
    const data = collectForm();
    const html = renderTicket(data);
    // Desktop = iframe (como ahora). Mobile = popup (soluciona Chrome/Android).
    if (IS_MOBILE) printInPopup(html, data.numero);
    else printInIframe(html, data.numero);
  };
})();

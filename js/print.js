// /js/print.js — v2025-09-05h
// Ticket vertical 130×155 mm. Auto-nudge para móviles/tablets (sin tocar diálogo de print)
// Barcode Code128 (SVG, 55×8 mm). IFRAME, sin popups.

(function () {
  // ===== Parámetros base del ticket =====
  const PAGE_W_MM = 130;   // ancho
  const PAGE_H_MM = 155;   // alto
  const BAR_W_MM  = 55;    // barcode ancho
  const BAR_H_MM  = 8;     // barcode alto

  // ===== Detección simple de móvil/tablet =====
  const UA = navigator.userAgent || '';
  const IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(UA);

  // ===== Auto-nudge (desplazamiento para compensar encabezados/márgenes por defecto)
  // Valores conservadores que funcionan bien en Android/Chrome y la mayoría de drivers
  const NUDGE_TOP_MM  = IS_MOBILE ? -12 : 0; // desplazar hacia arriba
  const NUDGE_LEFT_MM = IS_MOBILE ? -8  : 0; // desplazar hacia la izquierda

  // Para evitar recorte por aplicar nudge negativo, ampliamos “virtualmente” el canvas de página
  const EXTRA_W_MM = Math.max(0, -NUDGE_LEFT_MM);
  const EXTRA_H_MM = Math.max(0, -NUDGE_TOP_MM);

  // ===== Helpers DOM & formatos =====
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

  // fechas
  function parseFechaLoose(str) {
    if (!str) return null;
    if (str instanceof Date) return isNaN(str) ? null : str;
    const s = String(str).trim();
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
  function safeDDMMYYYY(inputEl, fallback = '') {
    const raw = (inputEl?.value || '').trim() || fallback;
    const d = parseFechaLoose(raw);
    return d ? ddmmyyyy(d) : (raw || '');
  }

  const dash = (v) => (v && String(v).trim()) ? String(v).trim() : '—';

  // ===== Leer formulario =====
  function collectForm() {
    return {
      numero: dash($('numero_trabajo')?.value),
      cliente: dash($('nombre')?.value),
      dni: dash($('dni')?.value),
      tel: dash($('telefono')?.value),

      fecha:  safeDDMMYYYY($('fecha')),
      retira: safeDDMMYYYY($('fecha_retira')),
      entrega: getSelText($('entrega-select')) || '—',

      cristal: dash($('cristal')?.value),
      distFocal: getSelText($('distancia_focal')) || '—',
      armazonNum: dash($('numero_armazon')?.value),
      armazonDet: dash($('armazon_detalle')?.value),

      od_esf: getSelText($('od_esf')) || '0.00',
      od_cil: getSelText($('od_cil')) || '0.00',
      od_eje: ($('od_eje')?.value || '').trim() || '0',

      oi_esf: getSelText($('oi_esf')) || '0.00',
      oi_cil: getSelText($('oi_cil')) || '0.00',
      oi_eje: ($('oi_eje')?.value || '').trim() || '0',

      dnp: dash($('dnp')?.value),
      add: dash($('add')?.value),
      dr:  dash($('dr')?.value),

      precioCristal: money($('precio_cristal')?.value || 0),
      precioArmazon: money($('precio_armazon')?.value || 0),
      obraSocial:    money($('importe_obra_social')?.value || 0),
      sena:          money($('sena')?.value || 0),
      saldo:         money($('saldo')?.value || 0),
      total:         money($('total')?.value || 0),

      formaPago: dash($('forma_pago')?.value || '')
    };
  }

  // ===== HTML del ticket =====
  function renderTicket(d) {
  return `
<div class="sheet">
  <!-- TICKET PRINCIPAL -->
  <div class="ticket" style="transform: translate(${NUDGE_LEFT_MM}mm, ${NUDGE_TOP_MM}mm);">
    <header class="hdr">
      <div class="brand">
        <div class="title">Óptica Cristal</div>
        <div class="sub">San Miguel · Argentina</div>
      </div>
      <div class="barwrap"><svg id="barcode" aria-label="Código de barras"></svg></div>
      <div class="nro">
        <div class="lbl">N° TRABAJO</div>
        <div class="val mono">${d.numero}</div>
      </div>
    </header>

    <section class="grid2 info">
      <div class="kv"><div class="k">Cliente</div><div class="v">${d.cliente}</div></div>
      <div class="kv"><div class="k">DNI</div><div class="v mono">${d.dni}</div></div>
      <div class="kv"><div class="k">Teléfono</div><div class="v mono">${d.tel}</div></div>
      <div class="kv"><div class="k">Fecha</div><div class="v mono">${d.fecha}</div></div>
      <div class="kv"><div class="k">Retira</div><div class="v mono">${d.retira}</div></div>
      <div class="kv"><div class="k">Entrega</div><div class="v">${d.entrega}</div></div>
    </section>

    <section class="grid2 dtl">
      <div class="kv"><div class="k">Cristal</div><div class="v">${d.cristal}</div></div>
      <div class="kv"><div class="k">Dist. Focal</div><div class="v">${d.distFocal}</div></div>
      <div class="kv"><div class="k">Armazón Nº</div><div class="v mono">${d.armazonNum}</div></div>
      <div class="kv"><div class="k">Detalle</div><div class="v">${d.armazonDet}</div></div>
      <div class="kv"><div class="k">DNP</div><div class="v mono">${d.dnp}</div></div>
      <div class="kv"><div class="k">ADD</div><div class="v mono">${d.add}</div></div>
      <div class="kv"><div class="k">DR</div><div class="v">${d.dr}</div></div>
      <div class="kv"><div class="k">Pago</div><div class="v">${d.formaPago}</div></div>
    </section>

    <section class="grades">
      <div class="box">
        <div class="box-t">OD</div>
        <table class="tbl">
          <tr><th>ESF</th><th>CIL</th><th>EJE</th></tr>
          <tr><td class="mono">${d.od_esf}</td><td class="mono">${d.od_cil}</td><td class="mono">${d.od_eje}</td></tr>
        </table>
      </div>
      <div class="box">
        <div class="box-t">OI</div>
        <table class="tbl">
          <tr><th>ESF</th><th>CIL</th><th>EJE</th></tr>
          <tr><td class="mono">${d.oi_esf}</td><td class="mono">${d.oi_cil}</td><td class="mono">${d.oi_eje}</td></tr>
        </table>
      </div>
    </section>

    <section class="totals">
      <div class="kv"><div class="k">Cristal</div><div class="v mono">${d.precioCristal}</div></div>
      <div class="kv"><div class="k">Armazón</div><div class="v mono">${d.precioArmazon}</div></div>
      <div class="kv"><div class="k">Obra social</div><div class="v mono">${d.obraSocial}</div></div>
      <div class="kv"><div class="k">Seña</div><div class="v mono">${d.sena}</div></div>
      <div class="kv"><div class="k">Saldo</div><div class="v mono">${d.saldo}</div></div>
      <div class="total-line">TOTAL: <span class="mono">${d.total}</span></div>
    </section>
  </div>

  <!-- LÍNEA DE CORTE -->
  <div class="cutline"></div>

  <!-- TALÓN DE RETIRO -->
  <div class="coupon">
    <div class="c-head">
      <div class="c-brand"><strong>Óptica Cristal</strong><br/><span class="mono small">${d.numero}</span></div>
      <div class="c-bar"><svg id="barcode2" aria-label="Código de barras talón"></svg></div>
    </div>
    <div class="c-row"><div class="c-k">Cliente</div><div class="c-v">${d.cliente}</div></div>
    <div class="c-row"><div class="c-k">Retira</div><div class="c-v mono">${d.retira}</div></div>
    <div class="c-row"><div class="c-k">Teléfono</div><div class="c-v mono">${d.tel}</div></div>
    <div class="c-row"><div class="c-k">Total</div><div class="c-v mono">${d.total}</div></div>
  </div>
</div>`;
}

  // ===== Imprimir en IFRAME (con JsBarcode) =====
  function printInIframe(htmlInner, numero) {
    const css = `
    <style>
      /* Aumentamos “virtualmente” el canvas para no recortar al aplicar nudge */
      @page { size: ${PAGE_W_MM + EXTRA_W_MM}mm ${PAGE_H_MM + EXTRA_H_MM}mm; margin: 0; }

      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

      html, body { background:#fff; margin:0 !important; padding:0 !important; }

      body {
        font: 9.5pt/1.25 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        color:#111;
      }

      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }

      /* “Hoja” que ocupa todo el canvas ampliado */
      .sheet {
        width: ${PAGE_W_MM + EXTRA_W_MM}mm;
        height: ${PAGE_H_MM + EXTRA_H_MM}mm;
        position: fixed; top: 0; left: 0;
        overflow: hidden;
      }

      /* Ticket del tamaño real. Se desplaza con transform (nudge) */
      .ticket {
        width: ${PAGE_W_MM}mm;
        height: ${PAGE_H_MM}mm;
        box-sizing: border-box;
      }

      /* Cabecera: brand | barcode | nro */
      .hdr { display:grid; grid-template-columns: 1fr ${BAR_W_MM}mm 1fr; align-items:flex-start; column-gap: 4mm; margin-bottom: 2.5mm; }
      .title { font-weight:700; font-size: 11pt; }
      .sub { color:#666; font-size: 8.5pt; margin-top: 0.5mm; }
      .nro { justify-self: end; }
      .nro .lbl { font-size:8pt; color:#666; }
      .nro .val { font-size: 12pt; font-weight: 700; }

      /* Código de barras 55×8 mm */
      .barwrap { width:${BAR_W_MM}mm; height:${BAR_H_MM}mm; display:flex; align-items:center; justify-content:center; }
      .barwrap svg { width:${BAR_W_MM}mm; height:${BAR_H_MM}mm; }

      .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 2mm 4mm; }
      .kv { display:grid; grid-template-columns: 24mm 1fr; column-gap: 2mm; align-items: baseline; }
      .kv .k { color:#555; font-size: 8.5pt; }
      .kv .v { font-weight: 600; min-height: 10pt; }

      .dtl { margin-top: 1mm; }

      .grades { display:grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin: 2mm 0; }
      .box { border: 1px solid #d8dbe0; border-radius: 1mm; overflow:hidden; }
      .box-t { background:#f2f4f7; padding: 1mm 2mm; font-weight:700; font-size:9pt; }
      .tbl { width: 100%; border-collapse: collapse; }
      .tbl th, .tbl td { border-top: 1px solid #e5e7eb; padding: 1mm 1.5mm; text-align: center; font-size: 9pt; }

      .totals { margin-top: 1mm; display:grid; grid-template-columns: 1fr 1fr; gap: 1mm 4mm; }
      .totals .kv .k { font-size: 8.5pt; }
      .totals .kv .v { font-weight: 700; }
      .total-line { grid-column: 1 / -1; text-align:right; font-weight:800; font-size: 12pt; border-top: 1px dashed #bbb; padding-top: 1.5mm; margin-top: .5mm; }
    </style>`;

    const ifr = document.createElement('iframe');
    Object.assign(ifr.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0', visibility: 'hidden' });
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
            height: 40 // tamaño “lógico”; el físico lo define el CSS (mm)
          });
        }
      } catch (_) {}

      const cleanup = () => { setTimeout(() => { try { document.body.removeChild(ifr); } catch {} }, 100); };
      w.addEventListener?.('afterprint', cleanup);
      setTimeout(() => { try { w.focus(); w.print(); } catch {} setTimeout(cleanup, 500); }, 50);
    };

    if (w.JsBarcode) {
      render();
    } else {
      const s = doc.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
      s.onload = render;
      s.onerror = render; // imprime igual aunque no cargue
      doc.head.appendChild(s);
    }
  }

  // ===== API global que usa el botón "Imprimir" =====
  window.__buildPrintArea = function () {
    const data = collectForm();
    const html = renderTicket(data);
    printInIframe(html, data.numero);
  };
})();

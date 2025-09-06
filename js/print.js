// /js/print.js — VERTICAL con talón + QR liviano fijo (img/qr-jpg-baja.jpg)
// A4 portrait. Alto útil ~130 mm. Ticket (izq) + Talón (der).
// Barcode Code128 (SVG). Render en IFRAME (sin popups).

(function () {
  // ===== Parámetros del layout =====
  const SHEET_W_MM = 210;   // A4 width (portrait)
  const SHEET_H_MM = 297;   // A4 height (portrait)

  // Alto objetivo para ticket y talón (máx. 130–135 mm)
  const BLOCK_H_MM = 130;

  // Ancho de cada bloque (ticket / talón)
  const TICKET_W_MM = 140;
  const STUB_W_MM   = 60;

  const GUTTER_MM   = 8;    // espacio entre columnas

  // Barcode (ancho/alto físicos dentro de cada bloque)
  const BAR_W_MM = 54;
  const BAR_H_MM = 8;

  // Color de marca
  const BRAND = '#110747';

  // QR (imagen fija liviana)
  const QR_SRC = 'img/qr-jpg-baja.jpg';
  const QR_SIZE_MM = 32; // lado del QR

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
      vendedor: dash($('vendedor')?.value),

      precioCristal: money($('precio_cristal')?.value || 0),
      precioArmazon: money($('precio_armazon')?.value || 0),
      obraSocial:    money($('importe_obra_social')?.value || 0),
      sena:          money($('sena')?.value || 0),
      saldo:         money($('saldo')?.value || 0),
      total:         money($('total')?.value || 0),

      formaPago: dash($('forma_pago')?.value || '')
    };
  }

  // ===== HTML del layout (izq ticket + der talón) =====
  function renderSheet(d) {
    return `
<div class="sheet">
  <div class="row">
    <!-- ===== Ticket (izquierda) ===== -->
    <section class="ticket">
      <header class="hdr">
        <div class="brand">
          <div class="logo-dot"></div>
          <div>
            <div class="title">Óptica Cristal</div>
            <div class="sub">San Miguel · Argentina</div>
          </div>
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
        <div class="foot">
          <div class="vend"><strong>Vendedor:</strong> <span>${d.vendedor}</span></div>
          <div class="total">TOTAL: <span class="mono">${d.total}</span></div>
        </div>
      </section>
    </section>

    <!-- guía de corte (gris punteada) -->
    <div class="cut"></div>

    <!-- ===== Talón (derecha) ===== -->
    <section class="stub">
      <div class="s-head">
        <div class="mini-brand">
          <div class="logo-dot"></div>
          <div>
            <div class="m-title">Óptica Cristal</div>
            <div class="m-sub">Av R. Balbín 1125 · San Miguel<br/>WhatsApp: 11 5668 9919</div>
          </div>
        </div>
      </div>

      <div class="s-rows">
        <div class="kv"><div class="k">N° Trabajo</div><div class="v mono">${d.numero}</div></div>
        <div class="kv"><div class="k">Cliente</div><div class="v">${d.cliente}</div></div>
        <div class="kv"><div class="k">Encargó</div><div class="v mono">${d.fecha}</div></div>
        <div class="kv"><div class="k">Retira</div><div class="v mono">${d.retira}</div></div>
        <div class="kv"><div class="k">Total</div><div class="v mono">${d.total}</div></div>
        <div class="kv"><div class="k">Seña</div><div class="v mono">${d.sena}</div></div>
        <div class="kv"><div class="k">Saldo</div><div class="v mono">${d.saldo}</div></div>
      </div>

      <div class="qrbox">
        <img src="${QR_SRC}" alt="QR" />
      </div>
    </section>
  </div>
</div>`;
  }

  // ===== Render/print en IFRAME =====
  function printInIframe(htmlInner, numero) {
    const css = `
    <style>
      @page { size: ${SHEET_W_MM}mm ${SHEET_H_MM}mm; margin: 8mm; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin:0; padding:0; background:#fff; }
      body { font: 9.5pt/1.25 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#111; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }

      .sheet { width: calc(100% - 0mm); height: auto; }
      .row { display: grid; grid-template-columns: ${TICKET_W_MM}mm ${GUTTER_MM}mm ${STUB_W_MM}mm; column-gap: 0; align-items: start; }

      .ticket, .stub { box-sizing: border-box; height: ${BLOCK_H_MM}mm; }
      .ticket { padding-right: 4mm; }
      .stub { padding-left: 4mm; }

      /* Cabecera ticket */
      .hdr { display:grid; grid-template-columns: 1fr ${BAR_W_MM}mm 1fr; align-items:flex-start; column-gap: 4mm; margin-bottom: 2mm; }
      .brand { display:flex; align-items:center; gap:3mm; }
      .logo-dot { width: 6mm; height: 6mm; border-radius: 2mm; background: ${BRAND}; }
      .title { font-weight: 800; color:${BRAND}; }
      .sub { color:#6b7280; font-size: 8.5pt; margin-top: .2mm; }
      .nro { justify-self:end; text-align:right; }
      .nro .lbl { font-size: 8pt; color:#6b7280; }
      .nro .val { font-size: 12pt; font-weight: 800; color:${BRAND}; }

      /* Barcode */
      .barwrap { width:${BAR_W_MM}mm; height:${BAR_H_MM}mm; display:flex; align-items:center; justify-content:center; }
      .barwrap svg { width:${BAR_W_MM}mm; height:${BAR_H_MM}mm; }

      .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 2mm 4mm; }
      .kv { display:grid; grid-template-columns: 24mm 1fr; column-gap: 2mm; align-items: baseline; }
      .kv .k { color:#555; font-size: 8.5pt; }
      .kv .v { font-weight: 600; min-height: 10pt; }

      .grades { display:grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin: 2mm 0; }
      .box { border: 1px solid #d8dbe0; border-radius: 1mm; overflow:hidden; }
      .box-t { background:#eef2ff; color:${BRAND}; padding: 1mm 2mm; font-weight:700; font-size:9pt; }
      .tbl { width: 100%; border-collapse: collapse; }
      .tbl th, .tbl td { border-top: 1px solid #e5e7eb; padding: 1mm 1.5mm; text-align: center; font-size: 9pt; }

      .totals { margin-top: 1mm; display:grid; grid-template-columns: 1fr 1fr; gap: 1mm 4mm; }
      .totals .kv .k { font-size: 8.5pt; }
      .totals .kv .v { font-weight: 700; }
      .totals .foot { grid-column: 1 / -1; display:flex; justify-content: space-between; align-items:center; border-top: 1px dashed #cbd5e1; padding-top: 1.5mm; margin-top: .5mm; }
      .totals .foot .total { font-weight:800; font-size: 12pt; color:${BRAND}; }

      /* Corte (gris, punteado) */
      .cut { width: 0; height: ${BLOCK_H_MM}mm; border-right: 1px dashed #c9d2ea; justify-self:center; }

      /* Talón (derecha) */
      .mini-brand { display:flex; align-items:center; gap:2mm; margin-bottom: 2mm; }
      .m-title { font-weight:800; color:${BRAND}; }
      .m-sub { color:#6b7280; font-size: 8pt; line-height:1.25; }
      .s-rows { display:grid; gap: 1.2mm; margin-bottom: 2mm; }
      .stub .kv { grid-template-columns: 22mm 1fr; }
      .stub .kv .k { color:#6b7280; }
      .qrbox { margin-top: 2mm; width:${QR_SIZE_MM}mm; height:${QR_SIZE_MM}mm; }
      .qrbox img { width:100%; height:100%; display:block; object-fit:contain; background:#fff; padding: 1mm; box-sizing:border-box; border:1px solid #e5e7eb; border-radius: 1mm; }
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
            height: 40
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

  // API llamada por el botón "Imprimir"
  window.__buildPrintArea = function () {
    const data = collectForm();
    const html = renderSheet(data);
    printInIframe(html, data.numero);
  };
})();

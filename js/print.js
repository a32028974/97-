// /js/print.js — v2025-09-06b (ficha + talón 130mm alto máx, QR abajo)
// Imprime en un IFRAME sin popups. Code128 (SVG) para la ficha. Talón sin barcode, con QR.

(function () {
  // ====== Parámetros del “papel virtual” ======
  const PAGE_W_MM  = 205;   // ancho total de la hoja que ocupamos
  const PAGE_H_MM  = 130;   // ***altura TOTAL*** (subí a 135 si querés un pelín más)
  const LEFT_W_MM  = 140;   // ancho de la ficha (izquierda)
  const GUTTER_MM  = 5;     // separación/línea punteada
  const RIGHT_W_MM = PAGE_W_MM - LEFT_W_MM - GUTTER_MM; // ancho del talón
  const BAR_W_MM   = 55;    // ancho del barcode de la ficha
  const BAR_H_MM   = 8;     // alto del barcode
  const QR_SIZE_MM = 40;    // tamaño del QR en el talón (queda al pie)
  const QR_SRC     = 'img/qr-info.png'; // ruta del QR

  // ====== Nudge en móviles (compensa encabezados del diálogo de impresión) ======
  const UA = navigator.userAgent || '';
  const IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(UA);
  const NUDGE_TOP_MM  = IS_MOBILE ? -10 : 0;
  const NUDGE_LEFT_MM = IS_MOBILE ? -6  : 0;
  const EXTRA_W_MM = Math.max(0, -NUDGE_LEFT_MM);
  const EXTRA_H_MM = Math.max(0, -NUDGE_TOP_MM);

  // ====== Helpers ======
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

  // ====== Lee el formulario ======
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

  // ====== HTML ======
  function renderTicket(d) {
    return `
<div class="sheet">
  <div class="canvas" style="transform: translate(${NUDGE_LEFT_MM}mm, ${NUDGE_TOP_MM}mm);">
    <!-- Columna izquierda (ficha) -->
    <section class="main">
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
    </section>

    <!-- Separador punteado -->
    <div class="gutter"></div>

    <!-- Columna derecha (talón) -->
    <section class="coupon">
      <header class="c-head">
        <div class="c-brand">
          <img class="c-logo" src="logo.png" alt="Óptica Cristal" />
          <div>
            <div class="c-title">Óptica Cristal</div>
            <div class="c-sub">Av R. Balbín 1125 · San Miguel<br/>WhatsApp: 11 5668 9919</div>
          </div>
        </div>
      </header>

      <div class="c-body">
        <div class="c-row"><div class="ck">N° Trabajo</div><div class="cv mono">${d.numero}</div></div>
        <div class="c-row"><div class="ck">Cliente</div><div class="cv">${d.cliente}</div></div>
        <div class="c-row"><div class="ck">Encargó</div><div class="cv mono">${d.fecha}</div></div>
        <div class="c-row"><div class="ck">Retira</div><div class="cv mono">${d.retira}</div></div>
        <div class="c-row"><div class="ck">Total</div><div class="cv mono">${d.total}</div></div>
        <div class="c-row"><div class="ck">Seña</div><div class="cv mono">${d.sena}</div></div>
        <div class="c-row"><div class="ck">Saldo</div><div class="cv mono">${d.saldo}</div></div>
      </div>

      <div class="c-qr">
        <img src="${QR_SRC}" alt="QR" />
      </div>
    </section>
  </div>
</div>`;
  }

  // ====== IFRAME print ======
  function printInIframe(htmlInner, numero) {
    const css = `
<style>
  @page { size: ${PAGE_W_MM + EXTRA_W_MM}mm ${PAGE_H_MM + EXTRA_H_MM}mm; margin: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background:#fff; margin:0 !important; padding:0 !important; }
  body { font: 9.5pt/1.25 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#111; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }

  .sheet {
    width: ${PAGE_W_MM + EXTRA_W_MM}mm;
    height:${PAGE_H_MM + EXTRA_H_MM}mm;
    position: fixed; inset: 0 auto auto 0; overflow:hidden;
  }
  .canvas{
    width:${PAGE_W_MM}mm; height:${PAGE_H_MM}mm;
    display:grid; grid-template-columns: ${LEFT_W_MM}mm ${GUTTER_MM}mm ${RIGHT_W_MM}mm;
    transform: translate(${NUDGE_LEFT_MM}mm, ${NUDGE_TOP_MM}mm);
  }

  /* ===== FICHA (izquierda) ===== */
  .main{ padding: 2.5mm 3mm 2mm 3mm; box-sizing:border-box; display:block; }
  .hdr{ display:grid; grid-template-columns: 1fr ${BAR_W_MM}mm 1fr; column-gap: 3mm; align-items:flex-start; margin-bottom: 2mm; }
  .title{ font-weight:800; font-size: 10.5pt; color:#0b57d0; }
  .sub{ color:#566; font-size: 8.2pt; margin-top:.2mm; }
  .nro{ justify-self:end; text-align:right; }
  .nro .lbl{ font-size:8pt; color:#666; }
  .nro .val{ font-size:12pt; font-weight:800; letter-spacing:.2px; }

  .barwrap{ width:${BAR_W_MM}mm; height:${BAR_H_MM}mm; display:flex; align-items:center; justify-content:center; }
  .barwrap svg{ width:${BAR_W_MM}mm; height:${BAR_H_MM}mm; }

  .grid2{ display:grid; grid-template-columns:1fr 1fr; gap: 2mm 4mm; }
  .kv{ display:grid; grid-template-columns: 24mm 1fr; column-gap: 2mm; align-items: baseline; }
  .kv .k{ color:#555; font-size: 8.3pt; }
  .kv .v{ font-weight: 600; min-height: 9.5pt; }

  .dtl{ margin-top: .6mm; }

  .grades{ display:grid; grid-template-columns: 1fr 1fr; gap: 2.2mm; margin: 1.8mm 0; }
  .box{ border:1px solid #d8dbe0; border-radius: 1mm; overflow:hidden; }
  .box-t{ background:#eef3ff; color:#0b57d0; padding: .8mm 1.6mm; font-weight:700; font-size:9pt; }
  .tbl{ width:100%; border-collapse:collapse; }
  .tbl th,.tbl td{ border-top:1px solid #e5e7eb; padding: .9mm 1.2mm; text-align:center; font-size: 9pt; }

  .totals{ display:grid; grid-template-columns: 1fr 1fr; gap: 1mm 4mm; }
  .totals .kv .k{ font-size: 8.3pt; }
  .totals .kv .v{ font-weight: 700; }
  .total-line{ grid-column: 1 / -1; text-align:right; font-weight:800; font-size: 12pt; border-top:1px dashed #b9c2d0; padding-top: 1.2mm; margin-top: .3mm; }

  /* ===== Separador vertical ===== */
  .gutter{
    border-left: 0.4mm dashed #9db1e7;
    height: 100%;
  }

  /* ===== TALÓN (derecha) ===== */
  .coupon{
    height:100%;
    box-sizing:border-box;
    padding: 2.2mm 2.6mm 2.2mm 2.6mm;
    display:flex; flex-direction:column; gap: 2mm;
  }
  .c-head{}
  .c-brand{ display:flex; align-items:center; gap: 2mm; }
  .c-logo{ width: 7mm; height: 7mm; object-fit:contain; border-radius: 1mm; }
  .c-title{ font-weight:800; color:#0b57d0; }
  .c-sub{ font-size: 8pt; color:#4b5563; line-height:1.2; }

  .c-body{ display:grid; gap: 1.4mm; }
  .c-row{ display:grid; grid-template-columns: 19mm 1fr; column-gap: 2mm; align-items: baseline; }
  .ck{ color:#555; font-size: 8.3pt; }
  .cv{ font-weight: 700; min-height: 9.5pt; }

  .c-qr{
    margin-top:auto;               /* => empuja el QR al fondo del talón */
    display:flex; justify-content:center;
  }
  .c-qr img{
    width:${QR_SIZE_MM}mm; height:${QR_SIZE_MM}mm; object-fit:contain;
    image-rendering: -webkit-optimize-contrast;
  }
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

  // ====== API pública ======
  window.__buildPrintArea = function () {
    const data = collectForm();
    const html = renderTicket(data);
    printInIframe(html, data.numero);
  };
})();

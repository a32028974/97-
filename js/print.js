// /js/print.js — v2025-09-06v (vertical + talón derecho + móvil robusto)

(function () {
  // ===== Página física (A4/Letter) =====
  // Usamos una página completa y dibujamos el contenido en la franja superior.
  const PAGE_W_MM = 210;   // ancho hoja
  const PAGE_H_MM = 297;   // alto hoja

  // ===== Zona superior con ticket + talón =====
  const BAND_HEIGHT_MM = 133;        // alto total de la franja imprimible (≈130–135)
  const GAP_MM          = 4;         // separación entre ficha y talón
  const COUPON_W_MM     = 48;        // ancho del talón
  const TICKET_W_MM     = PAGE_W_MM - COUPON_W_MM - GAP_MM;

  // ===== QR (archivo liviano) =====
  const QR_SRC = 'img/qr-jpg-baja.jpg';

  // ===== Detección de móvil =====
  const UA = navigator.userAgent || '';
  const IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(UA);

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

      formaPago: dash($('forma_pago')?.value || ''),
      vendedor:  dash($('vendedor')?.value || '')
    };
  }

  // ===== HTML =====
  function renderTicket(d) {
    return `
<div class="sheet">
  <!-- Franja superior -->
  <div class="band">
    <!-- Ficha principal (izquierda) -->
    <div class="ticket">
      <header class="hdr">
        <div class="brand">
          <div class="logo-dot"></div>
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
      </section>

      <div class="bottom-row">
        <div class="vend">Vendedor: <span class="mono">${d.vendedor}</span></div>
        <div class="total-line">TOTAL: <span class="mono">${d.total}</span></div>
      </div>
    </div>

    <!-- Talón (derecha) -->
    <div class="coupon">
      <div class="c-head">
        <div class="c-brand">
          <div class="logo-dot"></div>
          <div class="cb-title">Óptica Cristal</div>
          <div class="cb-sub">Av. R. Balbín 1125 · San Miguel<br/>WhatsApp: 11 5668 9919</div>
        </div>
      </div>

      <div class="c-row"><div class="c-k">N° Trabajo</div><div class="c-v mono">${d.numero}</div></div>
      <div class="c-row"><div class="c-k">Cliente</div><div class="c-v">${d.cliente}</div></div>
      <div class="c-row"><div class="c-k">Encargó</div><div class="c-v mono">${d.fecha}</div></div>
      <div class="c-row"><div class="c-k">Retira</div><div class="c-v mono">${d.retira}</div></div>
      <div class="c-row"><div class="c-k">Total</div><div class="c-v mono">${d.total}</div></div>
      <div class="c-row"><div class="c-k">Seña</div><div class="c-v mono">${d.sena}</div></div>
      <div class="c-row"><div class="c-k">Saldo</div><div class="c-v mono">${d.saldo}</div></div>

      <img class="qr" src="${QR_SRC}" alt="QR" />
    </div>
  </div>
</div>`;
  }

  // ===== Estilos de impresión (en mm, colores a color) =====
  function buildPrintCSS() {
    return `
<style>
  @page { size: ${PAGE_W_MM}mm ${PAGE_H_MM}mm; margin: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background:#fff; margin:0; padding:0; }
  body { font: 9.5pt/1.25 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#111; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }

  .sheet { width:${PAGE_W_MM}mm; height:${PAGE_H_MM}mm; position:fixed; inset:0; }
  .band {
    position:absolute; left:0; top:0;
    width:${PAGE_W_MM}mm; height:${BAND_HEIGHT_MM}mm;
    box-sizing:border-box; padding:4mm 5mm;
  }

  /* Estructura izquierda/derecha */
  .ticket {
    position:absolute; left:5mm; top:4mm;
    width:${TICKET_W_MM - 5}mm; /* restamos el padding izquierdo ya usado */
    height:${BAND_HEIGHT_MM - 8}mm;
  }
  .coupon {
    position:absolute; right:5mm; top:4mm;
    width:${COUPON_W_MM}mm; height:${BAND_HEIGHT_MM - 8}mm;
    box-sizing:border-box; padding:0 0 0 0;
  }

  /* Cabecera ficha */
  .hdr { display:grid; grid-template-columns: 1fr 55mm 1fr; column-gap: 4mm; align-items:flex-start; margin-bottom:2.4mm; }
  .brand { display:grid; grid-template-columns: 4mm 1fr; align-items:center; gap:1.6mm; }
  .logo-dot { width:3.2mm; height:3.2mm; border-radius:0.6mm; background:#110747; }
  .title { font-weight:800; font-size:11pt; color:#110747; }
  .sub { color:#6b7280; font-size:8.3pt; margin-top:.2mm; }
  .nro { justify-self:end; }
  .nro .lbl { font-size:8pt; color:#6b7280; }
  .nro .val { font-size:12pt; font-weight:800; color:#110747; letter-spacing:.2px; }

  /* Código de barras */
  .barwrap { width:55mm; height:8mm; display:flex; align-items:center; justify-content:center; }
  .barwrap svg { width:55mm; height:8mm; }

  /* Grillas */
  .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 2mm 4mm; }
  .kv { display:grid; grid-template-columns: 22mm 1fr; column-gap:2mm; align-items:baseline; }
  .kv .k { color:#4b5563; font-size:8.4pt; }
  .kv .v { font-weight:600; min-height:10pt; }

  .dtl { margin-top:1mm; }

  .grades { display:grid; grid-template-columns: 1fr 1fr; gap:3mm; margin:2mm 0; }
  .box { border: 1px solid #d8dbe0; border-radius:1mm; overflow:hidden; }
  .box-t { background:#eef2ff; color:#110747; padding:1mm 2mm; font-weight:700; font-size:9pt; }
  .tbl { width:100%; border-collapse:collapse; }
  .tbl th, .tbl td { border-top:1px solid #e5e7eb; padding:1mm 1.5mm; text-align:center; font-size:9pt; }

  .totals { margin-top:1mm; display:grid; grid-template-columns: 1fr 1fr; gap:1mm 4mm; }
  .totals .kv .k { font-size:8.4pt; }
  .totals .kv .v { font-weight:700; }

  .bottom-row {
    display:grid; grid-template-columns: 1fr auto; align-items:center;
    gap: 6mm; border-top:1px dashed #cbd5e1; padding-top:1.4mm; margin-top:.6mm;
  }
  .vend { color:#374151; }
  .total-line { font-weight:800; font-size:12pt; }

  /* Talón */
  .c-head { margin-bottom:1.2mm; }
  .c-brand { display:grid; grid-template-columns: 3mm 1fr; gap:1.2mm; align-items:center; }
  .c-brand .logo-dot { width:3mm; height:3mm; border-radius:.6mm; background:#110747; }
  .cb-title { font-weight:800; color:#110747; line-height:1; }
  .cb-sub { color:#6b7280; font-size:8pt; line-height:1.15; margin-top:.4mm; }

  .c-row { display:grid; grid-template-columns: 15mm 1fr; gap:1.4mm; margin:.9mm 0; font-size:9pt; }
  .c-k { color:#4b5563; }
  .qr {
    position:absolute; left:50%; transform:translateX(-50%);
    bottom:1.8mm; width:32mm; height:32mm; object-fit:cover; border-radius:1mm;
    border:1px solid #e5e7eb;
  }

  /* (Opcional) sutil guía de corte en gris claro */
  .band::after{
    content:""; position:absolute; top:4mm; bottom:4mm; left:${TICKET_W_MM + 5}mm;
    width:0; border-left:.5mm dashed #cbd5e1;
  }
</style>`;
  }

  // ===== Impresión (móvil robusto + desktop iframe) =====
  function printDocument(htmlInner, numero) {
    // Cerrar Swal si estuviera abierto (Android sino imprime la pantalla)
    try { if (window.Swal) Swal.close(); } catch {}

    const css = buildPrintCSS();

    // Fallback móvil: abrir en una pestaña nueva (más fiable en Android/iOS)
    if (IS_MOBILE) {
      const win = window.open('', '_blank');
      if (!win) return;
      const doc = win.document;
      doc.open();
      doc.write(`<!doctype html><html><head><meta charset="utf-8">${css}</head><body>${htmlInner}</body></html>`);
      doc.close();

      const doPrint = () => {
        try {
          const svg = doc.getElementById('barcode');
          if (win.JsBarcode && svg) {
            win.JsBarcode(svg, String(numero||''), { format:'CODE128', displayValue:false, margin:0, height:40 });
          }
        } catch(_) {}
        setTimeout(()=>{ try{ win.focus(); win.print(); }catch{} }, 200);
      };

      if (win.JsBarcode) doPrint();
      else {
        const s = doc.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
        s.onload = doPrint;
        s.onerror = doPrint;
        doc.head.appendChild(s);
      }
      return;
    }

    // Desktop: iframe fuera de pantalla (no 0×0)
    const ifr = document.createElement('iframe');
    Object.assign(ifr.style, {
      position:'fixed', width:'1px', height:'1px', left:'-10000px', top:'0',
      border:'0', opacity:'0', pointerEvents:'none'
    });
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
          w.JsBarcode(svg, String(numero||''), { format:'CODE128', displayValue:false, margin:0, height:40 });
        }
      } catch(_) {}

      const cleanup = () => { setTimeout(()=>{ try{ document.body.removeChild(ifr); }catch{} }, 100); };
      w.addEventListener?.('afterprint', cleanup);
      setTimeout(()=>{ try{ w.focus(); w.print(); }catch{} setTimeout(cleanup, 500); }, 250);
    };

    if (w.JsBarcode) render();
    else {
      const s = doc.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
      s.onload = render;
      s.onerror = render;
      doc.head.appendChild(s);
    }
  }

  // ===== API global para el botón "Imprimir" =====
  window.__buildPrintArea = function () {
    const data = collectForm();
    const html = renderTicket(data);
    printDocument(html, data.numero);
  };
})();

// /js/print.js — v2025-09-09 (A4 + QR fijo desde /img/qr.png)

(function () {
  // ===== Tamaños (A4) =====
  const PAGE_W_MM = 210;
  const PAGE_H_MM = 297;
  const LEFT_W_MM = 145;
  const GUTTER_MM = 5;
  const RIGHT_W_MM = 55;
  const MAX_COL_H_MM = 130;
  const BAR_W_MM = 55;
  const BAR_H_MM = 8;

  const UA = navigator.userAgent || '';
  const IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(UA);

  const NUDGE_TOP_MM  = 0;
  const NUDGE_LEFT_MM = 0;
  const EXTRA_W_MM = Math.max(0, -NUDGE_LEFT_MM);
  const EXTRA_H_MM = Math.max(0, -NUDGE_TOP_MM);

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
    const retiraD = (() => {
      const d = parseDateLike(getSelText($('fecha_retira')));
      return d ? ddmmyyyy(d) : getSelText($('fecha_retira'));
    })();

    const numero = getSelText($('numero_trabajo'));

    return {
      numero,
      fecha:  getSelText($('fecha')),
      entrega: getSelText($('entrega-select')),
      retira: retiraD,
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
  }

  // ===== Render principal (boleta + talón) =====
  function renderTicket(d) {
    const safe = (x) => (x || '').replace(/[<>]/g, s => ({'<':'&lt;','>':'&gt;'}[s]));
    const BRAND = '#110747';

    return `
<div class="sheet" style="transform:translate(${NUDGE_LEFT_MM}mm, ${NUDGE_TOP_MM}mm)">
  <div class="canvas">
    <div class="left">
      <div class="hdr">
        <div class="brand">
          <div class="dot"></div>
          <div>
            <div class="title">Óptica Cristal</div>
            <div class="sub">San Miguel • Argentina</div>
          </div>
        </div>
        <div class="barwrap"><svg id="barcode"></svg></div>
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

      <!-- resto igual que antes… -->
    </div>

    <div class="cut"></div>

    <div class="right">
      <div class="r-head">
        <div class="r-logo-dot"></div>
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
        <img src="img/qr.png" alt="QR fijo" style="width:34mm;height:34mm;object-fit:contain">
      </div>
    </div>
  </div>
</div>`;
  }

  // ===== CSS común =====
  function commonCSS() {
    return `
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin:0; padding:0; background:#fff; color:#111; font: 9.5pt/1.3 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      .sheet { width:${PAGE_W_MM+EXTRA_W_MM}mm; height:${PAGE_H_MM+EXTRA_H_MM}mm; }
      .canvas { width:${PAGE_W_MM}mm; height:${PAGE_H_MM}mm; padding:8mm 6mm 6mm;
        display:grid; grid-template-columns:${LEFT_W_MM}mm ${GUTTER_MM}mm ${RIGHT_W_MM}mm; }
      .cut { width:${GUTTER_MM}mm; border-left:1px dashed #cfd6e4; }
      .r-qr { margin-top:2mm; display:flex; justify-content:center; }
    </style>`;
  }

  function printGeneric(htmlInner, numero) {
    const css = commonCSS();
    const win = IS_MOBILE ? window.open('', '_blank') : (() => {
      const ifr = document.createElement('iframe');
      Object.assign(ifr.style, { position:'fixed', right:'0', bottom:'0', width:'0', height:'0', border:'0', visibility:'hidden' });
      document.body.appendChild(ifr);
      return ifr.contentWindow;
    })();

    if (!win) { alert('Habilitá popups para imprimir'); return; }

    const doc = win.document;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8">${css}</head><body>${htmlInner}</body></html>`);
    doc.close();

    const render = () => {
      try {
        const svg = doc.getElementById('barcode');
        if (win.JsBarcode && svg) {
          win.JsBarcode(svg, String(numero || ''), { format: 'CODE128', displayValue: false, margin: 0, height: 40 });
        }
      } catch (_) {}
      setTimeout(() => { try { win.focus(); win.print(); } catch {} }, 80);
    };

    if (win.JsBarcode) render();
    else {
      const s = doc.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
      s.onload = render;
      doc.head.appendChild(s);
    }
  }

  // API pública
  window.__buildPrintArea = function () {
    const data = collectForm();
    const html = renderTicket(data);
    printGeneric(html, data.numero);
  };
})();

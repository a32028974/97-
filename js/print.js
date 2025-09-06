// /js/print.js — v2025-09-06y (A4 vertical, franja 130mm, talón derecho)

(function () {
  // ====== Medidas de la franja superior (no forzamos tamaño de página) ======
  const STRIP_H_MM = 130;               // alto total visible
  const STRIP_W_MM = 200;               // ancho total de la franja (cómodo en A4)
  const LEFT_W_MM  = 145;               // ficha
  const GUTTER_MM  = 6;                 // separación
  const RIGHT_W_MM = STRIP_W_MM - LEFT_W_MM - GUTTER_MM; // ~49mm

  const BAR_W_MM = 55, BAR_H_MM = 8;
  const BRAND_COLOR = '#110747';

  const QR_SRC = './qr-jpg-baja.jpg';        // tu QR (cambiá si está en /img/qr-info.png)
  const QR_SIZE_MM = 30;            // tamaño del QR en el talón

  // ====== Helpers ======
  const $ = (id) => document.getElementById(id);
  const getSelText = (el) => el?.tagName === 'SELECT'
    ? (el.options[el.selectedIndex]?.textContent || el.value || '').trim()
    : (el?.value || '').trim();

  function normNumberLike(v){ if(v==null) return 0;
    const s=String(v).replace(/[^\d.,-]/g,'').replace(/\./g,'').replace(',', '.');
    const n=parseFloat(s); return isNaN(n)?0:n;
  }
  function money(v){ const n=Math.max(0, normNumberLike(v));
    return '$ ' + n.toLocaleString('es-AR',{maximumFractionDigits:0});
  }
  function parseFechaLoose(str){
    if(!str) return null; if(str instanceof Date) return isNaN(str)?null:str;
    const s=String(str).trim();
    let m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if(m){ const dd=+m[1], mm=+m[2], yyyy=m[3].length===2?+('20'+m[3]):+m[3];
      const d=new Date(yyyy,mm-1,dd); return isNaN(d)?null:d;
    }
    m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/); if(m) return new Date(+m[1],+m[2]-1,+m[3]);
    const d2=new Date(s); return isNaN(d2)?null:d2;
  }
  const ddmmyyyy = (d)=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  function safeDDMMYYYY(inputEl,fallback=''){ const raw=(inputEl?.value||'').trim()||fallback;
    const d=parseFechaLoose(raw); return d?ddmmyyyy(d):(raw||''); }
  const dash = (v)=> (v && String(v).trim()) ? String(v).trim() : '—';

  // ====== Leer formulario ======
  function collectForm(){
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
      vendedor: dash($('vendedor')?.value || '')
    };
  }

  // ====== HTML ======
  function renderTicket(d){
    return `
<div class="page">
  <!-- FICHA IZQUIERDA -->
  <div class="left">
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

      <div class="total-line">
        <div class="vendedor">Vendedor: <span class="mono">${d.vendedor}</span></div>
        <div class="total">TOTAL: <span class="mono">${d.total}</span></div>
      </div>
    </section>
  </div>

  <!-- TALÓN DERECHO (vertical) -->
  <div class="side">
    <div class="couponR">
      <div class="c-head">
        <img class="c-logo" src="./logo.png" alt="logo"/>
        <div>
          <div class="c-title">Óptica Cristal</div>
          <div class="c-sub">Av. R. Balbín 1125 · San Miguel<br/>WhatsApp: 11 5668 9919</div>
        </div>
      </div>

      <div class="c-body">
        <div class="c-row"><div class="ck">N° Trabajo</div><div class="cv mono">${d.numero}</div></div>
        <div class="c-row"><div class="ck">Cliente</div><div class="cv">${d.cliente}</div></div>
        <div class="c-row"><div class="ck">Encargó</div><div class="cv mono">${d.fecha}</div></div>
        <div class="c-row"><div class="ck">Retira</div><div class="cv mono">${d.retira}</div></div>
        <div class="c-row"><div class="ck">Total</div><div class="cv mono">${d.total}</div></div>
        <div class="c-row"><div class="ck">Seña</div><div class="cv mono">${d.sena}</div></div>
        <div class="c-row"><div class="ck">Saldo</div><div class="cv mono">${d.saldo}</div></div>
      </div>

      <div class="c-qr"><img src="${QR_SRC}" alt="QR"></div>
    </div>
  </div>
</div>`;
  }

  // ====== Print en IFRAME (no forzamos orientación) ======
  function printInIframe(htmlInner, numero){
    const css = `
    <style>
      :root{ --brand:${BRAND_COLOR}; }
      @page{ margin: 0; } /* A4 vertical por defecto del navegador */

      *{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html,body{ background:#fff; margin:0!important; padding:0!important; }
      body{ font:9.5pt/1.25 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#111; }
      .mono{ font-family: ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace; }

      /* Franja superior posicionada en el A4 vertical */
      .page{
        width:${STRIP_W_MM}mm; height:${STRIP_H_MM}mm;
        position: fixed; top: 0; left: 0;
        display:grid; grid-template-columns:${LEFT_W_MM}mm ${GUTTER_MM}mm ${RIGHT_W_MM}mm;
      }
      .left{ padding:2.2mm 2.6mm; box-sizing:border-box; }
      .side{ padding:2mm 2mm 2mm 0; box-sizing:border-box; }

      /* Encabezado ficha */
      .hdr{ display:grid; grid-template-columns:1fr ${BAR_W_MM}mm 1fr; column-gap:3mm; align-items:flex-start; margin-bottom:2mm; }
      .title{ font-weight:900; font-size:11pt; color:var(--brand); letter-spacing:.2px; }
      .sub{ color:#666; font-size:8.5pt; margin-top:.4mm; }
      .nro{ justify-self:end; text-align:right; }
      .nro .lbl{ font-size:8pt; color:#666; }
      .nro .val{ font-size:12pt; font-weight:900; }

      .barwrap{ width:${BAR_W_MM}mm; height:${BAR_H_MM}mm; display:flex; align-items:center; justify-content:center; }
      .barwrap svg{ width:${BAR_W_MM}mm; height:${BAR_H_MM}mm; }

      .grid2{ display:grid; grid-template-columns:1fr 1fr; gap:1.6mm 3.2mm; }
      .kv{ display:grid; grid-template-columns:22mm 1fr; column-gap:2mm; align-items:baseline; }
      .kv .k{ color:#455; font-size:8.4pt; }
      .kv .v{ font-weight:650; min-height:10pt; }

      .dtl{ margin-top:.6mm; }
      .grades{ display:grid; grid-template-columns:1fr 1fr; gap:2.4mm; margin:1.4mm 0; }
      .box{ border:1px solid #d8dbe0; border-radius:1mm; overflow:hidden; }
      .box-t{ background:#eef2ff; color:var(--brand); padding:1mm 2mm; font-weight:800; font-size:9pt; }
      .tbl{ width:100%; border-collapse:collapse; }
      .tbl th,.tbl td{ border-top:1px solid #e5e7eb; padding:1mm 1.5mm; text-align:center; font-size:9pt; }

      .totals{ margin-top:1mm; display:grid; grid-template-columns:1fr 1fr; gap:1mm 3mm; }
      .totals .kv .k{ font-size:8.4pt; }
      .totals .kv .v{ font-weight:800; }
      .total-line{ grid-column:1/-1; display:flex; justify-content:space-between; align-items:center; border-top:1px dashed #bbb; padding-top:1.1mm; margin-top:.3mm; }
      .total-line .vendedor{ color:#334155; font-size:9.5pt; }
      .total-line .total{ font-weight:900; font-size:12pt; }

      /* Talón */
      .couponR{
        height:100%; box-sizing:border-box; padding:3mm;
        border-left:2px solid rgba(17,7,71,.25);
        display:flex; flex-direction:column; justify-content:space-between;
      }
      .c-head{ display:flex; align-items:center; gap:3mm; }
      .c-logo{ width:8mm; height:8mm; object-fit:contain; border-radius:1mm; }
      .c-title{ font-weight:900; color:var(--brand); }
      .c-sub{ font-size:8pt; color:#4b5563; line-height:1.25; }

      .c-body{ display:grid; gap:1mm; margin-top:1mm; }
      .c-row{ display:grid; grid-template-columns:20mm 1fr; column-gap:3mm; align-items:baseline; }
      .ck{ color:#444; font-size:8.3pt; }
      .cv{ font-weight:720; min-height:9.5pt; }
      .c-qr{ display:flex; justify-content:center; }
      .c-qr img{ width:${QR_SIZE_MM}mm; height:${QR_SIZE_MM}mm; object-fit:contain; }
    </style>`;

    const ifr = document.createElement('iframe');
    Object.assign(ifr.style,{position:'fixed',right:'0',bottom:'0',width:'0',height:'0',border:'0',visibility:'hidden'});
    document.body.appendChild(ifr);

    const doc = ifr.contentDocument || ifr.contentWindow.document;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8">${css}</head><body>${htmlInner}</body></html>`);
    doc.close();

    const w = ifr.contentWindow;

    const render = () => {
      try{
        const svg = doc.getElementById('barcode');
        if (w.JsBarcode && svg){
          w.JsBarcode(svg, String(numero||''), { format:'CODE128', displayValue:false, margin:0, height:40 });
        }
      }catch(_){}

      const cleanup=()=>{ setTimeout(()=>{ try{ document.body.removeChild(ifr); }catch{} },100); };
      w.addEventListener?.('afterprint', cleanup);
      setTimeout(()=>{ try{ w.focus(); w.print(); }catch{} setTimeout(cleanup,500); },60);
    };

    if (w.JsBarcode) render();
    else {
      const s = doc.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
      s.onload = render; s.onerror = render; doc.head.appendChild(s);
    }
  }

  // API que usa el botón "Imprimir"
  window.__buildPrintArea = function(){
    const data = collectForm();
    const html = renderTicket(data);
    printInIframe(html, data.numero);
  };
})();

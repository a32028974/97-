// /RECETAS/js/print.js — v2025-09-05 (A4 estable + fechas dd/mm + totales)
// Se usa desde main.js -> buildPrintArea() -> window.__buildPrintArea()

(function () {
  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);

  const getSelText = (sel) => {
    if (!sel) return '';
    if (sel.tagName === 'SELECT') {
      const opt = sel.options[sel.selectedIndex];
      return (opt?.textContent || opt?.value || '').trim();
    }
    return (sel.value || '').trim();
  };

  // Formato dinero "$ 12.345"
  function normNumberLike(v) {
    if (v == null) return 0;
    const s = String(v).replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }
  function fmtMoney(v) {
    const n = Math.max(0, normNumberLike(v));
    return '$ ' + n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
  }

  // Fechas
  function parseFechaLoose(str) {
    if (!str) return null;
    if (str instanceof Date) return isNaN(str) ? null : str;
    const s = String(str).trim();

    // dd/mm/aa(aa)
    let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const dd = +m[1], mm = +m[2], yyyy = m[3].length === 2 ? +( '20' + m[3]) : +m[3];
      const d = new Date(yyyy, mm - 1, dd);
      return isNaN(d) ? null : d;
    }
    // yyyy-mm-dd (type="date")
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const d = new Date(+m[1], +m[2] - 1, +m[3]);
      return isNaN(d) ? null : d;
    }
    // Date.toString()
    const d2 = new Date(s);
    return isNaN(d2) ? null : d2;
  }
  function fmtDDMMYYYY(d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }
  function safeFechaDDMMYYYY(inputEl, fallback) {
    const raw = (inputEl?.value || '').trim();
    const d = parseFechaLoose(raw || fallback);
    return d ? fmtDDMMYYYY(d) : (raw || '');
  }

  // Lee value de un input/select, si está vacío devuelve '—'
  const valOrDash = (el) => {
    if (!el) return '—';
    const v = (el.tagName === 'SELECT') ? getSelText(el) : (el.value || '').trim();
    return v || '—';
  };

  // ---------- recolección de datos del formulario ----------
  function collectData() {
    // básicos
    const numero   = valOrDash($('numero_trabajo'));
    const cliente  = valOrDash($('nombre'));
    const dni      = valOrDash($('dni'));
    const tel      = valOrDash($('telefono'));

    // fechas en dd/mm/aaaa (evita "Thu Sep ...")
    const fechaEncTxt   = $('fecha')?.value || '';
    const fechaEnc      = safeFechaDDMMYYYY($('fecha'), fechaEncTxt);
    const fechaRetira   = safeFechaDDMMYYYY($('fecha_retira'), '');
    const entregaTxt    = getSelText($('entrega-select')) || '—';

    // producto
    const cristal       = valOrDash($('cristal'));
    const nArmazon      = valOrDash($('numero_armazon'));
    const detArmazon    = valOrDash($('armazon_detalle'));
    const distFocal     = getSelText($('distancia_focal')) || '—';
    const vendedor      = valOrDash($('vendedor'));
    const add           = valOrDash($('add'));
    const dnp           = valOrDash($('dnp'));

    // graduaciones
    const od_esf = getSelText($('od_esf')) || '0.00';
    const od_cil = getSelText($('od_cil')) || '0.00';
    const od_eje = ($('od_eje')?.value || '').trim() || '0';

    const oi_esf = getSelText($('oi_esf')) || '0.00';
    const oi_cil = getSelText($('oi_cil')) || '0.00';
    const oi_eje = ($('oi_eje')?.value || '').trim() || '0';

    // montos
    const precioCristal = fmtMoney($('precio_cristal')?.value || 0);
    const precioArmazon = fmtMoney($('precio_armazon')?.value || 0);
    const total         = fmtMoney($('total')?.value || 0);
    const sena          = fmtMoney($('sena')?.value || 0);
    const obraSocial    = fmtMoney($('importe_obra_social')?.value || 0);
    const saldo         = fmtMoney($('saldo')?.value || 0);

    return {
      numero, cliente, dni, tel,
      fechaEnc, fechaRetira, entregaTxt,
      cristal, nArmazon, detArmazon, distFocal, vendedor, add, dnp,
      od_esf, od_cil, od_eje, oi_esf, oi_cil, oi_eje,
      precioCristal, precioArmazon, total, sena, obraSocial, saldo
    };
  }

  // ---------- template HTML de una hoja ----------
  function renderSheet(d) {
    return `
<div class="sheet">
  <header class="hdr">
    <div class="brand">
      <img src="./logo.png" alt="Óptica Cristal" />
      <div class="brand-meta">
        <div class="title">Óptica Cristal</div>
        <div class="addr">San Miguel · Argentina</div>
      </div>
    </div>
    <div class="nro">
      <div class="label">N° Trabajo</div>
      <div class="value mono">${d.numero}</div>
    </div>
  </header>

  <section class="grid2 info">
    <div class="kv"><div class="k">Cliente</div><div class="v">${d.cliente}</div></div>
    <div class="kv"><div class="k">DNI</div><div class="v mono">${d.dni}</div></div>
    <div class="kv"><div class="k">Teléfono</div><div class="v mono">${d.tel}</div></div>
    <div class="kv"><div class="k">Fecha</div><div class="v mono">${d.fechaEnc}</div></div>
    <div class="kv"><div class="k">Retira</div><div class="v mono">${d.fechaRetira}</div></div>
  </section>

  <section class="grades">
    <div class="box">
      <div class="box-title">Graduación OD</div>
      <table class="tbl">
        <tr><th>ESF</th><th>CIL</th><th>EJE</th></tr>
        <tr><td class="mono">${d.od_esf}</td><td class="mono">${d.od_cil}</td><td class="mono">${d.od_eje}</td></tr>
      </table>
    </div>
    <div class="box">
      <div class="box-title">Graduación OI</div>
      <table class="tbl">
        <tr><th>ESF</th><th>CIL</th><th>EJE</th></tr>
        <tr><td class="mono">${d.oi_esf}</td><td class="mono">${d.oi_cil}</td><td class="mono">${d.oi_eje}</td></tr>
      </table>
    </div>
  </section>

  <section class="grid2 details">
    <div class="kv"><div class="k">Cristal</div><div class="v">${d.cristal}</div></div>
    <div class="kv"><div class="k">Armazón</div><div class="v mono">${d.nArmazon}</div></div>
    <div class="kv"><div class="k">Detalle armazón</div><div class="v">${d.detArmazon}</div></div>
    <div class="kv"><div class="k">Distancia focal</div><div class="v">${d.distFocal}</div></div>
    <div class="kv"><div class="k">ADD</div><div class="v mono">${d.add}</div></div>
    <div class="kv"><div class="k">DNP</div><div class="v mono">${d.dnp}</div></div>
    <div class="kv"><div class="k">Entrega</div><div class="v">${d.entregaTxt}</div></div>
    <div class="kv"><div class="k">Vendedor</div><div class="v">${d.vendedor}</div></div>
  </section>

  <section class="grid2 totals">
    <div class="kv"><div class="k">Precio cristal</div><div class="v mono">${d.precioCristal}</div></div>
    <div class="kv"><div class="k">Precio armazón</div><div class="v mono">${d.precioArmazon}</div></div>
    <div class="kv"><div class="k">Obra social</div><div class="v mono">${d.obraSocial}</div></div>
    <div class="kv"><div class="k">Seña</div><div class="v mono">${d.sena}</div></div>
    <div class="kv total"><div class="k">TOTAL</div><div class="v mono">${d.total}</div></div>
    <div class="kv saldo"><div class="k">Saldo</div><div class="v mono">${d.saldo}</div></div>
  </section>
</div>`;
  }

  // ---------- imprimir ----------
  function renderAndPrint(html) {
    // contenedor (se oculta en pantalla, solo se ve en print.css @media print)
    let host = document.getElementById('__PRINT__');
    if (!host) {
      host = document.createElement('div');
      host.id = '__PRINT__';
      host.className = 'print-host print-only';
      document.body.appendChild(host);
    }
    host.innerHTML = html;

    // Forzar reflow y disparar impresión una sola vez
    requestAnimationFrame(() => {
      window.print();
      // limpia luego de cerrar el diálogo (pequeño delay)
      setTimeout(() => { host.innerHTML = ''; }, 1000);
    });
  }

  // API pública usada por main.js
  window.__buildPrintArea = function () {
    const data = collectData();
    const sheet = renderSheet(data);
    renderAndPrint(sheet);
  };
})();

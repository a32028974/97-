// ===== Prefill desde el historial =====
(function prefillDesdeHistorial(){
  let raw = null, data = null;
  try { raw = sessionStorage.getItem('prefill_trabajo'); } catch {}
  if (!raw) return;

  try { data = JSON.parse(raw); } catch { data = null; }
  try { sessionStorage.removeItem('prefill_trabajo'); } catch {}
  if (!data) return;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
  const setSelectIfExists = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    const v = String(val ?? '').trim();
    if (!v) return;
    const opt = Array.from(el.options).find(o =>
      String(o.value).toUpperCase() === v.toUpperCase() ||
      String(o.textContent).toUpperCase() === v.toUpperCase()
    );
    if (opt) el.value = opt.value;
  };
  const ddmmyy_to_yyyy_mm_dd = (txt) => {
    if (!txt) return '';
    const m = String(txt).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (!m) return '';
    const dd = m[1].padStart(2,'0');
    const mm = m[2].padStart(2,'0');
    const yy = m[3].length===2 ? ('20'+m[3]) : m[3];
    return `${yy}-${mm}-${dd}`;
  };

  // 👉 Normalizador a texto con signo y 2 decimales, como esperan los <select>
  const toSigned2 = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const n = parseFloat(String(val).replace(',', '.'));
    if (isNaN(n)) return '';
    if (Math.abs(n) < 1e-9) return '0.00';
    const t = Math.abs(n).toFixed(2);
    return n > 0 ? `+${t}` : `-${t}`;
  };

  // Identificación y fechas
  set('numero_trabajo', data.numero);
  const hidden = document.getElementById('numero_trabajo_hidden'); if (hidden) hidden.value = data.numero;
  set('fecha', data.fecha);
  set('fecha_retira', ddmmyy_to_yyyy_mm_dd(data.retira) || data.retira || '');

  // Datos básicos
  set('dni', data.dni);
  set('nombre', data.nombre);
  set('telefono', data.telefono);
  set('cristal', data.cristal);
  set('numero_armazon', data.n_armazon);
  set('armazon_detalle', data.det_armazon);
  set('vendedor', data.vendedor);
  setSelectIfExists('distancia_focal', data.dist_focal);

  // Montos / otros
  set('obra_social', data.obra_social);
  set('precio_cristal', data.precio_cristal);
  set('precio_armazon', data.pr ecio_armazon);
  set('precio_otro', data.precio_otro);
  set('forma_pago', data.forma_pago);

  // ===== Graduaciones =====
  // ESF/CIL: normalizo a "+x.xx"/"-x.xx"/"0.00" para que machee con las opciones
  setSelectIfExists('od_esf', toSigned2(data.od_esf));
  setSelectIfExists('od_cil', toSigned2(data.od_cil));
  set('od_eje', (data.od_eje ?? '').toString());

  setSelectIfExists('oi_esf', toSigned2(data.oi_esf));
  setSelectIfExists('oi_cil', toSigned2(data.oi_cil));
  set('oi_eje', (data.oi_eje ?? '').toString());

  // ADD y DNP
  set('add', (data.add ?? '').toString());
  set('dnp', (data.dnp ?? '').toString());

  // Disparar eventos para refrescar validaciones y totales
  [
    'numero_trabajo','fecha','fecha_retira','dni','nombre','telefono','cristal',
    'numero_armazon','armazon_detalle','vendedor','obra_social',
    'precio_cristal','precio_armazon','precio_otro','forma_pago',
    'od_esf','od_cil','od_eje','oi_esf','oi_cil','oi_eje','add','dnp','distancia_focal'
  ].forEach(id=>{
    const el = document.getElementById(id);
    if (el) { el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }
  });

  if (typeof window.__updateTotals === 'function') window.__updateTotals();

  const foco = document.getElementById('telefono') || document.getElementById('cristal');
  if (foco) foco.focus();
})();

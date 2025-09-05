// ===== Prefill desde el historial (robusto) =====
function doPrefillDesdeHistorial(){
  let raw = null, data = null;
  try { raw = sessionStorage.getItem('prefill_trabajo'); } catch {}
  if (!raw) return;
  try { data = JSON.parse(raw); } catch { data = null; }
  try { sessionStorage.removeItem('prefill_trabajo'); } catch {}
  if (!data) return;

  // ---- utils básicos
  const set = (id, val) => { const el = document.getElementById(id); if (el != null) el.value = val ?? ''; };
  const setSelectIfExists = (id, val) => {
    const el = document.getElementById(id); if (!el) return;
    const v = String(val ?? '').trim(); if (!v) return;
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

  // ---- Selecciona opción por NÚMERO (tolerante)
  function setSelectGrad(id, val){
    const sel = document.getElementById(id);
    if (!sel || val === null || val === undefined || val === '') return;

    let n = parseFloat(String(val).replace(',', '.'));
    if (isNaN(n)) {
      // último intento: quizá vino como "+1.25" exacto
      const vtxt = String(val).trim();
      const opt = Array.from(sel.options).find(o => o.value === vtxt || o.textContent === vtxt);
      if (opt) sel.value = opt.value;
      return;
    }

    // redondeo al paso 0.25 por las dudas
    n = Math.round(n * 4) / 4;

    // 1) intentar por texto exacto (+x.xx / -x.xx / 0.00)
    const signed =
      Math.abs(n) < 1e-9 ? '0.00' :
      (n > 0 ? `+${Math.abs(n).toFixed(2)}` : `-${Math.abs(n).toFixed(2)}`);
    const candidates = [signed, n.toFixed(2), String(n)];
    for (const c of candidates){
      const opt = Array.from(sel.options).find(o => o.value === c || o.textContent === c);
      if (opt){ sel.value = opt.value; return; }
    }

    // 2) fallback: por cercanía numérica
    let bestIdx = -1, bestDiff = Infinity;
    for (let i=0;i<sel.options.length;i++){
      const ov = parseFloat(sel.options[i].value.replace('+',''));
      if (isNaN(ov)) continue;
      const diff = Math.abs(ov - n);
      if (diff < 1e-6){ bestIdx = i; break; }
      if (diff < bestDiff){ bestDiff = diff; bestIdx = i; }
    }
    if (bestIdx >= 0) sel.selectedIndex = bestIdx;
  }

  // ---- tomar el primer campo presente entre varios alias
  const pick = (...keys) => {
    for (const k of keys) {
      if (k in data && data[k] !== '' && data[k] !== null && data[k] !== undefined) return data[k];
    }
    return '';
  };

  // ------- Identificación y fechas
  const numero = pick('numero','num','nro','n_trabajo');
  set('numero_trabajo', numero);
  const hidden = document.getElementById('numero_trabajo_hidden'); if (hidden) hidden.value = numero;
  set('fecha', pick('fecha')); // tu input es de texto
  set('fecha_retira', ddmmyy_to_yyyy_mm_dd(pick('retira','prometida','fecha_prometida')) || pick('retira','prometida','fecha_prometida') || '');

  // ------- Datos básicos
  set('dni',        pick('dni','documento'));
  set('nombre',     pick('nombre','cliente'));
  set('telefono',   pick('telefono','tel'));
  set('cristal',    pick('cristal','tipo_cristal'));
  set('numero_armazon', pick('n_armazon','numero_armazon','n_arma','arma_n'));
  set('armazon_detalle', pick('det_armazon','armazon','detalle','detalle_armazon'));
  set('vendedor',   pick('vendedor'));
  setSelectIfExists('distancia_focal', pick('dist_focal','distancia_focal'));

  // ------- Montos / otros
  set('obra_social',     pick('obra_social','os'));
  set('precio_cristal',  pick('precio_cristal'));
  set('precio_armazon',  pick('precio_armazon'));
  set('precio_otro',     pick('precio_otro'));
  set('forma_pago',      pick('forma_pago','pago'));

  // ------- Graduaciones (usa setSelectGrad numérico)
  setSelectGrad('od_esf', pick('od_esf','OD_ESF','OD ESF','odEsf','esf_od','OD_ESFERA','OD ESFERA'));
  setSelectGrad('od_cil', pick('od_cil','OD_CIL','OD CIL','odCil','cil_od','OD_CILINDRO','OD CILINDRO'));
  set('od_eje', (pick('od_eje','OD_EJE','OD EJE','odEje','eje_od') ?? '').toString());

  setSelectGrad('oi_esf', pick('oi_esf','OI_ESF','OI ESF','oiEsf','esf_oi','OI_ESFERA','OI ESFERA'));
  setSelectGrad('oi_cil', pick('oi_cil','OI_CIL','OI CIL','oiCil','cil_oi','OI_CILINDRO','OI CILINDRO'));
  set('oi_eje', (pick('oi_eje','OI_EJE','OI EJE','oiEje','eje_oi') ?? '').toString());

  // Otros
  set('add', (pick('add','ADD') ?? '').toString());
  set('dnp', (pick('dnp','DNP') ?? '').toString());

  // refrescos
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
}

// /js/print.js — v2025-09-08r (robusto: usa #print-root o cae a .wrap / body)

function __collectStyles() {
  // Copiamos todos los CSS <link rel="stylesheet"> que ya cargaste
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map(l => `<link rel="stylesheet" href="${l.href}">`)
    .join('');
  // Refuerzos para impresión A4
  const hard = `
    <style>
      @page { size: A4; margin: 8mm; }
      html, body { background:#fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; height:auto!important; overflow:visible!important; }
      .no-print { display: none !important; }
      .print-only { display: block !important; }
      .sheet { width: 194mm; box-sizing: border-box; padding: 6mm; page-break-inside: avoid; }
    </style>
  `;
  return links + hard;
}

function __resolvePrintableNode() {
  // 1) Preferimos #print-root si existe y tiene contenido
  const root = document.getElementById('print-root');
  if (root && root.children.length > 0) return root;

  // 2) Si no, clonamos .wrap (tu layout principal)
  const wrap = document.querySelector('.wrap');
  if (wrap) {
    const tmp = document.createElement('div');
    tmp.className = 'sheet'; // Para que aplique ancho A4
    tmp.appendChild(wrap.cloneNode(true));
    // Quitamos lo que sea no imprimible
    tmp.querySelectorAll('.no-print').forEach(n => n.remove());
    return tmp;
  }

  // 3) Fallback: el body entero
  const tmp2 = document.createElement('div');
  tmp2.className = 'sheet';
  tmp2.innerHTML = document.body.innerHTML;
  tmp2.querySelectorAll('.no-print').forEach(n => n.remove());
  return tmp2;
}

function __buildPrintHTML(contentNode) {
  return `
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      ${__collectStyles()}
      <title>Imprimir</title>
    </head>
    <body>
      ${contentNode.outerHTML}
    </body>
    </html>
  `;
}

function __printInIframe(html) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0'; iframe.style.bottom = '0';
  iframe.style.width  = '0'; iframe.style.height = '0'; iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();

  const go = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        setTimeout(() => document.body.removeChild(iframe), 1200);
      }
    }, 80);
  };
  iframe.onload = () => setTimeout(go, 200);
}

function buildPrintArea() {
  // Si vos armás #print-root dinámicamente, dejalo listo ANTES de llamar acá.
  const node = __resolvePrintableNode();
  const html = __buildPrintHTML(node);
  __printInIframe(html);
}

// API pública
window.__buildPrintArea = buildPrintArea;
export {};

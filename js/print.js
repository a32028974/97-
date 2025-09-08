// /RECETAS/js/print.js — v2025-09-08 (A4 en iframe, sin "screenshot")

/**
 * 1) Toma el contenido de #print-root (tu layout ya armado con los datos)
 * 2) Lo copia a un iframe oculto con sólo los CSS necesarios
 * 3) Llama a print() dentro del iframe (Chrome/Android respeta @page y A4)
 */
function __buildPrintHTML(printNode) {
  // Tomamos TODOS tus <link rel="stylesheet"> para mantener estilos
  const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((l) => `<link rel="stylesheet" href="${l.href}">`)
    .join('');

  // Hardening para impresión A4 y ocultar lo que no es de papel
  const hardCSS = `
    <style>
      @page { size: A4; margin: 8mm; }
      html, body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .print-only { display: block !important; }
      /* Por si tu layout depende de .sheet */
      .sheet { width: 194mm; box-sizing: border-box; padding: 6mm; page-break-inside: avoid; }
      /* Evitar scroll y recortes raros en Android */
      html, body { height: auto !important; overflow: visible !important; }
    </style>
  `;

  return `
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      ${cssLinks}
      ${hardCSS}
      <title>Imprimir</title>
    </head>
    <body>
      ${printNode.outerHTML}
    </body>
    </html>
  `;
}

function __printInIframe(html) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Importante: esperar a que carguen CSS/imágenes (QR) antes de imprimir
  const tryPrint = () => {
    // Algunos navegadores necesitan un pequeño delay extra
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      // Limpieza
      setTimeout(() => { document.body.removeChild(iframe); }, 1500);
    }, 50);
  };

  // onload dispara cuando el HTML está parseado; damos tiempo a CSS/IMG
  iframe.onload = () => setTimeout(tryPrint, 200);
}

/**
 * Punto de entrada: arma el HTML de #print-root y lo imprime en iframe.
 * Llamada esperada desde tu main: window.__buildPrintArea()
 */
function buildPrintArea() {
  const root = document.getElementById('print-root');
  if (!root) {
    console.warn('[print] No existe #print-root para imprimir.');
    if (window.Swal) Swal.fire('Atención', 'No se encontró el contenido a imprimir (#print-root).', 'warning');
    return;
  }
  // IMPORTANTE: si #print-root se construye dinámicamente, asegurate de
  // tenerlo listo ANTES de llamar a buildPrintArea().
  const html = __buildPrintHTML(root);
  __printInIframe(html);
}

// Exponemos la función para que el main la invoque
window.__buildPrintArea = buildPrintArea;
export {}; // ES module noop

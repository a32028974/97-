// js/buscarNombre.js
import { API_URL, withParams, apiGet } from './api.js';

/**
 * Completa nombre y teléfono a partir del DNI.
 * - Usa SweetAlert (modal bloqueante) mientras busca
 * - Si el usuario presionó Tab desde DNI, al terminar pone foco en #nombre (o #telefono si no existe)
 */
export async function buscarNombrePorDNI(dniEl, nombreEl, telefonoEl, indicatorEl) {
  const dni = String(dniEl?.value || '').replace(/\D+/g, '');
  if (!dni) {
    if (nombreEl)   nombreEl.value   = '';
    if (telefonoEl) telefonoEl.value = '';
    return null;
  }

  // Loader bloqueante (mantiene foco dentro, pero luego lo reasignamos)
  if (window.Swal) {
    Swal.fire({
      title: 'Buscando…',
      text: `Consultando historial del cliente (DNI ${dni})`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
      willClose: () => {
        // al cerrar, si veníamos con Tab desde DNI, avanzamos al siguiente campo
        if (window.__dniGoNext) {
          window.__dniGoNext = false;
          if (nombreEl) nombreEl.focus();
          else if (telefonoEl) telefonoEl.focus();
        }
      }
    });
  }
  if (indicatorEl) indicatorEl.style.visibility = 'visible';

  try {
    const url  = withParams(API_URL, { buscarDNI: dni, json: 1 });
    const data = await apiGet(url);

    const nombre   = (data?.nombre   || '').toUpperCase().trim();
    const telefono = (data?.telefono || '').trim();

    if (nombreEl)   nombreEl.value   = nombre;
    if (telefonoEl) {
      telefonoEl.value = telefono;
      // disparamos change para que se regenere el número de trabajo si corresponde
      telefonoEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return data;
  } catch (err) {
    console.error('buscarNombrePorDNI:', err);
    if (nombreEl)   nombreEl.value   = '';
    if (telefonoEl) telefonoEl.value = '';
    return null;
  } finally {
    if (indicatorEl) indicatorEl.style.visibility = 'hidden';
    if (window.Swal) Swal.close();
  }
}

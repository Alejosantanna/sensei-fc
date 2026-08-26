import {
  listarSponsors, crearSponsor, listarSponsorPagos, crearSponsorPago,
  actualizarSponsor, cambiarEstadoSponsor, borrarSponsor,
  actualizarSponsorPago, borrarSponsorPago,
} from '../api.js';
import { formatearMoneda, formatearFecha } from '../formato.js';
import { elemento, abrirModal, avisar, confirmar } from '../ui.js';
import { dibujarVistaActual } from '../router.js';

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

// Mismo formulario para alta y edicion. `sinPagos` decide si se puede
// borrar de verdad o solo archivar: borrar un sponsor con pagos chocaria
// contra la clave foranea de la base.
function formularioSponsor(existente = null, sinPagos = false) {
  const form = elemento('form', {}, [
    elemento('label', { for: 's-nombre', texto: 'Nombre' }),
    elemento('input', { id: 's-nombre', name: 'nombre', required: true, value: existente?.nombre ?? '' }),
    elemento('label', { for: 's-instagram', texto: 'Instagram (opcional)' }),
    elemento('input', {
      id: 's-instagram', name: 'instagram', placeholder: '@boutique.bordenave',
      value: existente?.instagram ?? '',
    }),
    elemento('label', { for: 's-contacto', texto: 'Contacto (opcional)' }),
    elemento('input', { id: 's-contacto', name: 'contacto', value: existente?.contacto ?? '' }),
    elemento('label', { for: 's-monto', texto: 'Monto comprometido' }),
    elemento('input', {
      id: 's-monto', name: 'monto', type: 'number', min: '0', required: true,
      value: existente?.monto_comprometido ?? '',
    }),
    elemento('label', { for: 's-temporada', texto: 'Temporada' }),
    elemento('input', {
      id: 's-temporada', name: 'temporada',
      value: existente?.temporada ?? String(new Date().getFullYear()),
    }),
    elemento('button', {
      type: 'submit', clase: 'boton-principal',
      texto: existente ? 'Guardar cambios' : 'Agregar sponsor',
    }),
  ]);

  const { cerrar } = abrirModal(existente ? `Editar ${existente.nombre}` : 'Nuevo sponsor', form);

  if (existente) {
    const acciones = [
      elemento('button', {
        type: 'button',
        clase: 'boton-texto',
        texto: existente.activo ? 'Archivar' : 'Reactivar',
        onClick: async () => {
          try {
            await cambiarEstadoSponsor(existente.id, !existente.activo);
            cerrar();
            avisar(existente.activo ? 'Sponsor archivado.' : 'Sponsor reactivado.');
            dibujarVistaActual();
          } catch (error) {
            avisar(error.message, 'error');
          }
        },
      }),
    ];

    if (sinPagos) {
      acciones.push(elemento('button', {
        type: 'button',
        clase: 'boton-texto boton-peligro',
        texto: 'Borrar',
        onClick: async () => {
          if (!(await confirmar(`Borrar a ${existente.nombre}? Esto no se puede deshacer.`))) return;
          try {
            await borrarSponsor(existente.id);
            cerrar();
            avisar('Sponsor borrado.');
            dibujarVistaActual();
          } catch (error) {
            avisar(error.message, 'error');
          }
        },
      }));
    } else {
      acciones.push(elemento('p', {
        clase: 'tenue',
        texto: 'Tiene pagos cargados: se archiva, no se borra.',
      }));
    }

    form.append(elemento('div', { clase: 'fila-botones' }, acciones));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = form.querySelector('button[type=submit]');
    boton.disabled = true;
    const datos = {
      nombre: form.nombre.value.trim(),
      instagram: form.instagram.value.trim(),
      contacto: form.contacto.value.trim(),
      montoComprometido: Number(form.monto.value),
      temporada: form.temporada.value.trim(),
    };
    try {
      if (existente) await actualizarSponsor(existente.id, datos);
      else await crearSponsor(datos);
      cerrar();
      avisar(existente ? 'Sponsor guardado.' : 'Sponsor agregado.');
      dibujarVistaActual();
    } catch (error) {
      avisar(error.message, 'error');
      boton.disabled = false;
    }
  });
}

function formularioEditarPagoSponsor(pago) {
  const form = elemento('form', {}, [
    elemento('label', { for: 'ps-monto', texto: 'Monto' }),
    elemento('input', { id: 'ps-monto', name: 'monto', type: 'number', min: '1', required: true, value: pago.monto }),
    elemento('label', { for: 'ps-fecha', texto: 'Fecha' }),
    elemento('input', { id: 'ps-fecha', name: 'fecha', type: 'date', required: true, value: pago.fecha }),
    elemento('label', { for: 'ps-nota', texto: 'Nota' }),
    elemento('input', { id: 'ps-nota', name: 'nota', value: pago.nota ?? '' }),
    elemento('button', { type: 'submit', clase: 'boton-principal', texto: 'Guardar cambios' }),
  ]);

  const { cerrar } = abrirModal('Corregir pago', form);

  form.append(elemento('div', { clase: 'fila-botones' }, [
    elemento('button', {
      type: 'button',
      clase: 'boton-texto boton-peligro',
      texto: 'Borrar',
      onClick: async () => {
        if (!(await confirmar('Borrar este pago? Esto no se puede deshacer.'))) return;
        try {
          await borrarSponsorPago(pago.id);
          cerrar();
          avisar('Pago borrado.');
          dibujarVistaActual();
        } catch (error) {
          avisar(error.message, 'error');
        }
      },
    }),
  ]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = form.querySelector('button[type=submit]');
    boton.disabled = true;
    try {
      await actualizarSponsorPago(pago.id, {
        monto: Number(form.monto.value),
        fecha: form.fecha.value,
        nota: form.nota.value.trim(),
      });
      cerrar();
      avisar('Pago corregido.');
      dibujarVistaActual();
    } catch (error) {
      avisar(error.message, 'error');
      boton.disabled = false;
    }
  });
}

function formularioPagoSponsor(sponsor) {
  const form = elemento('form', {}, [
    elemento('label', { for: 'sp-monto', texto: 'Monto recibido' }),
    elemento('input', { id: 'sp-monto', name: 'monto', type: 'number', min: '1', required: true }),
    elemento('label', { for: 'sp-fecha', texto: 'Fecha' }),
    elemento('input', { id: 'sp-fecha', name: 'fecha', type: 'date', value: hoyIso(), required: true }),
    elemento('label', { for: 'sp-nota', texto: 'Nota (opcional)' }),
    elemento('input', { id: 'sp-nota', name: 'nota' }),
    elemento('button', { type: 'submit', clase: 'boton-principal', texto: 'Registrar' }),
  ]);

  const { cerrar } = abrirModal(`Pago de ${sponsor.nombre}`, form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = form.querySelector('button');
    boton.disabled = true;
    try {
      await crearSponsorPago({
        sponsorId: sponsor.id,
        monto: Number(form.monto.value),
        fecha: form.fecha.value,
        nota: form.nota.value.trim(),
      });
      cerrar();
      avisar('Pago registrado.');
      dibujarVistaActual();
    } catch (error) {
      avisar(error.message, 'error');
      boton.disabled = false;
    }
  });
}

async function tarjetaSponsor(sponsor) {
  const pagos = await listarSponsorPagos(sponsor.id);

  const historial = elemento('div', {}, pagos.map((p) =>
    elemento('div', { clase: 'fila' }, [
      elemento('span', { clase: 'tenue', texto: formatearFecha(p.fecha) }),
      elemento('span', { clase: 'fila-crece', texto: p.nota || 'Pago' }),
      elemento('span', { clase: 'al-dia', texto: formatearMoneda(p.monto) }),
      elemento('button', {
        clase: 'boton-texto',
        texto: 'Corregir',
        onClick: () => formularioEditarPagoSponsor(p),
      }),
    ]),
  ));
  historial.hidden = true;

  const detalle = elemento('button', {
    clase: 'boton-texto',
    texto: 'Ver pagos',
    onClick: (e) => {
      historial.hidden = !historial.hidden;
      e.target.textContent = historial.hidden ? 'Ver pagos' : 'Ocultar pagos';
    },
  });

  return elemento('div', { clase: 'tarjeta' }, [
    elemento('div', { clase: 'fila' }, [
      elemento('span', { clase: 'fila-crece' }, [
        elemento('strong', { texto: sponsor.nombre }),
        elemento('p', {
          clase: 'tenue',
          texto: [sponsor.instagram, sponsor.temporada, sponsor.activo ? null : 'archivado']
            .filter(Boolean).join(' · '),
        }),
      ]),
      elemento('span', {
        clase: sponsor.pendiente > 0 ? 'debe' : 'al-dia',
        texto: sponsor.pendiente > 0 ? `Falta ${formatearMoneda(sponsor.pendiente)}` : 'Completo',
      }),
      elemento('button', {
        clase: 'boton-texto',
        texto: 'Editar',
        onClick: () => formularioSponsor(sponsor, pagos.length === 0),
      }),
    ]),
    elemento('p', {
      clase: 'tenue',
      texto: `Comprometido ${formatearMoneda(sponsor.monto_comprometido)} · Cobrado ${formatearMoneda(sponsor.cobrado)}`,
    }),
    elemento('div', { clase: 'fila-botones' }, [
      detalle,
      elemento('button', { clase: 'boton-principal', texto: 'Registrar pago', onClick: () => formularioPagoSponsor(sponsor) }),
    ]),
    historial,
  ]);
}

export default async function dibujar(contenedor) {
  const sponsors = await listarSponsors();

  contenedor.append(elemento('div', { clase: 'encabezado-vista' }, [
    elemento('h1', { texto: 'Sponsors' }),
    elemento('button', { clase: 'boton-principal', texto: '+ Agregar', onClick: () => formularioSponsor() }),
  ]));

  const totalPendiente = sponsors.reduce((s, x) => s + Math.max(x.pendiente, 0), 0);
  contenedor.append(elemento('div', { clase: 'tarjeta' }, [
    elemento('p', { clase: 'tenue', texto: 'Falta cobrar de sponsors' }),
    elemento('p', {
      clase: `numero-grande ${totalPendiente > 0 ? 'debe' : 'al-dia'}`,
      texto: formatearMoneda(totalPendiente),
    }),
  ]));

  if (sponsors.length === 0) {
    contenedor.append(elemento('p', { clase: 'vacio', texto: 'Todavia no hay sponsors cargados.' }));
    return;
  }

  for (const sponsor of sponsors) {
    contenedor.append(await tarjetaSponsor(sponsor));
  }
}

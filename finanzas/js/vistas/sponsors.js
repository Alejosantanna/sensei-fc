import { listarSponsors, crearSponsor, listarSponsorPagos, crearSponsorPago } from '../api.js';
import { formatearMoneda, formatearFecha } from '../formato.js';
import { elemento, abrirModal, avisar } from '../ui.js';
import { dibujarVistaActual } from '../router.js';

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

function formularioSponsor() {
  const form = elemento('form', {}, [
    elemento('label', { for: 's-nombre', texto: 'Nombre' }),
    elemento('input', { id: 's-nombre', name: 'nombre', required: true }),
    elemento('label', { for: 's-instagram', texto: 'Instagram (opcional)' }),
    elemento('input', { id: 's-instagram', name: 'instagram', placeholder: '@boutique.bordenave' }),
    elemento('label', { for: 's-contacto', texto: 'Contacto (opcional)' }),
    elemento('input', { id: 's-contacto', name: 'contacto' }),
    elemento('label', { for: 's-monto', texto: 'Monto comprometido' }),
    elemento('input', { id: 's-monto', name: 'monto', type: 'number', min: '0', required: true }),
    elemento('label', { for: 's-temporada', texto: 'Temporada' }),
    elemento('input', { id: 's-temporada', name: 'temporada', value: String(new Date().getFullYear()) }),
    elemento('button', { type: 'submit', clase: 'boton-principal', texto: 'Agregar sponsor' }),
  ]);

  const { cerrar } = abrirModal('Nuevo sponsor', form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = form.querySelector('button');
    boton.disabled = true;
    try {
      await crearSponsor({
        nombre: form.nombre.value.trim(),
        instagram: form.instagram.value.trim(),
        contacto: form.contacto.value.trim(),
        montoComprometido: Number(form.monto.value),
        temporada: form.temporada.value.trim(),
      });
      cerrar();
      avisar('Sponsor agregado.');
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
        elemento('p', { clase: 'tenue', texto: sponsor.instagram || sponsor.temporada || '' }),
      ]),
      elemento('span', {
        clase: sponsor.pendiente > 0 ? 'debe' : 'al-dia',
        texto: sponsor.pendiente > 0 ? `Falta ${formatearMoneda(sponsor.pendiente)}` : 'Completo',
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
    elemento('button', { clase: 'boton-principal', texto: '+ Agregar', onClick: formularioSponsor }),
  ]));

  const totalPendiente = sponsors.reduce((s, x) => s + Math.max(x.pendiente, 0), 0);
  contenedor.append(elemento('div', { clase: 'tarjeta' }, [
    elemento('p', { clase: 'tenue', texto: 'Falta cobrar de sponsors' }),
    elemento('p', { clase: 'numero-grande debe', texto: formatearMoneda(totalPendiente) }),
  ]));

  if (sponsors.length === 0) {
    contenedor.append(elemento('p', { clase: 'vacio', texto: 'Todavia no hay sponsors cargados.' }));
    return;
  }

  for (const sponsor of sponsors) {
    contenedor.append(await tarjetaSponsor(sponsor));
  }
}

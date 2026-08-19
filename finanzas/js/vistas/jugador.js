import { listarJugadores, listarCargos, listarPagos, crearCargos, crearPago } from '../api.js';
import { imputarPagos } from '../calculos.js';
import { textoJugador } from '../exportar.js';
import { formatearMoneda, formatearFecha, nombrePeriodo } from '../formato.js';
import { elemento, abrirModal, avisar, copiarAlPortapapeles } from '../ui.js';
import { dibujarVistaActual } from '../router.js';

const CONCEPTOS = {
  cuota: 'Cuota',
  practica: 'Practica',
  equipamiento: 'Equipamiento',
  saldo_inicial: 'Saldo inicial',
  otro: 'Otro',
};

function etiquetaCargo(cargo) {
  if (cargo.descripcion) return cargo.descripcion;
  if (cargo.concepto === 'cuota' && cargo.periodo) return `Cuota ${nombrePeriodo(cargo.periodo)}`;
  return CONCEPTOS[cargo.concepto];
}

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

function formularioCobro(jugador) {
  const form = elemento('form', {}, [
    elemento('label', { for: 'c-monto', texto: 'Monto' }),
    elemento('input', { id: 'c-monto', name: 'monto', type: 'number', min: '1', required: true }),
    elemento('label', { for: 'c-fecha', texto: 'Fecha' }),
    elemento('input', { id: 'c-fecha', name: 'fecha', type: 'date', value: hoyIso(), required: true }),
    elemento('label', { for: 'c-metodo', texto: 'Metodo' }),
    elemento('select', { id: 'c-metodo', name: 'metodo' }, [
      elemento('option', { value: 'efectivo', texto: 'Efectivo' }),
      elemento('option', { value: 'transferencia', texto: 'Transferencia' }),
      elemento('option', { value: 'otro', texto: 'Otro' }),
    ]),
    elemento('label', { for: 'c-nota', texto: 'Nota (opcional)' }),
    elemento('input', { id: 'c-nota', name: 'nota' }),
    elemento('button', { type: 'submit', clase: 'boton-principal', texto: 'Registrar pago' }),
  ]);

  const { cerrar } = abrirModal(`Cobrar a ${jugador.nombre}`, form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = form.querySelector('button');
    boton.disabled = true;
    try {
      await crearPago({
        jugadorId: jugador.id,
        monto: Number(form.monto.value),
        fecha: form.fecha.value,
        metodo: form.metodo.value,
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

function formularioCargo(jugador) {
  const form = elemento('form', {}, [
    elemento('label', { for: 'g-concepto', texto: 'Concepto' }),
    elemento('select', { id: 'g-concepto', name: 'concepto' }, [
      elemento('option', { value: 'practica', texto: 'Practica' }),
      elemento('option', { value: 'equipamiento', texto: 'Equipamiento' }),
      elemento('option', { value: 'cuota', texto: 'Cuota' }),
      elemento('option', { value: 'otro', texto: 'Otro' }),
    ]),
    elemento('label', { for: 'g-descripcion', texto: 'Detalle' }),
    elemento('input', { id: 'g-descripcion', name: 'descripcion', placeholder: 'Camiseta 2026' }),
    elemento('label', { for: 'g-monto', texto: 'Monto' }),
    elemento('input', { id: 'g-monto', name: 'monto', type: 'number', min: '1', required: true }),
    elemento('label', { for: 'g-fecha', texto: 'Fecha' }),
    elemento('input', { id: 'g-fecha', name: 'fecha', type: 'date', value: hoyIso(), required: true }),
    elemento('button', { type: 'submit', clase: 'boton-principal', texto: 'Agregar cargo' }),
  ]);

  const { cerrar } = abrirModal(`Cargo a ${jugador.nombre}`, form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = form.querySelector('button');
    boton.disabled = true;
    try {
      await crearCargos([{
        jugadorId: jugador.id,
        concepto: form.concepto.value,
        descripcion: form.descripcion.value.trim(),
        monto: Number(form.monto.value),
        fecha: form.fecha.value,
      }]);
      cerrar();
      avisar('Cargo agregado.');
      dibujarVistaActual();
    } catch (error) {
      avisar(error.message, 'error');
      boton.disabled = false;
    }
  });
}

export default async function dibujar(contenedor, id) {
  const jugadores = await listarJugadores({ incluirArchivados: true });
  const jugador = jugadores.find((j) => j.id === id);
  if (!jugador) {
    contenedor.append(elemento('p', { clase: 'vacio', texto: 'No se encontro ese jugador.' }));
    return;
  }

  const [cargos, pagos] = await Promise.all([listarCargos(id), listarPagos(id)]);
  const imputados = imputarPagos(cargos, pagos);
  const pendientes = imputados.filter((c) => c.pendiente > 0);

  const encabezado = elemento('div', { clase: 'encabezado-vista' }, [
    elemento('a', { href: '#jugadores', clase: 'boton-texto', texto: '‹ Volver' }),
    elemento('h1', { texto: jugador.nombre }),
  ]);

  const resumen = elemento('div', { clase: 'tarjeta' }, [
    elemento('p', { clase: 'tenue', texto: jugador.deuda > 0 ? 'Debe' : 'Estado' }),
    elemento('p', {
      clase: `numero-grande ${jugador.deuda > 0 ? 'debe' : 'al-dia'}`,
      texto: jugador.deuda > 0
        ? formatearMoneda(jugador.deuda)
        : jugador.deuda < 0 ? `${formatearMoneda(-jugador.deuda)} a favor` : 'Al dia',
    }),
    elemento('div', { clase: 'fila-botones' }, [
      elemento('button', { clase: 'boton-texto', texto: 'Agregar cargo', onClick: () => formularioCargo(jugador) }),
      elemento('button', { clase: 'boton-principal', texto: 'Cobrar', onClick: () => formularioCobro(jugador) }),
    ]),
  ]);

  const botonMensaje = elemento('button', {
    clase: 'boton-texto',
    texto: '📋 Copiar mensaje para WhatsApp',
    onClick: () => copiarAlPortapapeles(
      textoJugador(
        jugador.nombre,
        pendientes.map((c) => ({ etiqueta: etiquetaCargo(c), pendiente: c.pendiente })),
        jugador.deuda,
      ),
    ),
  });

  const historial = elemento('div', { clase: 'tarjeta' }, [
    elemento('h2', { texto: 'Movimientos' }),
  ]);

  const movimientos = [
    ...imputados.map((c) => ({ fecha: c.fecha, texto: etiquetaCargo(c), monto: c.monto, tipo: 'cargo' })),
    ...pagos.map((p) => ({ fecha: p.fecha, texto: `Pago (${p.metodo ?? 'sin metodo'})`, monto: p.monto, tipo: 'pago' })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  if (movimientos.length === 0) {
    historial.append(elemento('p', { clase: 'vacio', texto: 'Todavia no hay movimientos.' }));
  }
  for (const m of movimientos) {
    historial.append(elemento('div', { clase: 'fila' }, [
      elemento('span', { clase: 'tenue', texto: formatearFecha(m.fecha) }),
      elemento('span', { clase: 'fila-crece', texto: m.texto }),
      elemento('span', {
        clase: m.tipo === 'pago' ? 'al-dia' : 'debe',
        texto: `${m.tipo === 'pago' ? '−' : '+'}${formatearMoneda(m.monto)}`,
      }),
    ]));
  }

  contenedor.append(encabezado, resumen, botonMensaje, historial);
}

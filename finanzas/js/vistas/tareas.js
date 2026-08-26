import { listarTareas, crearTarea, actualizarTarea, borrarTarea } from '../api.js';
import { proximoVencimiento, estadoVencimiento } from '../repeticion.js';
import { formatearFecha } from '../formato.js';
import { elemento, abrirModal, avisar, confirmar } from '../ui.js';
import { dibujarVistaActual } from '../router.js';

const REPETICIONES = {
  ninguna: 'Una sola vez',
  semanal: 'Todas las semanas',
  mensual: 'Todos los meses',
};

const ETIQUETA_ESTADO = {
  vencida: 'Atrasada',
  hoy: 'Es hoy',
};

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

function formularioTarea(existente = null) {
  const selectorRepite = elemento('select', { id: 't-repite', name: 'repite' },
    Object.entries(REPETICIONES).map(([valor, texto]) => elemento('option', { value: valor, texto })));
  selectorRepite.value = existente?.repite ?? 'ninguna';

  const form = elemento('form', {}, [
    elemento('label', { for: 't-texto', texto: 'Que hay que hacer' }),
    elemento('input', {
      id: 't-texto', name: 'texto', required: true,
      placeholder: 'Publicar historias en Instagram',
      value: existente?.texto ?? '',
    }),
    elemento('label', { for: 't-vence', texto: 'Para cuando (opcional)' }),
    elemento('input', { id: 't-vence', name: 'vence', type: 'date', value: existente?.vence ?? '' }),
    elemento('label', { for: 't-repite', texto: 'Se repite' }),
    selectorRepite,
    elemento('label', { for: 't-nota', texto: 'Nota (opcional)' }),
    elemento('input', { id: 't-nota', name: 'nota', value: existente?.nota ?? '' }),
    elemento('button', {
      type: 'submit', clase: 'boton-principal',
      texto: existente ? 'Guardar cambios' : 'Agregar tarea',
    }),
  ]);

  const { cerrar } = abrirModal(existente ? 'Editar tarea' : 'Nueva tarea', form);

  if (existente) {
    form.append(elemento('div', { clase: 'fila-botones' }, [
      elemento('button', {
        type: 'button',
        clase: 'boton-texto boton-peligro',
        texto: 'Borrar',
        onClick: async () => {
          if (!(await confirmar(`Borrar "${existente.texto}"? Esto no se puede deshacer.`))) return;
          try {
            await borrarTarea(existente.id);
            cerrar();
            avisar('Tarea borrada.');
            dibujarVistaActual();
          } catch (error) {
            avisar(error.message, 'error');
          }
        },
      }),
    ]));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = form.querySelector('button[type=submit]');
    boton.disabled = true;
    const datos = {
      texto: form.texto.value.trim(),
      vence: form.vence.value || null,
      repite: form.repite.value,
      nota: form.nota.value.trim() || null,
    };
    try {
      if (existente) await actualizarTarea(existente.id, datos);
      else await crearTarea(datos);
      cerrar();
      avisar(existente ? 'Tarea guardada.' : 'Tarea agregada.');
      dibujarVistaActual();
    } catch (error) {
      avisar(error.message, 'error');
      boton.disabled = false;
    }
  });
}

// Marcar hecha: si la tarea se repite no se archiva, se le corre la fecha
// a la proxima vuelta y sigue pendiente.
async function marcarHecha(tarea) {
  const proxima = proximoVencimiento(tarea.vence, tarea.repite, hoyIso());
  try {
    if (proxima) {
      await actualizarTarea(tarea.id, { vence: proxima, hecha: false });
      avisar(`Hecha. La proxima queda para el ${formatearFecha(proxima)}.`);
    } else {
      await actualizarTarea(tarea.id, { hecha: true });
      avisar('Tarea completada.');
    }
    dibujarVistaActual();
  } catch (error) {
    avisar(error.message, 'error');
  }
}

async function reabrir(tarea) {
  try {
    await actualizarTarea(tarea.id, { hecha: false });
    dibujarVistaActual();
  } catch (error) {
    avisar(error.message, 'error');
  }
}

function filaTarea(tarea, hoy) {
  const estado = estadoVencimiento(tarea.vence, hoy);

  const detalles = [];
  if (tarea.vence) detalles.push(formatearFecha(tarea.vence));
  if (tarea.repite !== 'ninguna') detalles.push(REPETICIONES[tarea.repite].toLowerCase());
  if (tarea.nota) detalles.push(tarea.nota);

  const casilla = elemento('button', {
    clase: `casilla-tarea ${tarea.hecha ? 'marcada' : ''}`,
    title: tarea.hecha ? 'Volver a pendientes' : 'Marcar hecha',
    texto: tarea.hecha ? '✓' : '',
    onClick: () => (tarea.hecha ? reabrir(tarea) : marcarHecha(tarea)),
  });

  const etiqueta = !tarea.hecha && ETIQUETA_ESTADO[estado]
    ? elemento('span', { clase: `chip chip-${estado}`, texto: ETIQUETA_ESTADO[estado] })
    : null;

  return elemento('div', { clase: `fila tarea ${tarea.hecha ? 'tarea-hecha' : ''}` }, [
    casilla,
    elemento('span', { clase: 'fila-crece' }, [
      elemento('span', { clase: 'texto-tarea', texto: tarea.texto }),
      detalles.length ? elemento('p', { clase: 'tenue', texto: detalles.join(' · ') }) : null,
    ]),
    etiqueta,
    elemento('button', { clase: 'boton-texto', texto: 'Editar', onClick: () => formularioTarea(tarea) }),
  ]);
}

export default async function dibujar(contenedor) {
  const tareas = await listarTareas();
  const hoy = hoyIso();

  const pendientes = tareas
    .filter((t) => !t.hecha)
    .sort((a, b) => {
      if (!a.vence && !b.vence) return 0;
      if (!a.vence) return 1;      // las que no tienen fecha van al final
      if (!b.vence) return -1;
      return a.vence < b.vence ? -1 : 1;
    });
  const hechas = tareas.filter((t) => t.hecha);
  const atrasadas = pendientes.filter((t) => estadoVencimiento(t.vence, hoy) === 'vencida').length;

  contenedor.append(elemento('div', { clase: 'encabezado-vista' }, [
    elemento('h1', { texto: 'Tareas' }),
    elemento('button', { clase: 'boton-principal', texto: '+ Agregar', onClick: () => formularioTarea() }),
  ]));

  contenedor.append(elemento('div', { clase: 'rejilla' }, [
    elemento('div', { clase: 'tarjeta' }, [
      elemento('p', { clase: 'tenue', texto: 'Pendientes' }),
      elemento('p', { clase: 'numero-grande', texto: String(pendientes.length) }),
    ]),
    elemento('div', { clase: 'tarjeta' }, [
      elemento('p', { clase: 'tenue', texto: 'Atrasadas' }),
      elemento('p', { clase: `numero-grande ${atrasadas > 0 ? 'debe' : 'al-dia'}`, texto: String(atrasadas) }),
    ]),
  ]));

  const lista = elemento('div', { clase: 'tarjeta' });
  if (pendientes.length === 0) {
    lista.append(elemento('p', { clase: 'vacio', texto: 'No queda nada pendiente. 💪' }));
  }
  for (const tarea of pendientes) lista.append(filaTarea(tarea, hoy));
  contenedor.append(lista);

  if (hechas.length > 0) {
    const listaHechas = elemento('div', {});
    for (const tarea of hechas) listaHechas.append(filaTarea(tarea, hoy));
    listaHechas.hidden = true;

    const alternar = elemento('button', {
      clase: 'boton-texto',
      texto: `Ver ${hechas.length} completadas`,
      onClick: (e) => {
        listaHechas.hidden = !listaHechas.hidden;
        e.target.textContent = listaHechas.hidden
          ? `Ver ${hechas.length} completadas`
          : 'Ocultar completadas';
      },
    });

    contenedor.append(elemento('div', { clase: 'tarjeta' }, [alternar, listaHechas]));
  }
}

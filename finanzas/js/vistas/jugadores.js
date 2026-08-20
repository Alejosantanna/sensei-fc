import { listarJugadores, crearJugador, cambiarEstadoJugador, crearCargos, actualizarJugador } from '../api.js';
import { formatearMoneda } from '../formato.js';
import { elemento, abrirModal, confirmar, avisar } from '../ui.js';
import { dibujarVistaActual } from '../router.js';

const FILTROS = {
  todos: (j) => j.activo,
  deudores: (j) => j.activo && j.deuda > 0,
  aldia: (j) => j.activo && j.deuda <= 0,
  archivados: (j) => !j.activo,
};

let filtro = 'todos';
let busqueda = '';

function formularioNuevo() {
  const form = elemento('form', {}, [
    elemento('label', { for: 'n-nombre', texto: 'Nombre y apellido' }),
    elemento('input', { id: 'n-nombre', name: 'nombre', required: true }),
    elemento('label', { for: 'n-dorsal', texto: 'Dorsal (opcional)' }),
    elemento('input', { id: 'n-dorsal', name: 'dorsal', type: 'number', min: '0' }),
    elemento('label', { for: 'n-telefono', texto: 'Telefono (opcional)' }),
    elemento('input', { id: 'n-telefono', name: 'telefono', type: 'tel' }),
    elemento('label', { for: 'n-saldo', texto: 'Saldo que viene debiendo (opcional)' }),
    elemento('input', { id: 'n-saldo', name: 'saldo', type: 'number', min: '0', placeholder: '0' }),
    elemento('button', { type: 'submit', clase: 'boton-principal', texto: 'Agregar' }),
  ]);

  const { cerrar } = abrirModal('Nuevo jugador', form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = form.querySelector('button');
    boton.disabled = true;
    try {
      const nuevo = await crearJugador({
        nombre: form.nombre.value.trim(),
        dorsal: form.dorsal.value ? Number(form.dorsal.value) : null,
        telefono: form.telefono.value.trim(),
      });
      const saldo = Number(form.saldo.value || 0);
      if (saldo > 0) {
        await crearCargos([{
          jugadorId: nuevo.id,
          concepto: 'saldo_inicial',
          descripcion: 'Saldo que traia del Excel',
          monto: saldo,
          fecha: new Date().toISOString().slice(0, 10),
        }]);
      }
      cerrar();
      avisar('Jugador agregado.');
      dibujarVistaActual();
    } catch (error) {
      avisar(error.message, 'error');
      boton.disabled = false;
    }
  });
}

export function formularioEditar(jugador, alGuardar) {
  const form = elemento('form', {}, [
    elemento('label', { for: 'e-nombre', texto: 'Nombre y apellido' }),
    elemento('input', { id: 'e-nombre', name: 'nombre', required: true, value: jugador.nombre }),
    elemento('label', { for: 'e-dorsal', texto: 'Dorsal' }),
    elemento('input', { id: 'e-dorsal', name: 'dorsal', type: 'number', min: '0', value: jugador.dorsal ?? '' }),
    elemento('label', { for: 'e-telefono', texto: 'Telefono' }),
    elemento('input', { id: 'e-telefono', name: 'telefono', type: 'tel', value: jugador.telefono ?? '' }),
    elemento('button', { type: 'submit', clase: 'boton-principal', texto: 'Guardar cambios' }),
  ]);

  const { cerrar } = abrirModal(`Editar a ${jugador.nombre}`, form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = form.querySelector('button');
    boton.disabled = true;
    try {
      await actualizarJugador(jugador.id, {
        nombre: form.nombre.value.trim(),
        dorsal: form.dorsal.value ? Number(form.dorsal.value) : null,
        telefono: form.telefono.value.trim(),
      });
      cerrar();
      avisar('Datos guardados.');
      (alGuardar ?? dibujarVistaActual)();
    } catch (error) {
      avisar(error.message, 'error');
      boton.disabled = false;
    }
  });
}

function filaJugador(jugador) {
  const editar = elemento('button', {
    clase: 'boton-texto',
    texto: 'Editar',
    onClick: (e) => {
      e.stopPropagation();
      formularioEditar(jugador);
    },
  });

  const acciones = elemento('button', {
    clase: 'boton-texto',
    texto: jugador.activo ? 'Archivar' : 'Reactivar',
    onClick: async (e) => {
      e.stopPropagation();
      const verbo = jugador.activo ? 'Archivar' : 'Reactivar';
      if (!(await confirmar(`${verbo} a ${jugador.nombre}?`))) return;
      try {
        await cambiarEstadoJugador(jugador.id, !jugador.activo);
        avisar(`${jugador.nombre} ${jugador.activo ? 'archivado' : 'reactivado'}.`);
        dibujarVistaActual();
      } catch (error) {
        avisar(error.message, 'error');
      }
    },
  });

  const saldo = jugador.deuda > 0
    ? elemento('span', { clase: 'debe', texto: formatearMoneda(jugador.deuda) })
    : elemento('span', { clase: 'al-dia', texto: jugador.deuda < 0 ? `${formatearMoneda(-jugador.deuda)} a favor` : 'Al dia' });

  const fila = elemento('div', { clase: 'fila fila-clicable' }, [
    elemento('span', { clase: 'dorsal', texto: jugador.dorsal ? `#${jugador.dorsal}` : '' }),
    elemento('span', { clase: 'fila-crece', texto: jugador.nombre }),
    saldo,
    editar,
    acciones,
  ]);
  fila.addEventListener('click', () => { location.hash = `jugador/${jugador.id}`; });
  return fila;
}

export default async function dibujar(contenedor) {
  const jugadores = await listarJugadores({ incluirArchivados: true });

  const encabezado = elemento('div', { clase: 'encabezado-vista' }, [
    elemento('h1', { texto: 'Jugadores' }),
    elemento('button', { clase: 'boton-principal', texto: '+ Agregar', onClick: formularioNuevo }),
  ]);

  const buscador = elemento('input', {
    type: 'search',
    placeholder: 'Buscar por nombre',
    value: busqueda,
    onInput: (e) => {
      busqueda = e.target.value;
      pintarLista();
    },
  });

  const selectorFiltro = elemento('select', {
    onChange: (e) => {
      filtro = e.target.value;
      pintarLista();
    },
  }, [
    elemento('option', { value: 'todos', texto: 'Todos' }),
    elemento('option', { value: 'deudores', texto: 'Deudores' }),
    elemento('option', { value: 'aldia', texto: 'Al dia' }),
    elemento('option', { value: 'archivados', texto: 'Archivados' }),
  ]);
  selectorFiltro.value = filtro;

  const lista = elemento('div', { clase: 'tarjeta' });

  function pintarLista() {
    const texto = busqueda.trim().toLowerCase();
    const visibles = jugadores
      .filter(FILTROS[filtro])
      .filter((j) => j.nombre.toLowerCase().includes(texto));
    lista.replaceChildren();
    if (visibles.length === 0) {
      lista.append(elemento('p', { clase: 'vacio', texto: 'No hay jugadores para mostrar.' }));
      return;
    }
    for (const jugador of visibles) lista.append(filaJugador(jugador));
  }

  pintarLista();
  contenedor.append(encabezado, elemento('div', { clase: 'controles' }, [buscador, selectorFiltro]), lista);
}

import { vaciar, elemento } from './ui.js';

const VISTAS = {
  panel: () => import('./vistas/panel.js'),
  jugadores: () => import('./vistas/jugadores.js'),
  deudas: () => import('./vistas/deudas.js'),
  sponsors: () => import('./vistas/sponsors.js'),
  gastos: () => import('./vistas/gastos.js'),
  tareas: () => import('./vistas/tareas.js'),
  ajustes: () => import('./vistas/ajustes.js'),
  jugador: () => import('./vistas/jugador.js'),
};

const contenedor = document.getElementById('vista');

function vistaActual() {
  const [nombre, parametro] = location.hash.replace('#', '').split('/');
  if (nombre === 'jugador' && parametro) return { nombre: 'jugador', parametro };
  return { nombre: VISTAS[nombre] && nombre !== 'jugador' ? nombre : 'panel', parametro: null };
}

function marcarActiva(nombre) {
  for (const enlace of document.querySelectorAll('#navegacion a')) {
    enlace.classList.toggle('activa', enlace.dataset.vista === nombre);
  }
}

export async function dibujarVistaActual() {
  const { nombre, parametro } = vistaActual();
  marcarActiva(nombre === 'jugador' ? 'jugadores' : nombre);
  vaciar(contenedor);
  contenedor.append(elemento('p', { clase: 'vacio', texto: 'Cargando...' }));
  try {
    const modulo = await VISTAS[nombre]();
    vaciar(contenedor);
    await modulo.default(contenedor, parametro);
  } catch (error) {
    vaciar(contenedor);
    contenedor.append(elemento('p', { clase: 'vacio', texto: error.message }));
  }
}

export function irA(nombre) {
  if (location.hash === `#${nombre}`) dibujarVistaActual();
  else location.hash = nombre;
}

export function iniciarRouter() {
  addEventListener('hashchange', dibujarVistaActual);
  dibujarVistaActual();
}

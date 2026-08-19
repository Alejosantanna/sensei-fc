import { vaciar, elemento } from './ui.js';

const VISTAS = {
  panel: () => import('./vistas/panel.js'),
  jugadores: () => import('./vistas/jugadores.js'),
  deudas: () => import('./vistas/deudas.js'),
  sponsors: () => import('./vistas/sponsors.js'),
  gastos: () => import('./vistas/gastos.js'),
  ajustes: () => import('./vistas/ajustes.js'),
};

const contenedor = document.getElementById('vista');

function vistaActual() {
  const nombre = location.hash.replace('#', '');
  return VISTAS[nombre] ? nombre : 'panel';
}

function marcarActiva(nombre) {
  for (const enlace of document.querySelectorAll('#navegacion a')) {
    enlace.classList.toggle('activa', enlace.dataset.vista === nombre);
  }
}

export async function dibujarVistaActual() {
  const nombre = vistaActual();
  marcarActiva(nombre);
  vaciar(contenedor);
  contenedor.append(elemento('p', { clase: 'vacio', texto: 'Cargando...' }));
  try {
    const modulo = await VISTAS[nombre]();
    vaciar(contenedor);
    await modulo.default(contenedor);
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

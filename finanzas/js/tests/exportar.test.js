import test from 'node:test';
import assert from 'node:assert/strict';
import { textoListadoDeudores, textoJugador, aCSV } from '../exportar.js';

test('textoListadoDeudores arma el mensaje con encabezado y total', () => {
  const texto = textoListadoDeudores(
    [
      { dorsal: 10, nombre: 'Antonio Simonet', deuda: 1500 },
      { dorsal: 23, nombre: 'Luis Pedro Silva', deuda: 500 },
    ],
    '2026-08-19',
  );
  assert.equal(
    texto,
    '🟢 SENSEI FC — Cuotas al 19/08\n\n' +
      '#10 Antonio Simonet — $ 1.500\n' +
      '#23 Luis Pedro Silva — $ 500\n\n' +
      'Total a cobrar: $ 2.000',
  );
});

test('textoListadoDeudores omite el numeral si el jugador no tiene dorsal', () => {
  const texto = textoListadoDeudores([{ dorsal: null, nombre: 'Sin Dorsal', deuda: 300 }], '2026-08-19');
  assert.ok(texto.includes('Sin Dorsal — $ 300'));
  assert.equal(texto.includes('#'), false);
});

test('textoListadoDeudores celebra cuando no hay deudores', () => {
  const texto = textoListadoDeudores([], '2026-08-19');
  assert.equal(texto, '🟢 SENSEI FC — Cuotas al 19/08\n\nNo hay deudas pendientes. 💪');
});

test('textoJugador arma el mensaje individual con el detalle', () => {
  const texto = textoJugador(
    'Antonio Simonet',
    [
      { etiqueta: 'Cuota agosto 2026', pendiente: 500 },
      { etiqueta: 'Camiseta 2026', pendiente: 1000 },
    ],
    1500,
  );
  assert.equal(
    texto,
    'Hola Antonio 👋\nTu cuenta en Sensei FC:\n\n' +
      '• Cuota agosto 2026 — $ 500\n' +
      '• Camiseta 2026 — $ 1.000\n\n' +
      'Total: $ 1.500',
  );
});

test('textoJugador usa solo el primer nombre en el saludo', () => {
  const texto = textoJugador('Luis Pedro Silva', [{ etiqueta: 'Cuota', pendiente: 100 }], 100);
  assert.ok(texto.startsWith('Hola Luis 👋'));
});

test('textoJugador avisa cuando esta al dia', () => {
  assert.equal(textoJugador('Antonio Simonet', [], 0), 'Hola Antonio 👋\nEstas al dia con el club. 🟢');
});

test('aCSV escribe el encabezado y las filas', () => {
  const csv = aCSV(
    [{ nombre: 'Nacho Pintos', deuda: 500 }],
    [{ clave: 'nombre', titulo: 'Jugador' }, { clave: 'deuda', titulo: 'Deuda' }],
  );
  assert.equal(csv, 'Jugador,Deuda\r\nNacho Pintos,500');
});

test('aCSV entrecomilla los valores con coma', () => {
  const csv = aCSV([{ d: 'Camiseta, short y medias' }], [{ clave: 'd', titulo: 'Detalle' }]);
  assert.equal(csv, 'Detalle\r\n"Camiseta, short y medias"');
});

test('aCSV duplica las comillas internas', () => {
  const csv = aCSV([{ d: 'Pago "adelantado"' }], [{ clave: 'd', titulo: 'Detalle' }]);
  assert.equal(csv, 'Detalle\r\n"Pago ""adelantado"""');
});

test('aCSV entrecomilla los valores con salto de linea', () => {
  const csv = aCSV([{ d: 'linea1\nlinea2' }], [{ clave: 'd', titulo: 'Detalle' }]);
  assert.equal(csv, 'Detalle\r\n"linea1\nlinea2"');
});

test('aCSV escribe vacio donde el valor es nulo', () => {
  const csv = aCSV([{ d: null }], [{ clave: 'd', titulo: 'Detalle' }]);
  assert.equal(csv, 'Detalle\r\n');
});

test('aCSV sin filas devuelve solo el encabezado', () => {
  assert.equal(aCSV([], [{ clave: 'd', titulo: 'Detalle' }]), 'Detalle');
});

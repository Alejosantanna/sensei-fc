import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sumarMontos,
  cajaClub,
  imputarPagos,
  pendientePorConcepto,
  jugadoresSinCuota,
  resumenGeneracionCuota,
} from '../calculos.js';

test('sumarMontos suma una lista vacia como cero', () => {
  assert.equal(sumarMontos([]), 0);
});

test('sumarMontos suma los montos de la lista', () => {
  assert.equal(sumarMontos([{ monto: 500 }, { monto: 1000 }]), 1500);
});

test('cajaClub suma ingresos y resta gastos', () => {
  const caja = cajaClub({
    pagos: [{ monto: 12000 }],
    sponsorPagos: [{ monto: 30000 }],
    gastos: [{ monto: 8000 }, { monto: 2000 }],
  });
  assert.equal(caja, 32000);
});

test('cajaClub puede quedar en rojo', () => {
  const caja = cajaClub({ pagos: [], sponsorPagos: [], gastos: [{ monto: 5000 }] });
  assert.equal(caja, -5000);
});

// ─── Imputacion de pagos por antiguedad ───

const CARGOS = [
  { id: 'b', concepto: 'equipamiento', descripcion: 'Camiseta', monto: 1000, fecha: '2026-07-10' },
  { id: 'a', concepto: 'cuota', descripcion: 'Cuota junio', monto: 500, fecha: '2026-06-01' },
];

test('imputarPagos ordena los cargos del mas viejo al mas nuevo', () => {
  const resultado = imputarPagos(CARGOS, []);
  assert.deepEqual(resultado.map((c) => c.id), ['a', 'b']);
});

test('imputarPagos sin pagos deja todo pendiente', () => {
  const resultado = imputarPagos(CARGOS, []);
  assert.deepEqual(resultado.map((c) => c.pendiente), [500, 1000]);
  assert.deepEqual(resultado.map((c) => c.pagado), [0, 0]);
});

test('imputarPagos salda el cargo mas viejo y deja el resto a medias', () => {
  const resultado = imputarPagos(CARGOS, [{ monto: 700, fecha: '2026-07-20' }]);
  assert.deepEqual(resultado.map((c) => c.pagado), [500, 200]);
  assert.deepEqual(resultado.map((c) => c.pendiente), [0, 800]);
});

test('imputarPagos con un pago justo salda exactamente un cargo', () => {
  const resultado = imputarPagos(CARGOS, [{ monto: 500, fecha: '2026-07-20' }]);
  assert.deepEqual(resultado.map((c) => c.pendiente), [0, 1000]);
});

test('imputarPagos con pago mayor al total no deja pendientes ni negativos', () => {
  const resultado = imputarPagos(CARGOS, [{ monto: 5000, fecha: '2026-07-20' }]);
  assert.deepEqual(resultado.map((c) => c.pendiente), [0, 0]);
  assert.deepEqual(resultado.map((c) => c.pagado), [500, 1000]);
});

test('imputarPagos suma varios pagos antes de imputar', () => {
  const resultado = imputarPagos(CARGOS, [{ monto: 300 }, { monto: 400 }]);
  assert.deepEqual(resultado.map((c) => c.pendiente), [0, 800]);
});

test('imputarPagos no modifica la lista original', () => {
  const original = [{ id: 'x', concepto: 'cuota', monto: 500, fecha: '2026-06-01' }];
  imputarPagos(original, [{ monto: 500 }]);
  assert.equal(original[0].pendiente, undefined);
});

test('pendientePorConcepto agrupa lo que falta por concepto', () => {
  const resultado = pendientePorConcepto(CARGOS, [{ monto: 700 }]);
  assert.deepEqual(resultado, { equipamiento: 800 });
});

test('pendientePorConcepto omite los conceptos ya saldados', () => {
  const resultado = pendientePorConcepto(CARGOS, [{ monto: 1500 }]);
  assert.deepEqual(resultado, {});
});

test('pendientePorConcepto acumula varios cargos del mismo concepto', () => {
  const cargos = [
    { id: 'a', concepto: 'cuota', monto: 500, fecha: '2026-06-01' },
    { id: 'b', concepto: 'cuota', monto: 500, fecha: '2026-07-01' },
  ];
  assert.deepEqual(pendientePorConcepto(cargos, []), { cuota: 1000 });
});

// ─── Generacion de la cuota del mes ───

const PLANTEL = [
  { id: 'j1', nombre: 'Nacho Pintos', activo: true },
  { id: 'j2', nombre: 'Mauro Rivas', activo: true },
  { id: 'j3', nombre: 'Ex Jugador', activo: false },
];

test('jugadoresSinCuota devuelve los activos cuando no hay cuotas del periodo', () => {
  const resultado = jugadoresSinCuota(PLANTEL, [], '2026-08');
  assert.deepEqual(resultado.map((j) => j.id), ['j1', 'j2']);
});

test('jugadoresSinCuota excluye a los archivados', () => {
  const resultado = jugadoresSinCuota(PLANTEL, [], '2026-08');
  assert.equal(resultado.some((j) => j.id === 'j3'), false);
});

test('jugadoresSinCuota saltea a quien ya tiene la cuota del periodo', () => {
  const cargos = [{ jugador_id: 'j1', concepto: 'cuota', periodo: '2026-08', monto: 500 }];
  const resultado = jugadoresSinCuota(PLANTEL, cargos, '2026-08');
  assert.deepEqual(resultado.map((j) => j.id), ['j2']);
});

test('jugadoresSinCuota ignora la cuota de otro mes', () => {
  const cargos = [{ jugador_id: 'j1', concepto: 'cuota', periodo: '2026-07', monto: 500 }];
  const resultado = jugadoresSinCuota(PLANTEL, cargos, '2026-08');
  assert.deepEqual(resultado.map((j) => j.id), ['j1', 'j2']);
});

test('jugadoresSinCuota ignora cargos de otro concepto con el mismo periodo', () => {
  const cargos = [{ jugador_id: 'j1', concepto: 'equipamiento', periodo: '2026-08', monto: 500 }];
  const resultado = jugadoresSinCuota(PLANTEL, cargos, '2026-08');
  assert.deepEqual(resultado.map((j) => j.id), ['j1', 'j2']);
});

test('jugadoresSinCuota devuelve vacio cuando ya se genero todo', () => {
  const cargos = [
    { jugador_id: 'j1', concepto: 'cuota', periodo: '2026-08', monto: 500 },
    { jugador_id: 'j2', concepto: 'cuota', periodo: '2026-08', monto: 500 },
  ];
  assert.deepEqual(jugadoresSinCuota(PLANTEL, cargos, '2026-08'), []);
});

test('resumenGeneracionCuota calcula cantidad y total', () => {
  const resumen = resumenGeneracionCuota(PLANTEL, [], '2026-08', 500);
  assert.equal(resumen.cantidad, 2);
  assert.equal(resumen.montoUnitario, 500);
  assert.equal(resumen.total, 1000);
  assert.deepEqual(resumen.pendientes.map((j) => j.id), ['j1', 'j2']);
});

test('resumenGeneracionCuota da total cero cuando no falta nadie', () => {
  const cargos = [
    { jugador_id: 'j1', concepto: 'cuota', periodo: '2026-08', monto: 500 },
    { jugador_id: 'j2', concepto: 'cuota', periodo: '2026-08', monto: 500 },
  ];
  const resumen = resumenGeneracionCuota(PLANTEL, cargos, '2026-08', 500);
  assert.equal(resumen.cantidad, 0);
  assert.equal(resumen.total, 0);
});

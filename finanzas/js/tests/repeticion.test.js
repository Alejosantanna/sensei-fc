import test from 'node:test';
import assert from 'node:assert/strict';
import { proximoVencimiento, estadoVencimiento } from '../repeticion.js';

test('una tarea que no se repite no tiene proxima fecha', () => {
  assert.equal(proximoVencimiento('2026-08-20', 'ninguna', '2026-08-20'), null);
  assert.equal(proximoVencimiento('2026-08-20', null, '2026-08-20'), null);
});

test('la semanal salta siete dias', () => {
  assert.equal(proximoVencimiento('2026-08-20', 'semanal', '2026-08-20'), '2026-08-27');
});

test('la semanal atrasada avanza hasta pasar el dia de hoy', () => {
  // Vencia el 2 de julio y recien la marcan el 20 de agosto.
  assert.equal(proximoVencimiento('2026-07-02', 'semanal', '2026-08-20'), '2026-08-27');
});

test('la semanal cruza el fin de mes', () => {
  assert.equal(proximoVencimiento('2026-08-28', 'semanal', '2026-08-28'), '2026-09-04');
});

test('la mensual cae el mismo dia del mes siguiente', () => {
  assert.equal(proximoVencimiento('2026-08-15', 'mensual', '2026-08-20'), '2026-09-15');
});

test('la mensual recorta el dia si el mes destino es mas corto', () => {
  assert.equal(proximoVencimiento('2026-01-31', 'mensual', '2026-01-31'), '2026-02-28');
});

test('la mensual cruza el fin de anio', () => {
  assert.equal(proximoVencimiento('2026-12-15', 'mensual', '2026-12-15'), '2027-01-15');
});

test('una tarea repetida sin fecha arranca contando desde hoy', () => {
  assert.equal(proximoVencimiento(null, 'semanal', '2026-08-20'), '2026-08-27');
  assert.equal(proximoVencimiento('', 'mensual', '2026-08-20'), '2026-09-20');
});

test('la proxima fecha siempre queda despues de hoy', () => {
  const proxima = proximoVencimiento('2020-01-01', 'semanal', '2026-08-20');
  assert.ok(proxima > '2026-08-20');
});

test('estadoVencimiento distingue vencida, hoy y futura', () => {
  assert.equal(estadoVencimiento('2026-08-19', '2026-08-20'), 'vencida');
  assert.equal(estadoVencimiento('2026-08-20', '2026-08-20'), 'hoy');
  assert.equal(estadoVencimiento('2026-08-21', '2026-08-20'), 'futura');
  assert.equal(estadoVencimiento(null, '2026-08-20'), 'sin-fecha');
});

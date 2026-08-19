import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatearMoneda,
  formatearFecha,
  fechaCorta,
  periodoActual,
  nombrePeriodo,
} from '../formato.js';

test('formatearMoneda agrupa los miles con punto', () => {
  assert.equal(formatearMoneda(1500), '$ 1.500');
  assert.equal(formatearMoneda(500), '$ 500');
  assert.equal(formatearMoneda(1234567), '$ 1.234.567');
});

test('formatearMoneda muestra el cero sin adornos', () => {
  assert.equal(formatearMoneda(0), '$ 0');
});

test('formatearMoneda marca el saldo a favor con signo menos', () => {
  assert.equal(formatearMoneda(-800), '-$ 800');
});

test('formatearFecha no corre el dia por zona horaria', () => {
  assert.equal(formatearFecha('2026-08-19'), '19/08/2026');
  assert.equal(formatearFecha('2026-01-01'), '01/01/2026');
});

test('fechaCorta omite el anio', () => {
  assert.equal(fechaCorta('2026-08-19'), '19/08');
});

test('periodoActual arma el periodo del mes dado', () => {
  assert.equal(periodoActual(new Date(2026, 7, 19)), '2026-08');
  assert.equal(periodoActual(new Date(2026, 0, 5)), '2026-01');
});

test('nombrePeriodo traduce el periodo a texto legible', () => {
  assert.equal(nombrePeriodo('2026-08'), 'agosto 2026');
  assert.equal(nombrePeriodo('2026-12'), 'diciembre 2026');
});

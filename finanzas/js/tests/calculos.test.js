import test from 'node:test';
import assert from 'node:assert/strict';
import { sumarMontos, cajaClub } from '../calculos.js';

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

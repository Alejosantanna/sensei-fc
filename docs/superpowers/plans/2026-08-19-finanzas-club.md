# Sistema de Finanzas Sensei FC — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un panel web de finanzas para el club Sensei FC, en `finanzas/`, que reemplace las planillas de Excel para el control de deudas de jugadores, sponsors y gastos.

**Architecture:** Página estática de una sola pantalla con módulos ES nativos, sin paso de compilación. Tres módulos puros (`formato`, `calculos`, `exportar`) contienen toda la lógica de negocio y se prueban con el ejecutor de Node. Un módulo `api.js` concentra todas las consultas a Supabase; las vistas solo dibujan y nunca hablan con la base directamente.

**Tech Stack:** HTML + CSS + JavaScript (módulos ES nativos), Supabase (Postgres + Auth) cargado desde `esm.sh`, `node --test` para las pruebas, `python -m http.server` para probar en local.

**Spec:** `docs/superpowers/specs/2026-08-19-finanzas-club-design.md`

## Global Constraints

- **Sin dependencias ni paso de build.** No se ejecuta `npm install` en ningún momento. No existe `node_modules`. El único `package.json` permitido es `finanzas/package.json` con exactamente `{"type": "module", "private": true}` — existe solo para que Node interprete los archivos `.js` como módulos ES.
- **Módulos puros sin importaciones.** `formato.js`, `calculos.js` y `exportar.js` no importan nada, no tocan el DOM y no hacen pedidos de red. Es lo que los hace probables con Node.
- **Supabase se importa en un solo lugar:** `finanzas/js/cliente.js`, con `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'`. Ningún otro archivo importa esa URL.
- **Las vistas nunca llaman a Supabase.** Todo pasa por `api.js`.
- **Montos:** enteros. Pesos uruguayos, sin centavos. Nunca `float` para plata.
- **Fechas:** siempre en texto `YYYY-MM-DD`. Nunca construir `new Date("2026-08-19")` para mostrar — eso interpreta la fecha en UTC y puede correr un día. Partir el texto con `.split('-')`.
- **Paleta (heredada de `index.html`):** `--verde: #1a5c3a`, `--verde-oscuro: #0d3d26`, `--dorado: #c9a84c`, `--crema: #f5f0e8`, `--negro: #0a0a0a`.
- **Tipografías:** Bebas Neue (títulos) e Inter (cuerpo), desde Google Fonts, igual que la web del club.
- **Idioma:** toda la interfaz, los nombres de funciones y los mensajes de commit en español.
- **Rama de trabajo:** `finanzas-club`.
- **Correr las pruebas:** `node --test finanzas/js/tests/`
- **Probar a mano:** `python -m http.server 8000` desde la raíz del repo, luego abrir `http://localhost:8000/finanzas/`. Los módulos ES no funcionan abriendo el archivo directamente con doble clic.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `finanzas/package.json` | Marca los `.js` como módulos ES para Node. Sin dependencias. |
| `finanzas/index.html` | Cascarón único: cabecera, contenedor de vistas y navegación. |
| `finanzas/css/estilos.css` | Todos los estilos, con los tokens de color del club. |
| `finanzas/js/formato.js` | Moneda, fechas, períodos. **Puro.** |
| `finanzas/js/calculos.js` | Deudas, caja, imputación por antigüedad, cuota pendiente. **Puro.** |
| `finanzas/js/exportar.js` | Textos de WhatsApp y CSV. **Puro.** |
| `finanzas/js/config.js` | URL y clave pública de Supabase. |
| `finanzas/js/cliente.js` | Única instancia del cliente de Supabase. |
| `finanzas/js/auth.js` | Login, logout, guardia de sesión. |
| `finanzas/js/api.js` | Todas las consultas a la base. |
| `finanzas/js/ui.js` | Ayudantes de dibujo: crear elementos, modales, avisos. |
| `finanzas/js/router.js` | Qué vista se muestra según el hash de la URL. |
| `finanzas/js/app.js` | Arranque: verifica sesión y enciende el router. |
| `finanzas/js/vistas/*.js` | Una vista por pantalla. Solo dibujan y llaman a `api.js`. |
| `finanzas/sql/esquema.sql` | Tablas, índices, vistas y políticas de acceso. |
| `finanzas/js/tests/*.test.js` | Pruebas de los módulos puros. |

---

## Fase A — Lógica pura

Las tareas 1 a 5 no tocan Supabase ni el navegador. Se prueban enteras con Node y
son la base de todo lo demás.

---

### Task 1: Esqueleto del proyecto y módulo de formato

**Files:**
- Create: `finanzas/package.json`
- Create: `finanzas/js/formato.js`
- Test: `finanzas/js/tests/formato.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `formatearMoneda(monto: number) => string`
  - `formatearFecha(iso: string) => string`
  - `fechaCorta(iso: string) => string`
  - `periodoActual(hoy?: Date) => string`
  - `nombrePeriodo(periodo: string) => string`

- [ ] **Step 1: Crear el marcador de módulos**

Crear `finanzas/package.json`:

```json
{
  "type": "module",
  "private": true
}
```

- [ ] **Step 2: Escribir las pruebas que fallan**

Crear `finanzas/js/tests/formato.test.js`:

```js
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
```

- [ ] **Step 3: Correr las pruebas y verificar que fallan**

Run: `node --test finanzas/js/tests/formato.test.js`
Expected: FAIL — `Cannot find module .../formato.js`

- [ ] **Step 4: Escribir la implementación mínima**

Crear `finanzas/js/formato.js`:

```js
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function formatearMoneda(monto) {
  const negativo = monto < 0;
  const entero = Math.abs(Math.round(monto));
  const conPuntos = String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}$ ${conPuntos}`;
}

export function formatearFecha(iso) {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function fechaCorta(iso) {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

export function periodoActual(hoy = new Date()) {
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}`;
}

export function nombrePeriodo(periodo) {
  const [anio, mes] = periodo.split('-');
  return `${MESES[Number(mes) - 1]} ${anio}`;
}
```

- [ ] **Step 5: Correr las pruebas y verificar que pasan**

Run: `node --test finanzas/js/tests/formato.test.js`
Expected: PASS — 7 pruebas en verde.

- [ ] **Step 6: Commit**

```bash
git add finanzas/package.json finanzas/js/formato.js finanzas/js/tests/formato.test.js
git commit -m "Modulo de formato: moneda, fechas y periodos"
```

---

### Task 2: Cálculo de deudas y caja

**Files:**
- Create: `finanzas/js/calculos.js`
- Test: `finanzas/js/tests/calculos.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `sumarMontos(items: {monto:number}[]) => number`
  - `cajaClub({pagos, sponsorPagos, gastos}) => number`

  La deuda de cada jugador **no** se calcula acá: la resuelve la vista SQL
  `saldos_jugadores` de la Task 6 y llega ya lista en el campo `deuda`. Duplicar
  esa resta en JavaScript sería código que nadie llama.

  Donde `Cargo` es `{ id, jugador_id, concepto, descripcion, monto, periodo, fecha }`
  y `Pago` es `{ id, jugador_id, monto, fecha, metodo }`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `finanzas/js/tests/calculos.test.js`:

```js
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
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `node --test finanzas/js/tests/calculos.test.js`
Expected: FAIL — `Cannot find module .../calculos.js`

- [ ] **Step 3: Escribir la implementación mínima**

Crear `finanzas/js/calculos.js`:

```js
export function sumarMontos(items) {
  return items.reduce((total, item) => total + item.monto, 0);
}

export function cajaClub({ pagos, sponsorPagos, gastos }) {
  return sumarMontos(pagos) + sumarMontos(sponsorPagos) - sumarMontos(gastos);
}
```

- [ ] **Step 4: Correr las pruebas y verificar que pasan**

Run: `node --test finanzas/js/tests/calculos.test.js`
Expected: PASS — 4 pruebas en verde.

- [ ] **Step 5: Commit**

```bash
git add finanzas/js/calculos.js finanzas/js/tests/calculos.test.js
git commit -m "Calculo de deuda por jugador y saldo de caja"
```

---

### Task 3: Imputación de pagos por antigüedad

Esta es la regla que permite responder "¿quién debe de equipamiento?" sin atar cada
pago a un cargo. Los pagos se aplican a los cargos del más viejo al más nuevo, y es
un cálculo de presentación: no se escribe nada en la base.

**Files:**
- Modify: `finanzas/js/calculos.js`
- Modify: `finanzas/js/tests/calculos.test.js`

**Interfaces:**
- Consumes: `sumarMontos` de la Task 2.
- Produces:
  - `imputarPagos(cargos: Cargo[], pagos: Pago[]) => CargoImputado[]`
    donde `CargoImputado` es el cargo original más `{ pagado: number, pendiente: number }`,
    devuelto ordenado del más viejo al más nuevo.
  - `pendientePorConcepto(cargos, pagos) => Record<string, number>` — solo conceptos con pendiente mayor a cero.

- [ ] **Step 1: Escribir las pruebas que fallan**

Agregar al final de `finanzas/js/tests/calculos.test.js`:

```js
import { imputarPagos, pendientePorConcepto } from '../calculos.js';

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
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `node --test finanzas/js/tests/calculos.test.js`
Expected: FAIL — `imputarPagos is not a function`

- [ ] **Step 3: Escribir la implementación mínima**

Agregar al final de `finanzas/js/calculos.js`:

```js
export function imputarPagos(cargos, pagos) {
  const ordenados = [...cargos].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
    return String(a.id) < String(b.id) ? -1 : 1;
  });

  let disponible = sumarMontos(pagos);

  return ordenados.map((cargo) => {
    const pagado = Math.min(disponible, cargo.monto);
    disponible -= pagado;
    return { ...cargo, pagado, pendiente: cargo.monto - pagado };
  });
}

export function pendientePorConcepto(cargos, pagos) {
  const porConcepto = {};
  for (const cargo of imputarPagos(cargos, pagos)) {
    if (cargo.pendiente <= 0) continue;
    porConcepto[cargo.concepto] = (porConcepto[cargo.concepto] ?? 0) + cargo.pendiente;
  }
  return porConcepto;
}
```

- [ ] **Step 4: Correr las pruebas y verificar que pasan**

Run: `node --test finanzas/js/tests/calculos.test.js`
Expected: PASS — 14 pruebas en verde (las 4 de la Task 2 más las 10 nuevas).

- [ ] **Step 5: Commit**

```bash
git add finanzas/js/calculos.js finanzas/js/tests/calculos.test.js
git commit -m "Imputacion de pagos por antiguedad para el filtro por concepto"
```

---

### Task 4: Generación de la cuota del mes

**Files:**
- Modify: `finanzas/js/calculos.js`
- Modify: `finanzas/js/tests/calculos.test.js`

**Interfaces:**
- Consumes: nada de tareas previas.
- Produces:
  - `jugadoresSinCuota(jugadores, cargos, periodo) => Jugador[]` — solo jugadores activos.
  - `resumenGeneracionCuota(jugadores, cargos, periodo, montoUnitario) => { pendientes, cantidad, montoUnitario, total }`

- [ ] **Step 1: Escribir las pruebas que fallan**

Agregar al final de `finanzas/js/tests/calculos.test.js`:

```js
import { jugadoresSinCuota, resumenGeneracionCuota } from '../calculos.js';

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
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `node --test finanzas/js/tests/calculos.test.js`
Expected: FAIL — `jugadoresSinCuota is not a function`

- [ ] **Step 3: Escribir la implementación mínima**

Agregar al final de `finanzas/js/calculos.js`:

```js
export function jugadoresSinCuota(jugadores, cargos, periodo) {
  const yaTienen = new Set(
    cargos
      .filter((c) => c.concepto === 'cuota' && c.periodo === periodo)
      .map((c) => c.jugador_id),
  );
  return jugadores.filter((j) => j.activo && !yaTienen.has(j.id));
}

export function resumenGeneracionCuota(jugadores, cargos, periodo, montoUnitario) {
  const pendientes = jugadoresSinCuota(jugadores, cargos, periodo);
  return {
    pendientes,
    cantidad: pendientes.length,
    montoUnitario,
    total: pendientes.length * montoUnitario,
  };
}
```

- [ ] **Step 4: Correr las pruebas y verificar que pasan**

Run: `node --test finanzas/js/tests/calculos.test.js`
Expected: PASS — 22 pruebas en verde.

- [ ] **Step 5: Commit**

```bash
git add finanzas/js/calculos.js finanzas/js/tests/calculos.test.js
git commit -m "Calculo de quien queda pendiente al generar la cuota del mes"
```

---

### Task 5: Textos de WhatsApp y CSV

**Files:**
- Create: `finanzas/js/exportar.js`
- Test: `finanzas/js/tests/exportar.test.js`

**Interfaces:**
- Consumes: `formatearMoneda` y `fechaCorta` de la Task 1. Es la única importación permitida en este módulo — no duplicar el formateo de moneda acá. Sigue siendo puro: sin red, sin DOM.
- Produces:
  - `textoListadoDeudores(deudores: {dorsal, nombre, deuda}[], fechaIso: string) => string`
  - `textoJugador(nombre: string, cargosPendientes: {etiqueta, pendiente}[], total: number) => string`
  - `aCSV(filas: object[], columnas: {clave, titulo}[]) => string`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `finanzas/js/tests/exportar.test.js`:

```js
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
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `node --test finanzas/js/tests/exportar.test.js`
Expected: FAIL — `Cannot find module .../exportar.js`

- [ ] **Step 3: Escribir la implementación mínima**

Crear `finanzas/js/exportar.js`:

```js
import { formatearMoneda, fechaCorta } from './formato.js';

export function textoListadoDeudores(deudores, fechaIso) {
  const encabezado = `🟢 SENSEI FC — Cuotas al ${fechaCorta(fechaIso)}`;
  if (deudores.length === 0) {
    return `${encabezado}\n\nNo hay deudas pendientes. 💪`;
  }
  const lineas = deudores.map((d) => {
    const numeral = d.dorsal ? `#${d.dorsal} ` : '';
    return `${numeral}${d.nombre} — ${formatearMoneda(d.deuda)}`;
  });
  const total = deudores.reduce((suma, d) => suma + d.deuda, 0);
  return `${encabezado}\n\n${lineas.join('\n')}\n\nTotal a cobrar: ${formatearMoneda(total)}`;
}

export function textoJugador(nombre, cargosPendientes, total) {
  const primerNombre = nombre.split(' ')[0];
  if (cargosPendientes.length === 0) {
    return `Hola ${primerNombre} 👋\nEstas al dia con el club. 🟢`;
  }
  const lineas = cargosPendientes.map((c) => `• ${c.etiqueta} — ${formatearMoneda(c.pendiente)}`);
  return `Hola ${primerNombre} 👋\nTu cuenta en Sensei FC:\n\n${lineas.join('\n')}\n\nTotal: ${formatearMoneda(total)}`;
}

function celda(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  if (/[",\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function aCSV(filas, columnas) {
  const encabezado = columnas.map((c) => celda(c.titulo)).join(',');
  const cuerpo = filas.map((fila) => columnas.map((c) => celda(fila[c.clave])).join(','));
  return [encabezado, ...cuerpo].join('\r\n');
}
```

- [ ] **Step 4: Correr las pruebas y verificar que pasan**

Run: `node --test finanzas/js/tests/exportar.test.js`
Expected: PASS — 12 pruebas en verde.

- [ ] **Step 5: Correr toda la suite**

Run: `node --test finanzas/js/tests/`
Expected: PASS — 41 pruebas en verde.

- [ ] **Step 6: Commit**

```bash
git add finanzas/js/exportar.js finanzas/js/tests/exportar.test.js
git commit -m "Exportacion: textos de WhatsApp y generacion de CSV"
```

---

## Fase B — Base de datos

---

### Task 6: Esquema SQL

**Files:**
- Create: `finanzas/sql/esquema.sql`

**Interfaces:**
- Consumes: nada.
- Produces: las tablas `jugadores`, `cargos`, `pagos`, `sponsors`, `sponsor_pagos`, `gastos`, `config` y las vistas `saldos_jugadores` y `saldos_sponsors`, que `api.js` consulta en la Task 9.

**Nota:** este archivo no se ejecuta desde el código. Es el guion que se pega en el editor SQL de Supabase en la Task 7. Se guarda en el repo para poder recrear la base desde cero.

- [ ] **Step 1: Escribir el esquema**

Crear `finanzas/sql/esquema.sql`:

```sql
-- Esquema del sistema de finanzas de Sensei FC.
-- Se pega entero en el editor SQL de Supabase. Es idempotente:
-- se puede volver a correr sin romper nada.

-- ─────────────────────────── Tablas ───────────────────────────

create table if not exists jugadores (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  dorsal      integer,
  telefono    text,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create table if not exists cargos (
  id           uuid primary key default gen_random_uuid(),
  jugador_id   uuid not null references jugadores(id),
  concepto     text not null check (concepto in
                 ('cuota','practica','equipamiento','saldo_inicial','otro')),
  descripcion  text,
  monto        integer not null check (monto > 0),
  periodo      text,
  fecha        date not null default current_date,
  vencimiento  date,
  creado_en    timestamptz not null default now(),
  creado_por   uuid references auth.users(id)
);

-- Impide dos cuotas del mismo mes para el mismo jugador, aunque dos
-- dirigentes toquen el boton de generar al mismo tiempo.
create unique index if not exists cargos_cuota_unica
  on cargos (jugador_id, periodo) where concepto = 'cuota';

create index if not exists cargos_por_jugador on cargos (jugador_id);

create table if not exists pagos (
  id          uuid primary key default gen_random_uuid(),
  jugador_id  uuid not null references jugadores(id),
  monto       integer not null check (monto > 0),
  fecha       date not null default current_date,
  metodo      text check (metodo in ('efectivo','transferencia','otro')),
  nota        text,
  creado_en   timestamptz not null default now(),
  creado_por  uuid references auth.users(id)
);

create index if not exists pagos_por_jugador on pagos (jugador_id);

create table if not exists sponsors (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  contacto           text,
  instagram          text,
  monto_comprometido integer not null default 0 check (monto_comprometido >= 0),
  temporada          text,
  activo             boolean not null default true,
  notas              text,
  creado_en          timestamptz not null default now()
);

create table if not exists sponsor_pagos (
  id          uuid primary key default gen_random_uuid(),
  sponsor_id  uuid not null references sponsors(id),
  monto       integer not null check (monto > 0),
  fecha       date not null default current_date,
  nota        text,
  creado_en   timestamptz not null default now(),
  creado_por  uuid references auth.users(id)
);

create table if not exists gastos (
  id           uuid primary key default gen_random_uuid(),
  fecha        date not null default current_date,
  categoria    text not null check (categoria in
                 ('equipamiento','cancha','arbitraje','liga','otro')),
  descripcion  text not null,
  monto        integer not null check (monto > 0),
  proveedor    text,
  nota         text,
  creado_en    timestamptz not null default now(),
  creado_por   uuid references auth.users(id)
);

create table if not exists config (
  clave          text primary key,
  valor          text not null,
  actualizado_en timestamptz not null default now()
);

insert into config (clave, valor) values
  ('cuota_monto', '500'),
  ('temporada', '2026')
on conflict (clave) do nothing;

-- ─────────────────────────── Vistas ───────────────────────────
-- security_invoker: sin esto la vista corre con los permisos de quien
-- la creo y esquiva las reglas de acceso de las tablas.

create or replace view saldos_jugadores with (security_invoker = true) as
select j.id, j.nombre, j.dorsal, j.telefono, j.activo,
       coalesce(c.total, 0)                        as total_cargos,
       coalesce(p.total, 0)                        as total_pagos,
       coalesce(c.total, 0) - coalesce(p.total, 0) as deuda
from jugadores j
left join (select jugador_id, sum(monto) total from cargos group by 1) c
       on c.jugador_id = j.id
left join (select jugador_id, sum(monto) total from pagos group by 1) p
       on p.jugador_id = j.id;

create or replace view saldos_sponsors with (security_invoker = true) as
select s.id, s.nombre, s.contacto, s.instagram, s.temporada, s.activo,
       s.monto_comprometido,
       coalesce(sp.total, 0)                        as cobrado,
       s.monto_comprometido - coalesce(sp.total, 0) as pendiente
from sponsors s
left join (select sponsor_id, sum(monto) total from sponsor_pagos group by 1) sp
       on sp.sponsor_id = s.id;

-- ──────────────────── Reglas de acceso (RLS) ────────────────────
-- Una sola regla por tabla: quien tiene sesion iniciada puede todo,
-- quien no tiene sesion no ve nada.

alter table jugadores     enable row level security;
alter table cargos        enable row level security;
alter table pagos         enable row level security;
alter table sponsors      enable row level security;
alter table sponsor_pagos enable row level security;
alter table gastos        enable row level security;
alter table config        enable row level security;

drop policy if exists dirigencia on jugadores;
create policy dirigencia on jugadores
  for all to authenticated using (true) with check (true);

drop policy if exists dirigencia on cargos;
create policy dirigencia on cargos
  for all to authenticated using (true) with check (true);

drop policy if exists dirigencia on pagos;
create policy dirigencia on pagos
  for all to authenticated using (true) with check (true);

drop policy if exists dirigencia on sponsors;
create policy dirigencia on sponsors
  for all to authenticated using (true) with check (true);

drop policy if exists dirigencia on sponsor_pagos;
create policy dirigencia on sponsor_pagos
  for all to authenticated using (true) with check (true);

drop policy if exists dirigencia on gastos;
create policy dirigencia on gastos
  for all to authenticated using (true) with check (true);

drop policy if exists dirigencia on config;
create policy dirigencia on config
  for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Verificar que el archivo está completo**

Run: `grep -c "create table if not exists" finanzas/sql/esquema.sql`
Expected: `7`

Run: `grep -c "enable row level security" finanzas/sql/esquema.sql`
Expected: `7`

- [ ] **Step 3: Commit**

```bash
git add finanzas/sql/esquema.sql
git commit -m "Esquema SQL: tablas, vistas y reglas de acceso"
```

---

### Task 7: Crear el proyecto en Supabase (tarea manual del usuario)

**Files:**
- Create: `finanzas/js/config.js`
- Create: `finanzas/LEEME.md`

**Interfaces:**
- Consumes: `finanzas/sql/esquema.sql` de la Task 6.
- Produces: `URL_SUPABASE: string` y `CLAVE_PUBLICA: string`, exportados desde `config.js`, que consume `cliente.js` en la Task 8.

**Esta tarea la ejecuta una persona, no un agente.** El agente crea los dos archivos y escribe las instrucciones; el usuario hace los pasos en el navegador y pega las dos claves.

- [ ] **Step 1: Crear el archivo de configuración con valores vacíos**

Crear `finanzas/js/config.js`:

```js
// Datos de conexion al proyecto de Supabase del club.
//
// La clave publica (anon key) esta disenada para ser publica: no es un
// secreto. Lo que protege los datos son las reglas de acceso del servidor,
// definidas en finanzas/sql/esquema.sql. Sin sesion iniciada no se lee
// ni se escribe nada, aunque alguien copie estas dos lineas.

export const URL_SUPABASE = '';
export const CLAVE_PUBLICA = '';

export const CONFIGURADO = Boolean(URL_SUPABASE && CLAVE_PUBLICA);
```

- [ ] **Step 2: Escribir las instrucciones de puesta en marcha**

Crear `finanzas/LEEME.md`:

```markdown
# Finanzas Sensei FC — Puesta en marcha

## 1. Crear el proyecto en Supabase

1. Entrar a https://supabase.com y crear una cuenta gratuita.
2. **New project**. Nombre: `sensei-fc`. Elegir la region mas cercana
   (South America / São Paulo). Guardar la contrasena de la base en un
   lugar seguro: no se usa en el dia a dia, pero no se puede recuperar.
3. Esperar a que termine de crearse (uno o dos minutos).

## 2. Crear las tablas

1. En el menu lateral: **SQL Editor** → **New query**.
2. Abrir `finanzas/sql/esquema.sql`, copiar todo el contenido y pegarlo.
3. Apretar **Run**. Tiene que decir "Success. No rows returned".

## 3. Cerrar el registro abierto

1. **Authentication** → **Sign In / Providers** → **Email**.
2. Desactivar **Allow new users to sign up** y guardar.

Esto es lo que impide que cualquiera se cree una cuenta y entre a ver la
plata del club.

## 4. Crear los usuarios de la dirigencia

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Poner email y contrasena. Marcar **Auto Confirm User**.
3. Repetir para cada persona que tenga que entrar (dos o tres).

## 5. Copiar las claves al sistema

1. **Project Settings** → **API Keys**.
2. Copiar el **Project URL** y la clave **anon / public**.
3. Pegarlas en `finanzas/js/config.js`:

   export const URL_SUPABASE = 'https://xxxxx.supabase.co';
   export const CLAVE_PUBLICA = 'eyJhbGci...';

## 6. Probar en local

Desde la raiz del repo:

    python -m http.server 8000

Abrir http://localhost:8000/finanzas/ e iniciar sesion con uno de los
usuarios creados.

## 7. Publicar

    git push

El sitio queda en https://alejosantanna.github.io/sensei-fc/finanzas/
```

- [ ] **Step 3: Commit**

```bash
git add finanzas/js/config.js finanzas/LEEME.md
git commit -m "Configuracion de Supabase e instrucciones de puesta en marcha"
```

- [ ] **Step 4: El usuario ejecuta el LEEME**

El usuario sigue los pasos 1 a 5 de `finanzas/LEEME.md` y pega las claves en `config.js`.

Expected: `finanzas/js/config.js` tiene dos valores no vacíos.

**Este paso bloquea todas las tareas siguientes**: sin proyecto de Supabase no se puede verificar ninguna vista. Las tareas 8 en adelante no se dan por terminadas hasta poder abrirlas en el navegador contra la base real.

---

## Fase C — Cascarón y acceso

---

### Task 8: Cascarón, estilos y pantalla de login

**Files:**
- Create: `finanzas/index.html`
- Create: `finanzas/css/estilos.css`
- Create: `finanzas/js/cliente.js`
- Create: `finanzas/js/auth.js`
- Create: `finanzas/js/app.js`

**Interfaces:**
- Consumes: `URL_SUPABASE`, `CLAVE_PUBLICA`, `CONFIGURADO` de la Task 7.
- Produces:
  - `cliente.js`: `export const supabase` — instancia única del cliente.
  - `auth.js`: `iniciarSesion(email, contrasena) => Promise<void>` (lanza `Error` con mensaje en español si falla), `cerrarSesion() => Promise<void>`, `sesionActual() => Promise<Session|null>`.
  - `index.html` con `<div id="pantalla-login">`, `<div id="app">`, `<main id="vista">` y `<nav id="navegacion">`.

- [ ] **Step 1: Crear el cliente de Supabase**

Crear `finanzas/js/cliente.js`:

```js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { URL_SUPABASE, CLAVE_PUBLICA, CONFIGURADO } from './config.js';

if (!CONFIGURADO) {
  throw new Error(
    'Falta configurar Supabase. Segui los pasos de finanzas/LEEME.md y pega las claves en js/config.js.',
  );
}

export const supabase = createClient(URL_SUPABASE, CLAVE_PUBLICA, {
  auth: { persistSession: true, autoRefreshToken: true },
});
```

- [ ] **Step 2: Crear el módulo de sesión**

Crear `finanzas/js/auth.js`:

```js
import { supabase } from './cliente.js';

const MENSAJES = {
  'Invalid login credentials': 'Email o contrasena incorrectos.',
  'Email not confirmed': 'El usuario todavia no esta confirmado.',
};

function traducir(error) {
  if (!navigator.onLine) return new Error('Sin conexion a internet.');
  return new Error(MENSAJES[error.message] ?? `No se pudo entrar: ${error.message}`);
}

export async function iniciarSesion(email, contrasena) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: contrasena });
  if (error) throw traducir(error);
}

export async function cerrarSesion() {
  await supabase.auth.signOut();
}

export async function sesionActual() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
```

- [ ] **Step 3: Crear el cascarón**

Crear `finanzas/index.html`:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#0d3d26">
  <title>Finanzas | Sensei FC</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/estilos.css">
</head>
<body>

  <section id="pantalla-login">
    <form id="form-login" autocomplete="on">
      <img src="../imagenes/EscudoSensei-Bueno.png" alt="Escudo de Sensei FC" class="escudo-login">
      <h1>Finanzas</h1>
      <p class="subtitulo">Sensei FC</p>
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required autocomplete="username">
      <label for="contrasena">Contrase&ntilde;a</label>
      <input type="password" id="contrasena" name="contrasena" required autocomplete="current-password">
      <button type="submit" class="boton-principal">Entrar</button>
      <p id="error-login" class="error" hidden></p>
    </form>
  </section>

  <div id="app" hidden>
    <header id="cabecera">
      <img src="../imagenes/EscudoSensei-Bueno.png" alt="" class="escudo-chico">
      <span class="titulo-cabecera">Finanzas</span>
      <button id="boton-salir" class="boton-texto">Salir</button>
    </header>

    <main id="vista"></main>

    <nav id="navegacion">
      <a href="#panel"     data-vista="panel">Panel</a>
      <a href="#jugadores" data-vista="jugadores">Jugadores</a>
      <a href="#deudas"    data-vista="deudas">Deudas</a>
      <a href="#sponsors"  data-vista="sponsors">Sponsors</a>
      <a href="#gastos"    data-vista="gastos">Gastos</a>
      <a href="#ajustes"   data-vista="ajustes">Ajustes</a>
    </nav>
  </div>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Escribir los estilos**

Crear `finanzas/css/estilos.css`:

```css
:root {
  --verde: #1a5c3a;
  --verde-oscuro: #0d3d26;
  --dorado: #c9a84c;
  --crema: #f5f0e8;
  --negro: #0a0a0a;
  --superficie: #11241b;
  --borde: rgba(245, 240, 232, 0.12);
  --rojo: #e08a8a;
  --tenue: rgba(245, 240, 232, 0.55);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--negro);
  color: var(--crema);
  font-family: 'Inter', system-ui, sans-serif;
  min-height: 100vh;
}

h1, h2, .titulo-cabecera, .numero-grande {
  font-family: 'Bebas Neue', sans-serif;
  letter-spacing: 0.04em;
}

/* ─── Login ─── */
#pantalla-login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: radial-gradient(circle at 50% 0%, var(--verde-oscuro), var(--negro) 70%);
}
#form-login {
  width: min(360px, 100%);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.escudo-login { width: 96px; margin: 0 auto 1rem; }
#form-login h1 { font-size: 2.5rem; text-align: center; line-height: 1; }
.subtitulo { text-align: center; color: var(--dorado); margin-bottom: 1.5rem; letter-spacing: 0.2em; font-size: 0.75rem; text-transform: uppercase; }
label { font-size: 0.8rem; color: var(--tenue); margin-top: 0.5rem; }

input, select, textarea {
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: 8px;
  color: var(--crema);
  padding: 0.75rem;
  font: inherit;
  font-size: 1rem;
  width: 100%;
}
input:focus, select:focus, textarea:focus { outline: 2px solid var(--verde); border-color: var(--verde); }

.boton-principal {
  background: var(--verde);
  color: var(--crema);
  border: none;
  border-radius: 8px;
  padding: 0.85rem;
  font: inherit;
  font-weight: 600;
  font-size: 1rem;
  margin-top: 1.25rem;
  cursor: pointer;
}
.boton-principal:hover { background: #22734a; }
.boton-texto { background: none; border: none; color: var(--tenue); font: inherit; cursor: pointer; }
.error { color: #e88; font-size: 0.85rem; margin-top: 0.75rem; text-align: center; }

/* ─── Cascaron ─── */
#cabecera {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--verde-oscuro);
  border-bottom: 1px solid var(--borde);
  position: sticky;
  top: 0;
  z-index: 10;
}
.escudo-chico { width: 28px; }
.titulo-cabecera { font-size: 1.4rem; flex: 1; }

#vista { padding: 1rem; padding-bottom: 5.5rem; max-width: 900px; margin: 0 auto; }

#navegacion {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  display: flex;
  background: var(--verde-oscuro);
  border-top: 1px solid var(--borde);
  z-index: 10;
}
#navegacion a {
  flex: 1;
  text-align: center;
  padding: 0.7rem 0.2rem;
  color: var(--tenue);
  text-decoration: none;
  font-size: 0.7rem;
  font-weight: 500;
}
#navegacion a.activa { color: var(--dorado); box-shadow: inset 0 2px 0 var(--dorado); }

/* ─── Escritorio ─── */
@media (min-width: 820px) {
  #app { display: grid; grid-template-columns: 200px 1fr; grid-template-rows: auto 1fr; min-height: 100vh; }
  #cabecera { grid-column: 1 / -1; }
  #navegacion {
    position: sticky;
    top: 57px;
    align-self: start;
    flex-direction: column;
    border-top: none;
    border-right: 1px solid var(--borde);
    height: calc(100vh - 57px);
  }
  #navegacion a { text-align: left; padding: 0.8rem 1.25rem; font-size: 0.9rem; }
  #navegacion a.activa { box-shadow: inset 3px 0 0 var(--dorado); }
  #vista { padding: 1.5rem; padding-bottom: 1.5rem; }
}
```

- [ ] **Step 5: Escribir el arranque**

Crear `finanzas/js/app.js`:

```js
import { iniciarSesion, cerrarSesion, sesionActual } from './auth.js';

const pantallaLogin = document.getElementById('pantalla-login');
const app = document.getElementById('app');
const formLogin = document.getElementById('form-login');
const errorLogin = document.getElementById('error-login');

function mostrarApp() {
  pantallaLogin.hidden = true;
  app.hidden = false;
}

function mostrarLogin() {
  pantallaLogin.hidden = false;
  app.hidden = true;
}

formLogin.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  errorLogin.hidden = true;
  const boton = formLogin.querySelector('button');
  boton.disabled = true;
  boton.textContent = 'Entrando...';
  try {
    await iniciarSesion(formLogin.email.value.trim(), formLogin.contrasena.value);
    formLogin.reset();
    mostrarApp();
  } catch (error) {
    errorLogin.textContent = error.message;
    errorLogin.hidden = false;
  } finally {
    boton.disabled = false;
    boton.textContent = 'Entrar';
  }
});

document.getElementById('boton-salir').addEventListener('click', async () => {
  await cerrarSesion();
  mostrarLogin();
});

if (await sesionActual()) {
  mostrarApp();
} else {
  mostrarLogin();
}
```

- [ ] **Step 6: Verificar a mano**

Run: `python -m http.server 8000` desde la raíz del repo, abrir `http://localhost:8000/finanzas/`

Verificar:
1. Aparece la pantalla de login con el escudo del club.
2. Con una contraseña equivocada aparece "Email o contrasena incorrectos."
3. Con las credenciales correctas aparece el cascarón con la navegación.
4. Al recargar la página sigue adentro (la sesión persiste).
5. "Salir" vuelve al login.
6. Achicando la ventana a menos de 820px, la navegación pasa abajo; más ancha, va al costado.

- [ ] **Step 7: Commit**

```bash
git add finanzas/index.html finanzas/css/estilos.css finanzas/js/cliente.js finanzas/js/auth.js finanzas/js/app.js
git commit -m "Cascaron, estilos y pantalla de login"
```

---

## Fase D — Datos y vistas

---

### Task 9: Capa de datos y ayudantes de dibujo

**Files:**
- Create: `finanzas/js/api.js`
- Create: `finanzas/js/ui.js`

**Interfaces:**
- Consumes: `supabase` de la Task 8; las tablas y vistas de la Task 6.
- Produces (`api.js`, todas devuelven promesas y lanzan `Error` con mensaje en español si fallan):
  - `listarJugadores({ incluirArchivados = false }) => Promise<SaldoJugador[]>` donde `SaldoJugador` es `{ id, nombre, dorsal, telefono, activo, total_cargos, total_pagos, deuda }`
  - `crearJugador({ nombre, dorsal, telefono }) => Promise<void>`
  - `cambiarEstadoJugador(id, activo) => Promise<void>`
  - `listarCargos(jugadorId) => Promise<Cargo[]>`
  - `listarPagos(jugadorId) => Promise<Pago[]>`
  - `todosLosCargos() => Promise<Cargo[]>`
  - `crearCargos(cargos) => Promise<void>` — recibe un arreglo, sirve para uno o para muchos
  - `crearPago({ jugadorId, monto, fecha, metodo, nota }) => Promise<void>`
  - `listarSponsors() => Promise<SaldoSponsor[]>`
  - `crearSponsor({ nombre, contacto, instagram, montoComprometido, temporada }) => Promise<void>`
  - `listarSponsorPagos(sponsorId) => Promise<SponsorPago[]>`
  - `crearSponsorPago({ sponsorId, monto, fecha, nota }) => Promise<void>`
  - `listarGastos() => Promise<Gasto[]>`
  - `crearGasto({ fecha, categoria, descripcion, monto, proveedor }) => Promise<void>`
  - `todosLosPagos() => Promise<Pago[]>`
  - `todosLosSponsorPagos() => Promise<SponsorPago[]>`
  - `leerConfig() => Promise<Record<string,string>>`
  - `guardarConfig(clave, valor) => Promise<void>`
- Produces (`ui.js`):
  - `elemento(etiqueta, props, hijos) => HTMLElement`
  - `vaciar(nodo) => void`
  - `avisar(mensaje, tipo) => void` — `tipo` es `'ok'` o `'error'`
  - `abrirModal(titulo, contenido) => { cerrar }`
  - `confirmar(mensaje) => Promise<boolean>`
  - `copiarAlPortapapeles(texto) => Promise<void>`
  - `descargarCSV(nombreArchivo, contenido) => void`

- [ ] **Step 1: Escribir la capa de datos**

Crear `finanzas/js/api.js`:

```js
import { supabase } from './cliente.js';

function revisar({ data, error }, queEstabaHaciendo) {
  if (error) {
    if (!navigator.onLine) throw new Error('Sin conexion a internet. No se guardo nada.');
    throw new Error(`No se pudo ${queEstabaHaciendo}: ${error.message}`);
  }
  return data;
}

// ─── Jugadores ───

export async function listarJugadores({ incluirArchivados = false } = {}) {
  let consulta = supabase.from('saldos_jugadores').select('*').order('dorsal', { nullsFirst: false });
  if (!incluirArchivados) consulta = consulta.eq('activo', true);
  return revisar(await consulta, 'cargar los jugadores');
}

// Devuelve el jugador creado, con su id, para poder encadenar el saldo inicial.
export async function crearJugador({ nombre, dorsal, telefono }) {
  return revisar(
    await supabase
      .from('jugadores')
      .insert({ nombre, dorsal: dorsal || null, telefono: telefono || null })
      .select()
      .single(),
    'agregar el jugador',
  );
}

export async function cambiarEstadoJugador(id, activo) {
  revisar(await supabase.from('jugadores').update({ activo }).eq('id', id), 'cambiar el estado del jugador');
}

// ─── Cargos y pagos ───

export async function listarCargos(jugadorId) {
  return revisar(
    await supabase.from('cargos').select('*').eq('jugador_id', jugadorId).order('fecha'),
    'cargar los cargos',
  );
}

export async function todosLosCargos() {
  return revisar(await supabase.from('cargos').select('*').order('fecha'), 'cargar los cargos');
}

export async function crearCargos(cargos) {
  const filas = cargos.map((c) => ({
    jugador_id: c.jugadorId,
    concepto: c.concepto,
    descripcion: c.descripcion || null,
    monto: c.monto,
    periodo: c.periodo || null,
    fecha: c.fecha,
    vencimiento: c.vencimiento || null,
  }));
  revisar(await supabase.from('cargos').insert(filas), 'guardar el cargo');
}

export async function listarPagos(jugadorId) {
  return revisar(
    await supabase.from('pagos').select('*').eq('jugador_id', jugadorId).order('fecha'),
    'cargar los pagos',
  );
}

export async function todosLosPagos() {
  return revisar(await supabase.from('pagos').select('*'), 'cargar los pagos');
}

export async function crearPago({ jugadorId, monto, fecha, metodo, nota }) {
  revisar(
    await supabase.from('pagos').insert({
      jugador_id: jugadorId,
      monto,
      fecha,
      metodo,
      nota: nota || null,
    }),
    'registrar el pago',
  );
}

// ─── Sponsors ───

export async function listarSponsors() {
  return revisar(await supabase.from('saldos_sponsors').select('*').order('nombre'), 'cargar los sponsors');
}

export async function crearSponsor({ nombre, contacto, instagram, montoComprometido, temporada }) {
  revisar(
    await supabase.from('sponsors').insert({
      nombre,
      contacto: contacto || null,
      instagram: instagram || null,
      monto_comprometido: montoComprometido,
      temporada: temporada || null,
    }),
    'agregar el sponsor',
  );
}

export async function listarSponsorPagos(sponsorId) {
  return revisar(
    await supabase.from('sponsor_pagos').select('*').eq('sponsor_id', sponsorId).order('fecha'),
    'cargar los pagos del sponsor',
  );
}

export async function todosLosSponsorPagos() {
  return revisar(await supabase.from('sponsor_pagos').select('*'), 'cargar los pagos de sponsors');
}

export async function crearSponsorPago({ sponsorId, monto, fecha, nota }) {
  revisar(
    await supabase.from('sponsor_pagos').insert({ sponsor_id: sponsorId, monto, fecha, nota: nota || null }),
    'registrar el pago del sponsor',
  );
}

// ─── Gastos ───

export async function listarGastos() {
  return revisar(await supabase.from('gastos').select('*').order('fecha', { ascending: false }), 'cargar los gastos');
}

export async function crearGasto({ fecha, categoria, descripcion, monto, proveedor }) {
  revisar(
    await supabase.from('gastos').insert({ fecha, categoria, descripcion, monto, proveedor: proveedor || null }),
    'guardar el gasto',
  );
}

// ─── Ajustes ───

export async function leerConfig() {
  const filas = revisar(await supabase.from('config').select('*'), 'cargar los ajustes');
  return Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
}

export async function guardarConfig(clave, valor) {
  revisar(
    await supabase.from('config').upsert({ clave, valor: String(valor), actualizado_en: new Date().toISOString() }),
    'guardar el ajuste',
  );
}
```

- [ ] **Step 2: Escribir los ayudantes de dibujo**

Crear `finanzas/js/ui.js`:

```js
export function elemento(etiqueta, props = {}, hijos = []) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(props)) {
    if (clave === 'clase') nodo.className = valor;
    else if (clave === 'texto') nodo.textContent = valor;
    else if (clave.startsWith('on')) nodo.addEventListener(clave.slice(2).toLowerCase(), valor);
    else if (valor !== null && valor !== undefined && valor !== false) nodo.setAttribute(clave, valor);
  }
  for (const hijo of [].concat(hijos)) {
    if (hijo) nodo.append(hijo);
  }
  return nodo;
}

export function vaciar(nodo) {
  nodo.replaceChildren();
}

export function avisar(mensaje, tipo = 'ok') {
  const aviso = elemento('div', { clase: `aviso aviso-${tipo}`, texto: mensaje });
  document.body.append(aviso);
  setTimeout(() => aviso.remove(), 3500);
}

export function abrirModal(titulo, contenido) {
  const caja = elemento('div', { clase: 'modal-caja' }, [
    elemento('h2', { texto: titulo }),
    contenido,
  ]);
  const fondo = elemento('div', { clase: 'modal-fondo' }, [caja]);
  const cerrar = () => fondo.remove();
  fondo.addEventListener('click', (e) => {
    if (e.target === fondo) cerrar();
  });
  document.body.append(fondo);
  const primerCampo = caja.querySelector('input, select, textarea');
  if (primerCampo) primerCampo.focus();
  return { cerrar };
}

export function confirmar(mensaje) {
  return new Promise((resolver) => {
    const botones = elemento('div', { clase: 'fila-botones' }, [
      elemento('button', { clase: 'boton-texto', texto: 'Cancelar', onClick: () => { cerrar(); resolver(false); } }),
      elemento('button', { clase: 'boton-principal', texto: 'Confirmar', onClick: () => { cerrar(); resolver(true); } }),
    ]);
    const { cerrar } = abrirModal(mensaje, botones);
  });
}

export async function copiarAlPortapapeles(texto) {
  await navigator.clipboard.writeText(texto);
  avisar('Copiado. Ya lo podes pegar en WhatsApp.');
}

export function descargarCSV(nombreArchivo, contenido) {
  // El BOM hace que Excel abra los acentos bien.
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = elemento('a', { href: url, download: nombreArchivo });
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Agregar los estilos de modal, aviso, tarjeta y lista**

Agregar al final de `finanzas/css/estilos.css`:

```css
/* ─── Piezas comunes ─── */
.tarjeta {
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 0.75rem;
}
.fila {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--borde);
}
.fila:last-child { border-bottom: none; }
.fila-crece { flex: 1; min-width: 0; }
.fila-botones { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1rem; }
.dorsal {
  font-family: 'Bebas Neue', sans-serif;
  color: var(--dorado);
  font-size: 1.25rem;
  min-width: 2.2rem;
}
.tenue { color: var(--tenue); font-size: 0.8rem; }
.debe { color: var(--rojo); font-weight: 600; white-space: nowrap; }
.al-dia { color: var(--verde); font-weight: 600; white-space: nowrap; }
.numero-grande { font-size: 2rem; line-height: 1; }
.encabezado-vista { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
.encabezado-vista h1 { font-size: 1.75rem; flex: 1; }
.controles { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
.controles input, .controles select { width: auto; flex: 1; min-width: 140px; }
.vacio { text-align: center; color: var(--tenue); padding: 2.5rem 1rem; }

.rejilla { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin-bottom: 1rem; }

.modal-fondo {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0, 0, 0, 0.7);
  display: grid; place-items: center;
  padding: 1rem;
}
.modal-caja {
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: 14px;
  padding: 1.25rem;
  width: min(420px, 100%);
  max-height: 90vh;
  overflow-y: auto;
}
.modal-caja h2 { font-size: 1.4rem; margin-bottom: 1rem; }

.aviso {
  position: fixed; bottom: 5.5rem; left: 50%; transform: translateX(-50%);
  background: var(--verde); color: var(--crema);
  padding: 0.7rem 1.1rem; border-radius: 999px;
  font-size: 0.9rem; z-index: 60; box-shadow: 0 6px 20px rgba(0,0,0,0.4);
}
.aviso-error { background: #7a2020; }
@media (min-width: 820px) { .aviso { bottom: 1.5rem; } }
```

- [ ] **Step 4: Verificar que la capa de datos responde**

Con el servidor local corriendo y la sesión iniciada, abrir la consola del navegador en `http://localhost:8000/finanzas/` y ejecutar:

```js
const api = await import('./js/api.js');
await api.listarJugadores();
```

Expected: `[]` — un arreglo vacío, sin errores. Si sale un error de permisos, revisar que las políticas de la Task 6 se hayan aplicado.

- [ ] **Step 5: Commit**

```bash
git add finanzas/js/api.js finanzas/js/ui.js finanzas/css/estilos.css
git commit -m "Capa de datos contra Supabase y ayudantes de interfaz"
```

---

### Task 10: Navegación entre vistas

**Files:**
- Create: `finanzas/js/router.js`
- Create: `finanzas/js/vistas/panel.js`
- Create: `finanzas/js/vistas/jugadores.js`
- Create: `finanzas/js/vistas/deudas.js`
- Create: `finanzas/js/vistas/sponsors.js`
- Create: `finanzas/js/vistas/gastos.js`
- Create: `finanzas/js/vistas/ajustes.js`
- Modify: `finanzas/js/app.js`

**Interfaces:**
- Consumes: `vaciar` de la Task 9.
- Produces:
  - `router.js`: `iniciarRouter() => void`, `irA(nombre) => void`
  - Cada archivo de `vistas/` exporta `export default async function dibujar(contenedor) {}`. Las tareas siguientes rellenan estos archivos; acá nacen como marcadores.

- [ ] **Step 1: Crear las seis vistas vacías**

Crear los seis archivos en `finanzas/js/vistas/`. Cada uno con el mismo cuerpo, cambiando solo el nombre:

```js
// finanzas/js/vistas/panel.js
export default async function dibujar(contenedor) {
  contenedor.textContent = 'Panel';
}
```

```js
// finanzas/js/vistas/jugadores.js
export default async function dibujar(contenedor) {
  contenedor.textContent = 'Jugadores';
}
```

```js
// finanzas/js/vistas/deudas.js
export default async function dibujar(contenedor) {
  contenedor.textContent = 'Deudas';
}
```

```js
// finanzas/js/vistas/sponsors.js
export default async function dibujar(contenedor) {
  contenedor.textContent = 'Sponsors';
}
```

```js
// finanzas/js/vistas/gastos.js
export default async function dibujar(contenedor) {
  contenedor.textContent = 'Gastos';
}
```

```js
// finanzas/js/vistas/ajustes.js
export default async function dibujar(contenedor) {
  contenedor.textContent = 'Ajustes';
}
```

- [ ] **Step 2: Escribir el router**

Crear `finanzas/js/router.js`:

```js
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
```

- [ ] **Step 3: Encender el router al entrar**

En `finanzas/js/app.js`, cambiar la importación de la primera línea y la función `mostrarApp`:

```js
import { iniciarSesion, cerrarSesion, sesionActual } from './auth.js';
import { iniciarRouter } from './router.js';
```

```js
let routerEncendido = false;

function mostrarApp() {
  pantallaLogin.hidden = true;
  app.hidden = false;
  if (!routerEncendido) {
    routerEncendido = true;
    iniciarRouter();
  }
}
```

- [ ] **Step 4: Verificar a mano**

Con el servidor local, entrar a `http://localhost:8000/finanzas/`.

Verificar:
1. Al entrar se muestra "Panel" y la pestaña Panel queda marcada en dorado.
2. Tocando cada pestaña cambia el texto y la marca dorada se mueve.
3. La URL cambia a `#jugadores`, `#deudas`, etc.
4. Recargando con `#gastos` en la URL, abre directo en Gastos.
5. Escribiendo `#inventado` en la URL, cae en el Panel sin romperse.

- [ ] **Step 5: Commit**

```bash
git add finanzas/js/router.js finanzas/js/vistas/ finanzas/js/app.js
git commit -m "Navegacion entre las seis vistas"
```

---

### Task 11: Vista de jugadores

**Files:**
- Modify: `finanzas/js/vistas/jugadores.js`

**Interfaces:**
- Consumes: `listarJugadores`, `crearJugador`, `cambiarEstadoJugador` de la Task 9; `formatearMoneda` de la Task 1; `elemento`, `abrirModal`, `confirmar`, `avisar` de la Task 9; `irA` de la Task 10.
- Produces: `dibujar(contenedor)` que muestra la lista. La Task 12 agrega la navegación a la ficha desde acá.

- [ ] **Step 1: Escribir la vista**

Reemplazar `finanzas/js/vistas/jugadores.js`:

```js
import { listarJugadores, crearJugador, cambiarEstadoJugador, crearCargos } from '../api.js';
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

function filaJugador(jugador) {
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

  return elemento('div', { clase: 'fila' }, [
    elemento('span', { clase: 'dorsal', texto: jugador.dorsal ? `#${jugador.dorsal}` : '' }),
    elemento('span', { clase: 'fila-crece', texto: jugador.nombre }),
    saldo,
    acciones,
  ]);
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
```

- [ ] **Step 2: Verificar a mano**

Con el servidor local, entrar a `#jugadores`.

Verificar:
1. "+ Agregar" abre el formulario; se carga un jugador con nombre y dorsal y aparece en la lista.
2. Se carga otro jugador con saldo inicial 3000 y aparece debiendo `$ 3.000` en rojo.
3. El buscador filtra mientras se escribe.
4. El filtro "Deudores" muestra solo al que debe; "Al dia" solo al otro.
5. "Archivar" pide confirmación y el jugador desaparece de "Todos" y aparece en "Archivados".
6. "Reactivar" lo devuelve.

- [ ] **Step 3: Commit**

```bash
git add finanzas/js/vistas/jugadores.js
git commit -m "Vista de jugadores: alta, listado, busqueda y archivado"
```

---

### Task 12: Ficha del jugador

**Files:**
- Create: `finanzas/js/vistas/jugador.js`
- Modify: `finanzas/js/router.js`
- Modify: `finanzas/js/vistas/jugadores.js`

**Interfaces:**
- Consumes: `listarCargos`, `listarPagos`, `crearCargos`, `crearPago` de la Task 9; `imputarPagos` de la Task 3; `textoJugador` de la Task 5; `formatearMoneda`, `formatearFecha`, `nombrePeriodo` de la Task 1.
- Produces: ruta `#jugador/<id>` manejada por el router; `dibujar(contenedor, id)`.

- [ ] **Step 1: Permitir rutas con parámetro en el router**

En `finanzas/js/router.js`, reemplazar `vistaActual` y `dibujarVistaActual`:

```js
function vistaActual() {
  const [nombre, parametro] = location.hash.replace('#', '').split('/');
  if (nombre === 'jugador' && parametro) return { nombre: 'jugador', parametro };
  return { nombre: VISTAS[nombre] ? nombre : 'panel', parametro: null };
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
```

Y agregar la entrada al mapa `VISTAS`:

```js
  jugador: () => import('./vistas/jugador.js'),
```

- [ ] **Step 2: Escribir la ficha**

Crear `finanzas/js/vistas/jugador.js`:

```js
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
```

- [ ] **Step 3: Enlazar la ficha desde la lista**

En `finanzas/js/vistas/jugadores.js`, dentro de `filaJugador`, hacer clicable la fila. Reemplazar el `return` final por:

```js
  const fila = elemento('div', { clase: 'fila fila-clicable' }, [
    elemento('span', { clase: 'dorsal', texto: jugador.dorsal ? `#${jugador.dorsal}` : '' }),
    elemento('span', { clase: 'fila-crece', texto: jugador.nombre }),
    saldo,
    acciones,
  ]);
  fila.addEventListener('click', () => { location.hash = `jugador/${jugador.id}`; });
  return fila;
```

Y agregar al final de `finanzas/css/estilos.css`:

```css
.fila-clicable { cursor: pointer; }
.fila-clicable:hover { background: rgba(245, 240, 232, 0.04); }
```

- [ ] **Step 4: Verificar a mano**

Verificar:
1. Tocando un jugador de la lista se abre su ficha y la URL queda en `#jugador/<id>`.
2. La pestaña "Jugadores" sigue marcada en dorado estando en la ficha.
3. "Agregar cargo" con concepto Equipamiento, detalle "Camiseta 2026", monto 1000 → la deuda sube $ 1.000 y aparece el movimiento.
4. "Cobrar" $700 → la deuda baja a $ 300 y aparece el pago con signo menos.
5. "Copiar mensaje para WhatsApp" copia el texto; al pegarlo dice "Hola <nombre> 👋" y lista los cargos pendientes.
6. Con un jugador sin deuda, el mensaje dice "Estas al dia con el club. 🟢".
7. "‹ Volver" regresa a la lista.

- [ ] **Step 5: Commit**

```bash
git add finanzas/js/vistas/jugador.js finanzas/js/vistas/jugadores.js finanzas/js/router.js finanzas/css/estilos.css
git commit -m "Ficha del jugador con historial, cobro y mensaje de WhatsApp"
```

---

### Task 13: Vista de deudas, carga masiva y exportación

Es la pantalla que contesta la pregunta que más se hace: quién debe plata.

**Files:**
- Modify: `finanzas/js/vistas/deudas.js`

**Interfaces:**
- Consumes: `listarJugadores`, `todosLosCargos`, `todosLosPagos`, `crearCargos` de la Task 9; `pendientePorConcepto` de la Task 3; `textoListadoDeudores` y `aCSV` de la Task 5; `copiarAlPortapapeles` y `descargarCSV` de la Task 9.
- Produces: `dibujar(contenedor)`.

- [ ] **Step 1: Escribir la vista**

Reemplazar `finanzas/js/vistas/deudas.js`:

```js
import { listarJugadores, todosLosCargos, todosLosPagos, crearCargos } from '../api.js';
import { pendientePorConcepto } from '../calculos.js';
import { textoListadoDeudores, aCSV } from '../exportar.js';
import { formatearMoneda } from '../formato.js';
import { elemento, abrirModal, avisar, copiarAlPortapapeles, descargarCSV } from '../ui.js';
import { dibujarVistaActual } from '../router.js';

const CONCEPTOS = {
  todos: 'Todos los conceptos',
  cuota: 'Cuotas',
  practica: 'Practicas',
  equipamiento: 'Equipamiento',
  saldo_inicial: 'Saldo inicial',
  otro: 'Otro',
};

let concepto = 'todos';

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

function formularioMasivo(jugadores) {
  const casillas = jugadores.map((j) =>
    elemento('label', { clase: 'casilla' }, [
      elemento('input', { type: 'checkbox', value: j.id }),
      elemento('span', { texto: j.dorsal ? `#${j.dorsal} ${j.nombre}` : j.nombre }),
    ]),
  );

  const todos = elemento('button', {
    type: 'button',
    clase: 'boton-texto',
    texto: 'Marcar a todos',
    onClick: () => {
      const marcar = casillas.some((l) => !l.querySelector('input').checked);
      for (const l of casillas) l.querySelector('input').checked = marcar;
    },
  });

  const form = elemento('form', {}, [
    elemento('label', { for: 'm-concepto', texto: 'Concepto' }),
    elemento('select', { id: 'm-concepto', name: 'concepto' }, [
      elemento('option', { value: 'equipamiento', texto: 'Equipamiento' }),
      elemento('option', { value: 'practica', texto: 'Practica' }),
      elemento('option', { value: 'otro', texto: 'Otro' }),
    ]),
    elemento('label', { for: 'm-descripcion', texto: 'Detalle' }),
    elemento('input', { id: 'm-descripcion', name: 'descripcion', placeholder: 'Camiseta 2026', required: true }),
    elemento('label', { for: 'm-monto', texto: 'Monto por jugador' }),
    elemento('input', { id: 'm-monto', name: 'monto', type: 'number', min: '1', required: true }),
    elemento('label', { texto: 'A quienes' }),
    todos,
    elemento('div', { clase: 'lista-casillas' }, casillas),
    elemento('button', { type: 'submit', clase: 'boton-principal', texto: 'Cargar a los marcados' }),
  ]);

  const { cerrar } = abrirModal('Cargo a varios jugadores', form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const marcados = casillas.map((l) => l.querySelector('input')).filter((i) => i.checked).map((i) => i.value);
    if (marcados.length === 0) {
      avisar('No marcaste a ningun jugador.', 'error');
      return;
    }
    const boton = form.querySelector('button[type=submit]');
    boton.disabled = true;
    try {
      await crearCargos(marcados.map((jugadorId) => ({
        jugadorId,
        concepto: form.concepto.value,
        descripcion: form.descripcion.value.trim(),
        monto: Number(form.monto.value),
        fecha: hoyIso(),
      })));
      cerrar();
      avisar(`Cargo aplicado a ${marcados.length} jugadores.`);
      dibujarVistaActual();
    } catch (error) {
      avisar(error.message, 'error');
      boton.disabled = false;
    }
  });
}

export default async function dibujar(contenedor) {
  const [jugadores, cargos, pagos] = await Promise.all([
    listarJugadores({ incluirArchivados: true }),
    todosLosCargos(),
    todosLosPagos(),
  ]);

  const porJugador = jugadores.map((j) => {
    const suyos = cargos.filter((c) => c.jugador_id === j.id);
    const susPagos = pagos.filter((p) => p.jugador_id === j.id);
    return { ...j, porConcepto: pendientePorConcepto(suyos, susPagos) };
  });

  const encabezado = elemento('div', { clase: 'encabezado-vista' }, [
    elemento('h1', { texto: 'Deudas' }),
    elemento('button', {
      clase: 'boton-principal',
      texto: '+ Cargo masivo',
      onClick: () => formularioMasivo(jugadores.filter((j) => j.activo)),
    }),
  ]);

  const selector = elemento('select', {
    onChange: (e) => {
      concepto = e.target.value;
      pintar();
    },
  }, Object.entries(CONCEPTOS).map(([valor, texto]) => elemento('option', { value: valor, texto })));
  selector.value = concepto;

  const lista = elemento('div', { clase: 'tarjeta' });
  const total = elemento('p', { clase: 'numero-grande debe' });
  const acciones = elemento('div', { clase: 'fila-botones' });

  function deudoresVisibles() {
    return porJugador
      .map((j) => ({
        ...j,
        pendiente: concepto === 'todos'
          ? Object.values(j.porConcepto).reduce((s, v) => s + v, 0)
          : (j.porConcepto[concepto] ?? 0),
      }))
      .filter((j) => j.pendiente > 0)
      .sort((a, b) => b.pendiente - a.pendiente);
  }

  function pintar() {
    const deudores = deudoresVisibles();
    total.textContent = formatearMoneda(deudores.reduce((s, d) => s + d.pendiente, 0));

    lista.replaceChildren();
    if (deudores.length === 0) {
      lista.append(elemento('p', { clase: 'vacio', texto: 'Nadie debe nada por este concepto. 💪' }));
    }
    for (const d of deudores) {
      const fila = elemento('div', { clase: 'fila fila-clicable' }, [
        elemento('span', { clase: 'dorsal', texto: d.dorsal ? `#${d.dorsal}` : '' }),
        elemento('span', { clase: 'fila-crece', texto: d.nombre }),
        elemento('span', { clase: 'debe', texto: formatearMoneda(d.pendiente) }),
      ]);
      fila.addEventListener('click', () => { location.hash = `jugador/${d.id}`; });
      lista.append(fila);
    }

    acciones.replaceChildren(
      elemento('button', {
        clase: 'boton-texto',
        texto: '📋 Copiar para WhatsApp',
        onClick: () => copiarAlPortapapeles(
          textoListadoDeudores(
            deudores.map((d) => ({ dorsal: d.dorsal, nombre: d.nombre, deuda: d.pendiente })),
            hoyIso(),
          ),
        ),
      }),
      elemento('button', {
        clase: 'boton-texto',
        texto: '⬇ Descargar CSV',
        onClick: () => descargarCSV(
          `deudas-${hoyIso()}.csv`,
          aCSV(
            deudores.map((d) => ({ dorsal: d.dorsal, nombre: d.nombre, deuda: d.pendiente })),
            [
              { clave: 'dorsal', titulo: 'Dorsal' },
              { clave: 'nombre', titulo: 'Jugador' },
              { clave: 'deuda', titulo: 'Debe' },
            ],
          ),
        ),
      }),
    );
  }

  pintar();
  contenedor.append(
    encabezado,
    elemento('div', { clase: 'controles' }, [selector]),
    elemento('div', { clase: 'tarjeta' }, [elemento('p', { clase: 'tenue', texto: 'Total a cobrar' }), total]),
    lista,
    acciones,
  );
}
```

- [ ] **Step 2: Agregar los estilos de las casillas**

Agregar al final de `finanzas/css/estilos.css`:

```css
.lista-casillas { max-height: 240px; overflow-y: auto; border: 1px solid var(--borde); border-radius: 8px; padding: 0.5rem; margin-top: 0.5rem; }
.casilla { display: flex; align-items: center; gap: 0.6rem; padding: 0.35rem 0.25rem; color: var(--crema); font-size: 0.95rem; margin: 0; cursor: pointer; }
.casilla input { width: auto; }
```

- [ ] **Step 3: Verificar a mano**

Con al menos dos jugadores cargados, uno con cuota impaga y otro con equipamiento impago:

1. `#deudas` muestra a los deudores ordenados de mayor a menor.
2. El total de arriba coincide con la suma de las filas.
3. Filtrando por "Equipamiento" queda solo quien debe equipamiento.
4. A un jugador con cuota $500 vieja y camiseta $1.000 nueva, cobrarle $700 → en el filtro "Cuotas" ya no aparece, y en "Equipamiento" aparece con $ 800.
5. "+ Cargo masivo" con detalle "Camiseta 2026", monto 1000, marcando a todos → todos suben $1.000.
6. "Copiar para WhatsApp" copia el listado con encabezado y total.
7. "Descargar CSV" baja un archivo que abre bien en Excel, con acentos correctos.
8. Tocando una fila se abre la ficha del jugador.

- [ ] **Step 4: Commit**

```bash
git add finanzas/js/vistas/deudas.js finanzas/css/estilos.css
git commit -m "Vista de deudas con filtro por concepto, carga masiva y exportacion"
```

---

### Task 14: Vista de sponsors

**Files:**
- Modify: `finanzas/js/vistas/sponsors.js`

**Interfaces:**
- Consumes: `listarSponsors`, `crearSponsor`, `listarSponsorPagos`, `crearSponsorPago` de la Task 9; `formatearMoneda`, `formatearFecha` de la Task 1.
- Produces: `dibujar(contenedor)`.

- [ ] **Step 1: Escribir la vista**

Reemplazar `finanzas/js/vistas/sponsors.js`:

```js
import { listarSponsors, crearSponsor, listarSponsorPagos, crearSponsorPago } from '../api.js';
import { formatearMoneda, formatearFecha } from '../formato.js';
import { elemento, abrirModal, avisar } from '../ui.js';
import { dibujarVistaActual } from '../router.js';

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

function formularioSponsor() {
  const form = elemento('form', {}, [
    elemento('label', { for: 's-nombre', texto: 'Nombre' }),
    elemento('input', { id: 's-nombre', name: 'nombre', required: true }),
    elemento('label', { for: 's-instagram', texto: 'Instagram (opcional)' }),
    elemento('input', { id: 's-instagram', name: 'instagram', placeholder: '@boutique.bordenave' }),
    elemento('label', { for: 's-contacto', texto: 'Contacto (opcional)' }),
    elemento('input', { id: 's-contacto', name: 'contacto' }),
    elemento('label', { for: 's-monto', texto: 'Monto comprometido' }),
    elemento('input', { id: 's-monto', name: 'monto', type: 'number', min: '0', required: true }),
    elemento('label', { for: 's-temporada', texto: 'Temporada' }),
    elemento('input', { id: 's-temporada', name: 'temporada', value: String(new Date().getFullYear()) }),
    elemento('button', { type: 'submit', clase: 'boton-principal', texto: 'Agregar sponsor' }),
  ]);

  const { cerrar } = abrirModal('Nuevo sponsor', form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = form.querySelector('button');
    boton.disabled = true;
    try {
      await crearSponsor({
        nombre: form.nombre.value.trim(),
        instagram: form.instagram.value.trim(),
        contacto: form.contacto.value.trim(),
        montoComprometido: Number(form.monto.value),
        temporada: form.temporada.value.trim(),
      });
      cerrar();
      avisar('Sponsor agregado.');
      dibujarVistaActual();
    } catch (error) {
      avisar(error.message, 'error');
      boton.disabled = false;
    }
  });
}

function formularioPagoSponsor(sponsor) {
  const form = elemento('form', {}, [
    elemento('label', { for: 'sp-monto', texto: 'Monto recibido' }),
    elemento('input', { id: 'sp-monto', name: 'monto', type: 'number', min: '1', required: true }),
    elemento('label', { for: 'sp-fecha', texto: 'Fecha' }),
    elemento('input', { id: 'sp-fecha', name: 'fecha', type: 'date', value: hoyIso(), required: true }),
    elemento('label', { for: 'sp-nota', texto: 'Nota (opcional)' }),
    elemento('input', { id: 'sp-nota', name: 'nota' }),
    elemento('button', { type: 'submit', clase: 'boton-principal', texto: 'Registrar' }),
  ]);

  const { cerrar } = abrirModal(`Pago de ${sponsor.nombre}`, form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = form.querySelector('button');
    boton.disabled = true;
    try {
      await crearSponsorPago({
        sponsorId: sponsor.id,
        monto: Number(form.monto.value),
        fecha: form.fecha.value,
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

async function tarjetaSponsor(sponsor) {
  const pagos = await listarSponsorPagos(sponsor.id);

  const historial = elemento('div', {}, pagos.map((p) =>
    elemento('div', { clase: 'fila' }, [
      elemento('span', { clase: 'tenue', texto: formatearFecha(p.fecha) }),
      elemento('span', { clase: 'fila-crece', texto: p.nota || 'Pago' }),
      elemento('span', { clase: 'al-dia', texto: formatearMoneda(p.monto) }),
    ]),
  ));
  historial.hidden = true;

  const detalle = elemento('button', {
    clase: 'boton-texto',
    texto: 'Ver pagos',
    onClick: (e) => {
      historial.hidden = !historial.hidden;
      e.target.textContent = historial.hidden ? 'Ver pagos' : 'Ocultar pagos';
    },
  });

  return elemento('div', { clase: 'tarjeta' }, [
    elemento('div', { clase: 'fila' }, [
      elemento('span', { clase: 'fila-crece' }, [
        elemento('strong', { texto: sponsor.nombre }),
        elemento('p', { clase: 'tenue', texto: sponsor.instagram || sponsor.temporada || '' }),
      ]),
      elemento('span', {
        clase: sponsor.pendiente > 0 ? 'debe' : 'al-dia',
        texto: sponsor.pendiente > 0 ? `Falta ${formatearMoneda(sponsor.pendiente)}` : 'Completo',
      }),
    ]),
    elemento('p', {
      clase: 'tenue',
      texto: `Comprometido ${formatearMoneda(sponsor.monto_comprometido)} · Cobrado ${formatearMoneda(sponsor.cobrado)}`,
    }),
    elemento('div', { clase: 'fila-botones' }, [
      detalle,
      elemento('button', { clase: 'boton-principal', texto: 'Registrar pago', onClick: () => formularioPagoSponsor(sponsor) }),
    ]),
    historial,
  ]);
}

export default async function dibujar(contenedor) {
  const sponsors = await listarSponsors();

  contenedor.append(elemento('div', { clase: 'encabezado-vista' }, [
    elemento('h1', { texto: 'Sponsors' }),
    elemento('button', { clase: 'boton-principal', texto: '+ Agregar', onClick: formularioSponsor }),
  ]));

  const totalPendiente = sponsors.reduce((s, x) => s + Math.max(x.pendiente, 0), 0);
  contenedor.append(elemento('div', { clase: 'tarjeta' }, [
    elemento('p', { clase: 'tenue', texto: 'Falta cobrar de sponsors' }),
    elemento('p', { clase: 'numero-grande debe', texto: formatearMoneda(totalPendiente) }),
  ]));

  if (sponsors.length === 0) {
    contenedor.append(elemento('p', { clase: 'vacio', texto: 'Todavia no hay sponsors cargados.' }));
    return;
  }

  for (const sponsor of sponsors) {
    contenedor.append(await tarjetaSponsor(sponsor));
  }
}
```

- [ ] **Step 2: Verificar a mano**

1. "+ Agregar" con nombre "Maypu Pinturas", monto comprometido 30000 → aparece con "Falta $ 30.000".
2. "Registrar pago" de 10000 → pasa a "Falta $ 20.000" y arriba el total baja.
3. "Ver pagos" despliega el historial con la fecha y el monto; "Ocultar pagos" lo cierra.
4. Registrando los 20000 restantes, la tarjeta dice "Completo" en verde.

- [ ] **Step 3: Commit**

```bash
git add finanzas/js/vistas/sponsors.js
git commit -m "Vista de sponsors con compromiso y pagos parciales"
```

---

### Task 15: Vista de gastos

**Files:**
- Modify: `finanzas/js/vistas/gastos.js`

**Interfaces:**
- Consumes: `listarGastos`, `crearGasto` de la Task 9; `sumarMontos` de la Task 2; `formatearMoneda`, `formatearFecha`, `periodoActual` de la Task 1; `aCSV` de la Task 5; `descargarCSV` de la Task 9.
- Produces: `dibujar(contenedor)`.

- [ ] **Step 1: Escribir la vista**

Reemplazar `finanzas/js/vistas/gastos.js`:

```js
import { listarGastos, crearGasto } from '../api.js';
import { sumarMontos } from '../calculos.js';
import { aCSV } from '../exportar.js';
import { formatearMoneda, formatearFecha, periodoActual } from '../formato.js';
import { elemento, abrirModal, avisar, descargarCSV } from '../ui.js';
import { dibujarVistaActual } from '../router.js';

const CATEGORIAS = {
  equipamiento: 'Equipamiento',
  cancha: 'Cancha',
  arbitraje: 'Arbitraje',
  liga: 'Liga',
  otro: 'Otro',
};

let mes = 'todos';
let categoria = 'todas';

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

function formularioGasto() {
  const form = elemento('form', {}, [
    elemento('label', { for: 'g-descripcion', texto: 'Que se compro' }),
    elemento('input', { id: 'g-descripcion', name: 'descripcion', required: true, placeholder: 'Juego de pecheras' }),
    elemento('label', { for: 'g-monto', texto: 'Costo' }),
    elemento('input', { id: 'g-monto', name: 'monto', type: 'number', min: '1', required: true }),
    elemento('label', { for: 'g-categoria', texto: 'Categoria' }),
    elemento('select', { id: 'g-categoria', name: 'categoria' },
      Object.entries(CATEGORIAS).map(([valor, texto]) => elemento('option', { value: valor, texto }))),
    elemento('label', { for: 'g-fecha', texto: 'Fecha' }),
    elemento('input', { id: 'g-fecha', name: 'fecha', type: 'date', value: hoyIso(), required: true }),
    elemento('label', { for: 'g-proveedor', texto: 'Proveedor (opcional)' }),
    elemento('input', { id: 'g-proveedor', name: 'proveedor' }),
    elemento('button', { type: 'submit', clase: 'boton-principal', texto: 'Guardar gasto' }),
  ]);

  const { cerrar } = abrirModal('Nuevo gasto', form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = form.querySelector('button');
    boton.disabled = true;
    try {
      await crearGasto({
        descripcion: form.descripcion.value.trim(),
        monto: Number(form.monto.value),
        categoria: form.categoria.value,
        fecha: form.fecha.value,
        proveedor: form.proveedor.value.trim(),
      });
      cerrar();
      avisar('Gasto guardado.');
      dibujarVistaActual();
    } catch (error) {
      avisar(error.message, 'error');
      boton.disabled = false;
    }
  });
}

export default async function dibujar(contenedor) {
  const gastos = await listarGastos();
  const meses = [...new Set(gastos.map((g) => g.fecha.slice(0, 7)))].sort().reverse();
  if (mes !== 'todos' && !meses.includes(mes)) mes = 'todos';

  contenedor.append(elemento('div', { clase: 'encabezado-vista' }, [
    elemento('h1', { texto: 'Gastos' }),
    elemento('button', { clase: 'boton-principal', texto: '+ Agregar', onClick: formularioGasto }),
  ]));

  const selectorMes = elemento('select', {
    onChange: (e) => { mes = e.target.value; pintar(); },
  }, [
    elemento('option', { value: 'todos', texto: 'Todos los meses' }),
    ...meses.map((m) => elemento('option', { value: m, texto: m })),
  ]);
  selectorMes.value = mes;

  const selectorCategoria = elemento('select', {
    onChange: (e) => { categoria = e.target.value; pintar(); },
  }, [
    elemento('option', { value: 'todas', texto: 'Todas las categorias' }),
    ...Object.entries(CATEGORIAS).map(([valor, texto]) => elemento('option', { value: valor, texto })),
  ]);
  selectorCategoria.value = categoria;

  const total = elemento('p', { clase: 'numero-grande' });
  const lista = elemento('div', { clase: 'tarjeta' });
  const acciones = elemento('div', { clase: 'fila-botones' });

  function pintar() {
    const visibles = gastos
      .filter((g) => mes === 'todos' || g.fecha.startsWith(mes))
      .filter((g) => categoria === 'todas' || g.categoria === categoria);

    total.textContent = formatearMoneda(sumarMontos(visibles));

    lista.replaceChildren();
    if (visibles.length === 0) {
      lista.append(elemento('p', { clase: 'vacio', texto: 'No hay gastos en este periodo.' }));
    }
    for (const g of visibles) {
      lista.append(elemento('div', { clase: 'fila' }, [
        elemento('span', { clase: 'tenue', texto: formatearFecha(g.fecha) }),
        elemento('span', { clase: 'fila-crece' }, [
          elemento('span', { texto: g.descripcion }),
          elemento('p', { clase: 'tenue', texto: `${CATEGORIAS[g.categoria]}${g.proveedor ? ` · ${g.proveedor}` : ''}` }),
        ]),
        elemento('span', { clase: 'debe', texto: formatearMoneda(g.monto) }),
      ]));
    }

    acciones.replaceChildren(elemento('button', {
      clase: 'boton-texto',
      texto: '⬇ Descargar CSV',
      onClick: () => descargarCSV(
        `gastos-${mes === 'todos' ? periodoActual() : mes}.csv`,
        aCSV(visibles, [
          { clave: 'fecha', titulo: 'Fecha' },
          { clave: 'descripcion', titulo: 'Descripcion' },
          { clave: 'categoria', titulo: 'Categoria' },
          { clave: 'proveedor', titulo: 'Proveedor' },
          { clave: 'monto', titulo: 'Monto' },
        ]),
      ),
    }));
  }

  pintar();
  contenedor.append(
    elemento('div', { clase: 'controles' }, [selectorMes, selectorCategoria]),
    elemento('div', { clase: 'tarjeta' }, [elemento('p', { clase: 'tenue', texto: 'Total del periodo' }), total]),
    lista,
    acciones,
  );
}
```

- [ ] **Step 2: Verificar a mano**

1. "+ Agregar" con "Juego de pecheras", 4500, categoría Equipamiento → aparece en la lista con la fecha de hoy.
2. Cargar otro gasto de categoría Cancha con fecha del mes pasado.
3. El filtro por mes deja solo los del mes elegido y el total de arriba se actualiza.
4. El filtro por categoría hace lo mismo.
5. "Descargar CSV" baja el archivo con las cinco columnas.

- [ ] **Step 3: Commit**

```bash
git add finanzas/js/vistas/gastos.js
git commit -m "Vista de gastos con filtros por mes y categoria"
```

---

### Task 16: Ajustes

**Files:**
- Modify: `finanzas/js/vistas/ajustes.js`

**Interfaces:**
- Consumes: `leerConfig`, `guardarConfig` de la Task 9; `cerrarSesion` de la Task 8.
- Produces: `dibujar(contenedor)`. La Task 17 lee `cuota_monto` con `leerConfig` para el Panel.

- [ ] **Step 1: Escribir la vista**

Reemplazar `finanzas/js/vistas/ajustes.js`:

```js
import { leerConfig, guardarConfig } from '../api.js';
import { cerrarSesion } from '../auth.js';
import { elemento, avisar } from '../ui.js';

export default async function dibujar(contenedor) {
  const config = await leerConfig();

  const form = elemento('form', { clase: 'tarjeta' }, [
    elemento('h2', { texto: 'Cuota del club' }),
    elemento('label', { for: 'a-cuota', texto: 'Monto mensual por jugador' }),
    elemento('input', {
      id: 'a-cuota', name: 'cuota', type: 'number', min: '0', required: true,
      value: config.cuota_monto ?? '0',
    }),
    elemento('label', { for: 'a-temporada', texto: 'Temporada' }),
    elemento('input', { id: 'a-temporada', name: 'temporada', value: config.temporada ?? '' }),
    elemento('button', { type: 'submit', clase: 'boton-principal', texto: 'Guardar' }),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = form.querySelector('button');
    boton.disabled = true;
    try {
      await guardarConfig('cuota_monto', Number(form.cuota.value));
      await guardarConfig('temporada', form.temporada.value.trim());
      avisar('Ajustes guardados.');
    } catch (error) {
      avisar(error.message, 'error');
    } finally {
      boton.disabled = false;
    }
  });

  const sesion = elemento('div', { clase: 'tarjeta' }, [
    elemento('h2', { texto: 'Sesion' }),
    elemento('p', { clase: 'tenue', texto: 'Cerrar sesion en este dispositivo.' }),
    elemento('div', { clase: 'fila-botones' }, [
      elemento('button', {
        clase: 'boton-principal',
        texto: 'Cerrar sesion',
        onClick: async () => {
          await cerrarSesion();
          location.reload();
        },
      }),
    ]),
  ]);

  contenedor.append(
    elemento('div', { clase: 'encabezado-vista' }, [elemento('h1', { texto: 'Ajustes' })]),
    form,
    sesion,
  );
}
```

- [ ] **Step 2: Verificar a mano**

1. `#ajustes` muestra el monto de cuota actual (500 por defecto, del esquema).
2. Cambiándolo a 800 y guardando aparece "Ajustes guardados."; recargando la página sigue en 800.
3. "Cerrar sesion" vuelve al login.

- [ ] **Step 3: Commit**

```bash
git add finanzas/js/vistas/ajustes.js
git commit -m "Ajustes: monto de cuota, temporada y cierre de sesion"
```

---

### Task 17: Panel y generación de la cuota del mes

Es la pantalla de entrada y la única que escribe cargos automáticamente.

**Files:**
- Modify: `finanzas/js/vistas/panel.js`

**Interfaces:**
- Consumes: `listarJugadores`, `todosLosCargos`, `todosLosPagos`, `todosLosSponsorPagos`, `listarGastos`, `listarSponsors`, `crearCargos`, `leerConfig` de la Task 9; `cajaClub`, `sumarMontos`, `resumenGeneracionCuota` de las Tasks 2 y 4; `formatearMoneda`, `periodoActual`, `nombrePeriodo` de la Task 1.
- Produces: `dibujar(contenedor)`.

- [ ] **Step 1: Escribir la vista**

Reemplazar `finanzas/js/vistas/panel.js`:

```js
import {
  listarJugadores, todosLosCargos, todosLosPagos, todosLosSponsorPagos,
  listarGastos, listarSponsors, crearCargos, leerConfig,
} from '../api.js';
import { cajaClub, sumarMontos, resumenGeneracionCuota } from '../calculos.js';
import { formatearMoneda, periodoActual, nombrePeriodo } from '../formato.js';
import { elemento, avisar, confirmar } from '../ui.js';
import { dibujarVistaActual } from '../router.js';

function tarjetaNumero(titulo, valor, clase = '') {
  return elemento('div', { clase: 'tarjeta' }, [
    elemento('p', { clase: 'tenue', texto: titulo }),
    elemento('p', { clase: `numero-grande ${clase}`, texto: valor }),
  ]);
}

function avisoCuota(resumen, periodo) {
  const boton = elemento('button', {
    clase: 'boton-principal',
    texto: 'Generar',
    onClick: async () => {
      const confirmado = await confirmar(
        `Generar la cuota de ${nombrePeriodo(periodo)} a ${resumen.cantidad} jugadores por ${formatearMoneda(resumen.montoUnitario)} cada uno?`,
      );
      if (!confirmado) return;
      boton.disabled = true;
      try {
        await crearCargos(resumen.pendientes.map((j) => ({
          jugadorId: j.id,
          concepto: 'cuota',
          descripcion: `Cuota ${nombrePeriodo(periodo)}`,
          monto: resumen.montoUnitario,
          periodo,
          fecha: `${periodo}-01`,
        })));
        avisar(`Cuota de ${nombrePeriodo(periodo)} generada.`);
        dibujarVistaActual();
      } catch (error) {
        avisar(error.message, 'error');
        boton.disabled = false;
      }
    },
  });

  return elemento('div', { clase: 'tarjeta aviso-cuota' }, [
    elemento('p', {
      texto: `Falta generar la cuota de ${nombrePeriodo(periodo)} — ${resumen.cantidad} jugadores × ${formatearMoneda(resumen.montoUnitario)} = ${formatearMoneda(resumen.total)}`,
    }),
    elemento('div', { clase: 'fila-botones' }, [boton]),
  ]);
}

export default async function dibujar(contenedor) {
  const [jugadores, cargos, pagos, sponsorPagos, gastos, sponsors, config] = await Promise.all([
    listarJugadores({ incluirArchivados: true }),
    todosLosCargos(),
    todosLosPagos(),
    todosLosSponsorPagos(),
    listarGastos(),
    listarSponsors(),
    leerConfig(),
  ]);

  const periodo = periodoActual();
  const montoCuota = Number(config.cuota_monto ?? 0);
  const caja = cajaClub({ pagos, sponsorPagos, gastos });
  const deudaJugadores = jugadores.reduce((s, j) => s + Math.max(j.deuda, 0), 0);
  const pendienteSponsors = sponsors.reduce((s, x) => s + Math.max(x.pendiente, 0), 0);
  const gastosDelMes = sumarMontos(gastos.filter((g) => g.fecha.startsWith(periodo)));

  contenedor.append(elemento('div', { clase: 'encabezado-vista' }, [
    elemento('h1', { texto: 'Panel' }),
    elemento('span', { clase: 'tenue', texto: nombrePeriodo(periodo) }),
  ]));

  const resumen = resumenGeneracionCuota(jugadores, cargos, periodo, montoCuota);
  if (resumen.cantidad > 0 && montoCuota > 0) {
    contenedor.append(avisoCuota(resumen, periodo));
  }

  contenedor.append(elemento('div', { clase: 'rejilla' }, [
    tarjetaNumero('Caja del club', formatearMoneda(caja), caja < 0 ? 'debe' : 'al-dia'),
    tarjetaNumero('Deben los jugadores', formatearMoneda(deudaJugadores), 'debe'),
    tarjetaNumero('Falta de sponsors', formatearMoneda(pendienteSponsors), 'debe'),
    tarjetaNumero('Gastos del mes', formatearMoneda(gastosDelMes)),
  ]));

  const atajos = elemento('div', { clase: 'tarjeta' }, [
    elemento('h2', { texto: 'Ir a' }),
    elemento('div', { clase: 'fila' }, [
      elemento('a', { href: '#deudas', clase: 'fila-crece', texto: 'Quien debe plata →' }),
    ]),
    elemento('div', { clase: 'fila' }, [
      elemento('a', { href: '#jugadores', clase: 'fila-crece', texto: 'Jugadores →' }),
    ]),
    elemento('div', { clase: 'fila' }, [
      elemento('a', { href: '#gastos', clase: 'fila-crece', texto: 'Cargar un gasto →' }),
    ]),
  ]);
  contenedor.append(atajos);
}
```

- [ ] **Step 2: Agregar el estilo del aviso**

Agregar al final de `finanzas/css/estilos.css`:

```css
.aviso-cuota { border-color: var(--dorado); background: rgba(201, 168, 76, 0.1); }
.tarjeta a { color: var(--crema); text-decoration: none; }
.tarjeta a:hover { color: var(--dorado); }
```

- [ ] **Step 3: Verificar a mano**

1. Con el monto de cuota en 500 y jugadores activos sin cuota del mes, el Panel muestra el aviso dorado con la cantidad y el total.
2. "Generar" pide confirmación; al aceptar, todos los jugadores activos suben $500 y el aviso desaparece.
3. Recargando el Panel, el aviso sigue sin aparecer.
4. Agregando un jugador nuevo, el aviso vuelve a aparecer pero **solo por ese jugador** (cantidad 1); al generar, los demás no reciben una segunda cuota.
5. Los cuatro números coinciden con lo que muestran las otras pantallas.
6. Con la caja en negativo, el número aparece en rojo.
7. Los tres atajos navegan a la vista correcta.

- [ ] **Step 4: Commit**

```bash
git add finanzas/js/vistas/panel.js finanzas/css/estilos.css
git commit -m "Panel con los numeros del club y generacion de la cuota del mes"
```

---

### Task 18: Instalable en el celular

Última pieza y salteable: sin ella el sistema funciona igual, solo que en Android hay que entrar por el link en vez de por un ícono.

**Files:**
- Create: `finanzas/manifest.webmanifest`
- Create: `finanzas/sw.js`
- Modify: `finanzas/index.html`

**Interfaces:**
- Consumes: nada.
- Produces: nada que otro módulo use.

- [ ] **Step 1: Escribir el manifiesto**

Crear `finanzas/manifest.webmanifest`:

```json
{
  "name": "Finanzas Sensei FC",
  "short_name": "Finanzas",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0d3d26",
  "icons": [
    {
      "src": "../imagenes/EscudoSensei-Bueno.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
```

- [ ] **Step 2: Escribir el service worker**

Crear `finanzas/sw.js`:

```js
// Pide siempre a la red primero. No promete funcionar sin conexion:
// existe solo para que Android ofrezca instalar la aplicacion.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (evento) => {
  evento.respondWith(fetch(evento.request));
});
```

- [ ] **Step 3: Enlazarlos desde el cascarón**

En `finanzas/index.html`, agregar dentro de `<head>`, después de la línea del `theme-color`:

```html
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="apple-touch-icon" href="../imagenes/EscudoSensei-Bueno.png">
```

Y justo antes de `</body>`, después del `<script type="module">`:

```html
  <script>
    if ('serviceWorker' in navigator) {
      addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
    }
  </script>
```

- [ ] **Step 4: Verificar a mano**

1. En Chrome de escritorio, abrir las herramientas de desarrollo → Application → Manifest: aparece "Finanzas Sensei FC" sin errores.
2. Application → Service Workers: figura `sw.js` como activated.
3. En el celular, entrando a la URL publicada, el menú del navegador ofrece "Instalar aplicación" o "Agregar a pantalla de inicio". Instalado, abre sin barra de direcciones.

- [ ] **Step 5: Commit**

```bash
git add finanzas/manifest.webmanifest finanzas/sw.js finanzas/index.html
git commit -m "Instalable en el celular como aplicacion"
```

---

### Task 19: Cierre — pruebas completas y publicación

**Files:**
- Modify: `finanzas/LEEME.md`

- [ ] **Step 1: Correr toda la suite automática**

Run: `node --test finanzas/js/tests/`
Expected: PASS — 41 pruebas en verde, 0 fallos.

- [ ] **Step 2: Recorrer la lista de verificación manual**

Con el servidor local y la base real, verificar de punta a punta:

1. Login con credenciales correctas e incorrectas.
2. Alta de jugador con saldo inicial.
3. Generación de la cuota del mes, dos veces seguidas: la segunda no duplica nada.
4. Cargo masivo a varios jugadores.
5. Cobro parcial a un jugador y comprobación de que el filtro por concepto en Deudas refleja la imputación por antigüedad.
6. Alta de sponsor con compromiso y dos pagos parciales.
7. Alta de gasto y filtro por mes.
8. Copiado del listado de WhatsApp y del mensaje individual.
9. Descarga de los dos CSV.
10. Todo lo anterior en el celular, con la ventana angosta.
11. Cierre de sesión y reingreso.

- [ ] **Step 3: Anotar el estado en el LEEME**

Agregar al final de `finanzas/LEEME.md`:

```markdown
## Uso diario

- **Empieza el mes:** entrar al Panel y tocar "Generar" en el aviso dorado.
- **Cobrar:** Jugadores → tocar al jugador → Cobrar.
- **Mandar el listado:** Deudas → "Copiar para WhatsApp" → pegar en el grupo.
- **Apurar a uno:** ficha del jugador → "Copiar mensaje para WhatsApp".
- **Comprar algo:** Gastos → "+ Agregar".
- **Cambiar el monto de la cuota:** Ajustes.

## Correr las pruebas

    node --test finanzas/js/tests/

## Probar en local

    python -m http.server 8000

Luego http://localhost:8000/finanzas/
```

- [ ] **Step 4: Commit y publicar**

```bash
git add finanzas/LEEME.md
git commit -m "Guia de uso diario"
git push -u origin finanzas-club
```

---

## Verificación final del plan

Al terminar la Task 19, tienen que ser ciertas todas estas:

- `node --test finanzas/js/tests/` da 41 pruebas en verde.
- No existe `node_modules` ni ningún `package.json` fuera de `finanzas/package.json`.
- `grep -rn "esm.sh" finanzas/js/` devuelve una sola línea, en `cliente.js`.
- `grep -rln "supabase" finanzas/js/vistas/` no devuelve nada: ninguna vista habla con la base directamente.
- Entrando sin sesión no se ve ningún dato.

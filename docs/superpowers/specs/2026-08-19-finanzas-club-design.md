# Sistema de Finanzas — Sensei FC

**Fecha:** 2026-08-19
**Estado:** Diseño aprobado, pendiente de plan de implementación

---

## Problema

Las cuentas del club viven hoy en planillas de Excel dispersas y desordenadas.
No hay una respuesta rápida a tres preguntas que se hacen todo el tiempo:

1. ¿Quién debe plata y cuánta?
2. ¿Cuánta plata hay en la caja del club?
3. ¿Qué se cobró de sponsors y qué falta cobrar?

El sistema reemplaza esas planillas para todo lo que pase de acá en adelante.

---

## Alcance

**Incluye:**

- Alta, baja (archivado) y listado de jugadores.
- Deudas de jugadores por cuota mensual, prácticas y equipamiento.
- Registro de pagos de jugadores.
- Sponsors: monto comprometido por temporada y pagos parciales recibidos.
- Gastos y compras del club.
- Caja: saldo actual y movimientos.
- Exportación de deudas como texto para WhatsApp y como CSV.
- Acceso con usuario y contraseña para la dirigencia.
- Uso en PC y en celular.

**No incluye (decidido explícitamente):**

- Gastos fijos recurrentes automáticos (cancha, arbitrajes, liga).
- Eventos y recaudaciones (rifas, asados).
- Multas a jugadores.
- Acceso de jugadores al sistema.
- Importación de las planillas de Excel existentes.
- Modo sin conexión (offline).

Nada de esto está bloqueado a futuro: el modelo de datos los admite sin rehacer
lo existente.

---

## Decisiones tomadas

| Decisión | Elección | Razón |
|---|---|---|
| Dónde vive la data | Supabase (nube) | Es lo único que hace que un pago cargado en la cancha desde el celular aparezca en la PC. |
| Generación de cobros | Cuota mensual asistida, resto manual | Lo repetitivo se automatiza; lo eventual (camiseta, torneo) queda flexible. |
| Acceso | Solo dirigencia, login por email | 2 a 4 cuentas creadas a mano. Los jugadores reciben su estado de cuenta por WhatsApp. |
| Sponsors | Compromiso + pagos parciales | Permite ver quién quedó a mitad de camino con lo prometido. |
| Ubicación | Carpeta `finanzas/` en el repo actual | Un solo deploy, misma identidad visual, la web pública no se toca. |
| Stack | HTML + JS en módulos nativos + Supabase por CDN | El repo no tiene build tooling. Se despliega con `git push`, como hoy. |
| Datos iniciales | Saldo inicial por jugador | Media hora de carga contra construir un importador para planillas desprolijas. |
| Moneda | Pesos uruguayos, enteros | Sin centavos, sin errores de redondeo. |

---

## Arquitectura

### Estructura de archivos

```
finanzas/
  index.html              — cascarón único; las vistas se montan por JS
  manifest.webmanifest    — para instalar en el celular
  sw.js                   — service worker mínimo (network-first, sin offline)
  css/
    estilos.css           — tokens de color heredados de la web del club
  js/
    config.js             — URL y clave pública de Supabase
    cliente.js            — instancia del cliente Supabase
    auth.js               — login, logout, guardia de sesión
    api.js                — TODAS las consultas a la base, en un solo lugar
    formato.js            — moneda, fechas, períodos          [puro, testeable]
    calculos.js           — saldos, totales, caja             [puro, testeable]
    exportar.js           — textos de WhatsApp y CSV          [puro, testeable]
    router.js             — navegación entre vistas
    app.js                — arranque
    vistas/
      panel.js
      jugadores.js
      deudas.js
      sponsors.js
      gastos.js
      ajustes.js
  sql/
    esquema.sql           — tablas, vistas, índices y políticas RLS
  tests.html              — corre las pruebas en el navegador
  js/tests/
    formato.test.js
    calculos.test.js
    exportar.test.js
    arnes.js              — assert mínimo y reporte visual
```

**Sobre el service worker:** existe solo porque Android exige uno para ofrecer
"instalar aplicación". No promete funcionamiento sin conexión — pide siempre a la
red primero. Es la última pieza a construir y se puede saltear: sin ella el
sistema anda igual, solo que en Android hay que entrar por el link en vez de por
un ícono.

**Regla de frontera:** las vistas nunca hablan con Supabase directamente; siempre
pasan por `api.js`. Los módulos `formato`, `calculos` y `exportar` son funciones
puras sin red ni DOM — de ahí que se puedan probar solos.

### Modelo de datos

La idea central: **cada jugador tiene una cuenta corriente**. Hay *cargos* (lo que
debe) y *pagos* (lo que entregó). Su deuda es la resta. Los pagos no se atan a un
cargo puntual: si entrega $2.000, bajan $2.000 del total. Es como funciona en la
realidad del club y evita tener que decidir a qué concepto imputar cada peso.

```sql
-- Jugadores del plantel
create table jugadores (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  dorsal      integer,
  telefono    text,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- Lo que el jugador le debe al club
create table cargos (
  id           uuid primary key default gen_random_uuid(),
  jugador_id   uuid not null references jugadores(id),
  concepto     text not null check (concepto in
                 ('cuota','practica','equipamiento','saldo_inicial','otro')),
  descripcion  text,
  monto        integer not null check (monto > 0),
  periodo      text,          -- 'YYYY-MM', solo para concepto = 'cuota'
  fecha        date not null default current_date,
  vencimiento  date,
  creado_en    timestamptz not null default now(),
  creado_por   uuid references auth.users(id)
);

-- Una sola cuota por jugador por mes: el guardián de la idempotencia
create unique index cargos_cuota_unica
  on cargos (jugador_id, periodo) where concepto = 'cuota';

-- Lo que el jugador entregó
create table pagos (
  id          uuid primary key default gen_random_uuid(),
  jugador_id  uuid not null references jugadores(id),
  monto       integer not null check (monto > 0),
  fecha       date not null default current_date,
  metodo      text check (metodo in ('efectivo','transferencia','otro')),
  nota        text,
  creado_en   timestamptz not null default now(),
  creado_por  uuid references auth.users(id)
);

create table sponsors (
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

create table sponsor_pagos (
  id          uuid primary key default gen_random_uuid(),
  sponsor_id  uuid not null references sponsors(id),
  monto       integer not null check (monto > 0),
  fecha       date not null default current_date,
  nota        text,
  creado_en   timestamptz not null default now(),
  creado_por  uuid references auth.users(id)
);

create table gastos (
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

-- Ajustes del club: cuota_monto, temporada
create table config (
  clave          text primary key,
  valor          text not null,
  actualizado_en timestamptz not null default now()
);
```

**Vistas de saldo** (calculan en la base, no en el navegador):

```sql
create view saldos_jugadores with (security_invoker = true) as
select j.id, j.nombre, j.dorsal, j.telefono, j.activo,
       coalesce(c.total, 0)                        as total_cargos,
       coalesce(p.total, 0)                        as total_pagos,
       coalesce(c.total, 0) - coalesce(p.total, 0) as deuda
from jugadores j
left join (select jugador_id, sum(monto) total from cargos group by 1) c
       on c.jugador_id = j.id
left join (select jugador_id, sum(monto) total from pagos  group by 1) p
       on p.jugador_id = j.id;

create view saldos_sponsors with (security_invoker = true) as
select s.id, s.nombre, s.temporada, s.activo, s.monto_comprometido,
       coalesce(sp.total, 0)                        as cobrado,
       s.monto_comprometido - coalesce(sp.total, 0) as pendiente
from sponsors s
left join (select sponsor_id, sum(monto) total from sponsor_pagos group by 1) sp
       on sp.sponsor_id = s.id;
```

`security_invoker = true` es necesario: sin eso, en Postgres una vista se ejecuta
con los permisos de quien la creó y esquiva las reglas de acceso.

### Reglas de negocio

**Deuda de un jugador** = suma de sus cargos − suma de sus pagos.
Puede dar negativo: significa que pagó de más y tiene saldo a favor. Se muestra
como "a favor", no como deuda.

**Caja del club** = pagos de jugadores + pagos de sponsors − gastos.

**Imputación por antigüedad, solo para mostrar.** Los pagos no se guardan atados a
un cargo, pero la vista de Deudas necesita poder responder "¿quién debe de
equipamiento?". Para eso, al momento de mostrar, los pagos de un jugador se
aplican a sus cargos del más viejo al más nuevo hasta agotarse. Un jugador con
cargos de cuota $500 (junio) y camiseta $1.000 (julio) que pagó $700 aparece con
la cuota saldada y $800 pendientes de camiseta.

Esto es un cálculo de presentación, no un cambio en los datos: nada se escribe en
la base y el saldo total del jugador es siempre la resta simple. Vive en
`calculos.js` como función pura y está cubierto por pruebas.

**Generación de la cuota mensual.** No corre sola en un servidor. Al entrar, el
panel consulta si existe algún cargo de concepto `cuota` con el período del mes
actual. Si no existe, muestra el aviso:

> Falta generar la cuota de agosto — 24 jugadores activos × $500 = $12.000
> [Generar]

Al confirmar, se inserta un cargo por cada jugador **activo**. El índice único
`cargos_cuota_unica` impide duplicados incluso si dos dirigentes tocan el botón a
la vez o si se agregó un jugador a mitad de mes: los que ya tienen la cuota se
saltean, los que no, la reciben.

**Archivado, no borrado.** Un jugador que se va pasa a `activo = false`. Deja de
recibir cuotas y sale de las listas por defecto, pero su historial queda intacto.
Borrar un jugador con movimientos está impedido por la clave foránea.

**Saldo inicial.** Al cargar el plantel por primera vez, la deuda que cada jugador
trae del Excel se registra como un cargo único de concepto `saldo_inicial`.

---

## Pantallas

Navegación por barra inferior en el celular y barra lateral en PC. Mismo código,
un punto de corte en CSS.

### Panel

Cuatro números grandes y un aviso:

- Saldo de la caja.
- Total que deben los jugadores.
- Total pendiente de cobro a sponsors.
- Gastos del mes en curso.
- Aviso de cuota del mes pendiente de generar, con su botón.

### Jugadores

Lista con dorsal, nombre y deuda. Buscador por nombre. Filtros: todos / deudores /
al día / archivados. Botón de alta.

Ficha del jugador: sus datos, su deuda, su historial de cargos y pagos ordenado
por fecha, y dos acciones — **Cobrar** (registra un pago) y **Agregar cargo**.
Desde acá también se copia su mensaje individual de WhatsApp.

### Deudas

La vista de "quién debe plata", que es la pregunta que más se hace. Lista de
deudores ordenada de mayor a menor, con filtro por concepto (cuota / práctica /
equipamiento) resuelto con la imputación por antigüedad descrita arriba.

Acción de carga masiva: seleccionar varios jugadores y aplicarles el mismo cargo
de una sola vez — el caso de la camiseta nueva para los 24.

Desde acá sale el botón de **copiar listado para WhatsApp**.

### Sponsors

Lista con comprometido, cobrado y pendiente por sponsor. Ficha con el historial de
pagos recibidos y el botón para registrar uno nuevo.

### Gastos

Lista de compras con fecha, categoría, descripción y monto, filtrable por mes y
por categoría, con el total del período visible arriba. Alta de gasto.

### Ajustes

Monto de la cuota vigente, temporada en curso, y cierre de sesión.

---

## Exportar y compartir

Tres salidas, todas en `exportar.js` como funciones puras:

**1. Listado de deudores para WhatsApp.** Copia al portapapeles un texto armado:

```
🟢 SENSEI FC — Cuotas al 19/08

#10 Antonio Simonet — $1.500
#23 Luis Pedro Silva — $500
#33 Francisco Orihuela — $500

Total a cobrar: $2.500
```

**2. Mensaje individual**, desde la ficha del jugador, con el detalle de sus
cargos impagos.

**3. CSV**, para deudas o movimientos de caja, descargable desde el navegador.

---

## Seguridad

Autenticación de Supabase con email y contraseña. **El registro abierto queda
deshabilitado**: las cuentas se crean a mano desde el panel de Supabase.

Las políticas RLS se activan en todas las tablas con una sola regla: solo usuarios
autenticados pueden leer y escribir. La clave pública (`anon key`) que va en el
código está diseñada para ser pública — lo que protege los datos es la política en
el servidor, no el secreto de la clave. Esto importa acá porque el repositorio de
la web es público.

La sesión persiste en el dispositivo: la contraseña se escribe una vez.

---

## Manejo de errores

- **Sin conexión:** aviso visible y el formulario conserva lo tipeado. Nunca se
  descarta lo que el usuario escribió por un fallo de red.
- **Confirmación** antes de cualquier borrado o archivado.
- **Montos:** enteros positivos. El formulario rechaza cero, negativos y texto.
- **Errores de Supabase:** se muestran traducidos a lenguaje llano, no el mensaje
  crudo de la base.

---

## Testing

Sin herramientas de build, las pruebas corren en el navegador. `finanzas/tests.html`
carga los módulos puros y ejecuta sus aserciones, con resultado verde o rojo a la
vista.

**Cubierto por pruebas automáticas:**

- `formato.js` — moneda en pesos, fechas, nombre del período ('2026-08' → 'agosto').
- `calculos.js` — deuda de un jugador, saldo a favor cuando pagó de más, caja del
  club, qué jugadores quedan pendientes al generar la cuota, e imputación por
  antigüedad: pago que salda justo un cargo, pago que cubre un cargo a medias,
  pago mayor a todos los cargos, y jugador sin ningún pago.
- `exportar.js` — texto del listado, texto individual, filas del CSV, escapado de
  comas y comillas en el CSV.

**Verificación manual** (lista corta, para lo que toca la red): login y logout,
alta de jugador, cobro, generación de cuota dos veces seguidas sin duplicar, carga
masiva de un cargo, y vista en celular.

---

## Fuera de alcance, admitido a futuro

El modelo soporta sin cambios estructurales: gastos recurrentes, eventos y
recaudaciones, multas a jugadores, acceso de solo lectura para jugadores, y
reportes por temporada.

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
  ('cuota_monto', '0'),
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

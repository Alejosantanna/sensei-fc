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

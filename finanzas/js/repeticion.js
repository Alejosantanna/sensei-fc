// Fechas de las tareas que se repiten. Modulo puro: sin red, sin pantalla.
// Las fechas van siempre como texto 'YYYY-MM-DD' y se operan en UTC, para
// que no se corran un dia segun la zona horaria del que las mira.

function aUtc(iso) {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return Date.UTC(anio, mes - 1, dia);
}

function aIso(marca) {
  const f = new Date(marca);
  const mes = String(f.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(f.getUTCDate()).padStart(2, '0');
  return `${f.getUTCFullYear()}-${mes}-${dia}`;
}

function sumarDias(iso, dias) {
  return aIso(aUtc(iso) + dias * 86400000);
}

// Un mes mas, recortando el dia si el mes destino es mas corto:
// el 31 de enero cae al 28 de febrero, no se pasa al 3 de marzo.
function sumarMes(iso) {
  const [anio, mes, dia] = iso.split('-').map(Number);
  const anioDestino = mes === 12 ? anio + 1 : anio;
  const mesDestino = mes === 12 ? 1 : mes + 1;
  const diasDelMes = new Date(Date.UTC(anioDestino, mesDestino, 0)).getUTCDate();
  return aIso(Date.UTC(anioDestino, mesDestino - 1, Math.min(dia, diasDelMes)));
}

/**
 * Cuando se marca hecha una tarea que se repite, cual es su proxima fecha.
 * Devuelve null si la tarea no se repite (o sea: se termino y punto).
 * Si la tarea venia atrasada, avanza tantas veces como haga falta hasta
 * caer despues de hoy, en vez de quedar vencida de nuevo.
 */
export function proximoVencimiento(vence, repite, hoy) {
  if (repite !== 'semanal' && repite !== 'mensual') return null;
  const avanzar = (iso) => (repite === 'semanal' ? sumarDias(iso, 7) : sumarMes(iso));

  let proxima = avanzar(vence || hoy);
  while (proxima <= hoy) proxima = avanzar(proxima);
  return proxima;
}

/** Para pintar la tarea: vencida, para hoy, o mas adelante. */
export function estadoVencimiento(vence, hoy) {
  if (!vence) return 'sin-fecha';
  if (vence < hoy) return 'vencida';
  if (vence === hoy) return 'hoy';
  return 'futura';
}

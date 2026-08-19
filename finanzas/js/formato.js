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

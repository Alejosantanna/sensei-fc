export function sumarMontos(items) {
  return items.reduce((total, item) => total + item.monto, 0);
}

export function cajaClub({ pagos, sponsorPagos, gastos }) {
  return sumarMontos(pagos) + sumarMontos(sponsorPagos) - sumarMontos(gastos);
}

export function sumarMontos(items) {
  return items.reduce((total, item) => total + item.monto, 0);
}

export function cajaClub({ pagos, sponsorPagos, gastos }) {
  return sumarMontos(pagos) + sumarMontos(sponsorPagos) - sumarMontos(gastos);
}

// Aplica los pagos del jugador a sus cargos, del mas viejo al mas nuevo.
// Es un calculo de presentacion: no se guarda nada de esto en la base.
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

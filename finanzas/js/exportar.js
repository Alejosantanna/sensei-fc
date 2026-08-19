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

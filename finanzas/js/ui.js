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

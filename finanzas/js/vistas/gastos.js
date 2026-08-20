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

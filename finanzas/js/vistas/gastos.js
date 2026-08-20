import {
  listarGastos, crearGasto, actualizarGasto, borrarGasto,
  listarIngresos, crearIngreso, actualizarIngreso, borrarIngreso,
} from '../api.js';
import { sumarMontos } from '../calculos.js';
import { aCSV } from '../exportar.js';
import { formatearMoneda, formatearFecha, periodoActual } from '../formato.js';
import { elemento, abrirModal, avisar, confirmar, descargarCSV } from '../ui.js';
import { dibujarVistaActual } from '../router.js';

const CATEGORIAS_GASTO = {
  equipamiento: 'Equipamiento',
  cancha: 'Cancha',
  arbitraje: 'Arbitraje',
  liga: 'Liga',
  otro: 'Otro',
};

const CATEGORIAS_INGRESO = {
  evento: 'Evento',
  rifa: 'Rifa',
  venta: 'Venta',
  aporte: 'Aporte',
  otro: 'Otro',
};

// Los dos lados de la caja comparten formulario, filtros y exportacion.
// Lo unico que cambia es la tabla, las categorias y si suma o resta.
const LADOS = {
  gastos: {
    titulo: 'Gastos',
    categorias: CATEGORIAS_GASTO,
    clase: 'debe',
    conProveedor: true,
    etiquetaMonto: 'Costo',
    ejemplo: 'Juego de pecheras',
    crear: crearGasto,
    actualizar: actualizarGasto,
    borrar: borrarGasto,
  },
  ingresos: {
    titulo: 'Ingresos',
    categorias: CATEGORIAS_INGRESO,
    clase: 'al-dia',
    conProveedor: false,
    etiquetaMonto: 'Monto que entro',
    ejemplo: 'Rifa del asado',
    crear: crearIngreso,
    actualizar: actualizarIngreso,
    borrar: borrarIngreso,
  },
};

let lado = 'gastos';
let mes = 'todos';
let categoria = 'todas';

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

// Un solo formulario para alta y edicion: si viene `existente`, edita.
function formularioMovimiento(clave, existente = null) {
  const cfg = LADOS[clave];

  const selectorCategoria = elemento('select', { id: 'mv-categoria', name: 'categoria' },
    Object.entries(cfg.categorias).map(([valor, texto]) => elemento('option', { value: valor, texto })));
  selectorCategoria.value = existente?.categoria ?? Object.keys(cfg.categorias)[0];

  const form = elemento('form', {}, [
    elemento('label', { for: 'mv-descripcion', texto: clave === 'gastos' ? 'Que se compro' : 'De donde salio' }),
    elemento('input', {
      id: 'mv-descripcion', name: 'descripcion', required: true,
      placeholder: cfg.ejemplo, value: existente?.descripcion ?? '',
    }),
    elemento('label', { for: 'mv-monto', texto: cfg.etiquetaMonto }),
    elemento('input', {
      id: 'mv-monto', name: 'monto', type: 'number', min: '1', required: true,
      value: existente?.monto ?? '',
    }),
    elemento('label', { for: 'mv-categoria', texto: 'Categoria' }),
    selectorCategoria,
    elemento('label', { for: 'mv-fecha', texto: 'Fecha' }),
    elemento('input', {
      id: 'mv-fecha', name: 'fecha', type: 'date', required: true,
      value: existente?.fecha ?? hoyIso(),
    }),
    cfg.conProveedor ? elemento('label', { for: 'mv-proveedor', texto: 'Proveedor (opcional)' }) : null,
    cfg.conProveedor
      ? elemento('input', { id: 'mv-proveedor', name: 'proveedor', value: existente?.proveedor ?? '' })
      : null,
    elemento('button', {
      type: 'submit', clase: 'boton-principal',
      texto: existente ? 'Guardar cambios' : 'Guardar',
    }),
  ]);

  const titulo = existente
    ? `Corregir ${clave === 'gastos' ? 'gasto' : 'ingreso'}`
    : `Nuevo ${clave === 'gastos' ? 'gasto' : 'ingreso'}`;
  const { cerrar } = abrirModal(titulo, form);

  if (existente) {
    form.append(elemento('div', { clase: 'fila-botones' }, [
      elemento('button', {
        type: 'button',
        clase: 'boton-texto boton-peligro',
        texto: 'Borrar',
        onClick: async () => {
          if (!(await confirmar(`Borrar "${existente.descripcion}"? Esto no se puede deshacer.`))) return;
          try {
            await cfg.borrar(existente.id);
            cerrar();
            avisar('Movimiento borrado.');
            dibujarVistaActual();
          } catch (error) {
            avisar(error.message, 'error');
          }
        },
      }),
    ]));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = form.querySelector('button[type=submit]');
    boton.disabled = true;
    const datos = {
      descripcion: form.descripcion.value.trim(),
      monto: Number(form.monto.value),
      categoria: form.categoria.value,
      fecha: form.fecha.value,
    };
    if (cfg.conProveedor) datos.proveedor = form.proveedor.value.trim();
    try {
      if (existente) await cfg.actualizar(existente.id, datos);
      else await cfg.crear(datos);
      cerrar();
      avisar(existente ? 'Movimiento corregido.' : 'Movimiento guardado.');
      dibujarVistaActual();
    } catch (error) {
      avisar(error.message, 'error');
      boton.disabled = false;
    }
  });
}

export default async function dibujar(contenedor) {
  const [gastos, ingresos] = await Promise.all([listarGastos(), listarIngresos()]);
  const datos = { gastos, ingresos };

  contenedor.append(elemento('div', { clase: 'encabezado-vista' }, [
    elemento('h1', { texto: 'Caja' }),
    elemento('button', {
      clase: 'boton-principal',
      texto: '+ Agregar',
      onClick: () => formularioMovimiento(lado),
    }),
  ]));

  // Resumen de los dos lados, siempre visible
  const totalIngresos = sumarMontos(ingresos);
  const totalGastos = sumarMontos(gastos);
  contenedor.append(elemento('div', { clase: 'rejilla' }, [
    elemento('div', { clase: 'tarjeta' }, [
      elemento('p', { clase: 'tenue', texto: 'Entro (sin cuotas ni sponsors)' }),
      elemento('p', { clase: 'numero-grande al-dia', texto: formatearMoneda(totalIngresos) }),
    ]),
    elemento('div', { clase: 'tarjeta' }, [
      elemento('p', { clase: 'tenue', texto: 'Salio' }),
      elemento('p', { clase: 'numero-grande debe', texto: formatearMoneda(totalGastos) }),
    ]),
  ]));

  const pestanas = elemento('div', { clase: 'pestanas' }, Object.keys(LADOS).map((clave) =>
    elemento('button', {
      clase: `pestana ${clave === lado ? 'activa' : ''}`,
      texto: LADOS[clave].titulo,
      onClick: () => { lado = clave; categoria = 'todas'; dibujarVistaActual(); },
    }),
  ));
  contenedor.append(pestanas);

  const cfg = LADOS[lado];
  const filas = datos[lado];
  const meses = [...new Set(filas.map((f) => f.fecha.slice(0, 7)))].sort().reverse();
  if (mes !== 'todos' && !meses.includes(mes)) mes = 'todos';

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
    ...Object.entries(cfg.categorias).map(([valor, texto]) => elemento('option', { value: valor, texto })),
  ]);
  selectorCategoria.value = categoria;

  const total = elemento('p', { clase: 'numero-grande' });
  const lista = elemento('div', { clase: 'tarjeta' });
  const acciones = elemento('div', { clase: 'fila-botones' });

  function pintar() {
    const visibles = filas
      .filter((f) => mes === 'todos' || f.fecha.startsWith(mes))
      .filter((f) => categoria === 'todas' || f.categoria === categoria);

    total.textContent = formatearMoneda(sumarMontos(visibles));
    total.className = `numero-grande ${cfg.clase}`;

    lista.replaceChildren();
    if (visibles.length === 0) {
      lista.append(elemento('p', { clase: 'vacio', texto: `No hay ${cfg.titulo.toLowerCase()} en este periodo.` }));
    }
    for (const f of visibles) {
      lista.append(elemento('div', { clase: 'fila' }, [
        elemento('span', { clase: 'tenue', texto: formatearFecha(f.fecha) }),
        elemento('span', { clase: 'fila-crece' }, [
          elemento('span', { texto: f.descripcion }),
          elemento('p', {
            clase: 'tenue',
            texto: `${cfg.categorias[f.categoria] ?? f.categoria}${f.proveedor ? ` · ${f.proveedor}` : ''}`,
          }),
        ]),
        elemento('span', { clase: cfg.clase, texto: formatearMoneda(f.monto) }),
        elemento('button', {
          clase: 'boton-texto',
          texto: 'Corregir',
          onClick: () => formularioMovimiento(lado, f),
        }),
      ]));
    }

    const columnas = [
      { clave: 'fecha', titulo: 'Fecha' },
      { clave: 'descripcion', titulo: 'Descripcion' },
      { clave: 'categoria', titulo: 'Categoria' },
      ...(cfg.conProveedor ? [{ clave: 'proveedor', titulo: 'Proveedor' }] : []),
      { clave: 'monto', titulo: 'Monto' },
    ];

    acciones.replaceChildren(elemento('button', {
      clase: 'boton-texto',
      texto: '⬇ Descargar CSV',
      onClick: () => descargarCSV(
        `${lado}-${mes === 'todos' ? periodoActual() : mes}.csv`,
        aCSV(visibles, columnas),
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

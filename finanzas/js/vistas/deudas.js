import { listarJugadores, todosLosCargos, todosLosPagos, crearCargos } from '../api.js';
import { pendientePorConcepto } from '../calculos.js';
import { textoListadoDeudores, aCSV } from '../exportar.js';
import { formatearMoneda } from '../formato.js';
import { elemento, abrirModal, avisar, copiarAlPortapapeles, descargarCSV } from '../ui.js';
import { dibujarVistaActual } from '../router.js';

const CONCEPTOS = {
  todos: 'Todos los conceptos',
  cuota: 'Cuotas',
  practica: 'Practicas',
  equipamiento: 'Equipamiento',
  saldo_inicial: 'Saldo inicial',
  otro: 'Otro',
};

let concepto = 'todos';

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

function formularioMasivo(jugadores) {
  const casillas = jugadores.map((j) =>
    elemento('label', { clase: 'casilla' }, [
      elemento('input', { type: 'checkbox', value: j.id }),
      elemento('span', { texto: j.dorsal ? `#${j.dorsal} ${j.nombre}` : j.nombre }),
    ]),
  );

  const todos = elemento('button', {
    type: 'button',
    clase: 'boton-texto',
    texto: 'Marcar a todos',
    onClick: () => {
      const marcar = casillas.some((l) => !l.querySelector('input').checked);
      for (const l of casillas) l.querySelector('input').checked = marcar;
    },
  });

  const form = elemento('form', {}, [
    elemento('label', { for: 'm-concepto', texto: 'Concepto' }),
    elemento('select', { id: 'm-concepto', name: 'concepto' }, [
      elemento('option', { value: 'equipamiento', texto: 'Equipamiento' }),
      elemento('option', { value: 'practica', texto: 'Practica' }),
      elemento('option', { value: 'otro', texto: 'Otro' }),
    ]),
    elemento('label', { for: 'm-descripcion', texto: 'Detalle' }),
    elemento('input', { id: 'm-descripcion', name: 'descripcion', placeholder: 'Camiseta 2026', required: true }),
    elemento('label', { for: 'm-monto', texto: 'Monto por jugador' }),
    elemento('input', { id: 'm-monto', name: 'monto', type: 'number', min: '1', required: true }),
    elemento('label', { texto: 'A quienes' }),
    todos,
    elemento('div', { clase: 'lista-casillas' }, casillas),
    elemento('button', { type: 'submit', clase: 'boton-principal', texto: 'Cargar a los marcados' }),
  ]);

  const { cerrar } = abrirModal('Cargo a varios jugadores', form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const marcados = casillas.map((l) => l.querySelector('input')).filter((i) => i.checked).map((i) => i.value);
    if (marcados.length === 0) {
      avisar('No marcaste a ningun jugador.', 'error');
      return;
    }
    const boton = form.querySelector('button[type=submit]');
    boton.disabled = true;
    try {
      await crearCargos(marcados.map((jugadorId) => ({
        jugadorId,
        concepto: form.concepto.value,
        descripcion: form.descripcion.value.trim(),
        monto: Number(form.monto.value),
        fecha: hoyIso(),
      })));
      cerrar();
      avisar(`Cargo aplicado a ${marcados.length} jugadores.`);
      dibujarVistaActual();
    } catch (error) {
      avisar(error.message, 'error');
      boton.disabled = false;
    }
  });
}

export default async function dibujar(contenedor) {
  const [jugadores, cargos, pagos] = await Promise.all([
    listarJugadores({ incluirArchivados: true }),
    todosLosCargos(),
    todosLosPagos(),
  ]);

  const porJugador = jugadores.map((j) => {
    const suyos = cargos.filter((c) => c.jugador_id === j.id);
    const susPagos = pagos.filter((p) => p.jugador_id === j.id);
    return { ...j, porConcepto: pendientePorConcepto(suyos, susPagos) };
  });

  const encabezado = elemento('div', { clase: 'encabezado-vista' }, [
    elemento('h1', { texto: 'Deudas' }),
    elemento('button', {
      clase: 'boton-principal',
      texto: '+ Cargo masivo',
      onClick: () => formularioMasivo(jugadores.filter((j) => j.activo)),
    }),
  ]);

  const selector = elemento('select', {
    onChange: (e) => {
      concepto = e.target.value;
      pintar();
    },
  }, Object.entries(CONCEPTOS).map(([valor, texto]) => elemento('option', { value: valor, texto })));
  selector.value = concepto;

  const lista = elemento('div', { clase: 'tarjeta' });
  const total = elemento('p', { clase: 'numero-grande' });
  const acciones = elemento('div', { clase: 'fila-botones' });

  function deudoresVisibles() {
    return porJugador
      .map((j) => ({
        ...j,
        pendiente: concepto === 'todos'
          ? Object.values(j.porConcepto).reduce((s, v) => s + v, 0)
          : (j.porConcepto[concepto] ?? 0),
      }))
      .filter((j) => j.pendiente > 0)
      .sort((a, b) => b.pendiente - a.pendiente);
  }

  function pintar() {
    const deudores = deudoresVisibles();
    const suma = deudores.reduce((s, d) => s + d.pendiente, 0);
    total.textContent = formatearMoneda(suma);
    // Rojo solo si de verdad hay algo por cobrar: en cero no es una alarma.
    total.className = suma > 0 ? 'numero-grande debe' : 'numero-grande al-dia';

    lista.replaceChildren();
    if (deudores.length === 0) {
      lista.append(elemento('p', { clase: 'vacio', texto: 'Nadie debe nada por este concepto. 💪' }));
    }
    for (const d of deudores) {
      const fila = elemento('div', { clase: 'fila fila-clicable' }, [
        elemento('span', { clase: 'dorsal', texto: d.dorsal ? `#${d.dorsal}` : '' }),
        elemento('span', { clase: 'fila-crece', texto: d.nombre }),
        elemento('span', { clase: 'debe', texto: formatearMoneda(d.pendiente) }),
      ]);
      fila.addEventListener('click', () => { location.hash = `jugador/${d.id}`; });
      lista.append(fila);
    }

    acciones.replaceChildren(
      elemento('button', {
        clase: 'boton-texto',
        texto: '📋 Copiar para WhatsApp',
        onClick: () => copiarAlPortapapeles(
          textoListadoDeudores(
            deudores.map((d) => ({ dorsal: d.dorsal, nombre: d.nombre, deuda: d.pendiente })),
            hoyIso(),
          ),
        ),
      }),
      elemento('button', {
        clase: 'boton-texto',
        texto: '⬇ Descargar CSV',
        onClick: () => descargarCSV(
          `deudas-${hoyIso()}.csv`,
          aCSV(
            deudores.map((d) => ({ dorsal: d.dorsal, nombre: d.nombre, deuda: d.pendiente })),
            [
              { clave: 'dorsal', titulo: 'Dorsal' },
              { clave: 'nombre', titulo: 'Jugador' },
              { clave: 'deuda', titulo: 'Debe' },
            ],
          ),
        ),
      }),
    );
  }

  pintar();
  contenedor.append(
    encabezado,
    elemento('div', { clase: 'controles' }, [selector]),
    elemento('div', { clase: 'tarjeta' }, [elemento('p', { clase: 'tenue', texto: 'Total a cobrar' }), total]),
    lista,
    acciones,
  );
}

import {
  listarJugadores, todosLosCargos, todosLosPagos, todosLosSponsorPagos,
  listarGastos, listarSponsors, crearCargos, leerConfig,
} from '../api.js';
import { cajaClub, sumarMontos, resumenGeneracionCuota } from '../calculos.js';
import { formatearMoneda, periodoActual, nombrePeriodo } from '../formato.js';
import { elemento, avisar, confirmar } from '../ui.js';
import { dibujarVistaActual } from '../router.js';

function tarjetaNumero(titulo, valor, clase = '') {
  return elemento('div', { clase: 'tarjeta' }, [
    elemento('p', { clase: 'tenue', texto: titulo }),
    elemento('p', { clase: `numero-grande ${clase}`, texto: valor }),
  ]);
}

function avisoCuota(resumen, periodo) {
  const boton = elemento('button', {
    clase: 'boton-principal',
    texto: 'Generar',
    onClick: async () => {
      const confirmado = await confirmar(
        `Generar la cuota de ${nombrePeriodo(periodo)} a ${resumen.cantidad} jugadores por ${formatearMoneda(resumen.montoUnitario)} cada uno?`,
      );
      if (!confirmado) return;
      boton.disabled = true;
      try {
        await crearCargos(resumen.pendientes.map((j) => ({
          jugadorId: j.id,
          concepto: 'cuota',
          descripcion: `Cuota ${nombrePeriodo(periodo)}`,
          monto: resumen.montoUnitario,
          periodo,
          fecha: `${periodo}-01`,
        })));
        avisar(`Cuota de ${nombrePeriodo(periodo)} generada.`);
        dibujarVistaActual();
      } catch (error) {
        avisar(error.message, 'error');
        boton.disabled = false;
      }
    },
  });

  return elemento('div', { clase: 'tarjeta aviso-cuota' }, [
    elemento('p', {
      texto: `Falta generar la cuota de ${nombrePeriodo(periodo)} — ${resumen.cantidad} jugadores × ${formatearMoneda(resumen.montoUnitario)} = ${formatearMoneda(resumen.total)}`,
    }),
    elemento('div', { clase: 'fila-botones' }, [boton]),
  ]);
}

export default async function dibujar(contenedor) {
  const [jugadores, cargos, pagos, sponsorPagos, gastos, sponsors, config] = await Promise.all([
    listarJugadores({ incluirArchivados: true }),
    todosLosCargos(),
    todosLosPagos(),
    todosLosSponsorPagos(),
    listarGastos(),
    listarSponsors(),
    leerConfig(),
  ]);

  const periodo = periodoActual();
  const montoCuota = Number(config.cuota_monto ?? 0);
  const caja = cajaClub({ pagos, sponsorPagos, gastos });
  const deudaJugadores = jugadores.reduce((s, j) => s + Math.max(j.deuda, 0), 0);
  const pendienteSponsors = sponsors.reduce((s, x) => s + Math.max(x.pendiente, 0), 0);
  const gastosDelMes = sumarMontos(gastos.filter((g) => g.fecha.startsWith(periodo)));

  contenedor.append(elemento('div', { clase: 'encabezado-vista' }, [
    elemento('h1', { texto: 'Panel' }),
    elemento('span', { clase: 'tenue', texto: nombrePeriodo(periodo) }),
  ]));

  const resumen = resumenGeneracionCuota(jugadores, cargos, periodo, montoCuota);
  if (resumen.cantidad > 0 && montoCuota > 0) {
    contenedor.append(avisoCuota(resumen, periodo));
  }

  contenedor.append(elemento('div', { clase: 'rejilla' }, [
    tarjetaNumero('Caja del club', formatearMoneda(caja), caja < 0 ? 'debe' : 'al-dia'),
    tarjetaNumero('Deben los jugadores', formatearMoneda(deudaJugadores), deudaJugadores > 0 ? 'debe' : 'al-dia'),
    tarjetaNumero('Falta de sponsors', formatearMoneda(pendienteSponsors), pendienteSponsors > 0 ? 'debe' : 'al-dia'),
    tarjetaNumero('Gastos del mes', formatearMoneda(gastosDelMes)),
  ]));

  const atajos = elemento('div', { clase: 'tarjeta' }, [
    elemento('h2', { texto: 'Ir a' }),
    elemento('div', { clase: 'fila' }, [
      elemento('a', { href: '#deudas', clase: 'fila-crece', texto: 'Quien debe plata →' }),
    ]),
    elemento('div', { clase: 'fila' }, [
      elemento('a', { href: '#jugadores', clase: 'fila-crece', texto: 'Jugadores →' }),
    ]),
    elemento('div', { clase: 'fila' }, [
      elemento('a', { href: '#gastos', clase: 'fila-crece', texto: 'Cargar un gasto →' }),
    ]),
  ]);
  contenedor.append(atajos);
}

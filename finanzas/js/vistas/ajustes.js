import { leerConfig, guardarConfig } from '../api.js';
import { cerrarSesion } from '../auth.js';
import { elemento, avisar } from '../ui.js';

export default async function dibujar(contenedor) {
  const config = await leerConfig();

  const form = elemento('form', { clase: 'tarjeta' }, [
    elemento('h2', { texto: 'Cuota del club' }),
    elemento('label', { for: 'a-cuota', texto: 'Monto mensual por jugador' }),
    elemento('input', {
      id: 'a-cuota', name: 'cuota', type: 'number', min: '0', required: true,
      value: config.cuota_monto ?? '0',
    }),
    elemento('label', { for: 'a-temporada', texto: 'Temporada' }),
    elemento('input', { id: 'a-temporada', name: 'temporada', value: config.temporada ?? '' }),
    elemento('button', { type: 'submit', clase: 'boton-principal', texto: 'Guardar' }),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = form.querySelector('button');
    boton.disabled = true;
    try {
      await guardarConfig('cuota_monto', Number(form.cuota.value));
      await guardarConfig('temporada', form.temporada.value.trim());
      avisar('Ajustes guardados.');
    } catch (error) {
      avisar(error.message, 'error');
    } finally {
      boton.disabled = false;
    }
  });

  const sesion = elemento('div', { clase: 'tarjeta' }, [
    elemento('h2', { texto: 'Sesion' }),
    elemento('p', { clase: 'tenue', texto: 'Cerrar sesion en este dispositivo.' }),
    elemento('div', { clase: 'fila-botones' }, [
      elemento('button', {
        clase: 'boton-principal',
        texto: 'Cerrar sesion',
        onClick: async () => {
          await cerrarSesion();
          location.reload();
        },
      }),
    ]),
  ]);

  contenedor.append(
    elemento('div', { clase: 'encabezado-vista' }, [elemento('h1', { texto: 'Ajustes' })]),
    form,
    sesion,
  );
}

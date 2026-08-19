import { iniciarSesion, cerrarSesion, sesionActual } from './auth.js';

const pantallaLogin = document.getElementById('pantalla-login');
const app = document.getElementById('app');
const formLogin = document.getElementById('form-login');
const errorLogin = document.getElementById('error-login');

function mostrarApp() {
  pantallaLogin.hidden = true;
  app.hidden = false;
}

function mostrarLogin() {
  pantallaLogin.hidden = false;
  app.hidden = true;
}

formLogin.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  errorLogin.hidden = true;
  const boton = formLogin.querySelector('button');
  boton.disabled = true;
  boton.textContent = 'Entrando...';
  try {
    await iniciarSesion(formLogin.email.value.trim(), formLogin.contrasena.value);
    formLogin.reset();
    mostrarApp();
  } catch (error) {
    errorLogin.textContent = error.message;
    errorLogin.hidden = false;
  } finally {
    boton.disabled = false;
    boton.textContent = 'Entrar';
  }
});

document.getElementById('boton-salir').addEventListener('click', async () => {
  await cerrarSesion();
  mostrarLogin();
});

if (await sesionActual()) {
  mostrarApp();
} else {
  mostrarLogin();
}

import { supabase } from './cliente.js';

const MENSAJES = {
  'Invalid login credentials': 'Email o contrasena incorrectos.',
  'Email not confirmed': 'El usuario todavia no esta confirmado.',
};

function traducir(error) {
  if (!navigator.onLine) return new Error('Sin conexion a internet.');
  return new Error(MENSAJES[error.message] ?? `No se pudo entrar: ${error.message}`);
}

export async function iniciarSesion(email, contrasena) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: contrasena });
  if (error) throw traducir(error);
}

export async function cerrarSesion() {
  await supabase.auth.signOut();
}

export async function sesionActual() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

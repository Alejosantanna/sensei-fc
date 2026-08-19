// Datos de conexion al proyecto de Supabase del club.
//
// La clave publica (anon key) esta disenada para ser publica: no es un
// secreto. Lo que protege los datos son las reglas de acceso del servidor,
// definidas en finanzas/sql/esquema.sql. Sin sesion iniciada no se lee
// ni se escribe nada, aunque alguien copie estas dos lineas.

export const URL_SUPABASE = '';
export const CLAVE_PUBLICA = '';

export const CONFIGURADO = Boolean(URL_SUPABASE && CLAVE_PUBLICA);

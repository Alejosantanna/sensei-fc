// Datos de conexion al proyecto de Supabase del club.
//
// La clave publica (anon key) esta disenada para ser publica: no es un
// secreto. Lo que protege los datos son las reglas de acceso del servidor,
// definidas en finanzas/sql/esquema.sql. Sin sesion iniciada no se lee
// ni se escribe nada, aunque alguien copie estas dos lineas.

export const URL_SUPABASE = 'https://gqbnpmswoatexrsjdwio.supabase.co';
export const CLAVE_PUBLICA = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxYm5wbXN3b2F0ZXhyc2pkd2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxODUxMTMsImV4cCI6MjEwMjc2MTExM30.g7CxGCgYYxtwblZ9jFcF7wkdcvjeoVBsI3LEzazj78k';

export const CONFIGURADO = Boolean(URL_SUPABASE && CLAVE_PUBLICA);

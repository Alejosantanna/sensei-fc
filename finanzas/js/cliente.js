import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { URL_SUPABASE, CLAVE_PUBLICA, CONFIGURADO } from './config.js';

if (!CONFIGURADO) {
  throw new Error(
    'Falta configurar Supabase. Segui los pasos de finanzas/LEEME.md y pega las claves en js/config.js.',
  );
}

export const supabase = createClient(URL_SUPABASE, CLAVE_PUBLICA, {
  auth: { persistSession: true, autoRefreshToken: true },
});

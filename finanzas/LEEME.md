# Finanzas Sensei FC — Puesta en marcha

## 1. Crear el proyecto en Supabase

1. Entrar a https://supabase.com y crear una cuenta gratuita.
2. **New project**. Nombre: `sensei-fc`. Elegir la region mas cercana
   (South America / São Paulo). Guardar la contrasena de la base en un
   lugar seguro: no se usa en el dia a dia, pero no se puede recuperar.
3. Esperar a que termine de crearse (uno o dos minutos).

## 2. Crear las tablas

1. En el menu lateral: **SQL Editor** → **New query**.
2. Abrir `finanzas/sql/esquema.sql`, copiar todo el contenido y pegarlo.
3. Apretar **Run**. Tiene que decir "Success. No rows returned".

## 3. Cerrar el registro abierto

1. **Authentication** → **Sign In / Providers** → **Email**.
2. Desactivar **Allow new users to sign up** y guardar.

Esto es lo que impide que cualquiera se cree una cuenta y entre a ver la
plata del club.

## 4. Crear los usuarios de la dirigencia

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Poner email y contrasena. Marcar **Auto Confirm User**.
3. Repetir para cada persona que tenga que entrar (dos o tres).

## 5. Copiar las claves al sistema

1. **Project Settings** → **API Keys**.
2. Copiar el **Project URL** y la clave **anon / public**.
3. Pegarlas en `finanzas/js/config.js`:

       export const URL_SUPABASE = 'https://xxxxx.supabase.co';
       export const CLAVE_PUBLICA = 'eyJhbGci...';

## 6. Probar en local

Desde la raiz del repo:

    python -m http.server 8000

Abrir http://localhost:8000/finanzas/ e iniciar sesion con uno de los
usuarios creados.

## 7. Publicar

    git push

El sitio queda en https://alejosantanna.github.io/sensei-fc/finanzas/

## Uso diario

- **Empieza el mes:** entrar al Panel y tocar "Generar" en el aviso dorado.
- **Cobrar:** Jugadores → tocar al jugador → Cobrar.
- **Mandar el listado:** Deudas → "Copiar para WhatsApp" → pegar en el grupo.
- **Apurar a uno:** ficha del jugador → "Copiar mensaje para WhatsApp".
- **Comprar algo:** Gastos → "+ Agregar".
- **Cambiar el monto de la cuota:** Ajustes.

## Correr las pruebas

    node --test

## Probar en local

    python -m http.server 8000

Luego http://localhost:8000/finanzas/

-- add_rls_insert_for_users.sql
-- Descripción: Añade la política de seguridad a nivel de fila (RLS) para permitir
-- que los nuevos usuarios inserten su propio perfil en la tabla `users_new`.

-- Habilitar RLS en la tabla (si no está ya habilitado)
ALTER TABLE public.users_new ENABLE ROW LEVEL SECURITY;

-- Crear la política para INSERT
-- Esto permite a un usuario autenticado crear una fila en `users_new`
-- siempre y cuando el `id` de la fila que está creando sea igual a su propio `id` de autenticación.
CREATE POLICY "Allow users to insert their own profile"
ON public.users_new
FOR INSERT
WITH CHECK (auth.uid() = id);

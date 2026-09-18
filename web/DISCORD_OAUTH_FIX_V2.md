# Discord OAuth Fix - Version 2

## Problemas Identificados y Solucionados

### 1. **Problema Principal: Configuración SMTP de Supabase**
Desde finales de 2024, Supabase cambió su política y ahora requiere configuración SMTP personalizada para crear usuarios con email, incluso con confirmaciones de email desactivadas. Esto causa el error "Email address cannot be used as it is not authorized".

**Solución aplicada:**
- Implementado manejo de emails temporales cuando Discord no proporciona email
- Cambiado de `auth.admin.createUser` a `auth.admin.generateLink` con tipo `signup`
- Este método es más robusto y evita algunas restricciones de SMTP

### 2. **Problema: Discord puede no proporcionar email**
Algunos usuarios de Discord tienen configurada la privacidad para no compartir su email públicamente.

**Solución aplicada:**
- Se genera un email temporal usando el Discord ID: `{discord_id}@discord.temp`
- El email real de Discord se guarda en `user_metadata.real_email` si está disponible
- Esto asegura que siempre se pueda crear el usuario en Supabase

### 3. **Problema: Flujo de sesión ineficiente**
El código anterior usaba contraseñas temporales y `signInWithPassword`, lo cual era complejo y propenso a errores.

**Solución aplicada:**
- Implementado el método recomendado de Supabase: `generateLink` + `verifyOtp`
- Primero se genera un magic link con `auth.admin.generateLink({ type: 'magiclink' })`
- Luego se verifica el OTP con `auth.verifyOtp({ token_hash, type: 'email' })`
- Este método es más robusto y es la forma recomendada por Supabase

## Cambios en el Código

### Archivo: `web/app/api/auth/discord/callback/route.ts`

#### Cambio 1: Manejo de emails temporales (líneas 61-65)
```typescript
// Generar email temporal si Discord no proporciona email
const userEmailToUse = discordUser.email || `${discordUser.id}@discord.temp`
console.log('Email to use for user creation:', userEmailToUse)
```

#### Cambio 2: Creación de usuario con generateLink signup (líneas 67-126)
```typescript
if (!existingUser) {
  // Usar generateLink con tipo signup para crear usuario
  const { data: signupLink, error: signupError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email: userEmailToUse,
    password: tempPassword,
    options: {
      data: {
        full_name: discordUser.global_name || discordUser.username,
        discord_id: discordUser.id,
        discord_username: discordUser.username,
        discord_avatar: discordUser.avatar,
        real_email: discordUser.email || null,
      },
    },
  })
  // ... manejo de errores y creación en tabla users
}
```

#### Cambio 3: Creación de sesión con magic link (líneas 155-180)
```typescript
// Generar magic link
const { data: magicLink, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email: userEmail,
})

// Verificar OTP para crear sesión
const { data: sessionData, error: sessionError } = await supabaseSSR.auth.verifyOtp({
  token_hash: magicLink.properties.hashed_token,
  type: 'email',
})
```

#### Cambio 4: Logging mejorado
- Agregados logs detallados en cada paso crítico
- Errores ahora se loguean con `JSON.stringify(error, null, 2)` para mejor diagnóstico
- Logs indican claramente en qué paso falló el proceso

## Configuración Requerida en Supabase

### Opción A: Configurar SMTP (Recomendado para producción)

Si el problema persiste después de estos cambios, necesitas configurar SMTP en Supabase:

1. Ve a tu proyecto de Supabase
2. Ve a **Project Settings** → **Authentication** → **SMTP Settings**
3. Configura un servidor SMTP gratuito como Resend:
   - Crea una cuenta en [resend.com](https://resend.com)
   - Obtén tus credenciales SMTP
   - Agrega las credenciales en Supabase SMTP Settings

O alternativamente, desactiva la confirmación de email:
1. Ve a **Authentication** → **Providers** → **Email**
2. Desactiva **Confirm email**
3. Guarda los cambios

### Opción B: Usar solo OAuth (Sin SMTP)

Si no quieres configurar SMTP, el código actual debería funcionar porque:
- Usa emails temporales cuando Discord no proporciona email
- Usa `generateLink` que es más flexible que `createUser`
- Guarda el email real en metadata para uso futuro

## Variables de Entorno Requeridas

Asegúrate de que estas variables estén configuradas en Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://wbkgesmnyjnomctdvxqb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
```

## Discord Developer Portal Configuration

Asegúrate de que tu aplicación de Discord esté configurada correctamente:

1. **OAuth2 → Redirects**:
   ```
   https://www.thedulcandesign.com/api/auth/discord/callback
   ```

2. **OAuth2 → Scopes**:
   - `identify`
   - `email`

3. **OAuth2 → Bot**:
   - Asegúrate de que el bot esté habilitado si lo necesitas

## Flujo Esperado

1. Usuario hace clic en "Iniciar sesión con Discord"
2. Usuario autoriza la aplicación en Discord
3. Discord redirige al callback con código de autorización
4. Backend intercambia código por access token
5. Backend obtiene información del usuario de Discord
6. Backend busca usuario por Discord ID en la tabla users
7. Si no existe:
   - Genera email temporal si Discord no proporciona email
   - Crea usuario en Supabase Auth usando `generateLink` con tipo `signup`
   - Crea usuario en tabla `public.users`
8. Si existe:
   - Usa el usuario existente
9. Genera magic link para crear sesión
10. Verifica OTP para establecer la sesión
11. Redirige a `/perfil` con sesión activa

## Troubleshooting

### Error: `create_user_error`
- Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté configurado correctamente
- Verifica que las políticas RLS permitan insert en la tabla users
- Considera configurar SMTP en Supabase si el problema persiste

### Error: `magiclink_error`
- Verifica que el usuario tenga una contraseña configurada
- Verifica que el email del usuario sea válido
- Revisa los logs de Vercel para más detalles

### Error: `otp_error`
- Verifica que `NEXT_PUBLIC_SUPABASE_ANON_KEY` esté configurado
- Verifica que el token_hash del magic link sea válido
- Revisa los logs de Vercel para más detalles

### Error: `db_error`
- Verifica que la tabla users exista
- Verifica que las políticas RLS permitan insert con service role
- Verifica que la estructura de la tabla users sea correcta

## Logs de Vercel

Después de desplegar, verifica los logs de Vercel para estos mensajes:

- `Discord user info:` - Información del usuario de Discord
- `Email to use for user creation:` - Email que se usará
- `Creating new user from Discord OAuth using generateLink signup` - Creación de nuevo usuario
- `Signup link result:` - Resultado de la creación de usuario
- `User created in Supabase Auth via signup:` - ID del usuario creado
- `DB insert result:` - Resultado de la inserción en la tabla users
- `Generating magic link for session creation:` - Generación de magic link
- `Magic link generated, verifying OTP...` - Verificación de OTP
- `Session created successfully via Discord login` - Sesión creada exitosamente

## Ventajas de la Nueva Implementación

1. **Más robusta**: Usa los métodos recomendados por Supabase
2. **Mejor manejo de errores**: Logging detallado para diagnóstico
3. **Maneja casos edge**: Usuarios sin email público en Discord
4. **No depende de SMTP**: Funciona sin configuración SMTP en muchos casos
5. **Mejor separación de responsabilidades**: Admin client para operaciones de admin, SSR client para sesión

# Dulcan Optimizer — integración de licencias

Precio inicial: 14.99 USD. Pago único, licencia permanente para un PC.

## Estado de esta copia

Implementación combinada con la fuente actual de producción. Migración aplicada en Supabase y privacidad verificada para las cinco tablas. Claves privadas configuradas como secretos de producción con autorización del propietario. Ventas desactivadas hasta validar y promover el despliegue. No se han enviado correos ni procesado pagos reales durante este trabajo.

Se recuperaron 246 archivos de la producción F1H2R9EcT73fTGsLCfKFrauBjYmm (commit original 00a53dea165fe5280945f1a629a23a1cc490548d), verificando cada SHA1. El punto de recuperación local es db6180c. La tienda, sus pedidos y su flujo guest_store_v1 se han conservado; el flujo de licencias se añade por separado.

## Componentes

- /dulcan-optimizer: página de venta y Checkout autenticado.
- /mis-licencias: recuperación privada de las keys del comprador.
- /api/dulcan/activate: activación independiente de cookies para el ejecutable.
- supabase/migrations/20261022000100_dulcan_software_licenses.sql: cinco tablas privadas y cuatro operaciones atómicas; RLS y acceso solo de servicio.
- Webhook existente de Stripe: entrega tras comprobar pago firmado, coincidencia del importe/moneda/usuario/sesión y estado actual en Stripe; reintentos idempotentes y revocación ante reembolso completo.

## Configuración del servidor

Conservar los valores existentes de Stripe, Supabase y Resend. Agregar solamente en el servidor de Vercel:

- DULCAN_LICENSE_PRIVATE_KEY: clave RSA 3072 PKCS8 que corresponde a la pública incrustada en el ejecutable.
- DULCAN_LICENSE_ENCRYPTION_KEY: 32 bytes Base64 para cifrar keys almacenadas.
- DULCAN_LICENSE_RATE_SALT: secreto independiente para limitar intentos sin almacenar IP en claro.
- DULCAN_LICENSE_MODE: live (test para un entorno de prueba separado).
- DULCAN_INSTALLER_URL: HTTPS del instalador final, dentro del dominio propio o GitHub.
- DULCAN_LICENSE_ENABLED: mantener false hasta verificar el flujo completo; true habilita compras.

Las tres claves privadas están protegidas con DPAPI para el usuario local en I:\CODEX AI\Tools\Signing\DulcanLicensing\license-secrets.dpapi. No incluirlas en GitHub, fuentes distribuidas, ejecutables, capturas ni registros. Guardar una copia segura mediante el procedimiento privado del propietario antes de otro formateo; perder el secreto de cifrado impide recuperar las keys almacenadas.

Stripe debe entregar al endpoint firmado checkout.session.completed, checkout.session.async_payment_succeeded y charge.refunded, además de sus eventos existentes. No quitar eventos de otros productos.

## Activación y límites

Key aleatoria de 128 bits, guardada cifrada y por hash. Primera activación vincula el hash del identificador del PC; posteriores activaciones del mismo PC renuevan una prueba firmada de hasta 30 días. Otro PC se rechaza. Esto no genera cuotas. El cliente verifica firma, producto, PC, modo y fechas, y protege su caché con DPAPI.

La recuperación de cambios del PC permanece disponible sin licencia. Un equipo sin conexión puede seguir usando una prueba válida hasta su vencimiento: la revocación no es instantánea durante ese intervalo. No existe una protección absoluta contra modificaciones de un ejecutable local.

## Validación

Pruebas unitarias y de rutas con Stripe/Resend simulados; SQL real en PostgreSQL embebido PGlite, sin acceder a producción. Verificación RSA entre Node y C#. Se requiere todavía una prueba real del flujo en un entorno de Stripe de prueba, entrega del remitente de correo y activación de un equipo tras el despliegue.

Antes de publicar: recuperar la fuente actual, combinar cambios, revisar migración y secretos, probar en un despliegue previo, configurar eventos, publicar el instalador compatible y solo entonces habilitar ventas. No reemplazar silenciosamente 0.4.5 por el cliente que requiere licencia mientras el backend siga sin activar.


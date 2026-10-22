# Dulcan Optimizer — integración de licencias

Precio inicial: 14.99 USD. Pago único, licencia permanente para un PC.

## Estado de esta copia

Publicada en www.thedulcandesign.com/tienda el 22 de octubre de 2026, con autorización expresa del propietario para habilitar compras reales a 14.99 USD. Despliegue dpl_HDj6ge7C1Tyse9ZU1fQ8c6gpv2QL, fuente c1806a32d79f9bf3ffb3f6ca7561f17b03041310. Migración aplicada en Supabase y privacidad verificada para las cinco tablas. Claves privadas configuradas como secretos de producción. No se han enviado correos ni procesado pagos reales durante este trabajo.

Se recuperaron 246 archivos de la producción F1H2R9EcT73fTGsLCfKFrauBjYmm (commit original 00a53dea165fe5280945f1a629a23a1cc490548d), verificando cada SHA1. El punto de recuperación local es db6180c. La tienda, sus pedidos y su flujo guest_store_v1 se han conservado; el flujo de licencias se añade por separado.

## Componentes

- /tienda: tarjetas verticales con la caja suministrada por el propietario y Agregar al carrito; precio canónico de software_products. La licencia se limita a una unidad por compra y conserva su Checkout autenticado. Desde /carrito la licencia y los servicios se pagan en una sola sesión de Stripe. Se conservan los artículos que no pertenecen a la compra confirmada.
- /dulcan-optimizer: detalles del programa y Checkout autenticado; acceso desde la ficha de Tienda.
- /carrito: vista común para programas y servicios con contador y total conjuntos. Un único botón Pagar todo con Stripe cobra licencia y servicios juntos. Cada fila muestra Quitar. El servidor recalcula precios y aplica descuentos únicamente a los servicios; registra una sola transacción por el importe completo, genera pedidos solo por la parte de servicios y emite la licencia por su precio canónico. La limpieza del carrito espera el pago y la entrega confirmados.
- /dashboard: área privada con Resumen, Mis pedidos (/dashboard/pedidos) y Mis keys (/dashboard/keys).
- /mis-licencias y /pedidos: enlaces compatibles que redirigen a Dashboard conservando las referencias de compra y pedido; el ejecutable y los correos anteriores siguen funcionando.
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

178 pruebas web correctas, incluidas 18 de catálogo y carrito de Tienda; TypeScript y revisión de estilo sin errores. El producto se incorpora al catálogo desde software_products sin duplicarlo en store_products. El checkout invitado rechaza cualquier fila Dulcan antigua, incluso dentro de un carrito mixto. Las pruebas verifican que el pago invitado nunca recibe la licencia y que el carrito conserva los artículos pendientes del otro flujo. Las pruebas de compra conjunta cubren ambos órdenes de agregado, eliminación independiente, una sola sesión de Stripe, importes y descuentos separados internamente, emisión idempotente, un único registro de pago, permisos del comprador y limpieza que conserva artículos no comprados.

10 comprobaciones HTTP correctas antes de promover y otras 10 en el dominio público: producto y catálogo disponibles a 14.99 USD; keys privadas protegidas; compra autenticada; rechazo de origen extranjero, key desconocida y firma Stripe inválida; tienda, caja e instalador accesibles. El botón real lleva al inicio de sesión con retorno a Tienda cuando no hay sesión. El despliegue verificó que la clave pública incorporada en el ejecutable corresponde a la firma del servidor.

Pruebas unitarias y de rutas con Stripe/Resend simulados; SQL real en PostgreSQL embebido PGlite, sin acceder a producción. Verificación RSA entre Node y C#. Se requiere todavía una prueba real del flujo en un entorno de Stripe de prueba, entrega del remitente de correo y activación de un equipo tras el despliegue.

La entrega del correo, emisión tras un pago efectivo y activación posterior del comprador requieren todavía una transacción completa de validación; no se confunden con los controles HTTP ni con las pruebas aisladas. El catálogo histórico de actualización de 0.4.5 se conserva; 0.5.0 se distribuye desde la compra y Mis licencias.



## Pago conjunto publicado

El 22 de octubre de 2026 se publicó b1fcfc8 en dpl_CbfUK3n7NeKpkz2pY8R9fusJXSta y se promovió a producción. Verificación visual en www.thedulcandesign.com/carrito: Dulcan Optimizer 14.99 USD + Configuración de Streaming 49.99 USD = 64.98 USD, un único botón Pagar todo con Stripe y Quitar visible en ambas filas. Se retiró el servicio usado en la comprobación y se conservó la app seleccionada originalmente. Evidencia: I:/CODEX AI/Cache/Temp/dulcan-licensing/carrito-pago-unico.png. Las 178 pruebas web, TypeScript y ESLint pasaron. No se efectuaron cargos ni una transacción real de validación de entrega.

## Incidencia de despliegue posterior

Una publicación posterior dpl_62wjtwPNSXuyYjWjoot4ZL4LwKjA (22 oct 2026 14:03 GMT-4) sustituyó el servidor mixto por una versión cuyo endpoint ignoraba includeLicense. Se detectó comparando POST sin Origin (dominio401 frente a versión corregida403) y alias de Vercel. Se volvió a promover dpl_CbfUK3n7NeKpkz2pY8R9fusJXSta. Confirmados ambos dominios en ese despliegue y endpoint público403. Verificación real hasta Stripe, sin cobro: Configuración de Streaming49.99 menos cupón15%=42.49, licencia14.99, total57.48USD, ambos conceptos visibles. No se introdujo tarjeta ni se completó el pago. Evidencia local I:/CODEX AI/Cache/Temp/dulcan-licensing/stripe-app-servicio-verificado.png. No se modificó main ni se cambiaron ajustes de despliegue automático. No volver a publicar una fuente antigua sin integrar estas rutas de backend.


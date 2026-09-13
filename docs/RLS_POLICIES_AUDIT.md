# 🔒 RLS_POLICIES_AUDIT.md
## Auditoría de Políticas RLS Tabla por Tabla - TheDulcanDesign

**Fecha:** 13/09/2026  
**Fase:** 5.4  
**Objetivo:** Auditar políticas RLS de cada tabla

---

## 📊 Resumen de Tablas

### Tablas con RLS
1. `public.users` - Perfiles de usuarios
2. `public.services` - Catálogo de servicios
3. `public.orders` - Pedidos de servicios
4. `public.order_events` - Eventos de pedidos
5. `public.tickets` - Tickets de soporte
6. `public.ticket_messages` - Mensajes de tickets
7. `public.testimonials` - Testimonios
8. `public.business_settings` - Configuración del negocio

---

## 🔍 Auditoría Detallada

### Tabla: `public.users`

#### RLS Habilitado: ✅ Sí

#### Políticas SELECT

**1. "Users can view own profile"**
```sql
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);
```
- **Quién puede ejecutar:** Usuarios autenticados
- **Condición:** `auth.uid() = id`
- **Función segura:** No
- **Depende de auth.uid():** ✅ Sí
- **Riesgo de acceso cruzado:** ❌ No
- **Estado:** ✅ Seguro

**2. "Admins can view all profiles"**
```sql
CREATE POLICY "Admins can view all profiles"
    ON public.users FOR SELECT
    USING (public.is_admin());
```
- **Quién puede ejecutar:** Administradores
- **Condición:** `public.is_admin()`
- **Función segura:** ✅ Sí (SECURITY DEFINER)
- **Depende de auth.uid():** ✅ Sí (a través de is_admin)
- **Riesgo de acceso cruzado:** ❌ No
- **Estado:** ✅ Seguro

#### Políticas UPDATE

**1. "Users can update own profile"**
```sql
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);
```
- **Quién puede ejecutar:** Usuarios autenticados
- **Condición:** `auth.uid() = id`
- **Protección de rol:** ✅ Trigger `prevent_role_change()` protege
- **Riesgo de cambio de rol:** ❌ Mitigado por trigger
- **Estado:** ✅ Seguro

**2. "Admins can update any profile"**
```sql
CREATE POLICY "Admins can update any profile"
    ON public.users FOR UPDATE
    USING (public.is_admin());
```
- **Quién puede ejecutar:** Administradores
- **Condición:** `public.is_admin()`
- **Función segura:** ✅ Sí
- **Estado:** ✅ Seguro

#### Políticas INSERT

**1. "No direct inserts allowed"**
```sql
CREATE POLICY "No direct inserts allowed"
    ON public.users FOR INSERT
    WITH CHECK (false);
```
- **Quién puede ejecutar:** Nadie
- **Condición:** `false`
- **Justificación:** Solo trigger de auth.users debería crear perfiles
- **Estado:** ✅ Seguro

#### Políticas DELETE

**1. "No direct deletes allowed"**
```sql
CREATE POLICY "No direct deletes allowed"
    ON public.users FOR DELETE
    USING (false);
```
- **Quién puede ejecutar:** Nadie
- **Condición:** `false`
- **Justificación:** Eliminación a través de auth.users (CASCADE)
- **Estado:** ✅ Seguro

---

### Tabla: `public.services`

#### RLS Habilitado: ✅ Sí

#### Políticas SELECT

**1. "Anyone can view active services"**
```sql
CREATE POLICY "Anyone can view active services"
    ON public.services FOR SELECT
    USING (is_active = true);
```
- **Quién puede ejecutar:** Cualquiera (incluyendo no autenticados)
- **Condición:** `is_active = true`
- **Función segura:** No necesaria (datos públicos)
- **Riesgo de acceso cruzado:** ❌ No (datos públicos)
- **Estado:** ✅ Seguro

**2. "Admins can view all services"**
```sql
CREATE POLICY "Admins can view all services"
    ON public.services FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Condición:** Verificación de rol en users
- **Función segura:** ❌ No (subquery directa)
- **Depende de auth.uid():** ✅ Sí
- **Riesgo de acceso cruzado:** ❌ No
- **Estado:** ⚠️ Podría usar función segura

**Recomendación:** Considerar usar `public.is_admin()` para consistencia.

#### Políticas INSERT

**1. "Admins can create services"**
```sql
CREATE POLICY "Admins can create services"
    ON public.services FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Condición:** Verificación de rol
- **Estado:** ✅ Seguro

#### Políticas UPDATE

**1. "Admins can update services"**
```sql
CREATE POLICY "Admins can update services"
    ON public.services FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Estado:** ✅ Seguro

#### Políticas DELETE

**1. "Admins can delete services"**
```sql
CREATE POLICY "Admins can delete services"
    ON public.services FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Estado:** ✅ Seguro

---

### Tabla: `public.orders`

#### RLS Habilitado: ✅ Sí

#### Políticas SELECT

**1. "Users can view own orders"**
```sql
CREATE POLICY "Users can view own orders"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id);
```
- **Quién puede ejecutar:** Usuarios autenticados
- **Condición:** `auth.uid() = user_id`
- **Riesgo de acceso cruzado:** ❌ No
- **Estado:** ✅ Seguro

**2. "Admins can view all orders"**
```sql
CREATE POLICY "Admins can view all orders"
    ON public.orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Estado:** ✅ Seguro

#### Políticas INSERT

**1. "Users can create orders"**
```sql
CREATE POLICY "Users can create orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```
- **Quién puede ejecutar:** Usuarios autenticados
- **Condición:** `auth.uid() = user_id`
- **Riesgo:** Usuario podría crear pedido para otro usuario
- **Estado:** ⚠️ Riesgo de manipulación

**Recomendación:** Agregar verificación de que `auth.uid() = user_id` en WITH CHECK (ya existe).

#### Políticas UPDATE

**1. "Admins can update any order"**
```sql
CREATE POLICY "Admins can update any order"
    ON public.orders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Estado:** ✅ Seguro

**2. "Users cannot update orders directly"**
```sql
CREATE POLICY "Users cannot update orders directly"
    ON public.orders FOR UPDATE
    USING (false);
```
- **Quién puede ejecutar:** Nadie
- **Justificación:** Prevenir manipulación de precios, status, asignaciones
- **Estado:** ✅ Seguro

---

### Tabla: `public.order_events`

#### RLS Habilitado: ✅ Sí

#### Políticas SELECT

**1. "Users can view own order events"**
```sql
CREATE POLICY "Users can view own order events"
    ON public.order_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE id = order_id AND user_id = auth.uid()
        )
    );
```
- **Quién puede ejecutar:** Usuarios autenticados
- **Condición:** Join con orders para verificar propiedad
- **Riesgo de acceso cruzado:** ❌ No
- **Estado:** ✅ Seguro

**2. "Admins can view all order events"**
```sql
CREATE POLICY "Admins can view all order events"
    ON public.order_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Estado:** ✅ Seguro

#### Políticas INSERT

**1. "Admins can create order events"**
```sql
CREATE POLICY "Admins can create order events"
    ON public.order_events FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Justificación:** Solo admins pueden crear eventos (cambios de status)
- **Estado:** ✅ Seguro

---

### Tabla: `public.tickets`

#### RLS Habilitado: ✅ Sí

#### Políticas SELECT

**1. "Users can view own tickets"**
```sql
CREATE POLICY "Users can view own tickets"
    ON public.tickets FOR SELECT
    USING (auth.uid() = user_id);
```
- **Quién puede ejecutar:** Usuarios autenticados
- **Estado:** ✅ Seguro

**2. "Admins can view all tickets"**
```sql
CREATE POLICY "Admins can view all tickets"
    ON public.tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Estado:** ✅ Seguro

**3. "Staff can view all tickets"**
```sql
CREATE POLICY "Staff can view all tickets"
    ON public.tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );
```
- **Quién puede ejecutar:** Staff y administradores
- **Estado:** ✅ Seguro

#### Políticas INSERT

**1. "Users can create tickets"**
```sql
CREATE POLICY "Users can create tickets"
    ON public.tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```
- **Quién puede ejecutar:** Usuarios autenticados
- **Estado:** ✅ Seguro

#### Políticas UPDATE

**1. "Admins can update any ticket"**
```sql
CREATE POLICY "Admins can update any ticket"
    ON public.tickets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Estado:** ✅ Seguro

**2. "Staff can update tickets"**
```sql
CREATE POLICY "Staff can update tickets"
    ON public.tickets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );
```
- **Quién puede ejecutar:** Staff y administradores
- **Estado:** ✅ Seguro

---

### Tabla: `public.ticket_messages`

#### RLS Habilitado: ✅ Sí

#### Políticas SELECT

**1. "Users can view own ticket messages"**
```sql
CREATE POLICY "Users can view own ticket messages"
    ON public.ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets
            WHERE id = ticket_id AND user_id = auth.uid()
        )
    );
```
- **Quién puede ejecutar:** Usuarios autenticados
- **Condición:** Join con tickets para verificar propiedad
- **Estado:** ✅ Seguro

**2. "Admins can view all ticket messages"**
```sql
CREATE POLICY "Admins can view all ticket messages"
    ON public.ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Estado:** ✅ Seguro

**3. "Staff can view all ticket messages"**
```sql
CREATE POLICY "Staff can view all ticket messages"
    ON public.ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );
```
- **Quién puede ejecutar:** Staff y administradores
- **Estado:** ✅ Seguro

#### Políticas INSERT

**1. "Staff can create ticket messages"**
```sql
CREATE POLICY "Staff can create ticket messages"
    ON public.ticket_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );
```
- **Quién puede ejecutar:** Staff y administradores
- **Justificación:** Solo staff puede crear mensajes en nombre del sistema
- **Estado:** ✅ Seguro

---

### Tabla: `public.testimonials`

#### RLS Habilitado: ✅ Sí

#### Políticas SELECT

**1. "Anyone can view displayed testimonials"**
```sql
CREATE POLICY "Anyone can view displayed testimonials"
    ON public.testimonials FOR SELECT
    USING (is_displayed = true);
```
- **Quién puede ejecutar:** Cualquiera
- **Condición:** `is_displayed = true`
- **Justificación:** Testimonios públicos
- **Estado:** ✅ Seguro

**2. "Users can view own testimonials"**
```sql
CREATE POLICY "Users can view own testimonials"
    ON public.testimonials FOR SELECT
    USING (auth.uid() = user_id);
```
- **Quién puede ejecutar:** Usuarios autenticados
- **Estado:** ✅ Seguro

**3. "Admins can view all testimonials"**
```sql
CREATE POLICY "Admins can view all testimonials"
    ON public.testimonials FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Estado:** ✅ Seguro

#### Políticas INSERT

**1. "Users can create testimonials"**
```sql
CREATE POLICY "Users can create testimonials"
    ON public.testimonials FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```
- **Quién puede ejecutar:** Usuarios autenticados
- **Estado:** ✅ Seguro

#### Políticas UPDATE

**1. "Admins can update any testimonial"**
```sql
CREATE POLICY "Admins can update any testimonial"
    ON public.testimonials FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Estado:** ✅ Seguro

#### Políticas DELETE

**1. "Admins can delete testimonials"**
```sql
CREATE POLICY "Admins can delete testimonials"
    ON public.testimonials FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Estado:** ✅ Seguro

---

### Tabla: `public.business_settings`

#### RLS Habilitado: ✅ Sí

#### Políticas SELECT

**1. "Anyone can view public settings"**
```sql
CREATE POLICY "Anyone can view public settings"
    ON public.business_settings FOR SELECT
    USING (key LIKE 'public_%');
```
- **Quién puede ejecutar:** Cualquiera
- **Condición:** `key LIKE 'public_%'`
- **Justificación:** Configuraciones públicas
- **Estado:** ✅ Seguro

**2. "Admins can view all settings"**
```sql
CREATE POLICY "Admins can view all settings"
    ON public.business_settings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Estado:** ✅ Seguro

#### Políticas INSERT

**1. "Admins can create settings"**
```sql
CREATE POLICY "Admins can create settings"
    ON public.business_settings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Estado:** ✅ Seguro

#### Políticas UPDATE

**1. "Admins can update settings"**
```sql
CREATE POLICY "Admins can update settings"
    ON public.business_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Estado:** ✅ Seguro

#### Políticas DELETE

**1. "Admins can delete settings"**
```sql
CREATE POLICY "Admins can delete settings"
    ON public.business_settings FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```
- **Quién puede ejecutar:** Administradores
- **Estado:** ✅ Seguro

---

## 📊 Resumen de Auditoría

### ✅ Tablas Seguras
- ✅ `public.users` - Todas las políticas seguras
- ✅ `public.services` - Políticas seguras, podría usar funciones seguras
- ✅ `public.orders` - Políticas seguras, usuarios no pueden actualizar
- ✅ `public.order_events` - Políticas seguras, solo admins crean eventos
- ✅ `public.tickets` - Políticas seguras, staff y admins pueden ver todo
- ✅ `public.ticket_messages` - Políticas seguras, solo staff crea mensajes
- ✅ `public.testimonials` - Políticas seguras, públicas y privadas separadas
- ✅ `public.business_settings` - Políticas seguras, públicas y privadas separadas

### ⚠️ Recomendaciones

1. **Usar funciones seguras en services:** Cambiar subqueries a `public.is_admin()` para consistencia
2. **Agregar SET search_path:** Añadir a funciones SECURITY DEFINER para mayor seguridad
3. **Verificar WITH CHECK en orders:** Confirmar que previene manipulación de user_id

---

## ✅ Conclusión

### Estado General: ✅ SEGURO

Todas las tablas tienen RLS habilitado y políticas que protegen adecuadamente el acceso a datos. No se encontraron riesgos críticos de acceso cruzado.

Las recomendaciones son mejoras de consistencia y seguridad adicional, no correcciones de problemas críticos.

---

**Documento creado por:** Devin AI  
**Fecha:** 13/09/2026  
**Versión:** 1.0
